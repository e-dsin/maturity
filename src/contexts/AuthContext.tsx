// src/contexts/AuthContext.tsx - Version adaptée pour votre système de rôles
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

// === CONFIGURATION DES MODULES (conservée) ===
const ALL_APP_MODULES = {
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
        icone: 'people'
      },
      PERMISSIONS: {
        nom_module: 'ADMIN_PERMISSIONS',
        route_base: '/admin/permissions',
        description: 'Gestion des permissions',
        icone: 'security'
      },
      ROLES: {
        nom_module: 'ADMIN_ROLES',
        route_base: '/admin/roles',
        description: 'Gestion des rôles',
        icone: 'account_circle'
      },
      MATURITY: {
        nom_module: 'ADMIN_MATURITY',
        route_base: '/admin/maturity-model',
        description: 'Modèle de maturité',
        icone: 'model_training'
      },
      SYSTEM: {
        nom_module: 'ADMIN_SYSTEM',
        route_base: '/admin/system',
        description: 'Configuration système',
        icone: 'settings'
      }
    }
  }
} as const;

// === INTERFACES ADAPTÉES ===
interface Acteur {
  id_acteur: string;
  nom_prenom: string;
  email: string;
  organisation: string;
  nom_role: string;
  niveau_acces: 'ENTREPRISE' | 'GLOBAL';
  id_entreprise?: string;
  nom_entreprise?: string;
  anciennete_role?: number;
}

interface Permission {
  nom_module: string;
  route_base: string;
  peut_voir: boolean;
  peut_editer: boolean;
  peut_supprimer: boolean;
  peut_administrer: boolean;
  sous_permissions?: Permission[];
}

interface AuthContextType {
  currentUser: Acteur | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  updateProfile: (userData: Partial<Acteur>) => Promise<void>;
  error: string | null;
  permissions: Permission[];
  hasGlobalAccess: boolean;
  hasPermission: (module: string, action: string) => boolean;
  canAccessRoute: (route: string) => boolean;
  canAccessAdminModule: (subModule: string) => boolean;
  getAccessibleModules: () => Permission[];
  getAdminSubModules: () => Permission[];
  refreshPermissions: () => Promise<void>;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  getAllAppModules: () => typeof ALL_APP_MODULES;
}

interface RegisterData {
  nom_prenom: string;
  email: string;
  password: string;
  organisation: string;
  id_entreprise?: string;
  id_role: string;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  register: async () => {},
  forgotPassword: async () => {},
  updateProfile: async () => {},
  error: null,
  permissions: [],
  hasGlobalAccess: false,
  hasPermission: () => false,
  canAccessRoute: () => false,
  canAccessAdminModule: () => false,
  getAccessibleModules: () => [],
  getAdminSubModules: () => [],
  refreshPermissions: async () => {},
  isAdmin: () => false,
  isSuperAdmin: () => false,
  getAllAppModules: () => ALL_APP_MODULES,
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // États
  const [currentUser, setCurrentUser] = useState<Acteur | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [hasGlobalAccess, setHasGlobalAccess] = useState<boolean>(false);

  // === FONCTIONS HELPER OPTIMISÉES ===
  const isUserAdmin = useCallback((user: Acteur | null): boolean => {
    if (!user) return false;
    
    return user.nom_role === 'ADMINISTRATEUR' || 
           user.nom_role === 'SUPER_ADMINISTRATEUR' ||
           user.niveau_acces === 'GLOBAL';
  }, []);

  const isUserSuperAdmin = useCallback((user: Acteur | null): boolean => {
    if (!user) return false;
    
    return user.nom_role === 'SUPER_ADMINISTRATEUR';
  }, []);

  // === GÉNÉRATION AUTOMATIQUE DES PERMISSIONS ADMIN ===
  const generateFullAdminPermissions = useCallback((): Permission[] => {
    const permissions: Permission[] = [];
    
    Object.values(ALL_APP_MODULES).forEach(module => {
      const mainPermission: Permission = {
        nom_module: module.nom_module,
        route_base: module.route_base,
        peut_voir: true,
        peut_editer: true,
        peut_supprimer: true,
        peut_administrer: true
      };

      if ('sous_modules' in module && module.sous_modules) {
        mainPermission.sous_permissions = Object.values(module.sous_modules).map(sousModule => ({
          nom_module: sousModule.nom_module,
          route_base: sousModule.route_base,
          peut_voir: true,
          peut_editer: true,
          peut_supprimer: true,
          peut_administrer: true
        }));
      }

      permissions.push(mainPermission);
    });

    return permissions;
  }, []);

  // === PERMISSIONS PAR DÉFAUT BASÉES SUR LES RÔLES ===
  const getDefaultPermissionsForRole = useCallback((nomRole: string, niveauAcces: string): Permission[] => {
    const basePermissions: Permission[] = [
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

    // === SUPER ADMINISTRATEUR ET ADMINISTRATEUR : TOUTES LES PERMISSIONS ===
    if (nomRole === 'SUPER_ADMINISTRATEUR' || nomRole === 'ADMINISTRATEUR' || niveauAcces === 'GLOBAL') {
      console.log('🔑 Génération permissions Administrateur (TOUTES)');
      return generateFullAdminPermissions();
    }
    
    // === CONSULTANT : PERMISSIONS ÉTENDUES ===
    if (nomRole === 'CONSULTANT') {
      console.log('🔑 Génération permissions Consultant (ÉTENDUES)');
      return basePermissions.map(p => ({
        ...p,
        peut_voir: true,
        peut_editer: true,
        peut_supprimer: true,
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

    // === MANAGER : PERMISSIONS MOYENNES ===
    if (nomRole === 'MANAGER') {
      console.log('🔑 Génération permissions Manager (MOYENNES)');
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

    // === INTERVENANT : PERMISSIONS DE BASE ===
    console.log('🔑 Génération permissions Intervenant (BASE)');
    return basePermissions;
  }, [generateFullAdminPermissions]);

  // === VÉRIFICATION AUTH ===
  const checkAuthStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('auth_token');
      
      if (token) {
        console.log('🔑 Token trouvé, vérification...');
        
        try {
          // Essayer le nouveau endpoint avec permissions si disponible
          const permissionsResponse = await api.get('/user/permissions');
          
          setCurrentUser(permissionsResponse.user);
          setPermissions(permissionsResponse.permissions || []);
          setHasGlobalAccess(permissionsResponse.hasGlobalAccess || isUserAdmin(permissionsResponse.user));
          setIsAuthenticated(true);
          setError(null);
          
          console.log('✅ Utilisateur authentifié avec système de permissions');
          
        } catch (permErr) {
          console.log('⚠️ Endpoint permissions non disponible, utilisation /auth/me...');
          
          // Fallback sur /auth/me
          const response = await api.get('/auth/me');
          const user = response.user || response.data?.user;
          
          if (user) {
            setCurrentUser(user);
            setPermissions(getDefaultPermissionsForRole(user.nom_role, user.niveau_acces));
            setHasGlobalAccess(isUserAdmin(user));
            setIsAuthenticated(true);
            setError(null);
            
            console.log('✅ Utilisateur authentifié (fallback /auth/me)');
          }
        }
      } else {
        console.log('ℹ️ Aucun token trouvé');
      }
    } catch (err: any) {
      console.warn('⚠️ Erreur d\'authentification:', err.message);
      localStorage.removeItem('auth_token');
      setCurrentUser(null);
      setPermissions([]);
      setHasGlobalAccess(false);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, [isUserAdmin, getDefaultPermissionsForRole]);

  // === FONCTION LOGIN ===
  const login = async (email: string, password: string) => {
    try {
      setError(null);
      setIsLoading(true);
      
      console.log('🔄 === DÉBUT LOGIN ===');
      console.log('📧 Email:', email);
      
      const response = await api.post('/auth/login', { email, password });
      
      if (response.token && response.user) {
        localStorage.setItem('auth_token', response.token);
        
        setCurrentUser(response.user);
        setPermissions(getDefaultPermissionsForRole(response.user.nom_role, response.user.niveau_acces));
        setHasGlobalAccess(isUserAdmin(response.user));
        setIsAuthenticated(true);
        
        console.log('✅ === LOGIN RÉUSSI ===');
        console.log('👤 Utilisateur:', {
          email: response.user.email,
          nom_role: response.user.nom_role,
          niveau_acces: response.user.niveau_acces,
          isAdmin: isUserAdmin(response.user)
        });
      } else {
        throw new Error('Réponse de connexion invalide');
      }
      
    } catch (err: any) {
      console.error('❌ === ERREUR LOGIN ===');
      console.error('Message:', err.response?.data?.message || err.message);
      
      const errorMessage = err.response?.data?.message || err.message || 'Erreur de connexion';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
      console.log('🏁 === FIN LOGIN ===');
    }
  };

  // === AUTRES FONCTIONS (adaptées) ===
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Erreur lors de la déconnexion:', err);
    } finally {
      localStorage.removeItem('auth_token');
      setCurrentUser(null);
      setPermissions([]);
      setHasGlobalAccess(false);
      setIsAuthenticated(false);
      console.log('✅ Déconnexion réussie');
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setError(null);
      setIsLoading(true);
      
      const response = await api.post('/auth/register', userData);
      
      if (response.token && response.user) {
        localStorage.setItem('auth_token', response.token);
        
        setCurrentUser(response.user);
        setPermissions(getDefaultPermissionsForRole(response.user.nom_role, response.user.niveau_acces));
        setHasGlobalAccess(isUserAdmin(response.user));
        setIsAuthenticated(true);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Erreur lors de l\'inscription';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      setError(null);
      await api.post('/auth/forgot-password', { email });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Erreur lors de la récupération';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateProfile = async (userData: Partial<Acteur>) => {
    try {
      setError(null);
      const response = await api.put('/auth/profile', userData);
      
      if (response.user) {
        setCurrentUser(response.user);
        setHasGlobalAccess(isUserAdmin(response.user));
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Erreur lors de la mise à jour';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // === FONCTIONS PERMISSIONS ===
  const isAdmin = useCallback((): boolean => {
    return isUserAdmin(currentUser);
  }, [currentUser, isUserAdmin]);

  const isSuperAdmin = useCallback((): boolean => {
    return isUserSuperAdmin(currentUser);
  }, [currentUser, isUserSuperAdmin]);

  const hasPermission = useCallback((module: string, action: string): boolean => {
    if (isUserAdmin(currentUser) || isUserSuperAdmin(currentUser) || hasGlobalAccess) {
      return true;
    }

    let permission = permissions.find(p => 
      p.nom_module.toUpperCase() === module.toUpperCase()
    );

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
  }, [currentUser, permissions, hasGlobalAccess, isUserAdmin, isUserSuperAdmin]);

  const canAccessRoute = useCallback((route: string): boolean => {
    if (isUserAdmin(currentUser) || isUserSuperAdmin(currentUser) || hasGlobalAccess) {
      return true;
    }

    const cleanRoute = route.startsWith('/') ? route.substring(1) : route;
    
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
      'users': 'ADMIN_USERS',
    };

    let moduleForRoute = null;
    for (const [routePath, moduleName] of Object.entries(routeToModuleMap)) {
      if (cleanRoute.startsWith(routePath)) {
        moduleForRoute = moduleName;
        break;
      }
    }

    if (!moduleForRoute) return false;
    
    return hasPermission(moduleForRoute, 'voir');
  }, [currentUser, hasGlobalAccess, hasPermission, isUserAdmin, isUserSuperAdmin]);

  const canAccessAdminModule = useCallback((subModule: string): boolean => {
    if (isUserAdmin(currentUser) || isUserSuperAdmin(currentUser) || hasGlobalAccess) {
      return true;
    }

    return hasPermission(`ADMIN_${subModule.toUpperCase()}`, 'voir');
  }, [currentUser, hasGlobalAccess, hasPermission, isUserAdmin, isUserSuperAdmin]);

  const getAccessibleModules = useCallback((): Permission[] => {
    if (isUserAdmin(currentUser) || isUserSuperAdmin(currentUser) || hasGlobalAccess) {
      return generateFullAdminPermissions();
    }
    return permissions.filter(permission => permission.peut_voir);
  }, [currentUser, hasGlobalAccess, permissions, generateFullAdminPermissions, isUserAdmin, isUserSuperAdmin]);

  const getAdminSubModules = useCallback((): Permission[] => {
    if (isUserAdmin(currentUser) || isUserSuperAdmin(currentUser) || hasGlobalAccess) {
      const adminModule = ALL_APP_MODULES.ADMINISTRATION;
      if (adminModule.sous_modules) {
        return Object.values(adminModule.sous_modules).map(sousModule => ({
          nom_module: sousModule.nom_module,
          route_base: sousModule.route_base,
          peut_voir: true,
          peut_editer: true,
          peut_supprimer: true,
          peut_administrer: true
        }));
      }
    }

    const adminPermission = permissions.find(p => p.nom_module === 'ADMINISTRATION');
    return adminPermission?.sous_permissions?.filter(sp => sp.peut_voir) || [];
  }, [currentUser, hasGlobalAccess, permissions, isUserAdmin, isUserSuperAdmin]);

  const refreshPermissions = useCallback(async (): Promise<void> => {
    if (isAuthenticated) {
      await checkAuthStatus();
    }
  }, [isAuthenticated, checkAuthStatus]);

  const getAllAppModules = useCallback(() => ALL_APP_MODULES, []);

  // === EFFET D'INITIALISATION ===
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // === VALEUR DU CONTEXTE ===
  const value = {
    currentUser,
    isAuthenticated,
    isLoading,
    login,
    logout,
    register,
    forgotPassword,
    updateProfile,
    error,
    permissions,
    hasGlobalAccess,
    hasPermission,
    canAccessRoute,
    canAccessAdminModule,
    getAccessibleModules,
    getAdminSubModules,
    refreshPermissions,
    isAdmin,
    isSuperAdmin,
    getAllAppModules,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;