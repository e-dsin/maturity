// server/controllers/analyses-controller.js
const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');

/**
 * Contrôleur pour les analyses de maturité
 */

// Récupérer toutes les analyses
exports.getAllAnalyses = async (req, res) => {
  try {
    const [analyses] = await pool.query(`
      SELECT 
        ma.id_analyse,
        ma.id_application,
        a.nom_application,
        ma.date_analyse,
        ma.score_global
      FROM 
        maturity_analyses ma
      JOIN
        applications a ON ma.id_application = a.id_application
      ORDER BY
        ma.date_analyse DESC
    `);
    
    res.status(200).json(analyses);
  } catch (error) {
    console.error('Erreur lors de la récupération des analyses:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des analyses' });
  }
};

// Récupérer une analyse par son ID
exports.getAnalyseById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [analyses] = await pool.query(`
      SELECT 
        ma.id_analyse,
        ma.id_application,
        a.nom_application,
        ma.date_analyse,
        ma.score_global
      FROM 
        maturity_analyses ma
      JOIN
        applications a ON ma.id_application = a.id_application
      WHERE 
        ma.id_analyse = ?
    `, [id]);
    
    if (analyses.length === 0) {
      return res.status(404).json({ message: 'Analyse non trouvée' });
    }
    
    // Récupérer les scores par thématique associés
    const [thematiques] = await pool.query(`
      SELECT 
        id_score,
        thematique,
        score,
        nombre_reponses
      FROM 
        thematique_scores
      WHERE 
        id_analyse = ?
    `, [id]);
    
    const analyseComplete = {
      ...analyses[0],
      thematiques
    };
    
    res.status(200).json(analyseComplete);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'analyse:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'analyse' });
  }
};

// Récupérer les analyses d'une application
exports.getAnalysesByApplication = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [analyses] = await pool.query(`
      SELECT 
        ma.id_analyse,
        ma.id_application,
        a.nom_application,
        ma.date_analyse,
        ma.score_global
      FROM 
        maturity_analyses ma
      JOIN
        applications a ON ma.id_application = a.id_application
      WHERE 
        ma.id_application = ?
      ORDER BY
        ma.date_analyse DESC
    `, [id]);
    
    res.status(200).json(analyses);
  } catch (error) {
    console.error('Erreur lors de la récupération des analyses de l\'application:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des analyses de l\'application' });
  }
};

// Créer une nouvelle analyse
exports.createAnalyse = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id_application, thematiques } = req.body;
    
    // Validation des données
    if (!id_application) {
      connection.release();
      return res.status(400).json({ message: 'Données invalides: id_application est requis' });
    }
    
    // Générer un UUID pour la nouvelle analyse
    const id_analyse = uuidv4();
    
    // Commencer la transaction
    await connection.beginTransaction();
    
    try {
      // Insérer l'analyse
      await connection.query(`
        INSERT INTO maturity_analyses (
          id_analyse,
          id_application,
          date_analyse,
          score_global
        ) VALUES (?, ?, NOW(), NULL)
      `, [id_analyse, id_application]);
      
      // Si des thématiques sont fournies, les utiliser
      if (Array.isArray(thematiques) && thematiques.length > 0) {
        for (const theme of thematiques) {
          await connection.query(`
            INSERT INTO thematique_scores (
              id_score,
              id_analyse,
              thematique,
              score,
              nombre_reponses
            ) VALUES (?, ?, ?, ?, ?)
          `, [
            uuidv4(),
            id_analyse,
            theme.thematique,
            theme.score,
            theme.nombre_reponses || 0
          ]);
        }
        
        // Calculer le score global
        const [scores] = await connection.query(`
          SELECT AVG(score) as score_global
          FROM thematique_scores
          WHERE id_analyse = ?
        `, [id_analyse]);
        
        const score_global = scores[0].score_global || 0;
        
        // Mettre à jour l'analyse avec le score global
        await connection.query(`
          UPDATE maturity_analyses
          SET score_global = ?
          WHERE id_analyse = ?
        `, [score_global, id_analyse]);
        
        // Ajouter à l'historique
        for (const theme of thematiques) {
          await connection.query(`
            INSERT INTO historique_scores (
              id_historique,
              id_application,
              thematique,
              score,
              date_mesure
            ) VALUES (?, ?, ?, ?, CURDATE())
          `, [
            uuidv4(),
            id_application,
            theme.thematique,
            theme.score
          ]);
        }
      } else {
        // Calculer et insérer les scores par thématique à partir des réponses
        await connection.query(`
          INSERT INTO thematique_scores (
            id_score,
            id_analyse,
            thematique,
            score,
            nombre_reponses
          )
          SELECT 
            UUID(),
            ?,
            q.thematique,
            AVG(r.score),
            COUNT(r.id_reponse)
          FROM 
            formulaires f
          JOIN 
            questionnaires q ON f.id_questionnaire = q.id_questionnaire
          JOIN 
            reponses r ON f.id_formulaire = r.id_formulaire
          WHERE 
            f.id_application = ?
          GROUP BY 
            q.thematique
        `, [id_analyse, id_application]);
        
        // Calculer le score global
        const [scores] = await connection.query(`
          SELECT AVG(score) as score_global
          FROM thematique_scores
          WHERE id_analyse = ?
        `, [id_analyse]);
        
        const score_global = scores[0].score_global || 0;
        
        // Mettre à jour l'analyse avec le score global
        await connection.query(`
          UPDATE maturity_analyses
          SET score_global = ?
          WHERE id_analyse = ?
        `, [score_global, id_analyse]);
        
        // Ajouter à l'historique
        await connection.query(`
          INSERT INTO historique_scores (
            id_historique,
            id_application,
            thematique,
            score,
            date_mesure
          )
          SELECT 
            UUID(),
            ?,
            thematique,
            score,
            CURDATE()
          FROM 
            thematique_scores
          WHERE 
            id_analyse = ?
        `, [id_application, id_analyse]);
      }
      
      // Commit de la transaction
      await connection.commit();
      
      // Récupérer l'analyse créée
      const [analyses] = await pool.query(`
        SELECT 
          ma.id_analyse,
          ma.id_application,
          a.nom_application,
          ma.date_analyse,
          ma.score_global
        FROM 
          maturity_analyses ma
        JOIN
          applications a ON ma.id_application = a.id_application
        WHERE 
          ma.id_analyse = ?
      `, [id_analyse]);
      
      // Récupérer les scores par thématique
      const [thematiques] = await pool.query(`
        SELECT 
          id_score,
          thematique,
          score,
          nombre_reponses
        FROM 
          thematique_scores
        WHERE 
          id_analyse = ?
      `, [id_analyse]);
      
      const analyseComplete = {
        ...analyses[0],
        thematiques
      };
      
      res.status(201).json(analyseComplete);
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Erreur lors de la création de l\'analyse:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la création de l\'analyse' });
  } finally {
    connection.release();
  }
};

// Supprimer une analyse
exports.deleteAnalyse = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier si l'analyse existe
    const [existingAnalyse] = await pool.query('SELECT * FROM maturity_analyses WHERE id_analyse = ?', [id]);
    
    if (existingAnalyse.length === 0) {
      return res.status(404).json({ message: 'Analyse non trouvée' });
    }
    
    // Supprimer l'analyse (les scores par thématique seront supprimés automatiquement grâce au ON DELETE CASCADE)
    await pool.query('DELETE FROM maturity_analyses WHERE id_analyse = ?', [id]);
    
    res.status(200).json({ message: 'Analyse supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'analyse:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression de l\'analyse' });
  }
};

// Calculer un score de maturité
exports.calculerScore = async (req, res) => {
  try {
    const { id_application } = req.params;
    
    // Appeler la procédure stockée
    await pool.query('CALL calculer_scores_maturite(?)', [id_application]);
    
    // Récupérer l'analyse la plus récente
    const [analyses] = await pool.query(`
      SELECT 
        ma.id_analyse,
        ma.id_application,
        a.nom_application,
        ma.date_analyse,
        ma.score_global
      FROM 
        maturity_analyses ma
      JOIN
        applications a ON ma.id_application = a.id_application
      WHERE 
        ma.id_application = ?
      ORDER BY
        ma.date_analyse DESC
      LIMIT 1
    `, [id_application]);
    
    if (analyses.length === 0) {
      return res.status(404).json({ message: 'Aucune analyse trouvée après calcul' });
    }
    
    const id_analyse = analyses[0].id_analyse;
    
    // Récupérer les scores par thématique
    const [thematiques] = await pool.query(`
      SELECT 
        id_score,
        thematique,
        score,
        nombre_reponses
      FROM 
        thematique_scores
      WHERE 
        id_analyse = ?
    `, [id_analyse]);
    
    const analyseComplete = {
      ...analyses[0],
      thematiques
    };
    
    res.status(200).json(analyseComplete);
  } catch (error) {
    console.error('Erreur lors du calcul du score:', error);
    res.status(500).json({ message: 'Erreur serveur lors du calcul du score' });
  }
};