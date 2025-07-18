// server/utils/evaluationRedirectLogic.js
// Utilitaire centralisé pour la logique de redirection selon le statut d'évaluation

/**
 * Détermine le niveau d'accès et les permissions selon le rôle de l'utilisateur
 * Compatible avec le middleware d'authentification existant
 * @param {string} userRole - Rôle de l'utilisateur (nom_role)
 * @param {Object} user - Objet utilisateur complet (optionnel)
 * @returns {Object} Niveau d'accès et permissions
 */
const determineAccessLevel = (userRole, user = null) => {
  const role = userRole ? userRole.toUpperCase() : '';
  
  // 🌐 Rôles avec vue globale sur toutes les entreprises (compatibilité avec auth-middleware existant)
  if (['CONSULTANT', 'ADMINISTRATEUR', 'SUPER_ADMINISTRATEUR'].includes(role)) {
    return {
      level: 'GLOBAL',
      scope: 'GLOBAL', // Compatible avec le middleware existant
      canViewAllEnterprises: true,
      canViewAllEvaluations: true,
      canViewAllFormulaires: true,
      defaultRedirectPath: '/analyses-interpretations',
      hasGlobalAccess: true // Compatible avec user.hasGlobalAccess
    };
  }
  
  // 🏢 Manager : Tout pour son entreprise seulement
  if (role === 'MANAGER') {
    return {
      level: 'ENTREPRISE',
      scope: 'ENTREPRISE', // Compatible avec le middleware existant
      canViewAllEnterprises: false,
      canViewAllEvaluations: false,
      canViewAllFormulaires: false,
      canViewEnterpriseData: true,
      defaultRedirectPath: '/analyses-interpretations-entreprises',
      hasGlobalAccess: false
    };
  }
  
  // 👤 Intervenant : Seulement ses évaluations de maturité et formulaires
  if (role === 'INTERVENANT') {
    return {
      level: 'PERSONNEL',
      scope: 'ENTREPRISE', // Utilise le scope entreprise mais avec des restrictions supplémentaires
      canViewAllEnterprises: false,
      canViewAllEvaluations: false,
      canViewAllFormulaires: false,
      canViewOwnData: true,
      defaultRedirectPath: '/formulaires',
      hasGlobalAccess: false
    };
  }
  
  // Rôle non reconnu
  return {
    level: 'LIMITED',
    scope: 'ENTREPRISE',
    canViewAllEnterprises: false,
    canViewAllEvaluations: false,
    canViewAllFormulaires: false,
    defaultRedirectPath: '/dashboard',
    hasGlobalAccess: false
  };
};

const logger = require('./logger');

/**
 * Détermine la redirection appropriée selon le statut d'évaluation et le rôle de l'utilisateur
 * Compatible avec le middleware d'authentification existant
 * @param {Object} invitation - Données de l'invitation d'évaluation
 * @param {Object} progress - Progrès de l'évaluation (optionnel)
 * @param {string} userId - ID de l'utilisateur (pour les formulaires)
 * @param {Object} user - Objet utilisateur complet (optionnel)
 * @returns {Object} Objet contenant le statut et la redirection
 */
const determineEvaluationRedirect = (invitation, progress = null, userId = null, user = null) => {
  const evaluationStatus = {
    hasEvaluation: true,
    invitation: invitation,
    progress: progress,
    status: '',
    message: '',
    redirectTo: '/dashboard',
    userRole: invitation.nom_role || invitation.role
  };

  try {
    // 1. ✅ STATUT "EXPIRE"
    if (invitation.statut_invitation === 'EXPIRE') {
      evaluationStatus.status = 'EXPIRED';
      evaluationStatus.message = 'Votre invitation d\'évaluation a expiré';
      evaluationStatus.redirectTo = '/dashboard';
      
    // 2. ✅ STATUT "EN ATTENTE" → EvaluationInvite.tsx
    } else if (invitation.statut_invitation === 'ATTENTE') {
      evaluationStatus.status = 'PENDING_ACCEPTANCE';
      evaluationStatus.message = 'Vous devez accepter votre invitation d\'évaluation';
      evaluationStatus.redirectTo = `/evaluation-invite/${invitation.token}`;
      
    // 3. ✅ STATUT "TERMINE" → Redirection selon le rôle et niveau d'accès
    } else if (invitation.statut_evaluation === 'TERMINE') {
      const userRole = (invitation.nom_role || invitation.role || '').toUpperCase();
      const accessLevel = determineAccessLevel(userRole, user);
      
      evaluationStatus.status = 'COMPLETED';
      evaluationStatus.userRole = userRole;
      evaluationStatus.accessLevel = accessLevel.level;
      evaluationStatus.scope = accessLevel.scope; // Compatible avec middleware existant
      
      // 🔑 Rôles avec vue globale sur toutes les entreprises
      if (accessLevel.level === 'GLOBAL') {
        evaluationStatus.message = 'Évaluation terminée - Accès aux analyses globales';
        evaluationStatus.redirectTo = '/analyses-interpretations'; // Vue globale
        
      // 🏢 Manager : Tout pour son entreprise seulement
      } else if (accessLevel.level === 'ENTREPRISE') {
        evaluationStatus.message = 'Votre évaluation est terminée - Consultez vos analyses d\'entreprise';
        evaluationStatus.redirectTo = `/analyses-interpretations-entreprises?id_entreprise=${invitation.id_entreprise}`;
        
      // 👤 Intervenant : Seulement ses évaluations de maturité et formulaires
      } else if (accessLevel.level === 'PERSONNEL') {
        const actorId = userId || invitation.id_acteur;
        evaluationStatus.message = 'Votre évaluation est terminée - Consultez vos formulaires';
        evaluationStatus.redirectTo = `/formulaires?id_acteur=${actorId}`;
        
      } else {
        // Rôle non reconnu → Dashboard par défaut
        evaluationStatus.message = 'Votre évaluation est terminée';
        evaluationStatus.redirectTo = '/dashboard';
        logger.warn(`Rôle non reconnu pour la redirection: ${userRole}`);
      }
      
    // 4. ✅ STATUT "EN_COURS" → MaturityEvaluation.tsx
    } else if (invitation.statut_evaluation === 'EN_COURS' || 
               (progress && progress.reponses_donnees > 0)) {
      evaluationStatus.status = 'IN_PROGRESS';
      evaluationStatus.message = `Évaluation en cours (${progress?.pourcentage_completion || 0}% complétée)`;
      evaluationStatus.redirectTo = `/maturity-evaluation/${invitation.id_entreprise}`;
      evaluationStatus.shouldResume = true;
      
    // 5. ✅ STATUT "ACCEPTE" → Prêt à commencer
    } else if (invitation.statut_invitation === 'ACCEPTE') {
      evaluationStatus.status = 'READY_TO_START';
      evaluationStatus.message = 'Prêt à commencer l\'évaluation de maturité';
      evaluationStatus.redirectTo = `/maturity-evaluation/${invitation.id_entreprise}`;
      evaluationStatus.shouldResume = false;
      
    } else {
      // Statut non reconnu → Dashboard par défaut
      evaluationStatus.status = 'UNKNOWN';
      evaluationStatus.message = 'Statut d\'évaluation non reconnu';
      evaluationStatus.redirectTo = '/dashboard';
      logger.warn(`Statut d'évaluation non reconnu:`, {
        statut_invitation: invitation.statut_invitation,
        statut_evaluation: invitation.statut_evaluation
      });
    }

    logger.info('🎯 Redirection déterminée:', {
      status: evaluationStatus.status,
      redirectTo: evaluationStatus.redirectTo,
      userRole: evaluationStatus.userRole
    });

    return evaluationStatus;

  } catch (error) {
    logger.error('❌ Erreur dans la logique de redirection:', error);
    return {
      hasEvaluation: false,
      status: 'ERROR',
      message: 'Erreur lors de la détermination de la redirection',
      redirectTo: '/dashboard'
    };
  }
};

/**
 * Construit la requête SQL pour récupérer les informations d'évaluation
 * @param {string} userId - ID de l'utilisateur
 * @returns {Object} Requête SQL et paramètres
 */
const getEvaluationQuery = (userId) => {
  const query = `
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
  `;
  
  return { query, params: [userId] };
};

/**
 * Construit la requête SQL pour récupérer le progrès d'évaluation
 * @param {string} evaluationId - ID de l'évaluation
 * @param {string} userId - ID de l'utilisateur
 * @returns {Object} Requête SQL et paramètres
 */
const getProgressQuery = (evaluationId, userId) => {
  const query = `
    SELECT 
      COUNT(DISTINCT er.id_reponse) as reponses_donnees,
      (SELECT COUNT(*) FROM questions WHERE actif = 1) as total_questions
    FROM evaluation_responses er
    WHERE er.id_evaluation = ? AND er.id_acteur = ?
  `;
  
  return { query, params: [evaluationId, userId] };
};

/**
 * Vérifie si un utilisateur a la permission d'accéder à une ressource
 * @param {string} userRole - Rôle de l'utilisateur
 * @param {string} resourceType - Type de ressource ('entreprise', 'evaluation', 'formulaire')
 * @param {string} resourceOwnerId - ID du propriétaire de la ressource (entreprise ou acteur)
 * @param {string} userEnterpriseId - ID de l'entreprise de l'utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {boolean} True si l'accès est autorisé
 */
const checkResourceAccess = (userRole, resourceType, resourceOwnerId, userEnterpriseId, userId) => {
  const accessLevel = determineAccessLevel(userRole);
  
  // Vue globale : accès à tout
  if (accessLevel.level === 'GLOBAL') {
    return true;
  }
  
  // Manager : accès à tout ce qui concerne son entreprise
  if (accessLevel.level === 'ENTREPRISE') {
    if (resourceType === 'entreprise') {
      return resourceOwnerId === userEnterpriseId;
    }
    // Pour les évaluations et formulaires, vérifier l'entreprise
    return true; // À implémenter selon la logique métier
  }
  
  // Intervenant : accès seulement à ses propres données
  if (accessLevel.level === 'PERSONNEL') {
    if (resourceType === 'formulaire' || resourceType === 'evaluation') {
      return resourceOwnerId === userId;
    }
    return false; // Pas d'accès aux entreprises
  }
  
  return false;
};

module.exports = {
  determineEvaluationRedirect,
  determineAccessLevel,
  checkResourceAccess,
  getEvaluationQuery,
  getProgressQuery
};