// server/routes/formulaires-route.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');
const ScoreService = require('../services/scoreService');
const logger = require('../utils/logger');

// Cache en mémoire pour les données statiques
const cache = {
  applications: new Map(),
  questionnaires: new Map(),
  acteurs: new Map(),
  lastUpdated: null,
  ttl: 5 * 60 * 1000 // 5 minutes
};


// Fonction pour charger le cache des données statiques
const loadCache = async () => {
  try {
    const startTime = Date.now();
    
    // Applications
    const [applications] = await pool.query('SELECT id_application, nom_application FROM applications');
    cache.applications.clear();
    applications.forEach(app => {
      cache.applications.set(app.id_application, app.nom_application);
    });

    // Questionnaires
    const [questionnaires] = await pool.query('SELECT id_questionnaire, nom, titre, description FROM questionnaires');
    cache.questionnaires.clear();
    questionnaires.forEach(q => {
      cache.questionnaires.set(q.id_questionnaire, { 
        nom: q.nom, 
        titre: q.titre, 
        description: q.description 
      });
    });

    // Acteurs avec entreprises
    const [acteurs] = await pool.query(`
      SELECT a.id_acteur, a.nom_prenom, a.email, e.id_entreprise, e.nom_entreprise 
      FROM acteurs a 
      LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
    `);
    cache.acteurs.clear();
    acteurs.forEach(a => {
      cache.acteurs.set(a.id_acteur, {
        nom_prenom: a.nom_prenom,
        email: a.email,
        id_entreprise: a.id_entreprise,
        nom_entreprise: a.nom_entreprise
      });
    });

    cache.lastUpdated = Date.now();
    const loadTime = Date.now() - startTime;
    logger.debug(`Cache rechargé: ${cache.applications.size} apps, ${cache.questionnaires.size} questionnaires, ${cache.acteurs.size} acteurs en ${loadTime}ms`);
  } catch (error) {
    logger.error('Erreur lors du chargement du cache:', error);
  }
};

// Middleware pour rafraîchir le cache si nécessaire
const ensureCache = async (req, res, next) => {
  if (!cache.lastUpdated || (Date.now() - cache.lastUpdated) > cache.ttl) {
    await loadCache();
  }
  next();
};

// GET tous les formulaires - VERSION OPTIMISÉE avec cache
router.get('/', ensureCache, async (req, res) => {
  try {
    const [formulairesResult] = await pool.query(`
      SELECT f.*,
        app.nom_application,
        q.nom as questionnaire_nom,
        act.nom_prenom as acteur_nom,
        e.nom_entreprise,
        h.score_actuel,
        h.score_maximum,
        h.progression,
        h.date_mesure as score_date,
        GROUP_CONCAT(DISTINCT func.nom ORDER BY func.nom SEPARATOR ',') as fonctions
      FROM formulaires f
      LEFT JOIN applications app ON f.id_application = app.id_application
      LEFT JOIN questionnaires q ON f.id_questionnaire = q.id_questionnaire
      LEFT JOIN acteurs act ON f.id_acteur = act.id_acteur
      LEFT JOIN entreprises e ON act.id_entreprise = e.id_entreprise
      
      -- Jointure pour récupérer le dernier score historisé
      LEFT JOIN historique_scores_formulaires h ON f.id_formulaire = h.id_formulaire
        AND h.date_mesure = (
          SELECT MAX(date_mesure) 
          FROM historique_scores_formulaires h2 
          WHERE h2.id_formulaire = f.id_formulaire
        )
      
      -- Jointures correctes pour les fonctions (filtrage)
      INNER JOIN questionnaire_thematiques qt ON q.id_questionnaire = qt.id_questionnaire
      INNER JOIN thematiques t ON qt.id_thematique = t.id_thematique
      INNER JOIN fonctions func ON t.id_fonction = func.id_fonction
      
      WHERE func.nom IS NOT NULL AND func.nom != '' AND TRIM(func.nom) != ''
      GROUP BY f.id_formulaire
      ORDER BY f.date_creation DESC
    `);
    
    const formulaires = formulairesResult.map(form => ({
      id_formulaire: form.id_formulaire,
      questionnaire_nom: form.questionnaire_nom || 'Questionnaire sans nom',
      acteur_nom: form.acteur_nom || 'Utilisateur inconnu',
      nom_application: form.nom_application || 'Application par défaut',
      nom_entreprise: form.nom_entreprise || 'Entreprise inconnue',
      score_actuel: parseFloat(form.score_actuel) || 0,
      score_maximum: parseFloat(form.score_maximum) || 0,
      progression: parseFloat(form.progression) || 0,
      fonctions: form.fonctions ? form.fonctions.split(',') : [],
      date_creation: form.date_creation,
      date_modification: form.date_modification,
      statut: form.statut || 'Brouillon'
    }));
    
    res.status(200).json(formulaires);
  } catch (error) {
    logger.error('Erreur récupération formulaires:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET formulaires récents avec scores (fonctionnalité existante conservée)
router.get('/recent', ensureCache, async (req, res) => {
  try {
    logger.debug('GET /api/formulaires/recent - Récupération avec scores historisés');
    const limit = req.query.limit || 10;
    
    const [formulaires] = await pool.query(`
      SELECT f.*,
        app.nom_application,
        q.nom as questionnaire_nom,
        act.nom_prenom as acteur_nom,
        e.nom_entreprise,
        h.score_actuel,
        h.score_maximum,
        h.progression,
        h.date_mesure as score_date,
        func.nom as nom_fonction
      FROM formulaires f
      LEFT JOIN applications app ON f.id_application = app.id_application
      LEFT JOIN questionnaires q ON f.id_questionnaire = q.id_questionnaire
      LEFT JOIN acteurs act ON f.id_acteur = act.id_acteur
      LEFT JOIN entreprises e ON act.id_entreprise = e.id_entreprise
      -- JOIN avec les scores historisés (derniers scores)
      LEFT JOIN historique_scores_formulaires h ON f.id_formulaire = h.id_formulaire
        AND h.date_mesure = (
          SELECT MAX(date_mesure) 
          FROM historique_scores_formulaires h2 
          WHERE h2.id_formulaire = f.id_formulaire
        )
      -- Filtrage par fonctions valides
      INNER JOIN questionnaire_thematiques qt ON q.id_questionnaire = qt.id_questionnaire
      INNER JOIN thematiques t ON qt.id_thematique = t.id_thematique
      INNER JOIN fonctions func ON t.id_fonction = func.id_fonction
      WHERE func.nom IS NOT NULL AND func.nom != '' AND TRIM(func.nom) != ''
      GROUP BY f.id_formulaire
      ORDER BY f.date_creation DESC
      LIMIT ?
    `, [parseInt(limit)]);
    
    // ✅ Plus de calcul côté serveur - tout vient de la DB
    const formulairesFormates = formulaires.map(form => ({
      id_formulaire: form.id_formulaire,
      questionnaire_nom: form.questionnaire_nom || 'Questionnaire sans nom',
      acteur_nom: form.acteur_nom || 'Utilisateur inconnu',
      nom_application: form.nom_application || 'Application par défaut',
      nom_entreprise: form.nom_entreprise || 'Entreprise inconnue',
      nom_fonction: form.nom_fonction || 'Fonction inconnue',
      score_actuel: form.score_actuel || 0,
      score_maximum: form.score_maximum || 0,
      progression: form.progression || 0,
      score_global: form.score_actuel || 0, // Pour compatibilité
      date_creation: form.date_creation,
      date_modification: form.date_modification,
      statut: form.statut || 'Brouillon'
    }));
    
    logger.info(`✅ ${formulairesFormates.length} formulaires récents récupérés avec scores historisés`);
    res.status(200).json(formulairesFormates);
  } catch (error) {
    logger.error('Erreur récupération formulaires récents:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});


// GET formulaires par questionnaire (fonctionnalité existante conservée)
router.get('/questionnaire/:id', ensureCache, async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`GET /api/formulaires/questionnaire/${id} - Récupération des formulaires par questionnaire avec fonctions valides`);
    
    let formulairesResult = [];
    try {
      [formulairesResult] = await pool.query(`
        SELECT f.*, 
               app.nom_application,
               q.nom,
               act.nom_prenom as acteur_nom,
               e.id_entreprise,
               e.nom_entreprise,
               func.nom as nom_fonction
        FROM formulaires f
        LEFT JOIN applications app ON f.id_application = app.id_application
        LEFT JOIN questionnaires q ON f.id_questionnaire = q.id_questionnaire
        LEFT JOIN acteurs act ON f.id_acteur = act.id_acteur
        LEFT JOIN entreprises e ON act.id_entreprise = e.id_entreprise
        -- JOINTURES POUR S'ASSURER D'AVOIR DES FONCTIONS VALIDES
        INNER JOIN questionnaire_thematiques qt ON q.id_questionnaire = qt.id_questionnaire
        INNER JOIN thematiques t ON qt.id_thematique = t.id_thematique
        INNER JOIN fonctions func ON t.id_fonction = func.id_fonction
        WHERE f.id_questionnaire = ?
          AND func.nom IS NOT NULL 
          AND func.nom != '' 
          AND TRIM(func.nom) != ''
        GROUP BY f.id_formulaire
        ORDER BY f.date_creation DESC
      `, [id]);
    } catch (err) {
      logger.warn(`Erreur avec la requête JOIN complète pour les formulaires du questionnaire ${id} avec fonctions valides, tentative de requête alternative:`, { error: err });
      [formulairesResult] = await pool.query(`
        SELECT f.* FROM formulaires f
        WHERE f.id_questionnaire = ?
          AND f.id_questionnaire IN (
            SELECT DISTINCT q.id_questionnaire 
            FROM questionnaires q
            INNER JOIN questionnaire_thematiques qt ON q.id_questionnaire = qt.id_questionnaire
            INNER JOIN thematiques t ON qt.id_thematique = t.id_thematique
            INNER JOIN fonctions func ON t.id_fonction = func.id_fonction
            WHERE func.nom IS NOT NULL 
              AND func.nom != '' 
              AND TRIM(func.nom) != ''
          )
        ORDER BY f.date_creation DESC
      `, [id]);
    }
    
    const formulaires = formulairesResult.map(form => {
      const acteurCache = cache.acteurs.get(form.id_acteur);
      const appCache = cache.applications.get(form.id_application);
      
      return {
        id_formulaire: form.id_formulaire,
        titre: form.questionnaire_titre || form.titre || 'Formulaire',
        organisation: form.acteur_nom || acteurCache?.nom_prenom || 'N/A',
        date_creation: form.date_creation,
        progression: calculateProgression(form),
        statut: form.statut || 'En cours',
        id_questionnaire: form.id_questionnaire,
        id_application: form.id_application,
        id_acteur: form.id_acteur || null,
        commentaires: form.commentaires || '',
        date_modification: form.date_modification || form.date_creation,
        nom_application: form.nom_application || appCache || 'Application par défaut',
        fonction: form.fonction || 'Fonction inconnue',
        thematique: form.thematique || 'Non catégorisé',
        acteur_nom: form.acteur_nom || acteurCache?.nom_prenom || 'Utilisateur inconnu',
        id_entreprise: form.id_entreprise || acteurCache?.id_entreprise || null,
        nom_entreprise: form.nom_entreprise || acteurCache?.nom_entreprise || 'Entreprise inconnue',
        nom_fonction: form.nom_fonction || form.fonction || 'Fonction inconnue'
      };
    });
    
    logger.info(`✅ ${formulaires.length} formulaires pour le questionnaire ${id} avec fonctions valides récupérés`);
    res.status(200).json(formulaires);
  } catch (error) {
    logger.error(`Erreur lors de la récupération des formulaires pour le questionnaire ${req.params.id} avec fonctions valides:`, { error });
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des formulaires par questionnaire' });
  }
});

// GET formulaire par ID (fonctionnalité existante optimisée)
router.get('/:id', ensureCache, async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`GET /api/formulaires/${id} - Récupération d'un formulaire avec détails`);
    
    const [formulaireResult] = await pool.query(`
      SELECT 
        f.*,
        app.nom_application,
        q.nom as questionnaire_nom,
        q.description as questionnaire_description,
        act.nom_prenom as acteur_nom,
        act.email as acteur_email,
        e.id_entreprise,
        e.nom_entreprise,
        GROUP_CONCAT(DISTINCT t.nom ORDER BY qt.ordre SEPARATOR ',') as thematiques,
        GROUP_CONCAT(DISTINCT t.id_thematique ORDER BY qt.ordre SEPARATOR ',') as thematiques_ids,
        GROUP_CONCAT(DISTINCT func.nom ORDER BY func.nom SEPARATOR ',') as fonctions,
        GROUP_CONCAT(DISTINCT func.id_fonction ORDER BY func.nom SEPARATOR ',') as fonctions_ids
      FROM formulaires f
      LEFT JOIN applications app ON f.id_application = app.id_application
      LEFT JOIN questionnaires q ON f.id_questionnaire = q.id_questionnaire
      LEFT JOIN questionnaire_thematiques qt ON q.id_questionnaire = qt.id_questionnaire
      LEFT JOIN thematiques t ON qt.id_thematique = t.id_thematique
      LEFT JOIN fonctions func ON t.id_fonction = func.id_fonction
      LEFT JOIN acteurs act ON f.id_acteur = act.id_acteur
      LEFT JOIN entreprises e ON act.id_entreprise = e.id_entreprise
      WHERE f.id_formulaire = ?
      GROUP BY f.id_formulaire
    `, [id]);
    
    if (formulaireResult.length === 0) {
      return res.status(404).json({ message: 'Formulaire non trouvé' });
    }
    
    const form = formulaireResult[0];
    
    // Traitement des données agrégées
    const thematiques = form.thematiques ? 
      form.thematiques.split(',').map(t => t.trim()).filter(Boolean) : [];
    const thematiques_ids = form.thematiques_ids ? 
      form.thematiques_ids.split(',').map(id => id.trim()).filter(Boolean) : [];
    const fonctions = form.fonctions ? 
      form.fonctions.split(',').map(f => f.trim()).filter(Boolean) : [];
    const fonctions_ids = form.fonctions_ids ? 
      form.fonctions_ids.split(',').map(id => id.trim()).filter(Boolean) : [];
    
    const formulaire = {
      id_formulaire: form.id_formulaire,
      statut: form.statut || 'Brouillon',
      progression: form.progression !== undefined ? form.progression : calculateProgression(form),
      date_creation: form.date_creation,
      date_modification: form.date_modification || form.date_creation,
      commentaires: form.commentaires || '',
      
      questionnaire: {
        id_questionnaire: form.id_questionnaire,
        nom: form.questionnaire_nom,
        description: form.questionnaire_description,
        thematiques: thematiques.map((nom, index) => ({
          id: thematiques_ids[index],
          nom: nom
        })),
        fonctions: fonctions.map((nom, index) => ({
          id: fonctions_ids[index],
          nom: nom
        }))
      },
      
      acteur: {
        id_acteur: form.id_acteur,
        nom_prenom: form.acteur_nom,
        email: form.acteur_email
      },
      
      application: {
        id_application: form.id_application,
        nom_application: form.nom_application
      },
      
      entreprise: {
        id_entreprise: form.id_entreprise,
        nom_entreprise: form.nom_entreprise
      }
    };
    
    res.status(200).json(formulaire);
  } catch (error) {
    logger.error(`Erreur lors de la récupération du formulaire ${req.params.id}:`, { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Erreur serveur lors de la récupération du formulaire', details: error.message });
  }
});

// GET réponses par formulaire (fonctionnalité existante conservée)
router.get('/:id/reponses', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`GET /api/formulaires/${id}/reponses - Récupération des réponses d'un formulaire spécifique`);
    
    const [formulaires] = await pool.query('SELECT * FROM formulaires WHERE id_formulaire = ?', [id]);
    
    if (formulaires.length === 0) {
      return res.status(404).json({ message: 'Formulaire non trouvé' });
    }
    
    const [reponses] = await pool.query(`
      SELECT * FROM reponses WHERE id_formulaire = ?
    `, [id]);
    
    res.status(200).json(reponses);
  } catch (error) {
    logger.error(`Erreur lors de la récupération des réponses du formulaire ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des réponses' });
  }
});

// POST nouveau formulaire (fonctionnalité existante conservée)
router.post('/', ensureCache, async (req, res) => {
  try {
    const { 
      id_questionnaire,
      id_application,
      id_acteur,
      statut,
      donnees_contextuelles,
      commentaires,
      metadata
    } = req.body;
    
    logger.debug('POST /api/formulaires - Création d\'un nouveau formulaire', {
      id_questionnaire,
      id_application,
      id_acteur,
      metadata
    });
    
    if (!id_questionnaire || !id_acteur) {
      return res.status(400).json({ 
        message: 'Données invalides: id_questionnaire et id_acteur sont requis' 
      });
    }

    // Gestion application par défaut avec cache
    let applicationId = id_application;
    if (!applicationId) {
      try {
        const [defaultAppResult] = await pool.query(
          'SELECT id_application FROM applications WHERE nom_application = ?', 
          ['Application par défaut']
        );
        
        if (defaultAppResult.length > 0) {
          applicationId = defaultAppResult[0].id_application;
        } else {
          const [anyAppResult] = await pool.query('SELECT id_application FROM applications LIMIT 1');
          if (anyAppResult.length > 0) {
            applicationId = anyAppResult[0].id_application;
          } else {
            return res.status(400).json({ 
              message: 'Aucune application trouvée dans le système. Veuillez créer une application.' 
            });
          }
        }
      } catch (err) {
        logger.error('Erreur lors de la recherche de l\'application par défaut:', { error: err });
        return res.status(500).json({ 
          message: 'Erreur lors de la recherche de l\'application par défaut' 
        });
      }
    }
    
    const id_formulaire = uuidv4();
    const now = new Date();
    
    // Construction requête adaptative
    let insertQuery = `INSERT INTO formulaires (id_formulaire, id_questionnaire, id_application, id_acteur`;
    const insertValues = [id_formulaire, id_questionnaire, applicationId, id_acteur];
    
    if (statut) {
      insertQuery += `, statut`;
      insertValues.push(statut);
    }
    
    if (donnees_contextuelles) {
      try {
        insertQuery += `, donnees_contextuelles`;
        insertValues.push(JSON.stringify(donnees_contextuelles));
      } catch (err) {
        logger.warn('Erreur lors de la sérialisation des données contextuelles:', { error: err });
      }
    }
    
    if (commentaires) {
      insertQuery += `, commentaires`;
      insertValues.push(commentaires);
    }
    
    insertQuery += `, date_creation, date_modification) VALUES (${Array(insertValues.length).fill('?').join(', ')})`;
    insertValues.push(now, now);
    
    await pool.query(insertQuery, insertValues);
    
    // Récupérer le formulaire créé avec informations enrichies
    let createdFormulaire = {};
    try {
      const [createdFormResult] = await pool.query(`
        SELECT f.*, 
               app.nom_application,
               q.nom,
               act.nom_prenom as acteur_nom,
               e.id_entreprise,
               e.nom_entreprise
        FROM formulaires f
        LEFT JOIN applications app ON f.id_application = app.id_application
        LEFT JOIN questionnaires q ON f.id_questionnaire = q.id_questionnaire
        LEFT JOIN acteurs act ON f.id_acteur = act.id_acteur
        LEFT JOIN entreprises e ON act.id_entreprise = e.id_entreprise
        WHERE f.id_formulaire = ?
      `, [id_formulaire]);
      
      if (createdFormResult.length > 0) {
        const form = createdFormResult[0];
        createdFormulaire = {
          id_formulaire: form.id_formulaire,
          titre: form.nom || 'Nouveau formulaire',
          organisation: form.acteur_nom || 'N/A',
          date_creation: form.date_creation,
          progression: calculateProgression(form),
          statut: form.statut || 'En cours',
          id_questionnaire: form.id_questionnaire,
          id_application: form.id_application,
          id_acteur: form.id_acteur,
          commentaires: form.commentaires || '',
          date_modification: form.date_modification,
          nom_application: form.nom_application || 'Application par défaut',
          acteur_nom: form.acteur_nom || 'Utilisateur inconnu',
          id_entreprise: form.id_entreprise,
          nom_entreprise: form.nom_entreprise || 'Entreprise inconnue'
        };
      }
    } catch (err) {
      logger.warn('Erreur lors de la récupération du formulaire créé:', { error: err });
      
      // Fallback avec métadonnées
      createdFormulaire = {
        id_formulaire,
        titre: 'Nouveau formulaire',
        date_creation: now,
        progression: 0,
        statut: statut || 'En cours',
        id_questionnaire,
        id_application: applicationId,
        id_acteur,
        commentaires: commentaires || '',
        date_modification: now
      };
      
      if (metadata) {
        createdFormulaire.acteur_nom = metadata.acteur_nom || 'Utilisateur inconnu';
        createdFormulaire.nom_entreprise = metadata.entreprise_nom || 'Entreprise inconnue';
      }
    }
    
    // Invalider le cache pour forcer un rechargement
    cache.lastUpdated = null;
    
    res.status(201).json(createdFormulaire);
  } catch (error) {
    logger.error('Erreur lors de la création du formulaire:', { error });
    res.status(500).json({ message: 'Erreur serveur lors de la création du formulaire' });
  }
});

// PUT mettre à jour un formulaire (fonctionnalité existante conservée)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { statut, progression, donnees_contextuelles, commentaires, trigger_score_calculation } = req.body;
    
    // Mise à jour normale du formulaire
    await pool.query(`
      UPDATE formulaires 
      SET statut = ?, progression = ?, donnees_contextuelles = ?, commentaires = ?, date_modification = NOW()
      WHERE id_formulaire = ?
    `, [statut, progression, JSON.stringify(donnees_contextuelles), commentaires, id]);
    
    // Calcul de score si demandé OU si changement de statut important
    if (trigger_score_calculation || statut === 'Soumis' || statut === 'Validé') {
      await ScoreService.calculateAndSaveScore(id);
    }
    
    // Récupérer le formulaire avec score
    const [updated] = await pool.query(`
      SELECT f.*, h.score_actuel, h.score_maximum, h.progression as score_progression
      FROM formulaires f
      LEFT JOIN historique_scores_formulaires h ON f.id_formulaire = h.id_formulaire
        AND h.date_mesure = (SELECT MAX(date_mesure) FROM historique_scores_formulaires WHERE id_formulaire = f.id_formulaire)
      WHERE f.id_formulaire = ?
    `, [id]);
    
    res.status(200).json(updated[0]);
  } catch (error) {
    logger.error(`Erreur mise à jour formulaire ${id}:`, error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// DELETE supprimer un formulaire (fonctionnalité existante conservée)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`DELETE /api/formulaires/${id} - Suppression d'un formulaire`);
    
    const [formulaires] = await pool.query('SELECT * FROM formulaires WHERE id_formulaire = ?', [id]);
    
    if (formulaires.length === 0) {
      return res.status(404).json({ message: 'Formulaire non trouvé' });
    }
    
    // Supprimer les réponses associées
    try {
      await pool.query('DELETE FROM reponses WHERE id_formulaire = ?', [id]);
    } catch (err) {
      logger.warn(`Erreur lors de la suppression des réponses pour le formulaire ${id}:`, { error: err });
    }
    
    await pool.query('DELETE FROM formulaires WHERE id_formulaire = ?', [id]);
    
    res.status(200).json({ message: 'Formulaire supprimé avec succès' });
  } catch (error) {
    logger.error(`Erreur lors de la suppression du formulaire ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Erreur serveur lors de la suppression du formulaire' });
  }
});


// POST nouvelle réponse (fonctionnalité existante conservée)
router.post('/reponses', async (req, res) => {
  try {
    const { id_formulaire, id_question, valeur_reponse, score, commentaire } = req.body;
    
    if (!id_formulaire || !id_question || !valeur_reponse) {
      return res.status(400).json({ 
        message: 'Données invalides: id_formulaire, id_question et valeur_reponse sont requis' 
      });
    }
    
    const id_reponse = uuidv4();
    const now = new Date();
    
    await pool.query(`
      INSERT INTO reponses (
        id_reponse, id_formulaire, id_question, valeur_reponse, score, commentaire, date_creation
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id_reponse, id_formulaire, id_question, valeur_reponse, score || 0, commentaire || null, now]);
    
    res.status(201).json({
      id_reponse,
      id_formulaire,
      id_question,
      valeur_reponse,
      score: score || 0,
      commentaire: commentaire || null,
      date_creation: now
    });
  } catch (error) {
    logger.error('Erreur lors de la création de la réponse:', { error });
    res.status(500).json({ message: 'Erreur serveur lors de la création de la réponse' });
  }
});

// PUT mettre à jour une réponse (fonctionnalité existante conservée)
router.put('/reponses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { valeur_reponse, score, commentaire } = req.body;
    
    const [reponses] = await pool.query('SELECT * FROM reponses WHERE id_reponse = ?', [id]);
    
    if (reponses.length === 0) {
      return res.status(404).json({ message: 'Réponse non trouvée' });
    }
    
    let updateQuery = 'UPDATE reponses SET date_modification = NOW()';
    const updateParams = [];
    
    if (valeur_reponse !== undefined) {
      updateQuery += ', valeur_reponse = ?';
      updateParams.push(valeur_reponse);
    }
    
    if (score !== undefined) {
      updateQuery += ', score = ?';
      updateParams.push(score);
    }
    
    if (commentaire !== undefined) {
      updateQuery += ', commentaire = ?';
      updateParams.push(commentaire);
    }
    
    updateQuery += ' WHERE id_reponse = ?';
    updateParams.push(id);
    
    await pool.query(updateQuery, updateParams);
    
    const [updatedReponses] = await pool.query('SELECT * FROM reponses WHERE id_reponse = ?', [id]);
    
    res.status(200).json(updatedReponses[0]);
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour de la réponse ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de la réponse' });
  }
});

// PUT soumission formulaire avec calcul scores (fonctionnalité existante conservée)
router.put('/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`PUT /api/formulaires/${id}/submit - Soumission d'un formulaire`);
    
    // Vérifier que le formulaire existe
    const [formulaires] = await pool.query('SELECT * FROM formulaires WHERE id_formulaire = ?', [id]);
    
    if (formulaires.length === 0) {
      return res.status(404).json({ message: 'Formulaire non trouvé' });
    }
    
    // Vérifier que toutes les questions ont des réponses
    const [questionsCount] = await pool.query(`
      SELECT COUNT(DISTINCT q.id_question) as total_questions
      FROM questions q
      JOIN questionnaires_questions qq ON q.id_question = qq.id_question
      WHERE qq.id_questionnaire = ?
    `, [formulaires[0].id_questionnaire]);
    
    const [reponsesCount] = await pool.query(`
      SELECT COUNT(DISTINCT r.id_question) as questions_repondues
      FROM reponses r
      WHERE r.id_formulaire = ?
    `, [id]);
    
    if (reponsesCount[0].questions_repondues < questionsCount[0].total_questions) {
      return res.status(400).json({ 
        message: 'Toutes les questions doivent avoir une réponse avant de soumettre le formulaire',
        details: {
          questions_totales: questionsCount[0].total_questions,
          questions_repondues: reponsesCount[0].questions_repondues
        }
      });
    }
    
    // Mettre à jour le statut du formulaire
    await pool.query(
      'UPDATE formulaires SET statut = ?, date_modification = NOW() WHERE id_formulaire = ?', 
      ['Soumis', id]
    );
    
    // Récupérer les informations mises à jour du formulaire
    const [updatedFormResult] = await pool.query(`
      SELECT f.*, 
             app.nom_application,
             q.nom as questionnaire_nom,
             act.nom_prenom as acteur_nom,
             e.id_entreprise,
             e.nom_entreprise
      FROM formulaires f
      LEFT JOIN applications app ON f.id_application = app.id_application
      LEFT JOIN questionnaires q ON f.id_questionnaire = q.id_questionnaire
      LEFT JOIN acteurs act ON f.id_acteur = act.id_acteur
      LEFT JOIN entreprises e ON act.id_entreprise = e.id_entreprise
      WHERE f.id_formulaire = ?
    `, [id]);
    
    const response = {
      formulaire: updatedFormResult.length > 0 ? {
        ...updatedFormResult[0],
        nom_application: updatedFormResult[0].nom_application || 'Application par défaut',
        acteur_nom: updatedFormResult[0].acteur_nom || 'Utilisateur inconnu',
        nom_entreprise: updatedFormResult[0].nom_entreprise || 'Entreprise inconnue'
      } : null,
      message: 'Formulaire soumis avec succès',
      info: 'Les scores et recommandations sont calculés dynamiquement lors de la consultation'
    };
    
    logger.info(`Formulaire ${id} soumis avec succès`);
    res.status(200).json(response);
    
  } catch (error) {
    logger.error(`Erreur lors de la soumission du formulaire ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Erreur serveur lors de la soumission du formulaire' });
  }
});

router.get('/entreprises/:entrepriseId/fonctions/:fonctionId/scores', async (req, res) => {
  try {
    const { entrepriseId, fonctionId } = req.params;
    const { startDate, endDate } = req.query;
    
    logger.debug(`GET /api/formulaires/entreprises/${entrepriseId}/fonctions/${fonctionId}/scores`);
    
    let query = `
      SELECT 
        DATE(f.date_modification) as date_evaluation,
        t.nom as thematique,
        AVG(r.score) as score_moyen,
        COUNT(DISTINCT r.id_formulaire) as nb_evaluations
      FROM reponses r
      JOIN questions q ON r.id_question = q.id_question
      JOIN thematiques t ON q.id_thematique = t.id_thematique
      JOIN formulaires f ON r.id_formulaire = f.id_formulaire
      JOIN applications a ON f.id_application = a.id_application
      JOIN acteurs act ON f.id_acteur = act.id_acteur
      WHERE a.id_entreprise = ?
        AND t.id_fonction = ?
        AND f.statut = 'Soumis'
        AND r.score IS NOT NULL
    `;
    
    const params = [entrepriseId, fonctionId];
    
    if (startDate) {
      query += ' AND DATE(f.date_modification) >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND DATE(f.date_modification) <= ?';
      params.push(endDate);
    }
    
    query += `
      GROUP BY DATE(f.date_modification), t.nom
      ORDER BY DATE(f.date_modification) DESC, t.nom
    `;
    
    const [scores] = await pool.query(query, params);
    
    // Grouper par date
    const scoresByDate = {};
    scores.forEach(row => {
      const date = row.date_evaluation;
      if (!scoresByDate[date]) {
        scoresByDate[date] = {
          date: date,
          thematiques: [],
          score_global_fonction: 0,
          nb_evaluations: row.nb_evaluations
        };
      }
      
      scoresByDate[date].thematiques.push({
        nom: row.thematique,
        score: parseFloat(row.score_moyen.toFixed(2))
      });
    });
    
    // Calculer le score global de la fonction pour chaque date
    Object.values(scoresByDate).forEach(dateData => {
      const totalScore = dateData.thematiques.reduce((sum, t) => sum + t.score, 0);
      dateData.score_global_fonction = parseFloat((totalScore / dateData.thematiques.length).toFixed(2));
    });
    
    res.status(200).json({
      entreprise_id: entrepriseId,
      fonction_id: fonctionId,
      historique: Object.values(scoresByDate)
    });
    
  } catch (error) {
    logger.error('Erreur lors de la récupération des scores historiques:', { error });
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des scores' });
  }
});

// GET statistiques globales (fonctionnalité existante conservée)
router.get('/stats/global', async (req, res) => {
  try {
    logger.debug('GET /api/formulaires/stats/global - Récupération des statistiques globales avec fonctions valides');
    
    const [statsResult] = await pool.query(`
      SELECT 
        COUNT(DISTINCT f.id_formulaire) as total_formulaires,
        COUNT(CASE WHEN f.statut = 'Validé' THEN 1 END) as formules_valides,
        COUNT(CASE WHEN f.statut = 'Soumis' THEN 1 END) as formulaires_soumis,
        COUNT(CASE WHEN f.statut = 'Brouillon' THEN 1 END) as formulaires_brouillon,
        AVG(CASE WHEN f.progression IS NOT NULL THEN f.progression ELSE 
          CASE 
            WHEN f.statut = 'Validé' THEN 100 
            WHEN f.statut = 'Soumis' THEN 75 
            ELSE 25 
          END 
        END) as progression_moyenne,
        COUNT(DISTINCT q.id_questionnaire) as questionnaires_utilises,
        COUNT(DISTINCT func.id_fonction) as fonctions_couvertes
      FROM formulaires f
      LEFT JOIN questionnaires q ON f.id_questionnaire = q.id_questionnaire
      LEFT JOIN questionnaire_thematiques qt ON q.id_questionnaire = qt.id_questionnaire
      LEFT JOIN thematiques t ON qt.id_thematique = t.id_thematique
      -- SEULES LES FONCTIONS AVEC NOM VALIDE
      INNER JOIN fonctions func ON t.id_fonction = func.id_fonction
      WHERE func.nom IS NOT NULL 
        AND func.nom != '' 
        AND TRIM(func.nom) != ''
    `);
    
    const stats = {
      total_formulaires: statsResult[0]?.total_formulaires || 0,
      formulaires_valides: statsResult[0]?.formules_valides || 0,
      formulaires_soumis: statsResult[0]?.formulaires_soumis || 0,
      formulaires_brouillon: statsResult[0]?.formulaires_brouillon || 0,
      progression_moyenne: Math.round(statsResult[0]?.progression_moyenne || 0),
      questionnaires_utilises: statsResult[0]?.questionnaires_utilises || 0,
      fonctions_couvertes: statsResult[0]?.fonctions_couvertes || 0
    };
    
    logger.info('✅ Statistiques globales avec filtrage des fonctions valides calculées', stats);
    res.status(200).json(stats);
  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques globales avec fonctions valides:', { error });
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des statistiques globales' });
  }
});

// Route de diagnostic de performance
router.get('/debug/performance', async (req, res) => {
  try {
    const tests = {};
    
    // Test simple
    let start = Date.now();
    const [count] = await pool.query('SELECT COUNT(*) as total FROM formulaires');
    tests.simple_count = `${Date.now() - start}ms`;
    
    // Test cache
    start = Date.now();
    await ensureCache({}, {}, () => {});
    tests.cache_load = `${Date.now() - start}ms`;
    
    // Test requête de base
    start = Date.now();
    const [baseQuery] = await pool.query(`
      SELECT id_formulaire, id_acteur, id_application, id_questionnaire, statut, date_creation 
      FROM formulaires 
      ORDER BY date_creation DESC 
      LIMIT 10
    `);
    tests.base_query = `${Date.now() - start}ms`;
    
    res.status(200).json({
      performance_tests: tests,
      cache_status: `${cache.applications.size} apps, ${cache.questionnaires.size} questionnaires, ${cache.acteurs.size} acteurs`,
      cache_age: cache.lastUpdated ? `${Math.round((Date.now() - cache.lastUpdated) / 1000)}s` : 'Non initialisé',
      total_formulaires: count[0].total,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      message: 'Erreur lors du diagnostic de performance' 
    });
  }
});

router.get('/debug-scores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Analyser un formulaire spécifique
    const [reponses] = await pool.query(`
      SELECT r.*, q.texte as question_texte, q.ponderation
      FROM reponses r 
      JOIN questions q ON r.id_question = q.id_question
      WHERE r.id_formulaire = ?
    `, [id]);
    
    const [allQuestions] = await pool.query(`
      SELECT q.*, t.nom as thematique_nom
      FROM questions q
      JOIN formulaires f ON q.id_questionnaire = f.id_questionnaire
      JOIN thematiques t ON q.id_thematique = t.id_thematique
      WHERE f.id_formulaire = ?
    `, [id]);
    
    const debugInfo = {
      formulaire_id: id,
      nombre_reponses: reponses.length,
      nombre_questions_total: allQuestions.length,
      calculs: {
        score_actuel_stocke: reponses.reduce((sum, r) => sum + (parseFloat(r.score) || 0), 0),
        score_actuel_recalcule: reponses.reduce((sum, r) => 
          sum + calculateScore(r.valeur_reponse, { ponderation: r.ponderation }), 0),
        score_maximum_correct: allQuestions.reduce((sum, q) => 
          sum + calculateScore('5', { ponderation: q.ponderation }), 0)
      }
    };
    
    res.status(200).json(debugInfo);
  } catch (error) {
    res.status(500).json({ message: 'Erreur debug' });
  }
});

// Initialiser le cache au démarrage
loadCache();

module.exports = router;