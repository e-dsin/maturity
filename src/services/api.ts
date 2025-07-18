// src/services/api.ts - VERSION SIMPLIFIÉE avec méthodes génériques seulement
import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

interface ApiConfig {
  baseURL: string;
  environment: string;
  isDev: boolean;
  customUrl?: string;
}

class ApiService {
  private api: AxiosInstance;
  private config: ApiConfig;

  constructor() {
    // ✅ CORRECTION : Utiliser import.meta.env au lieu de process.env côté client
    const environment = import.meta.env.MODE || 'development';
    const isDev = environment === 'development';
    
    // Configuration API par environnement
    let baseURL: string;
    
    if (isDev) {
      baseURL = import.meta.env.VITE_API_BASE_URL || 'https://api-dev.dev-maturity.e-dsin.fr';
    } else {
      baseURL = import.meta.env.VITE_API_BASE_URL || 'https://api-prod.your-domain.com';
    }

    // Retirer '/api' du baseURL si présent car on l'ajoute dans les intercepteurs
    if (baseURL.endsWith('/api')) {
      baseURL = baseURL.slice(0, -4);
    }

    this.config = {
      baseURL,
      environment,
      isDev,
      customUrl: import.meta.env.VITE_API_BASE_URL
    };

    // ✅ Log de configuration (seulement en développement)
    if (isDev) {
      console.log('🌐 Configuration API:', this.config);
    }

    // Créer l'instance Axios
    this.api = axios.create({
      baseURL: this.config.baseURL,
      timeout: 30000,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Configuration des intercepteurs
    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        // Normaliser l'URL - ajouter /api si pas présent
        if (config.url && !config.url.startsWith('/api/')) {
          const originalUrl = config.url.replace(/^\/+/, '');
          config.url = `/api/${originalUrl}`;
          if (this.config.isDev) {
            console.log(`🔄 URL Normalization: "${originalUrl}" → "${config.url}"`);
          }
        }

        // Ajouter le token d'authentification si disponible
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          if (this.config.isDev) {
            console.log('🔑 Token trouvé, ajouté à la requête');
          }
        }

        // Ajouter metadata pour tracking des performances
        config.metadata = { startTime: Date.now() };

        return config;
      },
      (error) => {
        if (this.config.isDev) {
          console.error('❌ Request Error:', error);
        }
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log des réponses API en développement
        if (this.config.isDev) {
          const duration = response.config.metadata?.startTime 
            ? Date.now() - response.config.metadata.startTime 
            : 0;
          
          console.log(`[INFO] API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`, {
            status: response.status,
            statusText: response.statusText,
            duration,
            size: JSON.stringify(response.data).length,
            url: response.config.url
          });
        }

        return response;
      },
      (error: AxiosError) => {
        // Gestion des erreurs
        if (this.config.isDev) {
          console.error('❌ API Error:', {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            statusText: error.response?.statusText,
            message: error.message,
            data: error.response?.data
          });
        }

        // Gestion spécifique des erreurs d'authentification
        if (error.response?.status === 401) {
          this.handleAuthError();
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Récupérer le token d'authentification
   */
  private getAuthToken(): string | null {
    try {
      return localStorage.getItem('authToken') || 
             sessionStorage.getItem('authToken') || 
             this.getCookieValue('authToken');
    } catch (error) {
      if (this.config.isDev) {
        console.warn('⚠️ Impossible de récupérer le token:', error);
      }
      return null;
    }
  }

  /**
   * Récupérer une valeur de cookie
   */
  private getCookieValue(name: string): string | null {
    try {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) {
        return parts.pop()?.split(';').shift() || null;
      }
    } catch (error) {
      // Ignore cookie errors
    }
    return null;
  }

  /**
   * Gérer les erreurs d'authentification
   */
  private handleAuthError() {
    // Nettoyer les tokens
    this.clearAuthToken();

    if (this.config.isDev) {
      console.warn('🔑 Token expiré, redirection vers /auth/login');
    }
    
    // Utiliser setTimeout pour éviter les problèmes de navigation immédiate
    setTimeout(() => {
      if (window.location.pathname !== '/auth/login') {
        window.location.href = '/auth/login';
      }
    }, 100);
  }

  // ====================================
  // MÉTHODES HTTP GÉNÉRIQUES
  // ====================================

  /**
   * ✅ Requête GET générique
   */
  async get<T = any>(url: string, config?: any): Promise<T> {
    const response = await this.api.get(url, config);
    return response.data;
  }

  /**
   * ✅ Requête POST générique  
   */
  async post<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.api.post(url, data, config);
    return response.data;
  }

  /**
   * ✅ Requête PUT générique
   */
  async put<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.api.put(url, data, config);
    return response.data;
  }

  /**
   * ✅ Requête PATCH générique
   */
  async patch<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.api.patch(url, data, config);
    return response.data;
  }

  /**
   * ✅ Requête DELETE générique
   */
  async delete<T = any>(url: string, config?: any): Promise<T> {
    const response = await this.api.delete(url, config);
    return response.data;
  }

  // ====================================
  // MÉTHODES UTILITAIRES
  // ====================================

  /**
   * Configurer manuellement le token d'authentification
   */
  setAuthToken(token: string): void {
    try {
      localStorage.setItem('authToken', token);
      if (this.config.isDev) {
        console.log('🔑 Token d\'authentification configuré');
      }
    } catch (error) {
      if (this.config.isDev) {
        console.error('❌ Impossible de sauvegarder le token:', error);
      }
    }
  }

  /**
   * Supprimer le token d'authentification
   */
  clearAuthToken(): void {
    try {
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      // Nettoyer aussi les cookies si nécessaire
      document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      if (this.config.isDev) {
        console.log('🔑 Token d\'authentification supprimé');
      }
    } catch (error) {
      if (this.config.isDev) {
        console.error('❌ Impossible de supprimer le token:', error);
      }
    }
  }

  /**
   * Vérifier si l'utilisateur est authentifié (vérification basique)
   */
  isAuthenticated(): boolean {
    const token = this.getAuthToken();
    if (!token) return false;

    try {
      // Vérifier que le token n'est pas expiré (basique)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      return payload.exp > now;
    } catch (error) {
      if (this.config.isDev) {
        console.warn('⚠️ Token invalide:', error);
      }
      return false;
    }
  }

  /**
   * Obtenir la configuration actuelle
   */
  getConfig(): ApiConfig {
    return { ...this.config };
  }

  /**
   * Obtenir l'URL de base
   */
  getBaseURL(): string {
    return this.config.baseURL;
  }

  /**
   * Vérifier si on est en mode développement
   */
  isDevMode(): boolean {
    return this.config.isDev;
  }

  /**
   * Obtenir l'instance Axios brute (pour cas avancés)
   */
  getAxiosInstance(): AxiosInstance {
    return this.api;
  }
}

// Exporter une instance singleton
const api = new ApiService();
export default api;

// Exporter les types pour utilisation externe
export type { ApiConfig };