// server/routes/maturity-evaluation-route.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const logger = require('../utils/logger');
const { authenticateToken, requireFormAccess } = require('../middlewares/auth-middleware');

// 🚀 OPTIMISATION : Endpoint unique pour récupérer toutes les données d'évaluation
router.get('/evaluation-data/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // ✅ Une seule requête SQL avec toutes les jointures nécessaires
    const [results] = await pool.query(`
      SELECT 
        -- Données de l'évaluation
        ev.id_evaluation,
        ev.id_entreprise,
        ev.id_acteur,
        ev.statut,
        ev.date_debut,
        e.nom_entreprise,
        a.nom_prenom as nom_acteur,
        
        -- Données des fonctions
        fg.id_fonction,
        fg.nom as nom_fonction,
        fg.description as description_fonction,
        fg.code_fonction,
        fg.couleur,
        fg.icone,
        fg.ordre_affichage as ordre_fonction,
        
        -- Données des questions
        q.id_question,
        q.numero_question,
        q.texte_question,
        q.description as description_question,
        q.poids,
        q.type_reponse,
        q.ordre_affichage as ordre_question,
        
        -- Réponses existantes (si reprise d'évaluation)
        r.valeur_reponse,
        r.commentaire,
        r.score_normalise
        
      FROM evaluations_maturite_globale ev
      JOIN entreprises e ON ev.id_entreprise = e.id_entreprise
      JOIN acteurs a ON ev.id_acteur = a.id_acteur
      CROSS JOIN fonctions_maturite_globale fg
      JOIN questions_maturite_globale q ON fg.id_fonction = q.id_fonction_globale
      LEFT JOIN reponses_maturite_globale r ON ev.id_evaluation = r.id_evaluation 
        AND q.id_question = r.id_question
      
      WHERE ev.id_evaluation = ? 
        AND fg.actif = 1 
        AND q.actif = 1
      
      ORDER BY fg.ordre_affichage, q.ordre_affichage
    `, [id]);
    
    if (results.length === 0) {
      return res.status(404).json({ message: 'Évaluation non trouvée' });
    }
    
    // ✅ Structurer les données côté serveur pour éviter le travail côté client
    const evaluation = {
      id_evaluation: results[0].id_evaluation,
      id_entreprise: results[0].id_entreprise,
      id_acteur: results[0].id_acteur,
      statut: results[0].statut,
      date_debut: results[0].date_debut,
      nom_entreprise: results[0].nom_entreprise,
      nom_acteur: results[0].nom_acteur,
      is_resuming: results[0].statut === 'EN_COURS'
    };
    
    // ✅ Grouper par fonction une seule fois côté serveur
    const fonctionsMap = new Map();
    const responsesMap = new Map();
    
    results.forEach(row => {
      const fonctionKey = row.id_fonction;
      
      // Construire les fonctions
      if (!fonctionsMap.has(fonctionKey)) {
        fonctionsMap.set(fonctionKey, {
          id_fonction: row.id_fonction,
          nom: row.nom_fonction,
          description: row.description_fonction,
          code_fonction: row.code_fonction,
          couleur: row.couleur,
          icone: row.icone,
          ordre_affichage: row.ordre_fonction,
          questions: []
        });
      }
      
      // Ajouter les questions
      const fonction = fonctionsMap.get(fonctionKey);
      if (!fonction.questions.find(q => q.id_question === row.id_question)) {
        fonction.questions.push({
          id_question: row.id_question,
          numero_question: row.numero_question,
          texte_question: row.texte_question,
          description: row.description_question,
          poids: row.poids,
          type_reponse: row.type_reponse,
          ordre_affichage: row.ordre_question
        });
      }
      
      // Construire les réponses existantes
      if (row.valeur_reponse !== null) {
        responsesMap.set(row.id_question, {
          id_question: row.id_question,
          valeur_reponse: row.valeur_reponse,
          commentaire: row.commentaire,
          score_question: row.valeur_reponse * 20
        });
      }
    });
    
    const fonctionsGlobales = Array.from(fonctionsMap.values())
      .sort((a, b) => a.ordre_affichage - b.ordre_affichage);
    
    const responses = Object.fromEntries(responsesMap);
    
    // ✅ Retourner toutes les données en une seule réponse
    res.json({
      evaluation,
      fonctionsGlobales,
      responses,
      metadata: {
        total_functions: fonctionsGlobales.length,
        total_questions: fonctionsGlobales.reduce((sum, f) => sum + f.questions.length, 0),
        existing_responses: Object.keys(responses).length,
        load_time: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Erreur lors du chargement optimisé:', error);
    res.status(500).json({
      message: 'Erreur lors du chargement des données d\'évaluation'
    });
  }
});

// GET /:id/responses - Récupérer toutes les réponses pour une évaluation spécifique
  router.get(
  '/:id/responses',
  authenticateToken,
  requireFormAccess,
  async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      const result = await client.query(
        `
        SELECT 
          r.id_reponse,
          r.id_question,
          r.valeur_reponse,
          r.score_normalise,
          r.commentaire,
          q.id_fonction_globale,
          fg.nom AS fonction_nom
        FROM reponses_maturite_globale r
        JOIN questions_maturite_globale q ON r.id_question = q.id_question
        JOIN fonctions_maturite_globale fg ON q.id_fonction_globale = fg.id_fonction
        WHERE r.id_evaluation = $1
          AND q.actif = 1
          AND fg.actif = 1
        `,
        [id]
      );

      logger.info(`Récupération des réponses pour id_evaluation: ${id}, ${result.rows.length} réponses trouvées`, { responses: result.rows });
      res.status(200).json(result.rows); // Return flat array of responses
    } catch (error) {
      logger.error('Erreur lors de la récupération des réponses', { error, id });
      res.status(500).json({ message: 'Erreur serveur', details: error.message });
    } finally {
      client.release();
    }
  }
);

// Start EndPoint
router.post('/start', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id_entreprise, id_acteur, id_evaluation } = req.body;
    if (!id_entreprise || !id_acteur) {
      await connection.rollback();
      return res.status(400).json({ message: 'ID entreprise ou acteurAnt manquant' });
    }
    const newEvaluationId = id_evaluation || `eval_${id_entreprise}_${Date.now()}`;
    await connection.query(`
      INSERT INTO evaluations_maturite_globale (
        id_evaluation, id_entreprise, id_acteur, statut, date_debut
      ) VALUES (?, ?, ?, 'NOUVEAU', NOW())
      ON DUPLICATE KEY UPDATE statut = 'NOUVEAU', date_debut = COALESCE(date_debut, NOW())
    `, [newEvaluationId, id_entreprise, id_acteur]);
    await connection.commit();
    logger.info('✅ Évaluation démarrée:', { id_evaluation: newEvaluationId, id_entreprise });
    res.status(201).json({ id_evaluation: newEvaluationId, message: 'Évaluation démarrée avec succès' });
  } catch (error) {
    await connection.rollback();
    logger.error('❌ Erreur démarrage évaluation:', error);
    res.status(500).json({ message: 'Erreur lors du démarrage de l\'évaluation' });
  } finally {
    connection.release();
  }
});

// Current EndPoint
router.get('/current/:enterpriseId', async (req, res) => {
  try {
    const { enterpriseId } = req.params;
    const [evaluations] = await pool.query(`
      SELECT id_evaluation, statut, date_debut
      FROM evaluations_maturite_globale
      WHERE id_entreprise = ? AND statut IN ('NOUVEAU', 'EN_COURS')
      ORDER BY date_debut DESC
      LIMIT 1
    `, [enterpriseId]);
    if (evaluations.length === 0) {
      return res.status(404).json({ message: 'Aucune évaluation en cours trouvée' });
    }
    res.json({ id_evaluation: evaluations[0].id_evaluation });
  } catch (error) {
    logger.error('❌ Erreur récupération évaluation actuelle:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération de l\'évaluation actuelle' });
  }
});

// Maturity-Evaluation submit Endpoint
  router.post(
  '/:id/submit',
  authenticateToken,
  requireFormAccess,
  async (req, res) => {
    const { id } = req.params;
    const { scores, duree_minutes } = req.body;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Verify evaluation exists
      const evalResult = await client.query(
        'SELECT id_evaluation, statut FROM evaluations_maturite_globale WHERE id_evaluation = $1',
        [id]
      );
      if (evalResult.rows.length === 0) {
        return res.status(404).json({ message: 'Évaluation non trouvée' });
      }
      if (evalResult.rows[0].statut === 'TERMINE') {
        return res.status(400).json({ message: 'Évaluation déjà terminée' });
      }

      // Validate scores
      if (!scores || typeof scores !== 'object') {
        return res.status(400).json({ message: 'Scores invalides' });
      }

      // Normalize scores to decimal(5,2)
      const safeScores = {
        score_global: Math.min(parseFloat(scores.score_global) || 0, 999.99).toFixed(2),
        cybersecurite: Math.min(parseFloat(scores.cybersecurite) || 0, 999.99).toFixed(2),
        maturite_digitale: Math.min(parseFloat(scores.maturite_digitale) || 0, 999.99).toFixed(2),
        gouvernance_donnees: Math.min(parseFloat(scores.gouvernance_donnees) || 0, 999.99).toFixed(2),
        devsecops: Math.min(parseFloat(scores.devsecops) || 0, 999.99).toFixed(2),
        innovation_numerique: Math.min(parseFloat(scores.innovation_numerique) || 0, 999.99).toFixed(2),
      };

      // Verify responses exist
      const responsesCount = await client.query(
        'SELECT COUNT(*) FROM reponses_maturite_globale WHERE id_evaluation = $1',
        [id]
      );
      if (parseInt(responsesCount.rows[0].count) === 0) {
        return res.status(400).json({ message: 'Aucune réponse enregistrée pour cette évaluation' });
      }

      // Update evaluation
      await client.query(
        `
        UPDATE evaluations_maturite_globale
        SET 
          statut = 'TERMINE',
          score_global = $1,
          score_cybersecurite = $2,
          score_maturite_digitale = $3,
          score_gouvernance_donnees = $4,
          score_devsecops = $5,
          score_innovation_numerique = $6,
          date_soumission = CURRENT_TIMESTAMP,
          duree_evaluation = $7,
          updated_at = CURRENT_TIMESTAMP
        WHERE id_evaluation = $8
        `,
        [
          safeScores.score_global,
          safeScores.cybersecurite,
          safeScores.maturite_digitale,
          safeScores.gouvernance_donnees,
          safeScores.devsecops,
          safeScores.innovation_numerique,
          duree_minutes || null,
          id,
        ]
      );

      await client.query('COMMIT');
      res.status(200).json({ message: 'Évaluation soumise avec succès' });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Erreur lors de la soumission de l\'évaluation', { error, id, scores, duree_minutes });
      res.status(500).json({ message: 'Erreur serveur', details: error.message });
    } finally {
      client.release();
    }
  }
);

// 🚀 OPTIMISATION : Sauvegarde en lot avec debouncing
router.post('/:id/responses-batch', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { responses, operation = 'upsert' } = req.body;
    
    if (!Array.isArray(responses) || responses.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Aucune réponse à sauvegarder' });
    }
    
    // ✅ Utiliser INSERT ... ON DUPLICATE KEY UPDATE pour des upserts efficaces
    const values = responses.map(r => [
      `${id}_${r.id_question}`, // Clé composite comme ID
      id,
      r.id_question,
      r.valeur_reponse,
      (r.valeur_reponse / 5) * 100, // Score normalisé
      r.commentaire || null
    ]);
    
    const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?)').join(',');
    
    await connection.query(`
      INSERT INTO reponses_maturite_globale (
        id_reponse, id_evaluation, id_question, 
        valeur_reponse, score_normalise, commentaire
      ) VALUES ${placeholders}
      ON DUPLICATE KEY UPDATE
        valeur_reponse = VALUES(valeur_reponse),
        score_normalise = VALUES(score_normalise),
        commentaire = VALUES(commentaire)
    `, values.flat());
    
    await connection.commit();
    
    res.json({
      message: 'Réponses sauvegardées en lot',
      nb_responses_saved: responses.length,
      operation
    });
    
  } catch (error) {
    await connection.rollback();
    logger.error('Erreur lors de la sauvegarde en lot:', error);
    res.status(500).json({
      message: 'Erreur lors de la sauvegarde des réponses'
    });
  } finally {
    connection.release();
  }
});

module.exports = router;