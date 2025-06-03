// src/services/interpretationService.ts
import { pool } from '../../server/db/dbConnection';

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

/**
 * Service d'interprétation des résultats d'évaluation de maturité
 */
export class InterpretationService {
  /**
   * Récupère l'interprétation globale pour une analyse
   * @param idAnalyse Identifiant de l'analyse
   * @returns Interprétation globale
   */
  public async getInterpretationGlobale(idAnalyse: string): Promise<InterpretationResult | null> {
    try {
      const [rows] = await pool.query(
        `SELECT 
          ma.score_global as score,
          gi.niveau,
          gi.description,
          gi.recommandations
        FROM 
          maturity_analyses ma
        JOIN 
          grille_interpretation gi ON 
            gi.fonction = 'DevSecOps' AND 
            ma.score_global BETWEEN gi.score_min AND gi.score_max
        WHERE 
          ma.id_analyse = ?`,
        [idAnalyse]
      );

      if ((rows as any[]).length === 0) {
        return null;
      }

      return {
        niveau: (rows as any[])[0].niveau,
        description: (rows as any[])[0].description,
        recommandations: (rows as any[])[0].recommandations,
        score: (rows as any[])[0].score
      };
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'interprétation globale:', error);
      throw error;
    }
  }

  /**
   * Récupère l'interprétation par thématique pour une analyse
   * @param idAnalyse Identifiant de l'analyse
   * @returns Liste des résultats par thématique
   */
  public async getInterpretationThematiques(idAnalyse: string): Promise<ThematiqueResult[]> {
    try {
      const [rows] = await pool.query(
        `SELECT 
          ts.thematique,
          ts.score,
          gi.niveau,
          gi.description,
          gi.recommandations
        FROM 
          thematique_scores ts
        LEFT JOIN 
          grille_interpretation gi ON 
            gi.fonction = 'DevSecOps-Thematique' AND 
            gi.niveau LIKE CONCAT(ts.thematique, ' - %') AND
            ts.score BETWEEN gi.score_min AND gi.score_max
        WHERE 
          ts.id_analyse = ?
        ORDER BY 
          ts.thematique`,
        [idAnalyse]
      );

      return (rows as any[]).map(row => ({
        thematique: row.thematique,
        score: row.score,
        niveau: row.niveau || undefined,
        description: row.description || undefined,
        recommandations: row.recommandations || undefined
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'interprétation par thématique:', error);
      throw error;
    }
  }

  /**
   * Récupère l'analyse complète pour une application
   * @param idApplication Identifiant de l'application
   * @returns Analyse complète avec interprétation
   */
  public async getAnalyseComplete(idApplication: string): Promise<AnalyseComplete | null> {
    try {
      // 1. Récupérer la dernière analyse pour l'application
      const [analyses] = await pool.query(
        `SELECT 
          id_analyse, 
          score_global, 
          date_analyse
        FROM 
          maturity_analyses
        WHERE 
          id_application = ?
        ORDER BY 
          date_analyse DESC
        LIMIT 1`,
        [idApplication]
      );

      if ((analyses as any[]).length === 0) {
        return null;
      }

      const analyse = (analyses as any[])[0];
      const idAnalyse = analyse.id_analyse;

      // 2. Récupérer les informations de l'application
      const [applications] = await pool.query(
        `SELECT 
          id_application, 
          nom_application
        FROM 
          applications
        WHERE 
          id_application = ?`,
        [idApplication]
      );

      if ((applications as any[]).length === 0) {
        return null;
      }

      const application = (applications as any[])[0];

      // 3. Récupérer l'interprétation globale
      const interpretationGlobale = await this.getInterpretationGlobale(idAnalyse);

      // 4. Récupérer les résultats par thématique
      const thematiques = await this.getInterpretationThematiques(idAnalyse);

      return {
        idAnalyse: idAnalyse,
        idApplication: application.id_application,
        nomApplication: application.nom_application,
        scoreGlobal: analyse.score_global,
        interpretation: interpretationGlobale || {
          niveau: 'Non disponible',
          description: 'Interprétation non disponible',
          recommandations: 'Aucune recommandation disponible',
          score: analyse.score_global
        },
        thematiques: thematiques,
        dateAnalyse: new Date(analyse.date_analyse)
      };
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'analyse complète:', error);
      throw error;
    }
  }

  /**
   * Récupère les analyses pour toutes les applications d'une organisation
   * @param organisation Nom de l'organisation
   * @returns Liste des analyses par application
   */
  public async getAnalysesOrganisation(organisation: string): Promise<AnalyseComplete[]> {
    try {
      // 1. Récupérer toutes les applications de l'organisation
      const [applications] = await pool.query(
        `SELECT 
          a.id_application
        FROM 
          applications a
        JOIN 
          formulaires f ON a.id_application = f.id_application
        JOIN 
          acteurs ac ON f.id_acteur = ac.id_acteur
        WHERE 
          ac.organisation = ?
        GROUP BY 
          a.id_application`,
        [organisation]
      );

      // 2. Récupérer les analyses pour chaque application
      const analyses: AnalyseComplete[] = [];
      for (const app of (applications as any[])) {
        const analyse = await this.getAnalyseComplete(app.id_application);
        if (analyse) {
          analyses.push(analyse);
        }
      }

      return analyses;
    } catch (error) {
      console.error('Erreur lors de la récupération des analyses par organisation:', error);
      throw error;
    }
  }

  /**
   * Calcule le niveau de maturité moyen par thématique pour une organisation
   * @param organisation Nom de l'organisation
   * @returns Scores moyens par thématique
   */
  public async getScoresMoyensOrganisation(organisation: string): Promise<ThematiqueResult[]> {
    try {
      const [rows] = await pool.query(
        `SELECT 
          ts.thematique,
          AVG(ts.score) as score_moyen
        FROM 
          thematique_scores ts
        JOIN 
          maturity_analyses ma ON ts.id_analyse = ma.id_analyse
        JOIN 
          applications a ON ma.id_application = a.id_application
        JOIN 
          formulaires f ON a.id_application = f.id_application
        JOIN 
          acteurs ac ON f.id_acteur = ac.id_acteur
        WHERE 
          ac.organisation = ?
        GROUP BY 
          ts.thematique
        ORDER BY 
          ts.thematique`,
        [organisation]
      );

      return (rows as any[]).map(row => ({
        thematique: row.thematique,
        score: row.score_moyen
      }));
    } catch (error) {
      console.error('Erreur lors du calcul des scores moyens par organisation:', error);
      throw error;
    }
  }

  /**
   * Enrichit les données d'analyse pour préparer l'interface avec un LLM
   * (à développer dans une phase ultérieure)
   */
  public enrichirDonneesLLM(analyse: AnalyseComplete): any {
    // Structure pour intégration future avec un LLM
    return {
      contexte: {
        application: analyse.nomApplication,
        scoreGlobal: analyse.scoreGlobal,
        niveauMaturite: analyse.interpretation.niveau,
        date: analyse.dateAnalyse.toISOString().split('T')[0]
      },
      interpretation: {
        globale: {
          niveau: analyse.interpretation.niveau,
          description: analyse.interpretation.description
        },
        thematiques: analyse.thematiques.map(t => ({
          nom: t.thematique,
          score: t.score,
          interpretation: t.description || 'Non disponible'
        }))
      },
      recommandations: {
        globales: analyse.interpretation.recommandations,
        specifiques: analyse.thematiques
          .filter(t => t.recommandations)
          .map(t => ({
            thematique: t.thematique,
            recommandation: t.recommandations
          }))
      }
    };
  }
}

export default new InterpretationService();