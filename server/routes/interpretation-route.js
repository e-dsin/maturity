// server/routes/interpretation-route.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const logger = require('../utils/logger');

// GET toutes les interprétations
router.get('/', async (req, res) => {
  try {
    logger.debug('GET /api/interpretations - Récupération de toutes les interprétations');
    
    // Requête simple qui récupère toutes les interprétations de la vue
    const [interpretations] = await pool.query(`
      SELECT * FROM vue_interpretation_resultats
      ORDER BY date_analyse DESC
    `);
    
    if (interpretations.length === 0) {
      return res.status(200).json([]); // Retourner un tableau vide plutôt qu'une erreur 404
    }
    
    // Formater les données pour le frontend
    const formattedInterpretations = interpretations.map(interpretation => {
      return {
        id_analyse: interpretation.id_analyse,
        id_application: interpretation.id_application,
        nom_application: interpretation.nom_application,
        score_global: interpretation.score_global,
        niveau_global: interpretation.niveau_global,
        description_globale: interpretation.description_globale,
        recommandations_globales: interpretation.recommandations_globales,
        date_analyse: interpretation.date_analyse
      };
    });
    
    res.status(200).json(formattedInterpretations);
  } catch (error) {
    logger.error('Erreur lors de la récupération des interprétations:', { 
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des interprétations' });
  }
});

// GET interprétation d'une analyse spécifique
router.get('/analyse/:idAnalyse', async (req, res) => {
  try {
    const { idAnalyse } = req.params;
    logger.debug(`GET /api/interpretations/analyse/${idAnalyse} - Récupération d'une interprétation spécifique`);
    
    // Récupérer les données de la vue pour cette analyse
    const [interpretations] = await pool.query(`
      SELECT * FROM vue_interpretation_resultats
      WHERE id_analyse = ?
    `, [idAnalyse]);
    
    if (interpretations.length === 0) {
      return res.status(404).json({ message: 'Interprétation non trouvée' });
    }
    
    // Récupérer la première (et normalement unique) interprétation
    const interpretation = interpretations[0];
    
    // Formater pour le frontend
    const formattedInterpretation = {
      id_analyse: interpretation.id_analyse,
      id_application: interpretation.id_application,
      nom_application: interpretation.nom_application,
      score: interpretation.score_global,
      niveau: interpretation.niveau_global,
      description: interpretation.description_globale,
      recommandations: interpretation.recommandations_globales,
      date_analyse: interpretation.date_analyse
    };
    
    // Récupérer également les thématiques si nécessaire
    try {
      const [thematiques] = await pool.query(`
        SELECT * FROM thematique_scores
        WHERE id_analyse = ?
      `, [idAnalyse]);
      
      if (thematiques && thematiques.length > 0) {
        formattedInterpretation.thematiques = thematiques;
      }
    } catch (thematicError) {
      logger.warn(`Erreur lors de la récupération des thématiques: ${thematicError.message}`);
      // Ne pas échouer complètement si cette partie échoue
    }
    
    res.status(200).json(formattedInterpretation);
  } catch (error) {
    logger.error(`Erreur lors de la récupération de l'interprétation ${req.params.idAnalyse}:`, { 
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'interprétation' });
  }
});

// GET interprétation par thématiques
router.get('/thematiques/:idAnalyse', async (req, res) => {
  try {
    const { idAnalyse } = req.params;
    logger.debug(`GET /api/interpretations/thematiques/${idAnalyse} - Récupération des thématiques d'une analyse`);
    
    const [thematiques] = await pool.query(`
      SELECT * FROM thematique_scores WHERE id_analyse = ?
    `, [idAnalyse]);
    
    if (thematiques.length === 0) {
      return res.status(404).json({ message: 'Aucune thématique trouvée pour cette analyse' });
    }
    
    // Préparer l'interprétation par thématique
    const interpretation = thematiques.map(theme => {
      // Vérifier que le score est un nombre valide
      let score = 0;
      if (theme.score !== undefined && theme.score !== null) {
        score = parseFloat(theme.score);
        if (isNaN(score)) score = 0;
      }
      
      // Déterminer le niveau en fonction du score
      let niveau = 'Non évalué';
      if (score >= 4) {
        niveau = 'Excellent';
      } else if (score >= 3) {
        niveau = 'Bon';
      } else if (score >= 2) {
        niveau = 'Moyen';
      } else if (score > 0) {
        niveau = 'Faible';
      }
      
      // S'assurer que thematique existe
      const thematiqueName = theme.thematique || 'cette thématique';
      
      // Recommandations basiques par niveau
      let recommandations = '';
      switch (niveau) {
        case 'Excellent':
          recommandations = `Continuez à maintenir vos excellentes pratiques en ${thematiqueName}.`;
          break;
        case 'Bon':
          recommandations = `Quelques améliorations mineures pourraient être apportées en ${thematiqueName}.`;
          break;
        case 'Moyen':
          recommandations = `Concentrez vos efforts sur l'amélioration des pratiques de ${thematiqueName}.`;
          break;
        case 'Faible':
          recommandations = `Établissez un plan d'action prioritaire pour améliorer significativement ${thematiqueName}.`;
          break;
        default:
          recommandations = 'Complétez davantage d\'évaluations pour obtenir des recommandations détaillées.';
      }
      
      return {
        id_score: theme.id_score,
        thematique: theme.thematique,
        score: score,
        nombre_reponses: theme.nombre_reponses || 0,
        niveau: niveau,
        recommandations: recommandations
      };
    });
    
    res.status(200).json(interpretation);
  } catch (error) {
    logger.error(`Erreur lors de la récupération des thématiques pour l'analyse ${req.params.idAnalyse}:`, { 
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des thématiques' });
  }
});

// GET analyse d'une application
router.get('/application/:idApplication', async (req, res) => {
  try {
    const { idApplication } = req.params;
    logger.debug(`GET /api/interpretations/application/${idApplication} - Récupération de l'interprétation d'une application`);
    
    // Vérifier si l'application existe
    const [applications] = await pool.query(`
      SELECT * FROM applications WHERE id_application = ?
    `, [idApplication]);
    
    if (applications.length === 0) {
      return res.status(404).json({ message: 'Application non trouvée' });
    }
    
    // Récupérer la dernière analyse pour cette application
    const [analyses] = await pool.query(`
      SELECT * FROM maturity_analyses
      WHERE id_application = ?
      ORDER BY date_analyse DESC
      LIMIT 1
    `, [idApplication]);
    
    if (analyses.length === 0) {
      return res.status(404).json({ message: 'Aucune analyse trouvée pour cette application' });
    }
    
    // Récupérer les thématiques associées
    const analyseId = analyses[0].id_analyse;
    const [thematiques] = await pool.query(`
      SELECT * FROM thematique_scores
      WHERE id_analyse = ?
    `, [analyseId]);
    
    // Récupérer l'historique pour voir l'évolution
    const [historique] = await pool.query(`
      SELECT * FROM historique_scores
      WHERE id_application = ?
      ORDER BY date_mesure DESC
    `, [idApplication]);
    
    res.status(200).json({
      application: applications[0],
      derniere_analyse: analyses[0],
      thematiques: thematiques,
      historique: historique
    });
  } catch (error) {
    logger.error(`Erreur lors de la récupération de l'interprétation pour l'application ${req.params.idApplication}:`, { 
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'interprétation pour l\'application' });
  }
});

// GET historique d'une application
router.get('/historique/:idApplication', async (req, res) => {
  try {
    const { idApplication } = req.params;
    logger.debug(`GET /api/interpretations/historique/${idApplication} - Récupération de l'historique d'une application`);
    
    const [historique] = await pool.query(`
      SELECT * FROM historique_scores
      WHERE id_application = ?
      ORDER BY date_mesure DESC
    `, [idApplication]);
    
    res.status(200).json(historique);
  } catch (error) {
    logger.error(`Erreur lors de la récupération de l'historique pour l'application ${req.params.idApplication}:`, { 
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'historique' });
  }
});

// Route de test pour le debug - A SUPPRIMER APRÈS RÉSOLUTION
router.get('/test/:idAnalyse', async (req, res) => {
  try {
    const { idAnalyse } = req.params;
    logger.debug(`Test de requête simple pour l'analyse ${idAnalyse}`);
    
    // Requête simple sur la table maturity_analyses (non la vue)
    const [analyses] = await pool.query(`
      SELECT ma.*, app.nom_application 
      FROM maturity_analyses ma
      JOIN applications app ON ma.id_application = app.id_application
      WHERE ma.id_analyse = ?
    `, [idAnalyse]);
    
    if (analyses.length === 0) {
      return res.status(404).json({ message: 'Analyse non trouvée' });
    }
    
    // Retourner seulement les données brutes
    res.status(200).json({
      message: 'Test réussi',
      data: analyses[0]
    });
  } catch (error) {
    logger.error(`Erreur lors du test pour l'analyse ${req.params.idAnalyse}:`, { 
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      message: 'Erreur pendant le test', 
      error: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
});

module.exports = router;