// server/routes/historique-route.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const logger = require('../utils/logger');

// GET tout l'historique des scores
router.get('/', async (req, res) => {
  try {
    logger.debug('GET /api/historique - Récupération de tout l\'historique des scores');
    
    // Essayer de récupérer l'historique avec les informations d'entreprise
    try {
      const [historique] = await pool.query(`
        SELECT h.*, 
               a.nom_application,
               e.id_entreprise, e.nom_entreprise
        FROM historique_scores h
        JOIN applications a ON h.id_application = a.id_application
        LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
        ORDER BY h.date_mesure DESC
      `);
      
      res.status(200).json(historique);
    } catch (error) {
      // En cas d'erreur, fallback à la requête sans entreprises
      logger.warn('Erreur avec la requête JOIN complète, tentative de requête simple:', { error });
      
      const [historique] = await pool.query(`
        SELECT h.*, a.nom_application
        FROM historique_scores h
        JOIN applications a ON h.id_application = a.id_application
        ORDER BY h.date_mesure DESC
      `);
      
      res.status(200).json(historique);
    }
  } catch (error) {
    logger.error('Erreur lors de la récupération de l\'historique des scores:', { error });
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'historique des scores' });
  }
});

// GET historique par application
router.get('/application/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`GET /api/historique/application/${id} - Récupération de l'historique par application`);
    
    // Récupérer l'application pour obtenir l'id_entreprise
    const [applications] = await pool.query(`
      SELECT a.*, e.id_entreprise, e.nom_entreprise
      FROM applications a
      LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
      WHERE a.id_application = ?
    `, [id]);
    
    if (applications.length === 0) {
      return res.status(404).json({ message: 'Application non trouvée' });
    }
    
    const id_entreprise = applications[0].id_entreprise;
    
    // Récupérer l'historique des scores pour cette application
    const [historique] = await pool.query(`
      SELECT * FROM historique_scores
      WHERE id_application = ?
      ORDER BY date_mesure DESC, thematique
    `, [id]);
    
    // Si l'application appartient à une entreprise, récupérer également l'historique des scores de l'entreprise
    let historiqueEntreprise = [];
    if (id_entreprise) {
      try {
        const [entrepriseHistory] = await pool.query(`
          SELECT * FROM historique_scores_entreprises
          WHERE id_entreprise = ?
          ORDER BY date_mesure DESC
          LIMIT 12
        `, [id_entreprise]);
        
        historiqueEntreprise = entrepriseHistory;
      } catch (histoError) {
        logger.warn(`Table historique_scores_entreprises non disponible: ${histoError.message}`);
      }
    }
    
    // Construire la réponse
    const response = {
      application: {
        id_application: id,
        nom_application: applications[0].nom_application,
        id_entreprise: id_entreprise,
        nom_entreprise: applications[0].nom_entreprise
      },
      historique_application: historique,
      historique_entreprise: historiqueEntreprise
    };
    
    res.status(200).json(response);
  } catch (error) {
    logger.error(`Erreur lors de la récupération de l'historique pour l'application ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'historique pour l\'application' });
  }
});

// GET historique par application et thématique
router.get('/application/:id/thematique/:thematique', async (req, res) => {
  try {
    const { id, thematique } = req.params;
    logger.debug(`GET /api/historique/application/${id}/thematique/${thematique} - Récupération de l'historique par thématique`);
    
    const [historique] = await pool.query(`
      SELECT * FROM historique_scores
      WHERE id_application = ?
      AND thematique = ?
      ORDER BY date_mesure DESC
    `, [id, thematique]);
    
    res.status(200).json(historique);
  } catch (error) {
    logger.error(`Erreur lors de la récupération de l'historique par thématique pour l'application ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'historique par thématique' });
  }
});

// GET historique pour une entreprise
router.get('/entreprise/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`GET /api/historique/entreprise/${id} - Récupération de l'historique pour une entreprise`);
    
    // Vérifier si l'entreprise existe
    const [entreprises] = await pool.query('SELECT * FROM entreprises WHERE id_entreprise = ?', [id]);
    
    if (entreprises.length === 0) {
      return res.status(404).json({ message: 'Entreprise non trouvée' });
    }
    
    // Récupérer l'historique des scores globaux de l'entreprise
    let historiqueGlobal = [];
    try {
      const [result] = await pool.query(`
        SELECT * FROM historique_scores_entreprises
        WHERE id_entreprise = ?
        ORDER BY date_mesure DESC
      `, [id]);
      historiqueGlobal = result;
    } catch (globalError) {
      logger.warn(`Table historique_scores_entreprises non disponible: ${globalError.message}`);
      // Construire un historique alternatif à partir des analyses
      try {
        const [analyses] = await pool.query(`
          SELECT 
            DATE(ma.date_analyse) as date_mesure,
            AVG(ma.score_global) as score_global
          FROM maturity_analyses ma
          JOIN applications a ON ma.id_application = a.id_application
          WHERE a.id_entreprise = ?
          GROUP BY DATE(ma.date_analyse)
          ORDER BY DATE(ma.date_analyse) DESC
        `, [id]);
        
        historiqueGlobal = analyses.map(a => ({
          id_historique: null,
          id_entreprise: id,
          score_global: a.score_global,
          date_mesure: a.date_mesure
        }));
      } catch (altError) {
        logger.error(`Erreur lors de la construction de l'historique alternatif: ${altError.message}`);
      }
    }
    
    // Récupérer l'historique détaillé pour toutes les applications de cette entreprise
    const [historiqueDetaille] = await pool.query(`
      SELECT h.*,
             a.nom_application
      FROM historique_scores h
      JOIN applications a ON h.id_application = a.id_application
      WHERE a.id_entreprise = ?
      ORDER BY h.date_mesure DESC, a.nom_application, h.thematique
    `, [id]);
    
    // Regrouper l'historique par thématique (pour analyses)
    const historiqueParThematique = {};
    historiqueDetaille.forEach(item => {
      if (!historiqueParThematique[item.thematique]) {
        historiqueParThematique[item.thematique] = [];
      }
      historiqueParThematique[item.thematique].push(item);
    });
    
    // Regrouper l'historique par application (pour analyses)
    const historiqueParApplication = {};
    historiqueDetaille.forEach(item => {
      if (!historiqueParApplication[item.id_application]) {
        historiqueParApplication[item.id_application] = [];
      }
      historiqueParApplication[item.id_application].push(item);
    });
    
    // Construire la réponse
    const response = {
      entreprise: {
        id_entreprise: id,
        nom_entreprise: entreprises[0].nom_entreprise
      },
      historique_global: historiqueGlobal,
      historique_detaille: historiqueDetaille,
      historique_par_thematique: historiqueParThematique,
      historique_par_application: historiqueParApplication
    };
    
    res.status(200).json(response);
  } catch (error) {
    logger.error(`Erreur lors de la récupération de l'historique pour l'entreprise ${req.params.id}:`, { 
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      message: 'Erreur serveur lors de la récupération de l\'historique pour l\'entreprise',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET historique par thématique pour toutes les applications
router.get('/thematique/:thematique', async (req, res) => {
  try {
    const { thematique } = req.params;
    logger.debug(`GET /api/historique/thematique/${thematique} - Récupération de l'historique global par thématique`);
    
    const [historique] = await pool.query(`
      SELECT h.*,
             a.nom_application,
             e.id_entreprise, e.nom_entreprise
      FROM historique_scores h
      JOIN applications a ON h.id_application = a.id_application
      LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
      WHERE h.thematique = ?
      ORDER BY h.date_mesure DESC, a.nom_application
    `, [thematique]);
    
    // Regrouper par entreprise
    const historiqueParEntreprise = {};
    historique.forEach(item => {
      if (item.id_entreprise && !historiqueParEntreprise[item.id_entreprise]) {
        historiqueParEntreprise[item.id_entreprise] = {
          id_entreprise: item.id_entreprise,
          nom_entreprise: item.nom_entreprise,
          historique: []
        };
      }
      
      if (item.id_entreprise) {
        historiqueParEntreprise[item.id_entreprise].historique.push(item);
      }
    });
    
    // Construction de la réponse
    const response = {
      thematique,
      historique,
      historique_par_entreprise: Object.values(historiqueParEntreprise)
    };
    
    res.status(200).json(response);
  } catch (error) {
    logger.error(`Erreur lors de la récupération de l'historique pour la thématique ${req.params.thematique}:`, { error });
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'historique par thématique' });
  }
});

module.exports = router;