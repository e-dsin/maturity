// src/hooks/usePermissions.ts
import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

interface Permission {
  nom_module: string;
  route_base: string;
  peut_voir: boolean;
  peut_editer: boolean;
  peut_supprimer: boolean;
  peut_administrer: boolean;
}

interface User {
  id_acteur: string;
  nom_prenom: string;
  email: string;
  nom_role: string;
  niveau_acces: 'ENTREPRISE' | 'GLOBAL';
  id_entreprise?: string;
  nom_entreprise?: string;
}

interface UsePermissionsReturn {
  user: User | null;
  permissions: Permission[];
  hasGlobalAccess: boolean;
  loading: boolean;
  error: string | null;
  hasPermission: (module: string, action: string) => boolean;
  canAccessRoute: (route: string) => boolean;
  getAccessibleModules: () => Permission[];
  refreshPermissions: () => Promise<void>;
}

export const usePermissions = (): UsePermissionsReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [hasGlobalAccess, setHasGlobalAccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les permissions de l'utilisateur
  const loadPermissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setUser(null);
        setPermissions([]);
        setHasGlobalAccess(false);
        return;
      }

      const response = await api.get('/user/permissions');
      
      setUser(response.user);
      setPermissions(response.permissions || []);
      setHasGlobalAccess(response.hasGlobalAccess || false);
      
    } catch (err: any) {
      console.error('Erreur lors du chargement des permissions:', err);
      setError('Impossible de charger les permissions');
      
      // Si l'erreur est liée à l'authentification, nettoyer le token
      if (err.response?.status === 401) {
        localStorage.removeItem('auth_token');
        setUser(null);
        setPermissions([]);
        setHasGlobalAccess(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger les permissions au montage du hook
  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  // Vérifier si l'utilisateur a une permission spécifique
  const hasPermission = useCallback((module: string, action: string): boolean => {
    if (hasGlobalAccess) {
      return true;
    }

    const permission = permissions.find(p => 
      p.nom_module.toUpperCase() === module.toUpperCase()
    );

    if (!permission) {
      return false;
    }

    switch (action.toLowerCase()) {
      case 'voir':
      case 'view':
        return permission.peut_voir;
      case 'editer':
      case 'edit':
        return permission.peut_editer;
      case 'supprimer':
      case 'delete':
        return permission.peut_supprimer;
      case 'administrer':
      case 'admin':
        return permission.peut_administrer;
      default:
        return false;
    }
  }, [permissions, hasGlobalAccess]);

  // Vérifier si l'utilisateur peut accéder à une route
  const canAccessRoute = useCallback((route: string): boolean => {
    if (hasGlobalAccess) {
      return true;
    }

    // Nettoyer la route pour la comparaison
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
      'users': 'USERS',
      'admin': 'ADMIN'
    };

    // Trouver le module correspondant à la route
    let moduleForRoute = null;
    for (const [routePath, moduleName] of Object.entries(routeToModuleMap)) {
      if (cleanRoute.startsWith(routePath)) {
        moduleForRoute = moduleName;
        break;
      }
    }

    if (!moduleForRoute) {
      return false;
    }

    return hasPermission(moduleForRoute, 'voir');
  }, [hasPermission, hasGlobalAccess]);

  // Obtenir les modules accessibles à l'utilisateur
  const getAccessibleModules = useCallback((): Permission[] => {
    if (hasGlobalAccess) {
      return permissions;
    }

    return permissions.filter(permission => permission.peut_voir);
  }, [permissions, hasGlobalAccess]);

  // Rafraîchir les permissions
  const refreshPermissions = useCallback(async (): Promise<void> => {
    await loadPermissions();
  }, [loadPermissions]);

  return {
    user,
    permissions,
    hasGlobalAccess,
    loading,
    error,
    hasPermission,
    canAccessRoute,
    getAccessibleModules,
    refreshPermissions
  };
};

// Hook simplifié pour vérifier une permission spécifique
export const useHasPermission = (module: string, action: string): boolean => {
  const { hasPermission } = usePermissions();
  return hasPermission(module, action);
};

// Hook pour vérifier l'accès à une route
export const useCanAccessRoute = (route: string): boolean => {
  const { canAccessRoute } = usePermissions();
  return canAccessRoute(route);
};

// Hook pour obtenir l'utilisateur actuel
export const useCurrentUser = (): User | null => {
  const { user } = usePermissions();
  return user;
};

// Hook pour vérifier si l'utilisateur est un consultant
export const useIsConsultant = (): boolean => {
  const { user } = usePermissions();
  return user?.nom_role === 'CONSULTANT';
};

// Hook pour vérifier si l'utilisateur est un manager ou consultant
export const useIsManagerOrConsultant = (): boolean => {
  const { user } = usePermissions();
  return user?.nom_role === 'MANAGER' || user?.nom_role === 'CONSULTANT';
};

interface UserPermissions {
  // Permissions générales
  canViewAll: boolean;
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
  
  // Permissions spécifiques
  canManageUsers: boolean;
  canManagePermissions: boolean;
  canManageRoles: boolean;
  
  // Contexte utilisateur
  scope: 'GLOBAL' | 'ENTREPRISE';
  role: string;
  enterprise: string;
  
  // Permissions par module
  modules: {
    [moduleName: string]: {
      canView: boolean;
      canEdit: boolean;
      canDelete: boolean;
      canAdmin: boolean;
    };
  };
}

interface PermissionCheckOptions {
  resource?: string;
  action?: 'view' | 'edit' | 'create' | 'delete' | 'admin';
  targetRole?: string;
  targetEnterprise?: string;
}

export const usePermissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les permissions utilisateur
  const loadPermissions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Appel API pour récupérer les permissions
      const [acteursPerms, userPerms] = await Promise.all([
        api.get('acteurs/permissions/check'),
        api.get('user/permissions')
      ]);

      console.log('🔍 Permissions acteurs:', acteursPerms);
      console.log('🔍 Permissions utilisateur:', userPerms);

      // Construire l'objet permissions complet
      const userRole = user?.nom_role || user?.role || '';
      const isGlobalUser = user?.niveau_acces === 'GLOBAL' || 
                          ['SUPER_ADMINISTRATEUR', 'CONSULTANT'].includes(userRole);

      const fullPermissions: UserPermissions = {
        // Permissions générales
        canViewAll: acteursPerms.canViewAll || false,
        canEdit: acteursPerms.canEdit || false,
        canCreate: acteursPerms.canCreate || false,
        canDelete: acteursPerms.canDelete || false,

        // Permissions de gestion
        canManageUsers: ['SUPER_ADMINISTRATEUR', 'ADMINISTRATEUR'].includes(userRole),
        canManagePermissions: ['SUPER_ADMINISTRATEUR', 'ADMINISTRATEUR'].includes(userRole),
        canManageRoles: userRole === 'SUPER_ADMINISTRATEUR',

        // Contexte
        scope: acteursPerms.scope || 'ENTREPRISE',
        role: userRole,
        enterprise: acteursPerms.enterprise || user?.id_entreprise || '',

        // Permissions par module
        modules: {}
      };

      // Traiter les permissions par module
      if (Array.isArray(userPerms)) {
        userPerms.forEach((perm: any) => {
          fullPermissions.modules[perm.nom_module] = {
            canView: Boolean(perm.peut_voir),
            canEdit: Boolean(perm.peut_editer),
            canDelete: Boolean(perm.peut_supprimer),
            canAdmin: Boolean(perm.peut_administrer)
          };
        });
      }

      setPermissions(fullPermissions);
      console.log('✅ Permissions chargées:', fullPermissions);

    } catch (error: any) {
      console.error('❌ Erreur chargement permissions:', error);
      setError('Erreur lors du chargement des permissions');
      
      // Permissions par défaut en cas d'erreur
      setPermissions({
        canViewAll: false,
        canEdit: false,
        canCreate: false,
        canDelete: false,
        canManageUsers: false,
        canManagePermissions: false,
        canManageRoles: false,
        scope: 'ENTREPRISE',
        role: user?.nom_role || 'INTERVENANT',
        enterprise: user?.id_entreprise || '',
        modules: {}
      });
    } finally {
      setLoading(false);
    }
  };

  // Charger les permissions au montage du hook
  useEffect(() => {
    if (user) {
      loadPermissions();
    }
  }, [user]);

  // Fonction pour vérifier une permission spécifique
  const hasPermission = (options: PermissionCheckOptions = {}): boolean => {
    if (!permissions) return false;

    const {
      resource = 'general',
      action = 'view',
      targetRole,
      targetEnterprise
    } = options;

    // Vérifications par action
    switch (action) {
      case 'view':
        if (resource === 'acteurs') return permissions.canViewAll;
        if (permissions.modules[resource]) return permissions.modules[resource].canView;
        return permissions.canViewAll;

      case 'edit':
        if (resource === 'acteurs') return permissions.canEdit;
        if (permissions.modules[resource]) return permissions.modules[resource].canEdit;
        return permissions.canEdit;

      case 'create':
        if (resource === 'acteurs') return permissions.canCreate;
        return permissions.canCreate;

      case 'delete':
        if (resource === 'acteurs') return permissions.canDelete;
        if (permissions.modules[resource]) return permissions.modules[resource].canDelete;
        return permissions.canDelete;

      case 'admin':
        if (permissions.modules[resource]) return permissions.modules[resource].canAdmin;
        return permissions.canManagePermissions;

      default:
        return false;
    }
  };

  // Fonction pour vérifier si on peut gérer un utilisateur spécifique
  const canManageUser = (targetUser: any): boolean => {
    if (!permissions || !targetUser) return false;

    // Ne peut pas se gérer soi-même
    if (targetUser.id_acteur === user?.id_acteur) return false;

    // Vérifications de scope
    if (permissions.scope === 'ENTREPRISE' && 
        targetUser.id_entreprise !== permissions.enterprise) {
      return false;
    }

    // Vérifications de rôle
    const targetRole = targetUser.nom_role || targetUser.role;
    
    // Seul un super admin peut gérer un super admin
    if (targetRole === 'SUPER_ADMINISTRATEUR' && permissions.role !== 'SUPER_ADMINISTRATEUR') {
      return false;
    }

    // Un admin ne peut pas gérer un consultant
    if (targetRole === 'CONSULTANT' && permissions.role === 'ADMINISTRATEUR') {
      return false;
    }

    return permissions.canEdit;
  };

  // Fonction pour vérifier si on peut attribuer un rôle
  const canAssignRole = (roleToAssign: string): boolean => {
    if (!permissions) return false;

    // Seul un super admin peut attribuer super admin
    if (roleToAssign === 'SUPER_ADMINISTRATEUR' && permissions.role !== 'SUPER_ADMINISTRATEUR') {
      return false;
    }

    // Seul un super admin peut attribuer admin ou consultant
    if (['ADMINISTRATEUR', 'CONSULTANT'].includes(roleToAssign) && 
        permissions.role !== 'SUPER_ADMINISTRATEUR') {
      return false;
    }

    return permissions.canManageUsers;
  };

  // Fonction pour obtenir les entreprises accessibles
  const getAccessibleEnterprises = (): string[] => {
    if (!permissions) return [];
    
    if (permissions.scope === 'GLOBAL') {
      return ['*']; // Toutes les entreprises
    }
    
    return [permissions.enterprise];
  };

  // Fonction pour formater les permissions pour l'affichage
  const getPermissionsSummary = () => {
    if (!permissions) return null;

    const capabilities = [];
    
    if (permissions.canViewAll) capabilities.push('Consultation globale');
    if (permissions.canEdit) capabilities.push('Modification');
    if (permissions.canCreate) capabilities.push('Création');
    if (permissions.canDelete) capabilities.push('Suppression');
    if (permissions.canManageUsers) capabilities.push('Gestion utilisateurs');
    if (permissions.canManagePermissions) capabilities.push('Gestion permissions');

    return {
      role: permissions.role,
      scope: permissions.scope,
      capabilities,
      accessLevel: permissions.scope === 'GLOBAL' ? 'Global' : 'Entreprise'
    };
  };

  return {
    permissions,
    loading,
    error,
    hasPermission,
    canManageUser,
    canAssignRole,
    getAccessibleEnterprises,
    getPermissionsSummary,
    reloadPermissions: loadPermissions
  };
};

export default usePermissions;