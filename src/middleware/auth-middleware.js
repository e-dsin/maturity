// server/middlewares/auth-middleware.js - Version améliorée
const jwt = require('jsonwebtoken');
const { pool } = require('../db/dbConnection');
const logger = require('../utils/logger');

// Middleware d'authentification principal
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
    
    // Enrichir l'objet utilisateur avec des informations de scope
    const userRole = user.nom_role || user.role;
    user.hasGlobalAccess = (
      user.niveau_acces === 'GLOBAL' ||
      userRole === 'SUPER_ADMINISTRATEUR' ||
      userRole === 'CONSULTANT'
    );
    
    // Déterminer le scope d'accès
    user.scope = user.hasGlobalAccess ? 'GLOBAL' : 'ENTREPRISE';
    
    req.user = user;
    
    console.log('🔐 Utilisateur authentifié:', {
      email: user.email,
      role: userRole,
      scope: user.scope,
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

// Middleware pour vérifier les permissions sur un module spécifique
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

// Middleware pour exiger le rôle Consultant ou supérieur
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

// Middleware pour exiger le rôle Manager, Consultant ou supérieur
const requireManagerOrConsultant = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentification requise' });
  }

  const userRole = req.user.nom_role || req.user.role;
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

// Middleware pour contrôler l'accès selon le scope (entreprise vs global)
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

// Middleware pour filtrer les données selon l'entreprise de l'utilisateur
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

// Middleware pour vérifier les droits d'administration
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

// Fonction utilitaire pour récupérer les permissions d'un utilisateur
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

// Fonction utilitaire pour vérifier si un utilisateur peut accéder à une ressource spécifique
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

// Fonction utilitaire pour obtenir les droits d'un utilisateur
const getUserRights = (user) => {
  if (!user) return null;
  
  const userRole = user.nom_role || user.role;
  const hasGlobalAccess = user.hasGlobalAccess || user.scope === 'GLOBAL';
  
  return {
    isSuperAdmin: userRole === 'SUPER_ADMINISTRATEUR',
    isAdmin: ['SUPER_ADMINISTRATEUR', 'ADMINISTRATEUR'].includes(userRole),
    isConsultant: ['SUPER_ADMINISTRATEUR', 'ADMINISTRATEUR', 'CONSULTANT'].includes(userRole),
    isManager: ['SUPER_ADMINISTRATEUR', 'ADMINISTRATEUR', 'CONSULTANT', 'MANAGER'].includes(userRole),
    hasGlobalAccess: hasGlobalAccess,
    scope: hasGlobalAccess ? 'GLOBAL' : 'ENTREPRISE',
    entrepriseId: user.id_entreprise,
    canViewAll: hasGlobalAccess || ['SUPER_ADMINISTRATEUR', 'ADMINISTRATEUR', 'MANAGER'].includes(userRole),
    canEdit: ['SUPER_ADMINISTRATEUR', 'ADMINISTRATEUR'].includes(userRole),
    canDelete: userRole === 'SUPER_ADMINISTRATEUR',
    canManageUsers: ['SUPER_ADMINISTRATEUR', 'ADMINISTRATEUR'].includes(userRole),
    canManageRoles: userRole === 'SUPER_ADMINISTRATEUR',
    canManagePermissions: ['SUPER_ADMINISTRATEUR', 'ADMINISTRATEUR'].includes(userRole),
    canManageModules: userRole === 'SUPER_ADMINISTRATEUR'
  };
};

// Middleware pour attacher les droits utilisateur à la requête
const attachUserRights = (req, res, next) => {
  if (req.user) {
    req.userRights = getUserRights(req.user);
    console.log('📊 Droits utilisateur attachés:', {
      email: req.user.email,
      role: req.user.nom_role || req.user.role,
      scope: req.userRights.scope,
      rights: Object.keys(req.userRights).filter(key => req.userRights[key] === true)
    });
  }
  next();
};

// Fonction utilitaire pour logger les tentatives d'accès
const logAccess = (req, action, resource, success) => {
  const logData = {
    user: req.user ? req.user.email : 'anonymous',
    role: req.user ? (req.user.nom_role || req.user.role) : 'none',
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
  authenticateToken,
  checkPermission,
  requireConsultant,
  requireManagerOrConsultant,
  requireScopeAccess,
  filterByEntreprise,
  requireAdminLevel,
  attachUserRights,
  getUserPermissions,
  canAccessResource,
  getUserRights,
  logAccess
};