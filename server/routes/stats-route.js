// server/routes/stats-route.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const logger = require('../utils/logger');

// Cette ligne est commentée car elle cause peut-être une erreur si le middleware n'existe pas
const authMiddleware = require('../middlewares/auth');
// Nous utilisons une fonction middleware vide si nécessaire
//const authMiddleware = (req, res, next) => next();

// GET statistiques générales
router.get('/overview', authMiddleware, async (req, res) => {
  try {
    logger.debug('GET /api/stats/overview - Récupération des statistiques générales');
    
    // Structure simplifiée - base minimale fonctionnelle
    let statsResponse = {
      totalApplications: 0,
      totalQuestionnaires: 0,
      totalFormulaires: 0,
      completionRate: 0
    };
    
    try {
      // Récupérer le nombre total d'applications
      const [applicationsCount] = await pool.query(`
        SELECT COUNT(*) as total FROM applications
      `);
      statsResponse.totalApplications = applicationsCount[0].total;
    } catch (error) {
      logger.warn('Erreur lors du comptage des applications:', { error });
    }
    
    try {
      // Récupérer le nombre total de questionnaires
      const [questionnairesCount] = await pool.query(`
        SELECT COUNT(*) as total FROM questionnaires
      `);
      statsResponse.totalQuestionnaires = questionnairesCount[0].total;
    } catch (error) {
      logger.warn('Erreur lors du comptage des questionnaires:', { error });
    }
    
    try {
      // Récupérer le nombre total de formulaires
      const [formulairesCount] = await pool.query(`
        SELECT COUNT(*) as total FROM formulaires
      `);
      statsResponse.totalFormulaires = formulairesCount[0].total;
      
      // Essayer de compter les formulaires terminés
      const [completedFormsCount] = await pool.query(`
        SELECT COUNT(*) as total FROM formulaires WHERE statut = 'Validé'
      `);
      const completedForms = completedFormsCount[0].total;
      
      // Calculer le taux de complétion (éviter division par zéro)
      if (formulairesCount[0].total > 0) {
        statsResponse.completionRate = Math.round((completedForms / formulairesCount[0].total) * 100);
      }
    } catch (error) {
      logger.warn('Erreur lors du comptage des formulaires:', { error });
    }
    
    res.status(200).json(statsResponse);
  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques générales:', { error });
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des statistiques' });
  }
});

// GET route par défaut pour les statistiques (pour compatibilité)
router.get('/', authMiddleware, async (req, res) => {
  logger.debug('GET /api/stats - Redirection vers /api/stats/overview');
  // Rediriger vers /overview
  return router.handle(req, res, () => {
    req.url = '/overview';
  });
});

// GET statistiques des questionnaires (pour compatibilité)
router.get('/questionnaires', authMiddleware, async (req, res) => {
  try {
    logger.debug('GET /api/stats/questionnaires - Récupération des statistiques des questionnaires');
    
    // Récupérer les questionnaires
    const [questionnaires] = await pool.query(`SELECT * FROM questionnaires`);
    
    // Construire les statistiques manuellement
    const stats = await Promise.all(questionnaires.map(async (q) => {
      try {
        // Essayer de compter les formulaires associés
        const [formCount] = await pool.query(`
          SELECT COUNT(*) as count FROM formulaires WHERE id_questionnaire = ?
        `, [q.id_questionnaire]);
        
        const count = formCount[0]?.count || 0;
        
        return {
          id_questionnaire: q.id_questionnaire,
          fonction: q.fonction || q.titre || '',
          num_evaluations: count,
          score_moyen: 0 // Valeur par défaut
        };
      } catch (err) {
        // En cas d'erreur, retourner des valeurs par défaut
        return {
          id_questionnaire: q.id_questionnaire,
          fonction: q.fonction || q.titre || '',
          num_evaluations: 0,
          score_moyen: 0
        };
      }
    }));
    
    res.status(200).json(stats);
  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques des questionnaires:', { error });
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des statistiques des questionnaires' });
  }
});

module.exports = router;