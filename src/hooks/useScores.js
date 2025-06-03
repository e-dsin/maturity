// src/hooks/useScores.js - Hook personnalisé pour gérer les scores
import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

/**
 * Hook personnalisé pour gérer les scores des applications et entreprises
 * @param {string} initialApplicationId - ID d'application initial (optionnel)
 * @param {string} initialEntrepriseId - ID d'entreprise initial (optionnel)
 */
export const useScores = (initialApplicationId = null, initialEntrepriseId = null) => {
  // États
  const [applicationScores, setApplicationScores] = useState([]);
  const [entrepriseScores, setEntrepriseScores] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(initialApplicationId);
  const [selectedEntreprise, setSelectedEntreprise] = useState(initialEntrepriseId);
  const [selectedAnalyse, setSelectedAnalyse] = useState(null);
  const [interpretations, setInterpretations] = useState([]);
  const [historique, setHistorique] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fonction pour récupérer les analyses par application
  const fetchAnalysesByApplication = useCallback(async (appId) => {
    if (!appId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await api.getAnalysesByApplication(appId);
      setApplicationScores(data);
      
      // Sélectionner l'analyse la plus récente
      if (data && data.length > 0) {
        setSelectedAnalyse(data[0]);
        
        // Récupérer l'interprétation pour cette analyse
        const interpretation = await api.getInterpretationByAnalyse(data[0].id_analyse);
        setInterpretations([interpretation]);
        
        // Récupérer l'historique pour cette application
        const historiqueData = await api.getHistoriqueByApplication(appId);
        setHistorique(historiqueData);
      }
      
      setSelectedApplication(appId);
    } catch (err) {
      setError('Erreur lors de la récupération des scores par application');
      console.error('Error fetching application scores:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fonction pour récupérer les analyses par entreprise
  const fetchAnalysesByEntreprise = useCallback(async (entrepriseId) => {
    if (!entrepriseId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await api.getAnalysesByEntreprise(entrepriseId);
      setEntrepriseScores(data);
      
      // Récupérer l'historique pour cette entreprise
      const historiqueData = await api.getHistoriqueByEntreprise(entrepriseId);
      setHistorique(historiqueData);
      
      setSelectedEntreprise(entrepriseId);
    } catch (err) {
      setError('Erreur lors de la récupération des scores par entreprise');
      console.error('Error fetching enterprise scores:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fonction pour calculer un nouveau score pour une application
  const calculateScoreForApplication = useCallback(async (appId) => {
    if (!appId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await api.calculateScoreForApplication(appId);
      // Après le calcul, rafraîchir les analyses pour cette application
      await fetchAnalysesByApplication(appId);
      return true;
    } catch (err) {
      setError('Erreur lors du calcul du score');
      console.error('Error calculating score:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchAnalysesByApplication]);

  // Fonction pour récupérer toutes les interprétations
  const fetchAllInterpretations = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await api.getAllInterpretations();
      setInterpretations(data);
    } catch (err) {
      setError('Erreur lors de la récupération des interprétations');
      console.error('Error fetching interpretations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger les données initiales
  useEffect(() => {
    // Charger toutes les interprétations
    fetchAllInterpretations();
    
    // Si un ID d'application initial est fourni, charger les données pour cette application
    if (initialApplicationId) {
      fetchAnalysesByApplication(initialApplicationId);
    }
    
    // Si un ID d'entreprise initial est fourni, charger les données pour cette entreprise
    if (initialEntrepriseId) {
      fetchAnalysesByEntreprise(initialEntrepriseId);
    }
  }, [initialApplicationId, initialEntrepriseId, fetchAnalysesByApplication, fetchAnalysesByEntreprise, fetchAllInterpretations]);

  return {
    // États
    applicationScores,
    entrepriseScores,
    selectedApplication,
    selectedEntreprise,
    selectedAnalyse,
    interpretations,
    historique,
    loading,
    error,
    
    // Fonctions
    setSelectedApplication,
    setSelectedEntreprise,
    setSelectedAnalyse,
    fetchAnalysesByApplication,
    fetchAnalysesByEntreprise,
    calculateScoreForApplication,
    fetchAllInterpretations
  };
};

export default useScores;