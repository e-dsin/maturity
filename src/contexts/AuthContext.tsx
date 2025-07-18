// src/contexts/AuthContext.tsx - VERSION CORRIGÉE avec système de permissions
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import api from '../services/api';

interface User {
  id_acteur: string;
  nom_prenom: string;
  email: string;
  organisation?: string;
  nom_role: string;
  niveau_acces?: string;
  id_entreprise?: string;
  nom_entreprise?: string;
  role?: string; // Alias pour compatibilité
}

interface Permission {
  nom_module: string;
  peut_voir: boolean;
  peut_editer: boolean;
  peut_supprimer: boolean;
  peut_administrer: boolean;
  route_base?: string;
}

interface AuthContextType {
  // ✅ Propriétés existantes
  user: User | null;
  currentUser: User | null; // Alias pour user
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  isAuthenticated: boolean;
  checkAuthStatus: () => Promise<void>;
  
  // ✅ Nouvelles propriétés pour les permissions
  permissions: Permission[];
  hasPermission: (module: string, action?: string) => boolean;
  canAccessRoute: (route: string) => boolean;
  canAccessAdminModule: (module: string) => boolean;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  getAdminSubModules: () => string[];
}

interface RegisterData {
  nom_prenom: string;
  email: string;
  password: string;
  organisation?: string;
  id_entreprise?: string;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  /**
   * ✅ Vérifier le statut d'authentification au démarrage
   */
  useEffect(() => {
    checkAuthStatus();
  }, []);

  /**
   * ✅ Vérifier si l'utilisateur est connecté ET récupérer ses permissions
   */
  const checkAuthStatus = async (): Promise<void> => {
    try {
      setLoading(true);

      // Vérifier d'abord si on a un token
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.log('🔑 Aucun token trouvé');
        setUser(null);
        setIsAuthenticated(false);
        setPermissions([]);
        return;
      }

      console.log('🔑 Token trouvé, vérification...');

      // ✅ Récupérer l'utilisateur ET ses permissions
      const response = await api.get('/user/permissions');
      
      if (response && response.user) {
        setUser(response.user);
        setPermissions(response.permissions || []);
        setIsAuthenticated(true);
        console.log('✅ Utilisateur authentifié avec permissions:', response.permissions?.length || 0);
      }

    } catch (error: any) {
      console.error('❌ Erreur vérification auth:', error);
      
      // Fallback vers /auth/me si /user/permissions n'existe pas
      try {
        const fallbackResponse = await api.get('/auth/me');
        if (fallbackResponse && fallbackResponse.nom_prenom) {
          setUser(fallbackResponse);
          setPermissions([]); // Permissions vides en fallback
          setIsAuthenticated(true);
          console.log('✅ Utilisateur authentifié (fallback)');
          return;
        }
      } catch (fallbackError) {
        console.error('❌ Erreur fallback auth:', fallbackError);
      }
      
      // Token invalide ou expiré
      if (error.response?.status === 401) {
        console.log('🔑 Token invalide/expiré, nettoyage...');
        localStorage.removeItem('authToken');
      }
      
      setUser(null);
      setIsAuthenticated(false);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * ✅ Connexion utilisateur - APPROCHE GÉNÉRIQUE
   */
  const login = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      
      // ✅ Utiliser api.post pour une approche générique
      const response = await api.post('/auth/login', {
        email,
        password
      });

      if (response && response.token) {
        // Stocker le token
        localStorage.setItem('authToken', response.token);
        
        // Récupérer les données utilisateur et permissions
        await checkAuthStatus();
        
        console.log('✅ Connexion réussie');
      } else {
        throw new Error('Réponse de connexion invalide');
      }

    } catch (error: any) {
      console.error('❌ Erreur de connexion:', error);
      
      // Nettoyer en cas d'erreur
      setUser(null);
      setIsAuthenticated(false);
      setPermissions([]);
      localStorage.removeItem('authToken');
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * ✅ Déconnexion utilisateur - APPROCHE GÉNÉRIQUE
   */
  const logout = async (): Promise<void> => {
    try {
      console.log('🔐 Déconnexion utilisateur...');
      
      // ✅ Utiliser api.post pour le logout
      try {
        await api.post('/auth/logout');
      } catch (error) {
        // Continuer même si l'appel API échoue
        console.warn('⚠️ Erreur logout API (continuant quand même):', error);
      }
      
      // Nettoyer l'état local et le token
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      setUser(null);
      setIsAuthenticated(false);
      setPermissions([]);
      
      console.log('✅ Déconnexion réussie');

    } catch (error: any) {
      console.error('❌ Erreur lors de la déconnexion:', error);
      
      // Même en cas d'erreur, nettoyer l'état local
      setUser(null);
      setIsAuthenticated(false);
      setPermissions([]);
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
    }
  };

  /**
   * ✅ Fonction d'inscription (à implémenter selon vos besoins)
   */
  const register = async (userData: RegisterData): Promise<void> => {
    try {
      setLoading(true);
      
      const response = await api.post('/auth/register', userData);
      
      if (response && response.token) {
        localStorage.setItem('authToken', response.token);
        await checkAuthStatus();
        console.log('✅ Inscription réussie');
      }

    } catch (error: any) {
      console.error('❌ Erreur d\'inscription:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // 🆕 NOUVELLES FONCTIONS DE PERMISSIONS
  // ========================================

  /**
   * ✅ Vérifier si l'utilisateur a une permission spécifique
   */
  const hasPermission = useCallback((module: string, action: string = 'voir'): boolean => {
    if (!user || !isAuthenticated) return false;

    const userRole = user.nom_role || user.role;
    
    // Super admin a toutes les permissions
    if (userRole === 'SUPER_ADMINISTRATEUR') return true;

    // Chercher la permission pour ce module
    const permission = permissions.find(p => 
      p.nom_module === module || 
      p.nom_module.toLowerCase() === module.toLowerCase()
    );

    if (!permission) return false;

    // Vérifier l'action demandée
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
        return permission.peut_voir;
    }
  }, [user, isAuthenticated, permissions]);

  /**
   * ✅ Vérifier si l'utilisateur peut accéder à une route
   */
  const canAccessRoute = useCallback((route: string): boolean => {
    if (!user || !isAuthenticated) return false;

    const userRole = user.nom_role || user.role;
    
    // Super admin a accès à tout
    if (userRole === 'SUPER_ADMINISTRATEUR') return true;

    // Mapping des routes vers les modules
    const routeToModule: { [key: string]: string } = {
      '/': 'DASHBOARD',
      '/dashboard': 'DASHBOARD',
      '/analyses-interpretations': 'ANALYSES',
      '/analyses-interpretations-entreprises': 'ANALYSES',
      '/analyses-interpretations-functions': 'ANALYSES',
      '/forms': 'FORMULAIRES',
      '/questionnaires': 'QUESTIONNAIRES',
      '/applications': 'APPLICATIONS',
      '/organisations': 'ENTREPRISES',
      '/administration': 'ADMINISTRATION',
      '/maturity-model-admin': 'ADMINISTRATION'
    };

    const module = routeToModule[route];
    if (!module) return true; // Route publique

    return hasPermission(module, 'voir');
  }, [user, isAuthenticated, hasPermission]);

  /**
   * ✅ Vérifier si l'utilisateur peut accéder aux modules d'administration
   */
  const canAccessAdminModule = useCallback((module: string): boolean => {
    if (!user || !isAuthenticated) return false;

    const userRole = user.nom_role || user.role;
    
    // Vérifier si l'utilisateur est admin
    if (!isAdmin()) return false;

    return hasPermission(module, 'administrer');
  }, [user, isAuthenticated, hasPermission]);

  /**
   * ✅ Vérifier si l'utilisateur est administrateur
   */
  const isAdmin = useCallback((): boolean => {
    if (!user) return false;
    
    const userRole = user.nom_role || user.role;
    return ['SUPER_ADMINISTRATEUR', 'ADMINISTRATEUR'].includes(userRole);
  }, [user]);

  /**
   * ✅ Vérifier si l'utilisateur est super administrateur
   */
  const isSuperAdmin = useCallback((): boolean => {
    if (!user) return false;
    
    const userRole = user.nom_role || user.role;
    return userRole === 'SUPER_ADMINISTRATEUR';
  }, [user]);

  /**
   * ✅ Obtenir les sous-modules d'administration accessibles
   */
  const getAdminSubModules = useCallback((): string[] => {
    if (!isAdmin()) return [];

    const adminModules = [
      'ADMIN_USERS',
      'ADMIN_PERMISSIONS', 
      'ADMIN_MATURITY',
      'ADMIN_SYSTEM'
    ];

    return adminModules.filter(module => hasPermission(module, 'voir'));
  }, [isAdmin, hasPermission]);

  // Valeur du contexte avec toutes les propriétés requises
  const contextValue: AuthContextType = {
    // Propriétés existantes
    user,
    currentUser: user, // Alias pour compatibilité
    loading,
    login,
    logout,
    register,
    isAuthenticated,
    checkAuthStatus,
    
    // Nouvelles propriétés de permissions
    permissions,
    hasPermission,
    canAccessRoute,
    canAccessAdminModule,
    isAdmin,
    isSuperAdmin,
    getAdminSubModules
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * ✅ Hook pour utiliser le contexte d'authentification
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Exporter les types pour utilisation externe
export type { AuthContextType, RegisterData, User, Permission };