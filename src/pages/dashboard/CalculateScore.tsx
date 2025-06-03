// src/pages/dashboard/CalculateScore.tsx
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
  Alert,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Calculate as CalculateIcon,
} from '@mui/icons-material';
import api from '../../services/api';

interface Application {
  id_application: string;
  nom_application: string;
  statut: string;
  type: string;
  hebergement: string;
  architecture_logicielle: string;
}

interface Formulaire {
  id_formulaire: string;
  id_application: string;
  id_questionnaire: string;
  id_acteur: string;
  statut: string;
  date_creation: string;
  date_modification: string;
  titre?: string;
  questionnaire_titre?: string;
  acteur_nom?: string;
}

const CalculateScore: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [calculating, setCalculating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [formulaires, setFormulaires] = useState<Formulaire[]>([]);
  const [activeStep, setActiveStep] = useState<number>(0);

  // Étapes du processus
  const steps = [
    'Vérification des formulaires',
    'Calcul des scores',
    'Génération de l\'analyse'
  ];

  useEffect(() => {
    const fetchApplicationData = async () => {
      if (!id) {
        setError("Identifiant de l'application manquant");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Récupérer les informations de l'application
        const appResponse = await api.get(`applications/${id}`);
        if (appResponse) {
          setApplication(appResponse);
        }

        // Récupérer tous les formulaires puis filtrer par id_application
        // Puisque la route formulaires/application/:id n'existe pas
        const formResponse = await api.get(`formulaires`);
        
        let formsData: Formulaire[] = [];
        if (Array.isArray(formResponse)) {
          formsData = formResponse.filter(form => form.id_application === id);
        } else if (formResponse && formResponse.data && Array.isArray(formResponse.data)) {
          formsData = formResponse.data.filter(form => form.id_application === id);
        }
        
        setFormulaires(formsData);
        setActiveStep(0);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        setError('Erreur lors du chargement des données. Veuillez réessayer plus tard.');
      } finally {
        setLoading(false);
      }
    };

    fetchApplicationData();
  }, [id]);

  const handleCalculateScore = async () => {
    if (!id) return;

    setCalculating(true);
    setError(null);
    setSuccess(null);

    try {
      // Première étape - Vérification des formulaires
      setActiveStep(0);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulation de traitement

      // Deuxième étape - Calcul des scores
      setActiveStep(1);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulation de traitement

      // Appel à l'API pour calculer le score
      // D'après le schéma SQL, on doit appeler un endpoint qui invoquera la procédure stockée
      // calculer_scores_maturite avec le paramètre id_application
      const response = await api.post('analyses', { id_application: id });

      // Troisième étape - Génération de l'analyse
      setActiveStep(2);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulation de traitement

      setSuccess('Le score de maturité a été calculé avec succès!');
      
      // Rediriger vers la page d'analyse après 2 secondes
      setTimeout(() => {
        navigate(`/analyses-interpretations/${id}`);
      }, 2000);
    } catch (error) {
      console.error('Erreur lors du calcul du score:', error);
      setError('Une erreur est survenue lors du calcul du score. Veuillez réessayer plus tard.');
    } finally {
      setCalculating(false);
    }
  };

  // Vérifier si l'application a des formulaires avec des réponses
  const canCalculateScore = formulaires.length > 0;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* En-tête */}
        <Grid xs={12}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Box display="flex" alignItems="center" mb={2}>
              <Button
                color="primary"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/applications')}
                sx={{ mr: 2 }}
              >
                Retour aux applications
              </Button>
              <Typography component="h1" variant="h5" color="primary">
                Calcul du Score de Maturité
              </Typography>
            </Box>
            
            {application && (
              <Typography variant="subtitle1">
                Application: <strong>{application.nom_application}</strong> | 
                Type: <strong>{application.type}</strong> | 
                Statut: <strong>{application.statut}</strong>
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Messages d'erreur ou de succès */}
        {error && (
          <Grid xs={12}>
            <Alert severity="error">{error}</Alert>
          </Grid>
        )}

        {success && (
          <Grid xs={12}>
            <Alert severity="success">{success}</Alert>
          </Grid>
        )}

        {/* Stepper */}
        <Grid xs={12}>
          <Paper sx={{ p: 2 }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Paper>
        </Grid>

        {/* Vérification des formulaires */}
        <Grid xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Formulaires disponibles pour l'analyse
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {formulaires.length > 0 ? (
              <Box>
                <Typography variant="body1" mb={2}>
                  {formulaires.length} formulaire(s) trouvé(s) pour cette application.
                </Typography>
                
                <List>
                  {formulaires.map((form, index) => (
                    <ListItem key={form.id_formulaire || index} divider>
                      <ListItemText
                        primary={form.titre || form.questionnaire_titre || `Formulaire ${index + 1}`}
                        secondary={`Statut: ${form.statut || 'Non défini'} | Dernière modification: ${
                          form.date_modification ? 
                          new Date(form.date_modification).toLocaleDateString('fr-FR') : 
                          'Non disponible'
                        }`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            ) : (
              <Alert severity="warning">
                Aucun formulaire n'est disponible pour cette application. Le calcul du score de maturité nécessite au moins un formulaire complété.
              </Alert>
            )}
            
            <Box display="flex" justifyContent="center" mt={3}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<CalculateIcon />}
                onClick={handleCalculateScore}
                disabled={calculating || !canCalculateScore}
                size="large"
              >
                {calculating ? 'Calcul en cours...' : 'Calculer le Score de Maturité'}
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Explication */}
        <Grid xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Comment se déroule le calcul ?
            </Typography>
            <Typography variant="body1" paragraph>
              Le score de maturité est calculé à partir des réponses aux questionnaires liés à cette application. 
              Le processus évalue plusieurs thématiques et fournit un score global ainsi que des scores par domaine.
            </Typography>
            <Typography variant="body1">
              <strong>Note :</strong> Pour obtenir un score pertinent, assurez-vous que les formulaires ont été 
              complétés avec soin et reflètent fidèlement la maturité DevSecOps de l'application.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default CalculateScore;