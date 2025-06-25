// pages/dashboard/forms/index.tsx - Version complète avec TOUTES les fonctionnalités existantes + optimisations
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
  Snackbar
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
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import api from '../../../services/api'; // Utilisation du bon chemin d'import
import logger from '../../../utils/logger';

// Types complets conservés de l'original
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
  thematiques: string[]; // Array of thematique names
  fonctions: string[]; // Array of fonction names
  date_creation: string;
  date_modification: string;
  statut: 'Brouillon' | 'Soumis' | 'Validé';
  progression: number;
  total_questions?: number;
  total_reponses?: number;
  commentaires?: string;
}

interface Fonction {
  id_fonction: string;
  nom: string;
}

interface Entreprise {
  id_entreprise: string;
  nom_entreprise: string;
}

interface PerformanceMetrics {
  loadTime: number;
  count: number;
  endpoint: string;
  cacheStatus: string;
  timestamp: string;
}

type OrderBy = 'questionnaire_nom' | 'fonctions' | 'acteur_nom' | 'date_modification' | 'statut' | 'progression' | 'thematiques';

const Forms: React.FC = () => {
  const navigate = useNavigate();
  
  // État des données (conservé de l'original)
  const [formulaires, setFormulaires] = useState<Formulaire[]>([]);
  const [fonctions, setFonctions] = useState<Fonction[]>([]);
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // État des filtres et tri (conservé de l'original)
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fonctionFilter, setFonctionFilter] = useState('');
  const [entrepriseFilter, setEntrepriseFilter] = useState('');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [orderBy, setOrderBy] = useState<OrderBy>('date_modification');

  // État de la pagination (conservé de l'original)
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Nouveaux états pour les optimisations
  const [useOptimizedMode, setUseOptimizedMode] = useState(true);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fonction de calcul de progression en temps réel (conservée de l'original)
  const calculateRealProgression = async (formulaire: any) => {
    try {
      // Récupérer les questions du questionnaire
      const questionsResponse = await api.get(`questionnaires/${formulaire.id_questionnaire}/questions`);
      const questions = Array.isArray(questionsResponse) ? questionsResponse : 
                      Array.isArray(questionsResponse.data) ? questionsResponse.data : [];
      
      // Récupérer les réponses du formulaire
      const reponsesResponse = await api.get(`reponses/formulaire/${formulaire.id_formulaire}`);
      const reponses = Array.isArray(reponsesResponse) ? reponsesResponse : [];
      
      // Calculer le pourcentage
      const totalQuestions = questions.length;
      const totalReponses = reponses.length;
      
      return totalQuestions > 0 ? Math.round((totalReponses / totalQuestions) * 100) : 0;
    } catch (error) {
      console.warn(`Erreur calcul progression pour ${formulaire.id_formulaire}:`, error);
      // Fallback vers l'ancienne méthode
      return Number(formulaire.progression) ?? (
        formulaire.statut === 'Validé' ? 100 : 
        formulaire.statut === 'Soumis' ? 75 : 
        formulaire.statut === 'En cours' ? 50 : 25
      );
    }
  };

  // Récupérer les données avec optimisations (version améliorée)
  const fetchData = useCallback(async (useOptimized = true) => {
    const startTime = Date.now();
    
    try {
      setError(null);
      logger.debug(`Chargement des formulaires - Mode: ${useOptimized ? 'optimisé' : 'détaillé'}`);
      
      // Choix de l'endpoint selon le mode
      const endpoint = useOptimized ? 'formulaires' : 'formulaires/detailed';
      
      // Récupérer les formulaires avec la nouvelle structure optimisée
      const formulairesResponse = await api.get(endpoint);
      
      // Normaliser la réponse des formulaires (logique conservée)
      let formulairesData: any[] = [];
      if (Array.isArray(formulairesResponse)) {
        formulairesData = formulairesResponse;
      } else if (formulairesResponse && formulairesResponse.data && Array.isArray(formulairesResponse.data)) {
        formulairesData = formulairesResponse.data;
      } else {
        console.warn('Format de réponse inattendu pour formulaires:', formulairesResponse);
        formulairesData = [];
      }
      
      // Récupération parallèle des données de référence pour de meilleures performances
      const [fonctionsResponse, entreprisesResponse] = await Promise.all([
        api.get('fonctions'),
        api.get('entreprises')
      ]);
     
      // Normalisation des fonctions (logique conservée)
      let fonctionsData: Fonction[] = [];
      if (Array.isArray(fonctionsResponse)) {
        fonctionsData = fonctionsResponse;
      } else if (fonctionsResponse && fonctionsResponse.data && Array.isArray(fonctionsResponse.data)) {
        fonctionsData = fonctionsResponse.data;
      } else {
        console.warn('Format de réponse inattendu pour fonctions:', fonctionsResponse);
        fonctionsData = [];
      }
      
      // Normalisation des entreprises (logique conservée)
      let entreprisesData: Entreprise[] = [];
      if (Array.isArray(entreprisesResponse)) {
        entreprisesData = entreprisesResponse;
      } else if (entreprisesResponse && entreprisesResponse.data && Array.isArray(entreprisesResponse.data)) {
        entreprisesData = entreprisesResponse.data;
      } else {
        console.warn('Format de réponse inattendu pour entreprises:', entreprisesResponse);
        entreprisesData = [];
      }
      
      // Normaliser les propriétés des formulaires (logique conservée et améliorée)
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
        // Les thématiques et fonctions viennent maintenant des JOINs via questionnaire_thematiques
        thematiques: Array.isArray(form.thematiques) ? form.thematiques :
                    (form.thematiques ? form.thematiques.split(',').map(t => t.trim()) : []),
        fonctions: Array.isArray(form.fonctions) ? form.fonctions :
                  (form.fonctions ? form.fonctions.split(',').map(f => f.trim()) : []),
        date_creation: form.date_creation || new Date().toISOString(),
        date_modification: form.date_modification || form.date_creation || new Date().toISOString(),
        statut: form.statut || 'Brouillon',
        progression: Number(form.progression) ?? (
          form.statut === 'Validé' ? 100 : 
          form.statut === 'Soumis' ? 75 : 
          form.statut === 'En cours' ? 50 : 25
        ),
        total_questions: form.total_questions || 0,
        total_reponses: form.total_reponses || 0,
        commentaires: form.commentaires || ''
      }));
      
      const loadTime = Date.now() - startTime;
      
      // Enregistrer les métriques de performance
      setPerformanceMetrics({
        loadTime,
        count: normalizedFormulaires.length,
        endpoint,
        cacheStatus: 'Non disponible',
        timestamp: new Date().toISOString()
      });
      
      setFormulaires(normalizedFormulaires);
      setFonctions(fonctionsData);
      setEntreprises(entreprisesData);
      
      logger.info(`✅ ${normalizedFormulaires.length} formulaires chargés en ${loadTime}ms via ${endpoint}`);
      
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      setError('Impossible de charger les formulaires. Veuillez réessayer plus tard.');
      setFormulaires([]);
      logger.error('Erreur lors du chargement des formulaires:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  
  useEffect(() => {
    fetchData(useOptimizedMode);
  }, [fetchData, useOptimizedMode]);
  
  // Rafraîchir les données (conservé de l'original)
  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(useOptimizedMode);
  };

  // Basculer entre mode optimisé et détaillé
  const toggleOptimizedMode = () => {
    const newMode = !useOptimizedMode;
    setUseOptimizedMode(newMode);
    setLoading(true);
    fetchData(newMode);
  };

  // Diagnostic de performance
  const runPerformanceTest = async () => {
    try {
      setLoading(true);
      const response = await api.get('formulaires/debug/performance');
      
      if (response.data) {
        const metrics = response.data;
        alert(`Diagnostic de performance:
        
Tests de performance:
- Comptage simple: ${metrics.performance_tests?.simple_count || 'N/A'}
- Chargement cache: ${metrics.performance_tests?.cache_load || 'N/A'}
- Requête de base: ${metrics.performance_tests?.base_query || 'N/A'}

Cache: ${metrics.cache_status}
Total formulaires: ${metrics.total_formulaires}

Recommandation: ${useOptimizedMode ? 'Mode optimisé activé ✅' : 'Activez le mode optimisé pour de meilleures performances'}`);

        setPerformanceMetrics(prev => ({
          ...prev,
          cacheStatus: metrics.cache_status,
          timestamp: new Date().toISOString()
        } as PerformanceMetrics));
      }
    } catch (error) {
      console.error('Erreur lors du diagnostic:', error);
      alert('Erreur lors du diagnostic de performance');
    } finally {
      setLoading(false);
    }
  };
  
  // Filtrer les formulaires en fonction des critères (logique conservée de l'original)
  const filteredFormulaires = formulaires.filter(form => {
    const matchesSearch = searchTerm === '' || 
      (form.questionnaire_nom && form.questionnaire_nom.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (form.nom_entreprise && form.nom_entreprise.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (form.acteur_nom && form.acteur_nom.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (form.thematiques && form.thematiques.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))) ||
      (form.fonctions && form.fonctions.some(f => f.toLowerCase().includes(searchTerm.toLowerCase())));
    
    const matchesStatus = statusFilter === '' || form.statut === statusFilter;
    
    // Filtre par fonction : vérifier si une des fonctions du questionnaire correspond
    const matchesFonction = fonctionFilter === '' || 
      (form.fonctions && form.fonctions.includes(fonctionFilter));
    
    const matchesEntreprise = entrepriseFilter === '' || form.id_entreprise === entrepriseFilter;
    
    return matchesSearch && matchesStatus && matchesFonction && matchesEntreprise;
  });
  
  // Trier les formulaires (logique conservée de l'original)
  const sortedFormulaires = [...filteredFormulaires].sort((a, b) => {
    let comparison = 0;
    
    switch (orderBy) {
      case 'questionnaire_nom':
        comparison = (a.questionnaire_nom || '').localeCompare(b.questionnaire_nom || '');
        break;
      case 'fonctions':
        // Trier par la première fonction (ou toutes concatenées)
        const aFonctions = a.fonctions?.join(', ') || '';
        const bFonctions = b.fonctions?.join(', ') || '';
        comparison = aFonctions.localeCompare(bFonctions);
        break;
      case 'acteur_nom':
        comparison = (a.acteur_nom || '').localeCompare(b.acteur_nom || '');
        break;
      case 'date_modification':
        comparison = new Date(a.date_modification).getTime() - new Date(b.date_modification).getTime();
        break;
      case 'statut':
        comparison = a.statut.localeCompare(b.statut);
        break;
      case 'progression':
        comparison = (a.progression || 0) - (b.progression || 0);
        break;
      case 'thematiques':
        const aThematiques = a.thematiques?.join(', ') || '';
        const bThematiques = b.thematiques?.join(', ') || '';
        comparison = aThematiques.localeCompare(bThematiques);
        break;
      default:
        comparison = 0;
    }
    
    return order === 'asc' ? comparison : -comparison;
  });
  
  // Paginer les formulaires (conservé de l'original)
  const paginatedFormulaires = sortedFormulaires.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );
  
  // Gérer le changement de page (conservé de l'original)
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };
  
  // Gérer le changement de nombre de lignes par page (conservé de l'original)
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Gérer le tri (conservé de l'original)
  const handleRequestSort = (property: OrderBy) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };
  
  // Helper pour obtenir la couleur selon le statut (conservé de l'original)
  const getStatusColor = (status: 'Brouillon' | 'Soumis' | 'Validé') => {
    switch (status) {
      case 'Validé': return 'success';
      case 'Soumis': return 'primary';
      case 'Brouillon': return 'warning';
      default: return 'default';
    }
  };

  // Helper pour obtenir la couleur de progression (conservé de l'original)
  const getProgressColor = (progress: number = 0) => {
    if (progress < 30) return 'error';
    if (progress < 70) return 'warning';
    return 'success';
  };
  
  // Formater la date (conservé de l'original)
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (e) {
      console.warn('Erreur lors du formatage de la date:', e);
      return 'Date invalide';
    }
  };
  
  // Obtenir les fonctions uniques pour le filtre (conservé de l'original)
  const uniqueFonctions = [...new Set(
    formulaires.flatMap(form => form.fonctions || [])
  )].filter(Boolean);

  // Actions sur les formulaires (conservées et améliorées)
  const handleView = (formulaire: Formulaire) => {
    navigate(`/formulaires/${formulaire.id_formulaire}`);
  };

  const handleEdit = (formulaire: Formulaire) => {
    // Rediriger vers la page de détail qui permet l'édition
    navigate(`/formulaires/${formulaire.id_formulaire}`);
  };

  const handleDelete = async (formulaire: Formulaire) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ce formulaire "${formulaire.questionnaire_nom}" ?`)) {
      try {
        await api.delete(`formulaires/${formulaire.id_formulaire}`);
        setFormulaires(prev => prev.filter(f => f.id_formulaire !== formulaire.id_formulaire));
        setSuccessMessage('Formulaire supprimé avec succès');
        logger.info(`Formulaire ${formulaire.id_formulaire} supprimé`);
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        setError('Erreur lors de la suppression du formulaire');
        logger.error('Erreur suppression formulaire:', error);
      }
    }
  };

  // Nouvelle action : soumettre un formulaire
  const handleSubmit = async (formulaire: Formulaire) => {
    if (window.confirm(`Soumettre le formulaire "${formulaire.questionnaire_nom}" pour validation ?`)) {
      try {
        setLoading(true);
        await api.put(`formulaires/${formulaire.id_formulaire}/submit`);
        
        // Mettre à jour le formulaire dans la liste
        setFormulaires(prev => 
          prev.map(f => 
            f.id_formulaire === formulaire.id_formulaire 
              ? { ...f, statut: 'Soumis' as const, progression: Math.max(f.progression, 75) }
              : f
          )
        );
        
        setSuccessMessage('Formulaire soumis avec succès');
        logger.info(`Formulaire ${formulaire.id_formulaire} soumis`);
      } catch (error) {
        console.error('Erreur lors de la soumission:', error);
        setError('Erreur lors de la soumission du formulaire');
        logger.error('Erreur soumission formulaire:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCreateNew = () => {
    navigate('/formulaires/new');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress size={60} />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Chargement des formulaires...
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
      
      <Grid container spacing={3}>
        {/* En-tête avec métriques de performance */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography component="h1" variant="h5" color="primary">
                Gestion des Formulaires d'Évaluation
              </Typography>
              <Box display="flex" gap={1}>
                <Tooltip title="Diagnostic de performance">
                  <IconButton onClick={runPerformanceTest} color="info">
                    <SpeedIcon />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title={useOptimizedMode ? "Mode détaillé (plus lent)" : "Mode optimisé (plus rapide)"}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={toggleOptimizedMode}
                    startIcon={<TrendingUpIcon />}
                    color={useOptimizedMode ? "success" : "warning"}
                  >
                    {useOptimizedMode ? 'Optimisé' : 'Détaillé'}
                  </Button>
                </Tooltip>
                
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<RefreshIcon />}
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  Actualiser
                </Button>
                
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleCreateNew}
                >
                  Nouveau Formulaire
                </Button>
              </Box>
            </Box>
            
            {/* Métriques de performance */}
            {performanceMetrics && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  {performanceMetrics.count} formulaires chargés en {performanceMetrics.loadTime}ms 
                  via {performanceMetrics.endpoint}
                  {useOptimizedMode && " (mode optimisé)"}
                </Typography>
              </Alert>
            )}
            
            {/* Statistiques rapides (conservées de l'original) */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Total Formulaires
                    </Typography>
                    <Typography variant="h4">
                      {formulaires.length}
                    </Typography>
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
                      {formulaires.filter(f => f.statut === 'Validé').length}
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
                      {formulaires.filter(f => f.statut === 'Soumis').length}
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
                      {formulaires.filter(f => f.statut === 'Brouillon').length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Filtres (conservés de l'original) */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
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
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Fonction</InputLabel>
                  <Select
                    value={fonctionFilter}
                    label="Fonction"
                    onChange={(e) => setFonctionFilter(e.target.value)}
                  >
                    <MenuItem value="">Toutes</MenuItem>
                    {uniqueFonctions.map((fonction) => (
                      <MenuItem key={fonction} value={fonction}>
                        {fonction}
                      </MenuItem>
                    ))}
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
                <Typography variant="body2" color="textSecondary">
                  {filteredFormulaires.length} résultat(s)
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Tableau des formulaires (conservé intégralement de l'original avec améliorations) */}
        <Grid item xs={12}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'questionnaire_nom'}
                      direction={orderBy === 'questionnaire_nom' ? order : 'asc'}
                      onClick={() => handleRequestSort('questionnaire_nom')}
                    >
                      Questionnaire
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'fonctions'}
                      direction={orderBy === 'fonctions' ? order : 'asc'}
                      onClick={() => handleRequestSort('fonctions')}
                    >
                      Fonction(s)
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'acteur_nom'}
                      direction={orderBy === 'acteur_nom' ? order : 'asc'}
                      onClick={() => handleRequestSort('acteur_nom')}
                    >
                      Acteur
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'date_modification'}
                      direction={orderBy === 'date_modification' ? order : 'asc'}
                      onClick={() => handleRequestSort('date_modification')}
                    >
                      Dates
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'statut'}
                      direction={orderBy === 'statut' ? order : 'asc'}
                      onClick={() => handleRequestSort('statut')}
                    >
                      Statut
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'progression'}
                      direction={orderBy === 'progression' ? order : 'asc'}
                      onClick={() => handleRequestSort('progression')}
                    >
                      Progression
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedFormulaires.length > 0 ? (
                  paginatedFormulaires.map((formulaire) => (
                    <TableRow key={formulaire.id_formulaire} hover>
                      {/* Questionnaire */}
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {formulaire.questionnaire_nom}
                          </Typography>
                          {formulaire.thematiques && formulaire.thematiques.length > 0 && (
                            <Box sx={{ mt: 0.5 }}>
                              {formulaire.thematiques.slice(0, 2).map((thematique, index) => (
                                <Chip 
                                  key={index}
                                  label={thematique} 
                                  size="small" 
                                  color="secondary" 
                                  variant="outlined" 
                                  sx={{ mr: 0.5, mb: 0.5 }}
                                />
                              ))}
                              {formulaire.thematiques.length > 2 && (
                                <Chip 
                                  label={`+${formulaire.thematiques.length - 2}`} 
                                  size="small" 
                                  color="default" 
                                  variant="outlined" 
                                />
                              )}
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                      
                      {/* Fonction(s) */}
                      <TableCell>
                        <Box>
                          {formulaire.fonctions && formulaire.fonctions.length > 0 ? (
                            formulaire.fonctions.slice(0, 2).map((fonction, index) => (
                              <Chip 
                                key={index}
                                label={fonction} 
                                color="primary" 
                                variant="outlined" 
                                size="small"
                                sx={{ mr: 0.5, mb: 0.5 }}
                              />
                            ))
                          ) : (
                            <Chip 
                              label="Aucune fonction" 
                              color="default" 
                              variant="outlined" 
                              size="small"
                            />
                          )}
                          {formulaire.fonctions && formulaire.fonctions.length > 2 && (
                            <Chip 
                              label={`+${formulaire.fonctions.length - 2}`} 
                              size="small" 
                              color="default" 
                              variant="outlined" 
                            />
                          )}
                        </Box>
                      </TableCell>
                      
                      {/* Acteur */}
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {formulaire.acteur_nom}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {formulaire.nom_entreprise}
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      {/* Dates */}
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            Créé: {formatDate(formulaire.date_creation)}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Modifié: {formatDate(formulaire.date_modification)}
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      {/* Statut */}
                      <TableCell>
                        <Chip 
                          label={formulaire.statut} 
                          color={getStatusColor(formulaire.statut)}
                          size="small"
                        />
                      </TableCell>
                      
                      {/* Progression */}
                      <TableCell>
                        <Box sx={{ minWidth: 120 }}>
                          <Box display="flex" alignItems="center" mb={0.5}>
                            <Typography variant="body2" sx={{ mr: 1 }}>
                              {formulaire.progression}%
                            </Typography>
                            {formulaire.total_questions > 0 && (
                              <Typography variant="caption" color="textSecondary">
                                ({formulaire.total_reponses}/{formulaire.total_questions})
                              </Typography>
                            )}
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={formulaire.progression} 
                            color={getProgressColor(formulaire.progression)}
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                        </Box>
                      </TableCell>
                      
                      {/* Actions améliorées */}
                      <TableCell>
                        <Box display="flex" gap={0.5}>
                          <Tooltip title="Voir les détails">
                            <IconButton 
                              size="small" 
                              color="info"
                              onClick={() => handleView(formulaire)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Modifier">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleEdit(formulaire)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          {formulaire.statut === 'Brouillon' && (
                            <Tooltip title="Soumettre">
                              <IconButton 
                                size="small" 
                                color="success"
                                onClick={() => handleSubmit(formulaire)}
                              >
                                <SendIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Supprimer">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleDelete(formulaire)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Box py={4}>
                        <AssignmentIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          Aucun formulaire trouvé
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formulaires.length === 0 
                            ? "Aucun formulaire n'a encore été créé."
                            : "Aucun formulaire ne correspond aux critères de recherche."}
                        </Typography>
                        {formulaires.length === 0 && (
                          <Button 
                            variant="contained" 
                            color="primary" 
                            startIcon={<AddIcon />}
                            sx={{ mt: 2 }}
                            onClick={handleCreateNew}
                          >
                            Créer le premier formulaire
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            
            {/* Pagination (conservée de l'original) */}
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={filteredFormulaires.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Lignes par page:"
              labelDisplayedRows={({ from, to, count }) => 
                `${from}-${to} sur ${count !== -1 ? count : `plus de ${to}`}`
              }
            />
          </TableContainer>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Forms;