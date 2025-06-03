// server/controllers/questionnaires-controller.js
const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');

/**
 * Contrôleur pour les questionnaires
 */
exports.getAllQuestionnaires = async (req, res) => {
  try {
    // Récupérer tous les questionnaires
    const [questionnaires] = await pool.query(`
      SELECT 
        id_questionnaire,
        fonction,
        thematique,
        description,
        date_creation,
        date_modification
      FROM 
        questionnaires
    `);
    
    res.status(200).json(questionnaires);
  } catch (error) {
    console.error('Erreur lors de la récupération des questionnaires:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des questionnaires' });
  }
};

// Récupérer un questionnaire par son ID
exports.getQuestionnaireById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [questionnaires] = await pool.query(`
      SELECT 
        id_questionnaire,
        fonction,
        thematique,
        description,
        date_creation,
        date_modification
      FROM 
        questionnaires
      WHERE 
        id_questionnaire = ?
    `, [id]);
    
    if (questionnaires.length === 0) {
      return res.status(404).json({ message: 'Questionnaire non trouvé' });
    }
    
    res.status(200).json(questionnaires[0]);
  } catch (error) {
    console.error('Erreur lors de la récupération du questionnaire:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération du questionnaire' });
  }
};

// Récupérer les questions d'un questionnaire
exports.getQuestionsByQuestionnaireId = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier si le questionnaire existe
    const [questionnaire] = await pool.query('SELECT * FROM questionnaires WHERE id_questionnaire = ?', [id]);
    
    if (questionnaire.length === 0) {
      return res.status(404).json({ message: 'Questionnaire non trouvé' });
    }
    
    // Récupérer les questions d'un questionnaire
    const [questions] = await pool.query(`
      SELECT 
        id_question,
        id_questionnaire,
        texte,
        ponderation,
        ordre,
        date_creation,
        date_modification
      FROM 
        questions
      WHERE 
        id_questionnaire = ?
      ORDER BY 
        ordre
    `, [id]);
    
    res.status(200).json(questions);
  } catch (error) {
    console.error('Erreur lors de la récupération des questions:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des questions' });
  }
};

// Créer un nouveau questionnaire
exports.createQuestionnaire = async (req, res) => {
  try {
    const { 
      fonction, 
      thematique, 
      description 
    } = req.body;
    
    // Validation des données
    if (!fonction || !thematique) {
      return res.status(400).json({ 
        message: 'Données invalides: fonction et thematique sont requis' 
      });
    }
    
    // Générer un UUID pour le nouveau questionnaire
    const id_questionnaire = uuidv4();
    
    // Insérer le questionnaire
    await pool.query(`
      INSERT INTO questionnaires (
        id_questionnaire,
        fonction,
        thematique,
        description,
        date_creation,
        date_modification
      ) VALUES (?, ?, ?, ?, NOW(), NOW())
    `, [
      id_questionnaire,
      fonction,
      thematique,
      description || null
    ]);
    
    // Récupérer le questionnaire créé
    const [questionnaires] = await pool.query(`
      SELECT 
        id_questionnaire,
        fonction,
        thematique,
        description,
        date_creation,
        date_modification
      FROM 
        questionnaires
      WHERE 
        id_questionnaire = ?
    `, [id_questionnaire]);
    
    res.status(201).json(questionnaires[0]);
  } catch (error) {
    console.error('Erreur lors de la création du questionnaire:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la création du questionnaire' });
  }
};

// Mettre à jour un questionnaire
exports.updateQuestionnaire = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      fonction, 
      thematique, 
      description 
    } = req.body;
    
    // Vérifier si le questionnaire existe
    const [existingQuestionnaire] = await pool.query('SELECT * FROM questionnaires WHERE id_questionnaire = ?', [id]);
    
    if (existingQuestionnaire.length === 0) {
      return res.status(404).json({ message: 'Questionnaire non trouvé' });
    }
    
    // Construire la requête de mise à jour
    let updateQuery = 'UPDATE questionnaires SET date_modification = NOW()';
    const updateParams = [];
    
    if (fonction) {
      updateQuery += ', fonction = ?';
      updateParams.push(fonction);
    }
    
    if (thematique) {
      updateQuery += ', thematique = ?';
      updateParams.push(thematique);
    }
    
    if (description !== undefined) {
      updateQuery += ', description = ?';
      updateParams.push(description || null);
    }
    
    updateQuery += ' WHERE id_questionnaire = ?';
    updateParams.push(id);
    
    // Exécuter la mise à jour
    await pool.query(updateQuery, updateParams);
    
    // Récupérer le questionnaire mis à jour
    const [questionnaires] = await pool.query(`
      SELECT 
        id_questionnaire,
        fonction,
        thematique,
        description,
        date_creation,
        date_modification
      FROM 
        questionnaires
      WHERE 
        id_questionnaire = ?
    `, [id]);
    
    res.status(200).json(questionnaires[0]);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du questionnaire:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du questionnaire' });
  }
};

// Supprimer un questionnaire
exports.deleteQuestionnaire = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier si le questionnaire existe
    const [existingQuestionnaire] = await pool.query('SELECT * FROM questionnaires WHERE id_questionnaire = ?', [id]);
    
    if (existingQuestionnaire.length === 0) {
      return res.status(404).json({ message: 'Questionnaire non trouvé' });
    }
    
    // Vérifier les dépendances (questions, formulaires)
    const [questions] = await pool.query('SELECT COUNT(*) as count FROM questions WHERE id_questionnaire = ?', [id]);
    const [formulaires] = await pool.query('SELECT COUNT(*) as count FROM formulaires WHERE id_questionnaire = ?', [id]);
    
    if (questions[0].count > 0 || formulaires[0].count > 0) {
      return res.status(409).json({ 
        message: 'Impossible de supprimer le questionnaire car il est référencé par des questions ou des formulaires' 
      });
    }
    
    // Supprimer les permissions associées
    await pool.query('DELETE FROM permissions WHERE type_ressource = "QUESTIONNAIRE" AND id_ressource = ?', [id]);
    
    // Supprimer le questionnaire
    await pool.query('DELETE FROM questionnaires WHERE id_questionnaire = ?', [id]);
    
    res.status(200).json({ message: 'Questionnaire supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du questionnaire:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression du questionnaire' });
  }
};

// Récupérer les statistiques des questionnaires
exports.getQuestionnaireStats = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Si ID est fourni, récupérer les stats pour ce questionnaire
    if (id) {
      // Nombre de questions
      const [questionsResult] = await pool.query(
        'SELECT COUNT(*) as count FROM questions WHERE id_questionnaire = ?',
        [id]
      );
      
      // Nombre de réponses
      const [reponsesResult] = await pool.query(`
        SELECT COUNT(*) as count
        FROM reponses r
        JOIN formulaires f ON r.id_formulaire = f.id_formulaire
        WHERE f.id_questionnaire = ?
      `, [id]);
      
      // Nombre d'utilisateurs uniques
      const [utilisateursResult] = await pool.query(`
        SELECT COUNT(DISTINCT f.id_acteur) as count
        FROM formulaires f
        WHERE f.id_questionnaire = ?
      `, [id]);
      
      return res.status(200).json({
        numQuestions: questionsResult[0].count,
        numReponses: reponsesResult[0].count,
        numUtilisateurs: utilisateursResult[0].count
      });
    }
    
    // Sinon, récupérer les stats pour tous les questionnaires
    const [statsResult] = await pool.query(`
      SELECT 
        q.id_questionnaire,
        q.fonction,
        q.thematique,
        (SELECT COUNT(*) FROM questions WHERE id_questionnaire = q.id_questionnaire) AS numQuestions,
        (
          SELECT COUNT(*) 
          FROM reponses r
          JOIN formulaires f ON r.id_formulaire = f.id_formulaire
          WHERE f.id_questionnaire = q.id_questionnaire
        ) AS numReponses,
        (
          SELECT COUNT(DISTINCT f.id_acteur)
          FROM formulaires f
          WHERE f.id_questionnaire = q.id_questionnaire
        ) AS numUtilisateurs
      FROM 
        questionnaires q
    `);
    
    res.status(200).json(statsResult);
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques des questionnaires:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des statistiques' });
  }
};