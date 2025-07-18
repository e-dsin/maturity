// server/routes/entreprise-global-route.js - VERSION CORRIGÉE AVEC ENDPOINT MANQUANT
const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const logger = require('../utils/logger');

// Helper function to calculate maturity level from score (0-5 scale converted to 0-100)
const getMaturityLevel = (score) => {
  const percentage = (score / 5) * 100;
  if (percentage >= 80) return 'Niveau 5 - Optimisé';
  if (percentage >= 60) return 'Niveau 4 - Géré';
  if (percentage >= 40) return 'Niveau 3 - Mesuré';
  if (percentage >= 20) return 'Niveau 2 - Défini';
  return 'Niveau 1 - Initial';
};

// Helper function to convert score (0-5) to percentage (0-100)
const scoreToPercentage = (score) => {
  return Math.round((score / 5) * 100 * 100) / 100;
};

// Helper function to get global recommendations based on score
const getGlobalRecommendations = (scoreGlobal) => {
  const percentage = scoreToPercentage(scoreGlobal);
  
  if (percentage >= 80) {
    return 'Maintenir l\'excellence par l\'innovation continue et le partage des bonnes pratiques dans l\'écosystème.';
  } else if (percentage >= 60) {
    return 'Perfectionner les processus existants et développer des capacités prédictives pour anticiper les évolutions.';
  } else if (percentage >= 40) {
    return 'Renforcer la culture d\'amélioration continue et automatiser davantage les processus métier.';
  } else if (percentage >= 20) {
    return 'Standardiser les pratiques dans toute l\'organisation et formaliser les processus critiques.';
  } else {
    return 'Initier une démarche d\'amélioration structurée et identifier les processus critiques à développer.';
  }
};

// GET /api/entreprise-global - Get all enterprises with V2 maturity scores
router.get('/', async (req, res) => {
  try {
    logger.debug('GET /api/entreprise-global - Retrieving enterprises with V2 maturity scores');
    
    const [enterprises] = await pool.query(`
      SELECT 
        e.id_entreprise,
        e.nom_entreprise,
        e.secteur,
        e.description,
        e.adresse,
        e.telephone,
        e.email,
        e.site_web,
        e.taille_entreprise,
        e.chiffre_affaires,
        e.effectif_total,
        e.ville_siege_social,
        e.pays_siege_social,
        e.date_premiere_evaluation,
        e.statut_evaluation,
        e.date_creation,
        e.date_modification,
        e.vision_transformation_numerique,
        
        -- Calculated averages from evaluations
        ROUND(AVG(ev.score_global), 2) as score_maturite_global,
        ROUND(AVG(ev.score_cybersecurite), 2) as score_cybersecurite_moyen,
        ROUND(AVG(ev.score_maturite_digitale), 2) as score_maturite_digitale_moyen,
        ROUND(AVG(ev.score_gouvernance_donnees), 2) as score_gouvernance_donnees_moyen,
        ROUND(AVG(ev.score_devsecops), 2) as score_devsecops_moyen,
        ROUND(AVG(ev.score_innovation_numerique), 2) as score_innovation_numerique_moyen,
        
        -- Statistics
        COUNT(ev.id_evaluation) as nombre_evaluations,
        COUNT(DISTINCT ev.id_acteur) as nombre_acteurs_evalues,
        MAX(ev.date_soumission) as derniere_evaluation,
        MIN(ev.date_soumission) as premiere_evaluation_reelle,
        
        -- User and application counts
        COUNT(DISTINCT a.id_acteur) as nombre_utilisateurs,
        COUNT(DISTINCT app.id_application) as nombre_applications
        
      FROM entreprises e
      LEFT JOIN evaluations_maturite_globale ev ON e.id_entreprise = ev.id_entreprise 
        AND ev.statut = 'TERMINE'
      LEFT JOIN acteurs a ON e.id_entreprise = a.id_entreprise
      LEFT JOIN applications app ON e.id_entreprise = app.id_entreprise
      GROUP BY e.id_entreprise
      ORDER BY e.nom_entreprise
    `);
    
    // Transform and enrich data
    const enrichedEnterprises = enterprises.map(enterprise => {
      const scoreGlobal = enterprise.score_maturite_global || 0;
      const scorePercentage = scoreToPercentage(scoreGlobal);
      
      return {
        ...enterprise,
        // Convert scores to percentages for frontend compatibility
        score_maturite_global_percentage: scorePercentage,
        score_cybersecurite_percentage: scoreToPercentage(enterprise.score_cybersecurite_moyen || 0),
        score_maturite_digitale_percentage: scoreToPercentage(enterprise.score_maturite_digitale_moyen || 0),
        score_gouvernance_donnees_percentage: scoreToPercentage(enterprise.score_gouvernance_donnees_moyen || 0),
        score_devsecops_percentage: scoreToPercentage(enterprise.score_devsecops_moyen || 0),
        score_innovation_numerique_percentage: scoreToPercentage(enterprise.score_innovation_numerique_moyen || 0),
        
        // Maturity levels
        niveau_maturite_global: getMaturityLevel(scoreGlobal),
        niveau_cybersecurite: getMaturityLevel(enterprise.score_cybersecurite_moyen || 0),
        niveau_maturite_digitale: getMaturityLevel(enterprise.score_maturite_digitale_moyen || 0),
        niveau_gouvernance_donnees: getMaturityLevel(enterprise.score_gouvernance_donnees_moyen || 0),
        niveau_devsecops: getMaturityLevel(enterprise.score_devsecops_moyen || 0),
        niveau_innovation_numerique: getMaturityLevel(enterprise.score_innovation_numerique_moyen || 0),
        
        // Global recommendations
        recommandations_globales: getGlobalRecommendations(scoreGlobal),
        
        // Additional metadata
        has_evaluation: enterprise.nombre_evaluations > 0,
        evaluation_completion_rate: enterprise.nombre_acteurs_evalues > 0 ? 
          (enterprise.nombre_evaluations / enterprise.nombre_acteurs_evalues) * 100 : 0,
        
        // Legacy compatibility
        score_global: scorePercentage.toString()
      };
    });
    
    logger.info(`✅ Retrieved ${enrichedEnterprises.length} enterprises with V2 maturity data`);
    res.json(enrichedEnterprises);
    
  } catch (error) {
    logger.error('Error retrieving enterprises with V2 maturity scores:', error);
    res.status(500).json({ 
      message: 'Server error while retrieving enterprises with maturity data' 
    });
  }
});

// GET /api/entreprise-global/:id - Get specific enterprise with detailed V2 maturity analysis
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`GET /api/entreprise-global/${id} - Retrieving enterprise with detailed maturity`);
    
    // Get enterprise basic data with aggregated scores
    const [enterprises] = await pool.query(`
      SELECT 
        e.*,
        ROUND(AVG(ev.score_global), 2) as score_maturite_global,
        ROUND(AVG(ev.score_cybersecurite), 2) as score_cybersecurite_moyen,
        ROUND(AVG(ev.score_maturite_digitale), 2) as score_maturite_digitale_moyen,
        ROUND(AVG(ev.score_gouvernance_donnees), 2) as score_gouvernance_donnees_moyen,
        ROUND(AVG(ev.score_devsecops), 2) as score_devsecops_moyen,
        ROUND(AVG(ev.score_innovation_numerique), 2) as score_innovation_numerique_moyen,
        COUNT(ev.id_evaluation) as nombre_evaluations,
        COUNT(DISTINCT ev.id_acteur) as nombre_acteurs_evalues,
        MAX(ev.date_soumission) as derniere_evaluation,
        MIN(ev.date_soumission) as premiere_evaluation_reelle,
        COUNT(DISTINCT a.id_acteur) as nombre_utilisateurs,
        COUNT(DISTINCT app.id_application) as nombre_applications
      FROM entreprises e
      LEFT JOIN evaluations_maturite_globale ev ON e.id_entreprise = ev.id_entreprise 
        AND ev.statut = 'TERMINE'
      LEFT JOIN acteurs a ON e.id_entreprise = a.id_entreprise
      LEFT JOIN applications app ON e.id_entreprise = app.id_entreprise
      WHERE e.id_entreprise = ?
      GROUP BY e.id_entreprise
    `, [id]);
    
    if (enterprises.length === 0) {
      return res.status(404).json({ 
        message: 'Enterprise not found' 
      });
    }
    
    const enterprise = enterprises[0];
    const scoreGlobal = enterprise.score_maturite_global || 0;
    
    // Get individual evaluations for detailed analysis
    const [evaluations] = await pool.query(`
      SELECT 
        ev.*,
        a.nom_prenom as evaluateur_nom,
        a.email as evaluateur_email
      FROM evaluations_maturite_globale ev
      JOIN acteurs a ON ev.id_acteur = a.id_acteur
      WHERE ev.id_entreprise = ? AND ev.statut = 'TERMINE'
      ORDER BY ev.date_soumission DESC
    `, [id]);
    
    // Get function-level analysis
    const fonctionsAnalysis = [
      {
        fonction: 'cybersecurite',
        label: 'Cybersécurité',
        icon: 'Security',
        color: '#d32f2f',
        score_raw: enterprise.score_cybersecurite_moyen || 0,
        score_percentage: scoreToPercentage(enterprise.score_cybersecurite_moyen || 0),
        niveau: getMaturityLevel(enterprise.score_cybersecurite_moyen || 0),
        description: 'Sécurité des systèmes d\'information et protection des données'
      },
      {
        fonction: 'maturite_digitale',
        label: 'Maturité Digitale',
        icon: 'Computer',
        color: '#1976d2',
        score_raw: enterprise.score_maturite_digitale_moyen || 0,
        score_percentage: scoreToPercentage(enterprise.score_maturite_digitale_moyen || 0),
        niveau: getMaturityLevel(enterprise.score_maturite_digitale_moyen || 0),
        description: 'Transformation numérique et stratégie digitale'
      },
      {
        fonction: 'gouvernance_donnees',
        label: 'Gouvernance des Données',
        icon: 'Storage',
        color: '#388e3c',
        score_raw: enterprise.score_gouvernance_donnees_moyen || 0,
        score_percentage: scoreToPercentage(enterprise.score_gouvernance_donnees_moyen || 0),
        niveau: getMaturityLevel(enterprise.score_gouvernance_donnees_moyen || 0),
        description: 'Gestion, qualité et gouvernance des données'
      },
      {
        fonction: 'devsecops',
        label: 'DevSecOps',
        icon: 'Code',
        color: '#f57c00',
        score_raw: enterprise.score_devsecops_moyen || 0,
        score_percentage: scoreToPercentage(enterprise.score_devsecops_moyen || 0),
        niveau: getMaturityLevel(enterprise.score_devsecops_moyen || 0),
        description: 'Développement sécurisé et opérations intégrées'
      },
      {
        fonction: 'innovation_numerique',
        label: 'Innovation Numérique',
        icon: 'Lightbulb',
        color: '#7b1fa2',
        score_raw: enterprise.score_innovation_numerique_moyen || 0,
        score_percentage: scoreToPercentage(enterprise.score_innovation_numerique_moyen || 0),
        niveau: getMaturityLevel(enterprise.score_innovation_numerique_moyen || 0),
        description: 'Veille technologique et adoption d\'innovations'
      }
    ];
    
    // Prepare response
    const response = {
      entreprise: {
        ...enterprise,
        score_maturite_global_percentage: scoreToPercentage(scoreGlobal),
        niveau_maturite_global: getMaturityLevel(scoreGlobal),
        recommandations_globales: getGlobalRecommendations(scoreGlobal),
        has_evaluation: enterprise.nombre_evaluations > 0
      },
      fonctions_analysis: fonctionsAnalysis,
      evaluations_individuelles: evaluations,
      statistiques: {
        nombre_evaluations: enterprise.nombre_evaluations,
        nombre_acteurs_evalues: enterprise.nombre_acteurs_evalues,
        nombre_utilisateurs: enterprise.nombre_utilisateurs,
        nombre_applications: enterprise.nombre_applications,
        taux_participation: enterprise.nombre_utilisateurs > 0 ? 
          (enterprise.nombre_acteurs_evalues / enterprise.nombre_utilisateurs) * 100 : 0,
        premiere_evaluation: enterprise.premiere_evaluation_reelle,
        derniere_evaluation: enterprise.derniere_evaluation
      },
      radar_data: fonctionsAnalysis.map(f => ({
        fonction: f.label,
        score: f.score_percentage,
        niveau: f.niveau,
        fullMark: 100
      }))
    };
    
    res.json(response);
    
  } catch (error) {
    logger.error(`Error retrieving enterprise ${req.params.id} with V2 maturity:`, error);
    res.status(500).json({ 
      message: 'Server error while retrieving enterprise maturity data' 
    });
  }
});

// GET /api/entreprise-global/:id/scores-fonctions - ENDPOINT MANQUANT AJOUTÉ
router.get('/:id/scores-fonctions', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`GET /api/entreprise-global/${id}/scores-fonctions - Retrieving function scores`);
    
    // Get enterprise function scores
    const [functionScores] = await pool.query(`
      SELECT 
        e.id_entreprise,
        e.nom_entreprise,
        e.secteur,
        ROUND(AVG(ev.score_cybersecurite), 2) as score_cybersecurite,
        ROUND(AVG(ev.score_maturite_digitale), 2) as score_maturite_digitale,
        ROUND(AVG(ev.score_gouvernance_donnees), 2) as score_gouvernance_donnees,
        ROUND(AVG(ev.score_devsecops), 2) as score_devsecops,
        ROUND(AVG(ev.score_innovation_numerique), 2) as score_innovation_numerique,
        ROUND(AVG(ev.score_global), 2) as score_global,
        COUNT(ev.id_evaluation) as nombre_evaluations_completees,
        MAX(ev.date_soumission) as derniere_evaluation
      FROM entreprises e
      LEFT JOIN evaluations_maturite_globale ev ON e.id_entreprise = ev.id_entreprise 
        AND ev.statut = 'TERMINE'
      WHERE e.id_entreprise = ?
      GROUP BY e.id_entreprise
    `, [id]);
    
    if (functionScores.length === 0) {
      return res.status(404).json({ 
        message: 'Enterprise not found' 
      });
    }
    
    const enterprise = functionScores[0];
    
    // Format function scores for frontend
    const fonctionsScores = [
      {
        code_fonction: 'cybersecurite',
        nom_fonction: 'Cybersécurité',
        score_raw: enterprise.score_cybersecurite || 0,
        score_percentage: scoreToPercentage(enterprise.score_cybersecurite || 0),
        niveau_maturite: getMaturityLevel(enterprise.score_cybersecurite || 0),
        couleur: '#d32f2f',
        icone: 'Security'
      },
      {
        code_fonction: 'maturite_digitale',
        nom_fonction: 'Maturité Digitale',
        score_raw: enterprise.score_maturite_digitale || 0,
        score_percentage: scoreToPercentage(enterprise.score_maturite_digitale || 0),
        niveau_maturite: getMaturityLevel(enterprise.score_maturite_digitale || 0),
        couleur: '#1976d2',
        icone: 'Computer'
      },
      {
        code_fonction: 'gouvernance_donnees',
        nom_fonction: 'Gouvernance des Données',
        score_raw: enterprise.score_gouvernance_donnees || 0,
        score_percentage: scoreToPercentage(enterprise.score_gouvernance_donnees || 0),
        niveau_maturite: getMaturityLevel(enterprise.score_gouvernance_donnees || 0),
        couleur: '#388e3c',
        icone: 'Storage'
      },
      {
        code_fonction: 'devsecops',
        nom_fonction: 'DevSecOps',
        score_raw: enterprise.score_devsecops || 0,
        score_percentage: scoreToPercentage(enterprise.score_devsecops || 0),
        niveau_maturite: getMaturityLevel(enterprise.score_devsecops || 0),
        couleur: '#f57c00',
        icone: 'Code'
      },
      {
        code_fonction: 'innovation_numerique',
        nom_fonction: 'Innovation Numérique',
        score_raw: enterprise.score_innovation_numerique || 0,
        score_percentage: scoreToPercentage(enterprise.score_innovation_numerique || 0),
        niveau_maturite: getMaturityLevel(enterprise.score_innovation_numerique || 0),
        couleur: '#7b1fa2',
        icone: 'Lightbulb'
      }
    ];
    
    res.json({
      id_entreprise: enterprise.id_entreprise,
      nom_entreprise: enterprise.nom_entreprise,
      secteur: enterprise.secteur,
      score_global: enterprise.score_global || 0,
      score_global_percentage: scoreToPercentage(enterprise.score_global || 0),
      niveau_global: getMaturityLevel(enterprise.score_global || 0),
      fonctions_scores: fonctionsScores,
      metadata: {
        nombre_evaluations_completees: enterprise.nombre_evaluations_completees,
        derniere_evaluation: enterprise.derniere_evaluation,
        has_evaluation_data: enterprise.nombre_evaluations_completees > 0
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error(`Error retrieving function scores for enterprise ${req.params.id}:`, error);
    res.status(500).json({ 
      message: 'Server error while retrieving function scores' 
    });
  }
});

// GET /api/entreprise-global/:id/latest-evaluation - Get latest completed evaluation for enterprise
router.get('/:id/latest-evaluation', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`GET /api/entreprise-global/${id}/latest-evaluation`);
    
    // Get the most recent completed evaluation
    const [evaluations] = await pool.query(`
      SELECT 
        ev.*,
        a.nom_prenom as evaluateur_nom,
        a.email as evaluateur_email,
        e.nom_entreprise,
        e.secteur,
        e.taille_entreprise
      FROM evaluations_maturite_globale ev
      JOIN acteurs a ON ev.id_acteur = a.id_acteur
      JOIN entreprises e ON ev.id_entreprise = e.id_entreprise
      WHERE ev.id_entreprise = ? AND ev.statut = 'TERMINE'
      ORDER BY ev.date_soumission DESC
      LIMIT 1
    `, [id]);
    
    if (evaluations.length === 0) {
      return res.status(404).json({ 
        message: 'No completed evaluation found for this enterprise' 
      });
    }
    
    const evaluation = evaluations[0];
    
    // Enrich evaluation data
    const enrichedEvaluation = {
      ...evaluation,
      score_global_percentage: scoreToPercentage(evaluation.score_global),
      score_cybersecurite_percentage: scoreToPercentage(evaluation.score_cybersecurite),
      score_maturite_digitale_percentage: scoreToPercentage(evaluation.score_maturite_digitale),
      score_gouvernance_donnees_percentage: scoreToPercentage(evaluation.score_gouvernance_donnees),
      score_devsecops_percentage: scoreToPercentage(evaluation.score_devsecops),
      score_innovation_numerique_percentage: scoreToPercentage(evaluation.score_innovation_numerique),
      
      niveau_global: getMaturityLevel(evaluation.score_global),
      niveau_cybersecurite: getMaturityLevel(evaluation.score_cybersecurite),
      niveau_maturite_digitale: getMaturityLevel(evaluation.score_maturite_digitale),
      niveau_gouvernance_donnees: getMaturityLevel(evaluation.score_gouvernance_donnees),
      niveau_devsecops: getMaturityLevel(evaluation.score_devsecops),
      niveau_innovation_numerique: getMaturityLevel(evaluation.score_innovation_numerique)
    };
    
    res.json(enrichedEvaluation);
    
  } catch (error) {
    logger.error(`Error retrieving latest evaluation for enterprise ${req.params.id}:`, error);
    res.status(500).json({ 
      message: 'Server error while retrieving latest evaluation' 
    });
  }
});

// GET /api/entreprise-global/:id/evaluations-history - Get evaluation history for enterprise
router.get('/:id/evaluations-history', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 10, offset = 0 } = req.query;
    
    logger.debug(`GET /api/entreprise-global/${id}/evaluations-history`);
    
    // Get evaluation history with evaluator info
    const [evaluations] = await pool.query(`
      SELECT 
        ev.*,
        a.nom_prenom as evaluateur_nom,
        a.email as evaluateur_email
      FROM evaluations_maturite_globale ev
      JOIN acteurs a ON ev.id_acteur = a.id_acteur
      WHERE ev.id_entreprise = ? AND ev.statut = 'TERMINE'
      ORDER BY ev.date_soumission DESC
      LIMIT ? OFFSET ?
    `, [id, parseInt(limit), parseInt(offset)]);
    
    // Get total count
    const [countResult] = await pool.query(`
      SELECT COUNT(*) as total
      FROM evaluations_maturite_globale ev
      WHERE ev.id_entreprise = ? AND ev.statut = 'TERMINE'
    `, [id]);
    
    // Enrich evaluation data
    const enrichedEvaluations = evaluations.map(evaluation => ({
      ...evaluation,
      score_global_percentage: scoreToPercentage(evaluation.score_global),
      niveau_global: getMaturityLevel(evaluation.score_global),
      scores_by_function: {
        cybersecurite: {
          score: scoreToPercentage(evaluation.score_cybersecurite),
          niveau: getMaturityLevel(evaluation.score_cybersecurite)
        },
        maturite_digitale: {
          score: scoreToPercentage(evaluation.score_maturite_digitale),
          niveau: getMaturityLevel(evaluation.score_maturite_digitale)
        },
        gouvernance_donnees: {
          score: scoreToPercentage(evaluation.score_gouvernance_donnees),
          niveau: getMaturityLevel(evaluation.score_gouvernance_donnees)
        },
        devsecops: {
          score: scoreToPercentage(evaluation.score_devsecops),
          niveau: getMaturityLevel(evaluation.score_devsecops)
        },
        innovation_numerique: {
          score: scoreToPercentage(evaluation.score_innovation_numerique),
          niveau: getMaturityLevel(evaluation.score_innovation_numerique)
        }
      }
    }));
    
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
    logger.error(`Error retrieving evaluation history for enterprise ${req.params.id}:`, error);
    res.status(500).json({ 
      message: 'Server error while retrieving evaluation history' 
    });
  }
});

// GET /api/entreprise-global/sectors-stats - Get statistics by sector
router.get('/sectors-stats', async (req, res) => {
  try {
    logger.debug('GET /api/entreprise-global/sectors-stats');
    
    const [sectorsStats] = await pool.query(`
      SELECT 
        e.secteur,
        COUNT(DISTINCT e.id_entreprise) as nombre_entreprises,
        COUNT(DISTINCT ev.id_evaluation) as nombre_evaluations,
        ROUND(AVG(ev.score_global), 2) as score_moyen,
        ROUND(AVG(ev.score_cybersecurite), 2) as score_cybersecurite_moyen,
        ROUND(AVG(ev.score_maturite_digitale), 2) as score_maturite_digitale_moyen,
        ROUND(AVG(ev.score_gouvernance_donnees), 2) as score_gouvernance_donnees_moyen,
        ROUND(AVG(ev.score_devsecops), 2) as score_devsecops_moyen,
        ROUND(AVG(ev.score_innovation_numerique), 2) as score_innovation_numerique_moyen,
        COUNT(DISTINCT CASE WHEN ev.statut = 'TERMINE' THEN e.id_entreprise END) as entreprises_evaluees
      FROM entreprises e
      LEFT JOIN evaluations_maturite_globale ev ON e.id_entreprise = ev.id_entreprise 
        AND ev.statut = 'TERMINE'
      WHERE e.secteur IS NOT NULL AND e.secteur != ''
      GROUP BY e.secteur
      HAVING nombre_entreprises > 0
      ORDER BY score_moyen DESC, nombre_entreprises DESC
    `);
    
    // Enrich with percentages and levels
    const enrichedStats = sectorsStats.map(sector => ({
      ...sector,
      score_moyen_percentage: scoreToPercentage(sector.score_moyen || 0),
      niveau_moyen: getMaturityLevel(sector.score_moyen || 0),
      taux_evaluation: sector.nombre_entreprises > 0 ? 
        (sector.entreprises_evaluees / sector.nombre_entreprises) * 100 : 0,
      scores_fonctions_percentage: {
        cybersecurite: scoreToPercentage(sector.score_cybersecurite_moyen || 0),
        maturite_digitale: scoreToPercentage(sector.score_maturite_digitale_moyen || 0),
        gouvernance_donnees: scoreToPercentage(sector.score_gouvernance_donnees_moyen || 0),
        devsecops: scoreToPercentage(sector.score_devsecops_moyen || 0),
        innovation_numerique: scoreToPercentage(sector.score_innovation_numerique_moyen || 0)
      }
    }));
    
    res.json(enrichedStats);
    
  } catch (error) {
    logger.error('Error retrieving sectors statistics:', error);
    res.status(500).json({ 
      message: 'Server error while retrieving sectors statistics' 
    });
  }
});

// GET /api/entreprise-global/benchmark/:sector - Get benchmark data for a specific sector
router.get('/benchmark/:sector', async (req, res) => {
  try {
    const { sector } = req.params;
    logger.debug(`GET /api/entreprise-global/benchmark/${sector}`);
    
    const [benchmarkData] = await pool.query(`
      SELECT 
        e.taille_entreprise,
        COUNT(DISTINCT e.id_entreprise) as nombre_entreprises,
        COUNT(DISTINCT ev.id_evaluation) as nombre_evaluations,
        ROUND(AVG(ev.score_global), 2) as score_moyen,
        ROUND(AVG(ev.score_cybersecurite), 2) as score_cybersecurite_moyen,
        ROUND(AVG(ev.score_maturite_digitale), 2) as score_maturite_digitale_moyen,
        ROUND(AVG(ev.score_gouvernance_donnees), 2) as score_gouvernance_donnees_moyen,
        ROUND(AVG(ev.score_devsecops), 2) as score_devsecops_moyen,
        ROUND(AVG(ev.score_innovation_numerique), 2) as score_innovation_numerique_moyen,
        ROUND(STDDEV(ev.score_global), 2) as ecart_type_global
      FROM entreprises e
      LEFT JOIN evaluations_maturite_globale ev ON e.id_entreprise = ev.id_entreprise 
        AND ev.statut = 'TERMINE'
      WHERE e.secteur = ?
      GROUP BY e.taille_entreprise
      ORDER BY 
        CASE e.taille_entreprise 
          WHEN 'TPE' THEN 1 
          WHEN 'PME' THEN 2 
          WHEN 'ETI' THEN 3 
          WHEN 'GE' THEN 4 
          ELSE 5 
        END
    `, [sector]);
    
    // Calculate overall sector benchmark
    const [overallBenchmark] = await pool.query(`
      SELECT 
        COUNT(DISTINCT e.id_entreprise) as nombre_entreprises_total,
        COUNT(DISTINCT ev.id_evaluation) as nombre_evaluations_total,
        ROUND(AVG(ev.score_global), 2) as score_secteur_moyen,
        ROUND(STDDEV(ev.score_global), 2) as ecart_type_secteur,
        ROUND(MIN(ev.score_global), 2) as score_min,
        ROUND(MAX(ev.score_global), 2) as score_max
      FROM entreprises e
      LEFT JOIN evaluations_maturite_globale ev ON e.id_entreprise = ev.id_entreprise 
        AND ev.statut = 'TERMINE'
      WHERE e.secteur = ? AND ev.score_global IS NOT NULL
    `, [sector]);
    
    const response = {
      secteur: sector,
      benchmark_global: {
        ...overallBenchmark[0],
        score_moyen_percentage: scoreToPercentage(overallBenchmark[0]?.score_secteur_moyen || 0),
        niveau_moyen: getMaturityLevel(overallBenchmark[0]?.score_secteur_moyen || 0)
      },
      benchmark_par_taille: benchmarkData.map(data => ({
        ...data,
        score_moyen_percentage: scoreToPercentage(data.score_moyen || 0),
        niveau_moyen: getMaturityLevel(data.score_moyen || 0),
        scores_fonctions_percentage: {
          cybersecurite: scoreToPercentage(data.score_cybersecurite_moyen || 0),
          maturite_digitale: scoreToPercentage(data.score_maturite_digitale_moyen || 0),
          gouvernance_donnees: scoreToPercentage(data.score_gouvernance_donnees_moyen || 0),
          devsecops: scoreToPercentage(data.score_devsecops_moyen || 0),
          innovation_numerique: scoreToPercentage(data.score_innovation_numerique_moyen || 0)
        }
      }))
    };
    
    res.json(response);
    
  } catch (error) {
    logger.error(`Error retrieving benchmark for sector ${req.params.sector}:`, error);
    res.status(500).json({ 
      message: 'Server error while retrieving sector benchmark' 
    });
  }
});

module.exports = router;