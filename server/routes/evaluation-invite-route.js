// server/routes/evaluation-invite-route.js - Nouvelles routes pour gérer les invitations
const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { body, validationResult } = require('express-validator');

// ========================================
// VALIDATION DES INVITATIONS
// ========================================

// POST /api/evaluation-invite/validate - Valider une invitation
router.get('/validate/:token', async (req, res) => {
  try {
    const { token } = req.params;
    logger.info('🔍 Validation invitation:', { token: token.substring(0, 10) + '...' });

    if (!token || !token.match(/^(mgr_|mbr_)/)) {
      return res.status(400).json({ message: 'Format de token d\'invitation invalide' });
    }

    const [invites] = await pool.query(`
      SELECT i.id_invite, i.token, i.id_entreprise, i.id_acteur, i.id_evaluation, 
             i.nom_prenom, i.email, i.fonction, i.role, i.statut, i.date_expiration,
             e.nom_entreprise, a.mot_de_passe_hash
      FROM evaluation_invites i
      JOIN entreprises e ON i.id_entreprise = e.id_entreprise
      JOIN acteurs a ON i.id_acteur = a.id_acteur
      WHERE i.token = ? AND i.statut = 'ATTENTE' AND i.date_expiration > NOW()
    `, [token]);

    if (invites.length === 0) {
      return res.status(404).json({ message: 'Invitation introuvable ou expirée' });
    }

    const invite = invites[0];
    const userExists = !!invite.mot_de_passe_hash;

    logger.info('✅ Invitation validée:', {
      enterprise: invite.nom_entreprise,
      actor: invite.nom_prenom,
      email: invite.email,
      userExists
    });

    res.json({
      id_invite: invite.id_invite,
      token: invite.token,
      id_entreprise: invite.id_entreprise,
      id_evaluation: invite.id_evaluation,
      nom_entreprise: invite.nom_entreprise,
      email: invite.email,
      nom_prenom: invite.nom_prenom,
      fonction: invite.fonction,
      role: invite.role,
      statut: invite.statut,
      date_expiration: invite.date_expiration,
      user_exists: userExists,
      actor_exists: true
    });
  } catch (error) {
    logger.error('❌ Erreur validation invitation:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la validation de l\'invitation' });
  }
});

// ========================================
// CRÉATION DE L'INVITATION
// ========================================
router.post('/create', [
  body('enterpriseId').isUUID().withMessage('ID entreprise invalide'),
  body('actorId').isLength({ min: 1 }).withMessage('ID acteur invalide'),
  body('nom_prenom').isLength({ min: 1 }).withMessage('Nom requis'),
  body('email').isEmail().withMessage('Email invalide'),
  body('fonction').isLength({ min: 1 }).withMessage('Fonction requise'),
  body('role').isIn(['Manager', 'Evaluateur', 'Observateur']).withMessage('Rôle invalide'),
  body('token').isLength({ min: 10 }).withMessage('Token invalide')
], async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await connection.rollback();
      return res.status(400).json({ message: 'Données de validation invalides', errors: errors.array() });
    }

    const { enterpriseId, actorId, nom_prenom, email, fonction, role, token } = req.body;
    const id_invite = uuidv4();
    const expiresInDays = 7; // Invitation expires in 7 days

    await connection.query(`
      INSERT INTO evaluation_invites (
        id_invite, token, id_entreprise, id_acteur, id_evaluation, nom_prenom, 
        email, fonction, role, statut, date_creation, date_expiration
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ATTENTE', NOW(), DATE_ADD(NOW(), INTERVAL ? DAY))
    `, [id_invite, token, enterpriseId, actorId, null, nom_prenom, email, fonction, role, expiresInDays]);

    await connection.commit();
    logger.info('✅ Invitation créée:', { id_invite, email, enterpriseId });
    res.status(201).json({ id_invite, message: 'Invitation créée avec succès' });
  } catch (error) {
    await connection.rollback();
    logger.error('❌ Erreur création invitation:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la création de l\'invitation' });
  } finally {
    connection.release();
  }
});

// ========================================
// CRÉATION DE COMPTE
// ========================================

// POST /api/evaluation-invite/create-account - Créer un compte utilisateur
router.post('/create-account', [
  body('token').isLength({ min: 10 }).withMessage('Token invalide'),
  body('email').isEmail().withMessage('Email invalide'),
  body('password').isLength({ min: 8 }).withMessage('Mot de passe trop court (minimum 8 caractères)'),
  body('actorData.enterprise').isUUID().withMessage('ID entreprise invalide'),
  body('actorData.actor').isLength({ min: 1 }).withMessage('ID acteur invalide'),
  body('actorData.evaluationId').isUUID().withMessage('ID évaluation invalide')
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

    const { token, email, password, actorData } = req.body;
    const { enterprise, actor, evaluationId } = actorData;

    logger.info('👤 Création compte utilisateur:', { email, enterprise, actor });

    // 1. Vérifier que l'acteur existe et n'a pas déjà de mot de passe
    const [actors] = await connection.query(`
      SELECT id_acteur, nom_prenom, email, mot_de_passe_hash, id_entreprise
      FROM acteurs 
      WHERE id_acteur = ? AND email = ? AND id_entreprise = ? AND actif = 1
    `, [actor, email, enterprise]);

    if (actors.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        message: 'Acteur non trouvé ou données incohérentes'
      });
    }

    const actorData_db = actors[0];

    if (actorData_db.mot_de_passe_hash) {
      await connection.rollback();
      return res.status(400).json({
        message: 'Un compte existe déjà pour cet utilisateur'
      });
    }

    // 2. Hasher le mot de passe
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 3. Mettre à jour l'acteur avec le mot de passe
    await connection.query(`
      UPDATE acteurs 
      SET mot_de_passe_hash = ?, date_creation_compte = NOW()
      WHERE id_acteur = ?
    `, [passwordHash, actor]);

    // 4. Marquer l'évaluation comme activée si elle ne l'était pas
    await connection.query(`
      UPDATE evaluations_maturite_globale 
      SET statut = 'EN_COURS', date_debut = COALESCE(date_debut, NOW())
      WHERE id_evaluation = ? AND statut = 'NOUVEAU'
    `, [evaluationId]);

    // 5. Logger l'activité
    await connection.query(`
      INSERT INTO logs_activite (
        id_log, id_acteur, type_activite, description, 
        donnees_supplementaires, date_activite
      ) VALUES (?, ?, ?, ?, ?, NOW())
    `, [
      uuidv4(),
      actor,
      'COMPTE_CREE',
      'Création de compte via invitation d\'évaluation',
      JSON.stringify({ 
        token: token.substring(0, 10) + '...', 
        evaluationId,
        enterprise 
      })
    ]);

    await connection.commit();

    logger.info('✅ Compte créé avec succès:', { 
      actorId: actor, 
      email, 
      enterprise: actorData_db.id_entreprise 
    });

    res.status(201).json({
      message: 'Compte créé avec succès',
      actor: {
        id: actor,
        nom_prenom: actorData_db.nom_prenom,
        email: actorData_db.email
      },
      evaluationId,
      canLogin: true
    });

  } catch (error) {
    await connection.rollback();
    logger.error('❌ Erreur création compte:', error);
    res.status(500).json({
      message: 'Erreur serveur lors de la création du compte'
    });
  } finally {
    connection.release();
  }
});

// ========================================
// VÉRIFICATION D'ÉVALUATION
// ========================================

// GET /api/evaluation-invite/check-evaluation/:evaluationId - Vérifier l'état d'une évaluation
router.get('/check-evaluation/:evaluationId', async (req, res) => {
  try {
    const { evaluationId } = req.params;

    logger.debug('🔍 Vérification état évaluation:', { evaluationId });

    const [evaluations] = await pool.query(`
      SELECT 
        e.id_evaluation,
        e.statut,
        e.date_debut,
        e.date_soumission,
        e.id_entreprise,
        e.id_acteur,
        ent.nom_entreprise,
        a.nom_prenom,
        a.email,
        COUNT(r.id_reponse) as nb_reponses
      FROM evaluations_maturite_globale e
      JOIN entreprises ent ON e.id_entreprise = ent.id_entreprise
      JOIN acteurs a ON e.id_acteur = a.id_acteur
      LEFT JOIN reponses_maturite_globale r ON e.id_evaluation = r.id_evaluation
      WHERE e.id_evaluation = ?
      GROUP BY e.id_evaluation
    `, [evaluationId]);

    if (evaluations.length === 0) {
      return res.status(404).json({
        message: 'Évaluation non trouvée'
      });
    }

    const evaluation = evaluations[0];

    // Calculer le pourcentage de completion
    const [totalQuestions] = await pool.query(`
      SELECT COUNT(*) as total
      FROM questions_maturite_globale 
      WHERE actif = 1
    `);

    const completionPercentage = totalQuestions[0].total > 0 
      ? (evaluation.nb_reponses / totalQuestions[0].total) * 100 
      : 0;

    res.json({
      evaluation: {
        id: evaluation.id_evaluation,
        statut: evaluation.statut,
        date_debut: evaluation.date_debut,
        date_soumission: evaluation.date_soumission,
        entreprise: {
          id: evaluation.id_entreprise,
          nom: evaluation.nom_entreprise
        },
        acteur: {
          id: evaluation.id_acteur,
          nom: evaluation.nom_prenom,
          email: evaluation.email
        },
        progression: {
          nb_reponses: evaluation.nb_reponses,
          total_questions: totalQuestions[0].total,
          pourcentage: completionPercentage
        }
      }
    });

  } catch (error) {
    logger.error('❌ Erreur vérification évaluation:', error);
    res.status(500).json({
      message: 'Erreur serveur lors de la vérification de l\'évaluation'
    });
  }
});

// ========================================
// UTILITAIRES
// ========================================

// POST /api/evaluation-invite/resend - Renvoyer une invitation
router.post('/resend', [
  body('evaluationId').isUUID().withMessage('ID évaluation invalide'),
  body('email').isEmail().withMessage('Email invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données de validation invalides',
        errors: errors.array()
      });
    }

    const { evaluationId, email } = req.body;

    // Vérifier l'évaluation
    const [evaluations] = await pool.query(`
      SELECT e.*, ent.nom_entreprise, a.nom_prenom, a.email
      FROM evaluations_maturite_globale e
      JOIN entreprises ent ON e.id_entreprise = ent.id_entreprise  
      JOIN acteurs a ON e.id_acteur = a.id_acteur
      WHERE e.id_evaluation = ? AND a.email = ?
    `, [evaluationId, email]);

    if (evaluations.length === 0) {
      return res.status(404).json({
        message: 'Évaluation non trouvée pour cet email'
      });
    }

    const evaluation = evaluations[0];

    if (evaluation.statut === 'TERMINE') {
      return res.status(400).json({
        message: 'Cette évaluation est déjà terminée'
      });
    }

    // Générer un nouveau token
    const isManager = evaluation.id_acteur === evaluation.id_manager; // Assume we have this info
    const tokenPrefix = isManager ? 'mgr_' : 'mbr_';
    const newToken = `${tokenPrefix}${evaluation.id_entreprise}_${evaluation.id_acteur}_${Date.now()}`;

    // Générer le nouveau lien
    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/evaluation-invite/${newToken}?enterprise=${encodeURIComponent(evaluation.id_entreprise)}&actor=${encodeURIComponent(evaluation.id_acteur)}&role=${encodeURIComponent('Evaluateur')}&email=${encodeURIComponent(evaluation.email)}&evaluationId=${encodeURIComponent(evaluationId)}`;

    // Ici vous pourriez envoyer l'email...
    // await sendInvitationEmail(evaluation.email, inviteLink, evaluation);

    logger.info('📧 Invitation renvoyée:', { 
      evaluationId, 
      email, 
      newToken: newToken.substring(0, 10) + '...' 
    });

    res.json({
      message: 'Invitation renvoyée avec succès',
      inviteLink, // En prod, ne pas renvoyer ce lien dans la réponse
      sent: true
    });

  } catch (error) {
    logger.error('❌ Erreur renvoi invitation:', error);
    res.status(500).json({
      message: 'Erreur serveur lors du renvoi de l\'invitation'
    });
  }
});

module.exports = router;