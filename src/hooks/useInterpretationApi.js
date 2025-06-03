// src/hooks/useInterpretationApi.js
import { useApi } from './useApi';

// Types de réponse attendus par l'API d'interprétation
const responseTypes = {
  GLOBAL: 'global',
  THEMATIQUE: 'thematique',
  APPLICATION: 'application',
  ORGANISATION: 'organisation'
};

export const useInterpretationApi = () => {
  const api = useApi();
  
  // Récupérer l'interprétation globale pour une analyse
  const getInterpretationGlobale = async (idAnalyse) => {
    try {
      return await api.get(`/api/interpretation/analyse/${idAnalyse}`);
    } catch (error) {
      console.error(`Erreur lors de la récupération de l'interprétation globale pour l'analyse ${idAnalyse}:`, error);
      throw error;
    }
  };
  
  // Récupérer l'interprétation par thématique pour une analyse
  const getInterpretationThematiques = async (idAnalyse) => {
    try {
      return await api.get(`/api/interpretation/thematiques/${idAnalyse}`);
    } catch (error) {
      console.error(`Erreur lors de la récupération des thématiques pour l'analyse ${idAnalyse}:`, error);
      throw error;
    }
  };
  
  // Récupérer l'analyse complète pour une application
  const getAnalyseApplication = async (idApplication) => {
    try {
      return await api.get(`/api/interpretation/application/${idApplication}`);
    } catch (error) {
      console.error(`Erreur lors de la récupération de l'analyse pour l'application ${idApplication}:`, error);
      throw error;
    }
  };
  
  // Récupérer les analyses pour toutes les applications d'une organisation
  const getAnalysesOrganisation = async (nomOrganisation) => {
    try {
      return await api.get(`/api/interpretation/organisation/${nomOrganisation}`);
    } catch (error) {
      console.error(`Erreur lors de la récupération des analyses pour l'organisation ${nomOrganisation}:`, error);
      
      // Si les données réelles ne sont pas disponibles, retourner des données fictives
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Retour de données fictives pour le développement');
        return getMockAnalysesOrganisation(nomOrganisation);
      }
      
      throw error;
    }
  };
  
  // Calculer le niveau de maturité moyen par thématique pour une organisation
  const getScoresMoyensOrganisation = async (nomOrganisation) => {
    try {
      return await api.get(`/api/interpretation/organisation/${nomOrganisation}/scores-moyens`);
    } catch (error) {
      console.error(`Erreur lors du calcul des scores moyens pour l'organisation ${nomOrganisation}:`, error);
      
      // Si les données réelles ne sont pas disponibles, retourner des données fictives
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Retour de données fictives pour le développement');
        return getMockScoresMoyensOrganisation(nomOrganisation);
      }
      
      throw error;
    }
  };
  
  // Enrichir les données d'analyse pour préparer l'interface avec un LLM
  const prepareDonneesLLM = async (idApplication) => {
    try {
      return await api.get(`/api/interpretation/llm/application/${idApplication}`);
    } catch (error) {
      console.error(`Erreur lors de la préparation des données LLM pour l'application ${idApplication}:`, error);
      throw error;
    }
  };
  
  // Données fictives pour le développement - À déplacer dans un fichier séparé
  const getMockAnalysesOrganisation = (nomOrganisation) => {
    return [
      {
        idAnalyse: '1',
        idApplication: '1',
        nomApplication: 'CRM',
        scoreGlobal: 385,
        interpretation: {
          niveau: 'Avancé',
          description: 'Votre application présente un bon niveau de maturité DevSecOps.',
          recommandations: 'Continuer à renforcer l\'automatisation des tests.',
          score: 385
        },
        thematiques: [
          { thematique: 'Sécurité', score: 80 },
          { thematique: 'Automatisation', score: 75 },
          { thematique: 'Monitoring', score: 65 },
          { thematique: 'Architecture', score: 90 },
          { thematique: 'Collaboration', score: 75 }
        ],
        dateAnalyse: new Date('2025-04-10')
      },
      {
        idAnalyse: '2',
        idApplication: '2',
        nomApplication: 'ERP',
        scoreGlobal: 310,
        interpretation: {
          niveau: 'Intermédiaire',
          description: 'Votre application présente un niveau moyen de maturité DevSecOps.',
          recommandations: 'Renforcer l\'intégration des tests de sécurité dans le pipeline CI/CD.',
          score: 310
        },
        thematiques: [
          { thematique: 'Sécurité', score: 60 },
          { thematique: 'Automatisation', score: 65 },
          { thematique: 'Monitoring', score: 55 },
          { thematique: 'Architecture', score: 70 },
          { thematique: 'Collaboration', score: 60 }
        ],
        dateAnalyse: new Date('2025-04-05')
      }
    ];
  };
  
  const getMockScoresMoyensOrganisation = (nomOrganisation) => {
    return [
      { thematique: 'Sécurité', score: 70 },
      { thematique: 'Automatisation', score: 70 },
      { thematique: 'Monitoring', score: 60 },
      { thematique: 'Architecture', score: 80 },
      { thematique: 'Collaboration', score: 68 }
    ];
  };
  
  return {
    getInterpretationGlobale,
    getInterpretationThematiques,
    getAnalyseApplication,
    getAnalysesOrganisation,
    getScoresMoyensOrganisation,
    prepareDonneesLLM
  };
};