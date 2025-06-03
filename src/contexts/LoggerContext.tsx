// src/contexts/LoggerContext.tsx
import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import logger from '../utils/logger';
import { useLocation } from 'react-router-dom';

// Définir le type pour le contexte
interface LoggerContextType {
  logger: typeof logger;
}

// Créer le contexte avec une valeur par défaut
const LoggerContext = createContext<LoggerContextType | undefined>(undefined);

// Props pour le provider
interface LoggerProviderProps {
  children: ReactNode;
}

/**
 * Provider pour le contexte de logging
 * Permet d'accéder au logger dans tous les composants
 * et capture automatiquement les changements de page
 */
export const LoggerProvider: React.FC<LoggerProviderProps> = ({ children }) => {
  const location = useLocation();
  
  // Initialiser le timing pour mesurer les performances
  useEffect(() => {
    // Définir le temps initial de chargement
    if (typeof window !== 'undefined' && !(window as any).initialPageLoadTime) {
      (window as any).initialPageLoadTime = performance.now();
      
      // Enregistrer les métriques de chargement de la page
      window.addEventListener('load', () => {
        const loadTime = performance.now() - (window as any).initialPageLoadTime;
        logger.logPerformance('initial-page-load', loadTime);
        
        // Capturer les métriques Web Vitals si disponibles
        if ('web-vitals' in window) {
          const webVitals = (window as any)['web-vitals'];
          if (webVitals) {
            webVitals.getCLS((metric: any) => {
              logger.logPerformance('CLS', metric.value, { metric });
            });
            webVitals.getFID((metric: any) => {
              logger.logPerformance('FID', metric.value, { metric });
            });
            webVitals.getLCP((metric: any) => {
              logger.logPerformance('LCP', metric.value, { metric });
            });
          }
        }
      });
    }
  }, []);
  
  // Logger les changements de page
  useEffect(() => {
    // Mesurer le temps de navigation entre les pages
    const navStartTime = performance.now();
    
    return () => {
      const navDuration = performance.now() - navStartTime;
      logger.logNavigation(location.pathname, {
        duration: navDuration,
        search: location.search,
        hash: location.hash
      });
    };
  }, [location.pathname, location.search, location.hash]);
  
  return (
    <LoggerContext.Provider value={{ logger }}>
      {children}
    </LoggerContext.Provider>
  );
};

/**
 * Hook pour accéder au logger dans les composants
 */
export const useLoggerContext = (): LoggerContextType => {
  const context = useContext(LoggerContext);
  if (context === undefined) {
    throw new Error('useLoggerContext doit être utilisé à l\'intérieur d\'un LoggerProvider');
  }
  return context;
};

export default LoggerContext;