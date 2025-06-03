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
  Card,
  CardContent,
  Badge,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Tooltip,
  Chip,
  Alert
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Assessment as AssessmentIcon,
  QuestionAnswer as QuestionIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';

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

interface QuestionnaireStat {
  numQuestions: number;
  numReponses: number;
  numUtilisateurs: number;
}

const QuestionnaireDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // États pour les données
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stats, setStats] = useState<QuestionnaireStat | null>(null);
  
  // Charger les données du questionnaire au chargement
  useEffect(() => {
    if (id) {
      fetchQuestionnaireData(id);
    } else {
      setError("Identifiant de questionnaire manquant");
      setLoading(false);
    }
  }, [id]);
  
  // Récupérer les données du questionnaire
  const fetchQuestionnaireData = async (questionnaireId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Récupérer les informations du questionnaire
      const questionnaireResponse = await api.get(`questionnaires/${questionnaireId}`);
      
      // Normaliser la réponse
      let questionnaireData = null;
      if (questionnaireResponse && typeof questionnaireResponse === 'object') {
        if (Array.isArray(questionnaireResponse)) {
          questionnaireData = questionnaireResponse[0]; // Prendre le premier si c'est un tableau
        } else if (questionnaireResponse.data) {
          questionnaireData = questionnaireResponse.data;
        } else {
          questionnaireData = questionnaireResponse;
        }
      }
      
      if (questionnaireData && questionnaireData.id_questionnaire) {
        setQuestionnaire(questionnaireData);
      } else {
        setError("Format de réponse inattendu pour le questionnaire");
        console.warn("Format de réponse inattendu pour le questionnaire:", questionnaireResponse);
      }
      
      // Récupérer les questions
      try {
        const questionsResponse = await api.get(`questionnaires/${questionnaireId}/questions`);
        
        let questionsData = [];
        if (Array.isArray(questionsResponse)) {
          questionsData = questionsResponse;
        } else if (questionsResponse && questionsResponse.data && Array.isArray(questionsResponse.data)) {
          questionsData = questionsResponse.data;
        } else {
          console.warn("Format de réponse inattendu pour les questions:", questionsResponse);
        }
        
        setQuestions(questionsData);
      } catch (questionsError) {
        console.error('Erreur lors du chargement des questions:', questionsError);
        setQuestions([]);
      }
      
      // Récupérer les statistiques
      try {
        let statsResponse;
        try {
          // Essayer d'abord avec le singulier
          statsResponse = await api.get(`questionnaire/stats/${questionnaireId}`);
        } catch (statsSingularError) {
          // Ensuite avec le pluriel
          statsResponse = await api.get(`questionnaires/stats/${questionnaireId}`);
        }
        
        let statsData = null;
        if (statsResponse && typeof statsResponse === 'object') {
          if (statsResponse.data) {
            statsData = statsResponse.data;
          } else {
            statsData = statsResponse;
          }
        }
        
        if (statsData) {
          setStats({
            numQuestions: statsData.numQuestions || statsData.num_questions || 0,
            numReponses: statsData.numReponses || statsData.num_evaluations || 0,
            numUtilisateurs: statsData.numUtilisateurs || statsData.num_utilisateurs || 0
          });
        } else {
          // Statistiques par défaut si aucune donnée n'est disponible
          setStats({
            numQuestions: questions.length,
            numReponses: 0,
            numUtilisateurs: 0
          });
        }
      } catch (statsError) {
        console.error('Erreur lors du chargement des statistiques:', statsError);
        // Statistiques par défaut en cas d'erreur
        setStats({
          numQuestions: questions.length,
          numReponses: 0,
          numUtilisateurs: 0
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données du questionnaire:', error);
      setError("Impossible de charger les données du questionnaire");
    } finally {
      setLoading(false);
    }
  };
  
  // Retour à la liste des questionnaires
  const handleBackToList = () => {
    navigate('/questionnaires');
  };
  
  // Navigation vers la page d'administration
  const handleGoToAdmin = () => {
    navigate(`/questionnaires/admin?id=${id}`);
  };
  
  // Formater la date de manière sécurisée
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.warn('Erreur lors du formatage de la date:', e);
      return 'Date invalide';
    }
  };
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleBackToList}
            sx={{ mt: 2 }}
          >
            Retour à la liste
          </Button>
        </Paper>
      </Container>
    );
  }
  
  if (!questionnaire) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" color="error" gutterBottom>
            Questionnaire non trouvé
          </Typography>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleBackToList}
            sx={{ mt: 2 }}
          >
            Retour à la liste
          </Button>
        </Paper>
      </Container>
    );
  }
  
  // Trier les questions par ordre
  const sortedQuestions = [...questions].sort((a, b) => 
    (a.ordre || 0) - (b.ordre || 0)
  );
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
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
                  {questionnaire.fonction || 'Questionnaire'} - {questionnaire.thematique || 'Sans description'}
                </Typography>
              </Box>
              <Button
                variant="contained"
                color="primary"
                startIcon={<EditIcon />}
                onClick={handleGoToAdmin}
              >
                Modifier
              </Button>
            </Box>
            
            <Typography variant="body1" paragraph>
              {questionnaire.description || 'Aucune description détaillée disponible.'}
            </Typography>
            
            <Box sx={{ mt: 2, mb: 1 }}>
              <Chip 
                label={`Créé le ${formatDate(questionnaire.date_creation || new Date().toISOString())}`} 
                variant="outlined" 
                size="small" 
                sx={{ mr: 1 }}
              />
              <Chip 
                label={`Dernière modification: ${formatDate(questionnaire.date_modification || questionnaire.date_creation || new Date().toISOString())}`} 
                variant="outlined" 
                size="small" 
                color="info"
              />
            </Box>
          </Paper>
        </Grid>
        
        {/* Statistiques */}
        <Grid xs={12}>
          <Grid container spacing={2}>
            <Grid xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="center" flexDirection="column">
                    <Badge 
                      badgeContent={stats?.numQuestions || 0} 
                      color="primary"
                      max={999}
                      sx={{ mb: 1 }}
                    >
                      <QuestionIcon fontSize="large" />
                    </Badge>
                    <Typography variant="body1" align="center" fontWeight="bold">
                      Questions
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="center" flexDirection="column">
                    <Badge 
                      badgeContent={stats?.numReponses || 0} 
                      color="success"
                      max={999}
                      sx={{ mb: 1 }}
                    >
                      <AssessmentIcon fontSize="large" />
                    </Badge>
                    <Typography variant="body1" align="center" fontWeight="bold">
                      Réponses
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="center" flexDirection="column">
                    <Badge 
                      badgeContent={stats?.numUtilisateurs || 0} 
                      color="info"
                      max={999}
                      sx={{ mb: 1 }}
                    >
                      <PeopleIcon fontSize="large" />
                    </Badge>
                    <Typography variant="body1" align="center" fontWeight="bold">
                      Utilisateurs
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
        
        {/* Liste des questions */}
        <Grid xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Questions ({sortedQuestions.length})
            </Typography>
            
            <Divider sx={{ mb: 2 }} />
            
            {sortedQuestions.length > 0 ? (
              sortedQuestions.map((question) => (
                <Accordion key={question.id_question}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Grid container spacing={1} alignItems="center">
                      <Grid xs={1}>
                        <Typography variant="body1" fontWeight="bold">
                          {question.ordre || '?'}.
                        </Typography>
                      </Grid>
                      <Grid xs={10}>
                        <Typography variant="body1">
                          {question.texte || 'Question sans texte'}
                        </Typography>
                      </Grid>
                      <Grid xs={1}>
                        <Tooltip title={`Pondération: ${question.ponderation || 0}`}>
                          <Chip 
                            label={question.ponderation || 0} 
                            color={
                              question.ponderation >= 4 ? 'error' :
                              question.ponderation >= 3 ? 'warning' :
                              question.ponderation >= 2 ? 'info' : 'default'
                            }
                            size="small"
                          />
                        </Tooltip>
                      </Grid>
                    </Grid>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid xs={12}>
                        <Typography variant="body2" color="textSecondary">
                          <strong>Pondération:</strong> {question.ponderation || 0} 
                          {question.ponderation >= 4 ? ' (Critique)' : 
                           question.ponderation >= 3 ? ' (Important)' : 
                           question.ponderation >= 2 ? ' (Significatif)' : ' (Mineur)'}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          <strong>Ajouté le:</strong> {formatDate(question.date_creation || new Date().toISOString())}
                        </Typography>
                        {question.date_modification && question.date_creation && 
                         question.date_modification !== question.date_creation && (
                          <Typography variant="body2" color="textSecondary">
                            <strong>Dernière modification:</strong> {formatDate(question.date_modification)}
                          </Typography>
                        )}
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))
            ) : (
              <Box textAlign="center" py={4}>
                <Typography variant="body1" gutterBottom>
                  Ce questionnaire ne contient aucune question.
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={handleGoToAdmin}
                  sx={{ mt: 2 }}
                >
                  Ajouter des questions
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default QuestionnaireDetail;