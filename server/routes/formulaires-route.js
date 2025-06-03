// server/routes/formulaires-route.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// Fonction utilitaire pour calculer la progression d'un formulaire
const calculateProgression = (form) => {
  // Valeur par défaut ou logique métier selon votre application
  return form.progression || 
         (form.statut === 'Validé' ? 100 : 
          form.statut === 'Soumis' ? 75 : 
          form.statut === 'En cours' ? 50 : 25);
};

// GET tous les formulaires
router.get('/', async (req, res) => {
  try {
    logger.debug('GET /api/formulaires - Récupération de tous les formulaires');
    
    // Essayer de récupérer les formulaires avec une requête JOIN améliorée
    let formulairesResult = [];
    try {
      // Requête JOIN complète avec entreprise et fonction
      [formulairesResult] = await pool.query(`
        SELECT f.*, 
               app.nom_application,
               q.fonction,
               q.thematique,
               act.nom_prenom as acteur_nom,
               e.id_entreprise,
               e.nom_entreprise,
               func.nom as nom_fonction
        FROM formulaires f
        LEFT JOIN applications app ON f.id_application = app.id_application
        LEFT JOIN questionnaires q ON f.id_questionnaire = q.id_questionnaire
        LEFT JOIN acteurs act ON f.id_acteur = act.id_acteur
        LEFT JOIN entreprises e ON act.id_entreprise = e.id_entreprise
        LEFT JOIN fonctions func ON q.fonction = func.nom
        ORDER BY f.date_creation DESC
      `);
    } catch (err) {
      // Si la requête complexe échoue, tenter une requête plus simple
      logger.warn('Erreur avec la requête JOIN complète, tentative de requête simple:', { error: err });
      [formulairesResult] = await pool.query(`
        SELECT * FROM formulaires
        ORDER BY date_creation DESC
      `);
    }
    
    // Adapter les formulaires pour correspondre au format attendu par le frontend
    const formulaires = formulairesResult.map(form => {
      return {
        id_formulaire: form.id_formulaire,
        titre: form.questionnaire_titre || form.titre || 'Formulaire',
        organisation: form.acteur_nom || form.organisation || 'N/A',
        date_creation: form.date_creation,
        progression: calculateProgression(form),
        statut: form.statut || 'En cours',
        id_questionnaire: form.id_questionnaire,
        id_application: form.id_application,
        id_acteur: form.id_acteur || null,
        commentaires: form.commentaires || '',
        date_modification: form.date_modification || form.date_creation,
        nom_application: form.nom_application || 'Application par défaut',
        fonction: form.fonction || 'Fonction inconnue',
        thematique: form.thematique || 'Non catégorisé',
        acteur_nom: form.acteur_nom || 'Utilisateur inconnu',
        id_entreprise: form.id_entreprise || null,
        nom_entreprise: form.nom_entreprise || 'Entreprise inconnue',
        nom_fonction: form.nom_fonction || form.fonction || 'Fonction inconnue'
      };
    });
    
    res.status(200).json(formulaires);
  } catch (error) {
    logger.error('Erreur lors de la récupération des formulaires:', { error });
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des formulaires' });
  }
});

// GET formulaires récents
router.get('/recent', async (req, res) => {
  try {
    logger.debug('GET /api/formulaires/recent - Récupération des formulaires récents');
    const limit = req.query.limit || 10;
    
    // Récupérer les formulaires avec jointures comme avant
    const [formulairesResult] = await pool.query(`
      SELECT f.*, 
             app.nom_application,
             q.fonction,
             q.thematique,
             act.nom_prenom as acteur_nom,
             e.id_entreprise,
             e.nom_entreprise,
             func.nom as nom_fonction
      FROM formulaires f
      LEFT JOIN applications app ON f.id_application = app.id_application
      LEFT JOIN questionnaires q ON f.id_questionnaire = q.id_questionnaire
      LEFT JOIN acteurs act ON f.id_acteur = act.id_acteur
      LEFT JOIN entreprises e ON act.id_entreprise = e.id_entreprise
      LEFT JOIN fonctions func ON q.fonction = func.nom
      ORDER BY f.date_creation DESC
      LIMIT ?
    `, [parseInt(limit)]);
    
    // Enrichir les données avec les scores
    const formulaires = await Promise.all(formulairesResult.map(async (form) => {
      // Récupérer le score actuel (somme des réponses)
      const [reponses] = await pool.query(`
        SELECT SUM(r.score) as score_actuel
        FROM reponses r 
        WHERE r.id_formulaire = ?
      `, [form.id_formulaire]);
      
      // Récupérer le score maximum possible
      const [questions] = await pool.query(`
        SELECT SUM(ponderation) as score_maximum
        FROM questions 
        WHERE id_questionnaire = ?
      `, [form.id_questionnaire]);
      
      // Extraire les valeurs numériques
      const scoreActuel = parseFloat(reponses[0]?.score_actuel || 0);
      const scoreMaximum = parseFloat(questions[0]?.score_maximum || 0);
      
      // Renvoyer l'objet formulaire enrichi
      return {
        ...form,
        nom_application: form.nom_application || 'Application par défaut',
        fonction: form.fonction || 'Fonction inconnue',
        thematique: form.thematique || 'Non catégorisé',
        acteur_nom: form.acteur_nom || 'Utilisateur inconnu',
        id_entreprise: form.id_entreprise || null,
        nom_entreprise: form.nom_entreprise || 'Entreprise inconnue',
        nom_fonction: form.nom_fonction || form.fonction || 'Fonction inconnue',
        score_actuel: scoreActuel,
        score_maximum: scoreMaximum,
        // On garde score_global pour la compatibilité
        score_global: scoreActuel
      };
    }));
    
    res.status(200).json(formulaires);
  } catch (error) {
    logger.error('Erreur lors de la récupération des formulaires récents:', { error });
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des formulaires récents' });
  }
});

// GET formulaires par questionnaire
router.get('/questionnaire/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`GET /api/formulaires/questionnaire/${id} - Récupération des formulaires par questionnaire`);
    
    // Essayer de récupérer les formulaires avec une requête JOIN améliorée
    let formulairesResult = [];
    try {
      // Requête JOIN complète avec entreprise et fonction
      [formulairesResult] = await pool.query(`
        SELECT f.*, 
               app.nom_application,
               q.fonction,
               q.thematique,
               act.nom_prenom as acteur_nom,
               e.id_entreprise,
               e.nom_entreprise,
               func.nom as nom_fonction
        FROM formulaires f
        LEFT JOIN applications app ON f.id_application = app.id_application
        LEFT JOIN questionnaires q ON f.id_questionnaire = q.id_questionnaire
        LEFT JOIN acteurs act ON f.id_acteur = act.id_acteur
        LEFT JOIN entreprises e ON act.id_entreprise = e.id_entreprise
        LEFT JOIN fonctions func ON q.fonction = func.nom
        WHERE f.id_questionnaire = ?
        ORDER BY f.date_creation DESC
      `, [id]);
    } catch (err) {
      // Si la requête complexe échoue, tenter une requête plus simple
      logger.warn(`Erreur avec la requête JOIN complète pour les formulaires du questionnaire ${id}, tentative de requête simple:`, { error: err });
      [formulairesResult] = await pool.query(`
        SELECT * FROM formulaires 
        WHERE id_questionnaire = ?
        ORDER BY date_creation DESC
      `, [id]);
    }
    
    // Adapter les formulaires pour correspondre au format attendu par le frontend
    const formulaires = formulairesResult.map(form => {
      return {
        id_formulaire: form.id_formulaire,
        titre: form.questionnaire_titre || form.titre || 'Formulaire',
        organisation: form.acteur_nom || form.organisation || 'N/A',
        date_creation: form.date_creation,
        progression: calculateProgression(form),
        statut: form.statut || 'En cours',
        id_questionnaire: form.id_questionnaire,
        id_application: form.id_application,
        id_acteur: form.id_acteur || null,
        commentaires: form.commentaires || '',
        date_modification: form.date_modification || form.date_creation,
        nom_application: form.nom_application || 'Application par défaut',
        fonction: form.fonction || 'Fonction inconnue',
        thematique: form.thematique || 'Non catégorisé',
        acteur_nom: form.acteur_nom || 'Utilisateur inconnu',
        id_entreprise: form.id_entreprise || null,
        nom_entreprise: form.nom_entreprise || 'Entreprise inconnue',
        nom_fonction: form.nom_fonction || form.fonction || 'Fonction inconnue'
      };
    });
    
    res.status(200).json(formulaires);
  } catch (error) {
    logger.error(`Erreur lors de la récupération des formulaires pour le questionnaire ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des formulaires par questionnaire' });
  }
});

// GET formulaire par ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`GET /api/formulaires/${id} - Récupération d'un formulaire spécifique`);
    
    // Essayer de récupérer le formulaire avec une requête JOIN améliorée
    let formulaireResult = [];
    try {
      // Requête JOIN complète avec entreprise et fonction
      [formulaireResult] = await pool.query(`
        SELECT f.*, 
               app.nom_application,
               q.fonction,
               q.thematique,
               act.nom_prenom as acteur_nom,
               e.id_entreprise,
               e.nom_entreprise,
               func.nom as nom_fonction
        FROM formulaires f
        LEFT JOIN applications app ON f.id_application = app.id_application
        LEFT JOIN questionnaires q ON f.id_questionnaire = q.id_questionnaire
        LEFT JOIN acteurs act ON f.id_acteur = act.id_acteur
        LEFT JOIN entreprises e ON act.id_entreprise = e.id_entreprise
        LEFT JOIN fonctions func ON q.fonction = func.nom
        WHERE f.id_formulaire = ?
      `, [id]);
    } catch (err) {
      // Si la requête complexe échoue, tenter une requête plus simple
      logger.warn(`Erreur avec la requête JOIN complète pour le formulaire ${id}, tentative de requête simple:`, { error: err });
      [formulaireResult] = await pool.query(`
        SELECT * FROM formulaires 
        WHERE id_formulaire = ?
      `, [id]);
    }
    
    if (formulaireResult.length === 0) {
      return res.status(404).json({ message: 'Formulaire non trouvé' });
    }
    
    // Adapter le formulaire pour correspondre au format attendu par le frontend
    const form = formulaireResult[0];
    const formulaire = {
      id_formulaire: form.id_formulaire,
      titre: form.questionnaire_titre || form.titre || 'Formulaire',
      organisation: form.acteur_nom || form.organisation || 'N/A',
      date_creation: form.date_creation,
      progression: calculateProgression(form),
      statut: form.statut || 'En cours',
      id_questionnaire: form.id_questionnaire,
      id_application: form.id_application,
      id_acteur: form.id_acteur || null,
      commentaires: form.commentaires || '',
      date_modification: form.date_modification || form.date_creation,
      nom_application: form.nom_application || 'Application par défaut',
      fonction: form.fonction || 'Fonction inconnue',
      thematique: form.thematique || 'Non catégorisé',
      acteur_nom: form.acteur_nom || 'Utilisateur inconnu',
      id_entreprise: form.id_entreprise || null,
      nom_entreprise: form.nom_entreprise || 'Entreprise inconnue',
      nom_fonction: form.nom_fonction || form.fonction || 'Fonction inconnue'
    };
    
    // Essayer de récupérer les réponses associées
    try {
      const [reponses] = await pool.query(`
        SELECT * FROM reponses WHERE id_formulaire = ?
      `, [id]);
      
      formulaire.reponses = reponses;
    } catch (err) {
      logger.warn(`Erreur lors de la récupération des réponses pour le formulaire ${id}:`, { error: err });
      formulaire.reponses = [];
    }
    
    res.status(200).json(formulaire);
  } catch (error) {
    logger.error(`Erreur lors de la récupération du formulaire ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Erreur serveur lors de la récupération du formulaire' });
  }
});

// GET réponses par formulaire
router.get('/:id/reponses', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`GET /api/formulaires/${id}/reponses - Récupération des réponses d'un formulaire spécifique`);
    
    // Vérifier si le formulaire existe
    const [formulaires] = await pool.query('SELECT * FROM formulaires WHERE id_formulaire = ?', [id]);
    
    if (formulaires.length === 0) {
      return res.status(404).json({ message: 'Formulaire non trouvé' });
    }
    
    // Récupérer les réponses associées
    const [reponses] = await pool.query(`
      SELECT * FROM reponses WHERE id_formulaire = ?
    `, [id]);
    
    res.status(200).json(reponses);
  } catch (error) {
    logger.error(`Erreur lors de la récupération des réponses du formulaire ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des réponses' });
  }
});

// POST nouveau formulaire
router.post('/', async (req, res) => {
  try {
    const { 
      id_questionnaire,
      id_application,
      id_acteur,
      statut,
      donnees_contextuelles,
      commentaires,
      metadata // Pour les métadonnées supplémentaires (entreprise, fonction, etc.)
    } = req.body;
    
    logger.debug('POST /api/formulaires - Création d\'un nouveau formulaire', {
      id_questionnaire,
      id_application,
      id_acteur,
      metadata
    });
    
    // Validation: exiger seulement id_questionnaire et id_acteur
    if (!id_questionnaire || !id_acteur) {
      return res.status(400).json({ 
        message: 'Données invalides: id_questionnaire et id_acteur sont requis' 
      });
    }

    // Pour les formulaires sans application, utiliser l'application par défaut
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
          // Fallback: chercher n'importe quelle application
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
    
    // Construire une requête adaptative qui fonctionne avec différentes structures de table
    let insertQuery = `
      INSERT INTO formulaires (
        id_formulaire, id_questionnaire, id_application, id_acteur
    `;
    
    // Ajouter les champs optionnels à la requête s'ils sont fournis
    const insertValues = [id_formulaire, id_questionnaire, applicationId, id_acteur];
    
    if (statut) {
      insertQuery += `, statut`;
      insertValues.push(statut);
    }
    
    // Ajouter les champs liés aux données contextuelles si la structure existe
    try {
      if (donnees_contextuelles) {
        insertQuery += `, donnees_contextuelles`;
        insertValues.push(JSON.stringify(donnees_contextuelles));
      }
    } catch (err) {
      logger.warn('Erreur lors de la sérialisation des données contextuelles:', { error: err });
    }
    
    if (commentaires) {
      insertQuery += `, commentaires`;
      insertValues.push(commentaires);
    }
    
    // Ajouter les champs de date
    insertQuery += `, date_creation, date_modification`;
    insertValues.push(now, now);
    
    // Finaliser la requête
    insertQuery += `) VALUES (` + Array(insertValues.length).fill('?').join(', ') + `)`;
    
    // Exécuter la requête
    await pool.query(insertQuery, insertValues);
    
    // Récupérer le formulaire créé pour la réponse, avec les JOIN pour obtenir les informations complètes
    let createdFormulaire = {};
    try {
      const [createdFormResult] = await pool.query(`
        SELECT f.*, 
               app.nom_application,
               q.fonction,
               q.thematique,
               act.nom_prenom as acteur_nom,
               e.id_entreprise,
               e.nom_entreprise,
               func.nom as nom_fonction
        FROM formulaires f
        LEFT JOIN applications app ON f.id_application = app.id_application
        LEFT JOIN questionnaires q ON f.id_questionnaire = q.id_questionnaire
        LEFT JOIN acteurs act ON f.id_acteur = act.id_acteur
        LEFT JOIN entreprises e ON act.id_entreprise = e.id_entreprise
        LEFT JOIN fonctions func ON q.fonction = func.nom
        WHERE f.id_formulaire = ?
      `, [id_formulaire]);
      
      if (createdFormResult.length > 0) {
        const form = createdFormResult[0];
        createdFormulaire = {
          id_formulaire: form.id_formulaire,
          titre: form.questionnaire_titre || form.titre || 'Nouveau formulaire',
          organisation: form.acteur_nom || form.organisation || 'N/A',
          date_creation: form.date_creation,
          progression: calculateProgression(form),
          statut: form.statut || 'En cours',
          id_questionnaire: form.id_questionnaire,
          id_application: form.id_application,
          id_acteur: form.id_acteur || null,
          commentaires: form.commentaires || '',
          date_modification: form.date_modification || form.date_creation,
          nom_application: form.nom_application || 'Application par défaut',
          fonction: form.fonction || 'Fonction inconnue',
          thematique: form.thematique || 'Non catégorisé',
          acteur_nom: form.acteur_nom || 'Utilisateur inconnu',
          id_entreprise: form.id_entreprise || null,
          nom_entreprise: form.nom_entreprise || 'Entreprise inconnue',
          nom_fonction: form.nom_fonction || form.fonction || 'Fonction inconnue'
        };
      }
    } catch (err) {
      logger.warn('Erreur lors de la récupération du formulaire créé avec les informations complètes:', { error: err });
      
      // Fallback: récupérer uniquement les données du formulaire
      const [basicFormResult] = await pool.query(`
        SELECT * FROM formulaires WHERE id_formulaire = ?
      `, [id_formulaire]);
      
      if (basicFormResult.length > 0) {
        const form = basicFormResult[0];
        createdFormulaire = {
          id_formulaire: form.id_formulaire,
          titre: 'Nouveau formulaire',
          date_creation: form.date_creation,
          progression: calculateProgression(form),
          statut: form.statut || 'En cours',
          id_questionnaire: form.id_questionnaire,
          id_application: form.id_application,
          id_acteur: form.id_acteur || null,
          commentaires: form.commentaires || '',
          date_modification: form.date_modification || form.date_creation
        };
        
        // Utiliser les métadonnées fournies par le frontend, si disponibles
        if (metadata) {
          createdFormulaire.acteur_nom = metadata.acteur_nom || 'Utilisateur inconnu';
          createdFormulaire.fonction = metadata.fonction_nom || 'Fonction inconnue';
          createdFormulaire.nom_entreprise = metadata.entreprise_nom || 'Entreprise inconnue';
          createdFormulaire.thematique = metadata.questionnaire_thematique || 'Non catégorisé';
        }
      }
    }
    
    res.status(201).json(createdFormulaire);
  } catch (error) {
    logger.error('Erreur lors de la création du formulaire:', { error });
    res.status(500).json({ message: 'Erreur serveur lors de la création du formulaire' });
  }
});

// PUT mettre à jour un formulaire
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      statut,
      donnees_contextuelles,
      commentaires,
      progression
    } = req.body;
    
    logger.debug(`PUT /api/formulaires/${id} - Mise à jour d'un formulaire`, { 
      statut, 
      progression,
      body: JSON.stringify(req.body)
    });
    
    // Vérifier si le formulaire existe
    const [formulaires] = await pool.query('SELECT * FROM formulaires WHERE id_formulaire = ?', [id]);
    
    if (formulaires.length === 0) {
      return res.status(404).json({ message: 'Formulaire non trouvé' });
    }
    
    // Construire la requête de mise à jour
    let updateQuery = 'UPDATE formulaires SET date_modification = NOW()';
    const updateParams = [];
    
    if (statut !== undefined) {
      updateQuery += ', statut = ?';
      updateParams.push(statut);
    }
    
    // Ajouter les champs liés aux données contextuelles si la structure existe
    try {
      if (donnees_contextuelles !== undefined) {
        updateQuery += ', donnees_contextuelles = ?';
        updateParams.push(JSON.stringify(donnees_contextuelles));
      }
    } catch (err) {
      logger.warn('Erreur lors de la sérialisation des données contextuelles:', { error: err });
    }
    
    if (commentaires !== undefined) {
      updateQuery += ', commentaires = ?';
      updateParams.push(commentaires);
    }
    
    // Vérifier si la colonne progression existe avant de tenter de la mettre à jour
    try {
      if (progression !== undefined) {
        // Vérifier si la colonne existe dans la table
        const [columns] = await pool.query(`
          SHOW COLUMNS FROM formulaires LIKE 'progression'
        `);
        
        if (columns.length > 0) {
          updateQuery += ', progression = ?';
          updateParams.push(progression);
        } else {
          logger.warn('La colonne progression n\'existe pas dans la table formulaires');
        }
      }
    } catch (err) {
      logger.warn('Erreur lors de la vérification de la colonne progression:', { error: err });
    }
    
    updateQuery += ' WHERE id_formulaire = ?';
    updateParams.push(id);
    
    logger.debug('Requête UPDATE:', { query: updateQuery, params: updateParams });
    
    await pool.query(updateQuery, updateParams);
    
    // Récupérer le formulaire mis à jour de façon simplifiée
    const [updatedFormResult] = await pool.query('SELECT * FROM formulaires WHERE id_formulaire = ?', [id]);
    
    if (updatedFormResult.length === 0) {
      return res.status(404).json({ message: 'Formulaire non trouvé après mise à jour' });
    }
    
    // Adapter le formulaire pour correspondre au format attendu par le frontend
    const form = updatedFormResult[0];
    const formulaire = {
      id_formulaire: form.id_formulaire,
      statut: form.statut || 'Brouillon',
      progression: form.progression !== undefined ? form.progression : calculateProgression(form),
      date_modification: form.date_modification || form.date_creation || new Date().toISOString()
    };
    
    res.status(200).json(formulaire);
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour du formulaire ${req.params.id}:`, { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du formulaire', details: error.message });
  }
});

// DELETE supprimer un formulaire
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`DELETE /api/formulaires/${id} - Suppression d'un formulaire`);
    
    // Vérifier si le formulaire existe
    const [formulaires] = await pool.query('SELECT * FROM formulaires WHERE id_formulaire = ?', [id]);
    
    if (formulaires.length === 0) {
      return res.status(404).json({ message: 'Formulaire non trouvé' });
    }
    
    // Supprimer également les réponses associées
    try {
      await pool.query('DELETE FROM reponses WHERE id_formulaire = ?', [id]);
    } catch (err) {
      logger.warn(`Erreur lors de la suppression des réponses pour le formulaire ${id}:`, { error: err });
    }
    
    // Supprimer le formulaire
    await pool.query('DELETE FROM formulaires WHERE id_formulaire = ?', [id]);
    
    res.status(200).json({ message: 'Formulaire supprimé avec succès' });
  } catch (error) {
    logger.error(`Erreur lors de la suppression du formulaire ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Erreur serveur lors de la suppression du formulaire' });
  }
});

// POST nouvelle réponse
router.post('/reponses', async (req, res) => {
  try {
    const { 
      id_formulaire,
      id_question,
      valeur_reponse,
      score,
      commentaire
    } = req.body;
    
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
    `, [
      id_reponse,
      id_formulaire,
      id_question,
      valeur_reponse,
      score || 0,
      commentaire || null,
      now
    ]);
    
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

// PUT mettre à jour une réponse
router.put('/reponses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      valeur_reponse,
      score,
      commentaire
    } = req.body;
    
    // Vérifier si la réponse existe
    const [reponses] = await pool.query('SELECT * FROM reponses WHERE id_reponse = ?', [id]);
    
    if (reponses.length === 0) {
      return res.status(404).json({ message: 'Réponse non trouvée' });
    }
    
    // Construire la requête de mise à jour
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
    
    // Récupérer la réponse mise à jour
    const [updatedReponses] = await pool.query('SELECT * FROM reponses WHERE id_reponse = ?', [id]);
    
    res.status(200).json(updatedReponses[0]);
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour de la réponse ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de la réponse' });
  }
});

// Cette route déclenchera automatiquement le calcul du score via le trigger SQL
router.put('/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`PUT /api/formulaires/${id}/submit - Soumission d'un formulaire`);
    
    // Vérifier que le formulaire existe
    const [formulaires] = await pool.query('SELECT * FROM formulaires WHERE id_formulaire = ?', [id]);
    
    if (formulaires.length === 0) {
      return res.status(404).json({ message: 'Formulaire non trouvé' });
    }
    
    // Récupérer l'ID de l'application et l'ID de l'entreprise
    const [applicationInfo] = await pool.query(`
      SELECT a.id_application, a.id_entreprise
      FROM formulaires f
      JOIN applications a ON f.id_application = a.id_application
      WHERE f.id_formulaire = ?
    `, [id]);
    
    if (applicationInfo.length === 0) {
      return res.status(404).json({ message: 'Application associée non trouvée' });
    }
    
    const id_application = applicationInfo[0].id_application;
    const id_entreprise = applicationInfo[0].id_entreprise;
    
    // Démarrer une transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Mettre à jour le statut du formulaire à 'Soumis'
      await connection.query('UPDATE formulaires SET statut = ?, date_modification = NOW() WHERE id_formulaire = ?', 
        ['Soumis', id]);
      
      // Le trigger after_formulaire_submit va automatiquement calculer le score
      // Mais nous pouvons aussi le faire explicitement si le trigger n'existe pas
      await connection.query('CALL calculer_scores_maturite(?)', [id_application]);
      
      // Si l'application est associée à une entreprise, calculer le score global de l'entreprise
      if (id_entreprise) {
        await connection.query('CALL calculer_score_entreprise(?)', [id_entreprise]);
      }
      
      // Valider la transaction
      await connection.commit();
      
      // Récupérer les données mises à jour avec les informations complètes
      const [updatedFormResult] = await pool.query(`
        SELECT f.*, 
               app.nom_application,
               q.fonction,
               q.thematique,
               act.nom_prenom as acteur_nom,
               e.id_entreprise,
               e.nom_entreprise,
               func.nom as nom_fonction
        FROM formulaires f
        LEFT JOIN applications app ON f.id_application = app.id_application
        LEFT JOIN questionnaires q ON f.id_questionnaire = q.id_questionnaire
        LEFT JOIN acteurs act ON f.id_acteur = act.id_acteur
        LEFT JOIN entreprises e ON act.id_entreprise = e.id_entreprise
        LEFT JOIN fonctions func ON q.fonction = func.nom
        WHERE f.id_formulaire = ?
      `, [id]);
      
      // Récupérer l'analyse générée la plus récente pour cette application
      const [analyses] = await pool.query(`
        SELECT ma.id_analyse, ma.score_global, ma.date_analyse
        FROM maturity_analyses ma
        WHERE ma.id_application = ?
        ORDER BY ma.date_analyse DESC
        LIMIT 1
      `, [id_application]);
      
      // Préparer la réponse
      const response = {
        formulaire: updatedFormResult.length > 0 ? {
          ...updatedFormResult[0],
          nom_application: updatedFormResult[0].nom_application || 'Application par défaut',
          fonction: updatedFormResult[0].fonction || 'Fonction inconnue',
          thematique: updatedFormResult[0].thematique || 'Non catégorisé',
          acteur_nom: updatedFormResult[0].acteur_nom || 'Utilisateur inconnu',
          nom_entreprise: updatedFormResult[0].nom_entreprise || 'Entreprise inconnue',
          nom_fonction: updatedFormResult[0].nom_fonction || updatedFormResult[0].fonction || 'Fonction inconnue'
        } : null,
        message: 'Formulaire soumis avec succès, scores calculés',
        analyse: analyses.length > 0 ? analyses[0] : null,
      };
      
      res.status(200).json(response);
    } catch (error) {
      // En cas d'erreur, annuler la transaction
      await connection.rollback();
      throw error;
    } finally {
      // Toujours libérer la connexion
      connection.release();
    }
  } catch (error) {
    logger.error(`Erreur lors de la soumission du formulaire ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Erreur serveur lors de la soumission du formulaire' });
  }
});

module.exports = router;