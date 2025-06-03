// src/utils/dataTransformers.js
// Convertir snake_case en camelCase
export function snakeToCamel(data) {
    if (!data || typeof data !== 'object') return data;
    
    if (Array.isArray(data)) {
      return data.map(item => snakeToCamel(item));
    }
    
    return Object.keys(data).reduce((result, key) => {
      // Transformer la clé en camelCase
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      // Transformer récursivement la valeur si c'est un objet
      const value = data[key];
      result[camelKey] = value && typeof value === 'object' ? snakeToCamel(value) : value;
      return result;
    }, {});
  }
  
  // Vérifier et compléter un objet avec des valeurs par défaut
  export function withDefaults(obj, defaultValues) {
    if (!obj) return defaultValues;
    return { ...defaultValues, ...obj };
  }