// pages/dashboard/forms/index.tsx - Version avec 2 onglets : Formulaires et Évaluations Maturité
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
      const response = await api.get('maturity-evaluation');
      const evaluationsData = Array.isArray(response) ? response : response.data || [];
      
      const normalizedEvaluations = evaluationsData.map(evaluation => ({
        ...evaluation,
        niveau_global: getNiveauFromScore(evaluation.score_global || 0)
      }));
      
      setEvaluations(normalizedEvaluations);
    } catch (error) {
      console.error('Erreur chargement évaluations:', error);
      setError('Erreur lors du chargement des évaluations');
    }
  }, []);

  const fetchEntreprises = useCallback(async () => {
    try {
      const response = await api.get('entreprises');
      const entreprisesData = Array.isArray(response) ? response : response.data || [];
      setEntreprises(entreprisesData.filter(entreprise => entreprise.actif));
    } catch (error) {
      console.error('Erreur chargement entreprises:', error);
    }
  }, []);

  const fetchActeurs = useCallback(async (entrepriseId: string) => {
    try {
      const response = await api.get(`acteurs/entreprise/${entrepriseId}`);
      const acteursData = Array.isArray(response) ? response : response.data || [];
      setActeurs(acteursData.filter(acteur => acteur.actif));
    } catch (error) {
      console.error('Erreur chargement acteurs:', error);
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
  };

  const handleEntrepriseSelection = (entrepriseId: string) => {
    setSelectedEntreprise(entrepriseId);
    if (entrepriseId) {
      fetchActeurs(entrepriseId);
    }
    setSelectedActeurs([]);
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

          {/* Tableau des formulaires (version simplifiée pour l'exemple) */}
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
                    {evaluations.length > 0 ? 
                      (evaluations.filter(evaluation => evaluation.score_global).reduce((sum, evaluation) => sum + (evaluation.score_global || 0), 0) / 
                       evaluations.filter(evaluation => evaluation.score_global).length).toFixed(1) : '0'
                    }
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
                  onClick={handleCreateEvaluation}
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
                            onClick={() => handleViewEvaluation(evaluation)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        {evaluation.lien_evaluation && (
                          <Tooltip title="Copier le lien">
                            <IconButton 
                              size="small" 
                              color="info"
                              onClick={() => navigator.clipboard.writeText(evaluation.lien_evaluation || '')}
                            >
                              <LinkIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
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

      {/* Dialog de création d'évaluation */}
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
                
                {acteurs.length > 0 ? (
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
                          <Box display="flex" alignItems="center">
                            <PersonIcon sx={{ mr: 1 }} />
                            <Box>
                              <Typography variant="body2">
                                {acteur.nom_prenom}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {acteur.email}
                                {acteur.poste && ` - ${acteur.poste}`}
                              </Typography>
                            </Box>
                          </Box>
                        }
                      />
                    ))}
                  </FormGroup>
                ) : (
                  <Alert severity="warning">
                    Aucun acteur trouvé pour cette entreprise. 
                    Veuillez d'abord ajouter des utilisateurs à l'entreprise.
                  </Alert>
                )}
                
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button onClick={() => setCurrentStep(0)}>
                    Retour
                  </Button>
                  <Button
                    variant="contained"
                    onClick={generateEvaluationLinks}
                    disabled={selectedActeurs.length === 0 || creatingEvaluation}
                    startIcon={creatingEvaluation ? <CircularProgress size={20} /> : <LinkIcon />}
                  >
                    {creatingEvaluation ? 'Création...' : 'Générer les liens'}
                  </Button>
                </Box>
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