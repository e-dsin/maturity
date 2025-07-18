// src/contexts/AuthContext.tsx - Version corrigée pour le rôle
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

// Interface pour Evaluation Maturité

interface EvaluationStatus {
  hasEvaluation: boolean;
  status: 'PENDING_ACCEPTANCE' | 'IN_PROGRESS' | 'COMPLETED' | 'READY_TO_START' | 'NO_EVALUATION' | 'ERROR_CHECK';
  message: string;
  redirectTo: string;
  shouldResume?: boolean;
  invitation?: {
    id_invite: string;
    token: string;
    id_evaluation: string;
    role: string;
    statut_invitation: string;
  };
  progress?: {
    reponses_donnees: number;
    total_questions: number;
    pourcentage_completion: number;
  };
}

interface LoginResult {
  success: boolean;
  redirectTo?: string;
  evaluationStatus?: EvaluationStatus;
  message?: string;
}


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
    
    const role = user.nom_role?.toUpperCase();
    return role === 'ADMINISTRATEUR' || 
           role === 'SUPER_ADMINISTRATEUR' ||
           user.niveau_acces === 'GLOBAL';
  }, []);

  const isUserSuperAdmin = useCallback((user: Acteur | null): boolean => {
    if (!user) return false;
    
    const role = user.nom_role?.toUpperCase();
    return role === 'SUPER_ADMINISTRATEUR';
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

    // Normaliser le nom du rôle pour la comparaison
    const roleUpper = nomRole?.toUpperCase();
    
    console.log('🔑 Analyse du rôle:', {
      nomRole: nomRole,
      roleUpper: roleUpper,
      niveauAcces: niveauAcces
    });

    // === SUPER ADMINISTRATEUR ET ADMINISTRATEUR : TOUTES LES PERMISSIONS ===
    if (roleUpper === 'SUPER_ADMINISTRATEUR' || roleUpper === 'ADMINISTRATEUR' || niveauAcces === 'GLOBAL') {
      console.log('🔑 Génération permissions Administrateur (TOUTES PERMISSIONS)');
      return generateFullAdminPermissions();
    }
    
    // === CONSULTANT : PERMISSIONS ÉTENDUES ===
    if (roleUpper === 'CONSULTANT') {
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
    if (roleUpper === 'MANAGER') {
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
          const permissionsResponse = await api.get('user/permissions');
          
          setCurrentUser(permissionsResponse.user);
          setPermissions(permissionsResponse.permissions || []);
          setHasGlobalAccess(permissionsResponse.hasGlobalAccess || isUserAdmin(permissionsResponse.user));
          setIsAuthenticated(true);
          setError(null);
          
          console.log('✅ Utilisateur authentifié avec système de permissions');
          
        } catch (permErr) {
          console.log('⚠️ Endpoint permissions non disponible, utilisation /auth/me...');
          
          // Fallback sur /auth/me
          const response = await api.get('auth/me');
          const user = response.user || response.data?.user;
          
          if (user) {
            console.log('🔍 Utilisateur depuis /auth/me:', user);
            
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
  // const login = async (email: string, password: string) => {
  //   try {
  //     setError(null);
  //     setIsLoading(true);
      
  //     console.log('🔄 === DÉBUT LOGIN ===');
  //     console.log('📧 Email:', email);
      
  //     const response = await api.post('auth/login', { email, password });
      
  //     if (response.token && response.user) {
  //       console.log('🔍 Réponse login complète:', response);
  //       console.log('🔍 Utilisateur reçu:', response.user);
        
  //       localStorage.setItem('auth_token', response.token);
        
  //       setCurrentUser(response.user);
  //       setPermissions(getDefaultPermissionsForRole(response.user.nom_role, response.user.niveau_acces));
  //       setHasGlobalAccess(isUserAdmin(response.user));
  //       setIsAuthenticated(true);
        
  //       console.log('✅ === LOGIN RÉUSSI ===');
  //       console.log('👤 Utilisateur:', {
  //         email: response.user.email,
  //         nom_role: response.user.nom_role,
  //         niveau_acces: response.user.niveau_acces,
  //         isAdmin: isUserAdmin(response.user),
  //         isSuperAdmin: isUserSuperAdmin(response.user)
  //       });
  //     } else {
  //       throw new Error('Réponse de connexion invalide');
  //     }
      
  //   } catch (err: any) {
  //     console.error('❌ === ERREUR LOGIN ===');
  //     console.error('Message:', err.response?.data?.message || err.message);
      
  //     const errorMessage = err.response?.data?.message || err.message || 'Erreur de connexion';
  //     setError(errorMessage);
  //     throw new Error(errorMessage);
  //   } finally {
  //     setIsLoading(false);
  //     console.log('🏁 === FIN LOGIN ===');
  //   }
  // };

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    try {
      console.log('🔄 === DÉBUT LOGIN ===');
      console.log('📧 Email:', email);
      
      const response = await api.post('auth/login', { email, password });
      
      console.log('✅ Login réussi, réponse:', response.data);
      
      const { token, user: userData, evaluation } = response.data;
      
      // Sauvegarder le token
      localStorage.setItem('token', token);
      setUser(userData);
      
      // Traiter le statut d'évaluation
      if (evaluation) {
        setEvaluationStatus(evaluation);
        console.log('📊 Statut évaluation reçu:', evaluation.status, '-> Redirection:', evaluation.redirectTo);
        
        // Logique de redirection automatique
        if (evaluation.status === 'PENDING_ACCEPTANCE') {
          console.log('⏳ Redirection vers invitation en attente');
          setTimeout(() => navigate(evaluation.redirectTo), 1000);
          
        } else if (evaluation.status === 'IN_PROGRESS') {
          console.log('🔄 Redirection vers évaluation en cours');
          // Afficher une notification de reprise
          setTimeout(() => {
            navigate(evaluation.redirectTo, {
              state: {
                shouldResume: true,
                evaluationId: evaluation.invitation?.id_evaluation,
                progress: evaluation.progress
              }
            });
          }, 1500);
          
        } else if (evaluation.status === 'READY_TO_START') {
          console.log('🚀 Redirection vers nouvelle évaluation');
          setTimeout(() => {
            navigate(evaluation.redirectTo, {
              state: {
                shouldResume: false,
                evaluationId: evaluation.invitation?.id_evaluation
              }
            });
          }, 1500);
          
        } else if (evaluation.status === 'COMPLETED') {
          console.log('✅ Redirection vers résultats');
          setTimeout(() => navigate(evaluation.redirectTo), 1000);
          
        } else {
          console.log('📊 Redirection vers dashboard');
          setTimeout(() => navigate('/dashboard'), 1000);
        }
      } else {
        // Pas d'évaluation, redirection normale
        setTimeout(() => navigate('/dashboard'), 1000);
      }
      
      return {
        success: true,
        redirectTo: evaluation?.redirectTo || '/dashboard',
        evaluationStatus: evaluation,
        message: evaluation?.message || 'Connexion réussie'
      };
      
    } catch (error: any) {
      console.error('❌ === ERREUR LOGIN ===');
      console.error('Message:', error.response?.data?.message || error.message);
      
      throw new Error(error.response?.data?.message || 'Erreur de connexion');
    } finally {
      console.log('🏁 === FIN LOGIN ===');
    }
  }, [navigate]);

  
  // === AUTRES FONCTIONS (adaptées) ===

  const checkEvaluationStatus = useCallback(async (userId: string): Promise<EvaluationStatus> => {
    try {
      console.log('🔍 Vérification statut évaluation pour:', userId);
      
      const response = await api.get(`/evaluation-status/check/${userId}`);
      const status = response.data;
      
      setEvaluationStatus(status);
      console.log('📊 Statut évaluation mis à jour:', status.status);
      
      return status;
    } catch (error) {
      console.error('❌ Erreur vérification statut évaluation:', error);
      const errorStatus: EvaluationStatus = {
        hasEvaluation: false,
        status: 'ERROR_CHECK',
        message: 'Erreur lors de la vérification du statut',
        redirectTo: '/dashboard'
      };
      setEvaluationStatus(errorStatus);
      return errorStatus;
    }
  }, []);

  const updateEvaluationProgress = useCallback(async (
    evaluationId: string, 
    responses: any[], 
    currentStep: number, 
    totalSteps: number
  ): Promise<boolean> => {
    try {
      console.log('💾 Sauvegarde progrès évaluation:', {
        evaluationId,
        currentStep,
        totalSteps,
        responses: responses.length
      });
      
      const response = await api.post('/evaluation-status/update-progress', {
        id_evaluation: evaluationId,
        responses,
        currentStep,
        totalSteps
      });
      
      const result = response.data;
      console.log('✅ Progrès sauvegardé:', result.message);
      
      // Mettre à jour le statut local si l'évaluation est terminée
      if (result.isCompleted && evaluationStatus) {
        setEvaluationStatus({
          ...evaluationStatus,
          status: 'COMPLETED',
          message: 'Évaluation terminée avec succès',
          redirectTo: '/dashboard/results'
        });
      }
      
      return result.success;
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde progrès:', error);
      return false;
    }
  }, [evaluationStatus]);

  const logout = async () => {
    try {
      await api.post('auth/logout');
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
      
      const response = await api.post('auth/register', userData);
      
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
      await api.post('auth/forgot-password', { email });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Erreur lors de la récupération';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateProfile = async (userData: Partial<Acteur>) => {
    try {
      setError(null);
      const response = await api.put('auth/profile', userData);
      
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