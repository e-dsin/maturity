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

export default usePermissions;