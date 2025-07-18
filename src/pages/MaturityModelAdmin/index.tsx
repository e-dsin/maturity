// src/pages/MaturityModelAdmin/index.tsx - Version corrigée avec affichage thématiques

import React, { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Card,
  CardContent,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Fab,
  Divider,
  ListItemText,
  ListItemSecondaryAction,
  List,
  ListItem,
  Switch,
  FormControlLabel,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  School as SchoolIcon,
  Category as CategoryIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  Functions as FunctionsIcon,
  Layers as LayersIcon,
  Lightbulb as LightbulbIcon,
  Security as SecurityIcon,
  Computer as ComputerIcon,
  Storage as StorageIcon,
  Code as CodeIcon
} from '@mui/icons-material';
import api from '../../services/api';

// Types existants + nouveaux types pour les fonctions globales
interface Fonction {
  id_fonction: string;
  nom: string;
  description: string;
  ordre: number;
  actif: boolean;
  nb_thematiques?: number;
  nb_niveaux_globaux?: number;
  thematiques?: Thematique[];
  niveauxGlobaux?: NiveauGlobal[];
}

interface Thematique {
  id_thematique: string;
  nom: string;
  description: string;
  id_fonction: string;
  nombre_questions: number;
  ordre: number;
  actif: boolean;
  nb_niveaux?: number;
  niveauxThematiques?: NiveauThematique[];
}

interface NiveauGlobal {
  id_niveau: string;
  id_fonction: string;
  score_min: number;
  score_max: number;
  niveau: string;
  description: string;
  recommandations: string;
  ordre: number;
}

interface NiveauThematique {
  id_niveau: string;
  id_fonction: string;
  id_thematique: string;
  score_min: number;
  score_max: number;
  niveau: string;
  description: string;
  recommandations: string;
}

interface FonctionGlobale {
  id_fonction: string;
  nom: string;
  description: string;
  code_fonction: string;
  poids: number;
  ordre_affichage: number;
  actif: boolean;
  couleur: string;
  icone: string;
  nb_questions?: number;
  nb_niveaux?: number;
  nb_recommandations?: number;
  niveaux?: NiveauMaturiteGlobale[];
  recommandations?: RecommandationGlobale[];
  questions?: QuestionGlobale[];
}

interface NiveauMaturiteGlobale {
  id_niveau: string;
  id_fonction: string;
  nom_niveau: string;
  description: string;
  score_min: number;
  score_max: number;
  ordre_niveau: number;
  couleur: string;
  actif: boolean;
}

interface RecommandationGlobale {
  id_recommandation: string;
  id_fonction: string;
  id_niveau?: string;
  titre: string;
  description: string;
  actions_recommandees: string[];
  priorite: 'FAIBLE' | 'MOYENNE' | 'HAUTE' | 'CRITIQUE';
  type_recommandation: 'IMMEDIATE' | 'COURT_TERME' | 'MOYEN_TERME' | 'LONG_TERME';
  score_min?: number;
  score_max?: number;
  ordre_affichage: number;
  actif: boolean;
  nom_niveau?: string;
}

interface QuestionGlobale {
  id_question: string;
  fonction: string;
  numero_question: number;
  texte_question: string;
  description: string;
  poids: number;
  type_reponse: string;
  ordre_affichage: number;
  actif: boolean;
}

interface FormData {
  [key: string]: any;
}

type DialogType = 'fonction' | 'thematique' | 'niveau-global' | 'niveau-thematique' | 
                  'fonction-globale' | 'niveau-maturite-globale' | 'recommandation-globale' | 
                  'question' | 'question-globale' | '';

const MaturityModelAdmin: React.FC = () => {
  // États existants
  const [fonctions, setFonctions] = useState<Fonction[]>([]);
  const [selectedFonction, setSelectedFonction] = useState<Fonction | null>(null);
  const [loading, setLoading] = useState(false);
  const [mainTabValue, setMainTabValue] = useState(0); // Onglets principaux: Modèle Standard / Fonctions Globales
  const [subTabValue, setSubTabValue] = useState(0); // Sous-onglets pour les détails
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  // Nouveaux états pour les fonctions globales
  const [fonctionsGlobales, setFonctionsGlobales] = useState<FonctionGlobale[]>([]);
  const [selectedFonctionGlobale, setSelectedFonctionGlobale] = useState<FonctionGlobale | null>(null);
  const [loadingGlobales, setLoadingGlobales] = useState(false);

  const [questions, setQuestions] = useState<{ [id_thematique: string]: any[] }>({});

  // États pour les dialogues
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<DialogType>('');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<FormData>({});
  
  // États pour les confirmations
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: string; id: string; name: string } | null>(null);

  // Icônes disponibles
  const availableIcons = [
    { value: 'TrendingUp', label: 'Tendance', component: TrendingUpIcon },
    { value: 'Security', label: 'Sécurité', component: SecurityIcon },
    { value: 'Computer', label: 'Ordinateur', component: ComputerIcon },
    { value: 'Storage', label: 'Stockage', component: StorageIcon },
    { value: 'Code', label: 'Code', component: CodeIcon },
    { value: 'Lightbulb', label: 'Innovation', component: LightbulbIcon },
    { value: 'Assessment', label: 'Évaluation', component: AssessmentIcon },
    { value: 'Functions', label: 'Fonctions', component: FunctionsIcon }
  ];

  // Charger les données au montage et changement d'onglet
  useEffect(() => {
    if (mainTabValue === 0) {
      loadFonctions();
    } else if (mainTabValue === 1) {
      loadFonctionsGlobales();
    }
  }, [mainTabValue]);

  // Charger les questions quand une fonction est sélectionnée
  useEffect(() => {
    if (selectedFonction?.thematiques) {
      selectedFonction.thematiques.forEach((t) => loadQuestionsForThematique(t.id_thematique));
    }
  }, [selectedFonction]);

  // Fonctions utilitaires
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const resetForm = () => {
    setFormData({});
    setEditingItem(null);
    setDialogType('');
    setDialogOpen(false);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 4) return '#4CAF50';
    if (score >= 3) return '#FF9800';
    if (score >= 2) return '#F44336';
    return '#9E9E9E';
  };

  // ========================================
  // FONCTIONS POUR LE MODÈLE STANDARD (existant)
  // ========================================

  const loadFonctions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/maturity-model/fonctions');
      const data = response.data || response;
      setFonctions(data);
      if (data.length > 0 && !selectedFonction) {
        loadFonctionDetails(data[0].id_fonction);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des fonctions:', error);
      showSnackbar('Erreur lors du chargement des fonctions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadFonctionDetails = async (fonctionId: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/maturity-model/fonctions/${fonctionId}`);
      setSelectedFonction(response.data || response);
    } catch (error) {
      console.error('Erreur lors du chargement des détails:', error);
      showSnackbar('Erreur lors du chargement des détails', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadQuestionsForThematique = async (id_thematique: string) => {
    try {
      const data = await api.get(`/questions/thematique/${id_thematique}`);
      setQuestions((prev) => ({ ...prev, [id_thematique]: data }));
    } catch (e) {
      showSnackbar('Erreur chargement des questions', 'error');
    }
  };

  const openDialog = (type: DialogType, item: any = null) => {
    setDialogType(type);
    setEditingItem(item);
    setFormData(item || {});
    setDialogOpen(true);
  };

  const handleAddQuestion = (thematique: Thematique) => {
    setFormData({
      id_thematique: thematique.id_thematique,
      texte: '',
      ponderation: 1,
      aide_reponse: ''
    });
    setDialogType('question');
    setEditingItem(null);
    setDialogOpen(true);
  };

  // Fonction handleSave pour les éléments du modèle standard
  const handleSave = async () => {
    try {
      let response;
      
      switch (dialogType) {
        case 'fonction':
          if (editingItem) {
            response = await api.put(`/maturity-model/fonctions/${editingItem.id_fonction}`, formData);
            showSnackbar('Fonction mise à jour avec succès');
          } else {
            response = await api.post('/maturity-model/fonctions', formData);
            showSnackbar('Fonction créée avec succès');
          }
          await loadFonctions();
          break;
        
        case 'thematique':
          if (editingItem) {
            response = await api.put(`/maturity-model/thematiques/${editingItem.id_thematique}`, formData);
            showSnackbar('Thématique mise à jour avec succès');
          } else {
            response = await api.post(`/maturity-model/fonctions/${selectedFonction?.id_fonction}/thematiques`, formData);
            showSnackbar('Thématique créée avec succès');
          }
          if (selectedFonction) {
            await loadFonctionDetails(selectedFonction.id_fonction);
          }
          break;
        
        case 'niveau-global':
          if (editingItem) {
            response = await api.put(`/maturity-model/niveaux-globaux/${editingItem.id_niveau}`, formData);
            showSnackbar('Niveau global mis à jour avec succès');
          } else {
            response = await api.post(`/maturity-model/fonctions/${selectedFonction?.id_fonction}/niveaux-globaux`, formData);
            showSnackbar('Niveau global créé avec succès');
          }
          if (selectedFonction) {
            await loadFonctionDetails(selectedFonction.id_fonction);
          }
          break;
        
        case 'niveau-thematique':
          const { id_thematique } = formData;
          if (editingItem) {
            response = await api.put(`/maturity-model/niveaux-thematiques/${editingItem.id_niveau}`, formData);
            showSnackbar('Niveau thématique mis à jour avec succès');
          } else {
            response = await api.post(`/maturity-model/thematiques/${id_thematique}/niveaux`, {
              ...formData,
              id_fonction: selectedFonction?.id_fonction
            });
            showSnackbar('Niveau thématique créé avec succès');
          }
          if (selectedFonction) {
            await loadFonctionDetails(selectedFonction.id_fonction);
          }
          break;

        case 'question':
          if (!formData.texte || formData.texte.trim() === '') {
            showSnackbar('Le texte est obligatoire', 'warning');
            return;
          }

          if (editingItem) {
            await api.put(`/questions/${editingItem.id_question}`, formData);
            showSnackbar('Question modifiée');
          } else {
            await api.post(`/questions`, formData);
            showSnackbar('Question ajoutée');
          }

          await loadQuestionsForThematique(formData.id_thematique);
          resetForm();
          return;

        default:
          showSnackbar('Type de dialogue non reconnu', 'error');
          return;
      }
      
      resetForm();
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      showSnackbar(error.response?.data?.message || 'Erreur lors de la sauvegarde', 'error');
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      switch (itemToDelete.type) {
        case 'fonction':
          await api.delete(`/maturity-model/fonctions/${itemToDelete.id}`);
          showSnackbar('Fonction supprimée avec succès');
          await loadFonctions();
          if (selectedFonction?.id_fonction === itemToDelete.id) {
            setSelectedFonction(null);
          }
          break;
        
        case 'thematique':
          await api.delete(`/maturity-model/thematiques/${itemToDelete.id}`);
          showSnackbar('Thématique supprimée avec succès');
          if (selectedFonction) {
            await loadFonctionDetails(selectedFonction.id_fonction);
          }
          break;
        
        case 'niveau-global':
          await api.delete(`/maturity-model/niveaux-globaux/${itemToDelete.id}`);
          showSnackbar('Niveau global supprimé avec succès');
          if (selectedFonction) {
            await loadFonctionDetails(selectedFonction.id_fonction);
          }
          break;
        
        case 'niveau-thematique':
          await api.delete(`/maturity-model/niveaux-thematiques/${itemToDelete.id}`);
          showSnackbar('Niveau thématique supprimé avec succès');
          if (selectedFonction) {
            await loadFonctionDetails(selectedFonction.id_fonction);
          }
          break;
      }
      
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      showSnackbar(error.response?.data?.message || 'Erreur lors de la suppression', 'error');
    }
  };

  const exportModel = async () => {
    try {
      const response = await api.get('/maturity-model/export');
      const dataStr = JSON.stringify(response.data || response, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `maturity-model-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      showSnackbar('Modèle exporté avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      showSnackbar('Erreur lors de l\'export', 'error');
    }
  };

  const confirmDelete = (type: string, id: string, name: string) => {
    setItemToDelete({ type, id, name });
    setDeleteConfirmOpen(true);
  };

  // ========================================
  // NOUVELLES FONCTIONS POUR LES FONCTIONS GLOBALES
  // ========================================

  const loadFonctionsGlobales = async () => {
    try {
      setLoadingGlobales(true);
      const data = await api.get('/maturity-global-functions');
      setFonctionsGlobales(data);
    } catch (error) {
      showSnackbar('Erreur lors du chargement des fonctions globales', 'error');
    } finally {
      setLoadingGlobales(false);
    }
  };

  const loadFonctionGlobaleDetails = async (id: string) => {
    try {
      const data = await api.get(`/maturity-global-functions/${id}`);
      setSelectedFonctionGlobale(data);
    } catch (error) {
      showSnackbar('Erreur lors du chargement des détails', 'error');
    }
  };

  const handleSaveGlobale = async () => {
    try {
      switch (dialogType) {
        case 'fonction-globale':
          if (editingItem) {
            await api.put(`/maturity-global-functions/${editingItem.id_fonction}`, formData);
            showSnackbar('Fonction globale mise à jour avec succès');
          } else {
            await api.post('/maturity-global-functions', formData);
            showSnackbar('Fonction globale créée avec succès');
          }
          await loadFonctionsGlobales();
          break;
        
        case 'niveau-maturite-globale':
          if (editingItem) {
            await api.put(`/maturity-global-functions/niveaux/${editingItem.id_niveau}`, formData);
            showSnackbar('Niveau mis à jour avec succès');
          } else {
            await api.post(`/maturity-global-functions/${selectedFonctionGlobale?.id_fonction}/niveaux`, formData);
            showSnackbar('Niveau créé avec succès');
          }
          if (selectedFonctionGlobale) {
            await loadFonctionGlobaleDetails(selectedFonctionGlobale.id_fonction);
          }
          break;
        
        case 'recommandation-globale':
          if (editingItem) {
            await api.put(`/maturity-global-functions/recommandations/${editingItem.id_recommandation}`, formData);
            showSnackbar('Recommandation mise à jour avec succès');
          } else {
            await api.post(`/maturity-global-functions/${selectedFonctionGlobale?.id_fonction}/recommandations`, formData);
            showSnackbar('Recommandation créée avec succès');
          }
          if (selectedFonctionGlobale) {
            await loadFonctionGlobaleDetails(selectedFonctionGlobale.id_fonction);
          }
          break;
      }
      
      resetForm();
    } catch (error: any) {
      showSnackbar(error.response?.data?.message || 'Erreur lors de la sauvegarde', 'error');
    }
  };

  const handleDeleteGlobale = async (type: string, id: string) => {
    try {
      switch (type) {
        case 'fonction-globale':
          await api.delete(`/maturity-global-functions/${id}`);
          await loadFonctionsGlobales();
          break;
        case 'niveau':
          await api.delete(`/maturity-global-functions/niveaux/${id}`);
          if (selectedFonctionGlobale) {
            await loadFonctionGlobaleDetails(selectedFonctionGlobale.id_fonction);
          }
          break;
        case 'recommandation':
          await api.delete(`/maturity-global-functions/recommandations/${id}`);
          if (selectedFonctionGlobale) {
            await loadFonctionGlobaleDetails(selectedFonctionGlobale.id_fonction);
          }
          break;
      }
      
      showSnackbar('Élément supprimé avec succès');
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    } catch (error: any) {
      showSnackbar(error.response?.data?.message || 'Erreur lors de la suppression', 'error');
    }
  };

  // ========================================
  // COMPOSANTS DE RENDU POUR LE MODÈLE STANDARD
  // ========================================

  const renderModelStandard = () => (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Box display="flex" alignItems="center" gap={2}>
              <CategoryIcon color="primary" fontSize="large" />
              <Typography component="h2" variant="h5" color="primary">
                Modèle Standard de Maturité
              </Typography>
            </Box>
            <Box>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={exportModel}
                sx={{ mr: 2 }}
              >
                Exporter
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => openDialog('fonction')}
              >
                Nouvelle Fonction
              </Button>
            </Box>
          </Box>
        </Grid>

        {/* Liste des fonctions */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 'calc(100vh - 250px)', overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Fonctions d'évaluation
            </Typography>
            
            {loading && <CircularProgress />}
            
            <List>
              {fonctions.map((fonction) => (
                <Card
                  key={fonction.id_fonction}
                  sx={{
                    mb: 2,
                    cursor: 'pointer',
                    border: selectedFonction?.id_fonction === fonction.id_fonction ? '2px solid #0B4E87' : '1px solid #e0e0e0',
                    transition: 'all 0.3s',
                    '&:hover': { 
                      boxShadow: 3,
                      transform: 'translateY(-2px)'
                    }
                  }}
                  onClick={() => loadFonctionDetails(fonction.id_fonction)}
                >
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6" color="primary">
                        {fonction.nom}
                      </Typography>
                      <Box>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDialog('fonction', fonction);
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDelete('fonction', fonction.id_fonction, fonction.nom);
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                    
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1, mb: 2 }}>
                      {fonction.description}
                    </Typography>
                    
                    <Box display="flex" gap={1}>
                      <Chip
                        size="small"
                        icon={<CategoryIcon />}
                        label={`${fonction.nb_thematiques || 0} thématiques`}
                        color="primary"
                        variant="outlined"
                      />
                      <Chip
                        size="small"
                        icon={<TrendingUpIcon />}
                        label={`${fonction.nb_niveaux_globaux || 0} niveaux`}
                        color="secondary"
                        variant="outlined"
                      />
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Détails de la fonction sélectionnée */}
        <Grid item xs={12} md={8}>
          {selectedFonction ? (
            <Paper sx={{ p: 2, height: 'calc(100vh - 250px)', overflow: 'auto' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                  <Typography variant="h5" gutterBottom>
                    {selectedFonction.nom}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {selectedFonction.description}
                  </Typography>
                </Box>
                <Box>
                  <Chip
                    label={selectedFonction.actif ? 'Actif' : 'Inactif'}
                    color={selectedFonction.actif ? 'success' : 'default'}
                    sx={{ mr: 2 }}
                  />
                  <Tooltip title="Modifier">
                    <IconButton
                      onClick={() => openDialog('fonction', selectedFonction)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              
              <Tabs value={subTabValue} onChange={(e, v) => setSubTabValue(v)} sx={{ mb: 3 }}>
                <Tab label="Thématiques" />
                <Tab label="Niveaux Globaux" />
                <Tab label="Niveaux Thématiques" />
              </Tabs>

              {/* Tab Thématiques */}
              {subTabValue === 0 && (
                <Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h6">Thématiques ({selectedFonction.thematiques?.length || 0})</Typography>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => openDialog('thematique')}
                    >
                      Ajouter une thématique
                    </Button>
                  </Box>
                  
                  {selectedFonction.thematiques?.map((them) => (
                    <Accordion key={them.id_thematique} sx={{ mb: 1 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                              {them.nom}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {them.nombre_questions} questions • {them.niveauxThematiques?.length || 0} niveaux définis
                            </Typography>
                          </Box>
                          <Box onClick={(e) => e.stopPropagation()}>
                            <IconButton
                              size="small"
                              onClick={() => openDialog('thematique', them)}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => confirmDelete('thematique', them.id_thematique, them.nom)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                          {them.description}
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => handleAddQuestion(them)}
                          disabled={(questions[them.id_thematique]?.length || 0) >= them.nombre_questions}
                        >
                          Ajouter une question
                        </Button>
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2">Questions :</Typography>
                          {questions[them.id_thematique]?.map((q, i) => (
                            <Paper key={q.id_question} sx={{ p: 1, mb: 1 }}>
                              <Box display="flex" justifyContent="space-between">
                                <Typography>{i + 1}. {q.texte}</Typography>
                                <Box>
                                  <IconButton size="small" onClick={() => openDialog('question', q)}>
                                    <EditIcon />
                                  </IconButton>
                                </Box>
                              </Box>
                            </Paper>
                          ))}
                        </Box>
                                                        
                        {them.niveauxThematiques && them.niveauxThematiques.length > 0 && (
                          <Box>
                            <Typography variant="subtitle2" gutterBottom>
                              Niveaux définis:
                            </Typography>
                            <Box display="flex" flexWrap="wrap" gap={1}>
                              {them.niveauxThematiques.map(niveau => (
                                <Chip
                                  key={niveau.id_niveau}
                                  label={`${niveau.score_min}-${niveau.score_max}: ${niveau.niveau}`}
                                  size="small"
                                  sx={{
                                    bgcolor: getScoreColor((niveau.score_min + niveau.score_max) / 2),
                                    color: 'white'
                                  }}
                                />
                              ))}
                            </Box>
                          </Box>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  ))}
                  
                  {(!selectedFonction.thematiques || selectedFonction.thematiques.length === 0) && (
                    <Box textAlign="center" py={4}>
                      <Typography variant="body1" color="textSecondary">
                        Aucune thématique définie pour cette fonction
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}

              {/* Tab Niveaux Globaux */}
              {subTabValue === 1 && (
                <Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h6">Niveaux Globaux ({selectedFonction.niveauxGlobaux?.length || 0})</Typography>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => openDialog('niveau-global')}
                    >
                      Ajouter un niveau
                    </Button>
                  </Box>
                  
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell width="120">Score</TableCell>
                          <TableCell width="200">Niveau</TableCell>
                          <TableCell>Description</TableCell>
                          <TableCell width="100">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedFonction.niveauxGlobaux?.map((niveau) => (
                          <TableRow key={niveau.id_niveau}>
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Box
                                  sx={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: '50%',
                                    bgcolor: getScoreColor((niveau.score_min + niveau.score_max) / 2)
                                  }}
                                />
                                {niveau.score_min} - {niveau.score_max}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="subtitle2">
                                {niveau.niveau}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="body2">
                                  {niveau.description}
                                </Typography>
                                {niveau.recommandations && (
                                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                                    <strong>Recommandations:</strong> {niveau.recommandations}
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box>
                                <IconButton
                                  size="small"
                                  onClick={() => openDialog('niveau-global', niveau)}
                                >
                                  <EditIcon />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => confirmDelete('niveau-global', niveau.id_niveau, niveau.niveau)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  {(!selectedFonction.niveauxGlobaux || selectedFonction.niveauxGlobaux.length === 0) && (
                    <Box textAlign="center" py={4}>
                      <Typography variant="body1" color="textSecondary">
                        Aucun niveau global défini pour cette fonction
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}

              {/* Tab Niveaux Thématiques */}
              {subTabValue === 2 && (
                <Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h6">Niveaux Thématiques</Typography>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => openDialog('niveau-thematique')}
                      disabled={!selectedFonction.thematiques || selectedFonction.thematiques.length === 0}
                    >
                      Ajouter un niveau
                    </Button>
                  </Box>
                  
                  {selectedFonction.thematiques?.map((them) => (
                    <Box key={them.id_thematique} mb={3}>
                      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500, color: '#0B4E87' }}>
                        {them.nom}
                      </Typography>
                      
                      {them.niveauxThematiques && them.niveauxThematiques.length > 0 ? (
                        <TableContainer sx={{ mb: 2 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell width="100">Score</TableCell>
                                <TableCell width="200">Niveau</TableCell>
                                <TableCell>Description</TableCell>
                                <TableCell width="80">Actions</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {them.niveauxThematiques.map((niveau) => (
                                <TableRow key={niveau.id_niveau}>
                                  <TableCell>
                                    <Box display="flex" alignItems="center" gap={1}>
                                      <Box
                                        sx={{
                                          width: 12,
                                          height: 12,
                                          borderRadius: '50%',
                                          bgcolor: getScoreColor((niveau.score_min + niveau.score_max) / 2)
                                        }}
                                      />
                                      {niveau.score_min} - {niveau.score_max}
                                    </Box>
                                  </TableCell>
                                  <TableCell>{niveau.niveau}</TableCell>
                                  <TableCell>
                                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                      {niveau.description}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Box>
                                      <IconButton
                                        size="small"
                                        onClick={() => openDialog('niveau-thematique', niveau)}
                                      >
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => confirmDelete('niveau-thematique', niveau.id_niveau, niveau.niveau)}
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Box>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      ) : (
                        <Typography variant="body2" color="textSecondary" sx={{ ml: 2, mb: 2 }}>
                          Aucun niveau défini pour cette thématique
                        </Typography>
                      )}
                      
                      <Divider />
                    </Box>
                  ))}
                  
                  {(!selectedFonction.thematiques || selectedFonction.thematiques.length === 0) && (
                    <Box textAlign="center" py={4}>
                      <Typography variant="body1" color="textSecondary">
                        Aucune thématique définie. Créez d'abord des thématiques pour définir leurs niveaux.
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
            </Paper>
          ) : (
            <Paper sx={{ p: 6, textAlign: 'center', height: 'calc(100vh - 250px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box>
                <AssessmentIcon sx={{ fontSize: 80, color: '#e0e0e0', mb: 2 }} />
                <Typography variant="h6" color="textSecondary">
                  Sélectionnez une fonction pour voir les détails
                </Typography>
              </Box>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Container>
  );

  // ========================================
  // COMPOSANTS DE RENDU POUR LES FONCTIONS GLOBALES
  // ========================================

  const renderFonctionsGlobales = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          <FunctionsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Fonctions de Maturité Globale
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setDialogType('fonction-globale');
            setEditingItem(null);
            setFormData({
              nom: '',
              description: '',
              code_fonction: '',
              poids: 1.0,
              ordre_affichage: fonctionsGlobales.length + 1,
              couleur: '#2196F3',
              icone: 'TrendingUp'
            });
            setDialogOpen(true);
          }}
        >
          Nouvelle Fonction
        </Button>
      </Box>

      {loadingGlobales ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {fonctionsGlobales.map((fonction) => (
            <Grid item xs={12} md={6} lg={4} key={fonction.id_fonction}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { boxShadow: 6 },
                  borderLeft: `4px solid ${fonction.couleur}` 
                }}
                onClick={() => loadFonctionGlobaleDetails(fonction.id_fonction)}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    {React.createElement(
                      availableIcons.find(icon => icon.value === fonction.icone)?.component || TrendingUpIcon,
                      { sx: { color: fonction.couleur, mr: 1 } }
                    )}
                    <Typography variant="h6" component="h3" flexGrow={1}>
                      {fonction.nom}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDialogType('fonction-globale');
                        setEditingItem(fonction);
                        setFormData({
                          nom: fonction.nom,
                          description: fonction.description,
                          code_fonction: fonction.code_fonction,
                          poids: fonction.poids,
                          ordre_affichage: fonction.ordre_affichage,
                          couleur: fonction.couleur,
                          icone: fonction.icone
                        });
                        setDialogOpen(true);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {fonction.description}
                  </Typography>
                  
                  <Box display="flex" gap={1} flexWrap="wrap">
                    <Chip 
                      size="small" 
                      label={`${fonction.nb_questions || 0} questions`} 
                      icon={<SchoolIcon />}
                    />
                    <Chip 
                      size="small" 
                      label={`${fonction.nb_niveaux || 0} niveaux`} 
                      icon={<LayersIcon />}
                    />
                    <Chip 
                      size="small" 
                      label={`${fonction.nb_recommandations || 0} recommandations`} 
                      icon={<LightbulbIcon />}
                    />
                  </Box>
                  
                  <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
                    <Chip 
                      size="small" 
                      label={`Poids: ${fonction.poids}`} 
                      variant="outlined"
                    />
                    <Chip 
                      size="small" 
                      label={fonction.actif ? 'Actif' : 'Inactif'} 
                      color={fonction.actif ? 'success' : 'default'}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );

  const renderDetailsFonctionGlobale = () => {
    if (!selectedFonctionGlobale) return null;

    return (
      <Box>
        <Box display="flex" alignItems="center" mb={3}>
          <Button
            variant="outlined"
            onClick={() => setSelectedFonctionGlobale(null)}
            sx={{ mr: 2 }}
          >
            ← Retour
          </Button>
          <Box display="flex" alignItems="center" flexGrow={1}>
            {React.createElement(
              availableIcons.find(icon => icon.value === selectedFonctionGlobale.icone)?.component || TrendingUpIcon,
              { sx: { color: selectedFonctionGlobale.couleur, mr: 1 } }
            )}
            <Typography variant="h5">
              {selectedFonctionGlobale.nom}
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Section Niveaux */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  <LayersIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Niveaux de Maturité
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setDialogType('niveau-maturite-globale');
                    setEditingItem(null);
                    setFormData({
                      nom_niveau: '',
                      description: '',
                      score_min: 0,
                      score_max: 1,
                      ordre_niveau: (selectedFonctionGlobale.niveaux?.length || 0) + 1,
                      couleur: '#4CAF50'
                    });
                    setDialogOpen(true);
                  }}
                >
                  Ajouter
                </Button>
              </Box>

              {selectedFonctionGlobale.niveaux?.map((niveau) => (
                <Card key={niveau.id_niveau} sx={{ mb: 2, borderLeft: `4px solid ${niveau.couleur}` }}>
                  <CardContent sx={{ py: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {niveau.nom_niveau}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Score: {niveau.score_min} - {niveau.score_max}
                        </Typography>
                        <Typography variant="body2">
                          {niveau.description}
                        </Typography>
                      </Box>
                      <Box>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setDialogType('niveau-maturite-globale');
                            setEditingItem(niveau);
                            setFormData({
                              nom_niveau: niveau.nom_niveau,
                              description: niveau.description,
                              score_min: niveau.score_min,
                              score_max: niveau.score_max,
                              ordre_niveau: niveau.ordre_niveau,
                              couleur: niveau.couleur
                            });
                            setDialogOpen(true);
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setItemToDelete({
                              type: 'niveau',
                              id: niveau.id_niveau,
                              name: niveau.nom_niveau
                            });
                            setDeleteConfirmOpen(true);
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Paper>
          </Grid>

          {/* Section Recommandations */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  <LightbulbIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Recommandations
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setDialogType('recommandation-globale');
                    setEditingItem(null);
                    setFormData({
                      titre: '',
                      description: '',
                      actions_recommandees: [],
                      priorite: 'MOYENNE',
                      type_recommandation: 'MOYEN_TERME',
                      ordre_affichage: 0
                    });
                    setDialogOpen(true);
                  }}
                >
                  Ajouter
                </Button>
              </Box>

              {selectedFonctionGlobale.recommandations?.map((recommandation) => (
                <Card key={recommandation.id_recommandation} sx={{ mb: 2 }}>
                  <CardContent sx={{ py: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="start">
                      <Box flexGrow={1}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {recommandation.titre}
                        </Typography>
                        <Box display="flex" gap={1} my={1}>
                          <Chip 
                            size="small" 
                            label={recommandation.priorite} 
                            color={
                              recommandation.priorite === 'CRITIQUE' ? 'error' :
                              recommandation.priorite === 'HAUTE' ? 'warning' :
                              recommandation.priorite === 'MOYENNE' ? 'primary' : 'default'
                            }
                          />
                          <Chip 
                            size="small" 
                            label={recommandation.type_recommandation.replace('_', ' ')} 
                            variant="outlined"
                          />
                          {recommandation.nom_niveau && (
                            <Chip 
                              size="small" 
                              label={recommandation.nom_niveau} 
                              variant="outlined"
                            />
                          )}
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {recommandation.description}
                        </Typography>
                      </Box>
                      <Box>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setDialogType('recommandation-globale');
                            setEditingItem(recommandation);
                            setFormData({
                              titre: recommandation.titre,
                              description: recommandation.description,
                              actions_recommandees: recommandation.actions_recommandees || [],
                              priorite: recommandation.priorite,
                              type_recommandation: recommandation.type_recommandation,
                              id_niveau: recommandation.id_niveau,
                              score_min: recommandation.score_min,
                              score_max: recommandation.score_max,
                              ordre_affichage: recommandation.ordre_affichage
                            });
                            setDialogOpen(true);
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setItemToDelete({
                              type: 'recommandation',
                              id: recommandation.id_recommandation,
                              name: recommandation.titre
                            });
                            setDeleteConfirmOpen(true);
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  };

  // ========================================
  // DIALOGUES
  // ========================================

  const renderDialogContent = () => {
    switch (dialogType) {
      case 'fonction':
        return (
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Nom"
              value={formData.nom || ''}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Ordre"
              type="number"
              value={formData.ordre || 999}
              onChange={(e) => setFormData({ ...formData, ordre: parseInt(e.target.value) || 999 })}
            />
          </Box>
        );

      case 'thematique':
        return (
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Nom"
              value={formData.nom || ''}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Ordre"
              type="number"
              value={formData.ordre || 999}
              onChange={(e) => setFormData({ ...formData, ordre: parseInt(e.target.value) || 999 })}
            />
            <TextField
              fullWidth
              label="Nombre de questions"
              type="number"
              value={formData.nombre_questions || 0}
              onChange={(e) => setFormData({ ...formData, nombre_questions: parseInt(e.target.value) || 0 })}
            />
          </Box>
        );

      case 'niveau-global':
      case 'niveau-thematique':
        return (
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography gutterBottom>Plage de scores</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Score min"
                  type="number"
                  inputProps={{ min: 0, max: 5, step: 0.1 }}
                  value={formData.score_min ?? ''}
                  onChange={(e) => setFormData({ ...formData, score_min: parseFloat(e.target.value) || 0 })}
                  required
                />
                <TextField
                  label="Score max"
                  type="number"
                  inputProps={{ min: 0, max: 5, step: 0.1 }}
                  value={formData.score_max ?? ''}
                  onChange={(e) => setFormData({ ...formData, score_max: parseFloat(e.target.value) || 0 })}
                  required
                />
              </Box>
            </Box>
            
            <TextField
              fullWidth
              label="Niveau"
              value={formData.niveau || ''}
              onChange={(e) => setFormData({ ...formData, niveau: e.target.value })}
              required
            />
            
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
            
            <TextField
              fullWidth
              label="Recommandations"
              multiline
              rows={3}
              value={formData.recommandations || ''}
              onChange={(e) => setFormData({ ...formData, recommandations: e.target.value })}
            />
            
            {dialogType === 'niveau-global' && (
              <TextField
                fullWidth
                label="Ordre"
                type="number"
                value={formData.ordre || 999}
                onChange={(e) => setFormData({ ...formData, ordre: parseInt(e.target.value) || 999 })}
              />
            )}

            {dialogType === 'niveau-thematique' && !editingItem && (
              <FormControl fullWidth required>
                <InputLabel>Thématique</InputLabel>
                <Select
                  value={formData.id_thematique || ''}
                  onChange={(e) => setFormData({ ...formData, id_thematique: e.target.value })}
                  label="Thématique"
                >
                  {selectedFonction?.thematiques?.map(them => (
                    <MenuItem key={them.id_thematique} value={them.id_thematique}>
                      {them.nom}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
        );

      case 'question':
        return (
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Texte de la question"
              fullWidth
              multiline
              rows={3}
              required
              value={formData.texte || ''}
              onChange={(e) => setFormData({ ...formData, texte: e.target.value })}
            />
            <TextField
              label="Pondération"
              type="number"
              fullWidth
              value={formData.ponderation || 1}
              onChange={(e) => setFormData({ ...formData, ponderation: parseInt(e.target.value) || 1 })}
            />
            <TextField
              label="Aide à la réponse"
              fullWidth
              multiline
              rows={2}
              value={formData.aide_reponse || ''}
              onChange={(e) => setFormData({ ...formData, aide_reponse: e.target.value })}
            />
          </Box>
        );

      case 'fonction-globale':
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nom de la fonction"
                value={formData.nom || ''}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Code fonction"
                value={formData.code_fonction || ''}
                onChange={(e) => setFormData({ ...formData, code_fonction: e.target.value })}
                required
                disabled={!!editingItem}
                helperText="Code unique pour identifier la fonction (non modifiable après création)"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="Poids"
                value={formData.poids || 1.0}
                onChange={(e) => setFormData({ ...formData, poids: parseFloat(e.target.value) })}
                inputProps={{ step: 0.1, min: 0.1, max: 5.0 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="Ordre d'affichage"
                value={formData.ordre_affichage || 1}
                onChange={(e) => setFormData({ ...formData, ordre_affichage: parseInt(e.target.value) })}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="color"
                label="Couleur"
                value={formData.couleur || '#2196F3'}
                onChange={(e) => setFormData({ ...formData, couleur: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Icône</InputLabel>
                <Select
                  value={formData.icone || 'TrendingUp'}
                  onChange={(e) => setFormData({ ...formData, icone: e.target.value })}
                  label="Icône"
                >
                  {availableIcons.map((icon) => (
                    <MenuItem key={icon.value} value={icon.value}>
                      <Box display="flex" alignItems="center">
                        {React.createElement(icon.component, { sx: { mr: 1 } })}
                        {icon.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );

      case 'niveau-maturite-globale':
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nom du niveau"
                value={formData.nom_niveau || ''}
                onChange={(e) => setFormData({ ...formData, nom_niveau: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="Score minimum"
                value={formData.score_min || 0}
                onChange={(e) => setFormData({ ...formData, score_min: parseFloat(e.target.value) })}
                inputProps={{ step: 0.01, min: 0, max: 5 }}
                required
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="Score maximum"
                value={formData.score_max || 1}
                onChange={(e) => setFormData({ ...formData, score_max: parseFloat(e.target.value) })}
                inputProps={{ step: 0.01, min: 0, max: 5 }}
                required
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="Ordre"
                value={formData.ordre_niveau || 1}
                onChange={(e) => setFormData({ ...formData, ordre_niveau: parseInt(e.target.value) })}
                inputProps={{ min: 1 }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="color"
                label="Couleur"
                value={formData.couleur || '#4CAF50'}
                onChange={(e) => setFormData({ ...formData, couleur: e.target.value })}
              />
            </Grid>
          </Grid>
        );

      case 'recommandation-globale':
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Titre"
                value={formData.titre || ''}
                onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Priorité</InputLabel>
                <Select
                  value={formData.priorite || 'MOYENNE'}
                  onChange={(e) => setFormData({ ...formData, priorite: e.target.value })}
                  label="Priorité"
                >
                  <MenuItem value="FAIBLE">Faible</MenuItem>
                  <MenuItem value="MOYENNE">Moyenne</MenuItem>
                  <MenuItem value="HAUTE">Haute</MenuItem>
                  <MenuItem value="CRITIQUE">Critique</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type_recommandation || 'MOYEN_TERME'}
                  onChange={(e) => setFormData({ ...formData, type_recommandation: e.target.value })}
                  label="Type"
                >
                  <MenuItem value="IMMEDIATE">Immédiate</MenuItem>
                  <MenuItem value="COURT_TERME">Court terme</MenuItem>
                  <MenuItem value="MOYEN_TERME">Moyen terme</MenuItem>
                  <MenuItem value="LONG_TERME">Long terme</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {selectedFonctionGlobale?.niveaux && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Niveau associé (optionnel)</InputLabel>
                  <Select
                    value={formData.id_niveau || ''}
                    onChange={(e) => setFormData({ ...formData, id_niveau: e.target.value || null })}
                    label="Niveau associé (optionnel)"
                  >
                    <MenuItem value="">Aucun niveau spécifique</MenuItem>
                    {selectedFonctionGlobale.niveaux.map((niveau) => (
                      <MenuItem key={niveau.id_niveau} value={niveau.id_niveau}>
                        {niveau.nom_niveau} ({niveau.score_min} - {niveau.score_max})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
        );

      default:
        return <Typography>Contenu du dialogue non défini pour le type: {dialogType}</Typography>;
    }
  };

  const getDialogTitle = () => {
    const action = editingItem ? 'Modifier' : 'Créer';
    switch (dialogType) {
      case 'fonction': return `${action} une fonction`;
      case 'thematique': return `${action} une thématique`;
      case 'niveau-global': return `${action} un niveau global`;
      case 'niveau-thematique': return `${action} un niveau thématique`;
      case 'question': return `${action} une question`;
      case 'fonction-globale': return `${action} une fonction globale`;
      case 'niveau-maturite-globale': return `${action} un niveau de maturité`;
      case 'recommandation-globale': return `${action} une recommandation`;
      default: return 'Dialogue';
    }
  };

  // ========================================
  // COMPOSANT PRINCIPAL
  // ========================================

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        <SettingsIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
        Administration du Modèle de Maturité
      </Typography>

      <Paper sx={{ mt: 3 }}>
        <Tabs 
          value={mainTabValue} 
          onChange={(e, newValue) => setMainTabValue(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Modèle Standard" icon={<CategoryIcon />} />
          <Tab label="Fonctions Globales" icon={<FunctionsIcon />} />
        </Tabs>

        <Box sx={{ p: 0 }}>
          {mainTabValue === 0 && renderModelStandard()}
          
          {mainTabValue === 1 && (
            <Box sx={{ p: 3 }}>
              {selectedFonctionGlobale ? 
                renderDetailsFonctionGlobale() : 
                renderFonctionsGlobales()
              }
            </Box>
          )}
        </Box>
      </Paper>

      {/* Dialogue universel */}
      <Dialog open={dialogOpen} onClose={resetForm} maxWidth="md" fullWidth>
        <DialogTitle>{getDialogTitle()}</DialogTitle>
        <DialogContent>
          {renderDialogContent()}
        </DialogContent>
        <DialogActions>
          <Button onClick={resetForm}>Annuler</Button>
          <Button
            onClick={
              dialogType.includes('globale') || 
              dialogType.includes('niveau-maturite') || 
              dialogType.includes('recommandation') ? 
              handleSaveGlobale : 
              handleSave
            }
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={
              (!formData.nom && (dialogType === 'fonction' || dialogType === 'thematique' || dialogType === 'fonction-globale')) ||
              (!formData.niveau && (dialogType === 'niveau-global' || dialogType === 'niveau-thematique')) ||
              (!formData.nom_niveau && dialogType === 'niveau-maturite-globale') ||
              (!formData.titre && dialogType === 'recommandation-globale') ||
              (!formData.texte && dialogType === 'question')
            }
          >
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialogue de confirmation de suppression */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer "{itemToDelete?.name}" ?
          </Typography>
          <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
            Cette action est irréversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => {
              if (itemToDelete) {
                if (itemToDelete.type === 'fonction-globale' || 
                    itemToDelete.type === 'niveau' || 
                    itemToDelete.type === 'recommandation') {
                  handleDeleteGlobale(itemToDelete.type, itemToDelete.id);
                } else {
                  handleDelete();
                }
              }
            }}
            color="error"
            variant="contained"
            startIcon={<DeleteIcon />}
          >
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar pour les notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default MaturityModelAdmin;