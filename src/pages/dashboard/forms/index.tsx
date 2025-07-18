// pages/dashboard/forms/index.tsx - Version corrigée avec sélection d'acteurs fonctionnelle
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Button,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  LinearProgress,
  Card,
  CardContent,
  Snackbar,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Checkbox,
  FormControlLabel,
  FormGroup
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Assignment as AssignmentIcon,
  Add as AddIcon,
  FilterList as FilterIcon,
  Speed as SpeedIcon,
  Send as SendIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Security as SecurityIcon,
  Computer as ComputerIcon,
  Storage as StorageIcon,
  Code as CodeIcon,
  Lightbulb as LightbulbIcon,
  Link as LinkIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import api from '../../../services/api';
import logger from '../../../utils/logger';

// Types pour les formulaires (conservés)
interface Formulaire {
  id_formulaire: string;
  id_acteur: string;
  acteur_nom: string;
  id_application: string;
  nom_application: string;
  id_entreprise: string;
  nom_entreprise: string;
  id_questionnaire: string;
  questionnaire_nom: string;
  thematiques: string[];
  fonctions: string[];
  date_creation: string;
  date_modification: string;
  statut: 'Brouillon' | 'Soumis' | 'Validé';
  progression: number;
  total_questions?: number;
  total_reponses?: number;
  commentaires?: string;
}

// Types pour les évaluations de maturité
interface EvaluationMaturite {
  id_evaluation: string;
  id_entreprise: string;
  nom_entreprise: string;
  id_acteur: string;
  nom_acteur: string;
  email_acteur: string;
  statut: 'EN_COURS' | 'TERMINE' | 'ENVOYE';
  date_debut: string;
  date_soumission?: string;
  date_fin?: string;
  duree_evaluation?: number;
  score_global?: number;
  score_cybersecurite?: number;
  score_maturite_digitale?: number;
  score_gouvernance_donnees?: number;
  score_devsecops?: number;
  score_innovation_numerique?: number;
  niveau_global?: string;
  lien_evaluation?: string;
}

interface Acteur {
  id_acteur: string;
  nom_prenom: string;
  email: string;
  id_entreprise: string;
  poste?: string;
  actif: boolean;
}

interface Entreprise {
  id_entreprise: string;
  nom_entreprise: string;
  secteur_activite?: string;
  taille_entreprise?: string;
  actif: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// ✅ Fonction utilitaire pour conversion sécurisée
const safeParseNumber = (value: any, defaultValue: number = 0): number => {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

// ✅ Fonction pour formater les scores
const formatScore = (score: any): string => {
  const numericScore = safeParseNumber(score);
  return numericScore.toFixed(1);
};

// ✅ Fonction pour calculer la moyenne sécurisée
const calculerScoreMoyen = (evaluations: EvaluationMaturite[]): string => {
  const evaluationsAvecScore = evaluations.filter(evaluation => {
    const score = safeParseNumber(evaluation.score_global);
    return score > 0;
  });
  
  if (evaluationsAvecScore.length === 0) {
    return '0.0';
  }
  
  const somme = evaluationsAvecScore.reduce((sum, evaluation) => {
    return sum + safeParseNumber(evaluation.score_global);
  }, 0);
  
  const moyenne = somme / evaluationsAvecScore.length;
  return moyenne.toFixed(1);
};

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const Forms: React.FC = () => {
  const navigate = useNavigate();
  
  // État pour les onglets
  const [currentTab, setCurrentTab] = useState(0);
  
  // États pour les formulaires (conservés)
  const [formulaires, setFormulaires] = useState<Formulaire[]>([]);
  const [fonctions, setFonctions] = useState<any[]>([]);
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);

  // Etats pour le chargement des acteurs
  const [loadingActeurs, setLoadingActeurs] = useState(false);
  const [acteursError, setActeursError] = useState<string | null>(null);
  
  // États pour les évaluations de maturité
  const [evaluations, setEvaluations] = useState<EvaluationMaturite[]>([]);
  const [acteurs, setActeurs] = useState<Acteur[]>([]);
  
  // États généraux
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // États pour les filtres formulaires (conservés)
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fonctionFilter, setFonctionFilter] = useState('');
  const [entrepriseFilter, setEntrepriseFilter] = useState('');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [orderBy, setOrderBy] = useState('date_modification');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // États pour les filtres évaluations
  const [evalSearchTerm, setEvalSearchTerm] = useState('');
  const [evalStatusFilter, setEvalStatusFilter] = useState('');
  const [evalEntrepriseFilter, setEvalEntrepriseFilter] = useState('');
  const [evalPage, setEvalPage] = useState(0);
  const [evalRowsPerPage, setEvalRowsPerPage] = useState(10);
  
  // États pour la création d'évaluation
  const [createEvalDialog, setCreateEvalDialog] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedEntreprise, setSelectedEntreprise] = useState<string>('');
  const [selectedActeurs, setSelectedActeurs] = useState<string[]>([]);
  const [creatingEvaluation, setCreatingEvaluation] = useState(false);

  // Configuration des fonctions de maturité
  const fonctionsMaturiteConfig = {
    cybersecurite: { label: 'Cybersécurité', icon: SecurityIcon, color: '#d32f2f' },
    maturite_digitale: { label: 'Maturité Digitale', icon: ComputerIcon, color: '#1976d2' },
    gouvernance_donnees: { label: 'Gouvernance Données', icon: StorageIcon, color: '#388e3c' },
    devsecops: { label: 'DevSecOps', icon: CodeIcon, color: '#f57c00' },
    innovation_numerique: { label: 'Innovation Numérique', icon: LightbulbIcon, color: '#7b1fa2' }
  };

  // Chargement des données
  const fetchFormulaires = useCallback(async () => {
    try {
      const response = await api.get('formulaires');
      const formulairesData = Array.isArray(response) ? response : response.data || [];
      
      const normalizedFormulaires = formulairesData.map(form => ({
        id_formulaire: form.id_formulaire,
        id_acteur: form.id_acteur || '',
        acteur_nom: form.acteur_nom || 'Utilisateur inconnu',
        id_application: form.id_application || '',
        nom_application: form.nom_application || 'Application inconnue',
        id_entreprise: form.id_entreprise || '',
        nom_entreprise: form.nom_entreprise || 'Entreprise inconnue',
        id_questionnaire: form.id_questionnaire || '',
        questionnaire_nom: form.questionnaire_nom || form.nom || 'Questionnaire sans nom',
        thematiques: Array.isArray(form.thematiques) ? form.thematiques :
                    (form.thematiques ? form.thematiques.split(',').map(t => t.trim()) : []),
        fonctions: Array.isArray(form.fonctions) ? form.fonctions :
                  (form.fonctions ? form.fonctions.split(',').map(f => f.trim()) : []),
        date_creation: form.date_creation || new Date().toISOString(),
        date_modification: form.date_modification || form.date_creation || new Date().toISOString(),
        statut: form.statut || 'Brouillon',
        progression: Number(form.progression) ?? 0,
        total_questions: form.total_questions || 0,
        total_reponses: form.total_reponses || 0,
        commentaires: form.commentaires || ''
      }));
      
      setFormulaires(normalizedFormulaires);
    } catch (error) {
      console.error('Erreur chargement formulaires:', error);
      setError('Erreur lors du chargement des formulaires');
    }
  }, []);

  const fetchEvaluations = useCallback(async () => {
    try {
      const response = await api.get('maturity-global/evaluations');
      
      const evaluationsData = response.evaluations || [];
      
      const normalizedEvaluations = evaluationsData.map(evaluation => ({
        ...evaluation,
        id_evaluation: evaluation.id_evaluation,
        nom_entreprise: evaluation.nom_entreprise,
        nom_acteur: evaluation.evaluateur_nom,
        email_acteur: evaluation.evaluateur_email,
        statut: evaluation.statut,
        score_global: safeParseNumber(evaluation.score_global),
        score_cybersecurite: safeParseNumber(evaluation.score_cybersecurite),
        score_maturite_digitale: safeParseNumber(evaluation.score_maturite_digitale),
        score_gouvernance_donnees: safeParseNumber(evaluation.score_gouvernance_donnees),
        score_devsecops: safeParseNumber(evaluation.score_devsecops),
        score_innovation_numerique: safeParseNumber(evaluation.score_innovation_numerique),
        date_debut: evaluation.date_debut,
        date_soumission: evaluation.date_soumission,
        duree_evaluation: evaluation.duree_evaluation,
        niveau_global: getNiveauFromScore(evaluation.score_global || 0)
      }));
      
      setEvaluations(normalizedEvaluations);
    } catch (error) {
      console.error('Erreur chargement évaluations:', error);
      if (error.response?.status === 404) {
        setEvaluations([]);
        console.info('Endpoint évaluations de maturité pas encore disponible');
      } else {
        setError('Erreur lors du chargement des évaluations');
      }
    }
  }, []);

  const fetchEntreprises = useCallback(async () => {
    try {
      console.log('🏢 Chargement des entreprises via /api/entreprises...');
      
      const response = await api.get('entreprises');
      console.log('📋 Réponse brute:', response);
      
      let entreprisesData = [];
      
      if (Array.isArray(response)) {
        entreprisesData = response;
      } else if (response.data && Array.isArray(response.data)) {
        entreprisesData = response.data;
      } else if (response && typeof response === 'object') {
        entreprisesData = [response];
      } else {
        console.warn('⚠️ Format de réponse inattendu:', typeof response);
        entreprisesData = [];
      }
      
      console.log(`📊 ${entreprisesData.length} entreprise(s) trouvée(s)`);
      
      const entreprisesActives = entreprisesData.filter(entreprise => {
        const isValid = entreprise && 
                       entreprise.id_entreprise && 
                       entreprise.nom_entreprise;
        
        const isActive = entreprise.actif !== false && 
                        entreprise.actif !== 0 && 
                        entreprise.statut !== 'INACTIF';
        
        return isValid && isActive;
      });
      
      console.log(`✅ ${entreprisesActives.length} entreprise(s) active(s) filtrée(s)`);
      console.log('📋 Entreprises disponibles:', entreprisesActives.map(e => ({
        id: e.id_entreprise,
        nom: e.nom_entreprise,
        secteur: e.secteur,
        actif: e.actif
      })));
      
      setEntreprises(entreprisesActives);
      
    } catch (error) {
      console.error('❌ Erreur chargement entreprises:', error);
      
      if (error.response) {
        console.error('📍 Détails erreur API:', {
          status: error.response.status,
          statusText: error.response.statusText,
          url: error.config?.url,
          data: error.response.data
        });
        
        if (error.response.status === 404) {
          setError('Route /api/entreprises non trouvée. Vérifiez que la route est montée dans server.js');
        } else if (error.response.status === 500) {
          setError('Erreur serveur lors du chargement des entreprises');
        }
      } else if (error.request) {
        console.error('📍 Erreur réseau:', error.request);
        setError('Impossible de contacter le serveur');
      } else {
        console.error('📍 Erreur configuration:', error.message);
        setError('Erreur de configuration API');
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.warn('🔧 Mode développement : utilisation de données de démo');
        setEntreprises([
          {
            id_entreprise: 'demo-entreprise-1',
            nom_entreprise: 'Entreprise Démo 1',
            secteur: 'Technologies',
            taille_entreprise: 'PME',
            actif: true,
            score_global: 3.2
          },
          {
            id_entreprise: 'demo-entreprise-2', 
            nom_entreprise: 'Entreprise Démo 2',
            secteur: 'Services',
            taille_entreprise: 'ETI',
            actif: true,
            score_global: 2.8
          }
        ]);
      }
    }
  }, []);

  // 🔧 FONCTION FETCHACTEURS CORRIGÉE
  const fetchActeurs = useCallback(async (entrepriseId: string) => {
    if (!entrepriseId) {
      setActeurs([]);
      return;
    }

    try {
      setLoadingActeurs(true);
      setActeursError(null);
      
      console.log(`🔍 Chargement des acteurs pour l'entreprise ${entrepriseId}...`);
      
      // 1. Essayer l'endpoint principal
      try {
        const response = await api.get(`acteurs/entreprise/${entrepriseId}`);
        console.log('📋 Réponse endpoint principal:', response);
        
        let acteursData = [];
        if (response.success && Array.isArray(response.data)) {
          acteursData = response.data;
          console.log(`✅ ${response.metadata?.count || acteursData.length} acteur(s) trouvé(s) via endpoint principal`);
        } else if (Array.isArray(response)) {
          acteursData = response;
        } else if (response.data && Array.isArray(response.data)) {
          acteursData = response.data;
        } else {
          console.warn('⚠️ Format de réponse inattendu pour endpoint principal:', response);
          throw new Error('Format de réponse inattendu');
        }
        
        const acteursValides = acteursData.filter(acteur => {
          const isValid = acteur && 
                         acteur.id_acteur && 
                         acteur.nom_prenom && 
                         acteur.email;
          
          const isActive = acteur.actif !== false;
          
          return isValid && isActive;
        });
        
        console.log(`📊 ${acteursValides.length} acteur(s) actif(s) après filtrage`);
        setActeurs(acteursValides);
        return;
        
      } catch (primaryError) {
        console.warn('⚠️ Endpoint principal échoué, tentative fallback 1:', primaryError.message);
        
        // 2. Fallback 1: entreprises/{id}/acteurs
        try {
          const fallbackResponse = await api.get(`entreprises/${entrepriseId}/acteurs`);
          const fallbackData = Array.isArray(fallbackResponse) ? fallbackResponse : fallbackResponse.data || [];
          const acteursActifs = fallbackData.filter(acteur => acteur && acteur.actif !== false);
          
          console.log(`✅ Fallback 1 réussi: ${acteursActifs.length} acteur(s)`);
          setActeurs(acteursActifs);
          return;
          
        } catch (fallback1Error) {
          console.warn('⚠️ Fallback 1 échoué, tentative fallback 2:', fallback1Error.message);
          
          // 3. Fallback 2: récupérer tous les acteurs et filtrer côté client
          try {
            const allActeursResponse = await api.get('acteurs');
            const allActeurs = Array.isArray(allActeursResponse) ? allActeursResponse : allActeursResponse.data || [];
            const filteredActeurs = allActeurs.filter(acteur => 
              acteur && acteur.id_entreprise === entrepriseId && acteur.actif !== false
            );
            
            console.log(`✅ Fallback 2 réussi: ${filteredActeurs.length} acteur(s) filtré(s)`);
            setActeurs(filteredActeurs);
            return;
            
          } catch (fallback2Error) {
            console.error('❌ Tous les fallbacks ont échoué');
            
            // 4. Mode démo en dernier recours
            console.warn('🔧 Mode démo activé pour les acteurs');
            const demoActeurs: Acteur[] = [
              {
                id_acteur: `demo-acteur-1-${entrepriseId}`,
                nom_prenom: 'John Doe (Démo)',
                email: 'john.doe@demo.com',
                id_entreprise: entrepriseId,
                poste: 'Responsable IT',
                actif: true
              },
              {
                id_acteur: `demo-acteur-2-${entrepriseId}`,
                nom_prenom: 'Jane Smith (Démo)',
                email: 'jane.smith@demo.com',
                id_entreprise: entrepriseId,
                poste: 'DSI',
                actif: true
              }
            ];
            
            setActeurs(demoActeurs);
            setActeursError('Mode démo : les vrais acteurs ne sont pas disponibles. Vérifiez la configuration de l\'API.');
          }
        }
      }
      
    } catch (error: any) {
      console.error('❌ Erreur générale chargement acteurs:', error);
      
      if (error.response?.status === 404) {
        setActeursError('Endpoint acteurs non configuré - utilisez les données de démo');
      } else if (error.response?.status === 403) {
        setActeursError('Accès non autorisé à cette entreprise');
      } else if (error.response?.status === 500) {
        setActeursError('Erreur serveur lors du chargement des acteurs');
      } else {
        setActeursError('Erreur lors du chargement des acteurs');
      }
      
      setActeurs([]);
    } finally {
      setLoadingActeurs(false);
    }
  }, []);

  const fetchFonctions = useCallback(async () => {
    try {
      const response = await api.get('fonctions');
      setFonctions(Array.isArray(response) ? response : response.data || []);
    } catch (error) {
      console.error('Erreur chargement fonctions:', error);
    }
  }, []);

  // Chargement initial
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchFormulaires(),
          fetchEvaluations(),
          fetchEntreprises(),
          fetchFonctions()
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    loadAllData();
  }, [fetchFormulaires, fetchEvaluations, fetchEntreprises, fetchFonctions]);

  // Fonctions utilitaires
  const getNiveauFromScore = (score: number): string => {
    if (score >= 4.5) return 'Optimisé';
    if (score >= 3.5) return 'Géré';
    if (score >= 2.5) return 'Mesuré';
    if (score >= 1.5) return 'Défini';
    return 'Initial';
  };

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'success';
    if (score >= 3) return 'warning';
    if (score >= 2) return 'error';
    return 'default';
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (e) {
      return 'Date invalide';
    }
  };

  // Gestionnaire de changement d'onglet
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  // Fonctions pour les formulaires (conservées)
  const handleRefresh = () => {
    setRefreshing(true);
    if (currentTab === 0) {
      fetchFormulaires().finally(() => setRefreshing(false));
    } else {
      fetchEvaluations().finally(() => setRefreshing(false));
    }
  };

  const filteredFormulaires = formulaires.filter(form => {
    const matchesSearch = searchTerm === '' || 
      (form.questionnaire_nom && form.questionnaire_nom.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (form.nom_entreprise && form.nom_entreprise.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (form.acteur_nom && form.acteur_nom.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === '' || form.statut === statusFilter;
    const matchesFonction = fonctionFilter === '' || (form.fonctions && form.fonctions.includes(fonctionFilter));
    const matchesEntreprise = entrepriseFilter === '' || form.id_entreprise === entrepriseFilter;
    
    return matchesSearch && matchesStatus && matchesFonction && matchesEntreprise;
  });

  // Fonctions pour les évaluations de maturité
  const filteredEvaluations = evaluations.filter(evaluation => {
    const matchesSearch = evalSearchTerm === '' ||
      evaluation.nom_entreprise.toLowerCase().includes(evalSearchTerm.toLowerCase()) ||
      evaluation.nom_acteur.toLowerCase().includes(evalSearchTerm.toLowerCase()) ||
      evaluation.email_acteur.toLowerCase().includes(evalSearchTerm.toLowerCase());
    
    const matchesStatus = evalStatusFilter === '' || evaluation.statut === evalStatusFilter;
    const matchesEntreprise = evalEntrepriseFilter === '' || evaluation.id_entreprise === evalEntrepriseFilter;
    
    return matchesSearch && matchesStatus && matchesEntreprise;
  });

  // Création d'évaluations
  const handleCreateEvaluation = () => {
    setCreateEvalDialog(true);
    setCurrentStep(0);
    setSelectedEntreprise('');
    setSelectedActeurs([]);
    setActeurs([]);
    setActeursError(null);
  };

  // 🔧 FONCTION HANDLEENTREPRISESELECTION CORRIGÉE
  const handleEntrepriseSelection = async (entrepriseId: string) => {
    console.log(`🏢 Sélection entreprise: ${entrepriseId}`);
    
    setSelectedEntreprise(entrepriseId);
    setSelectedActeurs([]);
    setActeursError(null);
    
    if (entrepriseId) {
      // Utiliser la fonction fetchActeurs corrigée
      await fetchActeurs(entrepriseId);
      
      const entrepriseNom = entreprises.find(e => e.id_entreprise === entrepriseId)?.nom_entreprise;
      console.log(`✅ Sélection entreprise complétée: ${entrepriseNom}`);
    } else {
      setActeurs([]);
    }
  };

  const handleActeurToggle = (acteurId: string) => {
    setSelectedActeurs(prev => 
      prev.includes(acteurId) 
        ? prev.filter(id => id !== acteurId)
        : [...prev, acteurId]
    );
  };

  const generateEvaluationLinks = async () => {
    if (!selectedEntreprise || selectedActeurs.length === 0) return;
    
    setCreatingEvaluation(true);
    try {
      const results = [];
      
      for (const acteurId of selectedActeurs) {
        try {
          const response = await api.post('maturity-evaluation/start', {
            id_entreprise: selectedEntreprise,
            id_acteur: acteurId
          });
          
          results.push({
            acteurId,
            success: true,
            evaluationId: response.id_evaluation,
            link: `${window.location.origin}/maturity-evaluation/${response.id_evaluation}`
          });
        } catch (error) {
          results.push({
            acteurId,
            success: false,
            error: error.response?.data?.message || 'Erreur inconnue'
          });
        }
      }
      
      setSuccessMessage(`${results.filter(r => r.success).length} évaluation(s) créée(s) avec succès`);
      setCreateEvalDialog(false);
      fetchEvaluations();
      
    } catch (error) {
      setError('Erreur lors de la création des évaluations');
    } finally {
      setCreatingEvaluation(false);
    }
  };

  const handleViewEvaluation = (evaluation: EvaluationMaturite) => {
    if (evaluation.statut === 'TERMINE') {
      navigate(`/maturity-analysis/${evaluation.id_evaluation}`);
    } else {
      navigate(`/maturity-evaluation/${evaluation.id_evaluation}`);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress size={60} />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Chargement des données...
        </Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Messages d'erreur et de succès */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage(null)}
        message={successMessage}
      />

      {/* En-tête principal */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography component="h1" variant="h4" color="primary">
            Gestion des Formulaires et Évaluations
          </Typography>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={refreshing}
            >
              Actualiser
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Onglets */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange} indicatorColor="primary">
          <Tab 
            label="Formulaires d'Évaluation" 
            icon={<AssignmentIcon />}
            iconPosition="start"
          />
          <Tab 
            label="Évaluations Maturité Globale" 
            icon={<AssessmentIcon />}
            iconPosition="start"
          />
        </Tabs>

        {/* Onglet Formulaires */}
        <TabPanel value={currentTab} index={0}>
          {/* Statistiques formulaires */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Formulaires
                  </Typography>
                  <Typography variant="h4">{formulaires.length}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Validés
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {formulaires.filter(formulaire => formulaire.statut === 'Validé').length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    En Cours
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {formulaires.filter(formulaire => formulaire.statut === 'Soumis').length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Brouillons
                  </Typography>
                  <Typography variant="h4" color="info.main">
                    {formulaires.filter(formulaire => formulaire.statut === 'Brouillon').length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Filtres formulaires */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Rechercher"
                  variant="outlined"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Statut</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Statut"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="">Tous</MenuItem>
                    <MenuItem value="Brouillon">Brouillon</MenuItem>
                    <MenuItem value="Soumis">Soumis</MenuItem>
                    <MenuItem value="Validé">Validé</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Entreprise</InputLabel>
                  <Select
                    value={entrepriseFilter}
                    label="Entreprise"
                    onChange={(e) => setEntrepriseFilter(e.target.value)}
                  >
                    <MenuItem value="">Toutes</MenuItem>
                    {entreprises.map((entreprise) => (
                      <MenuItem key={entreprise.id_entreprise} value={entreprise.id_entreprise}>
                        {entreprise.nom_entreprise}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/formulaires/new')}
                  fullWidth
                >
                  Nouveau
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Tableau des formulaires */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Questionnaire</TableCell>
                  <TableCell>Entreprise</TableCell>
                  <TableCell>Acteur</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Progression</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredFormulaires.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((formulaire) => (
                  <TableRow key={formulaire.id_formulaire}>
                    <TableCell>{formulaire.questionnaire_nom}</TableCell>
                    <TableCell>{formulaire.nom_entreprise}</TableCell>
                    <TableCell>{formulaire.acteur_nom}</TableCell>
                    <TableCell>
                      <Chip 
                        label={formulaire.statut} 
                        color={formulaire.statut === 'Validé' ? 'success' : formulaire.statut === 'Soumis' ? 'primary' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ minWidth: 120 }}>
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          {formulaire.progression}%
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={formulaire.progression} 
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => navigate(`/formulaires/${formulaire.id_formulaire}`)}>
                        <ViewIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredFormulaires.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Box py={4}>
                        <AssignmentIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          {formulaires.length === 0 ? 
                            "Aucun formulaire" : 
                            "Aucun formulaire ne correspond aux filtres"
                          }
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formulaires.length === 0 ? 
                            "Créez votre premier formulaire pour commencer." :
                            "Modifiez vos critères de recherche pour voir plus de résultats."
                          }
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={filteredFormulaires.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          </TableContainer>
        </TabPanel>

        {/* Onglet Évaluations Maturité */}
        <TabPanel value={currentTab} index={1}>
          {/* Statistiques évaluations */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Évaluations
                  </Typography>
                  <Typography variant="h4">{evaluations.length}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Terminées
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {evaluations.filter(evaluation => evaluation.statut === 'TERMINE').length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    En Cours
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {evaluations.filter(evaluation => evaluation.statut === 'EN_COURS').length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Score Moyen
                  </Typography>
                  <Typography variant="h4" color="primary.main">
                    {calculerScoreMoyen(evaluations)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Actions et filtres évaluations */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Rechercher"
                  variant="outlined"
                  value={evalSearchTerm}
                  onChange={(e) => setEvalSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Statut</InputLabel>
                  <Select
                    value={evalStatusFilter}
                    label="Statut"
                    onChange={(e) => setEvalStatusFilter(e.target.value)}
                  >
                    <MenuItem value="">Tous</MenuItem>
                    <MenuItem value="EN_COURS">En cours</MenuItem>
                    <MenuItem value="TERMINE">Terminé</MenuItem>
                    <MenuItem value="ENVOYE">Envoyé</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Entreprise</InputLabel>
                  <Select
                    value={evalEntrepriseFilter}
                    label="Entreprise"
                    onChange={(e) => setEvalEntrepriseFilter(e.target.value)}
                  >
                    <MenuItem value="">Toutes</MenuItem>
                    {entreprises.map((entreprise) => (
                      <MenuItem key={entreprise.id_entreprise} value={entreprise.id_entreprise}>
                        {entreprise.nom_entreprise}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/forms/maturity/new')}
                  fullWidth
                >
                  Nouvelle Évaluation
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Tableau des évaluations */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Entreprise</TableCell>
                  <TableCell>Évaluateur</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Score Global</TableCell>
                  <TableCell>Fonctions</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredEvaluations.slice(evalPage * evalRowsPerPage, evalPage * evalRowsPerPage + evalRowsPerPage).map((evaluation) => (
                  <TableRow key={evaluation.id_evaluation}>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {evaluation.nom_entreprise}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {evaluation.nom_acteur}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {evaluation.email_acteur}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={evaluation.statut} 
                        color={evaluation.statut === 'TERMINE' ? 'success' : evaluation.statut === 'EN_COURS' ? 'warning' : 'info'}
                        size="small"
                        icon={evaluation.statut === 'TERMINE' ? <CheckCircleIcon /> : evaluation.statut === 'EN_COURS' ? <WarningIcon /> : undefined}
                      />
                    </TableCell>
                    <TableCell>
                      {evaluation.score_global ? (
                        <Box>
                          <Chip 
                            label={`${evaluation.score_global.toFixed(1)}/5`}
                            color={getScoreColor(evaluation.score_global)}
                            size="small"
                          />
                          <Typography variant="caption" display="block" color="textSecondary">
                            {evaluation.niveau_global}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="textSecondary">
                          Non évalué
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" flexWrap="wrap" gap={0.5}>
                        {Object.entries(fonctionsMaturiteConfig).map(([key, config]) => {
                          const score = evaluation[`score_${key}` as keyof EvaluationMaturite] as number;
                          if (score) {
                            return (
                              <Tooltip key={key} title={`${config.label}: ${score.toFixed(1)}/5`}>
                                <Chip
                                  size="small"
                                  icon={<config.icon />}
                                  label={score.toFixed(1)}
                                  sx={{ color: config.color, borderColor: config.color }}
                                  variant="outlined"
                                />
                              </Tooltip>
                            );
                          }
                          return null;
                        })}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {evaluation.date_soumission ? 
                          `Terminé: ${formatDate(evaluation.date_soumission)}` :
                          `Débuté: ${formatDate(evaluation.date_debut)}`
                        }
                      </Typography>
                      {evaluation.duree_evaluation && (
                        <Typography variant="caption" color="textSecondary">
                          Durée: {evaluation.duree_evaluation} min
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={0.5}>
                        <Tooltip title="Voir l'évaluation">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => navigate(`/forms/maturity/${evaluation.id_evaluation}/details`)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        {evaluation.lien_evaluation && (
                          <Tooltip title="Copier le lien">
                            <IconButton 
                              size="small" 
                              color="info"
                              onClick={() => {
                                navigator.clipboard.writeText(evaluation.lien_evaluation || '');
                                setSuccessMessage('Lien copié dans le presse-papiers');
                              }}
                            >
                              <LinkIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredEvaluations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Box py={4}>
                        <AssessmentIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          {evaluations.length === 0 ? 
                            "Aucune évaluation de maturité" : 
                            "Aucune évaluation ne correspond aux filtres"
                          }
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {evaluations.length === 0 ? 
                            "Créez votre première évaluation de maturité globale pour commencer." :
                            "Modifiez vos critères de recherche pour voir plus de résultats."
                          }
                        </Typography>
                        {evaluations.length === 0 && (
                          <Button 
                            variant="contained" 
                            color="primary" 
                            startIcon={<AddIcon />}
                            sx={{ mt: 2 }}
                            onClick={handleCreateEvaluation}
                          >
                            Créer la première évaluation
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={filteredEvaluations.length}
              rowsPerPage={evalRowsPerPage}
              page={evalPage}
              onPageChange={(e, newPage) => setEvalPage(newPage)}
              onRowsPerPageChange={(e) => {
                setEvalRowsPerPage(parseInt(e.target.value, 10));
                setEvalPage(0);
              }}
            />
          </TableContainer>
        </TabPanel>
      </Paper>

      {/* 🔧 DIALOG DE CRÉATION D'ÉVALUATION CORRIGÉ */}
      <Dialog 
        open={createEvalDialog} 
        onClose={() => setCreateEvalDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Créer une nouvelle évaluation de maturité
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>📡 État de l'intégration :</strong><br/>
              ✅ Routes principales disponibles<br/>
              ⚠️ Route acteurs avec fallbacks automatiques<br/>
              🔗 Création d'évaluations fonctionnelle
            </Typography>
          </Alert>
          
          <Stepper activeStep={currentStep} orientation="vertical">
            <Step>
              <StepLabel>Sélectionner l'entreprise</StepLabel>
              <StepContent>
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Entreprise</InputLabel>
                  <Select
                    value={selectedEntreprise}
                    label="Entreprise"
                    onChange={(e) => handleEntrepriseSelection(e.target.value)}
                  >
                    {entreprises.map((entreprise) => (
                      <MenuItem key={entreprise.id_entreprise} value={entreprise.id_entreprise}>
                        <Box display="flex" alignItems="center">
                          <BusinessIcon sx={{ mr: 1 }} />
                          {entreprise.nom_entreprise}
                          {entreprise.secteur_activite && (
                            <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                              ({entreprise.secteur_activite})
                            </Typography>
                          )}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={() => setCurrentStep(1)}
                    disabled={!selectedEntreprise}
                  >
                    Suivant
                  </Button>
                </Box>
              </StepContent>
            </Step>
            
            <Step>
              <StepLabel>Sélectionner les acteurs</StepLabel>
              <StepContent>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Sélectionnez les acteurs qui devront remplir l'évaluation de maturité :
                </Typography>
                
                {/* Loading state pour les acteurs */}
                {loadingActeurs && (
                  <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    <Typography variant="body2" color="textSecondary">
                      Chargement des acteurs...
                    </Typography>
                  </Box>
                )}
                
                {/* Erreur de chargement des acteurs */}
                {acteursError && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      {acteursError}
                    </Typography>
                    <Button 
                      size="small" 
                      startIcon={<RefreshIcon />}
                      onClick={() => fetchActeurs(selectedEntreprise)}
                      sx={{ mt: 1 }}
                    >
                      Réessayer
                    </Button>
                  </Alert>
                )}
                
                {acteurs.length > 0 ? (
                  <>
                    {/* Indicateur de mode démo */}
                    {acteurs[0]?.id_acteur?.startsWith('demo-') && (
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          🔧 <strong>Mode démo actif</strong><br/>
                          L'endpoint <code>/api/acteurs/entreprise/:id</code> n'est pas disponible.
                          Des données d'exemple sont utilisées.
                        </Typography>
                      </Alert>
                    )}
                    
                    {/* Statistiques des acteurs */}
                    <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        📊 Résumé des acteurs disponibles
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Total : {acteurs.length} acteur(s) • 
                        Sélectionnés : {selectedActeurs.length} • 
                        Entreprise : {entreprises.find(e => e.id_entreprise === selectedEntreprise)?.nom_entreprise}
                      </Typography>
                    </Box>
                    
                    {/* Actions rapides */}
                    <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setSelectedActeurs(acteurs.map(a => a.id_acteur))}
                        disabled={selectedActeurs.length === acteurs.length}
                      >
                        Tout sélectionner
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setSelectedActeurs([])}
                        disabled={selectedActeurs.length === 0}
                      >
                        Tout désélectionner
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={() => fetchActeurs(selectedEntreprise)}
                      >
                        Actualiser
                      </Button>
                    </Box>
                    
                    {/* Liste des acteurs avec sélection */}
                    <FormGroup>
                      {acteurs.map((acteur) => (
                        <FormControlLabel
                          key={acteur.id_acteur}
                          control={
                            <Checkbox
                              checked={selectedActeurs.includes(acteur.id_acteur)}
                              onChange={() => handleActeurToggle(acteur.id_acteur)}
                            />
                          }
                          label={
                            <Box display="flex" alignItems="center" sx={{ py: 0.5 }}>
                              <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                              <Box>
                                <Typography variant="body2" component="div">
                                  {acteur.nom_prenom}
                                  {acteur.id_acteur?.startsWith('demo-') && (
                                    <Chip 
                                      label="DÉMO" 
                                      size="small" 
                                      color="warning" 
                                      sx={{ ml: 1, height: 20 }} 
                                    />
                                  )}
                                </Typography>
                                <Typography variant="caption" color="textSecondary" component="div">
                                  📧 {acteur.email}
                                  {acteur.poste && ` • 💼 ${acteur.poste}`}
                                </Typography>
                              </Box>
                            </Box>
                          }
                          sx={{ 
                            border: 1, 
                            borderColor: 'divider', 
                            borderRadius: 1, 
                            mb: 1, 
                            mr: 0,
                            bgcolor: selectedActeurs.includes(acteur.id_acteur) ? 'action.selected' : 'transparent'
                          }}
                        />
                      ))}
                    </FormGroup>
                  </>
                ) : !loadingActeurs && selectedEntreprise && (
                  /* État vide */
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      <strong>🔍 Aucun acteur trouvé pour cette entreprise</strong>
                    </Typography>
                    <Typography variant="body2" component="div">
                      Causes possibles :
                      <ul style={{ marginTop: 8, marginBottom: 8 }}>
                        <li>L'entreprise n'a pas d'utilisateurs enregistrés</li>
                        <li>Tous les acteurs sont marqués comme inactifs</li>
                        <li>Problème de connexion à l'API</li>
                        <li>Permissions insuffisantes</li>
                      </ul>
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<RefreshIcon />}
                        onClick={() => fetchActeurs(selectedEntreprise)}
                      >
                        Réessayer
                      </Button>
                    </Box>
                  </Alert>
                )}
                
                {/* Actions de navigation */}
                <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                  <Button onClick={() => setCurrentStep(0)}>
                    ← Retour
                  </Button>
                  <Button
                    variant="contained"
                    onClick={generateEvaluationLinks}
                    disabled={selectedActeurs.length === 0 || creatingEvaluation}
                    startIcon={creatingEvaluation ? <CircularProgress size={20} /> : <SendIcon />}
                  >
                    {creatingEvaluation ? 
                      'Création en cours...' : 
                      `Créer ${selectedActeurs.length} évaluation(s)`
                    }
                  </Button>
                </Box>
                
                {/* Informations supplémentaires */}
                {selectedActeurs.length > 0 && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      ✅ <strong>{selectedActeurs.length} évaluation(s)</strong> seront créées.<br/>
                      Chaque acteur recevra un lien unique pour remplir l'évaluation de maturité.
                    </Typography>
                  </Alert>
                )}
              </StepContent>
            </Step>
          </Stepper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateEvalDialog(false)}>
            Annuler
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Forms;