// server/controllers/formulaires-controller.js
const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');

/**
 * Contrôleur pour les formulaires
 */
exports.getRecentFormulaires = async (req, res) => {
  try {
    // Récupérer les formulaires récents (limités à 10)
    const [formulaires] = await pool.query(`
      SELECT 
        f.id_formulaire,
        f.date_creation,
        f.date_modification,
        f.statut,
        a.id_acteur,
        a.nom_prenom as acteur_nom,
        app.id_application,
        app.nom_application,
        q.id_questionnaire,
        q.fonction as questionnaire_titre,
        q.thematique
      FROM 
        formulaires f
      JOIN 
        acteurs a ON f.id_acteur = a.id_acteur
      JOIN 
        applications app ON f.id_application = app.id_application
      JOIN 
        questionnaires q ON f.id_questionnaire = q.id_questionnaire
      ORDER BY 
        f.date_modification DESC
      LIMIT 10
    `);
    
    res.status(200).json(formulaires);
  } catch (error) {
    console.error('Erreur lors de la récupération des formulaires récents:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des formulaires récents' });
  }
};

// Récupérer tous les formulaires
exports.getAllFormulaires = async (req, res) => {
  try {
    const [formulaires] = await pool.query(`
      SELECT 
        f.id_formulaire,
        f.date_creation,
        f.date_modification,
        f.statut,
        a.id_acteur,
        a.nom_prenom as acteur_nom,
        app.id_application,
        app.nom_application,
        q.id_questionnaire,
        q.fonction as questionnaire_titre,
        q.thematique
      FROM 
        formulaires f
      JOIN 
        acteurs a ON f.id_acteur = a.id_acteur
      JOIN 
        applications app ON f.id_application = app.id_application
      JOIN 
        questionnaires q ON f.id_questionnaire = q.id_questionnaire
      ORDER BY 
        f.date_modification DESC
    `);
    
    res.status(200).json(formulaires);
  } catch (error) {
    console.error('Erreur lors de la récupération des formulaires:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des formulaires' });
  }
};

// Récupérer un formulaire par son ID
exports.getFormulaireById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [formulaires] = await pool.query(`
      SELECT 
        f.id_formulaire,
        f.date_creation,
        f.date_modification,
        f.statut,
        a.id_acteur,
        a.nom_prenom as acteur_nom,
        app.id_application,
        app.nom_application,
        q.id_questionnaire,
        q.fonction as questionnaire_titre,
        q.thematique
      FROM 
        formulaires f
      JOIN 
        acteurs a ON f.id_acteur = a.id_acteur
      JOIN 
        applications app ON f.id_application = app.id_application
      JOIN 
        questionnaires q ON f.id_questionnaire = q.id_questionnaire
      WHERE
        f.id_formulaire = ?
    `, [id]);
    
    if (formulaires.length === 0) {
      return res.status(404).json({ message: 'Formulaire non trouvé' });
    }
    
    // Récupérer les réponses associées au formulaire
    const [reponses] = await pool.query(`
      SELECT 
        r.id_reponse,
        r.id_question,
        q.texte as question_texte,
        r.valeur_reponse,
        r.score,
        r.commentaire
      FROM 
        reponses r
      JOIN
        questions q ON r.id_question = q.id_question
      WHERE
        r.id_formulaire = ?
      ORDER BY
        q.ordre
    `, [id]);
    
    const formulaireComplet = {
      ...formulaires[0],
      reponses
    };
    
    res.status(200).json(formulaireComplet);
  } catch (error) {
    console.error('Erreur lors de la récupération du formulaire:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération du formulaire' });
  }
};

// Créer un nouveau formulaire
exports.createFormulaire = async (req, res) => {
  try {
    const { 
      id_acteur, 
      id_application, 
      id_questionnaire, 
      statut 
    } = req.body;
    
    // Validation des données
    if (!id_acteur || !id_application || !id_questionnaire) {
      return res.status(400).json({ 
        message: 'Données invalides: id_acteur, id_application et id_questionnaire sont requis' 
      });
    }
    
    // Vérifier que le statut est valide s'il est fourni
    const statutValues = ['Brouillon', 'Soumis', 'Validé'];
    if (statut && !statutValues.includes(statut)) {
      return res.status(400).json({ 
        message: 'Statut invalide: doit être "Brouillon", "Soumis" ou "Validé"' 
      });
    }
    
    // Vérifier que l'acteur existe
    const [acteur] = await pool.query('SELECT * FROM acteurs WHERE id_acteur = ?', [id_acteur]);
    if (acteur.length === 0) {
      return res.status(400).json({ message: 'Acteur inexistant' });
    }
    
    // Vérifier que l'application existe
    const [application] = await pool.query('SELECT * FROM applications WHERE id_application = ?', [id_application]);
    if (application.length === 0) {
      return res.status(400).json({ message: 'Application inexistante' });
    }
    
    // Vérifier que le questionnaire existe
    const [questionnaire] = await pool.query('SELECT * FROM questionnaires WHERE id_questionnaire = ?', [id_questionnaire]);
    if (questionnaire.length === 0) {
      return res.status(400).json({ message: 'Questionnaire inexistant' });
    }
    
    // Générer un UUID pour le nouveau formulaire
    const id_formulaire = uuidv4();
    const now = new Date();
    
    // Insérer le formulaire
    await pool.query(`
      INSERT INTO formulaires (
        id_formulaire,
        id_acteur,
        id_application,
        id_questionnaire,
        date_creation,
        date_modification,
        statut
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      id_formulaire,
      id_acteur,
      id_application,
      id_questionnaire,
      now,
      now,
      statut || 'Brouillon'
    ]);
    
    // Récupérer le formulaire créé
    const [formulaires] = await pool.query(`
      SELECT 
        f.id_formulaire,
        f.date_creation,
        f.date_modification,
        f.statut,
        a.id_acteur,
        a.nom_prenom as acteur_nom,
        app.id_application,
        app.nom_application,
        q.id_questionnaire,
        q.fonction as questionnaire_titre,
        q.thematique
      FROM 
        formulaires f
      JOIN 
        acteurs a ON f.id_acteur = a.id_acteur
      JOIN 
        applications app ON f.id_application = app.id_application
      JOIN 
        questionnaires q ON f.id_questionnaire = q.id_questionnaire
      WHERE
        f.id_formulaire = ?
    `, [id_formulaire]);
    
    res.status(201).json(formulaires[0]);
  } catch (error) {
    console.error('Erreur lors de la création du formulaire:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la création du formulaire' });
  }
};

// Mettre à jour un formulaire
exports.updateFormulaire = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;
    
    // Validation des données
    if (!statut) {
      return res.status(400).json({ message: 'Données invalides: statut est requis' });
    }
    
    // Vérifier que le statut est valide
    const statutValues = ['Brouillon', 'Soumis', 'Validé'];
    if (!statutValues.includes(statut)) {
      return res.status(400).json({ 
        message: 'Statut invalide: doit être "Brouillon", "Soumis" ou "Validé"' 
      });
    }
    
    // Vérifier si le formulaire existe
    const [existingFormulaire] = await pool.query('SELECT * FROM formulaires WHERE id_formulaire = ?', [id]);
    
    if (existingFormulaire.length === 0) {
      return res.status(404).json({ message: 'Formulaire non trouvé' });
    }
    
    // Mettre à jour le formulaire
    await pool.query(`
      UPDATE formulaires
      SET statut = ?, date_modification = NOW()
      WHERE id_formulaire = ?
    `, [statut, id]);
    
    // Récupérer le formulaire mis à jour
    const [formulaires] = await pool.query(`
      SELECT 
        f.id_formulaire,
        f.date_creation,
        f.date_modification,
        f.statut,
        a.id_acteur,
        a.nom_prenom as acteur_nom,
        app.id_application,
        app.nom_application,
        q.id_questionnaire,
        q.fonction as questionnaire_titre,
        q.thematique
      FROM 
        formulaires f
      JOIN 
        acteurs a ON f.id_acteur = a.id_acteur
      JOIN 
        applications app ON f.id_application = app.id_application
      JOIN 
        questionnaires q ON f.id_questionnaire = q.id_questionnaire
      WHERE
        f.id_formulaire = ?
    `, [id]);
    
    res.status(200).json(formulaires[0]);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du formulaire:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du formulaire' });
  }
};

// Supprimer un formulaire
exports.deleteFormulaire = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier si le formulaire existe
    const [existingFormulaire] = await pool.query('SELECT * FROM formulaires WHERE id_formulaire = ?', [id]);
    
    if (existingFormulaire.length === 0) {
      return res.status(404).json({ message: 'Formulaire non trouvé' });
    }
    
    // Vérifier si le formulaire est référencé par des réponses
    const [reponses] = await pool.query('SELECT COUNT(*) as count FROM reponses WHERE id_formulaire = ?', [id]);
    
    // Génération d'une transaction pour assurer l'intégrité des données
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Supprimer les réponses associées au formulaire
      if (reponses[0].count > 0) {
        await connection.query('DELETE FROM reponses WHERE id_formulaire = ?', [id]);
      }
      
      // Supprimer les permissions associées
      await connection.query('DELETE FROM permissions WHERE type_ressource = "FORMULAIRE" AND id_ressource = ?', [id]);
      
      // Supprimer le formulaire
      await connection.query('DELETE FROM formulaires WHERE id_formulaire = ?', [id]);
      
      // Commit de la transaction
      await connection.commit();
      
      res.status(200).json({ message: 'Formulaire supprimé avec succès' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Erreur lors de la suppression du formulaire:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression du formulaire' });
  }
};