// server/routes/reponses-route.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// GET toutes les réponses
router.get('/', async (req, res) => {
  try {
    logger.debug('GET /api/reponses - Récupération de toutes les réponses');
    
    const [reponses] = await pool.query(`
      SELECT r.*, q.texte as question_texte, f.id_application
      FROM reponses r
      JOIN questions q ON r.id_question = q.id_question
      JOIN formulaires f ON r.id_formulaire = f.id_formulaire
      ORDER BY r.date_creation DESC
    `);
    
    res.status(200).json(reponses);
  } catch (error) {
    logger.error('Erreur lors de la récupération des réponses:', { error: error.message });
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des réponses' });
  }
});

// GET réponse par ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`GET /api/reponses/${id} - Récupération d'une réponse spécifique`);
    
    const [reponses] = await pool.query(`
      SELECT r.*, q.texte as question_texte, f.id_application
      FROM reponses r
      JOIN questions q ON r.id_question = q.id_question
      JOIN formulaires f ON r.id_formulaire = f.id_formulaire
      WHERE r.id_reponse = ?
    `, [id]);
    
    if (reponses.length === 0) {
      return res.status(404).json({ message: 'Réponse non trouvée' });
    }
    
    res.status(200).json(reponses[0]);
  } catch (error) {
    logger.error(`Erreur lors de la récupération de la réponse ${req.params.id}:`, { error: error.message });
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de la réponse' });
  }
});

// GET réponses par formulaire
router.get('/formulaire/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`GET /api/reponses/formulaire/${id} - Récupération des réponses par formulaire`);
    
    const [reponses] = await pool.query(`
      SELECT r.*, q.texte as question_texte, t.nom as thematique
      FROM reponses r
      JOIN questions q ON r.id_question = q.id_question
      LEFT JOIN thematiques t ON q.id_thematique = t.id_thematique
      WHERE r.id_formulaire = ?
      ORDER BY q.ordre ASC
    `, [id]);
    
    res.status(200).json(reponses);
  } catch (error) {
    logger.error(`Erreur lors de la récupération des réponses pour le formulaire ${req.params.id}:`, { error: error.message });
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des réponses par formulaire' });
  }
});

// POST nouvelle réponse - Version complète avec toutes les fonctionnalités
router.post('/', async (req, res) => {
  try {
    const { 
      id_formulaire,
      id_question,
      valeur_reponse,
      commentaire,
      score
    } = req.body;
    
    logger.debug('POST /api/reponses - Création d\'une nouvelle réponse', {
      id_formulaire,
      id_question,
      valeur_reponse,
      commentaire,
      score
    });
    
    // Validation des champs requis (identique à l'ancienne version)
    if (!id_formulaire || !id_question || valeur_reponse === undefined) {
      logger.warn('POST /api/reponses - Données manquantes', { id_formulaire, id_question, valeur_reponse });
      return res.status(400).json({ 
        message: 'Données invalides: id_formulaire, id_question et valeur_reponse sont requis',
        details: {
          id_formulaire: id_formulaire ? 'OK' : 'MANQUANT',
          id_question: id_question ? 'OK' : 'MANQUANT',
          valeur_reponse: valeur_reponse !== undefined ? 'OK' : 'MANQUANT'
        }
      });
    }
    
    // Vérifier si le formulaire existe (identique à l'ancienne version)
    const [formulaires] = await pool.query('SELECT * FROM formulaires WHERE id_formulaire = ?', [id_formulaire]);
    if (formulaires.length === 0) {
      logger.warn(`POST /api/reponses - Formulaire non trouvé: ${id_formulaire}`);
      return res.status(404).json({ message: 'Formulaire non trouvé' });
    }
    
    // Vérifier si la question existe et récupérer ses métadonnées (identique à l'ancienne version)
    const [questions] = await pool.query('SELECT * FROM questions WHERE id_question = ?', [id_question]);
    if (questions.length === 0) {
      logger.warn(`POST /api/reponses - Question non trouvée: ${id_question}`);
      return res.status(404).json({ message: 'Question non trouvée' });
    }
    
    // Vérifier si une réponse existe déjà pour cette combinaison formulaire/question
    const [existingReponses] = await pool.query(`
      SELECT * FROM reponses 
      WHERE id_formulaire = ? AND id_question = ?
    `, [id_formulaire, id_question]);
    
    if (existingReponses.length > 0) {
      // AMÉLIORATION : Au lieu de retourner une erreur 400, mettre à jour la réponse existante
      // Ceci résout le problème de FormDetail.tsx qui essaie de créer puis mettre à jour
      logger.info(`POST /api/reponses - Réponse existante trouvée, mise à jour: ${existingReponses[0].id_reponse}`);
      
      const questionData = questions[0];
      let calculatedScore = score;
      
      // Logique de calcul de score (adaptée de l'ancienne version pour la nouvelle structure)
      if (calculatedScore === undefined) {
        calculatedScore = calculateScore(valeur_reponse, questionData);
      }
      
      // Construire la requête de mise à jour
      let updateQuery = 'UPDATE reponses SET date_modification = NOW()';
      const updateParams = [];
      
      if (valeur_reponse !== undefined) {
        updateQuery += ', valeur_reponse = ?';
        updateParams.push(valeur_reponse.toString());
      }
      
      updateQuery += ', score = ?';
      updateParams.push(calculatedScore);
      
      if (commentaire !== undefined) {
        updateQuery += ', commentaire = ?';
        updateParams.push(commentaire || '');
      }
      
      updateQuery += ' WHERE id_reponse = ?';
      updateParams.push(existingReponses[0].id_reponse);
      
      await pool.query(updateQuery, updateParams);
      
      // Récupérer la réponse mise à jour
      const [updatedReponses] = await pool.query('SELECT * FROM reponses WHERE id_reponse = ?', [existingReponses[0].id_reponse]);
      
      logger.info(`POST /api/reponses - Réponse mise à jour avec succès: ${existingReponses[0].id_reponse}`);
      return res.status(200).json(updatedReponses[0]);
    }
    
    // Créer une nouvelle réponse (logique de l'ancienne version)
    const id_reponse = uuidv4();
    const now = new Date();
    
    const questionData = questions[0];
    let calculatedScore = score;
    
    // Logique de calcul de score (adaptée de l'ancienne version)
    if (calculatedScore === undefined) {
      calculatedScore = calculateScore(valeur_reponse, questionData);
    }
    
    await pool.query(`
      INSERT INTO reponses (
        id_reponse, id_formulaire, id_question, valeur_reponse,
        commentaire, score, date_creation, date_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id_reponse,
      id_formulaire,
      id_question,
      valeur_reponse.toString(),
      commentaire || '',
      calculatedScore,
      now,
      now
    ]);
    
    logger.info(`POST /api/reponses - Nouvelle réponse créée avec succès: ${id_reponse}`);
    
    res.status(201).json({
      id_reponse,
      id_formulaire,
      id_question,
      valeur_reponse: valeur_reponse.toString(),
      commentaire: commentaire || '',
      score: calculatedScore,
      date_creation: now,
      date_modification: now
    });
  } catch (error) {
    logger.error('Erreur lors de la création de la réponse:', { 
      error: error.message, 
      stack: error.stack,
      body: req.body 
    });
    res.status(500).json({ 
      message: 'Erreur serveur lors de la création de la réponse',
      details: error.message 
    });
  }
});

// PUT mettre à jour une réponse - Version améliorée de l'ancienne
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { valeur_reponse, commentaire, score } = req.body;
    
    logger.debug(`PUT /api/reponses/${id} - Mise à jour d'une réponse`, {
      valeur_reponse,
      commentaire,
      score
    });
    
    // Vérifier si la réponse existe
    const [reponses] = await pool.query('SELECT * FROM reponses WHERE id_reponse = ?', [id]);
    
    if (reponses.length === 0) {
      logger.warn(`PUT /api/reponses/${id} - Réponse non trouvée`);
      return res.status(404).json({ message: 'Réponse non trouvée' });
    }
    
    // Récupérer les métadonnées de la question pour le calcul de score
    let questionData = null;
    if (valeur_reponse !== undefined && score === undefined) {
      const [questions] = await pool.query('SELECT * FROM questions WHERE id_question = ?', [reponses[0].id_question]);
      if (questions.length > 0) {
        questionData = questions[0];
      }
    }
    
    // Construire la requête de mise à jour (logique améliorée de l'ancienne version)
    let updateQuery = 'UPDATE reponses SET date_modification = NOW()';
    const updateParams = [];
    
    if (valeur_reponse !== undefined) {
      updateQuery += ', valeur_reponse = ?';
      updateParams.push(valeur_reponse.toString());
    }
    
    if (score !== undefined) {
      updateQuery += ', score = ?';
      updateParams.push(score);
    } else if (valeur_reponse !== undefined && questionData) {
      // Recalculer le score basé sur la nouvelle valeur_reponse
      const calculatedScore = calculateScore(valeur_reponse, questionData);
      updateQuery += ', score = ?';
      updateParams.push(calculatedScore);
    }
    
    if (commentaire !== undefined) {
      updateQuery += ', commentaire = ?';
      updateParams.push(commentaire || '');
    }
    
    updateQuery += ' WHERE id_reponse = ?';
    updateParams.push(id);
    
    await pool.query(updateQuery, updateParams);
    
    // Récupérer la réponse mise à jour
    const [updatedReponses] = await pool.query('SELECT * FROM reponses WHERE id_reponse = ?', [id]);
    
    logger.info(`PUT /api/reponses/${id} - Réponse mise à jour avec succès`);
    
    res.status(200).json(updatedReponses[0]);
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour de la réponse ${req.params.id}:`, { 
      error: error.message, 
      stack: error.stack,
      body: req.body 
    });
    res.status(500).json({ 
      message: 'Erreur serveur lors de la mise à jour de la réponse',
      details: error.message 
    });
  }
});

// DELETE supprimer une réponse (identique à l'ancienne version)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.debug(`DELETE /api/reponses/${id} - Suppression d'une réponse`);
    
    // Vérifier si la réponse existe
    const [reponses] = await pool.query('SELECT * FROM reponses WHERE id_reponse = ?', [id]);
    
    if (reponses.length === 0) {
      logger.warn(`DELETE /api/reponses/${id} - Réponse non trouvée`);
      return res.status(404).json({ message: 'Réponse non trouvée' });
    }
    
    await pool.query('DELETE FROM reponses WHERE id_reponse = ?', [id]);
    
    logger.info(`DELETE /api/reponses/${id} - Réponse supprimée avec succès`);
    
    res.status(200).json({ message: 'Réponse supprimée avec succès' });
  } catch (error) {
    logger.error(`Erreur lors de la suppression de la réponse ${req.params.id}:`, { 
      error: error.message, 
      stack: error.stack 
    });
    res.status(500).json({ 
      message: 'Erreur serveur lors de la suppression de la réponse',
      details: error.message 
    });
  }
});

// FONCTION UTILITAIRE : Calcul de score adapté à la nouvelle structure
// (Reprend la logique de l'ancienne version mais adaptée)
function calculateScore(valeur_reponse, questionData) {
  // Avec la nouvelle structure, on n'a plus questionData.type et questionData.points_max
  // Mais on a questionData.ponderation qu'on peut utiliser
  
  const ponderation = questionData.ponderation || 1;
  const valeurNumerique = parseInt(valeur_reponse) || 0;
  
  // Logique simple adaptée : score = (valeur / 5) * pondération
  // Ceci remplace l'ancienne logique complexe basée sur le type
  if (valeurNumerique >= 1 && valeurNumerique <= 5) {
    // Pour une échelle 1-5, calculer le score proportionnel à la pondération
    return Math.round((valeurNumerique / 5) * ponderation);
  }
  
  // Pour les réponses oui/non (si valeur_reponse est un string)
  if (valeur_reponse.toString().toLowerCase() === 'oui') {
    return ponderation;
  } else if (valeur_reponse.toString().toLowerCase() === 'non') {
    return 0;
  }
  
  // Valeur par défaut
  return 0;
}

module.exports = router;