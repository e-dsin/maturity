// src/pages/dashboard/utils/AnalysesUtils.ts
import { Analyse, Thematique } from '../types/AnalysesTypes';

// Fonction pour convertir les thématiques en format pour le RadarChart
export const convertToRadarData = (thematiques: Thematique[] = []) => {
  // Préparer les données pour le radar chart
  return thematiques.map(theme => ({
    thematique: theme.thematique,
    score: theme.score,
    fullMark: 5 // Score maximum possible
  }));
};

// Normaliser l'objet analyse pour gérer les différents formats possibles (camelCase vs snake_case)
export const normalizeAnalyse = (analyse: Analyse): Analyse => {
    // S'assurer que les scores globaux sont des nombres
    const score_global = 
      typeof analyse.score_global === 'number' ? analyse.score_global :
      typeof analyse.score_global === 'string' ? parseFloat(analyse.score_global) :
      typeof analyse.scoreGlobal === 'number' ? analyse.scoreGlobal :
      typeof analyse.scoreGlobal === 'string' ? parseFloat(analyse.scoreGlobal) : 
      null;
    
    // Normaliser les thématiques s'il y en a
    const thematiques = Array.isArray(analyse.thematiques) 
      ? analyse.thematiques.map(theme => ({
          ...theme,
          // S'assurer que le score de la thématique est un nombre
          score: typeof theme.score === 'number' ? theme.score :
                 typeof theme.score === 'string' ? parseFloat(theme.score) : 0,
          // S'assurer que le nombre de réponses est un nombre
          nombre_reponses: typeof theme.nombre_reponses === 'number' ? theme.nombre_reponses :
                          typeof theme.nombre_reponses === 'string' ? parseInt(theme.nombre_reponses, 10) : 0
        }))
      : [];
  
    return {
      ...analyse,
      nom_application: analyse.nom_application || analyse.nom || 'Application inconnue',
      nom: analyse.nom || analyse.nom_application || 'Application inconnue',
      score_global: score_global,
      scoreGlobal: score_global,
      thematiques
    };
  };

// Fonction pour formater la date
export const formatDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString('fr-FR');
  } catch (e) {
    return 'Date inconnue';
  }
};

// src/utils/AnalyseUtils.ts

/**
 * Fonction pour obtenir la couleur MUI en fonction du niveau de maturité
 */
export const getNiveauColor = (niveau: string): "success" | "info" | "warning" | "error" | "default" => {
  // Niveaux numériques
  if (niveau.includes('5') || niveau.includes('Optimisé') || niveau.includes('Avancé')) return 'success';
  if (niveau.includes('4') || niveau.includes('Géré')) return 'success';
  if (niveau.includes('3') || niveau.includes('Mesuré') || niveau.includes('Intermédiaire')) return 'info';
  if (niveau.includes('2') || niveau.includes('Défini')) return 'warning';
  if (niveau.includes('1') || niveau.includes('Initial') || niveau.includes('Faible')) return 'error';
  
  // Niveaux qualitatifs
  if (niveau.includes('Excellent')) return 'success';
  if (niveau.includes('Bon')) return 'info';
  if (niveau.includes('Moyen')) return 'warning';
  if (niveau.includes('Faible')) return 'error';
  
  return 'default';
};


/**
 * Fonction pour calculer le score moyen d'une liste de scores
 */
export const calculateAverageScore = (scores: number[]): number => {
  if (!scores || scores.length === 0) return 0;
  const sum = scores.reduce((a, b) => a + b, 0);
  return sum / scores.length;
};

/**
 * Fonction pour déterminer le niveau global en fonction du score
 */
export const determineNiveauGlobal = (score: number, fonction?: string): string => {
  // Niveaux par défaut
  if (score >= 4.5) return 'Niveau 5 - Optimisé';
  if (score >= 3.5) return 'Niveau 4 - Géré';
  if (score >= 2.5) return 'Niveau 3 - Mesuré';
  if (score >= 1.5) return 'Niveau 2 - Défini';
  return 'Niveau 1 - Initial';
};

/**
 * Fonction pour générer une recommandation basique en fonction du niveau
 */
export const generateBasicRecommendation = (score: number, fonction?: string): string => {
  if (score >= 4.5) {
    return "Maintenir l'excellence par l'innovation continue et le partage des bonnes pratiques avec l'écosystème.";
  }
  if (score >= 3.5) {
    return "Optimiser les processus existants et développer des mécanismes prédictifs.";
  }
  if (score >= 2.5) {
    return "Automatiser davantage les contrôles et améliorer la mesure des performances.";
  }
  if (score >= 1.5) {
    return "Standardiser les processus et renforcer le partage de connaissances entre équipes.";
  }
  return "Établir les fondations avec une sensibilisation et une formation des équipes.";
};