import React, { useEffect, useState } from 'react';
import api from '../../../services/api';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Button,
  TextField,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardHeader,
  CardContent,
  Tooltip,
  Alert,
  Snackbar,
  ListItemButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Chip,
  Checkbox,
  ListSubheader
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  FileCopy as CloneIcon,
  DragIndicator as DragIcon
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';

// Types
interface Questionnaire {
  id_questionnaire: string;
  nom?: string;
  fonction?: string; // Pour la compatibilité
  thematique?: string; // Pour la compatibilité
  description?: string;
  date_creation: string;
  date_modification: string;
}

interface Question {
  id_question: string;
  id_questionnaire?: string; // Maintenant optionnel
  id_thematique: string;
  texte: string;
  ponderation: number;
  ordre: number;
  date_creation: string;
  date_modification: string;
  thematique_nom?: string;
}

interface Fonction {
  id_fonction: string;
  nom: string;
  description?: string;
  nombre_thematiques?: number;
}

interface Thematique {
  id_thematique: string;
  nom: string;
  description?: string;
  id_fonction: string;
  fonction_nom?: string;
}

interface QuestionnaireFormValues {
  nom: string;
  description?: string;
  thematiques: string[];
}

interface QuestionFormValues {
  id_questionnaire?: string;
  id_thematique: string;
  texte: string;
  ponderation: number;
  ordre?: number | string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const initialQuestionnaireFormValues: QuestionnaireFormValues = {
  nom: '',
  description: '',
  thematiques: []
};

const initialQuestionFormValues: QuestionFormValues = {
  id_thematique: '',
  texte: '',
  ponderation: 1,
  ordre: 0
};

const QuestionnaireAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const questionnaireId = searchParams.get('id');
  
  // États pour les données
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<Questionnaire | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [fonctions, setFonctions] = useState<Fonction[]>([]);
  const [thematiques, setThematiques] = useState<Thematique[]>([]);
  const [selectedThematiques, setSelectedThematiques] = useState<string[]>([]);
  const [loadingFonctions, setLoadingFonctions] = useState<boolean>(false);
  const [loadingThematiques, setLoadingThematiques] = useState<boolean>(false);
  
  // États pour les formulaires
  const [questionnaireFormValues, setQuestionnaireFormValues] = useState<QuestionnaireFormValues>(initialQuestionnaireFormValues);
  const [questionFormValues, setQuestionFormValues] = useState<QuestionFormValues>(initialQuestionFormValues);
  
  // États pour les dialogues
  const [openQuestionnaireDialog, setOpenQuestionnaireDialog] = useState<boolean>(false);
  const [openQuestionDialog, setOpenQuestionDialog] = useState<boolean>(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState<boolean>(false);
  const [openDeleteQuestionDialog, setOpenDeleteQuestionDialog] = useState<boolean>(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  
  // État pour les notifications
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // États pour le mode d'édition
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [questionDialogMode, setQuestionDialogMode] = useState<'create' | 'edit'>('create');
  const [tabValue, setTabValue] = useState<number>(0);
  
  // Chargement initial
  useEffect(() => {
    console.log('🚀 Initialisation du composant QuestionnaireAdmin');
    
    const loadData = async () => {
      try {
        // Charger d'abord les fonctions et thématiques
        await Promise.all([
          fetchFonctions(),
          fetchThematiques()
        ]);
        
        // Puis charger les questionnaires
        await fetchQuestionnaires();
        
        // Si un ID de questionnaire est spécifié, le charger
        if (questionnaireId) {
          console.log('🎯 Chargement du questionnaire spécifique:', questionnaireId);
          await fetchQuestionnaireById(questionnaireId);
          setTabValue(1); // Aller à l'onglet des questions
        }
      } catch (error) {
        console.error('❌ Erreur lors du chargement initial:', error);
      }
    };
    
    loadData();
  }, [questionnaireId]);

  // Récupérer toutes les thématiques
  const fetchThematiques = async () => {
    setLoadingThematiques(true);
    try {
      console.log('🔍 Chargement des thématiques...');
      const response = await api.get('thematiques');
      const data = Array.isArray(response) ? response : response.data || [];
      console.log('✅ Thématiques reçues:', data.length);
      setThematiques(data);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des thématiques:', error);
      setThematiques([]);
    } finally {
      setLoadingThematiques(false);
    }
  };
  
  // Récupérer tous les questionnaires
  const fetchQuestionnaires = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Chargement des questionnaires...');
      const response = await api.get('questionnaires');
      console.log('✅ Questionnaires reçus:', response);
      
      let questionnaireData = [];
      if (Array.isArray(response)) {
        questionnaireData = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        questionnaireData = response.data;
      } else {
        console.warn('Format de réponse inattendu pour questionnaires:', response);
        setError('Format de données inattendu pour les questionnaires');
        questionnaireData = [];
      }
      
      setQuestionnaires(questionnaireData);
    } catch (error: any) {
      console.error('❌ Erreur lors du chargement des questionnaires:', error);
      showSnackbar('Erreur lors du chargement des questionnaires.', 'error');
      setError('Impossible de charger les questionnaires');
      setQuestionnaires([]);
    } finally {
      setLoading(false);
    }
  };

  // Récupérer toutes les fonctions
  const fetchFonctions = async () => {
    setLoadingFonctions(true);
    
    try {
      console.log('🔍 Chargement des fonctions depuis /fonctions...');
      const response = await api.get('fonctions');
      console.log('✅ Fonctions reçues:', response);
      
      let fonctionsData = [];
      if (Array.isArray(response)) {
        fonctionsData = response;
      } else {
        console.warn('Format de réponse inattendu pour fonctions:', response);
        fonctionsData = [];
      }
      
      setFonctions(fonctionsData);
    } catch (error: any) {
      console.error('❌ Erreur lors du chargement des fonctions:', error);
      showSnackbar('Erreur lors du chargement des fonctions.', 'warning');
      setFonctions([]);
    } finally {
      setLoadingFonctions(false);
    }
  };
  
  // Récupérer un questionnaire par son ID
  const fetchQuestionnaireById = async (id: string) => {
    try {
      console.log('🔍 Chargement du questionnaire:', id);
      const questionnaireResponse = await api.get(`questionnaires/${id}`);
      console.log('✅ Questionnaire reçu:', questionnaireResponse);
      
      let questionnaireData = null;
      if (questionnaireResponse && typeof questionnaireResponse === 'object') {
        if (Array.isArray(questionnaireResponse)) {
          questionnaireData = questionnaireResponse[0];
        } else if (questionnaireResponse.data) {
          questionnaireData = questionnaireResponse.data;
        } else {
          questionnaireData = questionnaireResponse;
        }
      }
      
      if (questionnaireData && questionnaireData.id_questionnaire) {
        setSelectedQuestionnaire(questionnaireData);
      }
      
      // Récupérer les questions
      try {
        console.log('🔍 Chargement des questions pour:', id);
        const questionsResponse = await api.get(`questionnaires/${id}/questions`);
        console.log('✅ Questions reçues:', questionsResponse);
        
        let questionsData = [];
        if (Array.isArray(questionsResponse)) {
          questionsData = questionsResponse;
        } else if (questionsResponse && questionsResponse.data && Array.isArray(questionsResponse.data)) {
          questionsData = questionsResponse.data;
        }
        
        setQuestions(questionsData.sort((a: Question, b: Question) => (a.ordre || 0) - (b.ordre || 0)));
      } catch (questionsError: any) {
        console.error('❌ Erreur lors du chargement des questions:', questionsError);
        setQuestions([]);
      }
    } catch (error: any) {
      console.error('❌ Erreur lors du chargement du questionnaire:', error);
      showSnackbar('Erreur lors du chargement du questionnaire.', 'error');
    }
  };
  
  // Gérer l'ouverture du dialogue de création de questionnaire
  const handleOpenCreateQuestionnaireDialog = () => {
    console.log('🆕 Ouverture du dialogue de création');
    setDialogMode('create');
    setQuestionnaireFormValues(initialQuestionnaireFormValues);
    setSelectedThematiques([]);
    setOpenQuestionnaireDialog(true);
    
    // Charger les thématiques si pas encore fait
    if (thematiques.length === 0) {
      fetchThematiques();
    }
  };
  
  // Gérer l'ouverture du dialogue d'édition de questionnaire
  const handleOpenEditQuestionnaireDialog = async (questionnaire: Questionnaire) => {
    setDialogMode('edit');
    
    // Charger les thématiques du questionnaire
    try {
      const themesResponse = await api.get(`questionnaire-thematiques/${questionnaire.id_questionnaire}/thematiques`);
      const linkedThemes = Array.isArray(themesResponse) ? themesResponse : themesResponse.data || [];
      const themeIds = linkedThemes.map((t: any) => t.id_thematique);
      
      setQuestionnaireFormValues({
        nom: questionnaire.nom || `${questionnaire.fonction || ''} - ${questionnaire.thematique || ''}`,
        description: questionnaire.description || '',
        thematiques: themeIds
      });
      setSelectedThematiques(themeIds);
    } catch (error) {
      console.error('Erreur lors du chargement des thématiques:', error);
      setQuestionnaireFormValues({
        nom: questionnaire.nom || `${questionnaire.fonction || ''} - ${questionnaire.thematique || ''}`,
        description: questionnaire.description || '',
        thematiques: []
      });
      setSelectedThematiques([]);
    }
    
    setOpenQuestionnaireDialog(true);
    
    // Charger toutes les thématiques disponibles si pas encore fait
    if (thematiques.length === 0) {
      fetchThematiques();
    }
  };
  
  // Fermer le dialogue de questionnaire
  const handleCloseQuestionnaireDialog = () => {
    setOpenQuestionnaireDialog(false);
  };
  
  // Soumettre le formulaire de questionnaire
  const handleSubmitQuestionnaire = async () => {
    try {
      console.log('🚀 Soumission du questionnaire');
      
      if (!questionnaireFormValues.nom.trim()) {
        showSnackbar('Le nom est obligatoire.', 'warning');
        return;
      }
      
      if (selectedThematiques.length === 0) {
        showSnackbar('Sélectionnez au moins une thématique.', 'warning');
        return;
      }

      const questionnaireData = {
        nom: questionnaireFormValues.nom.trim(),
        description: questionnaireFormValues.description,
        thematiques: selectedThematiques
      };

      console.log('📤 Données à envoyer:', questionnaireData);

      if (dialogMode === 'create') {
        const response = await api.post('questionnaires', questionnaireData);
        console.log('✅ Questionnaire créé:', response);
        
        await fetchQuestionnaires();
        showSnackbar('Questionnaire créé avec succès.', 'success');
        
        const newId = response?.data?.id_questionnaire || response?.id_questionnaire;
        if (newId) {
          await fetchQuestionnaireById(newId);
          setTabValue(1);
        }
      } else if (dialogMode === 'edit' && selectedQuestionnaire) {
        const response = await api.put(
          `questionnaires/${selectedQuestionnaire.id_questionnaire}`, 
          questionnaireData
        );
        console.log('✅ Questionnaire mis à jour:', response);
        
        await fetchQuestionnaires();
        await fetchQuestionnaireById(selectedQuestionnaire.id_questionnaire);
        showSnackbar('Questionnaire mis à jour avec succès.', 'success');
      }
      
      handleCloseQuestionnaireDialog();
    } catch (error: any) {
      console.error('❌ Erreur:', error);
      showSnackbar('Erreur lors de la sauvegarde du questionnaire.', 'error');
    }
  };
  
  // Gérer l'ouverture du dialogue de confirmation de suppression
  const handleOpenDeleteDialog = (questionnaire: Questionnaire) => {
    setSelectedQuestionnaire(questionnaire);
    setOpenDeleteDialog(true);
  };
  
  // Fermer le dialogue de confirmation de suppression
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };
  
  // Supprimer un questionnaire
  const handleDeleteQuestionnaire = async () => {
    if (!selectedQuestionnaire) return;
    
    try {
      console.log('🗑️ Suppression du questionnaire:', selectedQuestionnaire.id_questionnaire);
      await api.delete(`questionnaires/${selectedQuestionnaire.id_questionnaire}`);
      console.log('✅ Questionnaire supprimé');
      
      await fetchQuestionnaires();
      setSelectedQuestionnaire(null);
      setQuestions([]);
      setTabValue(0);
      handleCloseDeleteDialog();
      showSnackbar('Questionnaire supprimé avec succès.', 'success');
    } catch (error: any) {
      console.error('❌ Erreur lors de la suppression du questionnaire:', error);
      showSnackbar('Erreur lors de la suppression du questionnaire.', 'error');
    }
  };

  // Sélectionner un questionnaire pour l'édition
  const handleSelectQuestionnaire = async (questionnaire: Questionnaire) => {
    setSelectedQuestionnaire(questionnaire);
    await fetchQuestionnaireById(questionnaire.id_questionnaire);
    setTabValue(1);
    navigate(`/questionnaires/admin?id=${questionnaire.id_questionnaire}`, { replace: true });
  };

  // Gérer le changement d'onglet
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Autres fonctions restent identiques...
  
  // Afficher une notification
  const showSnackbar = (message: string, severity: 'success' | 'info' | 'warning' | 'error') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  // Fermer la notification
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Navigation vers la liste des questionnaires
  const handleBackToList = () => {
    navigate('/questionnaires');
  };

  if (loading && questionnaires.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        {/* En-tête */}
        <Grid size={12}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box display="flex" alignItems="center">
                <IconButton color="primary" onClick={handleBackToList} sx={{ mr: 1 }}>
                  <ArrowBackIcon />
                </IconButton>
                <Typography component="h1" variant="h5" color="primary">
                  Administration des Questionnaires
                </Typography>
              </Box>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleOpenCreateQuestionnaireDialog}
              >
                Nouveau Questionnaire
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Onglets */}
        <Grid size={12}>
          <Paper sx={{ width: '100%' }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              variant="fullWidth"
            >
              <Tab label="Liste des Questionnaires" />
              
            </Tabs>

            {/* Onglet Liste des Questionnaires */}
            <TabPanel value={tabValue} index={0}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Questionnaires disponibles
                </Typography>
                <Divider />
              </Box>
              
              {questionnaires.length > 0 ? (
                <List>
                  {questionnaires.map((questionnaire) => (
                    <ListItemButton
                      key={questionnaire.id_questionnaire}
                      onClick={() => handleSelectQuestionnaire(questionnaire)}
                      selected={selectedQuestionnaire?.id_questionnaire === questionnaire.id_questionnaire}
                      sx={{ 
                        borderRadius: 1, 
                        mb: 1,
                        border: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography variant="subtitle1" fontWeight="bold">
                            {questionnaire.nom }
                          </Typography>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary">
                            {questionnaire.description || 'Aucune description'}
                          </Typography>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Tooltip title="Éditer">
                          <IconButton 
                            edge="end" 
                            color="primary" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditQuestionnaireDialog(questionnaire);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Supprimer">
                          <IconButton 
                            edge="end" 
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDeleteDialog(questionnaire);
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </ListItemButton>
                  ))}
                </List>
              ) : (
                <Box textAlign="center" py={4}>
                  <Typography variant="body1" gutterBottom>
                    Aucun questionnaire disponible.
                  </Typography>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    startIcon={<AddIcon />}
                    onClick={handleOpenCreateQuestionnaireDialog}
                    sx={{ mt: 2 }}
                  >
                    Créer un questionnaire
                  </Button>
                </Box>
              )}
            </TabPanel>

            {/* Onglet Gestion des Questions */}
            <TabPanel value={tabValue} index={1}>
              {selectedQuestionnaire ? (
                <>
                  <Card sx={{ mb: 3 }}>
                    <CardHeader 
                      title={selectedQuestionnaire.nom || `${selectedQuestionnaire.fonction || 'Sans titre'}`}
                      action={
                        <Button
                          variant="outlined"
                          color="primary"
                          startIcon={<EditIcon />}
                          onClick={() => handleOpenEditQuestionnaireDialog(selectedQuestionnaire)}
                        >
                          Modifier
                        </Button>
                      }
                    />
                    <CardContent>
                      <Typography variant="body1" paragraph>
                        {selectedQuestionnaire.description || 'Aucune description disponible.'}
                      </Typography>
                    </CardContent>
                  </Card>

                  <Typography variant="h6" gutterBottom>
                    Questions ({questions.length})
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  {questions.length > 0 ? (
                    <Box>
                      {/* Grouper les questions par thématique */}
                      {Object.entries(
                        questions.reduce((acc, question) => {
                          const thematique = question.thematique_nom || 'Sans thématique';
                          if (!acc[thematique]) acc[thematique] = [];
                          acc[thematique].push(question);
                          return acc;
                        }, {} as Record<string, Question[]>)
                      ).map(([thematique, themeQuestions]) => (
                        <Box key={thematique} sx={{ mb: 3 }}>
                          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                            {thematique}
                          </Typography>
                          {themeQuestions
                            .sort((a, b) => (a.ordre || 0) - (b.ordre || 0))
                            .map((question) => (
                              <Accordion key={question.id_question}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                  <Box display="flex" alignItems="center" width="100%">
                                    <Typography sx={{ width: '5%', mr: 1 }}>
                                      <strong>{question.ordre || '?'}.</strong>
                                    </Typography>
                                    <Typography sx={{ width: '80%' }}>
                                      {question.texte || 'Question sans texte'}
                                    </Typography>
                                    <Typography sx={{ width: '15%', textAlign: 'right' }}>
                                      Pond.: {question.ponderation || 0}
                                    </Typography>
                                  </Box>
                                </AccordionSummary>
                                <AccordionDetails>
                                  <Typography variant="body2" color="textSecondary">
                                    <strong>Pondération:</strong> {question.ponderation || 0}
                                  </Typography>
                                </AccordionDetails>
                              </Accordion>
                            ))}
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      Aucune question trouvée. Les questions sont automatiquement chargées depuis les thématiques sélectionnées.
                    </Alert>
                  )}
                </>
              ) : (
                <Box textAlign="center" py={4}>
                  <Typography variant="body1" gutterBottom>
                    Veuillez sélectionner un questionnaire dans l'onglet précédent.
                  </Typography>
                  <Button 
                    variant="contained" 
                    color="primary"
                    onClick={() => setTabValue(0)}
                    sx={{ mt: 2 }}
                  >
                    Retour à la liste
                  </Button>
                </Box>
              )}
            </TabPanel>
          </Paper>
        </Grid>
      </Grid>

      {/* Dialog pour créer/modifier un questionnaire */}
      <Dialog open={openQuestionnaireDialog} onClose={handleCloseQuestionnaireDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' ? 'Créer un nouveau questionnaire' : 'Modifier le questionnaire'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" noValidate sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid size={12}>
                <TextField
                  required
                  fullWidth
                  id="nom"
                  name="nom"
                  label="Nom du questionnaire"
                  value={questionnaireFormValues.nom}
                  onChange={(e) => setQuestionnaireFormValues({...questionnaireFormValues, nom: e.target.value})}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  id="description"
                  name="description"
                  label="Description"
                  multiline
                  rows={3}
                  value={questionnaireFormValues.description || ''}
                  onChange={(e) => setQuestionnaireFormValues({...questionnaireFormValues, description: e.target.value})}
                />
              </Grid>
              <Grid size={12}>
                <FormControl fullWidth required>
                  <InputLabel>Thématiques</InputLabel>
                  <Select
                    multiple
                    value={selectedThematiques}
                    onChange={(e) => setSelectedThematiques(e.target.value as string[])}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => {
                          const theme = thematiques.find(t => t.id_thematique === value);
                          return <Chip key={value} label={theme?.nom || value} size="small" />;
                        })}
                      </Box>
                    )}
                  >
                    {loadingThematiques ? (
                      <MenuItem disabled>Chargement des thématiques...</MenuItem>
                    ) : thematiques.length === 0 ? (
                      <MenuItem disabled>Aucune thématique disponible</MenuItem>
                    ) : (
                      Object.entries(
                        thematiques.reduce((acc, theme) => {
                          const fonction = theme.fonction_nom || 'Sans fonction';
                          if (!acc[fonction]) acc[fonction] = [];
                          acc[fonction].push(theme);
                          return acc;
                        }, {} as Record<string, Thematique[]>)
                      ).map(([fonction, themes]) => [
                        <ListSubheader key={fonction}>{fonction}</ListSubheader>,
                        ...themes.map((theme) => (
                          <MenuItem key={theme.id_thematique} value={theme.id_thematique}>
                            <Checkbox checked={selectedThematiques.includes(theme.id_thematique)} />
                            <ListItemText 
                              primary={theme.nom} 
                              secondary={theme.description} 
                            />
                          </MenuItem>
                        ))
                      ]).flat()
                    )}
                  </Select>
                  <FormHelperText>Sélectionnez une ou plusieurs thématiques</FormHelperText>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseQuestionnaireDialog}>Annuler</Button>
          <Button 
            onClick={handleSubmitQuestionnaire} 
            variant="contained" 
            color="primary"
            disabled={!questionnaireFormValues.nom.trim() || selectedThematiques.length === 0}
          >
            {dialogMode === 'create' ? 'Créer' : 'Mettre à jour'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer le questionnaire "{selectedQuestionnaire?.nom || 'Sans titre'}" ?
            Cette action est irréversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Annuler</Button>
          <Button onClick={handleDeleteQuestionnaire} variant="contained" color="error">
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default QuestionnaireAdmin;