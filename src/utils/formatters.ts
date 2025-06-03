// src/utils/formatters.ts
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Formate une date en chaîne localisée
 * @param dateString - Date ISO ou objet Date
 * @param formatPattern - Modèle de format (par défaut: dd/MM/yyyy)
 * @returns Chaîne formatée
 */
export const formatDate = (
  dateString: string | Date,
  formatPattern: string = 'dd/MM/yyyy'
): string => {
  if (!dateString) return '';
  
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, formatPattern, { locale: fr });
  } catch (error) {
    console.error('Error formatting date:', error);
    return typeof dateString === 'string' ? dateString : '';
  }
};

/**
 * Formate un nombre avec un séparateur de milliers
 * @param value - Nombre à formater
 * @param fractionDigits - Nombre de décimales
 * @returns Chaîne formatée
 */
export const formatNumber = (
  value: number,
  fractionDigits: number = 0
): string => {
  if (value === undefined || value === null) return '';
  
  try {
    return value.toLocaleString('fr-FR', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    });
  } catch (error) {
    console.error('Error formatting number:', error);
    return value.toString();
  }
};

/**
 * Formate un score sur 5
 * @param score - Score à formater
 * @returns Score formaté avec une décimale
 */
export const formatScore = (score: number): string => {
  if (score === undefined || score === null) return '-';
  
  return `${score.toFixed(1)}/5`;
};

/**
 * Tronque un texte avec une ellipse
 * @param text - Texte à tronquer
 * @param maxLength - Longueur maximale
 * @returns Texte tronqué
 */
export const truncateText = (
  text: string,
  maxLength: number = 30
): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  return `${text.substring(0, maxLength - 3)}...`;
};