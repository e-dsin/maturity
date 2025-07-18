// server/routes/maturity-global-route.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { body, validationResult } = require('express-validator');

// Helper function to calculate maturity level from score
const getMaturityLevel = (score) => {
  if (score >= 4.5) return 'Niveau 5 - Optimisé';
  if (score >= 3.5) return 'Niveau 4 - Géré';
  if (score >= 2.5) return 'Niveau 3 - Mesuré';
  if (score >= 1.5) return 'Niveau 2 - Défini';
  return 'Niveau 1 - Initial';
};

// Helper function to convert score (1-5) to percentage (0-100)
const scoreToPercentage = (score) => {
  return Math.round(((score - 1) / 4) * 100 * 100) / 100; // Convert 1-5 scale to 0-100
};

// ========== QUESTIONS MANAGEMENT ==========

// GET /api/maturity-global/questions - Get all questions grouped by function
router.get('/questions', async (req, res) => {
  try {
    logger.debug('GET /api/maturity-global/questions - Retrieving all maturity questions');
    
    const [questions] = await pool.query(`
      SELECT 
        id_question,
        fonction,
        numero_question,
        texte_question,
        description,
        poids,
        type_reponse,
        ordre_affichage,
        actif,
        created_at,
        updated_at
      FROM questions_maturite_globale 
      WHERE actif = TRUE 
      ORDER BY ordre_affichage, numero_question
    `);
    
    // Group questions by function
    const questionsByFunction = {
      cybersecurite: [],
      maturite_digitale: [],
      gouvernance_donnees: [],
      devsecops: [],
      innovation_numerique: []
    };
    
    questions.forEach(question => {
      if (questionsByFunction[question.fonction]) {
        questionsByFunction[question.fonction].push(question);
      }
    });
    
    // Function labels for frontend
    const functionLabels = {
      cybersecurite: 'Cybersécurité',
      maturite_digitale: 'Maturité Digitale',
      gouvernance_donnees: 'Gouvernance des Données',
      devsecops: 'DevSecOps',
      innovation_numerique: 'Innovation Numérique'
    };
    
    const response = {
      questions: questionsByFunction,
      function_labels: functionLabels,
      total_questions: questions.length,
      questions_per_function: {
        cybersecurite: questionsByFunction.cybersecurite.length,
        maturite_digitale: questionsByFunction.maturite_digitale.length,
        gouvernance_donnees: questionsByFunction.gouvernance_donnees.length,
        devsecops: questionsByFunction.devsecops.length,
        innovation_numerique: questionsByFunction.innovation_numerique.length
      },
      response_options: [
        { value: 1, label: 'Pas du tout' },
        { value: 2, label: 'Partiellement' },
        { value: 3, label: 'Moyennement' },
        { value: 4, label: 'Largement' },
        { value: 5, label: 'Totalement' }
      ]
    };
    
    res.json(response);
    
  } catch (error) {
    logger.error('Error retrieving maturity questions:', error);
    res.status(500).json({
      message: 'Error retrieving maturity questions'
    });
  }
});

// POST /api/maturity-global/questions - Create new question
router.post('/questions', [
  body('fonction').isIn(['cybersecurite', 'maturite_digitale', 'gouvernance_donnees', 'devsecops', 'innovation_numerique']),
  body('texte_question').trim().isLength({ min: 10, max: 1000 }),
  body('numero_question').isInt({ min: 1, max: 50 }),
  body('poids').optional().isFloat({ min: 0.1, max: 3.0 }),
  body('ordre_affichage').isInt({ min: 1, max: 100 })
], async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await connection.rollback();
      return res.status(400).json({
        message: 'Validation errors',
        errors: errors.array()
      });
    }
    
    const {
      fonction,
      numero_question,
      texte_question,
      description = '',
      poids = 1.0,
      ordre_affichage
    } = req.body;
    
    const id_question = uuidv4();
    
    await connection.query(`
      INSERT INTO questions_maturite_globale (
        id_question, fonction, numero_question, texte_question, 
        description, poids, ordre_affichage
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id_question, fonction, numero_question, texte_question, description, poids, ordre_affichage]);
    
    await connection.commit();
    
    logger.info('Question created:', { id_question, fonction, numero_question });
    res.status(201).json({
      message: 'Question created successfully',
      id_question
    });
    
  } catch (error) {
    await connection.rollback();
    logger.error('Error creating question:', error);
    res.status(500).json({
      message: 'Error creating question'
    });
  } finally {
    connection.release();
  }
});

// PUT /api/maturity-global/questions/:id - Update question
router.put('/questions/:id', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const {
      texte_question,
      description,
      poids,
      ordre_affichage,
      actif
    } = req.body;
    
    const [result] = await connection.query(`
      UPDATE questions_maturite_globale 
      SET texte_question = ?, description = ?, poids = ?, 
          ordre_affichage = ?, actif = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id_question = ?
    `, [texte_question, description, poids, ordre_affichage, actif, id]);
    
    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({
        message: 'Question not found'
      });
    }
    
    await connection.commit();
    
    res.json({
      message: 'Question updated successfully'
    });
    
  } catch (error) {
    await connection.rollback();
    logger.error('Error updating question:', error);
    res.status(500).json({
      message: 'Error updating question'
    });
  } finally {
    connection.release();
  }
});

// DELETE /api/maturity-global/questions/:id - Deactivate question
router.delete('/questions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await pool.query(`
      UPDATE questions_maturite_globale 
      SET actif = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE id_question = ?
    `, [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: 'Question not found'
      });
    }
    
    res.json({
      message: 'Question deactivated successfully'
    });
    
  } catch (error) {
    logger.error('Error deactivating question:', error);
    res.status(500).json({
      message: 'Error deactivating question'
    });
  }
});

// ========== RECOMMENDATIONS MANAGEMENT ==========

// GET /api/maturity-global/recommendations - Get all recommendations
router.get('/recommendations', async (req, res) => {
  try {
    const { fonction, type_recommandation } = req.query;
    
    let query = `
      SELECT * FROM recommandations_maturite 
      WHERE est_actif = TRUE
    `;
    const params = [];
    
    if (fonction) {
      query += ' AND fonction = ?';
      params.push(fonction);
    }
    
    if (type_recommandation) {
      query += ' AND type_recommandation = ?';
      params.push(type_recommandation);
    }
    
    query += ' ORDER BY fonction, niveau_min, priorite DESC';
    
    const [recommendations] = await pool.query(query, params);
    
    res.json(recommendations);
    
  } catch (error) {
    logger.error('Error retrieving recommendations:', error);
    res.status(500).json({
      message: 'Error retrieving recommendations'
    });
  }
});

// GET /api/maturity-global/recommendations/for-score - Get recommendations for specific scores
router.get('/recommendations/for-score', async (req, res) => {
  try {
    const { fonction, score, type = 'CABINET' } = req.query;
    
    if (!fonction || !score) {
      return res.status(400).json({
        message: 'Fonction and score parameters are required'
      });
    }
    
    const scoreValue = parseFloat(score);
    
    const [recommendations] = await pool.query(`
      SELECT * FROM recommandations_maturite 
      WHERE fonction = ? 
        AND niveau_min <= ? 
        AND niveau_max >= ? 
        AND est_actif = TRUE
        AND type_recommandation = ?
      ORDER BY priorite DESC, created_at DESC
    `, [fonction, scoreValue, scoreValue, type]);
    
    res.json(recommendations);
    
  } catch (error) {
    logger.error('Error retrieving recommendations for score:', error);
    res.status(500).json({
      message: 'Error retrieving recommendations'
    });
  }
});

// POST /api/maturity-global/recommendations - Create new recommendation
router.post('/recommendations', [
  body('fonction').isIn(['cybersecurite', 'maturite_digitale', 'gouvernance_donnees', 'devsecops', 'innovation_numerique']),
  body('niveau_min').isFloat({ min: 1.0, max: 5.0 }),
  body('niveau_max').isFloat({ min: 1.0, max: 5.0 }),
  body('type_recommandation').isIn(['CABINET', 'LLM_PUBLIC', 'PERSONNALISEE']),
  body('titre').trim().isLength({ min: 5, max: 200 }),
  body('description').trim().isLength({ min: 10, max: 2000 }),
  body('priorite').isIn(['HAUTE', 'MOYENNE', 'FAIBLE'])
], async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await connection.rollback();
      return res.status(400).json({
        message: 'Validation errors',
        errors: errors.array()
      });
    }
    
    const {
      fonction,
      niveau_min,
      niveau_max,
      type_recommandation,
      titre,
      description,
      actions_recommandees,
      priorite
    } = req.body;
    
    if (niveau_min > niveau_max) {
      await connection.rollback();
      return res.status(400).json({
        message: 'niveau_min cannot be greater than niveau_max'
      });
    }
    
    const id_recommandation = uuidv4();
    
    await connection.query(`
      INSERT INTO recommandations_maturite (
        id_recommandation, fonction, niveau_min, niveau_max, 
        type_recommandation, titre, description, actions_recommandees, priorite
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id_recommandation, fonction, niveau_min, niveau_max,
      type_recommandation, titre, description, 
      actions_recommandees ? JSON.stringify(actions_recommandees) : null, priorite
    ]);
    
    await connection.commit();
    
    logger.info('Recommendation created:', { id_recommandation, fonction, type_recommandation });
    res.status(201).json({
      message: 'Recommendation created successfully',
      id_recommandation
    });
    
  } catch (error) {
    await connection.rollback();
    logger.error('Error creating recommendation:', error);
    res.status(500).json({
      message: 'Error creating recommendation'
    });
  } finally {
    connection.release();
  }
});

// PUT /api/maturity-global/recommendations/:id - Update recommendation
router.put('/recommendations/:id', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const {
      niveau_min,
      niveau_max,
      titre,
      description,
      actions_recommandees,
      priorite,
      est_actif
    } = req.body;
    
    if (niveau_min && niveau_max && niveau_min > niveau_max) {
      await connection.rollback();
      return res.status(400).json({
        message: 'niveau_min cannot be greater than niveau_max'
      });
    }
    
    const [result] = await connection.query(`
      UPDATE recommandations_maturite 
      SET niveau_min = ?, niveau_max = ?, titre = ?, description = ?, 
          actions_recommandees = ?, priorite = ?, est_actif = ?, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id_recommandation = ?
    `, [
      niveau_min, niveau_max, titre, description,
      actions_recommandees ? JSON.stringify(actions_recommandees) : null,
      priorite, est_actif, id
    ]);
    
    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({
        message: 'Recommendation not found'
      });
    }
    
    await connection.commit();
    
    res.json({
      message: 'Recommendation updated successfully'
    });
    
  } catch (error) {
    await connection.rollback();
    logger.error('Error updating recommendation:', error);
    res.status(500).json({
      message: 'Error updating recommendation'
    });
  } finally {
    connection.release();
  }
});

// DELETE /api/maturity-global/recommendations/:id - Deactivate recommendation
router.delete('/recommendations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await pool.query(`
      UPDATE recommandations_maturite 
      SET est_actif = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE id_recommandation = ?
    `, [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: 'Recommendation not found'
      });
    }
    
    res.json({
      message: 'Recommendation deactivated successfully'
    });
    
  } catch (error) {
    logger.error('Error deactivating recommendation:', error);
    res.status(500).json({
      message: 'Error deactivating recommendation'
    });
  }
});

// ========== EVALUATIONS MANAGEMENT ==========

// GET /api/maturity-global/evaluations - Get evaluations with filters
router.get('/evaluations', async (req, res) => {
  try {
    const {
      id_entreprise,
      statut,
      date_from,
      date_to,
      limit = 50,
      offset = 0
    } = req.query;
    
    let query = `
      SELECT 
        ev.*,
        e.nom_entreprise,
        e.secteur,
        e.taille_entreprise,
        a.nom_prenom as evaluateur_nom,
        a.email as evaluateur_email
      FROM evaluations_maturite_globale ev
      JOIN entreprises e ON ev.id_entreprise = e.id_entreprise
      JOIN acteurs a ON ev.id_acteur = a.id_acteur
      WHERE 1=1
    `;
    const params = [];
    
    if (id_entreprise) {
      query += ' AND ev.id_entreprise = ?';
      params.push(id_entreprise);
    }
    
    if (statut) {
      query += ' AND ev.statut = ?';
      params.push(statut);
    }
    
    if (date_from) {
      query += ' AND ev.date_debut >= ?';
      params.push(date_from);
    }
    
    if (date_to) {
      query += ' AND ev.date_debut <= ?';
      params.push(date_to);
    }
    
    query += ' ORDER BY ev.date_debut DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [evaluations] = await pool.query(query, params);
    
    // Enrich with calculated fields
    const enrichedEvaluations = evaluations.map(evaluation => ({
      ...evaluation,
      score_global_percentage: scoreToPercentage(evaluation.score_global),
      niveau_global: getMaturityLevel(evaluation.score_global),
      scores_fonctions_percentage: {
        cybersecurite: scoreToPercentage(evaluation.score_cybersecurite),
        maturite_digitale: scoreToPercentage(evaluation.score_maturite_digitale),
        gouvernance_donnees: scoreToPercentage(evaluation.score_gouvernance_donnees),
        devsecops: scoreToPercentage(evaluation.score_devsecops),
        innovation_numerique: scoreToPercentage(evaluation.score_innovation_numerique)
      }
    }));
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM evaluations_maturite_globale ev
      WHERE 1=1
    `;
    const countParams = [];
    
    if (id_entreprise) {
      countQuery += ' AND ev.id_entreprise = ?';
      countParams.push(id_entreprise);
    }
    
    if (statut) {
      countQuery += ' AND ev.statut = ?';
      countParams.push(statut);
    }
    
    if (date_from) {
      countQuery += ' AND ev.date_debut >= ?';
      countParams.push(date_from);
    }
    
    if (date_to) {
      countQuery += ' AND ev.date_debut <= ?';
      countParams.push(date_to);
    }
    
    const [countResult] = await pool.query(countQuery, countParams);
    
    res.json({
      evaluations: enrichedEvaluations,
      pagination: {
        total: countResult[0].total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: countResult[0].total > (parseInt(offset) + parseInt(limit))
      }
    });
    
  } catch (error) {
    logger.error('Error retrieving evaluations:', error);
    res.status(500).json({
      message: 'Error retrieving evaluations'
    });
  }
});

// GET /api/maturity-global/evaluations/:id - Get specific evaluation with responses
router.get('/evaluations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get evaluation details
    const [evaluations] = await pool.query(`
      SELECT 
        ev.*,
        e.nom_entreprise,
        e.secteur,
        e.taille_entreprise,
        a.nom_prenom as evaluateur_nom,
        a.email as evaluateur_email
      FROM evaluations_maturite_globale ev
      JOIN entreprises e ON ev.id_entreprise = e.id_entreprise
      JOIN acteurs a ON ev.id_acteur = a.id_acteur
      WHERE ev.id_evaluation = ?
    `, [id]);
    
    if (evaluations.length === 0) {
      return res.status(404).json({
        message: 'Evaluation not found'
      });
    }
    
    const evaluation = evaluations[0];
    
    // Get responses if evaluation is completed
    let responses = [];
    if (evaluation.statut === 'TERMINE') {
      const [responsesData] = await pool.query(`
        SELECT 
          r.*,
          q.fonction,
          q.numero_question,
          q.texte_question,
          q.description,
          q.poids,
          q.ordre_affichage
        FROM reponses_maturite_globale r
        JOIN questions_maturite_globale q ON r.id_question = q.id_question
        WHERE r.id_evaluation = ?
        ORDER BY q.ordre_affichage
      `, [id]);
      
      responses = responsesData;
    }
    
    // Group responses by function
    const responsesByFunction = responses.reduce((acc, response) => {
      if (!acc[response.fonction]) {
        acc[response.fonction] = [];
      }
      acc[response.fonction].push(response);
      return acc;
    }, {});
    
    // Enrich evaluation data
    const enrichedEvaluation = {
      ...evaluation,
      score_global_percentage: scoreToPercentage(evaluation.score_global),
      niveau_global: getMaturityLevel(evaluation.score_global),
      scores_fonctions: {
        cybersecurite: {
          score_raw: evaluation.score_cybersecurite,
          score_percentage: scoreToPercentage(evaluation.score_cybersecurite),
          niveau: getMaturityLevel(evaluation.score_cybersecurite)
        },
        maturite_digitale: {
          score_raw: evaluation.score_maturite_digitale,
          score_percentage: scoreToPercentage(evaluation.score_maturite_digitale),
          niveau: getMaturityLevel(evaluation.score_maturite_digitale)
        },
        gouvernance_donnees: {
          score_raw: evaluation.score_gouvernance_donnees,
          score_percentage: scoreToPercentage(evaluation.score_gouvernance_donnees),
          niveau: getMaturityLevel(evaluation.score_gouvernance_donnees)
        },
        devsecops: {
          score_raw: evaluation.score_devsecops,
          score_percentage: scoreToPercentage(evaluation.score_devsecops),
          niveau: getMaturityLevel(evaluation.score_devsecops)
        },
        innovation_numerique: {
          score_raw: evaluation.score_innovation_numerique,
          score_percentage: scoreToPercentage(evaluation.score_innovation_numerique),
          niveau: getMaturityLevel(evaluation.score_innovation_numerique)
        }
      },
      responses_by_function: responsesByFunction,
      total_responses: responses.length
    };
    
    res.json(enrichedEvaluation);
    
  } catch (error) {
    logger.error('Error retrieving evaluation:', error);
    res.status(500).json({
      message: 'Error retrieving evaluation'
    });
  }
});

// DELETE /api/maturity-global/evaluations/:id - Delete evaluation (admin only)
router.delete('/evaluations/:id', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // Check if evaluation exists
    const [evaluations] = await connection.query(
      'SELECT id_evaluation, statut FROM evaluations_maturite_globale WHERE id_evaluation = ?',
      [id]
    );
    
    if (evaluations.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        message: 'Evaluation not found'
      });
    }
    
    // Delete responses first (cascade should handle this, but being explicit)
    await connection.query(
      'DELETE FROM reponses_maturite_globale WHERE id_evaluation = ?',
      [id]
    );
    
    // Delete evaluation
    await connection.query(
      'DELETE FROM evaluations_maturite_globale WHERE id_evaluation = ?',
      [id]
    );
    
    await connection.commit();
    
    logger.info('Evaluation deleted:', { id_evaluation: id });
    res.json({
      message: 'Evaluation deleted successfully'
    });
    
  } catch (error) {
    await connection.rollback();
    logger.error('Error deleting evaluation:', error);
    res.status(500).json({
      message: 'Error deleting evaluation'
    });
  } finally {
    connection.release();
  }
});

// ========== STATISTICS ==========

// GET /api/maturity-global/statistics - Get global statistics
router.get('/statistics', async (req, res) => {
  try {
    logger.debug('GET /api/maturity-global/statistics');
    
    // Get overall statistics
    const [globalStats] = await pool.query(`
      SELECT 
        COUNT(DISTINCT ev.id_entreprise) as entreprises_evaluees,
        COUNT(DISTINCT ev.id_evaluation) as evaluations_terminees,
        COUNT(DISTINCT ev.id_acteur) as acteurs_participants,
        ROUND(AVG(ev.score_global), 2) as score_moyen_global,
        ROUND(AVG(ev.score_cybersecurite), 2) as score_moyen_cybersecurite,
        ROUND(AVG(ev.score_maturite_digitale), 2) as score_moyen_maturite_digitale,
        ROUND(AVG(ev.score_gouvernance_donnees), 2) as score_moyen_gouvernance_donnees,
        ROUND(AVG(ev.score_devsecops), 2) as score_moyen_devsecops,
        ROUND(AVG(ev.score_innovation_numerique), 2) as score_moyen_innovation_numerique,
        ROUND(AVG(ev.duree_evaluation), 0) as duree_moyenne_minutes
      FROM evaluations_maturite_globale ev
      WHERE ev.statut = 'TERMINE'
    `);
    
    // Get statistics by sector
    const [sectorStats] = await pool.query(`
      SELECT 
        e.secteur,
        COUNT(DISTINCT ev.id_evaluation) as nombre_evaluations,
        COUNT(DISTINCT ev.id_entreprise) as nombre_entreprises,
        ROUND(AVG(ev.score_global), 2) as score_moyen
      FROM evaluations_maturite_globale ev
      JOIN entreprises e ON ev.id_entreprise = e.id_entreprise
      WHERE ev.statut = 'TERMINE' AND e.secteur IS NOT NULL
      GROUP BY e.secteur
      ORDER BY score_moyen DESC
      LIMIT 10
    `);
    
    // Get statistics by company size
    const [sizeStats] = await pool.query(`
      SELECT 
        e.taille_entreprise,
        COUNT(DISTINCT ev.id_evaluation) as nombre_evaluations,
        COUNT(DISTINCT ev.id_entreprise) as nombre_entreprises,
        ROUND(AVG(ev.score_global), 2) as score_moyen
      FROM evaluations_maturite_globale ev
      JOIN entreprises e ON ev.id_entreprise = e.id_entreprise
      WHERE ev.statut = 'TERMINE' AND e.taille_entreprise IS NOT NULL
      GROUP BY e.taille_entreprise
      ORDER BY 
        CASE e.taille_entreprise 
          WHEN 'TPE' THEN 1 
          WHEN 'PME' THEN 2 
          WHEN 'ETI' THEN 3 
          WHEN 'GE' THEN 4 
          ELSE 5 
        END
    `);
    
    // Get recent activity
    const [recentActivity] = await pool.query(`
      SELECT 
        ev.id_evaluation,
        ev.score_global,
        ev.date_soumission,
        e.nom_entreprise,
        a.nom_prenom as evaluateur_nom
      FROM evaluations_maturite_globale ev
      JOIN entreprises e ON ev.id_entreprise = e.id_entreprise
      JOIN acteurs a ON ev.id_acteur = a.id_acteur
      WHERE ev.statut = 'TERMINE'
      ORDER BY ev.date_soumission DESC
      LIMIT 10
    `);
    
    const response = {
      global_statistics: {
        ...globalStats[0],
        score_moyen_global_percentage: scoreToPercentage(globalStats[0].score_moyen_global || 0),
        niveau_moyen_global: getMaturityLevel(globalStats[0].score_moyen_global || 0)
      },
      statistics_by_sector: sectorStats.map(stat => ({
        ...stat,
        score_moyen_percentage: scoreToPercentage(stat.score_moyen || 0),
        niveau_moyen: getMaturityLevel(stat.score_moyen || 0)
      })),
      statistics_by_size: sizeStats.map(stat => ({
        ...stat,
        score_moyen_percentage: scoreToPercentage(stat.score_moyen || 0),
        niveau_moyen: getMaturityLevel(stat.score_moyen || 0)
      })),
      recent_activity: recentActivity.map(activity => ({
        ...activity,
        score_global_percentage: scoreToPercentage(activity.score_global || 0),
        niveau_global: getMaturityLevel(activity.score_global || 0)
      }))
    };
    
    res.json(response);
    
  } catch (error) {
    logger.error('Error retrieving statistics:', error);
    res.status(500).json({
      message: 'Error retrieving statistics'
    });
  }
});

// ========== DATA EXPORT ==========

// GET /api/maturity-global/export/questions - Export questions as JSON
router.get('/export/questions', async (req, res) => {
  try {
    const [questions] = await pool.query(`
      SELECT * FROM questions_maturite_globale 
      ORDER BY ordre_affichage
    `);
    
    const exportData = {
      export_date: new Date().toISOString(),
      total_questions: questions.length,
      questions: questions
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="maturity-questions.json"');
    res.json(exportData);
    
  } catch (error) {
    logger.error('Error exporting questions:', error);
    res.status(500).json({
      message: 'Error exporting questions'
    });
  }
});

// GET /api/maturity-global/export/recommendations - Export recommendations as JSON
router.get('/export/recommendations', async (req, res) => {
  try {
    const [recommendations] = await pool.query(`
      SELECT * FROM recommandations_maturite 
      WHERE est_actif = TRUE
      ORDER BY fonction, niveau_min
    `);
    
    const exportData = {
      export_date: new Date().toISOString(),
      total_recommendations: recommendations.length,
      recommendations: recommendations
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="maturity-recommendations.json"');
    res.json(exportData);
    
  } catch (error) {
    logger.error('Error exporting recommendations:', error);
    res.status(500).json({
      message: 'Error exporting recommendations'
    });
  }
});

module.exports = router;