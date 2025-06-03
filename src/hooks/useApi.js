// src/hooks/useApi.js
import { useCallback } from 'react';
import axios from 'axios';

// Détecter le mode développement
const isDevelopment = process.env.NODE_ENV === 'development' || import.meta.env.DEV;
// Option pour forcer le mode déconnecté (données fictives)
const OFFLINE_MODE = isDevelopment && (import.meta.env.VITE_OFFLINE_MODE === 'true' || true);

// URL de base de l'API, sans '/api' par défaut pour éviter le doublement
const API_URL = import.meta.env.VITE_API_URL || '';

// Solution temporaire pour le contexte d'authentification
export const useAuthFallback = () => {
  return {
    isAuthenticated: true,
    user: { id: 'dev-user', role: 'admin' },
    login: () => Promise.resolve(true),
    logout: () => {},
    error: null
  };
};

// Adaptateur pour convertir les noms de propriétés snake_case du backend vers camelCase
const snakeToCamel = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  // Traitement des tableaux
  if (Array.isArray(obj)) {
    return obj.map(item => snakeToCamel(item));
  }
  
  // Traitement des objets
  const result = {};
  
  Object.keys(obj).forEach(key => {
    // Convertir snake_case en camelCase
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    
    // Traiter récursivement les valeurs qui sont des objets ou des tableaux
    result[camelKey] = snakeToCamel(obj[key]);
  });
  
  return result;
};

export const useApi = () => {
  // Simuler l'authentification si useAuth n'est pas disponible
  const { isAuthenticated } = { isAuthenticated: true };
  
  // Créer une instance d'axios avec la configuration de base
  const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  // Ajouter un intercepteur pour inclure le token d'authentification
  apiClient.interceptors.request.use(
    (config) => {
      if (isAuthenticated) {
        const token = localStorage.getItem('auth_token');
        if (token && config.headers) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      }
      return config;
    },
    (error) => Promise.reject(error)
  );
  
  // Intercepteur de réponse pour convertir snake_case en camelCase
  apiClient.interceptors.response.use(
    (response) => {
      // Transformer les données de la réponse
      response.data = snakeToCamel(response.data);
      return response;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
  
  // Méthode GET générique avec fallback aux données fictives
  const get = useCallback(async (endpoint, config) => {
    // Si mode déconnecté activé, utiliser directement les données fictives
    if (OFFLINE_MODE) {
      console.log(`[DEV] Mode déconnecté actif - Endpoint: ${endpoint}`);
      const mockData = getMockDataForEndpoint(endpoint);
      return await new Promise(resolve => {
        // Simuler un délai réseau
        setTimeout(() => resolve(mockData), 300);
      });
    }
    
    try {
      const response = await apiClient.get(endpoint, config);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de l'appel GET à ${endpoint}:`, error);
      
      // En mode développement, utiliser des données fictives comme fallback
      if (isDevelopment) {
        console.warn(`Utilisation de données fictives pour ${endpoint}`);
        return getMockDataForEndpoint(endpoint);
      }
      
      throw error;
    }
  }, [apiClient]);
  
  // Méthode POST générique
  const post = useCallback(async (endpoint, data, config) => {
    // Si mode déconnecté activé, simuler une opération réussie
    if (OFFLINE_MODE) {
      console.log(`[DEV] Mode déconnecté actif - POST ${endpoint}`, data);
      return await new Promise(resolve => {
        // Simuler un délai réseau
        setTimeout(() => {
          // Simuler une réponse pour certains endpoints communs
          if (endpoint.includes('/auth/login')) {
            resolve({
              token: 'mock_token_123456',
              user: {
                id: '1',
                name: 'Utilisateur Test',
                email: 'test@example.com',
                role: 'admin'
              }
            });
          } else {
            // Généralement, les opérations POST retournent l'objet créé avec un ID
            resolve({
              id: 'new_' + Date.now(),
              ...data,
              createdAt: new Date().toISOString()
            });
          }
        }, 300);
      });
    }
    
    try {
      const response = await apiClient.post(endpoint, data, config);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de l'appel POST à ${endpoint}:`, error);
      throw error;
    }
  }, [apiClient]);
  
  // Méthode PUT générique
  const put = useCallback(async (endpoint, data, config) => {
    // Si mode déconnecté activé, simuler une opération réussie
    if (OFFLINE_MODE) {
      console.log(`[DEV] Mode déconnecté actif - PUT ${endpoint}`, data);
      return await new Promise(resolve => {
        setTimeout(() => {
          // Pour PUT, on retourne généralement l'objet mis à jour
          resolve({
            ...data,
            updatedAt: new Date().toISOString()
          });
        }, 300);
      });
    }
    
    try {
      const response = await apiClient.put(endpoint, data, config);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de l'appel PUT à ${endpoint}:`, error);
      throw error;
    }
  }, [apiClient]);
  
  // Méthode PATCH générique
  const patch = useCallback(async (endpoint, data, config) => {
    // Si mode déconnecté activé, simuler une opération réussie
    if (OFFLINE_MODE) {
      console.log(`[DEV] Mode déconnecté actif - PATCH ${endpoint}`, data);
      return await new Promise(resolve => {
        setTimeout(() => {
          // Pour PATCH, on retourne généralement l'objet mis à jour partiellement
          resolve({
            // Simuler un ID et autres champs qui ne sont pas modifiés
            id: endpoint.split('/').pop(),
            ...data,
            updatedAt: new Date().toISOString()
          });
        }, 300);
      });
    }
    
    try {
      const response = await apiClient.patch(endpoint, data, config);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de l'appel PATCH à ${endpoint}:`, error);
      throw error;
    }
  }, [apiClient]);
  
  // Méthode DELETE générique
  const deleteMethod = useCallback(async (endpoint, config) => {
    // Si mode déconnecté activé, simuler une opération réussie
    if (OFFLINE_MODE) {
      console.log(`[DEV] Mode déconnecté actif - DELETE ${endpoint}`);
      return await new Promise(resolve => {
        setTimeout(() => {
          // La plupart des API renvoient un message de confirmation ou l'objet supprimé
          resolve({ 
            success: true,
            message: 'Ressource supprimée avec succès',
            id: endpoint.split('/').pop()
          });
        }, 300);
      });
    }
    
    try {
      const response = await apiClient.delete(endpoint, config);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de l'appel DELETE à ${endpoint}:`, error);
      throw error;
    }
  }, [apiClient]);
  
  // Méthode REQUEST générique pour les configurations personnalisées
  const request = useCallback(async (config) => {
    // Si mode déconnecté activé, on détermine le type de requête et on appelle la méthode appropriée
    if (OFFLINE_MODE) {
      const method = config.method?.toLowerCase() || 'get';
      const endpoint = config.url || '/';
      
      console.log(`[DEV] Mode déconnecté actif - ${method.toUpperCase()} ${endpoint}`);
      
      switch (method) {
        case 'get':
          return get(endpoint, config);
        case 'post':
          return post(endpoint, config.data, config);
        case 'put':
          return put(endpoint, config.data, config);
        case 'patch':
          return patch(endpoint, config.data, config);
        case 'delete':
          return deleteMethod(endpoint, config);
        default:
          return get(endpoint, config);
      }
    }
    
    try {
      const response = await apiClient.request(config);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de l'appel personnalisé:`, error);
      throw error;
    }
  }, [apiClient, get, post, put, patch, deleteMethod]);
  
  return {
    get,
    post,
    put,
    patch,
    delete: deleteMethod,
    request
  };
};

// Fonction auxiliaire pour obtenir des données fictives selon l'endpoint
function getMockDataForEndpoint(endpoint) {
  // Analyser l'endpoint pour déterminer les données à retourner
  if (endpoint.includes('/stats/overview')) {
    return {
      totalApplications: 8,
      totalQuestionnaires: 15,
      totalFormulaires: 24,
      completionRate: 67
    };
  }
  
  if (endpoint.includes('/formulaires/recent')) {
    return [
      {
        idFormulaire: '1',
        dateCreation: '2025-04-20',
        dateModification: '2025-04-21',
        statut: 'Validé',
        idActeur: '1',
        acteurNom: 'Jean Dupont',
        idApplication: '1',
        nomApplication: 'CRM Finance',
        idQuestionnaire: '1',
        questionnaireTitle: 'Évaluation DevSecOps',
        thematique: 'DevSecOps'
      },
      {
        idFormulaire: '2',
        dateCreation: '2025-04-18',
        dateModification: '2025-04-19',
        statut: 'Soumis',
        idActeur: '2',
        acteurNom: 'Marie Martin',
        idApplication: '2',
        nomApplication: 'ERP Commercial',
        idQuestionnaire: '2',
        questionnaireTitle: 'Évaluation Agilité',
        thematique: 'Agilité'
      }
    ];
  }
  
  if (endpoint.includes('/questionnaires/stats')) {
    return [
      { idQuestionnaire: '1', fonction: 'Évaluation DevSecOps', thematique: 'DevSecOps', numQuestions: 50, numReponses: 120, numUtilisateurs: 15 },
      { idQuestionnaire: '2', fonction: 'Évaluation Agilité', thematique: 'Agilité', numQuestions: 30, numReponses: 90, numUtilisateurs: 12 }
    ];
  }
  
  if (endpoint.includes('/interpretation/organisation')) {
    if (endpoint.includes('/scores-moyens')) {
      return [
        { thematique: 'Sécurité', score: 70 },
        { thematique: 'Automatisation', score: 65 },
        { thematique: 'Monitoring', score: 60 },
        { thematique: 'Architecture', score: 80 },
        { thematique: 'Collaboration', score: 75 }
      ];
    }
    return [
      {
        idAnalyse: '1',
        idApplication: '1',
        nomApplication: 'CRM Finance',
        scoreGlobal: 375,
        interpretation: {
          niveau: 'Avancé',
          description: 'Bon niveau de maturité',
          recommandations: 'Continuer l\'intégration des tests',
          score: 375
        },
        thematiques: [
          { thematique: 'Sécurité', score: 80 },
          { thematique: 'Automatisation', score: 70 },
          { thematique: 'Monitoring', score: 65 },
          { thematique: 'Architecture', score: 85 },
          { thematique: 'Collaboration', score: 75 }
        ],
        dateAnalyse: new Date('2025-04-15').toISOString()
      },
      {
        idAnalyse: '2',
        idApplication: '2',
        nomApplication: 'ERP Commercial',
        scoreGlobal: 320,
        interpretation: {
          niveau: 'Intermédiaire',
          description: 'Niveau moyen de maturité',
          recommandations: 'Renforcer la sécurité',
          score: 320
        },
        thematiques: [
          { thematique: 'Sécurité', score: 60 },
          { thematique: 'Automatisation', score: 65 },
          { thematique: 'Monitoring', score: 55 },
          { thematique: 'Architecture', score: 75 },
          { thematique: 'Collaboration', score: 65 }
        ],
        dateAnalyse: new Date('2025-04-10').toISOString()
      }
    ];
  }
  
  if (endpoint.includes('/acteurs')) {
    return [
      { idActeur: '1', nomPrenom: 'Jean Dupont', role: 'Admin', organisation: 'Direction Informatique', email: 'jean.dupont@example.com', forms: 12 },
      { idActeur: '2', nomPrenom: 'Marie Martin', role: 'User', organisation: 'Marketing', email: 'marie.martin@example.com', forms: 8 },
      { idActeur: '3', nomPrenom: 'Pierre Bernard', role: 'User', organisation: 'Finance', email: 'pierre.bernard@example.com', forms: 5 },
      { idActeur: '4', nomPrenom: 'Sophie Petit', role: 'User', organisation: 'RH', email: 'sophie.petit@example.com', forms: 3 },
      { idActeur: '5', nomPrenom: 'Thomas Robert', role: 'Admin', organisation: 'Direction Informatique', email: 'thomas.robert@example.com', forms: 15 }
    ];
  }
  
  if (endpoint.includes('/questionnaires')) {
    if (endpoint.includes('/questions')) {
      // Extrait l'ID du questionnaire de l'URL
      const idQuestionnaire = endpoint.split('/').slice(-2)[0];
      return Array(idQuestionnaire === '1' ? 50 : 30).fill(0).map((_, i) => ({
        idQuestion: `${idQuestionnaire}-${i+1}`,
        idQuestionnaire,
        texte: `Question ${i+1}`,
        ponderation: 10,
        ordre: i+1
      }));
    }
    
    return [
      {
        idQuestionnaire: '1',
        fonction: 'Évaluation DevSecOps',
        thematique: 'DevSecOps',
        description: 'Questionnaire complet d\'évaluation de la maturité DevSecOps',
        dateCreation: '2024-01-15',
        numQuestions: 50,
        numReponses: 120,
        numUtilisateurs: 15
      },
      {
        idQuestionnaire: '2',
        fonction: 'Évaluation Agilité',
        thematique: 'Agilité',
        description: 'Évaluation des pratiques Agile',
        dateCreation: '2024-02-10',
        numQuestions: 30,
        numReponses: 90,
        numUtilisateurs: 12
      }
    ];
  }
  
  if (endpoint.includes('/applications')) {
    if (endpoint.includes('/') && endpoint.split('/').length > 2) {
      // Cas d'une application spécifique
      const idApplication = endpoint.split('/').pop();
      return {
        idApplication,
        nomApplication: idApplication === '1' ? 'CRM Finance' : 'ERP Commercial',
        statut: 'Production',
        type: 'Web',
        hebergement: idApplication === '1' ? 'Cloud' : 'On-Premise',
        architectureLogicielle: idApplication === '1' ? 'Microservices' : 'Monolithique',
        dateMiseEnProd: idApplication === '1' ? '2024-01-15' : '2023-06-10',
        editeur: idApplication === '1' ? 'InternalDev' : 'SAP',
        language: idApplication === '1' ? 'JavaScript' : 'Java',
        description: idApplication === '1' 
          ? 'Application de gestion de la relation client pour le département finance' 
          : 'Solution ERP pour la gestion commerciale'
      };
    }
    
    return [
      {
        idApplication: '1',
        nomApplication: 'CRM Finance',
        statut: 'Production',
        type: 'Web',
        hebergement: 'Cloud',
        architectureLogicielle: 'Microservices',
        dateMiseEnProd: '2024-01-15',
        editeur: 'InternalDev',
        language: 'JavaScript',
        description: 'Application de gestion de la relation client pour le département finance'
      },
      {
        idApplication: '2',
        nomApplication: 'ERP Commercial',
        statut: 'Production',
        type: 'Web',
        hebergement: 'On-Premise',
        architectureLogicielle: 'Monolithique',
        dateMiseEnProd: '2023-06-10',
        editeur: 'SAP',
        language: 'Java',
        description: 'Solution ERP pour la gestion commerciale'
      }
    ];
  }
  
  // Par défaut, retourner un tableau vide
  return [];
}

// Hook useInterpretationApi
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
      throw error;
    }
  };
  
  // Calculer le niveau de maturité moyen par thématique pour une organisation
  const getScoresMoyensOrganisation = async (nomOrganisation) => {
    try {
      return await api.get(`/api/interpretation/organisation/${nomOrganisation}/scores-moyens`);
    } catch (error) {
      console.error(`Erreur lors du calcul des scores moyens pour l'organisation ${nomOrganisation}:`, error);
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
  
  return {
    getInterpretationGlobale,
    getInterpretationThematiques,
    getAnalyseApplication,
    getAnalysesOrganisation,
    getScoresMoyensOrganisation,
    prepareDonneesLLM
  };
};