// src/utils/permissionUtils.ts - Utilitaires pour la gestion des permissions
import { useAuth } from '../contexts/AuthContext';

// === TYPES ET INTERFACES ===
export interface Permission {
  nom_module: string;
  route_base: string;
  peut_voir: boolean;
  peut_editer: boolean;
  peut_supprimer: boolean;
  peut_administrer: boolean;
  sous_permissions?: Permission[];
}

export interface ModuleConfig {
  nom_module: string;
  route_base: string;
  description: string;
  icone?: string;
  ordre: number;
  sous_modules?: { [key: string]: ModuleConfig };
}

export type ActionType = 'voir' | 'editer' | 'supprimer' | 'administrer';
export type RoleType = 'SUPER_ADMINISTRATEUR' | 'ADMINISTRATEUR' | 'CONSULTANT' | 'MANAGER' | 'INTERVENANT';

// === CONFIGURATION DES MODULES ===
export const APP_MODULES: { [key: string]: ModuleConfig } = {
  DASHBOARD: {
    nom_module: 'DASHBOARD',
    route_base: '/',
    description: 'Tableau de bord principal',
    icone: 'dashboard',
    ordre: 1
  },
  QUESTIONNAIRES: {
    nom_module: 'QUESTIONNAIRES',
    route_base: '/questionnaires',
    description: 'Gestion des questionnaires',
    icone: 'quiz',
    ordre: 2
  },
  FORMULAIRES: {
    nom_module: 'FORMULAIRES',
    route_base: '/formulaires',
    description: 'Gestion des formulaires',
    icone: 'assignment',
    ordre: 3
  },
  ANALYSES: {
    nom_module: 'ANALYSES',
    route_base: '/analyses-fonctions',
    description: 'Analyses et recommandations',
    icone: 'analytics',
    ordre: 4
  },
  APPLICATIONS: {
    nom_module: 'APPLICATIONS',
    route_base: '/applications',
    description: 'Portfolio applications',
    icone: 'apps',
    ordre: 5
  },
  ENTREPRISES: {
    nom_module: 'ENTREPRISES',
    route_base: '/organisations',
    description: 'Gestion des organisations',
    icone: 'business',
    ordre: 6
  },
  ADMINISTRATION: {
    nom_module: 'ADMINISTRATION',
    route_base: '/admin',
    description: 'Administration système',
    icone: 'admin_panel_settings',
    ordre: 10,
    sous_modules: {
      USERS: {
        nom_module: 'ADMIN_USERS',
        route_base: '/admin/users',
        description: 'Gestion des utilisateurs',
        icone: 'people',
        ordre: 1
      },
      PERMISSIONS: {
        nom_module: 'ADMIN_PERMISSIONS',
        route_base: '/admin/permissions',
        description: 'Gestion des permissions',
        icone: 'security',
        ordre: 2
      },
      ROLES: {
        nom_module: 'ADMIN_ROLES',
        route_base: '/admin/roles',
        description: 'Gestion des rôles',
        icone: 'account_circle',
        ordre: 3
      },
      MATURITY_MODEL: {
        nom_module: 'ADMIN_MATURITY',
        route_base: '/admin/maturity-model',
        description: 'Modèle de maturité',
        icone: 'model_training',
        ordre: 4
      },
      SYSTEM: {
        nom_module: 'ADMIN_SYSTEM',
        route_base: '/admin/system',
        description: 'Configuration système',
        icone: 'settings',
        ordre: 5
      }
    }
  }
};

// === PERMISSIONS PAR DÉFAUT SELON LES RÔLES ===
export const DEFAULT_ROLE_PERMISSIONS: { [key in RoleType]: Permission[] } = {
  SUPER_ADMINISTRATEUR: generateFullPermissions(),
  ADMINISTRATEUR: generateFullPermissions(),
  CONSULTANT: generateConsultantPermissions(),
  MANAGER: generateManagerPermissions(),
  INTERVENANT: generateIntervenantPermissions()
};

// === FONCTIONS DE GÉNÉRATION DES PERMISSIONS ===
function generateFullPermissions(): Permission[] {
  return Object.values(APP_MODULES).map(module => {
    const permission: Permission = {
      nom_module: module.nom_module,
      route_base: module.route_base,
      peut_voir: true,
      peut_editer: true,
      peut_supprimer: true,
      peut_administrer: true
    };

    // Ajouter les sous-permissions si elles existent
    if (module.sous_modules) {
      permission.sous_permissions = Object.values(module.sous_modules).map(sousModule => ({
        nom_module: sousModule.nom_module,
        route_base: sousModule.route_base,
        peut_voir: true,
        peut_editer: true,
        peut_supprimer: true,
        peut_administrer: true
      }));
    }

    return permission;
  });
}

function generateConsultantPermissions(): Permission[] {
  const basePermissions = generateBasePermissions();
  
  return basePermissions.map(p => ({
    ...p,
    peut_voir: true,
    peut_editer: true,
    peut_supprimer: p.nom_module !== 'DASHBOARD', // Dashboard en lecture seule
    peut_administrer: false
  })).concat([
    {
      nom_module: 'APPLICATIONS',
      route_base: '/applications',
      peut_voir: true,
      peut_editer: true,
      peut_supprimer: false,
      peut_administrer: false
    },
    {
      nom_module: 'ENTREPRISES',
      route_base: '/organisations',
      peut_voir: true,
      peut_editer: true,
      peut_supprimer: false,
      peut_administrer: false
    }
  ]);
}

function generateManagerPermissions(): Permission[] {
  const basePermissions = generateBasePermissions();
  
  return basePermissions.map(p => ({
    ...p,
    peut_voir: true,
    peut_editer: p.nom_module !== 'DASHBOARD',
    peut_supprimer: false,
    peut_administrer: false
  })).concat([
    {
      nom_module: 'APPLICATIONS',
      route_base: '/applications',
      peut_voir: true,
      peut_editer: false,
      peut_supprimer: false,
      peut_administrer: false
    }
  ]);
}

function generateIntervenantPermissions(): Permission[] {
  return generateBasePermissions();
}

function generateBasePermissions(): Permission[] {
  return [
    {
      nom_module: 'DASHBOARD',
      route_base: '/',
      peut_voir: true,
      peut_editer: false,
      peut_supprimer: false,
      peut_administrer: false
    },
    {
      nom_module: 'QUESTIONNAIRES',
      route_base: '/questionnaires',
      peut_voir: true,
      peut_editer: true,
      peut_supprimer: false,
      peut_administrer: false
    },
    {
      nom_module: 'FORMULAIRES',
      route_base: '/formulaires',
      peut_voir: true,
      peut_editer: true,
      peut_supprimer: false,
      peut_administrer: false
    },
    {
      nom_module: 'ANALYSES',
      route_base: '/analyses-fonctions',
      peut_voir: true,
      peut_editer: false,
      peut_supprimer: false,
      peut_administrer: false
    }
  ];
}

// === FONCTIONS UTILITAIRES ===

/**
 * Vérifie si un utilisateur a une permission spécifique
 */
export const checkPermission = (
  permissions: Permission[], 
  module: string, 
  action: ActionType
): boolean => {
  // Rechercher dans les permissions principales
  let permission = permissions.find(p => 
    p.nom_module.toUpperCase() === module.toUpperCase()
  );

  // Si pas trouvé, chercher dans les sous-permissions
  if (!permission) {
    for (const p of permissions) {
      if (p.sous_permissions) {
        permission = p.sous_permissions.find(sp => 
          sp.nom_module.toUpperCase() === module.toUpperCase()
        );
        if (permission) break;
      }
    }
  }

  if (!permission) return false;

  switch (action) {
    case 'voir':
      return permission.peut_voir;
    case 'editer':
      return permission.peut_editer;
    case 'supprimer':
      return permission.peut_supprimer;
    case 'administrer':
      return permission.peut_administrer;
    default:
      return false;
  }
};

/**
 * Vérifie si un utilisateur peut accéder à une route
 */
export const checkRouteAccess = (
  permissions: Permission[], 
  route: string
): boolean => {
  const cleanRoute = route.startsWith('/') ? route.substring(1) : route;
  
  // Mapping des routes vers les modules
  const routeToModuleMap: { [key: string]: string } = {
    '': 'DASHBOARD',
    'dashboard': 'DASHBOARD',
    'questionnaires': 'QUESTIONNAIRES',
    'formulaires': 'FORMULAIRES',
    'analyses-fonctions': 'ANALYSES',
    'analyses-interpretations': 'ANALYSES',
    'applications': 'APPLICATIONS',
    'organisations': 'ENTREPRISES',
    'admin': 'ADMINISTRATION',
    'admin/users': 'ADMIN_USERS',
    'admin/permissions': 'ADMIN_PERMISSIONS',
    'admin/roles': 'ADMIN_ROLES',
    'admin/maturity-model': 'ADMIN_MATURITY',
    'admin/system': 'ADMIN_SYSTEM',
    // Anciennes routes pour rétrocompatibilité
    'users': 'ADMIN_USERS',
  };

  // Trouver le module correspondant à la route
  let moduleForRoute = null;
  for (const [routePath, moduleName] of Object.entries(routeToModuleMap)) {
    if (cleanRoute === routePath || cleanRoute.startsWith(routePath + '/')) {
      moduleForRoute = moduleName;
      break;
    }
  }

  if (!moduleForRoute) return false;
  
  return checkPermission(permissions, moduleForRoute, 'voir');
};

/**
 * Obtient les modules accessibles pour un utilisateur
 */
export const getAccessibleModules = (permissions: Permission[]): Permission[] => {
  return permissions.filter(permission => permission.peut_voir);
};

/**
 * Obtient les sous-modules d'administration accessibles
 */
export const getAccessibleAdminModules = (permissions: Permission[]): Permission[] => {
  const adminPermission = permissions.find(p => p.nom_module === 'ADMINISTRATION');
  return adminPermission?.sous_permissions?.filter(sp => sp.peut_voir) || [];
};

/**
 * Détermine le rôle à partir de l'ancien système
 */
export const mapOldRoleToNew = (oldRole: string): RoleType => {
  switch (oldRole?.toLowerCase()) {
    case 'superadmin':
    case 'super_administrateur':
      return 'SUPER_ADMINISTRATEUR';
    case 'administrateur':
    case 'admin':
      return 'ADMINISTRATEUR';
    case 'consultant':
      return 'CONSULTANT';
    case 'manager':
    case 'responsable':
      return 'MANAGER';
    case 'user':
    case 'utilisateur':
    case 'intervenant':
    default:
      return 'INTERVENANT';
  }
};

/**
 * Obtient les permissions par défaut pour un rôle
 */
export const getDefaultPermissionsForRole = (role: RoleType): Permission[] => {
  return DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.INTERVENANT;
};

/**
 * Vérifie si un rôle est administrateur
 */
export const isAdminRole = (role: string | undefined): boolean => {
  if (!role) return false;
  const mappedRole = mapOldRoleToNew(role);
  return mappedRole === 'ADMINISTRATEUR' || mappedRole === 'SUPER_ADMINISTRATEUR';
};

/**
 * Vérifie si un rôle est super administrateur
 */
export const isSuperAdminRole = (role: string | undefined): boolean => {
  if (!role) return false;
  const mappedRole = mapOldRoleToNew(role);
  return mappedRole === 'SUPER_ADMINISTRATEUR';
};

/**
 * Filtre les permissions selon les capacités de l'utilisateur
 */
export const filterPermissionsByUserLevel = (
  permissions: Permission[], 
  userRole: RoleType,
  targetRole: RoleType
): Permission[] => {
  // Super administrateur peut tout voir
  if (userRole === 'SUPER_ADMINISTRATEUR') {
    return permissions;
  }

  // Administrateur ne peut pas voir les permissions de super administrateur
  if (userRole === 'ADMINISTRATEUR' && targetRole === 'SUPER_ADMINISTRATEUR') {
    return permissions.filter(p => !p.peut_administrer || p.nom_module !== 'ADMIN_SYSTEM');
  }

  // Les autres rôles ne peuvent voir que leurs propres permissions
  if (!isAdminRole(userRole)) {
    return permissions.filter(p => p.peut_voir);
  }

  return permissions;
};

/**
 * Hook personnalisé pour utiliser les utilitaires de permissions
 */
export const usePermissionUtils = () => {
  const { currentUser, permissions, hasPermission, canAccessRoute, isAdmin, isSuperAdmin } = useAuth();

  return {
    // Données utilisateur
    currentUser,
    permissions,
    
    // Fonctions de vérification
    hasPermission,
    canAccessRoute,
    isAdmin,
    isSuperAdmin,
    
    // Utilitaires
    checkPermission: (module: string, action: ActionType) => checkPermission(permissions, module, action),
    checkRouteAccess: (route: string) => checkRouteAccess(permissions, route),
    getAccessibleModules: () => getAccessibleModules(permissions),
    getAccessibleAdminModules: () => getAccessibleAdminModules(permissions),
    
    // Configuration
    APP_MODULES,
    DEFAULT_ROLE_PERMISSIONS,
    
    // Helpers
    mapOldRoleToNew,
    getDefaultPermissionsForRole,
    isAdminRole: (role?: string) => isAdminRole(role),
    isSuperAdminRole: (role?: string) => isSuperAdminRole(role),
    filterPermissionsByUserLevel
  };
};

// === CONSTANTES UTILES ===
export const ADMIN_MODULES = [
  'ADMIN_USERS',
  'ADMIN_PERMISSIONS', 
  'ADMIN_ROLES',
  'ADMIN_MATURITY',
  'ADMIN_SYSTEM'
];

export const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password'
];

export const ROLE_HIERARCHY: { [key in RoleType]: number } = {
  SUPER_ADMINISTRATEUR: 5,
  ADMINISTRATEUR: 4,
  CONSULTANT: 3,
  MANAGER: 2,
  INTERVENANT: 1
};

/**
 * Compare deux rôles selon la hiérarchie
 */
export const compareRoles = (role1: RoleType, role2: RoleType): number => {
  return ROLE_HIERARCHY[role1] - ROLE_HIERARCHY[role2];
};

/**
 * Vérifie si un rôle peut gérer un autre rôle
 */
export const canManageRole = (managerRole: RoleType, targetRole: RoleType): boolean => {
  return compareRoles(managerRole, targetRole) > 0;
};

export default {
  checkPermission,
  checkRouteAccess,
  getAccessibleModules,
  getAccessibleAdminModules,
  mapOldRoleToNew,
  getDefaultPermissionsForRole,
  isAdminRole,
  isSuperAdminRole,
  filterPermissionsByUserLevel,
  usePermissionUtils,
  compareRoles,
  canManageRole,
  APP_MODULES,
  DEFAULT_ROLE_PERMISSIONS,
  ADMIN_MODULES,
  PUBLIC_ROUTES,
  ROLE_HIERARCHY
};