// src/services/api.ts - Version mise à jour pour le backend déployé
import axios, { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios';
import logger from '../utils/logger';

// Configuration des URLs selon l'environnement
const getAPIBaseURL = (): string => {
  // En production ou quand VITE_API_URL est définie, utiliser la valeur configurée
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Par défaut, utiliser le backend déployé
  return 'https://api-dev.dev-maturity.e-dsin.fr';
};

const API_URL = getAPIBaseURL();
const API_PREFIX = '/api';

console.log('🌐 Configuration API:', {
  baseURL: API_URL,
  environment: import.meta.env.MODE,
  isDev: import.meta.env.DEV,
  customUrl: import.meta.env.VITE_API_URL
});

// Créer une instance d'axios avec la configuration de base
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Ajouter timeout et credentials
  timeout: 30000,
  withCredentials: true,
});

// Intercepteur pour les requêtes
apiClient.interceptors.request.use(
  (config) => {
    // Ajouter un marqueur de temps pour mesurer la durée
    (config as any).metadata = { startTime: Date.now() };
    
    // Récupérer le token d'authentification du localStorage
    const token = localStorage.getItem('auth_token');
    
    // Ajouter le token aux en-têtes si disponible
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Ajouter les headers CORS explicites
    if (config.headers) {
      config.headers['Accept'] = 'application/json';
      config.headers['Cache-Control'] = 'no-cache';
    }
    
    // Logger la requête en toute sécurité
    const logData = {
      method: config.method?.toUpperCase() || 'GET',
      url: config.url || 'unknown',
      baseURL: config.baseURL,
      hasToken: !!token
    };
    
    // Ajouter les données de manière sécurisée en mode dev uniquement
    if (import.meta.env.DEV && config.data) {
      try {
        const dataString = typeof config.data === 'string' 
          ? config.data 
          : JSON.stringify(config.data);
        
        logData['data'] = dataString.substring(0, 500);
      } catch (err) {
        // Ignorer les erreurs de sérialisation
      }
    }
    
    logger.debug(`API Request: ${logData.method} ${logData.url}`, logData);
    
    return config;
  },
  (error) => {
    // Logger l'erreur de requête en toute sécurité
    const errorMessage = error?.message || 'Erreur inconnue de requête API';
    const errorStack = error?.stack || '';
    
    logger.error('Erreur de requête API', {
      message: errorMessage,
      stack: errorStack
    });
    
    return Promise.reject(error);
  }
);

// Intercepteur pour les réponses
apiClient.interceptors.response.use(
  (response) => {
    // Calculer la durée de la requête de manière sécurisée
    const duration = calculateRequestDuration(response.config);
    const url = response.config?.url || 'unknown';
    const method = response.config?.method?.toUpperCase() || 'GET';
    
    // Logger la réponse réussie
    logger.info(`API Response: ${method} ${url} - ${response.status}`, {
      status: response.status,
      statusText: response.statusText || '',
      duration,
      size: response.data ? JSON.stringify(response.data).length : 0,
      url
    });
    
    // Traitement des réponses réussies
    return response;
  },
  (error) => {
    // Préparer les données de l'erreur de manière sécurisée
    const errorData = {
      url: error.config?.url || 'unknown',
      method: error.config?.method?.toUpperCase() || 'UNKNOWN',
      status: error.response?.status,
      statusText: error.response?.statusText || '',
      duration: error.config ? calculateRequestDuration(error.config) : null,
      message: error?.message || 'Erreur inconnue',
      baseURL: error.config?.baseURL
    };
    
    // Gestion spécifique des erreurs
    if (error.response?.status === 401) {
      logger.warn('Session expirée ou non authentifiée', errorData);
      // Nettoyer le token et rediriger vers login
      localStorage.removeItem('auth_token');
      
      // Éviter les redirections infinies
      if (!window.location.pathname.includes('/auth/login')) {
        window.location.href = '/auth/login';
      }
    } else if (error.response?.status === 0 || error.code === 'NETWORK_ERROR') {
      // Erreur de réseau
      logger.error('Erreur de réseau - Backend inaccessible', {
        ...errorData,
        type: 'NETWORK_ERROR',
        backendURL: API_URL
      });
    } else if (error.response?.status >= 500) {
      // Erreur serveur
      logger.error('Erreur serveur backend', {
        ...errorData,
        type: 'SERVER_ERROR'
      });
    } else {
      // Autres erreurs (400, 403, 404, etc.)
      logger.error('Erreur de réponse API', {
        ...errorData,
        // Inclure les données de réponse en développement uniquement
        ...(import.meta.env.DEV && error.response?.data && { 
          response: JSON.stringify(error.response.data).substring(0, 500),
          stack: error?.stack || ''
        })
      });
    }
    
    return Promise.reject(error);
  }
);

// Fonction utilitaire pour normaliser les chemins d'API
const normalizePath = (url: string): string => {
  // Si l'URL commence déjà par API_PREFIX, ne pas l'ajouter à nouveau
  if (url.startsWith(API_PREFIX)) {
    return url;
  }
  
  // Endpoints spéciaux qui ne nécessitent pas /api/ (health checks, etc.)
  const specialEndpoints = ['/health', '/health-simple'];
  if (specialEndpoints.some(endpoint => url.startsWith(endpoint))) {
    return url;
  }
  
  // Pour tous les autres endpoints, ajouter /api/
  const normalizedUrl = `${API_PREFIX}${url.startsWith('/') ? url : `/${url}`}`;
  
  // Debug en développement
  if (import.meta.env.DEV) {
    console.log(`🔄 URL Normalization: "${url}" → "${normalizedUrl}"`);
  }
  
  return normalizedUrl;
};

// Fonction pour calculer la durée d'une requête de manière sécurisée
const calculateRequestDuration = (config: any): number => {
  try {
    if (config?.metadata?.startTime) {
      return Date.now() - config.metadata.startTime;
    }
  } catch (err) {
    // Ignorer les erreurs
  }
  return 0;
};

// Fonctions de wrapper pour mesurer les performances et gérer les exceptions
const withPerformanceLogging = async <T>(
  method: string,
  url: string,
  operation: () => Promise<T>,
  extraDetails: Record<string, any> = {}
): Promise<T> => {
  const normalizedUrl = normalizePath(url);
  const startTime = performance.now();
  
  try {
    const result = await operation();
    const duration = performance.now() - startTime;
    
    // Logger le succès uniquement si la durée est anormalement longue
    if (duration > 2000) { // Plus de 2 secondes
      logger.warn(`API Performance: ${method} ${normalizedUrl} - ${Math.round(duration)}ms (SLOW)`, {
        ...extraDetails,
        duration,
        baseURL: API_URL
      });
    }
    
    return result;
  } catch (error) {
    // L'erreur est déjà loggée dans l'intercepteur de réponse
    throw error;
  }
};

// Test de connectivité
export const testConnection = async (): Promise<boolean> => {
  try {
    await apiClient.get('/health', { timeout: 5000 });
    logger.info('✅ Test de connectivité réussi', { backendURL: API_URL });
    return true;
  } catch (error) {
    logger.error('❌ Test de connectivité échoué', { 
      backendURL: API_URL,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
};

// Service API avec gestion des erreurs améliorée
const api = {
  /**
   * Test de connectivité au backend
   */
  testConnection,

  /**
   * Récupère l'URL de base configurée
   */
  getBaseURL: () => API_URL,

  /**
   * Effectue une requête GET
   * @param url - URL de la requête
   * @param config - Configuration Axios optionnelle
   * @returns Promesse avec les données de la réponse
   */
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const normalizedUrl = normalizePath(url);
    return withPerformanceLogging<T>(
      'GET',
      normalizedUrl,
      () => apiClient.get<T>(normalizedUrl, config).then((response: AxiosResponse<T>) => response.data),
      { params: config?.params }
    );
  },
  
  /**
   * Effectue une requête POST
   * @param url - URL de la requête
   * @param data - Données à envoyer
   * @param config - Configuration Axios optionnelle
   * @returns Promesse avec les données de la réponse
   */
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const normalizedUrl = normalizePath(url);
    return withPerformanceLogging<T>(
      'POST',
      normalizedUrl,
      () => apiClient.post<T>(normalizedUrl, data, config).then((response: AxiosResponse<T>) => response.data),
      { dataSize: data ? JSON.stringify(data).length : 0 }
    );
  },
  
  /**
   * Effectue une requête PUT
   * @param url - URL de la requête
   * @param data - Données à envoyer
   * @param config - Configuration Axios optionnelle
   * @returns Promesse avec les données de la réponse
   */
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const normalizedUrl = normalizePath(url);
    return withPerformanceLogging<T>(
      'PUT',
      normalizedUrl,
      () => apiClient.put<T>(normalizedUrl, data, config).then((response: AxiosResponse<T>) => response.data),
      { dataSize: data ? JSON.stringify(data).length : 0 }
    );
  },
  
  /**
   * Effectue une requête PATCH
   * @param url - URL de la requête
   * @param data - Données à envoyer
   * @param config - Configuration Axios optionnelle
   * @returns Promesse avec les données de la réponse
   */
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const normalizedUrl = normalizePath(url);
    return withPerformanceLogging<T>(
      'PATCH',
      normalizedUrl,
      () => apiClient.patch<T>(normalizedUrl, data, config).then((response: AxiosResponse<T>) => response.data),
      { dataSize: data ? JSON.stringify(data).length : 0 }
    );
  },
  
  /**
   * Effectue une requête DELETE
   * @param url - URL de la requête
   * @param config - Configuration Axios optionnelle
   * @returns Promesse avec les données de la réponse
   */
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const normalizedUrl = normalizePath(url);
    return withPerformanceLogging<T>(
      'DELETE',
      normalizedUrl,
      () => apiClient.delete<T>(normalizedUrl, config).then((response: AxiosResponse<T>) => response.data),
      {}
    );
  },
  
  /**
   * Effectue une requête de téléchargement de fichier (en blob)
   * @param url - URL de la requête
   * @param config - Configuration Axios optionnelle
   * @returns Promesse avec les données blob de la réponse
   */
  downloadFile: (url: string, config?: AxiosRequestConfig): Promise<Blob> => {
    const normalizedUrl = normalizePath(url);
    return withPerformanceLogging<Blob>(
      'GET',
      normalizedUrl,
      () => apiClient.get(normalizedUrl, { 
        ...config,
        responseType: 'blob' 
      }).then(response => response.data),
      { responseType: 'blob' }
    );
  },
  
  /**
   * Effectue un téléversement de fichier
   * @param url - URL de la requête
   * @param formData - FormData contenant le fichier
   * @param config - Configuration Axios optionnelle
   * @returns Promesse avec les données de la réponse
   */
  uploadFile: <T = any>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> => {
    const normalizedUrl = normalizePath(url);
    return withPerformanceLogging<T>(
      'POST',
      normalizedUrl,
      () => apiClient.post<T>(normalizedUrl, formData, {
        ...config,
        headers: {
          ...config?.headers,
          'Content-Type': 'multipart/form-data'
        }
      }).then(response => response.data),
      { formDataEntries: Array.from(formData.keys()).join(',') }
    );
  }
};

export default api;