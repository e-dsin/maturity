// src/utils/apiLogger.ts
import logger from './logger';

/**
 * Intercepteur Axios pour logger les requêtes et réponses API
 */

// Type pour les options de l'intercepteur
interface ApiLoggerOptions {
  logRequestData?: boolean;
  logResponseData?: boolean;
  logErrors?: boolean;
  excludePaths?: string[];
}

// Options par défaut
const defaultOptions: ApiLoggerOptions = {
  logRequestData: import.meta.env.DEV, // Uniquement en dev par défaut
  logResponseData: false, // Désactivé par défaut car peut contenir beaucoup de données
  logErrors: true,
  excludePaths: ['/api/logs', '/health'], // Ne pas logger les appels à l'API de logs elle-même
};

/**
 * Crée des intercepteurs Axios pour logger les requêtes et réponses
 * @param axios Instance Axios
 * @param options Options de configuration
 */
export const setupApiLogger = (axios: any, customOptions: Partial<ApiLoggerOptions> = {}) => {
  const options = { ...defaultOptions, ...customOptions };
  
  // Intercepteur de requête
  axios.interceptors.request.use(
    (config: any) => {
      // Ignorer les chemins exclus
      if (options.excludePaths?.some(path => config.url.includes(path))) {
        return config;
      }
      
      // Démarrer le timer pour mesurer la durée
      config.metadata = { startTime: Date.now() };
      
      // Logger la requête
      logger.debug(`API Request: ${config.method.toUpperCase()} ${config.url}`, {
        type: 'api_request',
        method: config.method.toUpperCase(),
        url: config.url,
        headers: config.headers,
        ...(options.logRequestData && { data: config.data }),
      });
      
      return config;
    },
    (error: any) => {
      if (options.logErrors) {
        logger.error('API Request Error', {
          type: 'api_request_error',
          error: error.message,
          stack: error.stack,
        });
      }
      return Promise.reject(error);
    }
  );
  
  // Intercepteur de réponse
  axios.interceptors.response.use(
    (response: any) => {
      // Ignorer les chemins exclus
      if (options.excludePaths?.some(path => response.config.url.includes(path))) {
        return response;
      }
      
      // Calculer la durée
      const duration = response.config.metadata
        ? Date.now() - response.config.metadata.startTime
        : 0;
      
      // Logger la réponse
      logger.logApiCall(
        response.config.url,
        response.config.method.toUpperCase(),
        response.status,
        duration,
        {
          ...(options.logResponseData && { data: response.data }),
        }
      );
      
      return response;
    },
    (error: any) => {
      if (options.logErrors && error.config) {
        // Ignorer les chemins exclus
        if (options.excludePaths?.some(path => error.config.url.includes(path))) {
          return Promise.reject(error);
        }
        
        // Calculer la durée
        const duration = error.config.metadata
          ? Date.now() - error.config.metadata.startTime
          : 0;
        
        // Logger l'erreur
        logger.error('API Response Error', {
          type: 'api_response_error',
          url: error.config.url,
          method: error.config.method.toUpperCase(),
          status: error.response?.status,
          statusText: error.response?.statusText,
          duration,
          message: error.message,
          response: error.response?.data,
        });
      }
      
      return Promise.reject(error);
    }
  );
};

export default { setupApiLogger };