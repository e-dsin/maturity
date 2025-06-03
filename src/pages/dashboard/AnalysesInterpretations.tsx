// src/pages/dashboard/AnalysesInterpretations.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  Application,
  Analyse,
  Interpretation,
  HistoriqueScore,
  Thematique,
  Entreprise,
  InterpretationSummary,
  FilterState
} from '../../types/AnalysesTypes';
import { normalizeAnalyse } from '../../utils/AnalyseUtils';
import { AnalysesInterpretationsUI } from '../../components/dashboard/AnalysesInterpretationsUI';

const AnalysesInterpretations: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  
  // États de chargement et erreurs
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // États principaux liés aux données
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<string>('');
  const [analyses, setAnalyses] = useState<Analyse[]>([]);
  const [selectedAnalyse, setSelectedAnalyse] = useState<Analyse | null>(null);
  const [interpretation, setInterpretation] = useState<Interpretation | null>(null);
  const [historique, setHistorique] = useState<HistoriqueScore[]>([]);
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [selectedEntreprise, setSelectedEntreprise] = useState<string>('');

  // États d'interface utilisateur
  const [tabValue, setTabValue] = useState<number>(0);
  const [selectedThematique, setSelectedThematique] = useState<string>('');
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [newAnalyseData, setNewAnalyseData] = useState<{ id_application: string, thematiques: Thematique[] }>({
    id_application: '',
    thematiques: []
  });
  const [interpretationsSummary, setInterpretationsSummary] = useState<InterpretationSummary[]>([]);
  
  // États pour la pagination et le tri du tableau
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [orderBy, setOrderBy] = useState<keyof InterpretationSummary>('date_analyse');
  
  // États pour le filtrage
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    application: '',
    niveau: '',
    organisation: '',
    scoreMin: '',
    scoreMax: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Préparation des données dérivées
  const filteredHistorique = selectedThematique
    ? historique.filter(item => item.thematique === selectedThematique)
    : historique;
  
  const uniqueThematiques = [...new Set(historique.map(item => item.thematique))];

  // Fonctions de chargement des données
  
  // Charger toutes les interprétations
  const fetchAllInterpretations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Récupérer toutes les interprétations
      const interpretationsResponse = await api.get('interpretations');
      
      // Récupérer tous les mappings application-entreprise
      // si l'API ne fournit pas directement cette relation
      const appEntrepriseMapResponse = await api.get('applications/entreprise-mapping');
      
      if (Array.isArray(interpretationsResponse)) {
        let interpretationsData = interpretationsResponse;
        
        // Si nous avons un mapping application-entreprise, l'utiliser pour enrichir les données
        if (appEntrepriseMapResponse && typeof appEntrepriseMapResponse === 'object') {
          // Créer un mapping d'ID d'application à ID d'entreprise
          const appToEntrepriseMap = {};
          
          // Si le mapping est un tableau d'objets avec id_application et id_entreprise
          if (Array.isArray(appEntrepriseMapResponse)) {
            appEntrepriseMapResponse.forEach(mapping => {
              appToEntrepriseMap[mapping.id_application] = mapping.id_entreprise;
            });
          } 
          // Si le mapping est un objet avec des clés d'application et des valeurs d'entreprise
          else {
            Object.keys(appEntrepriseMapResponse).forEach(appId => {
              appToEntrepriseMap[appId] = appEntrepriseMapResponse[appId];
            });
          }
          
          // Enrichir les interprétations avec l'ID d'entreprise
          interpretationsData = interpretationsData.map(interpretation => ({
            ...interpretation,
            id_entreprise: 
              // Utiliser l'ID d'entreprise s'il existe déjà
              interpretation.id_entreprise || 
              // Sinon, le récupérer depuis le mapping
              (appToEntrepriseMap[interpretation.id_application] || ''),
            // Ajouter une organisation par défaut si elle n'existe pas
            organisation: interpretation.organisation || 'DSIN'
          }));
        } else {
          // Si nous n'avons pas de mapping, juste s'assurer que les champs requis existent
          interpretationsData = interpretationsData.map(interpretation => ({
            ...interpretation,
            id_entreprise: interpretation.id_entreprise || '',
            organisation: interpretation.organisation || 'DSIN'
          }));
        }
        
        // Mettre à jour l'état
        setInterpretationsSummary(interpretationsData);
        console.log(`Chargement de ${interpretationsData.length} interprétations`);
      } else {
        console.warn('Format de réponse inattendu pour les interprétations:', interpretationsResponse);
        setInterpretationsSummary([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des interprétations:', error);
      setError('Impossible de charger les interprétations');
      setInterpretationsSummary([]);
    } finally {
      setLoading(false);
    }
  };

  // Charger les applications au démarrage
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [appsResponse, entrepriseResponse] = await Promise.all([
          api.get('applications'),
          api.get('entreprises')
        ]);
  
        if (Array.isArray(appsResponse)) {
          setApplications(appsResponse);
        } else {
          setError('Format de réponse inattendu pour les applications');
          setApplications([]);
        }
  
        if (Array.isArray(entrepriseResponse)) {
          setEntreprises(entrepriseResponse);
        } else {
          setError('Format de réponse inattendu pour les entreprises');
          setEntreprises([]);
        }
  
        // Charger toutes les interprétations sans filtre d'entreprise par défaut
        await fetchAllInterpretations();
        
        // Ne pas définir d'entreprise ou d'application par défaut
        // pour éviter des erreurs de sélection
        setSelectedEntreprise('');
        setSelectedApplication('');
        
      } catch (error) {
        console.error('Erreur lors du chargement des données initiales:', error);
        setError('Impossible de charger les données initiales');
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, []);

  // Gérer le changement d'application sélectionnée
  const handleApplicationChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const appId = event.target.value as string;
    setSelectedApplication(appId);
    fetchAnalysesByApplication(appId);
  };

  // Charger l'historique des scores pour une entreprise
  const fetchHistoriqueByEntreprise = async (entrepriseId: string) => {
    try {
      const response = await api.get(`historique/entreprise/${entrepriseId}`);
      
      if (Array.isArray(response)) {
        setHistorique(response);
        
        // Mettre à jour la liste des thématiques uniques
        const uniqueThemes = [...new Set(response.map(item => item.thematique))];
        console.log(`${uniqueThemes.length} thématiques uniques trouvées dans l'historique de l'entreprise ${entrepriseId}`);
        
        // Si une thématique était déjà sélectionnée mais n'existe pas dans le nouvel ensemble, la réinitialiser
        if (selectedThematique && !uniqueThemes.includes(selectedThematique)) {
          setSelectedThematique('');
        }
      } else {
        console.warn('Format de réponse inattendu pour l\'historique:', response);
        setHistorique([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique pour l\'entreprise:', error);
      setHistorique([]);
    }
  };
  // Charger les analyses par entreprise
  // Fonction fetchAnalysesByEntreprise à ajouter dans AnalysesInterpretations.tsx
  const fetchAnalysesByEntreprise = async (entrepriseId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`analyses/entreprise/${entrepriseId}`);
      
      // Vérifier le format de la réponse
      if (response && typeof response === 'object') {
        console.log('Données d\'entreprise reçues:', response);
        
        // Vérifier si l'objet contient un tableau d'analyses
        if (response.analyses && Array.isArray(response.analyses)) {
          const normalizedAnalyses = response.analyses.map(normalizeAnalyse);
          setAnalyses(normalizedAnalyses);
          
          if (normalizedAnalyses.length > 0) {
            const latestAnalyse = normalizedAnalyses[0];
            setSelectedAnalyse(latestAnalyse);
            fetchInterpretation(latestAnalyse.id_analyse);
          } else {
            setSelectedAnalyse(null);
            setInterpretation(null);
          }
        } else {
          // Si l'objet ne contient pas d'analyses, créer un tableau vide
          console.warn('Aucune analyse trouvée dans la réponse de l\'API pour l\'entreprise:', entrepriseId);
          setAnalyses([]);
          setSelectedAnalyse(null);
          setInterpretation(null);
        }
        
        // Mettre à jour les applications disponibles pour cette entreprise
        if (response.applications && Array.isArray(response.applications)) {
          // Si vous voulez limiter la liste des applications à celles de l'entreprise sélectionnée
          // setApplications(response.applications);
          console.log(`${response.applications.length} applications trouvées pour l'entreprise ${entrepriseId}`);
        }
      } else if (Array.isArray(response)) {
        // Si la réponse est un tableau (format alternatif)
        const normalizedAnalyses = response.map(normalizeAnalyse);
        setAnalyses(normalizedAnalyses);
        
        if (normalizedAnalyses.length > 0) {
          const latestAnalyse = normalizedAnalyses[0];
          setSelectedAnalyse(latestAnalyse);
          fetchInterpretation(latestAnalyse.id_analyse);
        } else {
          setSelectedAnalyse(null);
          setInterpretation(null);
        }
      } else {
        console.warn('Format de réponse inattendu pour les analyses:', response);
        setAnalyses([]);
        setSelectedAnalyse(null);
        setInterpretation(null);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des analyses pour l\'entreprise:', error);
      setError('Impossible de charger les analyses pour cette entreprise');
      setAnalyses([]);
      setSelectedAnalyse(null);
    } finally {
      setLoading(false);
    }
  };

  // Charger les analyses quand une application est sélectionnée
  const fetchAnalysesByApplication = async (appId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`analyses/application/${appId}`);
      
      if (Array.isArray(response)) {
        const normalizedAnalyses = response.map(normalizeAnalyse);
        setAnalyses(normalizedAnalyses);
        
        if (normalizedAnalyses.length > 0) {
          const latestAnalyse = normalizedAnalyses[0];
          setSelectedAnalyse(latestAnalyse);
          fetchInterpretation(latestAnalyse.id_analyse);
          fetchHistorique(appId);
        } else {
          setSelectedAnalyse(null);
          setInterpretation(null);
          setHistorique([]);
        }
      } else {
        console.warn('Format de réponse inattendu pour les analyses:', response);
        setAnalyses([]);
        setSelectedAnalyse(null);
        setInterpretation(null);
        setHistorique([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des analyses:', error);
      setError('Impossible de charger les analyses');
      setAnalyses([]);
      setSelectedAnalyse(null);
    } finally {
      setLoading(false);
    }
  };

  // Charger l'interprétation pour une analyse
  const fetchInterpretation = async (analyseId: string) => {
    try {
      const response = await api.get(`interpretations/analyse/${analyseId}`);
      
      if (response && typeof response === 'object') {
        const formattedInterpretation: Interpretation = {
          niveau: response.niveau || 'Non évalué',
          description: response.description || 'Aucune description disponible',
          recommandations: response.recommandations || 'Aucune recommandation disponible',
          score: response.score || 0
        };
        
        setInterpretation(formattedInterpretation);
      } else {
        console.warn('Format de réponse inattendu pour l\'interprétation:', response);
        setInterpretation(null);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'interprétation:', error);
      setInterpretation(null);
    }
  };

  // Charger l'historique des scores pour une application
  const fetchHistorique = async (appId: string) => {
    try {
      const response = await api.get(`historique/application/${appId}`);
      if (Array.isArray(response)) {
        setHistorique(response);
      } else {
        console.warn('Format de réponse inattendu pour l\'historique:', response);
        setHistorique([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
      setHistorique([]);
    }
  };

   // Gestionnaires d'événements pour l'interface utilisateur
  
  // Gérer le changement d'entreprise sélectionnée
  const handleEntrepriseChange = (event: React.ChangeEvent<{ value: unknown }>) => {
  const entrepriseId = event.target.value as string;
  setSelectedEntreprise(entrepriseId || '');
  
  // Réinitialiser les données actuelles
  setSelectedAnalyse(null);
  setInterpretation(null);
  
  if (entrepriseId) {
    // Si une entreprise est sélectionnée, charger les données pour cette entreprise
    setLoading(true);
    
    // Récupérer les analyses pour cette entreprise
    fetchAnalysesByEntreprise(entrepriseId);
    
    // Récupérer l'historique pour cette entreprise
    fetchHistoriqueByEntreprise(entrepriseId);
    
    // Filtrer les interprétations pour cette entreprise
    // Cette étape est importante pour mettre à jour le tableau récapitulatif
    const filteredInterpretations = interpretationsSummary.filter(
      item => item.id_entreprise === entrepriseId
    );
    
    console.log(`Filtre entreprise appliqué: ${entrepriseId}, ${filteredInterpretations.length} résultats trouvés`);
    
    // Réinitialiser la pagination
    setPage(0);
  } else {
    // Si "Toutes les entreprises" est sélectionné, charger toutes les analyses
    fetchAllInterpretations();
    setHistorique([]);
    
    // Réinitialiser l'application sélectionnée
    setSelectedApplication('');
  }
  
  // Réinitialiser les filtres supplémentaires
  setFilters({
    application: '',
    niveau: '',
    organisation: '',
    scoreMin: '',
    scoreMax: ''
  });
};

  // Gérer le changement d'analyse sélectionnée
  const handleAnalyseChange = (analyse: Analyse) => {
    const normalizedAnalyse = normalizeAnalyse(analyse);
    setSelectedAnalyse(normalizedAnalyse);
    fetchInterpretation(normalizedAnalyse.id_analyse);
  };

  // Gérer le changement de thématique pour l'historique
  const handleThematiqueChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedThematique(event.target.value as string);
  };

  // Gérer le changement d'onglet
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Ouvrir le dialogue pour créer une nouvelle analyse
  const handleOpenNewAnalyseDialog = () => {
    setNewAnalyseData({
      id_application: selectedApplication,
      thematiques: []
    });
    setOpenDialog(true);
  };

  // Fermer le dialogue
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  // Ajouter une thématique à la nouvelle analyse
  const addThematique = () => {
    setNewAnalyseData({
      ...newAnalyseData,
      thematiques: [
        ...newAnalyseData.thematiques,
        {
          thematique: '',
          score: 0,
          nombre_reponses: 0
        }
      ]
    });
  };

  // Mettre à jour une thématique
  const updateThematique = (index: number, field: keyof Thematique, value: any) => {
    const updatedThematiques = [...newAnalyseData.thematiques];
    updatedThematiques[index] = {
      ...updatedThematiques[index],
      [field]: value
    };
    
    setNewAnalyseData({
      ...newAnalyseData,
      thematiques: updatedThematiques
    });
  };

  // Supprimer une thématique
  const removeThematique = (index: number) => {
    const updatedThematiques = newAnalyseData.thematiques.filter((_, i) => i !== index);
    setNewAnalyseData({
      ...newAnalyseData,
      thematiques: updatedThematiques
    });
  };

  // Créer une nouvelle analyse
  const createNewAnalyse = async () => {
    try {
      await api.post(`analyses`, newAnalyseData);
      fetchAnalysesByApplication(selectedApplication);
      fetchAllInterpretations();
      handleCloseDialog();
    } catch (error) {
      console.error('Erreur lors de la création de l\'analyse:', error);
      setError('Erreur lors de la création de l\'analyse');
    }
  };

  // Calculer une nouvelle analyse
  const calculateNewAnalyse = async () => {
    try {
      await api.post(`analyses/calculer/${selectedApplication}`);
      fetchAnalysesByApplication(selectedApplication);
      fetchAllInterpretations();
    } catch (error) {
      console.error('Erreur lors du calcul de l\'analyse:', error);
      setError('Erreur lors du calcul de l\'analyse');
    }
  };

  // Fonctions utilitaires pour le traitement des données
  
  // Préparer les données pour le graphique d'historique
  const prepareHistoriqueData = () => {
    if (filteredHistorique.length === 0) return [];
    
    const sortedData = [...filteredHistorique].sort((a, b) => {
      try {
        return new Date(a.date_mesure).getTime() - new Date(b.date_mesure).getTime();
      } catch (error) {
        console.error('Erreur lors du tri des données historiques:', error);
        return 0;
      }
    });
    
    return sortedData.map(item => {
      try {
        return {
          date: new Date(item.date_mesure).toLocaleDateString('fr-FR'),
          score: item.score,
          thematique: item.thematique
        };
      } catch (error) {
        console.error('Erreur lors de la préparation des données historiques:', error);
        return {
          date: 'Date inconnue',
          score: item.score || 0,
          thematique: item.thematique || 'Inconnue'
        };
      }
    });
  };

  // Calculer le score global à afficher
  const getScoreGlobal = () => {
    if (!selectedAnalyse) return 'N/A';
    
    const score = selectedAnalyse.score_global !== undefined ? selectedAnalyse.score_global :
                 selectedAnalyse.scoreGlobal !== undefined ? selectedAnalyse.scoreGlobal : null;
    
    return score !== null ? score.toFixed(2) : 'N/A';
  };

  // Fonctions de pagination et de tri pour le tableau
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRequestSort = (property: keyof InterpretationSummary) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Filtrer les données du tableau récapitulatif
  const getFilteredData = () => {
    // Commencer avec toutes les interprétations
    let filteredData = [...interpretationsSummary];
    
    // Filtrer par entreprise si une entreprise est sélectionnée
    if (selectedEntreprise) {
      filteredData = filteredData.filter(row => {
        // Vérifier si l'ID d'entreprise correspond
        // Si l'ID d'entreprise n'est pas disponible directement dans l'objet, nous pouvons
        // utiliser une relation entre applications et entreprises
        return row.id_entreprise === selectedEntreprise;
      });
      
      console.log(`Filtré par entreprise ${selectedEntreprise}: ${filteredData.length} résultats`);
    }
    
    // Appliquer les autres filtres
    filteredData = filteredData.filter(row => {
      // Filtre de recherche
      const searchLower = searchTerm.toLowerCase();
      const appNameMatch = row.nom_application?.toLowerCase().includes(searchLower) || false;
      const niveauMatch = row.niveau_global?.toLowerCase().includes(searchLower) || false;
      const orgMatch = row.organisation?.toLowerCase().includes(searchLower) || false;
      
      if (searchTerm && !appNameMatch && !niveauMatch && !orgMatch) {
        return false;
      }
      
      // Filtres avancés
      if (filters.application && row.nom_application !== filters.application) {
        return false;
      }
      
      if (filters.niveau && row.niveau_global !== filters.niveau) {
        return false;
      }
      
      if (filters.organisation && row.organisation !== filters.organisation) {
        return false;
      }
      
      if (filters.scoreMin && typeof row.score_global === 'number' && 
          row.score_global < parseFloat(filters.scoreMin)) {
        return false;
      }
      
      if (filters.scoreMax && typeof row.score_global === 'number' && 
          row.score_global > parseFloat(filters.scoreMax)) {
        return false;
      }
      
      return true;
    });
    
    // Trier les données
    filteredData.sort((a, b) => {
      const valueA = a[orderBy];
      const valueB = b[orderBy];
      
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return order === 'asc' ? valueA - valueB : valueB - valueA;
      }
      
      // Conversion en chaînes pour la comparaison
      const strA = String(valueA || '');
      const strB = String(valueB || '');
      
      return order === 'asc' 
        ? strA.localeCompare(strB)
        : strB.localeCompare(strA);
    });
    
    // Appliquer la pagination
    return filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  };

  // Obtenir les options uniques pour les filtres déroulants
  const getUniqueValues = (field: keyof InterpretationSummary) => {
    return [...new Set(interpretationsSummary.map(item => item[field]))].filter(Boolean);
  };

  // Rendu du composant avec AnalysesInterpretationsUI
  return (
    <AnalysesInterpretationsUI
    loading={loading}
    error={error}
    applications={applications}
    entreprises={entreprises}
    selectedApplication={selectedApplication}
    selectedEntreprise={selectedEntreprise}
    analyses={analyses}
    selectedAnalyse={selectedAnalyse}
    interpretation={interpretation}
    historique={historique}
    filteredHistorique={filteredHistorique}
    tabValue={tabValue}
    selectedThematique={selectedThematique}
    openDialog={openDialog}
    newAnalyseData={newAnalyseData}
    interpretationsSummary={interpretationsSummary}
    page={page}
    rowsPerPage={rowsPerPage}
    order={order}
    orderBy={orderBy}
    searchTerm={searchTerm}
    filters={filters}
    showFilters={showFilters}
    uniqueThematiques={uniqueThematiques}
    handleApplicationChange={handleApplicationChange}
    handleEntrepriseChange={handleEntrepriseChange}
    handleAnalyseChange={handleAnalyseChange}
    handleThematiqueChange={handleThematiqueChange}
    handleTabChange={handleTabChange}
    handleOpenNewAnalyseDialog={handleOpenNewAnalyseDialog}
    handleCloseDialog={handleCloseDialog}
    addThematique={addThematique}
    updateThematique={updateThematique}
    removeThematique={removeThematique}
    createNewAnalyse={createNewAnalyse}
    calculateNewAnalyse={calculateNewAnalyse}
    getScoreGlobal={getScoreGlobal}
    prepareHistoriqueData={prepareHistoriqueData}
    handleChangePage={handleChangePage}
    handleChangeRowsPerPage={handleChangeRowsPerPage}
    handleRequestSort={handleRequestSort}
    getFilteredData={getFilteredData}
    getUniqueValues={getUniqueValues}
    setSearchTerm={setSearchTerm}
    setFilters={setFilters}
    setShowFilters={setShowFilters}
    fetchAllInterpretations={fetchAllInterpretations}
    fetchAnalysesByApplication={fetchAnalysesByApplication}
    fetchAnalysesByEntreprise={fetchAnalysesByEntreprise}   
    fetchHistoriqueByEntreprise={fetchHistoriqueByEntreprise} 
  />
  );
};

export default AnalysesInterpretations;