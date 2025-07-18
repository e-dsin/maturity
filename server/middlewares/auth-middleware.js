// server/middlewares/auth-middleware.js - Version améliorée avec nouvelle hiérarchie
const jwt = require('jsonwebtoken');
const { pool } = require('../db/dbConnection');
const logger = require('../utils/logger');

// Nouvelle hiérarchie des rôles
const ROLE_HIERARCHY = {
  INTERVENANT: { level: 1, scope: 'ENTREPRISE_PERSONNEL' },
  MANAGER: { level: 2, scope: 'ENTREPRISE_COMPLETE' },
  CONSULTANT: { level: 3, scope: 'GLOBAL' },
  ADMINISTRATEUR: { level: 4, scope: 'GLOBAL' },
  SUPER_ADMINISTRATEUR: { level: 5, scope: 'GLOBAL' }
};

// Middleware d'authentification principal (conservé et amélioré)
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Token d\'accès requis' });
    }

    // Vérifier et décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Récupérer les informations complètes de l'utilisateur
    const [users] = await pool.query(`
      SELECT a.*, r.nom_role, r.niveau_acces, e.nom_entreprise,
             r.nom_role as role
      FROM acteurs a
      LEFT JOIN roles r ON a.id_role = r.id_role
      LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
      WHERE a.id_acteur = ?
    `, [decoded.id_acteur]);

    if (users.length === 0) {
      return res.status(401).json({ message: 'Utilisateur non trouvé' });
    }

    const user = users[0];
    const userRole = user.nom_role || user.role;
    
    // ✨ NOUVEAU: Enrichir avec la nouvelle hiérarchie
    const roleConfig = ROLE_HIERARCHY[userRole];
    if (roleConfig) {
      user.roleLevel = roleConfig.level;
      user.roleScope = roleConfig.scope;
      user.hasGlobalAccess = roleConfig.scope === 'GLOBAL';
      user.hasEnterpriseAccess = ['GLOBAL', 'ENTREPRISE_COMPLETE'].includes(roleConfig.scope);
      user.hasPersonalAccess = roleConfig.scope === 'ENTREPRISE_PERSONNEL';
    } else {
      // Fallback pour rôles non définis
      user.roleLevel = 0;
      user.roleScope = 'UNKNOWN';
      user.hasGlobalAccess = (
        user.niveau_acces === 'GLOBAL' ||
        userRole === 'SUPER_ADMINISTRATEUR' ||
        userRole === 'CONSULTANT'
      );
      user.hasEnterpriseAccess = true;
      user.hasPersonalAccess = false;
    }
    
    // Conserver la compatibilité avec l'ancien système
    user.scope = user.hasGlobalAccess ? 'GLOBAL' : 'ENTREPRISE';
    
    req.user = user;
    
    console.log('🔐 Utilisateur authentifié:', {
      email: user.email,
      role: userRole,
      level: user.roleLevel,
      scope: user.roleScope,
      legacy_scope: user.scope,
      entreprise: user.id_entreprise
    });
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expiré' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token invalide' });
    }
    
    console.error('Erreur lors de l\'authentification:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de l\'authentification' });
  }
};

// ✨ NOUVEAU: Middleware pour définir les permissions selon la nouvelle hiérarchie
const setEnhancedUserPermissions = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentification requise' });
  }

  const userRole = req.user.nom_role || req.user.role;
  const roleConfig = ROLE_HIERARCHY[userRole];

  if (!roleConfig) {
    console.warn('⚠️ Rôle non reconnu dans la nouvelle hiérarchie:', userRole);
    return next(); // Continuer avec l'ancien système
  }

  // Enrichir req.user avec les nouvelles permissions
  req.userPermissions = {
    role: userRole,
    level: roleConfig.level,
    scope: roleConfig.scope,
    entreprise_id: req.user.id_entreprise,
    
    // Permissions par module selon la nouvelle hiérarchie
    canAccessModule: (module, action = 'voir') => {
      return canUserAccessModule(userRole, module, action, req.user.id_entreprise);
    },
    
    // Accès aux entreprises
    canSelectAllEnterprises: () => roleConfig.scope === 'GLOBAL',
    canAccessEnterprise: (enterpriseId) => {
      if (roleConfig.scope === 'GLOBAL') return true;
      return req.user.id_entreprise === enterpriseId;
    },
    
    // Gestion des utilisateurs
    canManageUser: (targetUserRole) => {
      const targetLevel = ROLE_HIERARCHY[targetUserRole]?.level || 0;
      
      // Règles spéciales
      if (targetUserRole === 'ADMINISTRATEUR' && userRole !== 'SUPER_ADMINISTRATEUR') {
        return false;
      }
      if (targetUserRole === 'SUPER_ADMINISTRATEUR' && userRole !== 'SUPER_ADMINISTRATEUR') {
        return false;
      }
      
      return roleConfig.level > targetLevel;
    },
    
    // Filtres de données
    getDataFilters: () => {
      switch (roleConfig.scope) {
        case 'GLOBAL':
          return { global: true, entreprise: null, acteur: null };
        case 'ENTREPRISE_COMPLETE':
          return { global: false, entreprise: req.user.id_entreprise, acteur: null };
        case 'ENTREPRISE_PERSONNEL':
          return { global: false, entreprise: req.user.id_entreprise, acteur: req.user.id_acteur };
        default:
          return { global: false, entreprise: req.user.id_entreprise, acteur: null };
      }
    }
  };

  console.log('✨ Permissions améliorées configurées:', {
    user: req.user.email,
    role: userRole,
    level: roleConfig.level,
    scope: roleConfig.scope
  });

  next();
};

// ✨ NOUVEAU: Fonction pour vérifier l'accès aux modules selon la nouvelle hiérarchie
const canUserAccessModule = (userRole, module, action, userEntrepriseId) => {
  const modulePermissions = {
    INTERVENANT: {
      FORMULAIRES: { voir: 'OWN_ONLY', editer: 'OWN_ONLY', supprimer: false, administrer: false },
      DASHBOARD: { voir: true, editer: false, supprimer: false, administrer: false },
      ANALYSES: { voir: 'OWN_ONLY', editer: false, supprimer: false, administrer: false }
    },
    MANAGER: {
      FORMULAIRES: { voir: true, editer: true, supprimer: true, administrer: false },
      DASHBOARD: { voir: true, editer: true, supprimer: false, administrer: false },
      ANALYSES: { voir: true, editer: true, supprimer: false, administrer: false },
      GESTION_EQUIPES: { voir: true, editer: true, supprimer: false, administrer: false },
      ENTREPRISES: { voir: 'ENTREPRISE_ONLY', editer: 'ENTREPRISE_ONLY', supprimer: false, administrer: false }
    },
    CONSULTANT: {
      FORMULAIRES: { voir: true, editer: true, supprimer: true, administrer: false },
      DASHBOARD: { voir: true, editer: true, supprimer: false, administrer: false },
      ANALYSES: { voir: true, editer: true, supprimer: false, administrer: false },
      ENTREPRISES: { voir: true, editer: true, supprimer: false, administrer: false },
      GESTION_EQUIPES: { voir: true, editer: false, supprimer: false, administrer: false }
    },
    ADMINISTRATEUR: {
      FORMULAIRES: { voir: true, editer: true, supprimer: true, administrer: true },
      DASHBOARD: { voir: true, editer: true, supprimer: true, administrer: true },
      ANALYSES: { voir: true, editer: true, supprimer: true, administrer: true },
      ENTREPRISES: { voir: true, editer: true, supprimer: true, administrer: true },
      GESTION_EQUIPES: { voir: true, editer: true, supprimer: true, administrer: true },
      ADMINISTRATION: { voir: true, editer: true, supprimer: true, administrer: false }
    },
    SUPER_ADMINISTRATEUR: {
      FORMULAIRES: { voir: true, editer: true, supprimer: true, administrer: true },
      DASHBOARD: { voir: true, editer: true, supprimer: true, administrer: true },
      ANALYSES: { voir: true, editer: true, supprimer: true, administrer: true },
      ENTREPRISES: { voir: true, editer: true, supprimer: true, administrer: true },
      GESTION_EQUIPES: { voir: true, editer: true, supprimer: true, administrer: true },
      ADMINISTRATION: { voir: true, editer: true, supprimer: true, administrer: true },
      CONFIGURATIONS_SYSTEME: { voir: true, editer: true, supprimer: true, administrer: true }
    }
  };

  const userPermissions = modulePermissions[userRole];
  if (!userPermissions || !userPermissions[module]) {
    return false;
  }

  const permission = userPermissions[module][action];
  
  if (permission === true) return true;
  if (permission === false) return false;
  if (permission === 'OWN_ONLY') return true; // Géré côté application
  if (permission === 'ENTREPRISE_ONLY') return true; // Géré côté application
  
  return false;
};

// ✨ NOUVEAU: Middleware pour vérifier l'accès aux modules avec la nouvelle hiérarchie
const requireModuleAccess = (module, action = 'voir') => {
  return (req, res, next) => {
    if (!req.userPermissions) {
      // Fallback vers l'ancien système
      return checkPermission(module, action)(req, res, next);
    }

    if (!req.userPermissions.canAccessModule(module, action)) {
      logAccess(req, action, module, false);
      return res.status(403).json({ 
        message: `Accès ${action} au module ${module} non autorisé`,
        required_permission: `${module}:${action}`,
        user_role: req.userPermissions.role,
        user_level: req.userPermissions.level
      });
    }

    logAccess(req, action, module, true);
    console.log(`✅ Accès ${action} au module ${module} autorisé pour ${req.userPermissions.role}`);
    next();
  };
};

// ✨ NOUVEAU: Middleware pour filtrer les données selon les nouvelles permissions
const applyDataFilters = (req, res, next) => {
  if (!req.userPermissions) {
    // Fallback vers l'ancien système
    return filterByEntreprise(req, res, next);
  }

  const filters = req.userPermissions.getDataFilters();
  req.dataFilters = filters;

  console.log('🔍 Filtres de données appliqués:', {
    user: req.user.email,
    role: req.userPermissions.role,
    filters: filters
  });

  next();
};

// ✨ NOUVEAU: Middleware pour vérifier le niveau hiérarchique minimum
const requireMinLevel = (minLevel) => {
  return (req, res, next) => {
    if (!req.userPermissions || req.userPermissions.level < minLevel) {
      const currentLevel = req.userPermissions?.level || 0;
      return res.status(403).json({ 
        message: `Niveau hiérarchique insuffisant (requis: ${minLevel}, actuel: ${currentLevel})`,
        user_role: req.userPermissions?.role || 'unknown',
        required_level: minLevel
      });
    }
    next();
  };
};

// Middleware pour vérifier les permissions sur un module spécifique (conservé)
const checkPermission = (moduleName, action = 'voir') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentification requise' });
      }

      const userRole = req.user.nom_role || req.user.role;
      
      // Super admin a toutes les permissions
      if (userRole === 'SUPER_ADMINISTRATEUR') {
        console.log('✅ Accès autorisé (Super Admin)');
        return next();
      }

      // Récupérer les permissions de l'utilisateur pour ce module
      const permissions = await getUserPermissions(req.user.id_acteur);
      const modulePermission = permissions.find(
        perm => perm.nom_module === moduleName || perm.id_module === moduleName
      );

      if (!modulePermission) {
        console.log('❌ Aucune permission trouvée pour le module:', moduleName);
        return res.status(403).json({ 
          message: `Accès non autorisé au module ${moduleName}`,
          requiredPermission: action
        });
      }

      // Vérifier l'action demandée
      let hasPermission = false;
      switch (action.toLowerCase()) {
        case 'voir':
        case 'view':
          hasPermission = modulePermission.peut_voir;
          break;
        case 'editer':
        case 'edit':
          hasPermission = modulePermission.peut_editer;
          break;
        case 'supprimer':
        case 'delete':
          hasPermission = modulePermission.peut_supprimer;
          break;
        case 'administrer':
        case 'admin':
          hasPermission = modulePermission.peut_administrer;
          break;
        default:
          hasPermission = false;
      }

      if (!hasPermission) {
        console.log(`❌ Permission refusée - ${action} sur ${moduleName}`);
        return res.status(403).json({ 
          message: `Permission insuffisante pour ${action} sur ${moduleName}`,
          hasPermission: {
            voir: modulePermission.peut_voir,
            editer: modulePermission.peut_editer,
            supprimer: modulePermission.peut_supprimer,
            administrer: modulePermission.peut_administrer
          }
        });
      }

      console.log(`✅ Permission accordée - ${action} sur ${moduleName}`);
      next();
    } catch (error) {
      console.error('Erreur lors de la vérification des permissions:', error);
      res.status(500).json({ message: 'Erreur serveur lors de la vérification des permissions' });
    }
  };
};

// Middleware pour exiger le rôle Consultant ou supérieur (conservé)
const requireConsultant = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentification requise' });
  }

  const userRole = req.user.nom_role || req.user.role;
  const authorizedRoles = ['SUPER_ADMINISTRATEUR', 'ADMINISTRATEUR', 'CONSULTANT'];
  
  if (!authorizedRoles.includes(userRole)) {
    console.log('❌ Accès consultant refusé pour le rôle:', userRole);
    return res.status(403).json({ 
      message: 'Accès réservé aux consultants et administrateurs',
      userRole: userRole
    });
  }

  console.log('✅ Accès consultant autorisé pour:', userRole);
  next();
};

// Middleware pour exiger le rôle Manager, Consultant ou supérieur (conservé et amélioré)
const requireManagerOrConsultant = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentification requise' });
  }

  const userRole = req.user.nom_role || req.user.role;
  // ✨ NOUVEAU: Inclure INTERVENANT si nécessaire pour certaines routes
  const authorizedRoles = ['SUPER_ADMINISTRATEUR', 'ADMINISTRATEUR', 'CONSULTANT', 'MANAGER'];
  
  if (!authorizedRoles.includes(userRole)) {
    console.log('❌ Accès manager/consultant refusé pour le rôle:', userRole);
    return res.status(403).json({ 
      message: 'Accès réservé aux managers, consultants et administrateurs',
      userRole: userRole
    });
  }

  console.log('✅ Accès manager/consultant autorisé pour:', userRole);
  next();
};

// ✨ NOUVEAU: Middleware pour exiger l'accès aux formulaires (incluant INTERVENANT)
const requireFormAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentification requise' });
  }

  const userRole = req.user.nom_role || req.user.role;
  const authorizedRoles = ['SUPER_ADMINISTRATEUR', 'ADMINISTRATEUR', 'CONSULTANT', 'MANAGER', 'INTERVENANT'];
  
  if (!authorizedRoles.includes(userRole)) {
    console.log('❌ Accès formulaires refusé pour le rôle:', userRole);
    return res.status(403).json({ 
      message: 'Accès aux formulaires non autorisé',
      userRole: userRole
    });
  }

  console.log('✅ Accès formulaires autorisé pour:', userRole);
  next();
};

// Middleware pour contrôler l'accès selon le scope (conservé)
const requireScopeAccess = (requiredScope = 'ENTREPRISE') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentification requise' });
    }

    const userRole = req.user.nom_role || req.user.role;
    const hasGlobalAccess = req.user.hasGlobalAccess || req.user.scope === 'GLOBAL';
    
    if (requiredScope === 'GLOBAL' && !hasGlobalAccess) {
      console.log('❌ Accès global requis mais utilisateur limité à l\'entreprise');
      return res.status(403).json({ 
        message: 'Accès global requis pour cette opération',
        userScope: req.user.scope || 'ENTREPRISE'
      });
    }
    
    console.log('✅ Accès scope autorisé:', requiredScope, 'pour', userRole);
    next();
  };
};

// Middleware pour filtrer les données selon l'entreprise de l'utilisateur (conservé)
const filterByEntreprise = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentification requise' });
  }

  const userRole = req.user.nom_role || req.user.role;
  const hasGlobalAccess = req.user.hasGlobalAccess || req.user.scope === 'GLOBAL';
  
  // Ajouter des informations de filtrage à la requête
  req.enterpriseFilter = {
    isGlobalUser: hasGlobalAccess,
    userEntrepriseId: req.user.id_entreprise,
    shouldFilter: !hasGlobalAccess && req.user.id_entreprise,
    userRole: userRole
  };
  
  console.log('🔍 Filtre entreprise configuré:', req.enterpriseFilter);
  next();
};

// Middleware pour vérifier les droits d'administration (conservé)
const requireAdminLevel = (level = 'ADMIN') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentification requise' });
    }

    const userRole = req.user.nom_role || req.user.role;
    let hasRequiredLevel = false;
    
    switch (level) {
      case 'SUPER_ADMIN':
        hasRequiredLevel = userRole === 'SUPER_ADMINISTRATEUR';
        break;
      case 'ADMIN':
        hasRequiredLevel = ['SUPER_ADMINISTRATEUR', 'ADMINISTRATEUR'].includes(userRole);
        break;
      case 'CONSULTANT':
        hasRequiredLevel = ['SUPER_ADMINISTRATEUR', 'ADMINISTRATEUR', 'CONSULTANT'].includes(userRole);
        break;
      case 'MANAGER':
        hasRequiredLevel = ['SUPER_ADMINISTRATEUR', 'ADMINISTRATEUR', 'CONSULTANT', 'MANAGER'].includes(userRole);
        break;
      case 'INTERVENANT':
        hasRequiredLevel = ['SUPER_ADMINISTRATEUR', 'ADMINISTRATEUR', 'CONSULTANT', 'MANAGER', 'INTERVENANT'].includes(userRole);
        break;
      default:
        hasRequiredLevel = false;
    }
    
    if (!hasRequiredLevel) {
      console.log(`❌ Niveau ${level} requis mais utilisateur a le rôle:`, userRole);
      return res.status(403).json({ 
        message: `Niveau d'autorisation ${level} requis`,
        userRole: userRole
      });
    }
    
    console.log(`✅ Niveau ${level} autorisé pour:`, userRole);
    next();
  };
};

// Fonction utilitaire pour récupérer les permissions d'un utilisateur (conservée)
const getUserPermissions = async (userId) => {
  try {
    const [permissions] = await pool.query(`
      SELECT p.*, m.nom_module, m.description as module_description
      FROM permissions p
      JOIN modules m ON p.id_module = m.id_module
      WHERE p.id_acteur = ?
      ORDER BY m.ordre_affichage
    `, [userId]);

    return permissions.map(perm => ({
      id_permission: perm.id_permission,
      id_module: perm.id_module,
      nom_module: perm.nom_module,
      module_description: perm.module_description,
      type_ressource: perm.type_ressource,
      peut_voir: Boolean(perm.peut_voir),
      peut_editer: Boolean(perm.peut_editer),
      peut_supprimer: Boolean(perm.peut_supprimer),
      peut_administrer: Boolean(perm.peut_administrer),
      conditions: perm.conditions
    }));
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions utilisateur:', error);
    throw error;
  }
};

// Fonction utilitaire pour vérifier si un utilisateur peut accéder à une ressource spécifique (conservée)
const canAccessResource = async (userId, resourceType, resourceId, action = 'voir') => {
  try {
    const permissions = await getUserPermissions(userId);
    
    // Chercher une permission pour ce type de ressource
    const resourcePermission = permissions.find(perm => 
      perm.type_ressource === resourceType
    );
    
    if (!resourcePermission) return false;
    
    // Vérifier l'action
    switch (action.toLowerCase()) {
      case 'voir':
        return resourcePermission.peut_voir;
      case 'editer':
        return resourcePermission.peut_editer;
      case 'supprimer':
        return resourcePermission.peut_supprimer;
      case 'administrer':
        return resourcePermission.peut_administrer;
      default:
        return false;
    }
  } catch (error) {
    console.error('Erreur lors de la vérification d\'accès à la ressource:', error);
    return false;
  }
};

// Fonction utilitaire pour obtenir les droits d'un utilisateur (conservée et améliorée)
const getUserRights = (user) => {
  if (!user) return null;
  
  const userRole = user.nom_role || user.role;
  const hasGlobalAccess = user.hasGlobalAccess || user.scope === 'GLOBAL';
  const roleConfig = ROLE_HIERARCHY[userRole];
  
  return {
    // Nouveaux droits selon la hiérarchie
    role: userRole,
    level: roleConfig?.level || 0,
    scope: roleConfig?.scope || 'UNKNOWN',
    
    // Anciens droits (conservés pour compatibilité)
    isSuperAdmin: userRole === 'SUPER_ADMINISTRATEUR',
    isAdmin: ['SUPER_ADMINISTRATEUR', 'ADMINISTRATEUR'].includes(userRole),
    isConsultant: ['SUPER_ADMINISTRATEUR', 'ADMINISTRATEUR', 'CONSULTANT'].includes(userRole),
    isManager: ['SUPER_ADMINISTRATEUR', 'ADMINISTRATEUR', 'CONSULTANT', 'MANAGER'].includes(userRole),
    isIntervenant: ['SUPER_ADMINISTRATEUR', 'ADMINISTRATEUR', 'CONSULTANT', 'MANAGER', 'INTERVENANT'].includes(userRole),
    
    hasGlobalAccess: hasGlobalAccess,
    hasEnterpriseAccess: user.hasEnterpriseAccess || hasGlobalAccess,
    hasPersonalAccess: user.hasPersonalAccess || false,
    
    entrepriseId: user.id_entreprise,
    canViewAll: hasGlobalAccess || ['SUPER_ADMINISTRATEUR', 'ADMINISTRATEUR', 'MANAGER'].includes(userRole),
    canEdit: ['SUPER_ADMINISTRATEUR', 'ADMINISTRATEUR', 'MANAGER'].includes(userRole),
    canDelete: ['SUPER_ADMINISTRATEUR', 'ADMINISTRATEUR'].includes(userRole),
    canManageUsers: ['SUPER_ADMINISTRATEUR', 'ADMINISTRATEUR', 'MANAGER'].includes(userRole),
    canManageRoles: userRole === 'SUPER_ADMINISTRATEUR',
    canManagePermissions: ['SUPER_ADMINISTRATEUR', 'ADMINISTRATEUR'].includes(userRole),
    canManageModules: userRole === 'SUPER_ADMINISTRATEUR',
    
    // Nouveaux droits spécifiques
    canCreateForms: ['SUPER_ADMINISTRATEUR', 'ADMINISTRATEUR', 'CONSULTANT', 'MANAGER', 'INTERVENANT'].includes(userRole),
    canSelectAllEnterprises: roleConfig?.scope === 'GLOBAL',
    canManageTeams: ['SUPER_ADMINISTRATEUR', 'ADMINISTRATEUR', 'MANAGER'].includes(userRole),
    canAccessSystemConfig: userRole === 'SUPER_ADMINISTRATEUR'
  };
};

// Middleware pour attacher les droits utilisateur à la requête (conservé et amélioré)
const attachUserRights = (req, res, next) => {
  if (req.user) {
    req.userRights = getUserRights(req.user);
    console.log('📊 Droits utilisateur attachés:', {
      email: req.user.email,
      role: req.user.nom_role || req.user.role,
      level: req.userRights.level,
      scope: req.userRights.scope,
      legacy_scope: req.userRights.hasGlobalAccess ? 'GLOBAL' : 'ENTREPRISE'
    });
  }
  next();
};

// Fonction utilitaire pour logger les tentatives d'accès (conservée)
const logAccess = (req, action, resource, success) => {
  const logData = {
    user: req.user ? req.user.email : 'anonymous',
    role: req.user ? (req.user.nom_role || req.user.role) : 'none',
    level: req.userPermissions ? req.userPermissions.level : 'unknown',
    action: action,
    resource: resource,
    success: success,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  };
  
  if (success) {
    logger.info(`Accès autorisé: ${action} sur ${resource}`, logData);
  } else {
    logger.warn(`Accès refusé: ${action} sur ${resource}`, logData);
  }
};

module.exports = {
  // Middlewares principaux
  authenticateToken,
  setEnhancedUserPermissions,
  applyDataFilters,
  
  // Nouveaux middlewares pour la hiérarchie
  requireModuleAccess,
  requireMinLevel,
  requireFormAccess,
  
  // Middlewares existants (conservés)
  checkPermission,
  requireConsultant,
  requireManagerOrConsultant,
  requireScopeAccess,
  filterByEntreprise,
  requireAdminLevel,
  attachUserRights,
  
  // Fonctions utilitaires
  getUserPermissions,
  canAccessResource,
  getUserRights,
  logAccess,
  canUserAccessModule,
  
  // Constantes
  ROLE_HIERARCHY
};