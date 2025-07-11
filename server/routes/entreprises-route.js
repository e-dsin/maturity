// server/routes/entreprises-route.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');


const calculateEntrepriseScore = async (pool, entrepriseId) => {
  try {
    // Récupérer le score moyen des dernières analyses des applications de cette entreprise
    const [scoreResults] = await pool.query(`
      SELECT AVG(ma.score_global) as score_global
      FROM applications a
      LEFT JOIN maturity_analyses ma ON a.id_application = ma.id_application
      WHERE a.id_entreprise = ?
      AND ma.id_analyse IN (
        SELECT MAX(id_analyse) FROM maturity_analyses 
        WHERE id_application = a.id_application
        GROUP BY id_application
      )
      AND ma.score_global IS NOT NULL
    `, [entrepriseId]);
    
    const score = scoreResults[0]?.score_global || 0;
    return parseFloat(score) || 0;
  } catch (error) {
    console.warn(`Erreur calcul score entreprise ${entrepriseId}:`, error);
    return 0;
  }
};

// Fonction helper pour trouver une fonction par nom dans la BD
async function findFonctionByNameFromDB(connection, fonctionName) {
  try {
    // Recherche avec correspondance exacte
    let [fonctions] = await connection.query(
      'SELECT * FROM fonctions WHERE nom = ? AND actif = TRUE LIMIT 1',
      [fonctionName]
    );
    
    if (fonctions.length > 0) {
      return fonctions[0];
    }
    
    // Recherche avec correspondance partielle
    [fonctions] = await connection.query(
      'SELECT * FROM fonctions WHERE LOWER(nom) LIKE ? AND actif = TRUE LIMIT 1',
      [`%${fonctionName.toLowerCase()}%`]
    );
    
    if (fonctions.length > 0) {
      return fonctions[0];
    }
    
    // Mapping des noms alternatifs
    const mappings = {
      'devsecops': 'DevSecOps',
      'cybersecurite': 'Cybersécurité',
      'cybersécurité': 'Cybersécurité',
      'modele_operationnel': 'Modèle Opérationnel',
      'gouvernance_si': 'Gouvernance SI',
      'acculturation_data': 'Acculturation Data'
    };
    
    const mappedName = mappings[fonctionName.toLowerCase()];
    if (mappedName) {
      [fonctions] = await connection.query(
        'SELECT * FROM fonctions WHERE nom = ? AND actif = TRUE LIMIT 1',
        [mappedName]
      );
      
      if (fonctions.length > 0) {
        return fonctions[0];
      }
    }
    
    return null;
  } catch (error) {
    logger.error('Error finding fonction by name:', error);
    return null;
  }
}

// Fonction helper pour trouver le niveau global correspondant
async function findGlobalLevelFromDB(connection, idFonction, score) {
  try {
    const [niveaux] = await connection.query(
      `SELECT * FROM niveaux_globaux 
       WHERE id_fonction = ? 
       AND score_min <= ? 
       AND score_max >= ?
       ORDER BY score_min DESC
       LIMIT 1`,
      [idFonction, score, score]
    );
    
    return niveaux.length > 0 ? niveaux[0] : null;
  } catch (error) {
    logger.error('Error finding global level:', error);
    return null;
  }
}

// Fonction helper pour trouver le niveau thématique correspondant
async function findThematicLevelFromDB(connection, idFonction, thematiqueNom, score) {
  try {
    // D'abord, trouver l'id de la thématique
    const [thematiques] = await connection.query(
      `SELECT id_thematique FROM thematiques 
       WHERE id_fonction = ? 
       AND nom = ? 
       AND actif = TRUE
       LIMIT 1`,
      [idFonction, thematiqueNom]
    );
    
    if (thematiques.length === 0) {
      return null;
    }
    
    const idThematique = thematiques[0].id_thematique;
    
    // Ensuite, trouver le niveau correspondant
    const [niveaux] = await connection.query(
      `SELECT * FROM niveaux_thematiques 
       WHERE id_thematique = ? 
       AND score_min <= ? 
       AND score_max >= ?
       ORDER BY score_min DESC
       LIMIT 1`,
      [idThematique, score, score]
    );
    
    return niveaux.length > 0 ? niveaux[0] : null;
  } catch (error) {
    logger.error('Error finding thematic level:', error);
    return null;
  }
}

// GET all enterprises with their scores
router.get('/', async (req, res) => {
  try {
    logger.debug('GET /api/entreprises - Retrieving all enterprises with calculated scores');
    
    const [entreprises] = await pool.query(`
      SELECT e.*
      FROM entreprises e
      ORDER BY e.nom_entreprise
    `);
    
    // Calculer les scores pour chaque entreprise
    const entreprisesWithScores = await Promise.all(entreprises.map(async (entreprise) => {
      const score_global = await calculateEntrepriseScore(pool, entreprise.id_entreprise);
      
      return {
        ...entreprise,
        score_global: score_global
      };
    }));
    
    logger.info(`✅ ${entreprisesWithScores.length} entreprises avec scores calculés récupérées`);
    res.status(200).json(entreprisesWithScores);
  } catch (error) {
    logger.error('Error retrieving enterprises with scores:', { error });
    res.status(500).json({ message: 'Server error while retrieving enterprises' });
  }
});

router.get('/:id/maturity-analysis', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    logger.debug(`GET /api/entreprises/${id}/maturity-analysis - Retrieving maturity analysis`);

    // Check if enterprise exists
    const [entreprises] = await connection.query('SELECT * FROM entreprises WHERE id_entreprise = ?', [id]);
    if (entreprises.length === 0) {
      return res.status(404).json({ message: 'Enterprise not found' });
    }

    // Get maturity analysis data
    const [maturityData] = await connection.query(`
  SELECT 
    e.nom_entreprise AS entreprise,
    f.nom AS fonction,
    t.nom AS thematique,
    AVG(ts.score) AS score_moyen,
    COUNT(DISTINCT a.id_application) as nb_applications
  FROM entreprises e
  INNER JOIN applications a ON e.id_entreprise = a.id_entreprise
  INNER JOIN maturity_analyses ma ON a.id_application = ma.id_application
  INNER JOIN thematique_scores ts ON ma.id_analyse = ts.id_analyse
  INNER JOIN thematiques t ON ts.thematique = t.nom
  INNER JOIN fonctions f ON t.id_fonction = f.id_fonction
  WHERE e.id_entreprise = ?
  AND ts.score IS NOT NULL
  AND ts.score > 0
  GROUP BY e.nom_entreprise, f.nom, t.nom
  HAVING score_moyen > 0
  ORDER BY f.nom, t.nom
`, [id]);

    if (maturityData.length === 0) {
      return res.status(404).json({ message: 'No maturity data found for this enterprise' });
    }

    // Normalize scores to 0-5 range
    maturityData.forEach(row => {
      row.score_moyen = Math.min(Math.max(parseFloat(row.score_moyen), 0), 5);
    });

    // Organize data by functions
    const functionsMap = {};
    maturityData.forEach(row => {
      if (!functionsMap[row.fonction]) {
        functionsMap[row.fonction] = {
          id: uuidv4(),
          nom: row.fonction,
          thematiques: [],
          score_global: 0,
          niveau: '',
          description: '',
          recommandations: ''
        };
      }
      functionsMap[row.fonction].thematiques.push({
        id: uuidv4(),
        nom: row.thematique,
        score: parseFloat(row.score_moyen.toFixed(2)),
        score_moyen: parseFloat(row.score_moyen.toFixed(2)),
        niveau: '',
        description: '',
        recommandations: ''
      });
    });

    // Calculate function scores and map to maturity levels
    for (const fonctionNom of Object.keys(functionsMap)) {
      const fonctionData = functionsMap[fonctionNom];
      const scores = fonctionData.thematiques.map(t => t.score_moyen);
      const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      fonctionData.score_global = parseFloat(avgScore.toFixed(2));

      // Trouver la fonction dans la BD
      const modelFonction = await findFonctionByNameFromDB(connection, fonctionNom);
      
      if (modelFonction) {
        console.log(`Fonction trouvée: ${fonctionNom} -> ${modelFonction.nom}`);
        
        // Trouver le niveau global correspondant
        const globalLevel = await findGlobalLevelFromDB(connection, modelFonction.id_fonction, fonctionData.score_global);
        
        if (globalLevel) {
          fonctionData.niveau = globalLevel.niveau;
          fonctionData.description = globalLevel.description;
          fonctionData.recommandations = globalLevel.recommandations;
        }

        // Mapper les niveaux thématiques
        for (const thematique of fonctionData.thematiques) {
          const thematicLevel = await findThematicLevelFromDB(connection, modelFonction.id_fonction, thematique.nom, thematique.score_moyen);
          
          if (thematicLevel) {
            thematique.niveau = thematicLevel.niveau;
            thematique.description = thematicLevel.description;
            thematique.recommandations = thematicLevel.recommandations;
          } else {
            // Niveau générique si non trouvé dans la BD
            const score = thematique.score_moyen;
            
            if (score >= 3.5) {
              thematique.niveau = `${thematique.nom} - Avancé`;
              thematique.description = "Niveau avancé. Pratiques bien établies.";
              thematique.recommandations = "Capitaliser sur les acquis et promouvoir l'innovation.";
            } else if (score >= 1.5) {
              thematique.niveau = `${thematique.nom} - Intermédiaire`;
              thematique.description = "Niveau intermédiaire. Pratiques en cours de structuration.";
              thematique.recommandations = "Standardiser et renforcer les processus existants.";
            } else {
              thematique.niveau = `${thematique.nom} - Faible`;
              thematique.description = "Maturité faible. Pratiques peu formalisées.";
              thematique.recommandations = "Structurer les fondations et mettre en place des pratiques de base.";
            }
          }
        }
      } else {
        // Utiliser les niveaux génériques si la fonction n'est pas trouvée
        console.warn(`Fonction "${fonctionNom}" non trouvée dans la base de données`);
        
        // Appliquer un niveau générique basé sur le score
        const score = fonctionData.score_global;
        
        if (score >= 4.5) {
          fonctionData.niveau = "Niveau 5 - Optimisé";
          fonctionData.description = "Excellence opérationnelle avec optimisation continue.";
          fonctionData.recommandations = "Maintenir l'excellence par l'innovation continue. Explorer les nouvelles technologies et partager les bonnes pratiques.";
        } else if (score >= 3.5) {
          fonctionData.niveau = "Niveau 4 - Géré";
          fonctionData.description = "Processus matures avec mesures quantitatives et amélioration continue.";
          fonctionData.recommandations = "Optimiser les processus existants. Développer des mécanismes prédictifs et renforcer l'automatisation.";
        } else if (score >= 2.5) {
          fonctionData.niveau = "Niveau 3 - Mesuré";
          fonctionData.description = "Processus définis et mesurés. Approche cohérente.";
          fonctionData.recommandations = "Améliorer les métriques et l'automatisation. Renforcer la culture d'amélioration continue.";
        } else if (score >= 1.5) {
          fonctionData.niveau = "Niveau 2 - Défini";
          fonctionData.description = "Processus documentés mais application inégale.";
          fonctionData.recommandations = "Standardiser les pratiques. Améliorer la coordination entre équipes et développer des indicateurs cohérents.";
        } else {
          fonctionData.niveau = "Niveau 1 - Initial";
          fonctionData.description = "Approche ad hoc avec peu de processus formalisés.";
          fonctionData.recommandations = "Établir un cadre de base. Formaliser les processus principaux et améliorer la visibilité.";
        }
        
        // Appliquer aussi des niveaux génériques aux thématiques
        fonctionData.thematiques.forEach(thematique => {
          if (!thematique.niveau) {
            const score = thematique.score_moyen;
            
            if (score >= 3.5) {
              thematique.niveau = `${thematique.nom} - Avancé`;
              thematique.description = "Niveau avancé. Pratiques bien établies.";
              thematique.recommandations = "Capitaliser sur les acquis et promouvoir l'innovation.";
            } else if (score >= 1.5) {
              thematique.niveau = `${thematique.nom} - Intermédiaire`;
              thematique.description = "Niveau intermédiaire. Pratiques en cours de structuration.";
              thematique.recommandations = "Standardiser et renforcer les processus existants.";
            } else {
              thematique.niveau = `${thematique.nom} - Faible`;
              thematique.description = "Maturité faible. Pratiques peu formalisées.";
              thematique.recommandations = "Structurer les fondations et mettre en place des pratiques de base.";
            }
          }
        });
      }
    }

    const result = Object.values(functionsMap).sort((a, b) => a.nom.localeCompare(b.nom));
    
    // Calculer le score global et le niveau global de l'entreprise
    const globalScore = result.length > 0 
      ? result.reduce((sum, fn) => sum + parseFloat(fn.score_global || "0"), 0) / result.length
      : 0;
    
    // Déterminer le niveau et les recommandations en fonction du score
    let niveauGlobal = "Niveau 1 - Initial";
    let recommandationsGlobales = "Structurer les fondations. Mettre en place des pratiques de base.";
    
    if (globalScore >= 4.5) {
      niveauGlobal = "Niveau 5 - Optimisé";
      recommandationsGlobales = "Maintenir l'excellence par l'innovation continue.";
    } else if (globalScore >= 3.5) {
      niveauGlobal = "Niveau 4 - Géré";
      recommandationsGlobales = "Perfectionner les processus, développer des mécanismes prédictifs.";
    } else if (globalScore >= 2.5) {
      niveauGlobal = "Niveau 3 - Mesuré";
      recommandationsGlobales = "Renforcer la culture d'amélioration continue, automatiser davantage.";
    } else if (globalScore >= 1.5) {
      niveauGlobal = "Niveau 2 - Défini";
      recommandationsGlobales = "Standardiser les pratiques et formaliser les processus.";
    }
    
    res.json({
      entreprise: entreprises[0].nom_entreprise,
      score_global: globalScore.toFixed(1),
      niveau_global: niveauGlobal,
      recommandations_globales: recommandationsGlobales,
      fonctions: result
    });
  } catch (error) {
    logger.error('Error fetching maturity analysis', { error: error.message });
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    connection.release();
  }
});

//GET Interpretations
router.get('/interpretations', async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;
  const [interpretations] = await pool.query(
    'SELECT * FROM interpretations LIMIT ? OFFSET ?',
    [parseInt(limit), parseInt(offset)]
  );
  res.json(interpretations);
});

// GET enterprise by ID with score and applications
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`GET /api/entreprises/${id} - Retrieving specific enterprise`);
    
    // Get enterprise data
    const [entreprises] = await pool.query(`
      SELECT e.* FROM entreprises e WHERE e.id_entreprise = ?
    `, [id]);
    
    if (entreprises.length === 0) {
      return res.status(404).json({ message: 'Enterprise not found' });
    }
    
    // Get global score
    let globalScore = null;
    try {
      const [scoreResults] = await pool.query(`
        SELECT score_global, date_mesure 
        FROM historique_scores_entreprises
        WHERE id_entreprise = ?
        ORDER BY date_mesure DESC
        LIMIT 1
      `, [id]);
      
      if (scoreResults.length > 0) {
        globalScore = {
          score: scoreResults[0].score_global,
          date: scoreResults[0].date_mesure
        };
      }
    } catch (error) {
      logger.warn(`Could not retrieve enterprise score: ${error.message}`);
    }
    
    // Get applications for this enterprise
    const [applications] = await pool.query(`
      SELECT a.id_application, a.nom_application, a.statut, a.type, 
             (SELECT score_global FROM maturity_analyses 
              WHERE id_application = a.id_application
              ORDER BY date_analyse DESC LIMIT 1) as score_global
      FROM applications a
      WHERE a.id_entreprise = ?
      ORDER BY a.nom_application
    `, [id]);
    
    // Get score history
    let scoreHistory = [];
    try {
      const [history] = await pool.query(`
        SELECT score_global, date_mesure
        FROM historique_scores_entreprises
        WHERE id_entreprise = ?
        ORDER BY date_mesure DESC
        LIMIT 12
      `, [id]);
      
      scoreHistory = history;
    } catch (error) {
      logger.warn(`Could not retrieve score history: ${error.message}`);
    }
    
    // Get scores by fonction
    let scoresByfonction = [];
    try {
      const [fonctionScores] = await pool.query(`
        SELECT f.id_fonction, f.nom as nom_fonction, AVG(ts.score) as score_moyen
        FROM applications a
        JOIN maturity_analyses ma ON a.id_application = ma.id_application
        JOIN thematique_scores ts ON ma.id_analyse = ts.id_analyse
        JOIN thematiques t ON ts.thematique = t.nom
        JOIN fonctions f ON t.id_fonction = f.id_fonction
        WHERE a.id_entreprise = ?
        AND ma.id_analyse IN (
          SELECT MAX(id_analyse) FROM maturity_analyses 
          WHERE id_application = a.id_application
          GROUP BY id_application
        )
        GROUP BY f.id_fonction, f.nom
      `, [id]);
      
      scoresByfonction = fonctionScores;
    } catch (error) {
      logger.warn(`Could not retrieve scores by fonction: ${error.message}`);
    }
    
    // Get scores by theme
    let scoresByTheme = [];
    try {
      const [themeScores] = await pool.query(`
        SELECT t.id_thematique, t.nom as nom_thematique, f.nom as nom_fonction, AVG(ts.score) as score_moyen
        FROM applications a
        JOIN maturity_analyses ma ON a.id_application = ma.id_application
        JOIN thematique_scores ts ON ma.id_analyse = ts.id_analyse
        JOIN thematiques t ON ts.thematique = t.nom
        JOIN fonctions f ON t.id_fonction = f.id_fonction
        WHERE a.id_entreprise = ?
        AND ma.id_analyse IN (
          SELECT MAX(id_analyse) FROM maturity_analyses 
          WHERE id_application = a.id_application
          GROUP BY id_application
        )
        GROUP BY t.id_thematique, t.nom, f.nom
      `, [id]);
      
      scoresByTheme = themeScores;
    } catch (error) {
      logger.warn(`Could not retrieve scores by theme: ${error.message}`);
    }
    
    // Build response
    const response = {
      ...entreprises[0],
      score_global: globalScore ? globalScore.score : null,
      date_score: globalScore ? globalScore.date : null,
      applications,
      score_history: scoreHistory,
      scores_by_fonction: scoresByfonction,
      scores_by_theme: scoresByTheme
    };
    
    res.status(200).json(response);
  } catch (error) {
    logger.error(`Error retrieving enterprise ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Server error while retrieving enterprise details' });
  }
});

// GET applications for an enterprise
router.get('/:id/applications', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`GET /api/entreprises/${id}/applications - Retrieving applications for enterprise`);
    
    const [applications] = await pool.query(`
      SELECT a.*, 
             (SELECT score_global FROM maturity_analyses 
              WHERE id_application = a.id_application
              ORDER BY date_analyse DESC LIMIT 1) as score_global
      FROM applications a
      WHERE a.id_entreprise = ?
      ORDER BY a.nom_application
    `, [id]);
    
    res.status(200).json(applications);
  } catch (error) {
    logger.error(`Error retrieving applications for enterprise ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Server error while retrieving applications' });
  }
});

// GET fonctions analysis for an enterprise
router.get('/:id/fonctions', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    logger.debug(`GET /api/entreprises/${id}/fonctions - Récupération des fonctions évaluées avec scores`);

    // Vérifier que l'entreprise existe
    const [entreprises] = await connection.query(
      'SELECT id_entreprise, nom_entreprise FROM entreprises WHERE id_entreprise = ?', 
      [id]
    );
    
    if (entreprises.length === 0) {
      logger.info(`Entreprise ${id} non trouvée`);
      return res.status(404).json({ 
        message: 'Cette entreprise n\'existe pas',
        score_global: 0,
        fonctions: []
      });
    }

    // Récupérer les fonctions évaluées pour cette entreprise
    const [fonctions] = await connection.query(`
      SELECT DISTINCT f.id_fonction, f.nom, f.description, f.ordre
      FROM fonctions f
      JOIN thematiques t ON t.id_fonction = f.id_fonction
      JOIN questions q ON q.id_thematique = t.id_thematique
      JOIN reponses r ON r.id_question = q.id_question
      JOIN formulaires frm ON r.id_formulaire = frm.id_formulaire
      JOIN acteurs act ON frm.id_acteur = act.id_acteur
      WHERE act.id_entreprise = ?
        AND r.score IS NOT NULL
        AND f.actif = TRUE
      ORDER BY f.ordre, f.nom
    `, [id]);

    logger.debug(`Fonctions évaluées trouvées: ${fonctions.length}`);

    const fonctionsAvecScores = [];

    // Pour chaque fonction évaluée, récupérer les thématiques et calculer les scores
    for (const fonction of fonctions) {
      try {
        // Récupérer les thématiques évaluées de cette fonction
        const [thematiques] = await connection.query(`
          SELECT DISTINCT t.id_thematique, t.nom, t.description
          FROM thematiques t
          JOIN questions q ON q.id_thematique = t.id_thematique
          JOIN reponses r ON r.id_question = q.id_question
          JOIN formulaires frm ON r.id_formulaire = frm.id_formulaire
          JOIN acteurs act ON frm.id_acteur = act.id_acteur
          WHERE act.id_entreprise = ?
            AND t.id_fonction = ?
            AND r.score IS NOT NULL
            AND t.actif = TRUE
          ORDER BY t.ordre, t.nom
        `, [id, fonction.id_fonction]);

        logger.debug(`Thématiques pour fonction ${fonction.id_fonction}: ${thematiques.length}`);

        const thematiquesAvecScores = [];
        let totalScoreFonction = 0;
        let nbThematiquesAvecScores = 0;

        for (const thematique of thematiques) {
          try {
            // Calculer le score moyen pour cette thématique
            const [scoreData] = await connection.query(`
              SELECT 
                AVG(r.score) as score_moyen,
                COUNT(DISTINCT r.id_formulaire) as nb_evaluations,
                MAX(frm.date_modification) as derniere_evaluation
              FROM reponses r
              JOIN questions q ON r.id_question = q.id_question
              JOIN formulaires frm ON r.id_formulaire = frm.id_formulaire
              JOIN acteurs act ON frm.id_acteur = act.id_acteur
              WHERE act.id_entreprise = ?
                AND q.id_thematique = ?
                AND r.score IS NOT NULL
            `, [id, thematique.id_thematique]);

            const score = scoreData[0]?.score_moyen ? parseFloat(scoreData[0].score_moyen) : 0;

            // Récupérer le niveau et les recommandations pour la thématique
            let niveauThematique = null;
            if (score > 0) {
              const [niveaux] = await connection.query(`
                SELECT niveau, description, recommandations
                FROM niveaux_thematiques 
                WHERE id_thematique = ? 
                  AND ? BETWEEN score_min AND score_max
                ORDER BY score_min DESC
                LIMIT 1
              `, [thematique.id_thematique, score]);
              
              if (niveaux.length > 0) {
                niveauThematique = niveaux[0];
              }
            }

            if (score > 0) {
              thematiquesAvecScores.push({
                id: thematique.id_thematique,
                nom: thematique.nom,
                description: thematique.description || '',
                score: parseFloat(score.toFixed(2)),
                score_moyen: parseFloat(score.toFixed(2)),
                nb_evaluations: scoreData[0]?.nb_evaluations || 0,
                derniere_evaluation: scoreData[0]?.derniere_evaluation || null,
                niveau: niveauThematique?.niveau || '',
                description_niveau: niveauThematique?.description || '',
                recommandations: niveauThematique?.recommandations || ''
              });

              totalScoreFonction += score;
              nbThematiquesAvecScores++;
            }
          } catch (themeError) {
            logger.error(`Erreur lors du traitement de la thématique ${thematique.id_thematique}`, { error: themeError.message });
            continue; // Skip this thematique but continue with others
          }
        }

        // Calculer le score global de la fonction
        const scoreFonction = nbThematiquesAvecScores > 0 
          ? totalScoreFonction / nbThematiquesAvecScores 
          : 0;

        if (scoreFonction > 0) {
          // Récupérer le niveau global et les recommandations pour la fonction
          let niveauGlobal = null;
          try {
            const [niveauxGlobaux] = await connection.query(`
              SELECT niveau, description, recommandations
              FROM niveaux_globaux 
              WHERE id_fonction = ? 
                AND ? BETWEEN score_min AND score_max
              ORDER BY score_min DESC
              LIMIT 1
            `, [fonction.id_fonction, scoreFonction]);
            
            if (niveauxGlobaux.length > 0) {
              niveauGlobal = niveauxGlobaux[0];
            }
          } catch (niveauError) {
            logger.error(`Erreur lors de la récupération des niveaux globaux pour fonction ${fonction.id_fonction}`, { error: niveauError.message });
          }

          // Récupérer l'historique des scores pour cette fonction
          let historique = [];
          try {
            const [hist] = await connection.query(`
              SELECT 
                DATE(frm.date_modification) as date_evaluation,
                AVG(r.score) as score_moyen
              FROM reponses r
              JOIN questions q ON r.id_question = q.id_question
              JOIN thematiques t ON q.id_thematique = t.id_thematique
              JOIN formulaires frm ON r.id_formulaire = frm.id_formulaire
              JOIN acteurs act ON frm.id_acteur = act.id_acteur
              WHERE act.id_entreprise = ?
                AND t.id_fonction = ?
                AND r.score IS NOT NULL
              GROUP BY DATE(frm.date_modification)
              ORDER BY DATE(frm.date_modification) DESC
              LIMIT 12
            `, [id, fonction.id_fonction]);
            historique = hist;
          } catch (histError) {
            logger.error(`Erreur lors de la récupération de l'historique pour fonction ${fonction.id_fonction}`, { error: histError.message });
          }

          fonctionsAvecScores.push({
            id: fonction.id_fonction,
            nom: fonction.nom,
            description: fonction.description || '',
            ordre: fonction.ordre || 0,
            score_global: parseFloat(scoreFonction.toFixed(2)),
            niveau: niveauGlobal?.niveau || '',
            description_niveau: niveauGlobal?.description || '',
            recommandations: niveauGlobal?.recommandations || '',
            thematiques: thematiquesAvecScores,
            historique
          });
        }
      } catch (fonctionError) {
        logger.error(`Erreur lors du traitement de la fonction ${fonction.id_fonction}`, { error: fonctionError.message });
        continue; // Skip this function but continue with others
      }
    }

    // Calculer le score global de l'entreprise
    const scoreGlobal = fonctionsAvecScores.length > 0
      ? parseFloat((fonctionsAvecScores.reduce((sum, f) => sum + f.score_global, 0) / fonctionsAvecScores.length).toFixed(2))
      : 0;

    logger.debug(`Fonctions avec scores retournées: ${fonctionsAvecScores.length}, Score global: ${scoreGlobal}`);

    res.json({
      score_global: scoreGlobal,
      fonctions: fonctionsAvecScores
    });

  } catch (error) {
    logger.error(`Erreur lors de la récupération des fonctions avec scores pour entreprise ${req.params.id}`, { 
      error: error.message, 
      stack: error.stack 
    });
    res.status(500).json({ message: 'Erreur serveur interne', details: error.message });
  } finally {
    connection.release();
  }
});

// GET score history for an enterprise
router.get('/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`GET /api/entreprises/${id}/history - Retrieving score history for enterprise`);
    
    // Get global score history
    const [globalHistory] = await pool.query(`
      SELECT * FROM historique_scores_entreprises
      WHERE id_entreprise = ?
      ORDER BY date_mesure DESC
    `, [id]);
    
    // Get fonction score history
    const [fonctionHistory] = await pool.query(`
      SELECT f.id_fonction, f.nom as fonction_name, 
             AVG(ts.score) as score, 
             DATE(ma.date_analyse) as date_mesure
      FROM fonctions f
      JOIN thematiques t ON f.id_fonction = t.id_fonction
      JOIN thematique_scores ts ON t.nom = ts.thematique
      JOIN maturity_analyses ma ON ts.id_analyse = ma.id_analyse
      JOIN applications a ON ma.id_application = a.id_application
      WHERE a.id_entreprise = ?
      GROUP BY f.id_fonction, f.nom, DATE(ma.date_analyse)
      ORDER BY DATE(ma.date_analyse) DESC, f.nom
    `, [id]);
    
    // Get theme score history
    const [themeHistory] = await pool.query(`
      SELECT t.id_thematique, t.nom as theme_name, f.nom as fonction_name,
             AVG(ts.score) as score,
             DATE(ma.date_analyse) as date_mesure
      FROM thematiques t
      JOIN fonctions f ON t.id_fonction = f.id_fonction
      JOIN thematique_scores ts ON t.nom = ts.thematique
      JOIN maturity_analyses ma ON ts.id_analyse = ma.id_analyse
      JOIN applications a ON ma.id_application = a.id_application
      WHERE a.id_entreprise = ?
      GROUP BY t.id_thematique, t.nom, f.nom, DATE(ma.date_analyse)
      ORDER BY DATE(ma.date_analyse) DESC, t.nom
    `, [id]);
    
    // Build response
    const response = {
      global_history: globalHistory,
      fonction_history: fonctionHistory,
      theme_history: themeHistory
    };
    
    res.status(200).json(response);
  } catch (error) {
    logger.error(`Error retrieving history for enterprise ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Server error while retrieving history' });
  }
});

// POST create new enterprise
router.post('/', async (req, res) => {
  try {
    const { nom_entreprise, secteur } = req.body;
    logger.debug('POST /api/entreprises - Creating new enterprise');
    
    if (!nom_entreprise || !secteur) {
      return res.status(400).json({ message: 'Invalid data: nom_entreprise and secteur are required' });
    }
    
    const id_entreprise = uuidv4();
    
    await pool.query(`
      INSERT INTO entreprises (id_entreprise, nom_entreprise, secteur)
      VALUES (?, ?, ?)
    `, [id_entreprise, nom_entreprise, secteur]);
    
    const [newEnterprise] = await pool.query('SELECT * FROM entreprises WHERE id_entreprise = ?', [id_entreprise]);
    
    res.status(201).json(newEnterprise[0]);
  } catch (error) {
    logger.error('Error creating enterprise:', { error });
    res.status(500).json({ message: 'Server error while creating enterprise' });
  }
});

// PUT update enterprise
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nom_entreprise, secteur } = req.body;
    logger.debug(`PUT /api/entreprises/${id} - Updating enterprise`);
    
    if (!nom_entreprise && !secteur) {
      return res.status(400).json({ message: 'Invalid data: at least one field to update is required' });
    }
    
    // Check if enterprise exists
    const [entreprises] = await pool.query('SELECT * FROM entreprises WHERE id_entreprise = ?', [id]);
    if (entreprises.length === 0) {
      return res.status(404).json({ message: 'Enterprise not found' });
    }
    
    // Build update query
    let updateQuery = 'UPDATE entreprises SET date_modification = NOW()';
    const updateParams = [];
    
    if (nom_entreprise) {
      updateQuery += ', nom_entreprise = ?';
      updateParams.push(nom_entreprise);
    }
    
    if (secteur) {
      updateQuery += ', secteur = ?';
      updateParams.push(secteur);
    }
    
    updateQuery += ' WHERE id_entreprise = ?';
    updateParams.push(id);
    
    await pool.query(updateQuery, updateParams);
    
    const [updatedEnterprise] = await pool.query('SELECT * FROM entreprises WHERE id_entreprise = ?', [id]);
    
    res.status(200).json(updatedEnterprise[0]);
  } catch (error) {
    logger.error(`Error updating enterprise ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Server error while updating enterprise' });
  }
});

// DELETE enterprise
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`DELETE /api/entreprises/${id} - Deleting enterprise`);
    
    // Check if enterprise exists
    const [entreprises] = await pool.query('SELECT * FROM entreprises WHERE id_entreprise = ?', [id]);
    if (entreprises.length === 0) {
      return res.status(404).json({ message: 'Enterprise not found' });
    }
    
    // Check if there are applications associated with this enterprise
    const [applications] = await pool.query('SELECT COUNT(*) as count FROM applications WHERE id_entreprise = ?', [id]);
    if (applications[0].count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete enterprise with associated applications. Please delete or reassign applications first.' 
      });
    }
    
    // Start transaction
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Delete from historique_scores_entreprises
      await connection.query('DELETE FROM historique_scores_entreprises WHERE id_entreprise = ?', [id]);
      
      // Delete from entreprises
      await connection.query('DELETE FROM entreprises WHERE id_entreprise = ?', [id]);
      
      await connection.commit();
      
      res.status(200).json({ message: 'Enterprise deleted successfully' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    logger.error(`Error deleting enterprise ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Server error while deleting enterprise' });
  }
});

// POST recalculate enterprise score
router.post('/:id/calculate', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`POST /api/entreprises/${id}/calculate - Recalculating enterprise score`);
    
    // Check if enterprise exists
    const [entreprises] = await pool.query('SELECT * FROM entreprises WHERE id_entreprise = ?', [id]);
    if (entreprises.length === 0) {
      return res.status(404).json({ message: 'Enterprise not found' });
    }
    
    // Calculate average score from all applications' latest analyses
    const [applications] = await pool.query(`
      SELECT id_application FROM applications WHERE id_entreprise = ?
    `, [id]);
    
    if (applications.length === 0) {
      return res.status(400).json({ message: 'No applications found for this enterprise' });
    }
    
    // Start transaction
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      try {
        // Try to call stored procedure
        await connection.query('CALL calculer_scores_entreprise(?)', [id]);
      } catch (procError) {
        // Manual calculation if procedure doesn't exist
        logger.warn(`Procedure calculer_scores_entreprise not available: ${procError.message}`);
        
        const [scoreResults] = await connection.query(`
          SELECT AVG(ma.score_global) as score_global
          FROM applications a
          JOIN maturity_analyses ma ON a.id_application = ma.id_application
          WHERE a.id_entreprise = ?
          AND ma.id_analyse IN (
            SELECT MAX(id_analyse) FROM maturity_analyses 
            WHERE id_application = a.id_application
            GROUP BY id_application
          )
        `, [id]);
        
        const score_global = scoreResults[0].score_global || 0;
        const id_historique = uuidv4();
        
        await connection.query(`
          INSERT INTO historique_scores_entreprises 
          (id_historique, id_entreprise, score_global, date_mesure)
          VALUES (?, ?, ?, CURDATE())
        `, [id_historique, id, score_global]);
      }
      
      await connection.commit();
      
      // Get updated score
      const [scoreResult] = await pool.query(`
        SELECT score_global, date_mesure
        FROM historique_scores_entreprises
        WHERE id_entreprise = ?
        ORDER BY date_mesure DESC
        LIMIT 1
      `, [id]);
      
      res.status(200).json({
        message: 'Enterprise score calculated successfully',
        id_entreprise: id,
        nom_entreprise: entreprises[0].nom_entreprise,
        score_global: scoreResult.length > 0 ? scoreResult[0].score_global : null,
        date_calcul: scoreResult.length > 0 ? scoreResult[0].date_mesure : null
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    logger.error(`Error calculating score for enterprise ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Server error while calculating enterprise score' });
  }
});

module.exports = router;