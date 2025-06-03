// server/controllers/interpretation-controller.js
const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');

/**
 * Récupère l'interprétation globale pour une analyse
 * @route GET /api/interpretation/analyse/:idAnalyse
 */
exports.getInterpretationAnalyse = async (req, res) => {
  try {
    const idAnalyse = req.params.idAnalyse;
    
    const [rows] = await pool.query(
      `SELECT 
        ma.score_global as score,
        gi.niveau,
        gi.description,
        gi.recommandations
      FROM 
        maturity_analyses ma
      JOIN 
        grille_interpretation gi ON 
          gi.fonction = 'DevSecOps' AND 
          ma.score_global BETWEEN gi.score_min AND gi.score_max
      WHERE 
        ma.id_analyse = ?`,
      [idAnalyse]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Analyse non trouvée ou interprétation non disponible' });
    }

    res.status(200).json({
      niveau: rows[0].niveau,
      description: rows[0].description,
      recommandations: rows[0].recommandations,
      score: rows[0].score
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'interprétation:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'interprétation' });
  }
};

/**
 * Récupère l'interprétation par thématique pour une analyse
 * @route GET /api/interpretation/thematiques/:idAnalyse
 */
exports.getInterpretationThematiques = async (req, res) => {
  try {
    const idAnalyse = req.params.idAnalyse;
    
    const [rows] = await pool.query(
      `SELECT 
        ts.thematique,
        ts.score,
        gi.niveau,
        gi.description,
        gi.recommandations
      FROM 
        thematique_scores ts
      LEFT JOIN 
        grille_interpretation gi ON 
          gi.fonction = 'DevSecOps-Thematique' AND 
          gi.niveau LIKE CONCAT(ts.thematique, ' - %') AND
          ts.score BETWEEN gi.score_min AND gi.score_max
      WHERE 
        ts.id_analyse = ?
      ORDER BY 
        ts.thematique`,
      [idAnalyse]
    );

    const thematiques = rows.map(row => ({
      thematique: row.thematique,
      score: row.score,
      niveau: row.niveau || undefined,
      description: row.description || undefined,
      recommandations: row.recommandations || undefined
    }));
    
    res.status(200).json(thematiques);
  } catch (error) {
    console.error('Erreur lors de la récupération des thématiques:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des thématiques' });
  }
};

/**
 * Récupère l'analyse complète pour une application
 * @route GET /api/interpretation/application/:idApplication
 */
exports.getAnalyseApplication = async (req, res) => {
  try {
    const idApplication = req.params.idApplication;
    
    // 1. Récupérer la dernière analyse pour l'application
    const [analyses] = await pool.query(
      `SELECT 
        id_analyse, 
        score_global, 
        date_analyse
      FROM 
        maturity_analyses
      WHERE 
        id_application = ?
      ORDER BY 
        date_analyse DESC
      LIMIT 1`,
      [idApplication]
    );

    if (analyses.length === 0) {
      return res.status(404).json({ message: 'Analyse non trouvée pour cette application' });
    }

    const analyse = analyses[0];
    const idAnalyse = analyse.id_analyse;

    // 2. Récupérer les informations de l'application
    const [applications] = await pool.query(
      `SELECT 
        id_application, 
        nom_application
      FROM 
        applications
      WHERE 
        id_application = ?`,
      [idApplication]
    );

    if (applications.length === 0) {
      return res.status(404).json({ message: 'Application non trouvée' });
    }

    const application = applications[0];

    // 3. Récupérer l'interprétation globale
    const [interpretations] = await pool.query(
      `SELECT 
        gi.niveau,
        gi.description,
        gi.recommandations
      FROM 
        grille_interpretation gi
      WHERE 
        gi.fonction = 'DevSecOps' AND 
        ? BETWEEN gi.score_min AND gi.score_max`,
      [analyse.score_global]
    );

    const interpretationGlobale = interpretations.length > 0 ? {
      niveau: interpretations[0].niveau,
      description: interpretations[0].description,
      recommandations: interpretations[0].recommandations,
      score: analyse.score_global
    } : {
      niveau: 'Non disponible',
      description: 'Interprétation non disponible',
      recommandations: 'Aucune recommandation disponible',
      score: analyse.score_global
    };

    // 4. Récupérer les résultats par thématique
    const [thematiquesRows] = await pool.query(
      `SELECT 
        ts.thematique,
        ts.score,
        gi.niveau,
        gi.description,
        gi.recommandations
      FROM 
        thematique_scores ts
      LEFT JOIN 
        grille_interpretation gi ON 
          gi.fonction = 'DevSecOps-Thematique' AND 
          gi.niveau LIKE CONCAT(ts.thematique, ' - %') AND
          ts.score BETWEEN gi.score_min AND gi.score_max
      WHERE 
        ts.id_analyse = ?
      ORDER BY 
        ts.thematique`,
      [idAnalyse]
    );

    const thematiques = thematiquesRows.map(row => ({
      thematique: row.thematique,
      score: row.score,
      niveau: row.niveau || undefined,
      description: row.description || undefined,
      recommandations: row.recommandations || undefined
    }));

    res.status(200).json({
      idAnalyse: idAnalyse,
      idApplication: application.id_application,
      nomApplication: application.nom_application,
      scoreGlobal: analyse.score_global,
      interpretation: interpretationGlobale,
      thematiques: thematiques,
      dateAnalyse: analyse.date_analyse
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'analyse:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'analyse' });
  }
};

/**
 * Récupère les analyses pour toutes les applications d'une organisation
 * @route GET /api/interpretation/organisation/:nomOrganisation
 */
exports.getAnalysesOrganisation = async (req, res) => {
  try {
    const nomOrganisation = req.params.nomOrganisation;
    
    // 1. Récupérer toutes les applications de l'organisation
    const [applications] = await pool.query(
      `SELECT DISTINCT
        a.id_application
      FROM 
        applications a
      JOIN 
        formulaires f ON a.id_application = f.id_application
      JOIN 
        acteurs ac ON f.id_acteur = ac.id_acteur
      WHERE 
        ac.organisation = ?`,
      [nomOrganisation]
    );

    // 2. Récupérer les analyses pour chaque application
    const analyses = [];
    
    for (const app of applications) {
      // Récupérer la dernière analyse
      const [analyseRows] = await pool.query(
        `SELECT 
          ma.id_analyse, 
          ma.score_global, 
          ma.date_analyse,
          a.id_application,
          a.nom_application
        FROM 
          maturity_analyses ma
        JOIN
          applications a ON ma.id_application = a.id_application
        WHERE 
          ma.id_application = ?
        ORDER BY 
          ma.date_analyse DESC
        LIMIT 1`,
        [app.id_application]
      );

      if (analyseRows.length > 0) {
        const analyse = analyseRows[0];
        
        // Récupérer l'interprétation
        const [interpretationRows] = await pool.query(
          `SELECT 
            gi.niveau,
            gi.description,
            gi.recommandations
          FROM 
            grille_interpretation gi
          WHERE 
            gi.fonction = 'DevSecOps' AND 
            ? BETWEEN gi.score_min AND gi.score_max`,
          [analyse.score_global]
        );

        const interpretationGlobale = interpretationRows.length > 0 ? {
          niveau: interpretationRows[0].niveau,
          description: interpretationRows[0].description,
          recommandations: interpretationRows[0].recommandations,
          score: analyse.score_global
        } : {
          niveau: 'Non disponible',
          description: 'Interprétation non disponible',
          recommandations: 'Aucune recommandation disponible',
          score: analyse.score_global
        };

        // Récupérer les thématiques
        const [thematiquesRows] = await pool.query(
          `SELECT 
            ts.thematique,
            ts.score
          FROM 
            thematique_scores ts
          WHERE 
            ts.id_analyse = ?
          ORDER BY 
            ts.thematique`,
          [analyse.id_analyse]
        );

        const thematiques = thematiquesRows.map(row => ({
          thematique: row.thematique,
          score: row.score
        }));

        analyses.push({
          idAnalyse: analyse.id_analyse,
          idApplication: analyse.id_application,
          nomApplication: analyse.nom_application,
          scoreGlobal: analyse.score_global,
          interpretation: interpretationGlobale,
          thematiques: thematiques,
          dateAnalyse: analyse.date_analyse
        });
      }
    }

    res.status(200).json(analyses);
  } catch (error) {
    console.error('Erreur lors de la récupération des analyses par organisation:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des analyses par organisation' });
  }
};

/**
 * Calcule le niveau de maturité moyen par thématique pour une organisation
 * @route GET /api/interpretation/organisation/:nomOrganisation/scores-moyens
 */
exports.getScoresMoyensOrganisation = async (req, res) => {
  try {
    const nomOrganisation = req.params.nomOrganisation;
    
    const [rows] = await pool.query(
      `SELECT 
        ts.thematique,
        AVG(ts.score) as score_moyen
      FROM 
        thematique_scores ts
      JOIN 
        maturity_analyses ma ON ts.id_analyse = ma.id_analyse
      JOIN 
        applications a ON ma.id_application = a.id_application
      JOIN 
        formulaires f ON a.id_application = f.id_application
      JOIN 
        acteurs ac ON f.id_acteur = ac.id_acteur
      WHERE 
        ac.organisation = ?
      GROUP BY 
        ts.thematique
      ORDER BY 
        ts.thematique`,
      [nomOrganisation]
    );

    const scoresMoyens = rows.map(row => ({
      thematique: row.thematique,
      score: row.score_moyen
    }));

    res.status(200).json(scoresMoyens);
  } catch (error) {
    console.error('Erreur lors du calcul des scores moyens:', error);
    res.status(500).json({ message: 'Erreur serveur lors du calcul des scores moyens' });
  }
};

/**
 * Prépare les données pour une future intégration avec un LLM
 * @route GET /api/interpretation/llm/application/:idApplication
 */
exports.prepareDonneesLLM = async (req, res) => {
  try {
    const idApplication = req.params.idApplication;
    
    // Réutiliser la fonction d'analyse complète
    const [analyses] = await pool.query(
      `SELECT 
        id_analyse, 
        score_global, 
        date_analyse
      FROM 
        maturity_analyses
      WHERE 
        id_application = ?
      ORDER BY 
        date_analyse DESC
      LIMIT 1`,
      [idApplication]
    );

    if (analyses.length === 0) {
      return res.status(404).json({ message: 'Analyse non trouvée pour cette application' });
    }

    const analyse = analyses[0];
    const idAnalyse = analyse.id_analyse;

    // Récupérer les informations de l'application
    const [applications] = await pool.query(
      `SELECT 
        id_application, 
        nom_application
      FROM 
        applications
      WHERE 
        id_application = ?`,
      [idApplication]
    );

    if (applications.length === 0) {
      return res.status(404).json({ message: 'Application non trouvée' });
    }

    const application = applications[0];

    // Récupérer l'interprétation globale
    const [interpretations] = await pool.query(
      `SELECT 
        gi.niveau,
        gi.description,
        gi.recommandations
      FROM 
        grille_interpretation gi
      WHERE 
        gi.fonction = 'DevSecOps' AND 
        ? BETWEEN gi.score_min AND gi.score_max`,
      [analyse.score_global]
    );

    const interpretationGlobale = interpretations.length > 0 ? {
      niveau: interpretations[0].niveau,
      description: interpretations[0].description,
      recommandations: interpretations[0].recommandations
    } : {
      niveau: 'Non disponible',
      description: 'Interprétation non disponible',
      recommandations: 'Aucune recommandation disponible'
    };

    // Récupérer les résultats par thématique
    const [thematiquesRows] = await pool.query(
      `SELECT 
        ts.thematique,
        ts.score,
        gi.niveau,
        gi.description,
        gi.recommandations
      FROM 
        thematique_scores ts
      LEFT JOIN 
        grille_interpretation gi ON 
          gi.fonction = 'DevSecOps-Thematique' AND 
          gi.niveau LIKE CONCAT(ts.thematique, ' - %') AND
          ts.score BETWEEN gi.score_min AND gi.score_max
      WHERE 
        ts.id_analyse = ?
      ORDER BY 
        ts.thematique`,
      [idAnalyse]
    );

    const thematiques = thematiquesRows.map(row => ({
      nom: row.thematique,
      score: row.score,
      interpretation: row.description || 'Non disponible'
    }));

    // Structure pour LLM
    const donneesLLM = {
      contexte: {
        application: application.nom_application,
        scoreGlobal: analyse.score_global,
        niveauMaturite: interpretationGlobale.niveau,
        date: new Date(analyse.date_analyse).toISOString().split('T')[0]
      },
      interpretation: {
        globale: {
          niveau: interpretationGlobale.niveau,
          description: interpretationGlobale.description
        },
        thematiques: thematiques
      },
      recommandations: {
        globales: interpretationGlobale.recommandations,
        specifiques: thematiquesRows
          .filter(row => row.recommandations)
          .map(row => ({
            thematique: row.thematique,
            recommandation: row.recommandations
          }))
      }
    };

    res.status(200).json(donneesLLM);
  } catch (error) {
    console.error('Erreur lors de la préparation des données pour le LLM:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la préparation des données pour le LLM' });
  }
};