// src/pages/MaturityModelAdmin/index.tsx
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
  ListItem
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
  Settings as SettingsIcon
} from '@mui/icons-material';
import api from '../../services/api';

// Types
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

interface FormData {
  [key: string]: any;
}

type DialogType = 'fonction' | 'thematique' | 'niveau-global' | 'niveau-thematique' | '';

const MaturityModelAdmin: React.FC = () => {
  // États
  const [fonctions, setFonctions] = useState<Fonction[]>([]);
  const [selectedFonction, setSelectedFonction] = useState<Fonction | null>(null);
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });
  
  const [questions, setQuestions] = useState<{ [id_thematique: string]: any[] }>({});

  const loadQuestionsForThematique = async (id_thematique: string) => {
      try {
        const data = await api.get(`/questions/thematique/${id_thematique}`);
        setQuestions((prev) => ({ ...prev, [id_thematique]: data }));
      } catch (e) {
        showSnackbar('Erreur chargement des questions', 'error');
      }
    };

  // États pour les dialogues
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<DialogType>('');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<FormData>({});
  
  // États pour les confirmations
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: string; id: string; name: string } | null>(null);

  // Charger les fonctions au montage
  useEffect(() => {
    loadFonctions();
  }, []);

  // Charger les questions quand une fonction est chargée
  useEffect(() => {
      selectedFonction?.thematiques?.forEach((t) => loadQuestionsForThematique(t.id_thematique));
    }, [selectedFonction]);

  // Fonctions de chargement
  const loadFonctions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/maturity-model/fonctions');
      setFonctions(response.data || response);
      if ((response.data || response).length > 0 && !selectedFonction) {
        loadFonctionDetails((response.data || response)[0].id_fonction);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des fonctions:', error);
      showSnackbar('Erreur lors du chargement des fonctions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadFonctionDetails = async (fonctionId: string) => {
    setLoading(true);
    try {
      const response = await api.get(`/maturity-model/fonctions/${fonctionId}`);
      setSelectedFonction(response.data || response);
    } catch (error) {
      console.error('Erreur lors du chargement des détails:', error);
      showSnackbar('Erreur lors du chargement des détails', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fonctions utilitaires
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const openDialog = (type: DialogType, item: any = null) => {
    setDialogType(type);
    setEditingItem(item);
    setFormData(item || {});
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setFormData({});
    setDialogType('');
  };

  const confirmDelete = (type: string, id: string, name: string) => {
    setItemToDelete({ type, id, name });
    setDeleteConfirmOpen(true);
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

  // Fonction de sauvegarde
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

        case 'question': {
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
          closeDialog();
          break;
        }
      }
      
      closeDialog();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      showSnackbar('Erreur lors de la sauvegarde', 'error');
    }
  };

  // Fonction de suppression
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
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      showSnackbar('Erreur lors de la suppression', 'error');
    }
  };

  // Fonction d'export
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

  // Fonction utilitaire pour la couleur des scores
  const getScoreColor = (score: number): string => {
    if (score >= 4) return '#4CAF50';
    if (score >= 3) return '#FF9800';
    if (score >= 2) return '#F44336';
    return '#9E9E9E';
  };

  // Composant de dialogue
  const renderDialog = () => {
    const getDialogTitle = () => {
      const action = editingItem ? 'Modifier' : 'Créer';
      switch (dialogType) {
        case 'fonction': return `${action} une fonction`;
        case 'thematique': return `${action} une thématique`;
        case 'niveau-global': return `${action} un niveau global`;
        case 'niveau-thematique': return `${action} un niveau thématique`;
        default: return '';
      }
    };

    return (
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="md" fullWidth>
        <DialogTitle>{getDialogTitle()}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(dialogType === 'fonction' || dialogType === 'thematique') && (
              <>
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
              </>
            )}
            
            {dialogType === 'thematique' && (
              <TextField
                fullWidth
                label="Nombre de questions"
                type="number"
                value={formData.nombre_questions || 0}
                onChange={(e) => setFormData({ ...formData, nombre_questions: parseInt(e.target.value) || 0 })}
              />
            )}
            
            {(dialogType === 'niveau-global' || dialogType === 'niveau-thematique') && (
              <>
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
              </>
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

            {dialogType === 'question' && (
              <>
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
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Annuler</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={
              !formData.nom && (dialogType === 'fonction' || dialogType === 'thematique') ||
              !formData.niveau && (dialogType === 'niveau-global' || dialogType === 'niveau-thematique')
            }
          >
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Rendu principal
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={2}>
                <SettingsIcon color="primary" fontSize="large" />
                <Typography component="h1" variant="h4" color="primary">
                  Administration du Modèle de Maturité
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
          </Paper>
        </Grid>

        {/* Liste des fonctions */}
        <Grid xs={12} md={4}>
          <Paper sx={{ p: 2, height: 'calc(100vh - 200px)', overflow: 'auto' }}>
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
        <Grid xs={12} md={8}>
          {selectedFonction ? (
            <Paper sx={{ p: 2, height: 'calc(100vh - 200px)', overflow: 'auto' }}>
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
              
              <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 3 }}>
                <Tab label="Thématiques" />
                <Tab label="Niveaux Globaux" />
                <Tab label="Niveaux Thématiques" />
              </Tabs>

              {/* Tab Thématiques */}
              {tabValue === 0 && (
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
              {tabValue === 1 && (
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
              {tabValue === 2 && (
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
            <Paper sx={{ p: 6, textAlign: 'center', height: 'calc(100vh - 200px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

      {/* Dialogues */}
      {renderDialog()}

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
            onClick={handleDelete}
            color="error"
            variant="contained"
            startIcon={<DeleteIcon />}
          >
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
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