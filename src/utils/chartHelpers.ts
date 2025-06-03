// src/utils/chartHelpers.ts

/**
 * Options communes pour les graphiques Recharts
 */
export const commonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: {
            family: 'Inter var, sans-serif',
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#1e293b',
        bodyColor: '#334155',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        bodyFont: {
          family: 'Inter var, sans-serif'
        },
        titleFont: {
          family: 'Inter var, sans-serif',
          weight: 'bold'
        }
      }
    }
  };
  
  /**
   * Génère des couleurs thématiques avec transparence
   * @param baseColor - Couleur hexadécimale de base
   * @param alpha - Valeur de transparence (0-1)
   * @returns Couleur en format rgba
   */
  export const hexToRgba = (baseColor: string, alpha: number = 1): string => {
    // Extraire les composantes r, g, b du code hexadécimal
    const r = parseInt(baseColor.slice(1, 3), 16);
    const g = parseInt(baseColor.slice(3, 5), 16);
    const b = parseInt(baseColor.slice(5, 7), 16);
  
    // Retourner la chaîne rgba
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  
  /**
   * Palette de couleurs pour les graphiques
   */
  export const CHART_COLORS = {
    primary: '#0ea5e9',
    secondary: '#64748b',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#8b5cf6',
    light: '#f8fafc',
    dark: '#1e293b',
  };
  
  /**
   * Palettes pour différents types de graphiques
   */
  export const colorPalettes = {
    // Palette pour les graphiques à barres et lignes
    bar: [
      CHART_COLORS.primary,
      CHART_COLORS.secondary,
      CHART_COLORS.success,
      CHART_COLORS.warning,
      CHART_COLORS.danger,
      CHART_COLORS.info
    ],
    
    // Palette pour les graphiques en camembert
    pie: [
      CHART_COLORS.primary,
      CHART_COLORS.success,
      CHART_COLORS.warning,
      CHART_COLORS.danger,
      CHART_COLORS.info,
      CHART_COLORS.secondary
    ],
    
    // Palette pour les graphiques radar
    radar: [
      hexToRgba(CHART_COLORS.primary, 0.7),
      hexToRgba(CHART_COLORS.success, 0.7),
      hexToRgba(CHART_COLORS.warning, 0.7)
    ]
  };
  
  /**
   * Calcule les statistiques de base d'un ensemble de valeurs
   * @param values - Tableau de nombres
   * @returns Objet contenant min, max, moyenne, médiane
   */
  export const calculateStats = (values: number[]) => {
    if (!values || values.length === 0) {
      return { min: 0, max: 0, avg: 0, median: 0 };
    }
    
    const sortedValues = [...values].sort((a, b) => a - b);
    const min = sortedValues[0];
    const max = sortedValues[sortedValues.length - 1];
    const sum = sortedValues.reduce((acc, val) => acc + val, 0);
    const avg = sum / sortedValues.length;
    
    // Calcul de la médiane
    const mid = Math.floor(sortedValues.length / 2);
    const median = sortedValues.length % 2 === 0
      ? (sortedValues[mid - 1] + sortedValues[mid]) / 2
      : sortedValues[mid];
      
    return { min, max, avg, median };
  };
  