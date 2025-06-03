// src/services/api.ts
import axios, { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios';
import logger from '../utils/logger';

// Utiliser import.meta.env pour Vite
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_PREFIX = '/api';

// Créer une instance d'axios avec la configuration de base
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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
    
    // Logger la requête en toute sécurité
    const logData = {
      method: config.method?.toUpperCase() || 'GET',
      url: config.url || 'unknown'
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
      message: error?.message || 'Erreur inconnue'
    };
    
    // Si token expiré ou non valide (statut 401), redirection vers la page de connexion
    if (error.response && error.response.status === 401) {
      logger.warn('Session expirée ou non authentifiée', errorData);
      // Redirection vers la page de connexion
      localStorage.removeItem('auth_token');
      window.location.href = '/auth/login';
    } else {
      // Logger d'autres erreurs
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
  // Sinon, s'assurer que le chemin commence par /
  return `${API_PREFIX}${url.startsWith('/') ? url : `/${url}`}`;
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
    if (duration > 1000) { // Plus d'une seconde
      logger.info(`API Performance: ${method} ${normalizedUrl} - ${Math.round(duration)}ms`, {
        ...extraDetails,
        duration
      });
    }
    
    return result;
  } catch (error) {
    // L'erreur est déjà loggée dans l'intercepteur de réponse
    throw error;
  }
};

// Service API
const api = {
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