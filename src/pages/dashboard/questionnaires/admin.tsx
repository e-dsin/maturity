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
  FormHelperText
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
  fonction: string;
  thematique: string;
  description?: string;
  date_creation: string;
  date_modification: string;
}

interface Question {
  id_question: string;
  id_questionnaire: string;
  texte: string;
  ponderation: number;
  ordre: number;
  date_creation: string;
  date_modification: string;
}

interface Fonction {
  id_fonction: string;
  nom: string;
  description?: string;
  nombre_thematiques?: number;
}

interface QuestionnaireFormValues {
  fonction: string;
  thematique: string;
  description?: string;
}

interface QuestionFormValues {
  id_questionnaire: string;
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
  fonction: '',
  thematique: 'Evaluation Complète',
  description: ''
};

const initialQuestionFormValues: QuestionFormValues = {
  id_questionnaire: '',
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
  const [loadingFonctions, setLoadingFonctions] = useState<boolean>(false);
  
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
    fetchQuestionnaires().then(() => {
      if (questionnaireId) {
        fetchQuestionnaireById(questionnaireId);
        setTabValue(1); // Aller à l'onglet des questions
      }
    });
    fetchFonctions(); // Charger les fonctions
  }, [questionnaireId]);
  
  // Récupérer tous les questionnaires
  const fetchQuestionnaires = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('questionnaires');
      
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
    } catch (error) {
      console.error('Erreur lors du chargement des questionnaires:', error);
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
      const response = await api.get('fonctions');
      
      let fonctionsData = [];
      if (Array.isArray(response)) {
        fonctionsData = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        fonctionsData = response.data;
      } else {
        console.warn('Format de réponse inattendu pour fonctions:', response);
        fonctionsData = [];
      }
      
      setFonctions(fonctionsData);
    } catch (error) {
      console.error('Erreur lors du chargement des fonctions:', error);
      showSnackbar('Erreur lors du chargement des fonctions.', 'warning');
      setFonctions([]);
    } finally {
      setLoadingFonctions(false);
    }
  };
  
  // Récupérer un questionnaire par son ID
  const fetchQuestionnaireById = async (id: string) => {
    try {
      const questionnaireResponse = await api.get(`questionnaires/${id}`);
      
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
      } else {
        showSnackbar('Format de réponse inattendu pour le questionnaire', 'warning');
        console.warn('Format de réponse inattendu pour questionnaire:', questionnaireResponse);
      }
      
      // Récupérer les questions
      try {
        const questionsResponse = await api.get(`questionnaires/${id}/questions`);
        
        let questionsData = [];
        if (Array.isArray(questionsResponse)) {
          questionsData = questionsResponse;
        } else if (questionsResponse && questionsResponse.data && Array.isArray(questionsResponse.data)) {
          questionsData = questionsResponse.data;
        } else {
          console.warn('Format de réponse inattendu pour les questions:', questionsResponse);
          questionsData = [];
        }
        
        // Trier les questions par ordre
        setQuestions(questionsData.sort((a: Question, b: Question) => (a.ordre || 0) - (b.ordre || 0)));
      } catch (questionsError) {
        console.error('Erreur lors du chargement des questions:', questionsError);
        showSnackbar('Erreur lors du chargement des questions.', 'error');
        setQuestions([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du questionnaire:', error);
      showSnackbar('Erreur lors du chargement du questionnaire.', 'error');
    }
  };
  
  // Gérer l'ouverture du dialogue de création de questionnaire
  const handleOpenCreateQuestionnaireDialog = () => {
    setDialogMode('create');
    setQuestionnaireFormValues(initialQuestionnaireFormValues);
    setOpenQuestionnaireDialog(true);
    // Charger les fonctions si pas encore fait
    if (fonctions.length === 0) {
      fetchFonctions();
    }
  };
  
  // Gérer l'ouverture du dialogue d'édition de questionnaire
  const handleOpenEditQuestionnaireDialog = (questionnaire: Questionnaire) => {
    setDialogMode('edit');
    setQuestionnaireFormValues({
      fonction: questionnaire.fonction || '',
      thematique: questionnaire.thematique || 'Evaluation Complète',
      description: questionnaire.description || ''
    });
    setOpenQuestionnaireDialog(true);
    // Charger les fonctions si pas encore fait
    if (fonctions.length === 0) {
      fetchFonctions();
    }
  };
  
  // Fermer le dialogue de questionnaire
  const handleCloseQuestionnaireDialog = () => {
    setOpenQuestionnaireDialog(false);
  };
  
  // Gérer les changements dans le formulaire de questionnaire
  const handleQuestionnaireFormChange = (event: React.ChangeEvent<HTMLInputElement> | { target: { name: string; value: unknown } }) => {
    const { name, value } = event.target;
    setQuestionnaireFormValues({
      ...questionnaireFormValues,
      [name]: value as string
    });
  };
  
  // Soumettre le formulaire de questionnaire
  const handleSubmitQuestionnaire = async () => {
    try {
      if (dialogMode === 'create') {
        const response = await api.post('questionnaires', questionnaireFormValues);
        await fetchQuestionnaires();
        showSnackbar('Questionnaire créé avec succès.', 'success');
        
        // Sélectionner le nouveau questionnaire
        let newId = '';
        if (response && response.data && response.data.id_questionnaire) {
          newId = response.data.id_questionnaire;
        } else if (response && response.id_questionnaire) {
          newId = response.id_questionnaire;
        }
        
        if (newId) {
          await fetchQuestionnaireById(newId);
          setTabValue(1); // Aller à l'onglet des questions
        }
      } else if (dialogMode === 'edit' && selectedQuestionnaire) {
        await api.put(
          `questionnaires/${selectedQuestionnaire.id_questionnaire}`, 
          questionnaireFormValues
        );
        await fetchQuestionnaires();
        await fetchQuestionnaireById(selectedQuestionnaire.id_questionnaire);
        showSnackbar('Questionnaire mis à jour avec succès.', 'success');
      }
      
      handleCloseQuestionnaireDialog();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du questionnaire:', error);
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
      await api.delete(`questionnaires/${selectedQuestionnaire.id_questionnaire}`);
      await fetchQuestionnaires();
      setSelectedQuestionnaire(null);
      setQuestions([]);
      setTabValue(0); // Retour à la liste
      handleCloseDeleteDialog();
      showSnackbar('Questionnaire supprimé avec succès.', 'success');
    } catch (error) {
      console.error('Erreur lors de la suppression du questionnaire:', error);
      showSnackbar('Erreur lors de la suppression du questionnaire.', 'error');
    }
  };

  // Sélectionner un questionnaire pour l'édition
  const handleSelectQuestionnaire = async (questionnaire: Questionnaire) => {
    setSelectedQuestionnaire(questionnaire);
    await fetchQuestionnaireById(questionnaire.id_questionnaire);
    setTabValue(1); // Aller à l'onglet des questions
    
    // Mettre à jour l'URL pour faciliter le partage
    navigate(`/questionnaires/admin?id=${questionnaire.id_questionnaire}`, { replace: true });
  };

  // Gérer le changement d'onglet
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Gérer l'ouverture du dialogue de création de question
  const handleOpenCreateQuestionDialog = () => {
    if (!selectedQuestionnaire) {
      showSnackbar('Veuillez d\'abord sélectionner un questionnaire.', 'warning');
      return;
    }
    
    setQuestionDialogMode('create');
    setQuestionFormValues({
      ...initialQuestionFormValues,
      id_questionnaire: selectedQuestionnaire.id_questionnaire,
      ordre: questions.length + 1 // Définir l'ordre automatiquement
    });
    setOpenQuestionDialog(true);
  };

  // Gérer l'ouverture du dialogue d'édition de question
  const handleOpenEditQuestionDialog = (question: Question) => {
    setQuestionDialogMode('edit');
    setCurrentQuestion(question);
    setQuestionFormValues({
      id_questionnaire: question.id_questionnaire,
      texte: question.texte || '',
      ponderation: question.ponderation || 1,
      ordre: question.ordre
    });
    setOpenQuestionDialog(true);
  };

  // Fermer le dialogue de question
  const handleCloseQuestionDialog = () => {
    setOpenQuestionDialog(false);
    setCurrentQuestion(null);
  };

  // Gérer les changements dans le formulaire de question
  const handleQuestionFormChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    
    // Convertir en nombre si nécessaire
    if (name === 'ponderation' || name === 'ordre') {
      setQuestionFormValues({
        ...questionFormValues,
        [name]: value === '' ? '' : parseFloat(value)
      });
    } else {
      setQuestionFormValues({
        ...questionFormValues,
        [name]: value
      });
    }
  };

  // Soumettre le formulaire de question
  const handleSubmitQuestion = async () => {
    try {
      // Préparer les données avec la bonne conversion des types
      const questionData = {
        ...questionFormValues,
        ponderation: Number(questionFormValues.ponderation) || 1,
        ordre: Number(questionFormValues.ordre) || (questions.length + 1)
      };

      if (questionDialogMode === 'create') {
        await api.post('questions', questionData);
        showSnackbar('Question ajoutée avec succès.', 'success');
      } else if (questionDialogMode === 'edit' && currentQuestion) {
        await api.put(`questions/${currentQuestion.id_question}`, questionData);
        showSnackbar('Question mise à jour avec succès.', 'success');
      }
      
      if (selectedQuestionnaire) {
        await fetchQuestionnaireById(selectedQuestionnaire.id_questionnaire);
      }
      
      handleCloseQuestionDialog();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la question:', error);
      showSnackbar('Erreur lors de la sauvegarde de la question.', 'error');
    }
  };

  // Gérer l'ouverture du dialogue de confirmation de suppression de question
  const handleOpenDeleteQuestionDialog = (question: Question) => {
    setCurrentQuestion(question);
    setOpenDeleteQuestionDialog(true);
  };

  // Fermer le dialogue de confirmation de suppression de question
  const handleCloseDeleteQuestionDialog = () => {
    setOpenDeleteQuestionDialog(false);
    setCurrentQuestion(null);
  };

  // Supprimer une question
  const handleDeleteQuestion = async () => {
    if (!currentQuestion) return;
    
    try {
      await api.delete(`questions/${currentQuestion.id_question}`);
      
      if (selectedQuestionnaire) {
        await fetchQuestionnaireById(selectedQuestionnaire.id_questionnaire);
      }
      
      handleCloseDeleteQuestionDialog();
      showSnackbar('Question supprimée avec succès.', 'success');
    } catch (error) {
      console.error('Erreur lors de la suppression de la question:', error);
      showSnackbar('Erreur lors de la suppression de la question.', 'error');
    }
  };

  // Cloner un questionnaire existant
  const handleCloneQuestionnaire = async (questionnaire: Questionnaire) => {
    try {
      // Créer un nouveau questionnaire
      const newQuestionnaireData = {
        fonction: `${questionnaire.fonction || 'Questionnaire'} (copie)`,
        thematique: questionnaire.thematique || '',
        description: questionnaire.description || ''
      };
      
      const newQuestionnaireResponse = await api.post('questionnaires', newQuestionnaireData);
      
      // Extraire l'ID du nouveau questionnaire
      let newQuestionnaireId = '';
      if (newQuestionnaireResponse && newQuestionnaireResponse.data && newQuestionnaireResponse.data.id_questionnaire) {
        newQuestionnaireId = newQuestionnaireResponse.data.id_questionnaire;
      } else if (newQuestionnaireResponse && newQuestionnaireResponse.id_questionnaire) {
        newQuestionnaireId = newQuestionnaireResponse.id_questionnaire;
      } else {
        console.warn('Format de réponse inattendu lors de la création du questionnaire cloné:', newQuestionnaireResponse);
        showSnackbar('Questionnaire créé mais impossible de cloner les questions.', 'warning');
        await fetchQuestionnaires();
        return;
      }
      
      // Récupérer toutes les questions de l'ancien questionnaire
      const questionsResponse = await api.get(`questionnaires/${questionnaire.id_questionnaire}/questions`);
      
      let questionsToClone = [];
      if (Array.isArray(questionsResponse)) {
        questionsToClone = questionsResponse;
      } else if (questionsResponse && questionsResponse.data && Array.isArray(questionsResponse.data)) {
        questionsToClone = questionsResponse.data;
      } else {
        console.warn('Format de réponse inattendu pour les questions à cloner:', questionsResponse);
        questionsToClone = [];
      }
      
      // Créer les questions dans le nouveau questionnaire
      for (const question of questionsToClone) {
        try {
          await api.post('questions', {
            id_questionnaire: newQuestionnaireId,
            texte: question.texte || '',
            ponderation: question.ponderation || 1,
            ordre: question.ordre || 0
          });
        } catch (questionError) {
          console.error('Erreur lors du clonage de la question:', questionError);
        }
      }
      
      // Rafraîchir la liste des questionnaires
      await fetchQuestionnaires();
      
      // Sélectionner le nouveau questionnaire
      await fetchQuestionnaireById(newQuestionnaireId);
      setTabValue(1); // Aller à l'onglet des questions
      
      showSnackbar('Questionnaire cloné avec succès.', 'success');
    } catch (error) {
      console.error('Erreur lors du clonage du questionnaire:', error);
      showSnackbar('Erreur lors du clonage du questionnaire.', 'error');
    }
  };

  // Réordonner les questions
  const handleReorderQuestion = async (question: Question, newOrder: number) => {
    if (!question || newOrder < 1 || newOrder > questions.length) return;
    
    try {
      await api.put(`questions/${question.id_question}`, {
        id_questionnaire: question.id_questionnaire,
        texte: question.texte,
        ponderation: question.ponderation,
        ordre: newOrder
      });
      
      if (selectedQuestionnaire) {
        await fetchQuestionnaireById(selectedQuestionnaire.id_questionnaire);
      }
      
      showSnackbar('Question réordonnée avec succès.', 'success');
    } catch (error) {
      console.error('Erreur lors de la réorganisation des questions:', error);
      showSnackbar('Erreur lors de la réorganisation des questions.', 'error');
    }
  };

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
        <Grid xs={12}>
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
        <Grid xs={12}>
          <Paper sx={{ width: '100%' }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              variant="fullWidth"
            >
              <Tab label="Liste des Questionnaires" />
              <Tab label="Gestion des Questions" disabled={!selectedQuestionnaire} />
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
                            {questionnaire.fonction || 'Sans titre'} - {questionnaire.thematique || 'Sans description'}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary">
                            {questionnaire.description ? 
                              (questionnaire.description.length > 100 ? 
                                questionnaire.description.substring(0, 100) + '...' : 
                                questionnaire.description) : 
                              'Aucune description détaillée'
                            }
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
                        <Tooltip title="Cloner">
                          <IconButton 
                            edge="end" 
                            color="secondary" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCloneQuestionnaire(questionnaire);
                            }}
                          >
                            <CloneIcon />
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
                      title={`${selectedQuestionnaire.fonction || 'Sans titre'} - ${selectedQuestionnaire.thematique || 'Sans description'}`}
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
                        {selectedQuestionnaire.description || 'Aucune description détaillée disponible.'}
                      </Typography>
                      
                      <Box display="flex" justifyContent="flex-end" sx={{ mt: 2 }}>
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<AddIcon />}
                          onClick={handleOpenCreateQuestionDialog}
                        >
                          Ajouter une Question
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>

                  <Typography variant="h6" gutterBottom>
                    Questions ({questions.length})
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  {questions.length > 0 ? (
                    questions
                      .sort((a, b) => (a.ordre || 0) - (b.ordre || 0))
                      .map((question) => (
                        <Accordion key={question.id_question}>
                          <AccordionSummary 
                            expandIcon={<ExpandMoreIcon />}
                            sx={{ 
                              '&:hover': { bgcolor: 'action.hover' },
                              bgcolor: 'background.default'
                            }}
                          >
                            <Box display="flex" alignItems="center" width="100%">
                              <Tooltip title="Glisser pour réorganiser">
                                <DragIcon color="action" sx={{ mr: 1, cursor: 'grab' }} />
                              </Tooltip>
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
                            <Grid container spacing={2}>
                              <Grid xs={12} md={8}>
                                <Typography variant="body2" color="textSecondary">
                                  <strong>Pondération:</strong> {question.ponderation || 0}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                  Dernière modification: {question.date_modification ? 
                                    new Date(question.date_modification).toLocaleDateString() : 
                                    'Date inconnue'}
                                </Typography>
                              </Grid>
                              <Grid xs={12} md={4}>
                                <Box display="flex" justifyContent="flex-end">
                                  <Tooltip title="Monter">
                                    <span>
                                      <IconButton 
                                        color="primary" 
                                        onClick={() => handleReorderQuestion(question, (question.ordre || 0) - 1)}
                                        disabled={(question.ordre || 0) <= 1}
                                      >
                                        <ArrowBackIcon sx={{ transform: 'rotate(90deg)' }} />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                  <Tooltip title="Descendre">
                                    <span>
                                      <IconButton 
                                        color="primary" 
                                        onClick={() => handleReorderQuestion(question, (question.ordre || 0) + 1)}
                                        disabled={(question.ordre || 0) >= questions.length}
                                      >
                                        <ArrowBackIcon sx={{ transform: 'rotate(-90deg)' }} />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                  <Tooltip title="Modifier la question">
                                    <IconButton 
                                      color="primary" 
                                      onClick={() => handleOpenEditQuestionDialog(question)}
                                    >
                                      <EditIcon />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Supprimer la question">
                                    <IconButton 
                                      color="error" 
                                      onClick={() => handleOpenDeleteQuestionDialog(question)}
                                    >
                                      <DeleteIcon />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </Grid>
                            </Grid>
                          </AccordionDetails>
                        </Accordion>
                      ))
                  ) : (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      Aucune question définie pour ce questionnaire. Utilisez le bouton "Ajouter une Question" pour commencer.
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
              <Grid xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel id="fonction-select-label">Fonction</InputLabel>
                  <Select
                    labelId="fonction-select-label"
                    id="fonction"
                    name="fonction"
                    value={questionnaireFormValues.fonction}
                    label="Fonction"
                    onChange={(e) => handleQuestionnaireFormChange(e as any)}
                    disabled={loadingFonctions}
                  >
                    {fonctions.map((fonction) => (
                      <MenuItem key={fonction.id_fonction} value={fonction.nom}>
                        {fonction.nom}
                        {fonction.nombre_thematiques ? ` (${fonction.nombre_thematiques} thématiques)` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    {loadingFonctions ? 'Chargement des fonctions...' : 'Sélectionnez la fonction d\'évaluation'}
                  </FormHelperText>
                </FormControl>
              </Grid>
              <Grid xs={12} md={6}>
                <TextField
                  required
                  fullWidth
                  id="thematique"
                  name="thematique"
                  label="Description"
                  value={questionnaireFormValues.thematique}
                  onChange={handleQuestionnaireFormChange}
                  helperText="Ex: Evaluation Complète, Infrastructure, CI/CD"
                />
              </Grid>
              <Grid xs={12}>
                <TextField
                  fullWidth
                  id="description"
                  name="description"
                  label="Description détaillée"
                  multiline
                  rows={4}
                  value={questionnaireFormValues.description}
                  onChange={handleQuestionnaireFormChange}
                  helperText="Description détaillée du questionnaire et de son objectif"
                />
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
            startIcon={<SaveIcon />}
            disabled={!questionnaireFormValues.fonction || !questionnaireFormValues.thematique}
          >
            {dialogMode === 'create' ? 'Créer' : 'Mettre à jour'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog pour créer/modifier une question */}
      <Dialog open={openQuestionDialog} onClose={handleCloseQuestionDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {questionDialogMode === 'create' ? 'Ajouter une nouvelle question' : 'Modifier la question'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" noValidate sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid xs={12}>
                <TextField
                  required
                  fullWidth
                  id="texte"
                  name="texte"
                  label="Texte de la question"
                  multiline
                  rows={2}
                  value={questionFormValues.texte}
                  onChange={handleQuestionFormChange}
                  helperText="Formulez une question claire et concise"
                />
              </Grid>
              <Grid xs={12} md={6}>
                <TextField
                  required
                  fullWidth
                  id="ponderation"
                  name="ponderation"
                  label="Pondération"
                  type="number"
                  inputProps={{ min: 0, max: 5, step: 0.1 }}
                  value={questionFormValues.ponderation}
                  onChange={handleQuestionFormChange}
                  helperText="Importance de la question (0 à 5)"
                />
              </Grid>
              <Grid xs={12} md={6}>
                <TextField
                  fullWidth
                  id="ordre"
                  name="ordre"
                  label="Ordre"
                  type="number"
                  inputProps={{ min: 1, step: 1 }}
                  value={questionFormValues.ordre}
                  onChange={handleQuestionFormChange}
                  helperText="Position dans le questionnaire"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseQuestionDialog}>Annuler</Button>
          <Button 
            onClick={handleSubmitQuestion} 
            variant="contained" 
            color="primary"
            startIcon={<SaveIcon />}
            disabled={!questionFormValues.texte}
          >
            {questionDialogMode === 'create' ? 'Ajouter' : 'Mettre à jour'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmation de suppression de questionnaire */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer le questionnaire "{selectedQuestionnaire?.fonction || 'Sans titre'} - {selectedQuestionnaire?.thematique || 'Sans description'}" ?
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

      {/* Dialog de confirmation de suppression de question */}
      <Dialog open={openDeleteQuestionDialog} onClose={handleCloseDeleteQuestionDialog}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer la question "{currentQuestion?.texte || 'Sans texte'}" ?
            Cette action est irréversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteQuestionDialog}>Annuler</Button>
          <Button onClick={handleDeleteQuestion} variant="contained" color="error">
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={snackbar.message}
        action={
          <IconButton
            size="small"
            color="inherit"
            onClick={handleCloseSnackbar}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default QuestionnaireAdmin;