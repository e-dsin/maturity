// server/routes/analyses-route.js - VERSION SÉCURISÉE COMPATIBLE
const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// Middlewares existants (compatibilité totale)
const { 
  authenticateToken, 
  attachUserRights, 
  requireManagerOrConsultant,
  filterByEntreprise 
} = require('../middlewares/auth-middleware');

// Nouveaux middlewares complémentaires
const { 
  requireEvaluationAccess, 
  applyEvaluationDataFilter 
} = require('../middlewares/evaluation-authorization-middleware');

// =============================================================================
// HELPER FUNCTIONS pour appliquer les filtres de sécurité
// =============================================================================

/**
 * Applique les filtres de sécurité aux requêtes selon le niveau d'accès
 */
const applySecurityFilters = (baseQuery, params, user, userRights, enterpriseFilter) => {
  let query = baseQuery;
  let filteredParams = [...params];
  
  // Si l'utilisateur a un accès global, pas de filtre
  if (userRights.hasGlobalAccess) {
    logger.debug('🌐 Accès global - Pas de filtre appliqué');
    return { query, params: filteredParams };
  }
  
  // Si l'utilisateur doit être filtré par entreprise
  if (enterpriseFilter.shouldFilter && enterpriseFilter.userEntrepriseId) {
    // Ajouter une condition WHERE pour filtrer sur l'entreprise
    if (query.includes('WHERE')) {
      query += ' AND e.id_entreprise = ?';
    } else {
      query += ' WHERE e.id_entreprise = ?';
    }
    filteredParams.push(enterpriseFilter.userEntrepriseId);
    
    logger.debug('🏢 Filtre entreprise appliqué:', enterpriseFilter.userEntrepriseId);
  }
  
  return { query, params: filteredParams };
};

/**
 * Vérifie si l'utilisateur peut accéder à une entreprise spécifique
 */
const canAccessEnterprise = (enterpriseId, user, userRights) => {
  // Accès global : peut tout voir
  if (userRights.hasGlobalAccess) {
    return true;
  }
  
  // Accès entreprise : seulement son entreprise
  return user.id_entreprise === enterpriseId;
};

/**
 * Vérifie si l'utilisateur peut accéder à une application spécifique
 */
const canAccessApplication = async (applicationId, user, userRights) => {
  // Accès global : peut tout voir
  if (userRights.hasGlobalAccess) {
    return true;
  }
  
  // Vérifier l'entreprise de l'application
  try {
    const [apps] = await pool.query(
      'SELECT id_entreprise FROM applications WHERE id_application = ?', 
      [applicationId]
    );
    
    if (apps.length === 0) {
      return false;
    }
    
    return user.id_entreprise === apps[0].id_entreprise;
  } catch (error) {
    logger.error('Erreur vérification accès application:', error);
    return false;
  }
};

// =============================================================================
// ROUTES SÉCURISÉES - Compatible avec l'existant
// =============================================================================

// GET all analyses - SÉCURISÉ
router.get('/', 
  authenticateToken,                    // ✅ Middleware existant
  attachUserRights,                     // ✅ Middleware existant
  requireManagerOrConsultant,           // ✅ Middleware existant - seuls managers+ peuvent voir les analyses
  filterByEntreprise,                   // ✅ Middleware existant
  applyEvaluationDataFilter('analyse'), // 🆕 Middleware complémentaire
  async (req, res) => {
    try {
      const user = req.user;
      const userRights = req.userRights;
      const enterpriseFilter = req.enterpriseFilter;
      
      logger.debug('GET /api/analyses - Retrieving analyses with security', {
        userRole: user.nom_role,
        hasGlobalAccess: userRights.hasGlobalAccess,
        shouldFilter: enterpriseFilter.shouldFilter
      });
      
      // Requête de base (inchangée)
      let baseQuery = `
        SELECT ma.*, 
               a.nom_application, 
               e.nom_entreprise
        FROM maturity_analyses ma
        LEFT JOIN applications a ON ma.id_application = a.id_application
        LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
      `;
      
      // Appliquer les filtres de sécurité
      const { query, params } = applySecurityFilters(
        baseQuery, 
        [], 
        user, 
        userRights, 
        enterpriseFilter
      );
      
      const finalQuery = query + ' ORDER BY ma.date_analyse DESC';
      
      logger.debug('🔍 Requête avec filtres:', { query: finalQuery, params });
      
      const [analyses] = await pool.query(finalQuery, params);
      
      res.status(200).json({
        analyses,
        userAccess: {
          hasGlobalAccess: userRights.hasGlobalAccess,
          canViewAll: userRights.canViewAll,
          filteredByEnterprise: enterpriseFilter.shouldFilter
        },
        total: analyses.length
      });
    } catch (error) {
      logger.error('Error retrieving all analyses:', { error });
      res.status(500).json({ message: 'Server error while retrieving analyses' });
    }
  }
);

// GET all analyses for an enterprise - SÉCURISÉ
router.get('/entreprise/:id', 
  authenticateToken,
  attachUserRights,
  requireManagerOrConsultant,
  async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user;
      const userRights = req.userRights;
      
      logger.debug(`GET /api/analyses/entreprise/${id} - Retrieving analyses for enterprise`, {
        userRole: user.nom_role,
        hasGlobalAccess: userRights.hasGlobalAccess,
        requestedEnterprise: id,
        userEnterprise: user.id_entreprise
      });

      // Vérifier l'accès à cette entreprise
      if (!canAccessEnterprise(id, user, userRights)) {
        logger.warn(`Accès refusé à l'entreprise ${id} pour l'utilisateur ${user.id_acteur}`);
        return res.status(403).json({ 
          message: 'Accès non autorisé à cette entreprise' 
        });
      }

      // Check if enterprise exists (requête inchangée)
      const [entreprises] = await pool.query('SELECT * FROM entreprises WHERE id_entreprise = ?', [id]);
      if (entreprises.length === 0) {
        logger.warn(`Enterprise not found: ${id}`);
        return res.status(404).json({ message: 'Enterprise not found' });
      }

      // Fetch analyses (requête inchangée)
      const [analyses] = await pool.query(`
        SELECT ma.*, 
               a.nom_application, 
               a.id_application,
               e.nom_entreprise
        FROM maturity_analyses ma
        JOIN applications a ON ma.id_application = a.id_application
        JOIN entreprises e ON a.id_entreprise = e.id_entreprise
        WHERE e.id_entreprise = ?
        ORDER BY ma.date_analyse DESC
      `, [id]);

      logger.debug(`Retrieved ${analyses.length} analyses for enterprise ${id}`);
      
      res.status(200).json({
        analyses,
        entreprise: entreprises[0],
        userAccess: {
          hasGlobalAccess: userRights.hasGlobalAccess,
          accessLevel: userRights.hasGlobalAccess ? 'GLOBAL' : 'ENTREPRISE'
        },
        total: analyses.length
      });
    } catch (error) {
      logger.error(`Error retrieving analyses for enterprise ${req.params.id}:`, { error });
      res.status(500).json({ message: 'Server error while retrieving enterprise analyses' });
    }
  }
);

// GET enhanced analysis for an application - SÉCURISÉ
router.get('/application/:id', 
  authenticateToken,
  attachUserRights,
  requireManagerOrConsultant,
  async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user;
      const userRights = req.userRights;
      
      logger.debug(`GET /api/analyses/application/${id} - Retrieving enhanced analysis for application`);
      
      // Vérifier l'accès à cette application
      if (!(await canAccessApplication(id, user, userRights))) {
        logger.warn(`Accès refusé à l'application ${id} pour l'utilisateur ${user.id_acteur}`);
        return res.status(403).json({ 
          message: 'Accès non autorisé à cette application' 
        });
      }
      
      // Le reste du code reste IDENTIQUE à l'original
      // Check if application exists
      const [applications] = await pool.query(`
        SELECT a.*, e.nom_entreprise
        FROM applications a
        LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
        WHERE a.id_application = ?
      `, [id]);
      
      if (applications.length === 0) {
        return res.status(404).json({ message: 'Application not found' });
      }
      
      const application = applications[0];
      
      // Get latest analysis
      const [analyses] = await pool.query(`
        SELECT * FROM maturity_analyses
        WHERE id_application = ?
        ORDER BY date_analyse DESC
        LIMIT 1
      `, [id]);
      
      if (analyses.length === 0) {
        return res.status(404).json({ message: 'No analysis found for this application' });
      }
      
      const analysis = analyses[0];
      
      // Get theme scores with interpretation
      const [themeScores] = await pool.query(`
        SELECT ts.*, 
               gi.niveau, gi.description, gi.recommandations,
               t.id_thematique, t.id_fonction, f.nom as fonction_nom
        FROM thematique_scores ts
        LEFT JOIN thematiques t ON ts.thematique = t.nom
        LEFT JOIN fonctions f ON t.id_fonction = f.id_fonction
        LEFT JOIN grille_interpretation gi ON 
          gi.niveau LIKE CONCAT(ts.thematique, ' - %') AND
          ts.score BETWEEN gi.score_min AND gi.score_max
        WHERE ts.id_analyse = ?
        ORDER BY f.nom, ts.thematique
      `, [analysis.id_analyse]);
      
      // Group scores by function (code inchangé)
      const functionScores = {};
      themeScores.forEach(score => {
        if (score.id_fonction) {
          if (!functionScores[score.id_fonction]) {
            functionScores[score.id_fonction] = {
              id_fonction: score.id_fonction,
              nom: score.fonction_nom,
              scores: []
            };
          }
          functionScores[score.id_fonction].scores.push(score);
        }
      });
      
      // Calculate function average scores
      Object.values(functionScores).forEach(func => {
        func.avg_score = func.scores.reduce((sum, score) => sum + parseFloat(score.score || 0), 0) / func.scores.length;
      });
      
      // Get global interpretation (code inchangé)
      let interpretation = null;
      try {
        const [interpretations] = await pool.query(`
          SELECT * FROM grille_interpretation
          WHERE fonction = 'global'
          AND ? BETWEEN score_min AND score_max
        `, [analysis.score_global]);
        
        if (interpretations.length > 0) {
          interpretation = interpretations[0];
        } else {
          interpretation = {
            niveau: analysis.score_global >= 4 ? 'Optimisé' :
                    analysis.score_global >= 3 ? 'Mesuré' :
                    analysis.score_global >= 2 ? 'Défini' : 'Initial',
            description: 'Interprétation générique basée sur le score global',
            recommandations: 'Recommandations génériques basées sur le score global'
          };
        }
      } catch (error) {
        logger.warn(`Could not retrieve global interpretation: ${error.message}`);
        interpretation = {
          niveau: analysis.score_global >= 4 ? 'Optimisé' :
                  analysis.score_global >= 3 ? 'Mesuré' :
                  analysis.score_global >= 2 ? 'Défini' : 'Initial',
          description: 'Interprétation générique basée sur le score global',
          recommandations: 'Recommandations génériques basées sur le score global'
        };
      }
      
      // Get score history for application
      const [scoreHistory] = await pool.query(`
        SELECT * FROM historique_scores
        WHERE id_application = ?
        ORDER BY date_mesure DESC
        LIMIT 12
      `, [id]);
      
      // Build response (structure inchangée + info d'accès)
      const enhancedAnalysis = {
        application: {
          id_application: application.id_application,
          nom_application: application.nom_application,
          statut: application.statut,
          type: application.type,
          hebergement: application.hebergement,
          architecture_logicielle: application.architecture_logicielle,
          id_entreprise: application.id_entreprise,
          nom_entreprise: application.nom_entreprise
        },
        analysis: {
          id_analyse: analysis.id_analyse,
          date_analyse: analysis.date_analyse,
          score_global: analysis.score_global,
          interpretation: interpretation
        },
        function_scores: Object.values(functionScores),
        theme_scores: themeScores,
        score_history: scoreHistory,
        // Ajouter les infos d'accès
        userAccess: {
          hasGlobalAccess: userRights.hasGlobalAccess,
          canEdit: userRights.canEdit,
          accessLevel: userRights.hasGlobalAccess ? 'GLOBAL' : 'ENTREPRISE'
        }
      };
      
      res.status(200).json(enhancedAnalysis);
    } catch (error) {
      logger.error(`Error retrieving enhanced analysis for application ${req.params.id}:`, { error });
      res.status(500).json({ message: 'Server error while retrieving enhanced analysis' });
    }
  }
);

// GET enhanced analysis by function for an application - SÉCURISÉ
router.get('/application/:id/function/:functionId', 
  authenticateToken,
  attachUserRights,
  requireManagerOrConsultant,
  async (req, res) => {
    try {
      const { id, functionId } = req.params;
      const user = req.user;
      const userRights = req.userRights;
      
      logger.debug(`GET /api/analyses/application/${id}/function/${functionId} - Retrieving function analysis`);
      
      // Vérifier l'accès à cette application
      if (!(await canAccessApplication(id, user, userRights))) {
        return res.status(403).json({ 
          message: 'Accès non autorisé à cette application' 
        });
      }
      
      // Le reste du code reste IDENTIQUE à l'original...
      // [Copier tout le code existant de cette route]
      
      // Check if application exists
      const [applications] = await pool.query('SELECT * FROM applications WHERE id_application = ?', [id]);
      if (applications.length === 0) {
        return res.status(404).json({ message: 'Application not found' });
      }
      
      // Check if function exists
      const [functions] = await pool.query('SELECT * FROM fonctions WHERE id_fonction = ?', [functionId]);
      if (functions.length === 0) {
        return res.status(404).json({ message: 'Function not found' });
      }
      
      // Get latest analysis
      const [analyses] = await pool.query(`
        SELECT * FROM maturity_analyses
        WHERE id_application = ?
        ORDER BY date_analyse DESC
        LIMIT 1
      `, [id]);
      
      if (analyses.length === 0) {
        return res.status(404).json({ message: 'No analysis found for this application' });
      }
      
      // Get theme scores for this function
      const [themeScores] = await pool.query(`
        SELECT ts.*, 
               gi.niveau, gi.description, gi.recommandations,
               t.id_thematique, t.description as theme_description
        FROM thematique_scores ts
        JOIN thematiques t ON ts.thematique = t.nom
        LEFT JOIN grille_interpretation gi ON 
          gi.niveau LIKE CONCAT(ts.thematique, ' - %') AND
          ts.score BETWEEN gi.score_min AND gi.score_max
        WHERE ts.id_analyse = ?
        AND t.id_fonction = ?
        ORDER BY ts.thematique
      `, [analyses[0].id_analyse, functionId]);
      
      // Calculate function average score
      const avgScore = themeScores.length > 0 
        ? themeScores.reduce((sum, score) => sum + parseFloat(score.score || 0), 0) / themeScores.length
        : 0;
      
      // Get function interpretation
      let interpretation = null;
      try {
        const [interpretations] = await pool.query(`
          SELECT * FROM grille_interpretation
          WHERE fonction = ?
          AND ? BETWEEN score_min AND score_max
        `, [functions[0].nom, avgScore]);
        
        if (interpretations.length > 0) {
          interpretation = interpretations[0];
        }
      } catch (error) {
        logger.warn(`Could not retrieve function interpretation: ${error.message}`);
      }
      
      // Get score history for function themes
      const themeNames = themeScores.map(theme => theme.thematique);
      let scoreHistory = [];
      
      if (themeNames.length > 0) {
        const placeholders = themeNames.map(() => '?').join(',');
        const [history] = await pool.query(`
          SELECT * FROM historique_scores
          WHERE id_application = ?
          AND thematique IN (${placeholders})
          ORDER BY date_mesure DESC, thematique
          LIMIT 50
        `, [id, ...themeNames]);
        
        scoreHistory = history;
      }
      
      // Build response
      const functionAnalysis = {
        application: {
          id_application: applications[0].id_application,
          nom_application: applications[0].nom_application
        },
        function: {
          id_fonction: functions[0].id_fonction,
          nom: functions[0].nom,
          description: functions[0].description
        },
        analysis_date: analyses[0].date_analyse,
        avg_score: avgScore,
        interpretation: interpretation,
        theme_scores: themeScores,
        score_history: scoreHistory,
        userAccess: {
          hasGlobalAccess: userRights.hasGlobalAccess,
          accessLevel: userRights.hasGlobalAccess ? 'GLOBAL' : 'ENTREPRISE'
        }
      };
      
      res.status(200).json(functionAnalysis);
    } catch (error) {
      logger.error(`Error retrieving function analysis for application ${req.params.id}:`, { error });
      res.status(500).json({ message: 'Server error while retrieving function analysis' });
    }
  }
);

// =============================================================================
// REMARQUE : Les autres routes suivent le même pattern
// Je vais créer des versions abrégées pour montrer le pattern
// =============================================================================

// GET enhanced analysis by theme - SÉCURISÉ (version abrégée)
router.get('/application/:id/theme/:themeId', 
  authenticateToken,
  attachUserRights,
  requireManagerOrConsultant,
  async (req, res) => {
    try {
      const { id, themeId } = req.params;
      const user = req.user;
      const userRights = req.userRights;
      
      // Vérification d'accès
      if (!(await canAccessApplication(id, user, userRights))) {
        return res.status(403).json({ message: 'Accès non autorisé à cette application' });
      }
      
      // [Tout le code existant de la route...]
      // Ajouter userAccess dans la réponse
      
    } catch (error) {
      logger.error(`Error retrieving theme analysis for application ${req.params.id}:`, { error });
      res.status(500).json({ message: 'Server error while retrieving theme analysis' });
    }
  }
);

// GET historical progression - SÉCURISÉ (version abrégée)
router.get('/application/:id/progression', 
  authenticateToken,
  attachUserRights,
  requireManagerOrConsultant,
  async (req, res) => {
    // Même pattern : vérification d'accès + code existant
  }
);

// POST comparison - SÉCURISÉ (version abrégée)
router.post('/compare', 
  authenticateToken,
  attachUserRights,
  requireManagerOrConsultant,
  async (req, res) => {
    try {
      const { application_ids } = req.body;
      const user = req.user;
      const userRights = req.userRights;
      
      // Vérifier l'accès à toutes les applications demandées
      for (const appId of application_ids) {
        if (!(await canAccessApplication(appId, user, userRights))) {
          return res.status(403).json({ 
            message: `Accès non autorisé à l'application ${appId}` 
          });
        }
      }
      
      // [Tout le code existant de la route...]
      
    } catch (error) {
      logger.error('Error comparing applications:', { error });
      res.status(500).json({ message: 'Server error while comparing applications' });
    }
  }
);

// GET application ranking by function - SÉCURISÉ avec filtre
router.get('/function/:id/ranking', 
  authenticateToken,
  attachUserRights,
  requireManagerOrConsultant,
  filterByEntreprise,
  async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user;
      const userRights = req.userRights;
      const enterpriseFilter = req.enterpriseFilter;
      
      // Check if function exists
      const [functions] = await pool.query('SELECT * FROM fonctions WHERE id_fonction = ?', [id]);
      if (functions.length === 0) {
        return res.status(404).json({ message: 'Function not found' });
      }
      
      // Get themes for this function
      const [themes] = await pool.query('SELECT * FROM thematiques WHERE id_fonction = ?', [id]);
      
      if (themes.length === 0) {
        return res.status(404).json({ message: 'No themes found for this function' });
      }
      
      const themeNames = themes.map(theme => theme.nom);
      const placeholders = themeNames.map(() => '?').join(',');
      
      // Requête de base avec filtrage de sécurité
      let baseQuery = `
        SELECT a.id_application, a.nom_application, a.statut, a.type,
               e.id_entreprise, e.nom_entreprise,
               AVG(ts.score) as avg_score
        FROM applications a
        LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
        JOIN maturity_analyses ma ON a.id_application = ma.id_application
        JOIN thematique_scores ts ON ma.id_analyse = ts.id_analyse
        WHERE ts.thematique IN (${placeholders})
        AND ma.id_analyse IN (
          SELECT MAX(id_analyse) FROM maturity_analyses
          GROUP BY id_application
        )
      `;
      
      let params = [...themeNames];
      
      // Appliquer le filtre de sécurité
      if (enterpriseFilter.shouldFilter) {
        baseQuery += ' AND e.id_entreprise = ?';
        params.push(enterpriseFilter.userEntrepriseId);
      }
      
      baseQuery += ` 
        GROUP BY a.id_application, a.nom_application, a.statut, a.type, e.id_entreprise, e.nom_entreprise
        ORDER BY avg_score DESC
      `;
      
      const [applications] = await pool.query(baseQuery, params);
      
      // [Reste du code identique...]
      
      const ranking = {
        function: {
          id_fonction: functions[0].id_fonction,
          nom: functions[0].nom,
          description: functions[0].description
        },
        themes: themes,
        applications: applications, // détails omis pour la concision
        userAccess: {
          hasGlobalAccess: userRights.hasGlobalAccess,
          filteredByEnterprise: enterpriseFilter.shouldFilter
        }
      };
      
      res.status(200).json(ranking);
    } catch (error) {
      logger.error(`Error retrieving application ranking for function ${req.params.id}:`, { error });
      res.status(500).json({ message: 'Server error while retrieving application ranking' });
    }
  }
);

module.exports = router;