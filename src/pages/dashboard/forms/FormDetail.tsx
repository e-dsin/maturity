import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Button,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Divider,
  TextField,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  IconButton,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Badge,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Send as SendIcon,
  Check as CheckIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  HomeOutlined as HomeIcon,
  Business as BusinessIcon,
  AccountTree as FunctionIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
  Comment as CommentIcon,
  InfoOutlined as InfoIcon
} from '@mui/icons-material';
import api from '../../../services/api';

import { Formulaire, Reponse } from '../../../types/Formulaire';

interface Question {
  id_question: string;
  texte: string;
  ponderation: number;
  ordre: number;
}

const FormDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [formulaire, setFormulaire] = useState<Formulaire | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [reponses, setReponses] = useState<Reponse[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openConfirmDialog, setOpenConfirmDialog] = useState<{ open: boolean, action: 'Soumis' | 'Validé' | null }>({ open: false, action: null });

  // Nombre de questions par étape
  const questionsPerStep = 5;

  // Charger les données du formulaire
  useEffect(() => {
    const fetchFormulaire = async () => {
      if (!id) {
        setError("Identifiant du formulaire manquant");
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        // Récupérer les informations du formulaire
        const formulaireResponse = await api.get(`formulaires/${id}`);
        
        let formulaireData = null;
        if (formulaireResponse && typeof formulaireResponse === 'object') {
          if (Array.isArray(formulaireResponse)) {
            formulaireData = formulaireResponse[0]; // Prendre le premier si c'est un tableau
          } else if (formulaireResponse.data) {
            formulaireData = formulaireResponse.data;
          } else {
            formulaireData = formulaireResponse;
          }
        }
        
        if (!formulaireData) {
          setError("Format de données du formulaire inattendu");
          setLoading(false);
          return;
        }
        
        // Normaliser les données du formulaire
        const normalizedFormulaire: Formulaire = {
            id_formulaire: formulaireData.id_formulaire,
            id_acteur: formulaireData.id_acteur || '',
            acteur_nom: formulaireData.acteur_nom || 'Utilisateur inconnu',
            id_application: formulaireData.id_application || '',
            nom_application: formulaireData.nom_application || 'Application inconnue',
            id_entreprise: formulaireData.id_entreprise || '',
            nom_entreprise: formulaireData.nom_entreprise || 'Entreprise inconnue',
            id_questionnaire: formulaireData.id_questionnaire || '',
            questionnaire_titre: formulaireData.questionnaire_titre || 'Questionnaire inconnu',
            fonction: formulaireData.fonction || 'Fonction inconnue',
            thematique: formulaireData.thematique || 'Non catégorisé',
            date_creation: formulaireData.date_creation || new Date().toISOString(),
            date_modification: formulaireData.date_modification || formulaireData.date_creation || new Date().toISOString(),
            statut: formulaireData.statut || 'Brouillon',
            progression: formulaireData.progression || 0
          };
          
          setFormulaire(normalizedFormulaire);
          
          // Récupérer les questions du questionnaire
          const questionsResponse = await api.get(`questionnaires/${normalizedFormulaire.id_questionnaire}/questions`);
          
          let questionsData: Question[] = [];
          if (Array.isArray(questionsResponse)) {
            questionsData = questionsResponse;
          } else if (questionsResponse && questionsResponse.data && Array.isArray(questionsResponse.data)) {
            questionsData = questionsResponse.data;
          } else {
            console.warn('Format de réponse inattendu pour les questions:', questionsResponse);
          }
          
          // Normaliser et trier les questions par ordre
          const normalizedQuestions = questionsData
            .map(q => ({
              id_question: q.id_question,
              texte: q.texte || `Question ${q.ordre || '?'}`,
              ponderation: q.ponderation || 1,
              ordre: q.ordre || 0
            }))
            .sort((a, b) => a.ordre - b.ordre);
          
          setQuestions(normalizedQuestions);
          
          // Récupérer les réponses existantes
          const reponsesResponse = await api.get(`formulaires/${id}/reponses`);
          
          let reponsesData: Reponse[] = [];
          if (Array.isArray(reponsesResponse)) {
            reponsesData = reponsesResponse;
          } else if (reponsesResponse && reponsesResponse.data && Array.isArray(reponsesResponse.data)) {
            reponsesData = reponsesResponse.data;
          } else {
            console.warn('Format de réponse inattendu pour les réponses:', reponsesResponse);
          }
          
          // Normaliser les réponses
          const normalizedReponses = reponsesData.map(r => ({
            id_reponse: r.id_reponse,
            id_formulaire: r.id_formulaire || id,
            id_question: r.id_question,
            question_texte: r.question_texte || '',
            valeur_reponse: r.valeur_reponse || '',
            score: r.score || 0,
            commentaire: r.commentaire
          }));
          
          setReponses(normalizedReponses);
        } catch (error) {
          console.error('Erreur lors du chargement du formulaire:', error);
          setError('Erreur lors du chargement du formulaire. Veuillez réessayer plus tard.');
        } finally {
          setLoading(false);
        }
      };
      
      fetchFormulaire();
    }, [id]);
   
    // Calculer le nombre total d'étapes
    const totalSteps = Math.ceil((questions.length || 0) / questionsPerStep);
    
    // Questions pour l'étape actuelle
    const currentStepQuestions = questions.slice(
      currentStep * questionsPerStep,
      (currentStep + 1) * questionsPerStep
    );
    
    // Vérifier si toutes les questions de l'étape actuelle ont des réponses
    const isCurrentStepComplete = currentStepQuestions.every(question => 
      reponses.some(reponse => reponse.id_question === question.id_question)
    );
    
    // Vérifier si le formulaire est complet
    const isFormComplete = questions.length > 0 && questions.every(question => 
      reponses.some(reponse => reponse.id_question === question.id_question)
    );
    
    // Calculer la progression
    const progression = questions.length > 0
      ? (reponses.length / questions.length) * 100
      : 0;
    
    // Gérer la navigation entre les étapes
    const handleNextStep = () => {
      if (currentStep < totalSteps - 1) {
        setCurrentStep(currentStep + 1);
        // Faire défiler la page vers le haut
        window.scrollTo(0, 0);
      }
    };
    
    const handlePrevStep = () => {
      if (currentStep > 0) {
        setCurrentStep(currentStep - 1);
        // Faire défiler la page vers le haut
        window.scrollTo(0, 0);
      }
    };
    
    // Trouver la réponse pour une question
    const findReponse = (questionId: string) => {
      return reponses.find(reponse => reponse.id_question === questionId);
    };
    
    // Mettre à jour une réponse
    const updateReponse = (questionId: string, value: string) => {
      const existingReponseIndex = reponses.findIndex(r => r.id_question === questionId);
      
      if (existingReponseIndex >= 0) {
        // Mise à jour d'une réponse existante
        const updatedReponses = [...reponses];
        updatedReponses[existingReponseIndex] = {
          ...updatedReponses[existingReponseIndex],
          valeur_reponse: value,
          // Dans un cas réel, le score pourrait être calculé autrement
          score: parseInt(value) || 0
        };
        setReponses(updatedReponses);
      } else {
        // Création d'une nouvelle réponse
        const question = questions.find(q => q.id_question === questionId);
        if (!question) return;
        
        const newReponse: Reponse = {
          id_reponse: `temp_${Date.now()}`, // Sera remplacé par l'ID généré côté serveur
          id_formulaire: id || '',
          id_question: questionId,
          question_texte: question.texte,
          valeur_reponse: value,
          // Dans un cas réel, le score pourrait être calculé autrement
          score: parseInt(value) || 0
        };
        setReponses([...reponses, newReponse]);
      }
    };
    
    // Mettre à jour un commentaire
    const updateCommentaire = (questionId: string, commentaire: string) => {
      const existingReponseIndex = reponses.findIndex(r => r.id_question === questionId);
      
      if (existingReponseIndex >= 0) {
        const updatedReponses = [...reponses];
        updatedReponses[existingReponseIndex] = {
          ...updatedReponses[existingReponseIndex],
          commentaire: commentaire || undefined
        };
        setReponses(updatedReponses);
      }
    };
    
    // Ouvrir la boîte de dialogue de confirmation
    const handleConfirmAction = (action: 'Soumis' | 'Validé') => {
      setOpenConfirmDialog({ open: true, action });
    };
    
    // Fermer la boîte de dialogue de confirmation
    const handleCloseConfirmDialog = () => {
      setOpenConfirmDialog({ open: false, action: null });
    };
    
    // Sauvegarder le formulaire
    const saveFormulaire = async (newStatus?: 'Brouillon' | 'Soumis' | 'Validé') => {
      if (!formulaire) return;
      
      setSaving(true);
      setError(null);
      
      try {
        // Update form status if needed
        if (newStatus && newStatus !== formulaire.statut) {
          try {
            await api.put(`formulaires/${id}`, { 
              statut: newStatus,
              progression: Math.round(progression)
            });
            
            setFormulaire({
              ...formulaire,
              statut: newStatus,
              progression: Math.round(progression)
            });
          } catch (error) {
            console.error('Erreur lors de la mise à jour du statut:', error);
            setError('Erreur lors de la mise à jour du statut. Veuillez réessayer.');
            setSaving(false);
            return;
          }
        }
        
        // OPTIMIZATION: Fetch all existing responses once at the beginning
        let existingResponses = [];
        try {
          const existingResponsesResult = await api.get(`formulaires/${id}/reponses`);
          console.log("Récupération des réponses existantes...");
          
          // Normalize the response data
          if (Array.isArray(existingResponsesResult)) {
            existingResponses = existingResponsesResult;
          } else if (existingResponsesResult && existingResponsesResult.data && Array.isArray(existingResponsesResult.data)) {
            existingResponses = existingResponsesResult.data;
          } else {
            console.warn("Format de réponse inattendu:", existingResponsesResult);
            existingResponses = [];
          }
        } catch (error) {
          console.error('Erreur lors de la récupération des réponses existantes:', error);
          existingResponses = [];
        }
        
        // Process all responses
        const savePromises = reponses.map(async (reponse) => {
          try {
            // First check if this response already exists in our fetched data
            const existingReponse = existingResponses.find(r => r.id_question === reponse.id_question);
            
            if (existingReponse && existingReponse.id_reponse) {
              // Response exists - update it
              console.log(`Mise à jour de la réponse existante: ${existingReponse.id_reponse}`);
              try {
                const updateResponse = await api.put(`reponses/${existingReponse.id_reponse}`, {
                  valeur_reponse: reponse.valeur_reponse,
                  score: reponse.score,
                  commentaire: reponse.commentaire || ''
                });
                
                console.log("Mise à jour réussie:", updateResponse);
                return true;
              } catch (putError) {
                console.error("Erreur lors de la mise à jour:", putError);
                return false;
              }
            } else {
              // Response doesn't exist - create it
              try {
                console.log(`Création d'une nouvelle réponse pour la question: ${reponse.id_question}`);
                const createResponse = await api.post('reponses', {
                  id_formulaire: reponse.id_formulaire,
                  id_question: reponse.id_question,
                  valeur_reponse: reponse.valeur_reponse,
                  score: reponse.score,
                  commentaire: reponse.commentaire || ''
                });
                
                console.log("Création réussie:", createResponse);
                return true;
              } catch (postError) {
                // If error 400 (response already exists), try update as fallback
                if (postError.response && postError.response.status === 400) {
                  console.log("Bascule vers le PUT - La réponse existe déjà");
                  
                  // Fetch the latest responses to find the ID
                  try {
                    const refreshedResponsesResult = await api.get(`formulaires/${reponse.id_formulaire}/reponses`);
                    
                    // Normalize the refreshed response data
                    let refreshedResponses = [];
                    if (Array.isArray(refreshedResponsesResult)) {
                      refreshedResponses = refreshedResponsesResult;
                    } else if (refreshedResponsesResult && refreshedResponsesResult.data && Array.isArray(refreshedResponsesResult.data)) {
                      refreshedResponses = refreshedResponsesResult.data;
                    } else {
                      console.warn("Format de réponse rafraîchie inattendu:", refreshedResponsesResult);
                      refreshedResponses = [];
                    }
                    
                    // Find the response by question ID
                    const refreshedReponse = refreshedResponses.find(r => r.id_question === reponse.id_question);
                    
                    if (refreshedReponse && refreshedReponse.id_reponse) {
                      console.log("Réponse existante trouvée:", refreshedReponse.id_reponse);
                      
                      // Update with the found ID
                      const fallbackUpdateResponse = await api.put(`reponses/${refreshedReponse.id_reponse}`, {
                        valeur_reponse: reponse.valeur_reponse,
                        score: reponse.score,
                        commentaire: reponse.commentaire || ''
                      });
                      
                      console.log("Mise à jour réussie:", fallbackUpdateResponse);
                      return true;
                    } else {
                      console.error("Pas de réponse existante trouvée pour cette question");
                      return false;
                    }
                  } catch (refreshError) {
                    console.error("Erreur lors de la récupération des réponses rafraîchies:", refreshError);
                    return false;
                  }
                } else {
                  // Other type of error
                  console.error('Erreur lors de la création de la réponse:', postError);
                  return false;
                }
              }
            }
          } catch (error) {
            console.error('Erreur générale lors de la sauvegarde d\'une réponse:', error);
            return false;
          }
        });
        
        // Wait for all responses to be saved
        const results = await Promise.allSettled(savePromises);
        const failedSaves = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value));
        
        if (failedSaves.length > 0) {
          setError(`${failedSaves.length} réponses n'ont pas pu être sauvegardées. Veuillez réessayer.`);
        } else {
          setSuccess(newStatus === 'Soumis' 
            ? 'Formulaire soumis avec succès !' 
            : newStatus === 'Validé' 
              ? 'Formulaire validé avec succès !'
              : 'Formulaire enregistré avec succès !');
        }
      } catch (error) {
        console.error('Erreur lors de la sauvegarde du formulaire:', error);
        setError('Erreur lors de la sauvegarde. Veuillez réessayer plus tard.');
      } finally {
        setSaving(false);
      }
    };
    
    // Obtenir le label et la couleur pour l'état du formulaire
    const getStatusInfo = (status: string) => {
      switch (status) {
        case 'Validé':
          return { label: 'Validé', color: 'success' as const };
        case 'Soumis':
          return { label: 'Soumis', color: 'primary' as const };
        case 'Brouillon':
        default:
          return { label: 'Brouillon', color: 'warning' as const };
      }
    };
    
    // Formater la date de manière sécurisée
    const formatDate = (dateString: string) => {
      try {
        return new Date(dateString).toLocaleDateString('fr-FR');
      } catch (e) {
        console.warn('Erreur lors du formatage de la date:', e);
        return 'Date invalide';
      }
    };
    
    // Compter le nombre de commentaires
    const commentCount = reponses.filter(r => r.commentaire && r.commentaire.trim() !== '').length;
    
    // Nombre de questions avec un score critique (1 ou 2) avec une pondération élevée (≥ 3)
    const criticalQuestions = reponses.filter(r => {
      const score = parseInt(r.valeur_reponse) || 0;
      const question = questions.find(q => q.id_question === r.id_question);
      return score <= 2 && question && question.ponderation >= 3;
    }).length;
    
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
          <CircularProgress />
        </Box>
      );
    }
    
    if (!formulaire) {
      return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Alert severity="error">
            {error || 'Formulaire non trouvé. Le formulaire demandé n\'existe pas ou a été supprimé.'}
          </Alert>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/formulaires')}
            sx={{ mt: 2 }}
          >
            Retour à la liste des formulaires
          </Button>
        </Container>
      );
    }
    
    // Informations sur le statut
    const statusInfo = getStatusInfo(formulaire.statut);
    
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Breadcrumbs de navigation */}
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link
            underline="hover"
            color="inherit"
            sx={{ display: 'flex', alignItems: 'center' }}
            href="/"
          >
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Accueil
          </Link>
          <Link
            underline="hover"
            color="inherit"
            sx={{ display: 'flex', alignItems: 'center' }}
            href="/formulaires"
          >
            Formulaires
          </Link>
          <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
            {formulaire.fonction} - {formulaire.nom_entreprise}
          </Typography>
        </Breadcrumbs>
        
        <Grid container spacing={3}>
          {/* En-tête */}
          <Grid xs={12}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box display="flex" alignItems="center">
                  <IconButton color="primary" onClick={() => navigate('/formulaires')} sx={{ mr: 1 }}>
                    <ArrowBackIcon />
                  </IconButton>
                  <Typography component="h1" variant="h5" color="primary">
                    {formulaire.fonction || 'Formulaire'} - {formulaire.questionnaire_titre}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center">
                  {criticalQuestions > 0 && (
                    <Tooltip title={`${criticalQuestions} question(s) critique(s) à traiter`}>
                      <Badge badgeContent={criticalQuestions} color="error" sx={{ mr: 2 }}>
                        <WarningIcon color="error" />
                      </Badge>
                    </Tooltip>
                  )}
                  
                  {commentCount > 0 && (
                    <Tooltip title={`${commentCount} commentaire(s)`}>
                      <Badge badgeContent={commentCount} color="info" sx={{ mr: 2 }}>
                        <CommentIcon color="info" />
                      </Badge>
                    </Tooltip>
                  )}
                  
                  <Chip 
                    label={statusInfo.label}
                    color={statusInfo.color}
                    variant="outlined"
                  />
                </Box>
              </Box>
              
              <Grid container spacing={2}>
                <Grid xs={12} md={4}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <BusinessIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="subtitle1">
                      <strong>Entreprise:</strong> {formulaire.nom_entreprise}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center">
                    <FunctionIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="subtitle1">
                      <strong>Fonction:</strong> {formulaire.fonction}
                    </Typography>
                  </Box>
                </Grid>
                <Grid xs={12} md={4}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <InfoIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="subtitle1">
                      <strong>Thématique:</strong> {formulaire.thematique}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center">
                    <Typography variant="subtitle1">
                      <strong>Statut:</strong> {formulaire.statut}
                    </Typography>
                  </Box>
                </Grid>
                <Grid xs={12} md={4}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <PersonIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="subtitle1">
                      <strong>Acteur:</strong> {formulaire.acteur_nom}
                    </Typography>
                  </Box>
                  <Typography variant="subtitle1">
                    <strong>Date de création:</strong> {formatDate(formulaire.date_creation)}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          
          {/* Barre de progression */}
          <Grid xs={12}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ width: '100%' }}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" sx={{ mb: 1 }}>Progression: {Math.round(progression)}%</Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {reponses.length} / {questions.length} questions répondues
                  </Typography>
                </Box>
                <Box sx={{ width: '100%', backgroundColor: '#e0e0e0', borderRadius: 1, height: 8, position: 'relative' }}>
                  <Box
                    sx={{
                      width: `${progression}%`,
                      backgroundColor: progression < 30 ? '#f44336' : progression < 70 ? '#ff9800' : '#4caf50',
                      borderRadius: 1,
                      height: '100%',
                      transition: 'width 0.5s ease-in-out',
                    }}
                  />
                </Box>
              </Box>
            </Paper>
          </Grid>
          
          {/* Messages d'erreur ou de succès */}
          {error && (
            <Grid xs={12}>
              <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
            </Grid>
          )}
          
          {success && (
            <Grid xs={12}>
              <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>
            </Grid>
          )}
          
          {/* Stepper */}
          <Grid xs={12}>
            <Paper sx={{ p: 2 }}>
              <Stepper activeStep={currentStep} alternativeLabel>
                {Array.from({ length: totalSteps }, (_, i) => (
                  <Step key={i} completed={i < currentStep || (i === currentStep && isCurrentStepComplete)}>
                    <StepLabel>Étape {i + 1}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Paper>
          </Grid>
          
          {/* Questions de l'étape actuelle */}
          <Grid xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Questions - Étape {currentStep + 1} / {totalSteps}
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              {currentStepQuestions.length > 0 ? (
                <Box sx={{ mb: 3 }}>
                  {currentStepQuestions.map((question, index) => {
                    const reponse = findReponse(question.id_question);
                    const isHighPriority = question.ponderation >= 3;
                    const isCritical = reponse && (parseInt(reponse.valeur_reponse) || 0) <= 2 && isHighPriority;
                    
                    return (
                      <Card 
                        key={question.id_question} 
                        sx={{ 
                          mb: 3, 
                          position: 'relative', 
                          overflow: 'visible',
                          border: isCritical ? '1px solid #f44336' : isHighPriority ? '1px solid #ff9800' : 'none',
                        }}
                      >
                        <CardContent>
                          <Box sx={{ 
                            position: 'absolute', 
                            top: -10, 
                            left: -10, 
                            width: 30, 
                            height: 30, 
                            borderRadius: '50%', 
                            backgroundColor: isHighPriority ? 'warning.main' : 'primary.main', 
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold'
                          }}>
                            {question.ordre}
                          </Box>
                          
                          <Box sx={{ ml: 3 }}>
                            <Typography variant="subtitle1" gutterBottom fontWeight={isHighPriority ? 'bold' : 'normal'}>
                              {question.texte}
                              {isHighPriority && (
                                <Tooltip title="Question à forte pondération">
                                  <InfoIcon color="warning" fontSize="small" sx={{ ml: 1 }} />
                                </Tooltip>
                              )}
                            </Typography>
                            
                            <Typography variant="caption" color={isHighPriority ? 'warning.main' : 'text.secondary'} sx={{ display: 'block', mb: 2 }}>
                              Pondération: {question.ponderation} {isHighPriority ? '(Question importante)' : ''}
                            </Typography>
                            
                            <FormControl component="fieldset" sx={{ width: '100%' }}>
                              <Typography variant="body2" sx={{ mb: 1 }}>
                                Évaluation (1 = Niveau initial, 5 = Niveau optimisé)
                              </Typography>
                              <RadioGroup
                                row
                                name={`question-${question.id_question}`}
                                value={reponse?.valeur_reponse || ''}
                                onChange={(e) => updateReponse(question.id_question, e.target.value)}
                              >
                                {[1, 2, 3, 4, 5].map((value) => (
                                  <FormControlLabel
                                    key={value}
                                    value={String(value)}
                                    control={
                                      <Radio 
                                        sx={{
                                          color: value <= 2 && isHighPriority ? 'error.main' : undefined,
                                          '&.Mui-checked': {
                                            color: value <= 2 && isHighPriority ? 'error.main' : undefined
                                          }
                                        }}
                                      />
                                    }
                                    label={String(value)}
                                    disabled={formulaire.statut === 'Validé'}
                                  />
                                ))}
                              </RadioGroup>
                            </FormControl>
                            
                            <TextField
                              fullWidth
                              label="Commentaire (optionnel)"
                              multiline
                              rows={2}
                              margin="normal"
                              value={reponse?.commentaire || ''}
                              onChange={(e) => updateCommentaire(question.id_question, e.target.value)}
                              disabled={formulaire.statut === 'Validé'}
                              helperText={isCritical ? "Un commentaire est fortement recommandé pour cette question critique" : ""}
                              error={isCritical && (!reponse?.commentaire || reponse.commentaire.trim() === '')}
                            />
                            
                            {isCritical && (!reponse?.commentaire || reponse.commentaire.trim() === '') && (
                              <Alert severity="warning" sx={{ mt: 1 }}>
                                Cette question a une note faible et une forte pondération. Veuillez ajouter un commentaire pour justifier cette évaluation.
                              </Alert>
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Box>
              ) : (
                <Typography variant="body1" align="center" sx={{ py: 3 }}>
                  Aucune question pour cette étape.
                </Typography>
              )}
              
              {/* Navigation entre les étapes */}
              <Box display="flex" justifyContent="space-between" mt={3}>
                <Button
                  variant="outlined"
                  onClick={handlePrevStep}
                  disabled={currentStep === 0}
                  startIcon={<ArrowBackIcon />}
                >
                  Précédent
                </Button>
                
                <Box>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => saveFormulaire('Brouillon')}
                    disabled={saving || formulaire.statut === 'Validé'}
                    startIcon={<SaveIcon />}
                    sx={{ mr: 1 }}
                  >
                    Enregistrer
                  </Button>
                  
                  {formulaire.statut === 'Brouillon' && (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleConfirmAction('Soumis')}
                      disabled={saving || !isFormComplete}
                      startIcon={<SendIcon />}
                      sx={{ mr: 1 }}
                    >
                      Soumettre
                    </Button>
                  )}
                  
                  {formulaire.statut === 'Soumis' && (
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => handleConfirmAction('Validé')}
                      disabled={saving || !isFormComplete}
                      startIcon={<CheckIcon />}
                      sx={{ mr: 1 }}
                    >
                      Valider
                    </Button>
                  )}
                </Box>
                
                <Button
                  variant="contained"
                  onClick={handleNextStep}
                  disabled={currentStep === totalSteps - 1}
                  endIcon={<EditIcon />}
                >
                  Suivant
                </Button>
              </Box>
            </Paper>
          </Grid>
          
          {/* Aperçu de toutes les réponses */}
          <Grid xs={12}>
            <Accordion>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="reponses-content"
                id="reponses-header"
              >
                <Typography>Aperçu de toutes les réponses</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ width: '100%' }}>
                  {questions.map((question) => {
                    const reponse = findReponse(question.id_question);
                    const isHighPriority = question.ponderation >= 3;
                    const isCritical = reponse && (parseInt(reponse.valeur_reponse) || 0) <= 2 && isHighPriority;
                    
                    return (
                      <Box 
                        key={question.id_question} 
                        sx={{ 
                          mb: 2, 
                          p: 2, 
                          border: isCritical ? '1px solid #f44336' : isHighPriority ? '1px solid #ff9800' : '1px solid #eee', 
                          borderRadius: 1,
                          bgcolor: isCritical ? 'rgba(244, 67, 54, 0.05)' : isHighPriority ? 'rgba(255, 152, 0, 0.05)' : 'transparent'
                        }}
                      >
                        <Typography variant="subtitle2" fontWeight={isHighPriority ? 'bold' : 'normal'}>
                          {question.ordre}. {question.texte}
                          {isHighPriority && (
                            <Tooltip title="Question à forte pondération">
                              <InfoIcon color="warning" fontSize="small" sx={{ ml: 1 }} />
                            </Tooltip>
                          )}
                        </Typography>
                        
                        {reponse ? (
                          <>
                            <Typography 
                              variant="body2" 
                              sx={{ mt: 1 }}
                              color={isCritical ? 'error' : 'inherit'}
                            >
                              <strong>Réponse:</strong> {reponse.valeur_reponse} / 5
                            </Typography>
                            
                            {reponse.commentaire ? (
                              <Typography variant="body2">
                                <strong>Commentaire:</strong> {reponse.commentaire}
                              </Typography>
                            ) : (
                              isCritical && (
                                <Typography variant="body2" color="error">
                                  <strong>Commentaire manquant</strong> pour une question critique
                                </Typography>
                              )
                            )}
                          </>
                        ) : (
                          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                            Pas encore de réponse
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </AccordionDetails>
            </Accordion>
          </Grid>
        </Grid>
        
        {/* Boîte de dialogue de confirmation */}
        <Dialog
          open={openConfirmDialog.open}
          onClose={handleCloseConfirmDialog}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id="alert-dialog-title">
            {openConfirmDialog.action === 'Soumis' ? 'Soumettre le formulaire ?' : 'Valider le formulaire ?'}
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
              {openConfirmDialog.action === 'Soumis' 
                ? 'Êtes-vous sûr de vouloir soumettre ce formulaire ? Après soumission, il sera en attente de validation.'
                : 'Êtes-vous sûr de vouloir valider ce formulaire ? Cette action est définitive et le formulaire ne pourra plus être modifié.'}
            </DialogContentText>
            
            {criticalQuestions > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Attention : {criticalQuestions} question(s) critique(s) ont une note faible (1 ou 2). Assurez-vous que tous les commentaires explicatifs sont bien renseignés.
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseConfirmDialog} color="inherit">Annuler</Button>
            <Button 
              onClick={() => {
                if (openConfirmDialog.action) {
                  saveFormulaire(openConfirmDialog.action);
                  handleCloseConfirmDialog();
                }
              }} 
              color={openConfirmDialog.action === 'Validé' ? 'success' : 'primary'}
              variant="contained"
              autoFocus
            >
              Confirmer
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    );
   };
   
   export default FormDetail;