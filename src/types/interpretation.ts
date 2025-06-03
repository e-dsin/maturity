// src/types/interpretation.ts
/**
 * Interface pour les données d'interprétation
 */
export interface InterpretationResult {
    niveau: string;
    description: string;
    recommandations: string;
    score: number;
  }
  
  /**
   * Interface pour les résultats par thématique
   */
  export interface ThematiqueResult {
    thematique: string;
    score: number;
    niveau?: string;
    description?: string;
    recommandations?: string;
  }
  
  /**
   * Interface pour l'analyse complète
   */
  export interface AnalyseComplete {
    idAnalyse: string;
    idApplication: string;
    nomApplication: string;
    scoreGlobal: number;
    interpretation: InterpretationResult;
    thematiques: ThematiqueResult[];
    dateAnalyse: Date;
  }