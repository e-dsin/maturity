// server/controllers/questions-controller.js
const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');

/**
 * Contrôleur pour les questions
 */

// Récupérer toutes les questions
exports.getAllQuestions = async (req, res) => {
  try {
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
      ORDER BY
        id_questionnaire, ordre
    `);
    
    res.status(200).json(questions);
  } catch (error) {
    console.error('Erreur lors de la récupération des questions:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des questions' });
  }
};

// Récupérer une question par son ID
exports.getQuestionById = async (req, res) => {
  try {
    const { id } = req.params;
    
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
        id_question = ?
    `, [id]);
    
    if (questions.length === 0) {
      return res.status(404).json({ message: 'Question non trouvée' });
    }
    
    res.status(200).json(questions[0]);
  } catch (error) {
    console.error('Erreur lors de la récupération de la question:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de la question' });
  }
};

// Créer une nouvelle question
exports.createQuestion = async (req, res) => {
  try {
    const { 
      id_questionnaire, 
      texte, 
      ponderation, 
      ordre 
    } = req.body;
    
    // Validation des données
    if (!id_questionnaire || !texte || ponderation === undefined) {
      return res.status(400).json({ 
        message: 'Données invalides: id_questionnaire, texte et ponderation sont requis' 
      });
    }
    
    // Vérifier si le questionnaire existe
    const [questionnaire] = await pool.query('SELECT * FROM questionnaires WHERE id_questionnaire = ?', [id_questionnaire]);
    
    if (questionnaire.length === 0) {
      return res.status(400).json({ message: 'Questionnaire inexistant' });
    }
    
    // Générer un UUID pour la nouvelle question
    const id_question = uuidv4();
    
    // Si ordre n'est pas spécifié, trouver le prochain ordre disponible
    let nextOrdre = ordre;
    if (nextOrdre === undefined) {
      const [maxOrdre] = await pool.query(`
        SELECT MAX(ordre) as max_ordre
        FROM questions
        WHERE id_questionnaire = ?
      `, [id_questionnaire]);
      
      nextOrdre = (maxOrdre[0].max_ordre || 0) + 1;
    }
    
    // Insérer la question
    await pool.query(`
      INSERT INTO questions (
        id_question,
        id_questionnaire,
        texte,
        ponderation,
        ordre,
        date_creation,
        date_modification
      ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      id_question,
      id_questionnaire,
      texte,
      ponderation,
      nextOrdre
    ]);
    
    // Récupérer la question créée
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
        id_question = ?
    `, [id_question]);
    
    res.status(201).json(questions[0]);
  } catch (error) {
    console.error('Erreur lors de la création de la question:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la création de la question' });
  }
};

// Mettre à jour une question
exports.updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      texte, 
      ponderation, 
      ordre 
    } = req.body;
    
    // Vérifier si la question existe
    const [existingQuestion] = await pool.query('SELECT * FROM questions WHERE id_question = ?', [id]);
    
    if (existingQuestion.length === 0) {
      return res.status(404).json({ message: 'Question non trouvée' });
    }
    
    // Construire la requête de mise à jour
    let updateQuery = 'UPDATE questions SET date_modification = NOW()';
    const updateParams = [];
    
    if (texte) {
      updateQuery += ', texte = ?';
      updateParams.push(texte);
    }
    
    if (ponderation !== undefined) {
      updateQuery += ', ponderation = ?';
      updateParams.push(ponderation);
    }
    
    if (ordre !== undefined) {
      updateQuery += ', ordre = ?';
      updateParams.push(ordre);
    }
    
    updateQuery += ' WHERE id_question = ?';
    updateParams.push(id);
    
    // Exécuter la mise à jour
    await pool.query(updateQuery, updateParams);
    
    // Récupérer la question mise à jour
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
        id_question = ?
    `, [id]);
    
    res.status(200).json(questions[0]);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la question:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de la question' });
  }
};

// Supprimer une question
exports.deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier si la question existe
    const [existingQuestion] = await pool.query('SELECT * FROM questions WHERE id_question = ?', [id]);
    
    if (existingQuestion.length === 0) {
      return res.status(404).json({ message: 'Question non trouvée' });
    }
    
    // Vérifier les dépendances (réponses)
    const [reponses] = await pool.query('SELECT COUNT(*) as count FROM reponses WHERE id_question = ?', [id]);
    
    if (reponses[0].count > 0) {
      return res.status(409).json({ 
        message: 'Impossible de supprimer la question car elle est référencée par des réponses' 
      });
    }
    
    // Supprimer la question
    await pool.query('DELETE FROM questions WHERE id_question = ?', [id]);
    
    res.status(200).json({ message: 'Question supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la question:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression de la question' });
  }
};