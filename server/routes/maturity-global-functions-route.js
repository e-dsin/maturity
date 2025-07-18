// server/routes/maturity-global-functions-route.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { body, validationResult } = require('express-validator');

// ========================================
// GESTION DES FONCTIONS MATURITÉ GLOBALE
// ========================================

// GET /api/maturity-global-functions - Récupérer toutes les fonctions
router.get('/', async (req, res) => {
  try {
    logger.debug('GET /api/maturity-global-functions');
    
    const [fonctions] = await pool.query(`
      SELECT * FROM v_fonctions_maturite_complete
      ORDER BY ordre_affichage
    `);
    
    res.json(fonctions);
    
  } catch (error) {
    logger.error('Erreur lors de la récupération des fonctions:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des fonctions'
    });
  }
});

// GET /api/maturity-global-functions/:id - Récupérer une fonction avec détails
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug('GET /api/maturity-global-functions/:id', { id });
    
    // Récupérer la fonction
    const [fonctions] = await pool.query(`
      SELECT * FROM fonctions_maturite_globale
      WHERE id_fonction = ? AND actif = 1
    `, [id]);
    
    if (fonctions.length === 0) {
      return res.status(404).json({
        message: 'Fonction non trouvée'
      });
    }
    
    const fonction = fonctions[0];
    
    // Récupérer les niveaux
    const [niveaux] = await pool.query(`
      SELECT * FROM niveaux_maturite_globale
      WHERE id_fonction = ? AND actif = 1
      ORDER BY ordre_niveau
    `, [id]);
    
    // Récupérer les recommandations
    const [recommandations] = await pool.query(`
      SELECT r.*, n.nom_niveau
      FROM recommandations_maturite_globale r
      LEFT JOIN niveaux_maturite_globale n ON r.id_niveau = n.id_niveau
      WHERE r.id_fonction = ? AND r.actif = 1
      ORDER BY r.ordre_affichage, r.priorite DESC
    `, [id]);
    
    // Récupérer les questions
    const [questions] = await pool.query(`
      SELECT * FROM questions_maturite_globale
      WHERE id_fonction_globale = ? AND actif = 1
      ORDER BY ordre_affichage
    `, [id]);
    
    const responseData = {
      ...fonction,
      niveaux,
      recommandations,
      questions,
      nb_niveaux: niveaux.length,
      nb_recommandations: recommandations.length,
      nb_questions: questions.length
    };
    
    res.json(responseData);
    
  } catch (error) {
    logger.error('Erreur lors de la récupération de la fonction:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération de la fonction'
    });
  }
});

// POST /api/maturity-global-functions - Créer une nouvelle fonction
router.post('/', [
  body('nom').trim().isLength({ min: 3, max: 100 }).withMessage('Le nom doit contenir entre 3 et 100 caractères'),
  body('code_fonction').trim().isLength({ min: 3, max: 50 }).withMessage('Le code fonction doit contenir entre 3 et 50 caractères'),
  body('description').optional().isLength({ max: 1000 }).withMessage('La description ne peut pas dépasser 1000 caractères'),
  body('poids').optional().isFloat({ min: 0.1, max: 5.0 }).withMessage('Le poids doit être entre 0.1 et 5.0'),
  body('ordre_affichage').isInt({ min: 1 }).withMessage('L\'ordre d\'affichage doit être un entier positif')
], async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await connection.rollback();
      return res.status(400).json({
        message: 'Données de validation invalides',
        errors: errors.array()
      });
    }
    
    const { nom, description, code_fonction, poids = 1.0, ordre_affichage, couleur = '#2196F3', icone = 'TrendingUp' } = req.body;
    const id_fonction = uuidv4();
    
    // Vérifier l'unicité du code fonction
    const [existing] = await connection.query(
      'SELECT id_fonction FROM fonctions_maturite_globale WHERE code_fonction = ?',
      [code_fonction]
    );
    
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        message: 'Ce code fonction existe déjà'
      });
    }
    
    // Insérer la fonction
    await connection.query(`
      INSERT INTO fonctions_maturite_globale (
        id_fonction, nom, description, code_fonction, 
        poids, ordre_affichage, couleur, icone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id_fonction, nom, description, code_fonction, poids, ordre_affichage, couleur, icone]);
    
    // Créer les niveaux par défaut
    const niveauxDefaut = [
      { nom: 'Initial', description: 'Processus ad-hoc et imprévisibles', score_min: 0.0, score_max: 1.0, ordre: 1, couleur: '#F44336' },
      { nom: 'Défini', description: 'Processus caractérisés et documentés', score_min: 1.01, score_max: 2.0, ordre: 2, couleur: '#FF9800' },
      { nom: 'Mesuré', description: 'Processus standardisés et mesurés', score_min: 2.01, score_max: 3.0, ordre: 3, couleur: '#FFC107' },
      { nom: 'Géré', description: 'Processus contrôlés et prévisibles', score_min: 3.01, score_max: 4.0, ordre: 4, couleur: '#4CAF50' },
      { nom: 'Optimisé', description: 'Processus en amélioration continue', score_min: 4.01, score_max: 5.0, ordre: 5, couleur: '#2196F3' }
    ];
    
    for (const niveau of niveauxDefaut) {
      const id_niveau = uuidv4();
      await connection.query(`
        INSERT INTO niveaux_maturite_globale (
          id_niveau, id_fonction, nom_niveau, description,
          score_min, score_max, ordre_niveau, couleur
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [id_niveau, id_fonction, niveau.nom, niveau.description, niveau.score_min, niveau.score_max, niveau.ordre, niveau.couleur]);
    }
    
    await connection.commit();
    
    logger.info('Fonction créée:', { id_fonction, nom, code_fonction });
    
    res.status(201).json({
      message: 'Fonction créée avec succès',
      id_fonction,
      nom,
      code_fonction
    });
    
  } catch (error) {
    await connection.rollback();
    logger.error('Erreur lors de la création de la fonction:', error);
    res.status(500).json({
      message: 'Erreur lors de la création de la fonction'
    });
  } finally {
    connection.release();
  }
});

// PUT /api/maturity-global-functions/:id - Mettre à jour une fonction
router.put('/:id', [
  body('nom').trim().isLength({ min: 3, max: 100 }).withMessage('Le nom doit contenir entre 3 et 100 caractères'),
  body('description').optional().isLength({ max: 1000 }).withMessage('La description ne peut pas dépasser 1000 caractères'),
  body('poids').optional().isFloat({ min: 0.1, max: 5.0 }).withMessage('Le poids doit être entre 0.1 et 5.0'),
  body('ordre_affichage').isInt({ min: 1 }).withMessage('L\'ordre d\'affichage doit être un entier positif')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données de validation invalides',
        errors: errors.array()
      });
    }
    
    const { id } = req.params;
    const { nom, description, poids, ordre_affichage, couleur, icone } = req.body;
    
    const [result] = await pool.query(`
      UPDATE fonctions_maturite_globale 
      SET nom = ?, description = ?, poids = ?, ordre_affichage = ?, couleur = ?, icone = ?
      WHERE id_fonction = ? AND actif = 1
    `, [nom, description, poids, ordre_affichage, couleur, icone, id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: 'Fonction non trouvée'
      });
    }
    
    logger.info('Fonction mise à jour:', { id_fonction: id, nom });
    
    res.json({
      message: 'Fonction mise à jour avec succès'
    });
    
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de la fonction:', error);
    res.status(500).json({
      message: 'Erreur lors de la mise à jour de la fonction'
    });
  }
});

// DELETE /api/maturity-global-functions/:id - Supprimer une fonction
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await pool.query(`
      UPDATE fonctions_maturite_globale 
      SET actif = 0
      WHERE id_fonction = ?
    `, [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: 'Fonction non trouvée'
      });
    }
    
    logger.info('Fonction supprimée:', { id_fonction: id });
    
    res.json({
      message: 'Fonction supprimée avec succès'
    });
    
  } catch (error) {
    logger.error('Erreur lors de la suppression de la fonction:', error);
    res.status(500).json({
      message: 'Erreur lors de la suppression de la fonction'
    });
  }
});

// ========================================
// GESTION DES NIVEAUX DE MATURITÉ
// ========================================

// GET /api/maturity-global-functions/:id/niveaux - Récupérer les niveaux d'une fonction
router.get('/:id/niveaux', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [niveaux] = await pool.query(`
      SELECT * FROM niveaux_maturite_globale
      WHERE id_fonction = ? AND actif = 1
      ORDER BY ordre_niveau
    `, [id]);
    
    res.json(niveaux);
    
  } catch (error) {
    logger.error('Erreur lors de la récupération des niveaux:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des niveaux'
    });
  }
});

// POST /api/maturity-global-functions/:id/niveaux - Créer un nouveau niveau
router.post('/:id/niveaux', [
  body('nom_niveau').trim().isLength({ min: 3, max: 100 }).withMessage('Le nom du niveau doit contenir entre 3 et 100 caractères'),
  body('description').optional().isLength({ max: 1000 }).withMessage('La description ne peut pas dépasser 1000 caractères'),
  body('score_min').isFloat({ min: 0, max: 5 }).withMessage('Le score minimum doit être entre 0 et 5'),
  body('score_max').isFloat({ min: 0, max: 5 }).withMessage('Le score maximum doit être entre 0 et 5'),
  body('ordre_niveau').isInt({ min: 1 }).withMessage('L\'ordre du niveau doit être un entier positif')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données de validation invalides',
        errors: errors.array()
      });
    }
    
    const { id } = req.params;
    const { nom_niveau, description, score_min, score_max, ordre_niveau, couleur = '#4CAF50' } = req.body;
    
    if (score_min >= score_max) {
      return res.status(400).json({
        message: 'Le score minimum doit être inférieur au score maximum'
      });
    }
    
    const id_niveau = uuidv4();
    
    await pool.query(`
      INSERT INTO niveaux_maturite_globale (
        id_niveau, id_fonction, nom_niveau, description,
        score_min, score_max, ordre_niveau, couleur
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id_niveau, id, nom_niveau, description, score_min, score_max, ordre_niveau, couleur]);
    
    logger.info('Niveau créé:', { id_niveau, nom_niveau });
    
    res.status(201).json({
      message: 'Niveau créé avec succès',
      id_niveau,
      nom_niveau
    });
    
  } catch (error) {
    logger.error('Erreur lors de la création du niveau:', error);
    res.status(500).json({
      message: 'Erreur lors de la création du niveau'
    });
  }
});

// PUT /api/maturity-global-functions/niveaux/:id - Mettre à jour un niveau
router.put('/niveaux/:id', [
  body('nom_niveau').trim().isLength({ min: 3, max: 100 }).withMessage('Le nom du niveau doit contenir entre 3 et 100 caractères'),
  body('description').optional().isLength({ max: 1000 }).withMessage('La description ne peut pas dépasser 1000 caractères'),
  body('score_min').isFloat({ min: 0, max: 5 }).withMessage('Le score minimum doit être entre 0 et 5'),
  body('score_max').isFloat({ min: 0, max: 5 }).withMessage('Le score maximum doit être entre 0 et 5'),
  body('ordre_niveau').isInt({ min: 1 }).withMessage('L\'ordre du niveau doit être un entier positif')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données de validation invalides',
        errors: errors.array()
      });
    }
    
    const { id } = req.params;
    const { nom_niveau, description, score_min, score_max, ordre_niveau, couleur } = req.body;
    
    if (score_min >= score_max) {
      return res.status(400).json({
        message: 'Le score minimum doit être inférieur au score maximum'
      });
    }
    
    const [result] = await pool.query(`
      UPDATE niveaux_maturite_globale 
      SET nom_niveau = ?, description = ?, score_min = ?, score_max = ?, 
          ordre_niveau = ?, couleur = ?
      WHERE id_niveau = ? AND actif = 1
    `, [nom_niveau, description, score_min, score_max, ordre_niveau, couleur, id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: 'Niveau non trouvé'
      });
    }
    
    logger.info('Niveau mis à jour:', { id_niveau: id, nom_niveau });
    
    res.json({
      message: 'Niveau mis à jour avec succès'
    });
    
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du niveau:', error);
    res.status(500).json({
      message: 'Erreur lors de la mise à jour du niveau'
    });
  }
});

// DELETE /api/maturity-global-functions/niveaux/:id - Supprimer un niveau
router.delete('/niveaux/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await pool.query(`
      UPDATE niveaux_maturite_globale 
      SET actif = 0
      WHERE id_niveau = ?
    `, [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: 'Niveau non trouvé'
      });
    }
    
    logger.info('Niveau supprimé:', { id_niveau: id });
    
    res.json({
      message: 'Niveau supprimé avec succès'
    });
    
  } catch (error) {
    logger.error('Erreur lors de la suppression du niveau:', error);
    res.status(500).json({
      message: 'Erreur lors de la suppression du niveau'
    });
  }
});

// ========================================
// GESTION DES RECOMMANDATIONS
// ========================================

// GET /api/maturity-global-functions/:id/recommandations - Récupérer les recommandations d'une fonction
router.get('/:id/recommandations', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [recommandations] = await pool.query(`
      SELECT r.*, n.nom_niveau
      FROM recommandations_maturite_globale r
      LEFT JOIN niveaux_maturite_globale n ON r.id_niveau = n.id_niveau
      WHERE r.id_fonction = ? AND r.actif = 1
      ORDER BY r.ordre_affichage, r.priorite DESC
    `, [id]);
    
    res.json(recommandations);
    
  } catch (error) {
    logger.error('Erreur lors de la récupération des recommandations:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des recommandations'
    });
  }
});

// POST /api/maturity-global-functions/:id/recommandations - Créer une nouvelle recommandation
router.post('/:id/recommandations', [
  body('titre').trim().isLength({ min: 3, max: 200 }).withMessage('Le titre doit contenir entre 3 et 200 caractères'),
  body('description').trim().isLength({ min: 10, max: 2000 }).withMessage('La description doit contenir entre 10 et 2000 caractères'),
  body('priorite').isIn(['FAIBLE', 'MOYENNE', 'HAUTE', 'CRITIQUE']).withMessage('Priorité invalide'),
  body('type_recommandation').isIn(['IMMEDIATE', 'COURT_TERME', 'MOYEN_TERME', 'LONG_TERME']).withMessage('Type de recommandation invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données de validation invalides',
        errors: errors.array()
      });
    }
    
    const { id } = req.params;
    const { 
      titre, description, actions_recommandees = [], priorite, 
      type_recommandation, id_niveau = null, score_min = null, 
      score_max = null, ordre_affichage = 0 
    } = req.body;
    
    const id_recommandation = uuidv4();
    
    await pool.query(`
      INSERT INTO recommandations_maturite_globale (
        id_recommandation, id_fonction, id_niveau, titre, description,
        actions_recommandees, priorite, type_recommandation,
        score_min, score_max, ordre_affichage
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id_recommandation, id, id_niveau, titre, description,
      JSON.stringify(actions_recommandees), priorite, type_recommandation,
      score_min, score_max, ordre_affichage
    ]);
    
    logger.info('Recommandation créée:', { id_recommandation, titre });
    
    res.status(201).json({
      message: 'Recommandation créée avec succès',
      id_recommandation,
      titre
    });
    
  } catch (error) {
    logger.error('Erreur lors de la création de la recommandation:', error);
    res.status(500).json({
      message: 'Erreur lors de la création de la recommandation'
    });
  }
});

// PUT /api/maturity-global-functions/recommandations/:id - Mettre à jour une recommandation
router.put('/recommandations/:id', [
  body('titre').trim().isLength({ min: 3, max: 200 }).withMessage('Le titre doit contenir entre 3 et 200 caractères'),
  body('description').trim().isLength({ min: 10, max: 2000 }).withMessage('La description doit contenir entre 10 et 2000 caractères'),
  body('priorite').isIn(['FAIBLE', 'MOYENNE', 'HAUTE', 'CRITIQUE']).withMessage('Priorité invalide'),
  body('type_recommandation').isIn(['IMMEDIATE', 'COURT_TERME', 'MOYEN_TERME', 'LONG_TERME']).withMessage('Type de recommandation invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données de validation invalides',
        errors: errors.array()
      });
    }
    
    const { id } = req.params;
    const { 
      titre, description, actions_recommandees, priorite, 
      type_recommandation, id_niveau, score_min, 
      score_max, ordre_affichage 
    } = req.body;
    
    const [result] = await pool.query(`
      UPDATE recommandations_maturite_globale 
      SET titre = ?, description = ?, actions_recommandees = ?, priorite = ?,
          type_recommandation = ?, id_niveau = ?, score_min = ?, score_max = ?,
          ordre_affichage = ?
      WHERE id_recommandation = ? AND actif = 1
    `, [
      titre, description, JSON.stringify(actions_recommandees), priorite,
      type_recommandation, id_niveau, score_min, score_max,
      ordre_affichage, id
    ]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: 'Recommandation non trouvée'
      });
    }
    
    logger.info('Recommandation mise à jour:', { id_recommandation: id, titre });
    
    res.json({
      message: 'Recommandation mise à jour avec succès'
    });
    
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de la recommandation:', error);
    res.status(500).json({
      message: 'Erreur lors de la mise à jour de la recommandation'
    });
  }
});

// DELETE /api/maturity-global-functions/recommandations/:id - Supprimer une recommandation
router.delete('/recommandations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await pool.query(`
      UPDATE recommandations_maturite_globale 
      SET actif = 0
      WHERE id_recommandation = ?
    `, [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: 'Recommandation non trouvée'
      });
    }
    
    logger.info('Recommandation supprimée:', { id_recommandation: id });
    
    res.json({
      message: 'Recommandation supprimée avec succès'
    });
    
  } catch (error) {
    logger.error('Erreur lors de la suppression de la recommandation:', error);
    res.status(500).json({
      message: 'Erreur lors de la suppression de la recommandation'
    });
  }
});

// ========================================
// UTILITAIRES ET STATISTIQUES
// ========================================

// GET /api/maturity-global-functions/statistics - Statistiques générales
router.get('/statistics', async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(DISTINCT f.id_fonction) as nb_fonctions_actives,
        COUNT(DISTINCT n.id_niveau) as nb_niveaux_total,
        COUNT(DISTINCT r.id_recommandation) as nb_recommandations_total,
        COUNT(DISTINCT q.id_question) as nb_questions_total,
        AVG(f.poids) as poids_moyen
      FROM fonctions_maturite_globale f
      LEFT JOIN niveaux_maturite_globale n ON f.id_fonction = n.id_fonction AND n.actif = 1
      LEFT JOIN recommandations_maturite_globale r ON f.id_fonction = r.id_fonction AND r.actif = 1
      LEFT JOIN questions_maturite_globale q ON f.id_fonction = q.id_fonction_globale AND q.actif = 1
      WHERE f.actif = 1
    `);
    
    res.json(stats[0]);
    
  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
});

// GET /api/maturity-global-functions/:id/score-niveau/:score - Déterminer le niveau pour un score
router.get('/:id/score-niveau/:score', async (req, res) => {
  try {
    const { id, score } = req.params;
    const scoreFloat = parseFloat(score);
    
    if (isNaN(scoreFloat) || scoreFloat < 0 || scoreFloat > 5) {
      return res.status(400).json({
        message: 'Score invalide (doit être entre 0 et 5)'
      });
    }
    
    const [niveaux] = await pool.query(`
      SELECT * FROM niveaux_maturite_globale
      WHERE id_fonction = ? AND actif = 1
        AND ? >= score_min AND ? <= score_max
      ORDER BY ordre_niveau
      LIMIT 1
    `, [id, scoreFloat, scoreFloat]);
    
    if (niveaux.length === 0) {
      return res.status(404).json({
        message: 'Aucun niveau trouvé pour ce score'
      });
    }
    
    // Récupérer les recommandations pour ce niveau
    const [recommandations] = await pool.query(`
      SELECT * FROM recommandations_maturite_globale
      WHERE id_fonction = ? AND id_niveau = ? AND actif = 1
      ORDER BY priorite DESC, ordre_affichage
    `, [id, niveaux[0].id_niveau]);
    
    res.json({
      niveau: niveaux[0],
      recommandations,
      score: scoreFloat
    });
    
  } catch (error) {
    logger.error('Erreur lors de la détermination du niveau:', error);
    res.status(500).json({
      message: 'Erreur lors de la détermination du niveau'
    });
  }
});

module.exports = router;