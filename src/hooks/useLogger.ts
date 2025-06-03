// src/hooks/useLogger.ts
import { useEffect, useCallback, useContext, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import logger from '../utils/logger';
// Importez le contexte d'authentification si disponible
// import { AuthContext } from '../contexts/AuthContext';

/**
 * Hook personnalisé pour accéder au logger dans les composants React
 * et capturer automatiquement les changements de page
 */
export const useLogger = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // const authContext = useContext(AuthContext); // Décommenter si vous utilisez un contexte d'auth
  
  // Décoration du logger avec les informations utilisateur si disponible
  const enhancedLogger = useMemo(() => {
    const userId = localStorage.getItem('userId'); // ou authContext?.user?.id
    
    // Créer une version enrichie du logger qui ajoute automatiquement le userId aux détails
    const wrapLogMethod = (method: keyof typeof logger) => {
      return (message: string, details: Record<string, any> = {}) => {
        logger[method](message, {
          userId,
          ...details,
        });
      };
    };
    
    return {
      debug: wrapLogMethod('debug'),
      info: wrapLogMethod('info'),
      warn: wrapLogMethod('warn'),
      error: wrapLogMethod('error'),
      
      // Méthodes spécifiques
      logUserAction: (action: string, details: Record<string, any> = {}) => {
        logger.logUserAction(action, {
          userId,
          ...details,
        });
      },
      
      logNavigation: (path: string, details: Record<string, any> = {}) => {
        logger.logNavigation(path, {
          userId,
          previousPath: location.pathname,
          ...details,
        });
      },
      
      logPerformance: (operation: string, durationMs: number, details: Record<string, any> = {}) => {
        logger.logPerformance(operation, durationMs, {
          userId,
          ...details,
        });
      },
      
      // Fonction utilitaire pour mesurer les performances
      measurePerformance: async (operation: string, fn: () => Promise<any> | any, details: Record<string, any> = {}) => {
        const startTime = performance.now();
        try {
          const result = await fn();
          const duration = performance.now() - startTime;
          logger.logPerformance(operation, duration, {
            userId,
            success: true,
            ...details,
          });
          return result;
        } catch (error) {
          const duration = performance.now() - startTime;
          logger.error(`Erreur dans ${operation}`, {
            userId,
            duration,
            error: error instanceof Error ? error.message : String(error),
            ...details,
          });
          throw error;
        }
      },
    };
  }, [location.pathname]);
  
  // Enregistrer les changements de page
  useEffect(() => {
    logger.logNavigation(location.pathname, {
      search: location.search,
      hash: location.hash,
    });
    
    // Vous pouvez ajouter des métriques de performance ici
    // Par exemple, mesurer le temps de chargement de la page
    const pageLoadTime = performance.now() - (window as any).initialLoadTime || 0;
    if (pageLoadTime > 0) {
      logger.logPerformance('page-load', pageLoadTime, {
        path: location.pathname,
      });
    }
    
    // Réinitialiser le temps de chargement pour la navigation suivante
    (window as any).initialLoadTime = performance.now();
  }, [location.pathname, location.search, location.hash]);
  
  // Navigation instrumentée
  const instrumentedNavigate = useCallback(
    (to: string, options?: any) => {
      // Logger avant la navigation
      logger.logUserAction('navigate', {
        from: location.pathname,
        to,
        options,
      });
      
      // Effectuer la navigation
      navigate(to, options);
    },
    [navigate, location.pathname]
  );
  
  return {
    ...enhancedLogger,
    instrumentedNavigate,
  };
};

export default useLogger;