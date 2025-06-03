// src/utils/dataHelpers.ts

/**
 * Groupe les données par une clé spécifiée
 * @param data - Tableau d'objets
 * @param key - Clé de regroupement
 * @returns Objet avec les données regroupées
 */
export const groupBy = <T>(data: T[], key: keyof T): Record<string, T[]> => {
    return data.reduce((result, item) => {
      const groupKey = String(item[key]);
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    }, {} as Record<string, T[]>);
  };
  
  /**
   * Calcule la moyenne d'une propriété dans un tableau d'objets
   * @param data - Tableau d'objets
   * @param property - Propriété à moyenner
   * @returns Moyenne calculée
   */
  export const calculateAverage = <T>(data: T[], property: keyof T): number => {
    if (!data || data.length === 0) return 0;
    
    const sum = data.reduce((acc, item) => {
      const value = Number(item[property]);
      return acc + (isNaN(value) ? 0 : value);
    }, 0);
    
    return sum / data.length;
  };
  
  /**
   * Filtre les données par propriété et valeur
   * @param data - Tableau d'objets
   * @param property - Propriété à filtrer
   * @param value - Valeur recherchée
   * @returns Données filtrées
   */
  export const filterByProperty = <T>(data: T[], property: keyof T, value: any): T[] => {
    if (!data) return [];
    return data.filter(item => item[property] === value);
  };