// server/routes/analyses-route.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// GET all analyses
router.get('/', async (req, res) => {
  try {
    logger.debug('GET /api/analyses - Retrieving all analyses');
    
    // Fetch all analyses with related application and enterprise data
    const [analyses] = await pool.query(`
      SELECT ma.*, 
             a.nom_application, 
             e.nom_entreprise
      FROM maturity_analyses ma
      LEFT JOIN applications a ON ma.id_application = a.id_application
      LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
      ORDER BY ma.date_analyse DESC
    `);
    
    res.status(200).json(analyses);
  } catch (error) {
    logger.error('Error retrieving all analyses:', { error });
    res.status(500).json({ message: 'Server error while retrieving analyses' });
  }
});

// GET all analyses for an enterprise
router.get('/entreprise/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`GET /api/analyses/entreprise/${id} - Retrieving analyses for enterprise`);

    // Check if enterprise exists
    const [entreprises] = await pool.query('SELECT * FROM entreprises WHERE id_entreprise = ?', [id]);
    if (entreprises.length === 0) {
      logger.warn(`Enterprise not found: ${id}`);
      return res.status(404).json({ message: 'Enterprise not found' });
    }

    // Fetch analyses for all applications of this enterprise
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
    res.status(200).json(analyses);
  } catch (error) {
    logger.error(`Error retrieving analyses for enterprise ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Server error while retrieving enterprise analyses' });
  }
});

// GET enhanced analysis for an application
router.get('/application/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`GET /api/analyses/application/${id} - Retrieving enhanced analysis for application`);
    
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
    
    // Group scores by function
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
    
    // Get global interpretation
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
        // Fallback to general interpretation based on score
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
      // Create a basic interpretation
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
    
    // Build response
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
      score_history: scoreHistory
    };
    
    res.status(200).json(enhancedAnalysis);
  } catch (error) {
    logger.error(`Error retrieving enhanced analysis for application ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Server error while retrieving enhanced analysis' });
  }
});

// GET enhanced analysis by function for an application
router.get('/application/:id/function/:functionId', async (req, res) => {
  try {
    const { id, functionId } = req.params;
    logger.debug(`GET /api/analyses/application/${id}/function/${functionId} - Retrieving function analysis`);
    
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
      score_history: scoreHistory
    };
    
    res.status(200).json(functionAnalysis);
  } catch (error) {
    logger.error(`Error retrieving function analysis for application ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Server error while retrieving function analysis' });
  }
});

// GET enhanced analysis by theme for an application
router.get('/application/:id/theme/:themeId', async (req, res) => {
  try {
    const { id, themeId } = req.params;
    logger.debug(`GET /api/analyses/application/${id}/theme/${themeId} - Retrieving theme analysis`);
    
    // Check if application exists
    const [applications] = await pool.query('SELECT * FROM applications WHERE id_application = ?', [id]);
    if (applications.length === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }
    
    // Check if theme exists
    const [themes] = await pool.query(`
      SELECT t.*, f.nom as fonction_nom
      FROM thematiques t
      JOIN fonctions f ON t.id_fonction = f.id_fonction
      WHERE t.id_thematique = ?
    `, [themeId]);
    
    if (themes.length === 0) {
      return res.status(404).json({ message: 'Theme not found' });
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
    
    // Get theme score
    const [scores] = await pool.query(`
      SELECT ts.*,
             gi.niveau, gi.description, gi.recommandations
      FROM thematique_scores ts
      LEFT JOIN grille_interpretation gi ON 
        gi.niveau LIKE CONCAT(ts.thematique, ' - %') AND
        ts.score BETWEEN gi.score_min AND gi.score_max
      WHERE ts.id_analyse = ?
      AND ts.thematique = ?
    `, [analyses[0].id_analyse, themes[0].nom]);
    
    if (scores.length === 0) {
      return res.status(404).json({ message: 'No score found for this theme' });
    }
    
    // Get score history
    const [history] = await pool.query(`
      SELECT * FROM historique_scores
      WHERE id_application = ?
      AND thematique = ?
      ORDER BY date_mesure DESC
      LIMIT 12
    `, [id, themes[0].nom]);
    
    // Get related questions
    const [questions] = await pool.query(`
      SELECT q.* 
      FROM questions q
      WHERE q.id_thematique = ?
      ORDER BY q.ordre
    `, [themeId]);
    
    // Get answers from the latest forms
    const [forms] = await pool.query(`
      SELECT f.id_formulaire 
      FROM formulaires f
      WHERE f.id_application = ?
      ORDER BY f.date_modification DESC
      LIMIT 5
    `, [id]);
    
    let answers = [];
    if (forms.length > 0) {
      const formIds = forms.map(form => form.id_formulaire);
      const placeholders = formIds.map(() => '?').join(',');
      
      const [answerResults] = await pool.query(`
        SELECT r.*, q.texte as question_texte, f.date_modification
        FROM reponses r
        JOIN questions q ON r.id_question = q.id_question
        JOIN formulaires f ON r.id_formulaire = f.id_formulaire
        WHERE f.id_formulaire IN (${placeholders})
        AND q.id_thematique = ?
        ORDER BY f.date_modification DESC, q.ordre
      `, [...formIds, themeId]);
      
      answers = answerResults;
    }
    
    // Build response
    const themeAnalysis = {
      application: {
        id_application: applications[0].id_application,
        nom_application: applications[0].nom_application
      },
      theme: {
        id_thematique: themes[0].id_thematique,
        nom: themes[0].nom,
        description: themes[0].description,
        fonction: themes[0].fonction_nom
      },
      analysis_date: analyses[0].date_analyse,
      score: scores[0],
      history: history,
      questions: questions,
      recent_answers: answers
    };
    
    res.status(200).json(themeAnalysis);
  } catch (error) {
    logger.error(`Error retrieving theme analysis for application ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Server error while retrieving theme analysis' });
  }
});

// GET historical progression for an application
router.get('/application/:id/progression', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`GET /api/analyses/application/${id}/progression - Retrieving progression`);
    
    // Check if application exists
    const [applications] = await pool.query('SELECT * FROM applications WHERE id_application = ?', [id]);
    if (applications.length === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }
    
    // Get all analyses
    const [analyses] = await pool.query(`
      SELECT * FROM maturity_analyses
      WHERE id_application = ?
      ORDER BY date_analyse
    `, [id]);
    
    // Get global score progression
    const globalProgression = analyses.map(analysis => ({
      date: analysis.date_analyse,
      score: analysis.score_global,
      id_analyse: analysis.id_analyse
    }));
    
    // Get themes from the latest analysis
    const latestAnalysis = analyses[analyses.length - 1];
    let themes = [];
    
    if (latestAnalysis) {
      const [themeScores] = await pool.query(`
        SELECT DISTINCT thematique 
        FROM thematique_scores
        WHERE id_analyse = ?
      `, [latestAnalysis.id_analyse]);
      
      themes = themeScores.map(t => t.thematique);
    }
    
    // Get function and theme progression
    let themeProgression = {};
    let functionProgression = {};
    
    if (themes.length > 0 && analyses.length > 0) {
      // For each analysis, get the theme scores
      for (const analysis of analyses) {
        const [themeScores] = await pool.query(`
          SELECT ts.thematique, ts.score,
                 t.id_fonction, f.nom as fonction_nom
          FROM thematique_scores ts
          LEFT JOIN thematiques t ON ts.thematique = t.nom
          LEFT JOIN fonctions f ON t.id_fonction = f.id_fonction
          WHERE ts.id_analyse = ?
        `, [analysis.id_analyse]);
        
        // Add scores to theme progression
        themeScores.forEach(score => {
          if (!themeProgression[score.thematique]) {
            themeProgression[score.thematique] = [];
          }
          
          themeProgression[score.thematique].push({
            date: analysis.date_analyse,
            score: score.score
          });
          
          // Add scores to function progression
          if (score.id_fonction) {
            if (!functionProgression[score.fonction_nom]) {
              functionProgression[score.fonction_nom] = {
                id_fonction: score.id_fonction,
                nom: score.fonction_nom,
                scores: []
              };
            }
            
            // Calculate average score for this function at this date
            let functionScores = themeScores.filter(s => s.fonction_nom === score.fonction_nom);
            let avgScore = functionScores.length > 0
              ? functionScores.reduce((sum, s) => sum + parseFloat(s.score || 0), 0) / functionScores.length
              : 0;
            
            // Check if we already have a score for this date
            let existingScoreIndex = functionProgression[score.fonction_nom].scores.findIndex(
              s => new Date(s.date).getTime() === new Date(analysis.date_analyse).getTime()
            );
            
            if (existingScoreIndex >= 0) {
              // Update existing score
              functionProgression[score.fonction_nom].scores[existingScoreIndex].score = avgScore;
            } else {
              // Add new score
              functionProgression[score.fonction_nom].scores.push({
                date: analysis.date_analyse,
                score: avgScore
              });
            }
          }
        });
      }
    }
    
    // Get recommendations history
    const [recommendations] = await pool.query(`
      SELECT ma.date_analyse, 
             gi.niveau, gi.recommandations, gi.fonction
      FROM maturity_analyses ma
      JOIN grille_interpretation gi ON 
        ma.score_global BETWEEN gi.score_min AND gi.score_max
      WHERE ma.id_application = ?
      AND gi.fonction = 'global'
      ORDER BY ma.date_analyse
    `, [id]);
    
    // Build response
    const progression = {
      application: {
        id_application: applications[0].id_application,
        nom_application: applications[0].nom_application
      },
      global_progression: globalProgression,
      function_progression: Object.values(functionProgression),
      theme_progression: Object.entries(themeProgression).map(([theme, scores]) => ({
        theme,
        scores
      })),
      recommendations_history: recommendations
    };
    
    res.status(200).json(progression);
  } catch (error) {
    logger.error(`Error retrieving progression for application ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Server error while retrieving progression' });
  }
});

// GET comparison between multiple applications
router.post('/compare', async (req, res) => {
  try {
    const { application_ids } = req.body;
    logger.debug('POST /api/analyses/compare - Comparing applications');
    
    if (!application_ids || !Array.isArray(application_ids) || application_ids.length < 2) {
      return res.status(400).json({ message: 'Invalid data: application_ids must be an array with at least 2 elements' });
    }
    
    // Check if applications exist
    const placeholders = application_ids.map(() => '?').join(',');
    const [applications] = await pool.query(`
      SELECT a.*, e.nom_entreprise
      FROM applications a
      LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
      WHERE a.id_application IN (${placeholders})
    `, application_ids);
    
    if (applications.length !== application_ids.length) {
      return res.status(404).json({ message: 'One or more applications not found' });
    }
    
    // Get latest analyses for each application
    const analyses = await Promise.all(application_ids.map(async (appId) => {
      const [analysis] = await pool.query(`
        SELECT * FROM maturity_analyses
        WHERE id_application = ?
        ORDER BY date_analyse DESC
        LIMIT 1
      `, [appId]);
      
      return analysis[0] || null;
    }));
    
    // Filter out applications without analyses
    const validApplications = [];
    const validAnalyses = [];
    
    for (let i = 0; i < applications.length; i++) {
      if (analyses[i]) {
        validApplications.push(applications[i]);
        validAnalyses.push(analyses[i]);
      }
    }
    
    if (validApplications.length < 2) {
      return res.status(404).json({ message: 'Not enough applications with analyses found' });
    }
    
    // Get all themes from all analyses
    const allThemes = new Set();
    await Promise.all(validAnalyses.map(async (analysis) => {
      const [themes] = await pool.query(`
        SELECT DISTINCT thematique 
        FROM thematique_scores
        WHERE id_analyse = ?
      `, [analysis.id_analyse]);
      
      themes.forEach(theme => allThemes.add(theme.thematique));
    }));
    
    // Get scores for each theme and application
    const themeComparison = {};
    
    for (const theme of allThemes) {
      themeComparison[theme] = await Promise.all(validAnalyses.map(async (analysis) => {
        const [scores] = await pool.query(`
          SELECT ts.score, a.nom_application
          FROM thematique_scores ts
          JOIN maturity_analyses ma ON ts.id_analyse = ma.id_analyse
          JOIN applications a ON ma.id_application = a.id_application
          WHERE ts.id_analyse = ?
          AND ts.thematique = ?
        `, [analysis.id_analyse, theme]);
        
        return scores[0] || { score: null, nom_application: analysis.nom_application };
      }));
    }
    
    // Get function scores
    const functionComparison = {};
    
    for (const theme of allThemes) {
      const [themeInfo] = await pool.query(`
        SELECT t.id_fonction, f.nom as fonction_nom
        FROM thematiques t
        JOIN fonctions f ON t.id_fonction = f.id_fonction
        WHERE t.nom = ?
        LIMIT 1
      `, [theme]);
      
      if (themeInfo.length > 0) {
        const fonction = themeInfo[0].fonction_nom;
        if (!functionComparison[fonction]) {
          functionComparison[fonction] = validApplications.map(app => ({
            id_application: app.id_application,
            nom_application: app.nom_application,
            scores: []
          }));
        }
        
        // Add theme scores to the function
        if (themeComparison[theme]) {
          themeComparison[theme].forEach((score, index) => {
            functionComparison[fonction][index].scores.push({
              theme,
              score: score.score
            });
          });
        }
      }
    }
    
    // Calculate function average scores
    Object.values(functionComparison).forEach(appScores => {
      appScores.forEach(app => {
        app.avg_score = app.scores.length > 0
          ? app.scores.reduce((sum, s) => sum + (parseFloat(s.score) || 0), 0) / app.scores.length
          : 0;
      });
    });
    
    // Build response
    const comparison = {
      applications: validApplications.map(app => ({
        id_application: app.id_application,
        nom_application: app.nom_application,
        statut: app.statut,
        type: app.type,
        nom_entreprise: app.nom_entreprise
      })),
      global_comparison: validAnalyses.map((analysis, index) => ({
        id_application: validApplications[index].id_application,
        nom_application: validApplications[index].nom_application,
        score_global: analysis.score_global,
        date_analyse: analysis.date_analyse
      })),
      function_comparison: Object.entries(functionComparison).map(([fonction, scores]) => ({
        fonction,
        scores
      })),
      theme_comparison: Object.entries(themeComparison).map(([theme, scores]) => ({
        theme,
        scores: scores.map((s, i) => ({
          id_application: validApplications[i].id_application,
          nom_application: validApplications[i].nom_application,
          score: s.score
        }))
      }))
    };
    
    res.status(200).json(comparison);
  } catch (error) {
    logger.error('Error comparing applications:', { error });
    res.status(500).json({ message: 'Server error while comparing applications' });
  }
});

// GET all applications by function performance
router.get('/function/:id/ranking', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`GET /api/analyses/function/${id}/ranking - Retrieving application ranking by function`);
    
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
    
    // Get applications with their scores for these themes
    const [applications] = await pool.query(`
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
      GROUP BY a.id_application, a.nom_application, a.statut, a.type, e.id_entreprise, e.nom_entreprise
      ORDER BY avg_score DESC
    `, themeNames);
    
    // Get detailed theme scores for each application
    const detailedScores = await Promise.all(applications.map(async (app) => {
      const [scores] = await pool.query(`
        SELECT ts.thematique, ts.score
        FROM thematique_scores ts
        JOIN maturity_analyses ma ON ts.id_analyse = ma.id_analyse
        WHERE ma.id_application = ?
        AND ts.thematique IN (${placeholders})
        AND ma.id_analyse = (
          SELECT MAX(id_analyse) FROM maturity_analyses
          WHERE id_application = ?
        )
      `, [app.id_application, ...themeNames, app.id_application]);
      
      return {
        ...app,
        theme_scores: scores
      };
    }));
    
    // Build response
    const ranking = {
      function: {
        id_fonction: functions[0].id_fonction,
        nom: functions[0].nom,
        description: functions[0].description
      },
      themes: themes,
      applications: detailedScores
    };
    
    res.status(200).json(ranking);
  } catch (error) {
    logger.error(`Error retrieving application ranking for function ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Server error while retrieving application ranking' });
  }
});

module.exports = router;