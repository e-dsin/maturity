// server/routes/evaluation-status-route.js - Nouveau endpoint pour gérer le statut des évaluations

const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const { 
  determineEvaluationRedirect, 
  getEvaluationQuery, 
  getProgressQuery 
} = require('../utils/evaluationRedirectLogic');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middlewares/auth-middleware');

// GET /api/evaluation-status/check/:id_acteur - Vérifier le statut d'évaluation d'un utilisateur
router.get('/check/:id_acteur', async (req, res) => {
  try {
    const { id_acteur } = req.params;
    
    console.log('🔍 Vérification statut évaluation pour acteur:', id_acteur);
    
    // 1. Récupérer les invitations avec la requête centralisée
    const { query, params } = getEvaluationQuery(id_acteur);
    const [invitations] = await pool.query(query, params);
    
    console.log('📊 Invitations trouvées:', invitations.length);
    
    if (invitations.length === 0) {
      return res.json({
        hasEvaluation: false,
        status: 'NO_INVITATION',
        message: 'Aucune invitation d\'évaluation trouvée',
        redirectTo: '/dashboard'
      });
    }
    
    // 2. Analyser les invitations pour déterminer le statut
    const activeInvitation = invitations.find(inv => 
      inv.statut_invitation === 'ACCEPTE' && 
      new Date(inv.date_expiration) > new Date()
    ) || invitations[0]; // Prendre la plus récente si aucune acceptée
    
    console.log('📋 Invitation active:', {
      id_invite: activeInvitation.id_invite,
      statut_invitation: activeInvitation.statut_invitation,
      statut_evaluation: activeInvitation.statut_evaluation,
      role: activeInvitation.role,
      nom_role: activeInvitation.nom_role
    });
    
    // 3. Calculer le progrès si nécessaire
    let evaluationProgress = null;
    if (activeInvitation.id_evaluation) {
      const { query: progressQuery, params: progressParams } = getProgressQuery(
        activeInvitation.id_evaluation, 
        id_acteur
      );
      const [progressData] = await pool.query(progressQuery, progressParams);
      
      if (progressData[0]) {
        evaluationProgress = {
          reponses_donnees: progressData[0].reponses_donnees,
          total_questions: progressData[0].total_questions,
          pourcentage_completion: Math.round(
            (progressData[0].reponses_donnees / progressData[0].total_questions) * 100
          )
        };
      }
    }
    
    // ✅ Utiliser la logique centralisée pour déterminer la redirection
    const evaluationStatus = determineEvaluationRedirect(
      activeInvitation, 
      evaluationProgress, 
      id_acteur
    );
    
    console.log('🎯 Statut final:', evaluationStatus.status, '-> Redirection:', evaluationStatus.redirectTo);
    
    res.json(evaluationStatus);
    
  } catch (error) {
    console.error('❌ Erreur vérification statut évaluation:', error);
    logger.error('Erreur lors de la vérification du statut d\'évaluation:', error);
    res.status(500).json({
      hasEvaluation: false,
      status: 'ERROR',
      message: 'Erreur lors de la vérification du statut d\'évaluation',
      redirectTo: '/dashboard'
    });
  }
});

// POST /api/evaluation-status/update-progress - Mettre à jour le progrès d'une évaluation
router.post('/update-progress', authenticateToken, async (req, res) => {
  try {
    const { id_evaluation, responses, currentStep, totalSteps } = req.body;
    const id_acteur = req.user.id_acteur;
    
    console.log('💾 Sauvegarde progrès évaluation:', {
      id_evaluation,
      id_acteur,
      currentStep,
      totalSteps,
      responses: responses?.length || 0
    });
    
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // 1. Sauvegarder les réponses (mise à jour ou insertion)
      if (responses && responses.length > 0) {
        for (const response of responses) {
          await connection.query(`
            INSERT INTO evaluation_responses (
              id_reponse, id_evaluation, id_acteur, id_question, 
              reponse_value, commentaire, date_creation, date_modification
            ) VALUES (UUID(), ?, ?, ?, ?, ?, NOW(), NOW())
            ON DUPLICATE KEY UPDATE
              reponse_value = VALUES(reponse_value),
              commentaire = VALUES(commentaire),
              date_modification = NOW()
          `, [
            id_evaluation,
            id_acteur,
            response.id_question,
            response.reponse_value,
            response.commentaire || null
          ]);
        }
      }
      
      // 2. Mettre à jour le statut de l'évaluation si terminée
      if (currentStep >= totalSteps) {
        await connection.query(`
          UPDATE maturity_evaluations 
          SET statut = 'TERMINE', date_completion = NOW()
          WHERE id_evaluation = ?
        `, [id_evaluation]);
        
        // Mettre à jour le statut de l'invitation
        await connection.query(`
          UPDATE evaluation_invites 
          SET statut = 'TERMINE'
          WHERE id_evaluation = ? AND id_acteur = ?
        `, [id_evaluation, id_acteur]);
      }
      
      await connection.commit();
      
      res.json({
        success: true,
        message: 'Progrès sauvegardé avec succès',
        isCompleted: currentStep >= totalSteps
      });
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('❌ Erreur sauvegarde progrès:', error);
    logger.error('Erreur lors de la sauvegarde du progrès:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la sauvegarde du progrès'
    });
  }
});


// Vérification statut évaluation pour acteur
router.get('/check/:id_acteur', async (req, res) => {
  try {
    const { id_acteur } = req.params;
    
    console.log('🔍 Vérification statut évaluation pour acteur:', id_acteur);
    
    // 1. Récupérer les invitations d'évaluation avec les informations de rôle
    const [invitations] = await pool.query(`
      SELECT 
        ei.id_invite,
        ei.token,
        ei.id_entreprise,
        ei.id_acteur,
        ei.id_evaluation,
        ei.nom_prenom,
        ei.email,
        ei.fonction,
        ei.role,
        ei.statut as statut_invitation,
        ei.date_creation,
        ei.date_expiration,
        e.nom_entreprise,
        me.statut as statut_evaluation,
        me.date_creation as date_creation_evaluation,
        me.date_completion,
        me.score_global,
        a.id_role,
        r.nom_role
      FROM evaluation_invites ei
      LEFT JOIN entreprises e ON ei.id_entreprise = e.id_entreprise
      LEFT JOIN maturity_evaluations me ON ei.id_evaluation = me.id_evaluation
      LEFT JOIN acteurs a ON ei.id_acteur = a.id_acteur
      LEFT JOIN roles r ON a.id_role = r.id_role
      WHERE ei.id_acteur = ?
      ORDER BY ei.date_creation DESC
    `, [id_acteur]);
    
    console.log('📊 Invitations trouvées:', invitations.length);
    
    if (invitations.length === 0) {
      return res.json({
        hasEvaluation: false,
        status: 'NO_INVITATION',
        message: 'Aucune invitation d\'évaluation trouvée',
        redirectTo: '/dashboard'
      });
    }
    
    // 2. Analyser les invitations pour déterminer le statut
    const activeInvitation = invitations.find(inv => 
      inv.statut_invitation === 'ACCEPTE' && 
      new Date(inv.date_expiration) > new Date()
    ) || invitations[0]; // Prendre la plus récente si aucune acceptée
    
    console.log('📋 Invitation active:', {
      id_invite: activeInvitation.id_invite,
      statut_invitation: activeInvitation.statut_invitation,
      statut_evaluation: activeInvitation.statut_evaluation,
      role: activeInvitation.role,
      nom_role: activeInvitation.nom_role
    });
    
    // 3. Calculer le progrès si nécessaire
    let evaluationProgress = null;
    if (activeInvitation.id_evaluation) {
      const [progressData] = await pool.query(`
        SELECT 
          COUNT(DISTINCT er.id_reponse) as reponses_donnees,
          (SELECT COUNT(*) FROM questions WHERE actif = 1) as total_questions
        FROM evaluation_responses er
        WHERE er.id_evaluation = ? AND er.id_acteur = ?
      `, [activeInvitation.id_evaluation, id_acteur]);
      
      if (progressData[0]) {
        evaluationProgress = {
          reponses_donnees: progressData[0].reponses_donnees,
          total_questions: progressData[0].total_questions,
          pourcentage_completion: Math.round(
            (progressData[0].reponses_donnees / progressData[0].total_questions) * 100
          )
        };
      }
    }
    
    // 4. Construire la réponse avec la nouvelle logique de redirection
    const evaluationStatus = {
      hasEvaluation: true,
      invitation: activeInvitation,
      progress: evaluationProgress,
      status: '',
      message: '',
      redirectTo: '/dashboard'
    };
    
    // Logique de redirection basée sur le statut - NOUVELLE VERSION
    if (activeInvitation.statut_invitation === 'EXPIRE') {
      evaluationStatus.status = 'EXPIRED';
      evaluationStatus.message = 'Votre invitation d\'évaluation a expiré';
      evaluationStatus.redirectTo = '/dashboard';
      
    } else if (activeInvitation.statut_invitation === 'ATTENTE') {
      // ✅ En attente : Redirection vers EvaluationInvite.tsx
      evaluationStatus.status = 'PENDING_ACCEPTANCE';
      evaluationStatus.message = 'Vous devez accepter votre invitation d\'évaluation';
      evaluationStatus.redirectTo = `/evaluation-invite/${activeInvitation.token}`;
      
    } else if (activeInvitation.statut_evaluation === 'TERMINE') {
      // ✅ Terminé : Redirection selon le rôle
      const userRole = activeInvitation.nom_role || activeInvitation.role;
      
      evaluationStatus.status = 'COMPLETED';
      evaluationStatus.userRole = userRole;
      
      if (userRole === 'Manager') {
        // Manager → Page Analyses (VueEntreprise) filtrée sur son id_entreprise
        evaluationStatus.message = 'Votre évaluation est terminée - Consultez vos analyses d\'entreprise';
        evaluationStatus.redirectTo = `/analyses-interpretations-entreprises?id_entreprise=${activeInvitation.id_entreprise}`;
      } else if (userRole === 'Intervenant') {
        // Intervenant → Page Formulaires filtrée sur son id_acteur
        evaluationStatus.message = 'Votre évaluation est terminée - Consultez vos formulaires';
        evaluationStatus.redirectTo = `/formulaires?id_acteur=${id_acteur}`;
      } else {
        // Rôle non reconnu → Dashboard par défaut
        evaluationStatus.message = 'Votre évaluation est terminée';
        evaluationStatus.redirectTo = '/dashboard';
      }
      
    } else if (activeInvitation.statut_evaluation === 'EN_COURS' || 
               (evaluationProgress && evaluationProgress.reponses_donnees > 0)) {
      // ✅ En progression : Redirection vers MaturityEvaluation.tsx
      evaluationStatus.status = 'IN_PROGRESS';
      evaluationStatus.message = `Évaluation en cours (${evaluationProgress?.pourcentage_completion || 0}% complétée)`;
      evaluationStatus.redirectTo = `/maturity-evaluation/${activeInvitation.id_entreprise}`;
      evaluationStatus.shouldResume = true;
      
    } else {
      // Prêt à commencer l'évaluation
      evaluationStatus.status = 'READY_TO_START';
      evaluationStatus.message = 'Prêt à commencer l\'évaluation de maturité';
      evaluationStatus.redirectTo = `/maturity-evaluation/${activeInvitation.id_entreprise}`;
      evaluationStatus.shouldResume = false;
    }
    
    console.log('🎯 Statut final:', evaluationStatus.status, '-> Redirection:', evaluationStatus.redirectTo);
    
    res.json(evaluationStatus);
    
  } catch (error) {
    console.error('❌ Erreur vérification statut évaluation:', error);
    logger.error('Erreur lors de la vérification du statut d\'évaluation:', error);
    res.status(500).json({
      hasEvaluation: false,
      status: 'ERROR',
      message: 'Erreur lors de la vérification du statut d\'évaluation',
      redirectTo: '/dashboard'
    });
  }
});

// GET /api/evaluation-status/resume/:id_evaluation/:id_acteur - Récupérer les données d'une évaluation en cours
router.get('/resume/:id_evaluation/:id_acteur', async (req, res) => {
  try {
    const { id_evaluation, id_acteur } = req.params;
    
    console.log('📖 Récupération évaluation en cours:', { id_evaluation, id_acteur });
    
    // 1. Récupérer les réponses existantes
    const [existingResponses] = await pool.query(`
      SELECT 
        er.id_question,
        er.reponse_value,
        er.commentaire,
        er.date_modification,
        q.texte_question,
        q.type_question,
        q.options_reponse
      FROM evaluation_responses er
      JOIN questions q ON er.id_question = q.id_question
      WHERE er.id_evaluation = ? AND er.id_acteur = ?
      ORDER BY q.ordre_affichage
    `, [id_evaluation, id_acteur]);
    
    // 2. Récupérer les informations de l'évaluation
    const [evaluationInfo] = await pool.query(`
      SELECT 
        me.*,
        e.nom_entreprise,
        ei.role,
        ei.fonction
      FROM maturity_evaluations me
      JOIN entreprises e ON me.id_entreprise = e.id_entreprise
      JOIN evaluation_invites ei ON me.id_evaluation = ei.id_evaluation
      WHERE me.id_evaluation = ? AND ei.id_acteur = ?
    `, [id_evaluation, id_acteur]);
    
    if (evaluationInfo.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Évaluation non trouvée'
      });
    }
    
    // 3. Calculer le progrès
    const [totalQuestions] = await pool.query(
      'SELECT COUNT(*) as total FROM questions WHERE actif = 1'
    );
    
    const progressData = {
      reponses_donnees: existingResponses.length,
      total_questions: totalQuestions[0].total,
      pourcentage_completion: Math.round((existingResponses.length / totalQuestions[0].total) * 100)
    };
    
    res.json({
      success: true,
      evaluation: evaluationInfo[0],
      responses: existingResponses,
      progress: progressData,
      canResume: true
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération évaluation:', error);
    logger.error('Erreur lors de la récupération de l\'évaluation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'évaluation'
    });
  }
});

module.exports = router;