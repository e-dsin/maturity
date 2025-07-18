// src/config/roles.config.ts
// Configuration centralisée des rôles, permissions et redirections

import { UserRole, AccessLevel, AccessLevelConfig } from '../types/evaluation.types';

// =============================================================================
// CONFIGURATION DES RÔLES ET NIVEAUX D'ACCÈS
// =============================================================================

/**
 * Hiérarchie des rôles (plus le nombre est élevé, plus le rôle a de permissions)
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  'SUPER-ADMINISTRATEUR': 100,
  'ADMINISTRATEUR': 80,
  'CONSULTANT': 60,
  'MANAGER': 40,
  'INTERVENANT': 20
};

/**
 * Rôles avec accès global (toutes les entreprises)
 */
export const GLOBAL_ROLES: UserRole[] = [
  'CONSULTANT',
  'ADMINISTRATEUR', 
  'SUPER-ADMINISTRATEUR'
];

/**
 * Rôles avec accès au niveau entreprise
 */
export const ENTERPRISE_ROLES: UserRole[] = [
  'MANAGER'
];

/**
 * Rôles avec accès personnel uniquement
 */
export const PERSONAL_ROLES: UserRole[] = [
  'INTERVENANT'
];

/**
 * Configuration détaillée par niveau d'accès
 */
export const ACCESS_LEVEL_CONFIG: Record<AccessLevel, AccessLevelConfig> = {
  GLOBAL: {
    level: 'GLOBAL',
    scope: 'GLOBAL',
    canViewAllEnterprises: true,
    canViewAllEvaluations: true,
    canViewAllFormulaires: true,
    defaultRedirectPath: '/analyses-interpretations',
    hasGlobalAccess: true
  },
  ENTREPRISE: {
    level: 'ENTREPRISE',
    scope: 'ENTREPRISE',
    canViewAllEnterprises: false,
    canViewAllEvaluations: false,
    canViewAllFormulaires: false,
    canViewEnterpriseData: true,
    defaultRedirectPath: '/analyses-interpretations-entreprises',
    hasGlobalAccess: false
  },
  PERSONNEL: {
    level: 'PERSONNEL',
    scope: 'ENTREPRISE', // Utilise le scope entreprise mais avec restrictions
    canViewAllEnterprises: false,
    canViewAllEvaluations: false,
    canViewAllFormulaires: false,
    canViewOwnData: true,
    defaultRedirectPath: '/formulaires-filtered',
    hasGlobalAccess: false
  },
  LIMITED: {
    level: 'LIMITED',
    scope: 'ENTREPRISE',
    canViewAllEnterprises: false,
    canViewAllEvaluations: false,
    canViewAllFormulaires: false,
    defaultRedirectPath: '/dashboard',
    hasGlobalAccess: false
  },
  NONE: {
    level: 'NONE',
    scope: 'ENTREPRISE',
    canViewAllEnterprises: false,
    canViewAllEvaluations: false,
    canViewAllFormulaires: false,
    defaultRedirectPath: '/auth/login',
    hasGlobalAccess: false
  }
};

// =============================================================================
// PERMISSIONS PAR MODULE ET RÔLE
// =============================================================================

export interface ModulePermission {
  voir: boolean;
  editer: boolean;
  supprimer: boolean;
  administrer: boolean;
}

export interface RolePermissions {
  [moduleName: string]: ModulePermission;
}

/**
 * Permissions par défaut pour chaque rôle
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  'SUPER-ADMINISTRATEUR': {
    DASHBOARD: { voir: true, editer: true, supprimer: true, administrer: true },
    ANALYSES: { voir: true, editer: true, supprimer: true, administrer: true },
    FORMULAIRES: { voir: true, editer: true, supprimer: true, administrer: true },
    QUESTIONNAIRES: { voir: true, editer: true, supprimer: true, administrer: true },
    APPLICATIONS: { voir: true, editer: true, supprimer: true, administrer: true },
    ENTREPRISES: { voir: true, editer: true, supprimer: true, administrer: true },
    USERS: { voir: true, editer: true, supprimer: true, administrer: true },
    ROLES: { voir: true, editer: true, supprimer: true, administrer: true },
    PERMISSIONS: { voir: true, editer: true, supprimer: true, administrer: true },
    MODULES: { voir: true, editer: true, supprimer: true, administrer: true },
    EVALUATIONS: { voir: true, editer: true, supprimer: true, administrer: true }
  },

  'ADMINISTRATEUR': {
    DASHBOARD: { voir: true, editer: true, supprimer: false, administrer: true },
    ANALYSES: { voir: true, editer: true, supprimer: false, administrer: true },
    FORMULAIRES: { voir: true, editer: true, supprimer: false, administrer: true },
    QUESTIONNAIRES: { voir: true, editer: true, supprimer: false, administrer: true },
    APPLICATIONS: { voir: true, editer: true, supprimer: false, administrer: true },
    ENTREPRISES: { voir: true, editer: true, supprimer: false, administrer: true },
    USERS: { voir: true, editer: true, supprimer: false, administrer: true },
    ROLES: { voir: true, editer: true, supprimer: false, administrer: true },
    PERMISSIONS: { voir: true, editer: true, supprimer: false, administrer: true },
    MODULES: { voir: true, editer: false, supprimer: false, administrer: false },
    EVALUATIONS: { voir: true, editer: true, supprimer: false, administrer: true }
  },

  'CONSULTANT': {
    DASHBOARD: { voir: true, editer: false, supprimer: false, administrer: false },
    ANALYSES: { voir: true, editer: false, supprimer: false, administrer: false },
    FORMULAIRES: { voir: true, editer: true, supprimer: false, administrer: false },
    QUESTIONNAIRES: { voir: true, editer: true, supprimer: false, administrer: false },
    APPLICATIONS: { voir: true, editer: true, supprimer: false, administrer: false },
    ENTREPRISES: { voir: true, editer: false, supprimer: false, administrer: false },
    USERS: { voir: true, editer: false, supprimer: false, administrer: false },
    EVALUATIONS: { voir: true, editer: true, supprimer: false, administrer: false }
  },

  'MANAGER': {
    DASHBOARD: { voir: true, editer: false, supprimer: false, administrer: false },
    ANALYSES: { voir: true, editer: false, supprimer: false, administrer: false },
    FORMULAIRES: { voir: true, editer: true, supprimer: false, administrer: false },
    QUESTIONNAIRES: { voir: true, editer: true, supprimer: false, administrer: false },
    APPLICATIONS: { voir: true, editer: true, supprimer: false, administrer: false },
    USERS: { voir: true, editer: true, supprimer: false, administrer: false },
    EVALUATIONS: { voir: true, editer: true, supprimer: false, administrer: false }
  },

  'INTERVENANT': {
    DASHBOARD: { voir: true, editer: false, supprimer: false, administrer: false },
    FORMULAIRES: { voir: true, editer: true, supprimer: false, administrer: false },
    QUESTIONNAIRES: { voir: true, editer: false, supprimer: false, administrer: false },
    EVALUATIONS: { voir: true, editer: true, supprimer: false, administrer: false }
  }
};

// =============================================================================
// CONFIGURATION DES ROUTES PAR RÔLE
// =============================================================================

export interface RouteConfig {
  path: string;
  allowedRoles: UserRole[];
  requiredAccessLevel?: AccessLevel;
  description: string;
}

/**
 * Configuration des routes et accès
 */
export const ROUTE_CONFIG: RouteConfig[] = [
  // Routes publiques
  { path: '/auth/login', allowedRoles: [], description: 'Page de connexion' },
  { path: '/auth/enterprise-registration', allowedRoles: [], description: 'Enregistrement entreprise' },
  { path: '/evaluation-invite', allowedRoles: [], description: 'Invitation évaluation' },

  // Routes d'évaluation
  { path: '/maturity-evaluation', allowedRoles: ['CONSULTANT', 'ADMINISTRATEUR', 'SUPER-ADMINISTRATEUR', 'MANAGER', 'INTERVENANT'], description: 'Évaluation de maturité' },

  // Dashboard
  { path: '/dashboard', allowedRoles: ['CONSULTANT', 'ADMINISTRATEUR', 'SUPER-ADMINISTRATEUR', 'MANAGER', 'INTERVENANT'], description: 'Tableau de bord' },

  // Analyses
  { path: '/analyses-interpretations', allowedRoles: ['CONSULTANT', 'ADMINISTRATEUR', 'SUPER-ADMINISTRATEUR'], requiredAccessLevel: 'GLOBAL', description: 'Analyses globales' },
  { path: '/analyses-interpretations-entreprises', allowedRoles: ['CONSULTANT', 'ADMINISTRATEUR', 'SUPER-ADMINISTRATEUR', 'MANAGER'], requiredAccessLevel: 'ENTREPRISE', description: 'Analyses entreprise' },

  // Formulaires
  { path: '/formulaires', allowedRoles: ['CONSULTANT', 'ADMINISTRATEUR', 'SUPER-ADMINISTRATEUR', 'MANAGER'], requiredAccessLevel: 'ENTREPRISE', description: 'Gestion formulaires' },
  { path: '/formulaires-filtered', allowedRoles: ['CONSULTANT', 'ADMINISTRATEUR', 'SUPER-ADMINISTRATEUR', 'MANAGER', 'INTERVENANT'], description: 'Formulaires personnels' },

  // Gestion
  { path: '/questionnaires', allowedRoles: ['CONSULTANT', 'ADMINISTRATEUR', 'SUPER-ADMINISTRATEUR', 'MANAGER'], requiredAccessLevel: 'ENTREPRISE', description: 'Gestion questionnaires' },
  { path: '/applications', allowedRoles: ['CONSULTANT', 'ADMINISTRATEUR', 'SUPER-ADMINISTRATEUR', 'MANAGER'], requiredAccessLevel: 'ENTREPRISE', description: 'Gestion applications' },
  { path: '/organisations', allowedRoles: ['CONSULTANT', 'ADMINISTRATEUR', 'SUPER-ADMINISTRATEUR'], requiredAccessLevel: 'GLOBAL', description: 'Gestion entreprises' },
  { path: '/acteurs', allowedRoles: ['CONSULTANT', 'ADMINISTRATEUR', 'SUPER-ADMINISTRATEUR', 'MANAGER'], requiredAccessLevel: 'ENTREPRISE', description: 'Gestion utilisateurs' },

  // Administration
  { path: '/roles', allowedRoles: ['ADMINISTRATEUR', 'SUPER-ADMINISTRATEUR'], requiredAccessLevel: 'GLOBAL', description: 'Gestion rôles' },
  { path: '/permissions', allowedRoles: ['ADMINISTRATEUR', 'SUPER-ADMINISTRATEUR'], requiredAccessLevel: 'GLOBAL', description: 'Gestion permissions' },
  { path: '/modules', allowedRoles: ['SUPER-ADMINISTRATEUR'], requiredAccessLevel: 'GLOBAL', description: 'Configuration modules' }
];

// =============================================================================
// FONCTIONS UTILITAIRES
// =============================================================================

/**
 * Détermine le niveau d'accès selon le rôle
 */
export const determineAccessLevel = (userRole: UserRole): AccessLevel => {
  if (GLOBAL_ROLES.includes(userRole)) {
    return 'GLOBAL';
  } else if (ENTERPRISE_ROLES.includes(userRole)) {
    return 'ENTREPRISE';
  } else if (PERSONAL_ROLES.includes(userRole)) {
    return 'PERSONNEL';
  }
  return 'LIMITED';
};

/**
 * Vérifie si un rôle a accès à un module
 */
export const hasModuleAccess = (
  userRole: UserRole, 
  moduleName: string, 
  action: keyof ModulePermission = 'voir'
): boolean => {
  const rolePermissions = DEFAULT_ROLE_PERMISSIONS[userRole];
  if (!rolePermissions || !rolePermissions[moduleName]) {
    return false;
  }
  return rolePermissions[moduleName][action];
};

/**
 * Vérifie si un rôle peut accéder à une route
 */
export const hasRouteAccess = (userRole: UserRole, routePath: string): boolean => {
  const routeConfig = ROUTE_CONFIG.find(route => 
    routePath.startsWith(route.path)
  );
  
  if (!routeConfig) {
    return false; // Route non configurée = accès refusé
  }
  
  if (routeConfig.allowedRoles.length === 0) {
    return true; // Route publique
  }
  
  return routeConfig.allowedRoles.includes(userRole);
};

/**
 * Obtient la configuration d'accès pour un rôle
 */
export const getAccessConfig = (userRole: UserRole): AccessLevelConfig => {
  const accessLevel = determineAccessLevel(userRole);
  return ACCESS_LEVEL_CONFIG[accessLevel];
};

/**
 * Détermine la redirection par défaut selon le rôle
 */
export const getDefaultRedirect = (userRole: UserRole, enterpriseId?: string): string => {
  const accessConfig = getAccessConfig(userRole);
  
  if (accessConfig.level === 'ENTREPRISE' && enterpriseId) {
    return `${accessConfig.defaultRedirectPath}?id_entreprise=${enterpriseId}`;
  }
  
  return accessConfig.defaultRedirectPath;
};

/**
 * Vérifie si un utilisateur peut accéder à une entreprise
 */
export const canAccessEnterprise = (
  userRole: UserRole, 
  userEnterpriseId: string, 
  targetEnterpriseId: string
): boolean => {
  const accessLevel = determineAccessLevel(userRole);
  
  if (accessLevel === 'GLOBAL') {
    return true; // Accès global
  }
  
  if (accessLevel === 'ENTREPRISE') {
    return userEnterpriseId === targetEnterpriseId; // Seulement son entreprise
  }
  
  return false; // Accès personnel = pas d'accès aux entreprises
};

/**
 * Compare deux rôles selon la hiérarchie
 */
export const compareRoles = (role1: UserRole, role2: UserRole): number => {
  return ROLE_HIERARCHY[role1] - ROLE_HIERARCHY[role2];
};

/**
 * Vérifie si un rôle est supérieur ou égal à un autre
 */
export const hasRoleLevel = (userRole: UserRole, requiredRole: UserRole): boolean => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

// =============================================================================
// CONFIGURATION DES COULEURS ET ICÔNES PAR RÔLE
// =============================================================================

export const ROLE_DISPLAY_CONFIG = {
  'SUPER-ADMINISTRATEUR': {
    color: 'error' as const,
    icon: '👑',
    label: 'Super Admin',
    description: 'Accès complet à toutes les fonctionnalités'
  },
  'ADMINISTRATEUR': {
    color: 'warning' as const,
    icon: '⚡',
    label: 'Administrateur',
    description: 'Gestion avancée du système'
  },
  'CONSULTANT': {
    color: 'primary' as const,
    icon: '🔍',
    label: 'Consultant',
    description: 'Accès global en lecture et analyse'
  },
  'MANAGER': {
    color: 'secondary' as const,
    icon: '👔',
    label: 'Manager',
    description: 'Gestion de son entreprise'
  },
  'INTERVENANT': {
    color: 'info' as const,
    icon: '👤',
    label: 'Intervenant',
    description: 'Participation aux évaluations'
  }
} as const;

/**
 * Obtient la configuration d'affichage pour un rôle
 */
export const getRoleDisplayConfig = (userRole: UserRole) => {
  return ROLE_DISPLAY_CONFIG[userRole] || {
    color: 'default' as const,
    icon: '❓',
    label: userRole,
    description: 'Rôle non reconnu'
  };
};

// =============================================================================
// EXPORT PAR DÉFAUT
// =============================================================================

export default {
  ROLE_HIERARCHY,
  GLOBAL_ROLES,
  ENTERPRISE_ROLES,
  PERSONAL_ROLES,
  ACCESS_LEVEL_CONFIG,
  DEFAULT_ROLE_PERMISSIONS,
  ROUTE_CONFIG,
  ROLE_DISPLAY_CONFIG,
  determineAccessLevel,
  hasModuleAccess,
  hasRouteAccess,
  getAccessConfig,
  getDefaultRedirect,
  canAccessEnterprise,
  compareRoles,
  hasRoleLevel,
  getRoleDisplayConfig
};