// server/routes/questions-route.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// GET toutes les questions
router.get('/', async (req, res) => {
  try {
    logger.debug('GET /api/questions - Récupération de toutes les questions');
    
    const [questions] = await pool.query(`
      SELECT q.*, qt.fonction, qt.thematique
      FROM questions q
      LEFT JOIN questionnaires qt ON q.id_questionnaire = qt.id_questionnaire
      ORDER BY q.ordre ASC, q.date_creation DESC
    `);
    
    res.status(200).json(questions);
  } catch (error) {
    logger.error('Erreur lors de la récupération des questions:', { error });
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des questions' });
  }
});

// GET question par ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`GET /api/questions/${id} - Récupération d'une question spécifique`);
    
    const [questions] = await pool.query(`
      SELECT q.*, qt.fonction, qt.thematique
      FROM questions q
      LEFT JOIN questionnaires qt ON q.id_questionnaire = qt.id_questionnaire
      WHERE q.id_question = ?
    `, [id]);
    
    if (questions.length === 0) {
      return res.status(404).json({ message: 'Question non trouvée' });
    }
    
    res.status(200).json(questions[0]);
  } catch (error) {
    logger.error(`Erreur lors de la récupération de la question ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de la question' });
  }
});

// GET questions par thématique
router.get('/thematique/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`GET /api/questions/thematique/${id} - Récupération des questions par thématique`);
    
    // Vérifier si la thématique existe
    const [thematiques] = await pool.query('SELECT * FROM thematiques WHERE id_thematique = ?', [id]);
    if (thematiques.length === 0) {
      return res.status(404).json({ message: 'Thématique non trouvée' });
    }
    
    const [questions] = await pool.query(`
      SELECT q.*, qt.fonction, qt.thematique
      FROM questions q
      JOIN questionnaires qt ON q.id_questionnaire = qt.id_questionnaire
      JOIN thematiques t ON qt.fonction = ?
      WHERE t.id_thematique = ?
      ORDER BY q.ordre ASC
    `, [thematiques[0].nom, id]);
    
    res.status(200).json(questions);
  } catch (error) {
    logger.error(`Erreur lors de la récupération des questions pour la thématique ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des questions par thématique' });
  }
});

// POST nouvelle question
router.post('/', async (req, res) => {
  try {
    const { 
      id_questionnaire,
      texte,
      ponderation,
      ordre,
      id_thematique
    } = req.body;
    
    logger.debug('POST /api/questions - Création d\'une nouvelle question');
    
    if (!id_questionnaire || !texte) {
      return res.status(400).json({ 
        message: 'Données invalides: id_questionnaire et texte sont requis' 
      });
    }
    
    // Vérifier si le questionnaire existe
    const [questionnaires] = await pool.query('SELECT * FROM questionnaires WHERE id_questionnaire = ?', [id_questionnaire]);
    if (questionnaires.length === 0) {
      return res.status(404).json({ message: 'Questionnaire non trouvé' });
    }
    
    // Si aucun ordre spécifié, utiliser le suivant disponible
    let finalOrdre = ordre;
    if (!finalOrdre) {
      const [maxOrdre] = await pool.query(
        'SELECT COALESCE(MAX(ordre), 0) + 1 as next_ordre FROM questions WHERE id_questionnaire = ?',
        [id_questionnaire]
      );
      finalOrdre = maxOrdre[0].next_ordre;
    }
    
    const id_question = uuidv4();
    const now = new Date();
    
    await pool.query(`
      INSERT INTO questions (
        id_question, id_questionnaire, texte, ponderation, ordre, 
        id_thematique, date_creation, date_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id_question,
      id_questionnaire,
      texte,
      ponderation || 1,
      finalOrdre,
      id_thematique || null,
      now,
      now
    ]);
    
    // Récupérer la question créée avec les informations du questionnaire
    const [newQuestion] = await pool.query(`
      SELECT q.*, qt.fonction, qt.thematique
      FROM questions q
      LEFT JOIN questionnaires qt ON q.id_questionnaire = qt.id_questionnaire
      WHERE q.id_question = ?
    `, [id_question]);
    
    res.status(201).json(newQuestion[0]);
  } catch (error) {
    logger.error('Erreur lors de la création de la question:', { error });
    res.status(500).json({ message: 'Erreur serveur lors de la création de la question' });
  }
});

// PUT mettre à jour une question
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      texte,
      ponderation,
      ordre,
      id_thematique
    } = req.body;
    
    logger.debug(`PUT /api/questions/${id} - Mise à jour d'une question`);
    
    // Vérifier si la question existe
    const [questions] = await pool.query('SELECT * FROM questions WHERE id_question = ?', [id]);
    if (questions.length === 0) {
      return res.status(404).json({ message: 'Question non trouvée' });
    }
    
    // Construire la requête de mise à jour
    let updateQuery = 'UPDATE questions SET date_modification = NOW()';
    const updateParams = [];
    
    if (texte !== undefined) {
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
    
    if (id_thematique !== undefined) {
      updateQuery += ', id_thematique = ?';
      updateParams.push(id_thematique);
    }
    
    updateQuery += ' WHERE id_question = ?';
    updateParams.push(id);
    
    await pool.query(updateQuery, updateParams);
    
    // Récupérer la question mise à jour
    const [updatedQuestion] = await pool.query(`
      SELECT q.*, qt.fonction, qt.thematique
      FROM questions q
      LEFT JOIN questionnaires qt ON q.id_questionnaire = qt.id_questionnaire
      WHERE q.id_question = ?
    `, [id]);
    
    res.status(200).json(updatedQuestion[0]);
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour de la question ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de la question' });
  }
});

// DELETE supprimer une question
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.debug(`DELETE /api/questions/${id} - Suppression d'une question`);
    
    // Vérifier si la question existe
    const [questions] = await pool.query('SELECT * FROM questions WHERE id_question = ?', [id]);
    if (questions.length === 0) {
      return res.status(404).json({ message: 'Question non trouvée' });
    }
    
    // Vérifier s'il existe des réponses liées à cette question
    const [reponses] = await pool.query('SELECT COUNT(*) as count FROM reponses WHERE id_question = ?', [id]);
    if (reponses[0].count > 0) {
      return res.status(400).json({ 
        message: 'Impossible de supprimer cette question car elle est liée à des réponses existantes'
      });
    }
    
    // Supprimer la question
    await pool.query('DELETE FROM questions WHERE id_question = ?', [id]);
    
    res.status(200).json({ message: 'Question supprimée avec succès' });
  } catch (error) {
    logger.error(`Erreur lors de la suppression de la question ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Erreur serveur lors de la suppression de la question' });
  }
});

// POST dupliquer une question
router.post('/:id/duplicate', async (req, res) => {
  try {
    const { id } = req.params;
    const { id_questionnaire_destination } = req.body;
    
    logger.debug(`POST /api/questions/${id}/duplicate - Duplication d'une question`);
    
    // Récupérer la question originale
    const [originalQuestions] = await pool.query('SELECT * FROM questions WHERE id_question = ?', [id]);
    if (originalQuestions.length === 0) {
      return res.status(404).json({ message: 'Question originale non trouvée' });
    }
    
    const originalQuestion = originalQuestions[0];
    const destinationQuestionnaire = id_questionnaire_destination || originalQuestion.id_questionnaire;
    
    // Vérifier si le questionnaire de destination existe
    const [questionnaires] = await pool.query('SELECT * FROM questionnaires WHERE id_questionnaire = ?', [destinationQuestionnaire]);
    if (questionnaires.length === 0) {
      return res.status(404).json({ message: 'Questionnaire de destination non trouvé' });
    }
    
    // Obtenir le prochain ordre disponible dans le questionnaire de destination
    const [maxOrdre] = await pool.query(
      'SELECT COALESCE(MAX(ordre), 0) + 1 as next_ordre FROM questions WHERE id_questionnaire = ?',
      [destinationQuestionnaire]
    );
    
    const id_question = uuidv4();
    const now = new Date();
    
    // Créer la question dupliquée
    await pool.query(`
      INSERT INTO questions (
        id_question, id_questionnaire, texte, ponderation, ordre, 
        id_thematique, date_creation, date_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id_question,
      destinationQuestionnaire,
      `${originalQuestion.texte} (copie)`,
      originalQuestion.ponderation,
      maxOrdre[0].next_ordre,
      originalQuestion.id_thematique,
      now,
      now
    ]);
    
    // Récupérer la question créée
    const [newQuestion] = await pool.query(`
      SELECT q.*, qt.fonction, qt.thematique
      FROM questions q
      LEFT JOIN questionnaires qt ON q.id_questionnaire = qt.id_questionnaire
      WHERE q.id_question = ?
    `, [id_question]);
    
    res.status(201).json(newQuestion[0]);
  } catch (error) {
    logger.error(`Erreur lors de la duplication de la question ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Erreur serveur lors de la duplication de la question' });
  }
});

// PUT réorganiser les questions d'un questionnaire
router.put('/questionnaire/:id/reorder', async (req, res) => {
  try {
    const { id } = req.params;
    const { questions } = req.body; // Array of {id_question, ordre}
    
    logger.debug(`PUT /api/questions/questionnaire/${id}/reorder - Réorganisation des questions`);
    
    // Vérifier si le questionnaire existe
    const [questionnaires] = await pool.query('SELECT * FROM questionnaires WHERE id_questionnaire = ?', [id]);
    if (questionnaires.length === 0) {
      return res.status(404).json({ message: 'Questionnaire non trouvé' });
    }
    
    if (!Array.isArray(questions)) {
      return res.status(400).json({ message: 'Format de données invalide pour la réorganisation' });
    }
    
    // Mettre à jour l'ordre de chaque question
    for (const question of questions) {
      if (question.id_question && question.ordre !== undefined) {
        await pool.query(
          'UPDATE questions SET ordre = ?, date_modification = NOW() WHERE id_question = ? AND id_questionnaire = ?',
          [question.ordre, question.id_question, id]
        );
      }
    }
    
    // Récupérer les questions réorganisées
    const [updatedQuestions] = await pool.query(`
      SELECT q.*, qt.fonction, qt.thematique
      FROM questions q
      LEFT JOIN questionnaires qt ON q.id_questionnaire = qt.id_questionnaire
      WHERE q.id_questionnaire = ?
      ORDER BY q.ordre ASC
    `, [id]);
    
    res.status(200).json(updatedQuestions);
  } catch (error) {
    logger.error(`Erreur lors de la réorganisation des questions du questionnaire ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Erreur serveur lors de la réorganisation des questions' });
  }
});

module.exports = router;