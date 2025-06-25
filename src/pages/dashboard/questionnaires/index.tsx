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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Chip,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  FileCopy as CloneIcon,
  QuestionAnswer as QuestionIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// Types
interface Questionnaire {
  id_questionnaire: string;
  nom: string;
  description?: string;
  date_creation: string;
  date_modification: string;
}

interface QuestionnaireStat {
  numQuestions: number;
  numReponses: number;
  numUtilisateurs: number;
}

const QuestionnairesIndex: React.FC = () => {
  const navigate = useNavigate();
  
  // États pour les données
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [questionnaireStats, setQuestionnaireStats] = useState<{ [key: string]: QuestionnaireStat }>({});
  
  // Récupérer tous les questionnaires au chargement
  useEffect(() => {
    fetchQuestionnaires();
  }, []);

  // Récupérer tous les questionnaires
  const fetchQuestionnaires = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Retirer le préfixe '/api' car il est ajouté par le service api
      const response = await api.get('questionnaires');
      
      // Vérifier et adapter la réponse en fonction de sa structure
      let questionnaireData: Questionnaire[] = [];
      if (Array.isArray(response)) {
        questionnaireData = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        questionnaireData = response.data;
      } else {
        console.warn('Format de réponse inattendu pour questionnaires:', response);
        setError('Format de données inattendu pour les questionnaires');
      }
      
      // Normaliser les données des questionnaires
      const normalizedQuestionnaires = questionnaireData.map((q: any) => ({
        id_questionnaire: q.id_questionnaire,
        nom: q.nom || q.titre || 'Sans nom',
        description: q.description || '',
        date_creation: q.date_creation || new Date().toISOString(),
        date_modification: q.date_modification || q.date_creation || new Date().toISOString()
      }));
      
      setQuestionnaires(normalizedQuestionnaires);
      
      // Récupérer les statistiques pour chaque questionnaire
      // Adapter le chemin pour correspondre à la route backend
      const statsResponse = await api.get('questionnaires/stats');
      
      let statsData = [];
      if (Array.isArray(statsResponse)) {
        statsData = statsResponse;
      } else if (statsResponse && statsResponse.data && Array.isArray(statsResponse.data)) {
        statsData = statsResponse.data;
      } else {
        console.warn('Format de réponse inattendu pour les statistiques:', statsResponse);
        // Ne pas mettre d'erreur ici, car les statistiques ne sont pas critiques
      }
      
      // Convertir le tableau en objet pour faciliter l'accès
      // Gérer différents formats possibles dans la réponse
      const statsObj = statsData.reduce((acc: { [key: string]: QuestionnaireStat }, stat: any) => {
        acc[stat.id_questionnaire] = {
          numQuestions: stat.numQuestions || 0,
          numReponses: stat.numReponses || stat.num_evaluations || 0,
          numUtilisateurs: stat.numUtilisateurs || 0
        };
        return acc;
      }, {});
      
      setQuestionnaireStats(statsObj);
    } catch (error) {
      console.error('Erreur lors du chargement des questionnaires:', error);
      setError('Impossible de charger les questionnaires. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  // Navigation vers la vue détaillée d'un questionnaire
  const handleViewQuestionnaire = (questionnaire: Questionnaire) => {
    navigate(`/questionnaires/${questionnaire.id_questionnaire}`);
  };

  // Navigation vers la page d'administration
  const handleGoToAdmin = () => {
    navigate('/questionnaires/admin');
  };

  // Formater la date en gérant les erreurs potentielles
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      console.warn('Erreur lors du formatage de la date:', e);
      return 'Date invalide';
    }
  };

  // Récupérer les statistiques avec une gestion robuste des erreurs
  const getStats = (questionnaireId: string, statType: keyof QuestionnaireStat) => {
    try {
      return questionnaireStats[questionnaireId]?.[statType] || 0;
    } catch (e) {
      return 0;
    }
  };

  if (loading) {
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
              <Typography component="h1" variant="h5" color="primary">
                Questionnaires d'Évaluation
              </Typography>
              <Box>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleGoToAdmin}
                  sx={{ mr: 1 }}
                >
                  Administration
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleGoToAdmin}
                >
                  Nouveau Questionnaire
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Liste des questionnaires */}
        <Grid xs={12}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nom</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Questions</TableCell>
                  <TableCell>Réponses</TableCell>
                  <TableCell>Utilisateurs</TableCell>
                  <TableCell>Dernière modification</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {questionnaires.length > 0 ? (
                  questionnaires.map((questionnaire) => (
                    <TableRow key={questionnaire.id_questionnaire} hover>
                      <TableCell>{questionnaire.nom}</TableCell>
                      <TableCell>
                        {questionnaire.description && questionnaire.description.length > 50
                          ? `${questionnaire.description.substring(0, 50)}...`
                          : questionnaire.description || 'Aucune description'}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          icon={<QuestionIcon />}
                          label={getStats(questionnaire.id_questionnaire, 'numQuestions')}
                          color={
                            getStats(questionnaire.id_questionnaire, 'numQuestions') > 0 
                              ? 'success' 
                              : 'default'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {getStats(questionnaire.id_questionnaire, 'numReponses')}
                      </TableCell>
                      <TableCell>
                        {getStats(questionnaire.id_questionnaire, 'numUtilisateurs')}
                      </TableCell>
                      <TableCell>
                        {formatDate(questionnaire.date_modification)}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Voir les détails">
                          <IconButton 
                            color="info" 
                            onClick={() => handleViewQuestionnaire(questionnaire)}
                          >
                            <ExpandMoreIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography variant="body1" sx={{ py: 2 }}>
                        Aucun questionnaire disponible
                      </Typography>
                      <Button 
                        variant="contained" 
                        color="primary" 
                        startIcon={<AddIcon />}
                        onClick={handleGoToAdmin}
                      >
                        Créer le premier questionnaire
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </Container>
  );
};

export default QuestionnairesIndex;