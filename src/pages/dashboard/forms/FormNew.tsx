import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  FormHelperText,
  IconButton,
  Divider,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Checkbox,
  ListItemText,
  Chip,
  FormGroup,
  FormControlLabel
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import api from '../../../services/api';

interface Acteur {
  id_acteur: string;
  nom_prenom: string;
  id_entreprise: string;
  entreprise_nom?: string;
}

// Mis à jour pour la nouvelle structure
interface Questionnaire {
  id_questionnaire: string;
  nom: string;
  description?: string;
  thematiques?: string[];
  fonctions?: string[];
}

interface Entreprise {
  id_entreprise: string;
  nom_entreprise: string;
}

const FormNew: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [acteurs, setActeurs] = useState<Acteur[]>([]);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  
  // Valeurs du formulaire
  const [formValues, setFormValues] = useState<{
    id_entreprise: string;
    id_acteur: string;
    questionnaires: string[]; // Array de questionnaires sélectionnés
  }>({
    id_entreprise: '',
    id_acteur: '',
    questionnaires: []
  });
  
  // États de validation
  const [validation, setValidation] = useState({
    id_entreprise: true,
    id_acteur: true,
    questionnaires: true
  });
  
  // Étapes du stepper
  const steps = [
    { label: 'Entreprise', icon: <BusinessIcon /> },
    { label: 'Acteur', icon: <PersonIcon /> },
    { label: 'Questionnaires', icon: <AssignmentIcon /> }
  ];
  
  // Filtres pour limiter les options basés sur les sélections précédentes
  const [filteredActeurs, setFilteredActeurs] = useState<Acteur[]>([]);
  
  // Charger les données nécessaires
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Récupérer les entreprises
        const entreprisesResponse = await api.get('entreprises');
        let entreprisesData: Entreprise[] = [];
        if (Array.isArray(entreprisesResponse)) {
          entreprisesData = entreprisesResponse;
        } else if (entreprisesResponse && entreprisesResponse.data && Array.isArray(entreprisesResponse.data)) {
          entreprisesData = entreprisesResponse.data;
        }
        setEntreprises(entreprisesData);
        
        // Récupérer les acteurs
        const acteursResponse = await api.get('acteurs');
        let acteursData: Acteur[] = [];
        if (Array.isArray(acteursResponse)) {
          acteursData = acteursResponse;
        } else if (acteursResponse && acteursResponse.data && Array.isArray(acteursResponse.data)) {
          acteursData = acteursResponse.data;
        }
        setActeurs(acteursData);
        
        // Récupérer les questionnaires avec la nouvelle structure
        const questionnairesResponse = await api.get('questionnaires');
        let questionnairesData: any[] = [];
        if (Array.isArray(questionnairesResponse)) {
          questionnairesData = questionnairesResponse;
        } else if (questionnairesResponse && questionnairesResponse.data && Array.isArray(questionnairesResponse.data)) {
          questionnairesData = questionnairesResponse.data;
        }
        
        // Normaliser les questionnaires pour la nouvelle structure
        const normalizedQuestionnaires = questionnairesData.map(q => ({
          id_questionnaire: q.id_questionnaire,
          nom: q.nom || q.questionnaire_nom || 'Questionnaire sans nom',
          description: q.description || '',
          // Adapter selon la réponse de l'API - ces champs peuvent venir sous forme d'arrays ou de strings
          thematiques: Array.isArray(q.thematiques) ? q.thematiques : (q.thematiques ? q.thematiques.split(',').map(t => t.trim()) : []),
          fonctions: Array.isArray(q.fonctions) ? q.fonctions : (q.fonctions ? q.fonctions.split(',').map(f => f.trim()) : [])
        }));
        
        setQuestionnaires(normalizedQuestionnaires);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        setError('Erreur lors du chargement des données. Veuillez réessayer plus tard.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Mettre à jour les acteurs filtrés lorsque l'entreprise change
  useEffect(() => {
    if (formValues.id_entreprise) {
      const filtered = acteurs.filter(acteur => acteur.id_entreprise === formValues.id_entreprise);
      setFilteredActeurs(filtered);
      
      // Si l'acteur sélectionné ne fait pas partie de l'entreprise sélectionnée, réinitialiser
      if (formValues.id_acteur && !filtered.some(acteur => acteur.id_acteur === formValues.id_acteur)) {
        setFormValues(prev => ({ ...prev, id_acteur: '' }));
      }
    } else {
      setFilteredActeurs(acteurs);
    }
  }, [formValues.id_entreprise, acteurs]);
  
  // Gérer les changements dans le formulaire
  const handleChange = (event: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const name = event.target.name as keyof typeof formValues;
    const value = event.target.value;
    
    if (name) {
      setFormValues({
        ...formValues,
        [name]: value
      });
      
      // Réinitialiser l'état de validation pour ce champ
      if (name in validation) {
        setValidation({
          ...validation,
          [name]: true
        });
      }
    }
  };
  
  // Gérer la sélection multiple de questionnaires
  const handleQuestionnaireChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const value = event.target.value as string[];
    setFormValues({
      ...formValues,
      questionnaires: value
    });
    setValidation({
      ...validation,
      questionnaires: true
    });
  };
  
  // Valider l'étape actuelle
  const validateCurrentStep = () => {
    let isValid = true;
    const newValidation = { ...validation };
    
    switch(activeStep) {
      case 0: // Entreprise
        newValidation.id_entreprise = Boolean(formValues.id_entreprise);
        isValid = newValidation.id_entreprise;
        break;
      case 1: // Acteur
        newValidation.id_acteur = Boolean(formValues.id_acteur);
        isValid = newValidation.id_acteur;
        break;
      case 2: // Questionnaires
        newValidation.questionnaires = formValues.questionnaires.length > 0;
        isValid = newValidation.questionnaires;
        break;
    }
    
    setValidation(newValidation);
    return isValid;
  };
  
  // Valider tout le formulaire
  const validateForm = () => {
    const newValidation = {
      id_entreprise: Boolean(formValues.id_entreprise),
      id_acteur: Boolean(formValues.id_acteur),
      questionnaires: formValues.questionnaires.length > 0
    };
    
    setValidation(newValidation);
    
    return Object.values(newValidation).every(Boolean);
  };
  
  // Gérer le changement d'étape
  const handleNext = () => {
    if (validateCurrentStep()) {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    } else {
      setError('Veuillez remplir tous les champs obligatoires avant de continuer.');
    }
  };
  
  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
    setError(null);
  };
  
  // Soumettre le formulaire
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const DEFAULT_APPLICATION_ID = "892daedf-3423-11f0-9f03-04bf1ba7bd1e";
      
      // Créer un formulaire pour chaque questionnaire sélectionné
      const creationPromises = formValues.questionnaires.map(async (id_questionnaire) => {
        const dataToSubmit = {
          id_questionnaire,
          id_acteur: formValues.id_acteur,
          id_application: DEFAULT_APPLICATION_ID, // Valeur par défaut pour l'API
          statut: 'Brouillon' as const
        };
        
        try {
          const response = await api.post('formulaires', dataToSubmit);
          return { success: true, response, id_questionnaire };
        } catch (error) {
          return { success: false, error, id_questionnaire };
        }
      });
      
      const results = await Promise.all(creationPromises);
      
      // Compter les succès et les échecs
      const successes = results.filter(r => r.success);
      const failures = results.filter(r => !r.success);
      
      if (successes.length === 0) {
        setError('Erreur lors de la création des formulaires. Aucun formulaire n\'a pu être créé.');
      } else if (failures.length > 0) {
        setSuccess(`${successes.length} formulaire(s) créé(s) avec succès. ${failures.length} échec(s).`);
        
        // Attendre 2 secondes avant de rediriger
        setTimeout(() => {
          navigate('/formulaires');
        }, 2000);
      } else {
        setSuccess(`${successes.length} formulaire(s) créé(s) avec succès !`);
        
        // Si un seul formulaire créé, rediriger vers son détail
        if (successes.length === 1) {
          const response = successes[0].response;
          let formId = '';
          if (response && response.data && response.data.id_formulaire) {
            formId = response.data.id_formulaire;
          } else if (response && response.id_formulaire) {
            formId = response.id_formulaire;
          }
          
          if (formId) {
            navigate(`/formulaires/${formId}`);
            return;
          }
        }
        
        // Sinon, rediriger vers la liste après 2 secondes
        setTimeout(() => {
          navigate('/formulaires');
        }, 2000);
      }
    } catch (error) {
      console.error('Erreur lors de la création des formulaires:', error);
      setError('Erreur lors de la création des formulaires. Veuillez réessayer plus tard.');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Obtenir le contenu de l'étape actuelle
  const getStepContent = (step: number) => {
    switch (step) {
      case 0: // Entreprise
        return (
          <Grid container spacing={3}>
            <Grid size={12}>
              <FormControl fullWidth error={!validation.id_entreprise}>
                <InputLabel id="entreprise-label">Entreprise *</InputLabel>
                <Select
                  labelId="entreprise-label"
                  id="id_entreprise"
                  name="id_entreprise"
                  value={formValues.id_entreprise}
                  onChange={handleChange}
                  label="Entreprise *"
                  required
                >
                  {entreprises.map((ent) => (
                    <MenuItem key={ent.id_entreprise} value={ent.id_entreprise}>
                      {ent.nom_entreprise}
                    </MenuItem>
                  ))}
                </Select>
                {!validation.id_entreprise && (
                  <FormHelperText>L'entreprise est requise</FormHelperText>
                )}
              </FormControl>
            </Grid>
          </Grid>
        );
        
      case 1: // Acteur
        return (
          <Grid container spacing={3}>
            <Grid size={12}>
              <FormControl fullWidth error={!validation.id_acteur}>
                <InputLabel id="acteur-label">Acteur *</InputLabel>
                <Select
                  labelId="acteur-label"
                  id="id_acteur"
                  name="id_acteur"
                  value={formValues.id_acteur}
                  onChange={handleChange}
                  label="Acteur *"
                  required
                >
                  {filteredActeurs.map((acteur) => (
                    <MenuItem key={acteur.id_acteur} value={acteur.id_acteur}>
                      {acteur.nom_prenom}
                    </MenuItem>
                  ))}
                </Select>
                {!validation.id_acteur && (
                  <FormHelperText>L'acteur est requis</FormHelperText>
                )}
              </FormControl>
              {filteredActeurs.length === 0 && formValues.id_entreprise && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Aucun acteur n'est associé à cette entreprise. Veuillez en ajouter ou sélectionner une autre entreprise.
                </Alert>
              )}
            </Grid>
          </Grid>
        );
        
      case 2: // Questionnaires
        return (
          <Grid container spacing={3}>
            <Grid size={12}>
              <FormControl fullWidth error={!validation.questionnaires}>
                <InputLabel id="questionnaires-label">Questionnaires *</InputLabel>
                <Select
                  labelId="questionnaires-label"
                  id="questionnaires"
                  name="questionnaires"
                  multiple
                  value={formValues.questionnaires}
                  onChange={handleQuestionnaireChange}
                  label="Questionnaires *"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => {
                        const q = questionnaires.find(quest => quest.id_questionnaire === value);
                        return (
                          <Chip 
                            key={value} 
                            label={q?.nom || 'Questionnaire inconnu'} 
                            size="small" 
                          />
                        );
                      })}
                    </Box>
                  )}
                >
                  {questionnaires.map((q) => (
                    <MenuItem key={q.id_questionnaire} value={q.id_questionnaire}>
                      <Checkbox checked={formValues.questionnaires.indexOf(q.id_questionnaire) > -1} />
                      <ListItemText 
                        primary={q.nom}
                        secondary={
                          <Box>
                            {q.description && (
                              <Typography variant="caption" display="block">
                                {q.description}
                              </Typography>
                            )}
                            {q.fonctions && q.fonctions.length > 0 && (
                              <Box sx={{ mt: 0.5 }}>
                                <Typography variant="caption" color="text.secondary">
                                  Fonctions: {q.fonctions.join(', ')}
                                </Typography>
                              </Box>
                            )}
                            {q.thematiques && q.thematiques.length > 0 && (
                              <Box sx={{ mt: 0.5 }}>
                                {q.thematiques.slice(0, 3).map((thematique, index) => (
                                  <Chip
                                    key={index}
                                    label={thematique}
                                    size="small"
                                    variant="outlined"
                                    color="secondary"
                                    sx={{ mr: 0.5, mb: 0.5 }}
                                  />
                                ))}
                                {q.thematiques.length > 3 && (
                                  <Chip
                                    label={`+${q.thematiques.length - 3}`}
                                    size="small"
                                    variant="outlined"
                                    color="default"
                                  />
                                )}
                              </Box>
                            )}
                          </Box>
                        }
                      />
                    </MenuItem>
                  ))}
                </Select>
                {!validation.questionnaires && (
                  <FormHelperText>Sélectionnez au moins un questionnaire</FormHelperText>
                )}
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {formValues.questionnaires.length} questionnaire(s) sélectionné(s). 
                Un formulaire sera créé pour chaque questionnaire.
              </Typography>
            </Grid>
          </Grid>
        );
        
      default:
        return 'Étape inconnue';
    }
  };
  
  // Résumé avant soumission
  const renderSummary = () => {
    const entreprise = entreprises.find(e => e.id_entreprise === formValues.id_entreprise);
    const acteur = acteurs.find(a => a.id_acteur === formValues.id_acteur);
    const selectedQuestionnaires = questionnaires.filter(q => 
      formValues.questionnaires.includes(q.id_questionnaire)
    );
    
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Résumé de la création
          </Typography>
          <Grid container spacing={2}>
            <Grid size={12}>
              <Typography variant="subtitle2">Entreprise:</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {entreprise?.nom_entreprise || 'Non sélectionnée'}
              </Typography>
              
              <Typography variant="subtitle2">Acteur:</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {acteur?.nom_prenom || 'Non sélectionné'}
              </Typography>
              
              <Typography variant="subtitle2" sx={{ mt: 2 }}>
                Questionnaires sélectionnés ({selectedQuestionnaires.length}):
              </Typography>
              <Box sx={{ ml: 2 }}>
                {selectedQuestionnaires.map((q) => (
                  <Box key={q.id_questionnaire} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <CheckCircleIcon color="success" fontSize="small" sx={{ mr: 1 }} />
                      <Typography variant="body2" fontWeight="medium">
                        {q.nom}
                      </Typography>
                    </Box>
                    
                    {q.fonctions && q.fonctions.length > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 3, display: 'block' }}>
                        Fonctions: {q.fonctions.join(', ')}
                      </Typography>
                    )}
                    
                    {q.thematiques && q.thematiques.length > 0 && (
                      <Box sx={{ ml: 3, mt: 0.5 }}>
                        {q.thematiques.map((thematique, index) => (
                          <Chip
                            key={index}
                            label={thematique}
                            size="small"
                            variant="outlined"
                            color="secondary"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
              
              <Alert severity="info" sx={{ mt: 2 }}>
                {selectedQuestionnaires.length} formulaire(s) seront créés à partir de cette sélection.
              </Alert>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
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
      <Grid container spacing={3}>
        {/* En-tête */}
        <Grid size={12}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Box display="flex" alignItems="center" mb={2}>
              <IconButton color="primary" onClick={() => navigate('/formulaires')} sx={{ mr: 1 }}>
                <ArrowBackIcon />
              </IconButton>
              <Typography component="h1" variant="h5" color="primary">
                Créer des Formulaires d'Évaluation
              </Typography>
            </Box>
            
            <Typography variant="body2" color="text.secondary">
              Sélectionnez une entreprise, un acteur et un ou plusieurs questionnaires pour créer les formulaires correspondants.
            </Typography>
          </Paper>
        </Grid>
        
        {/* Stepper */}
        <Grid size={12}>
          <Paper sx={{ p: 2 }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((step, index) => (
                <Step key={index}>
                  <StepLabel>{step.label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Paper>
        </Grid>
        
        {/* Formulaire */}
        <Grid size={12}>
          <Paper sx={{ p: 2 }}>
            <Box component="form" noValidate onSubmit={handleSubmit}>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}
              
              {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {success}
                </Alert>
              )}
              
              {activeStep === steps.length ? (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Toutes les étapes sont complétées
                  </Typography>
                  
                  {renderSummary()}
                  
                  <Box display="flex" justifyContent="space-between">
                    <Button
                      variant="outlined"
                      onClick={() => setActiveStep(activeStep - 1)}
                      startIcon={<ArrowBackIcon />}
                    >
                      Retour
                    </Button>
                    
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      disabled={submitting}
                      startIcon={<SaveIcon />}
                    >
                      {submitting ? 'Création en cours...' : 'Créer les formulaires'}
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      {steps[activeStep].label}
                    </Typography>
                    <Divider />
                  </Box>
                  
                  {getStepContent(activeStep)}
                  
                  <Box display="flex" justifyContent="space-between" mt={3}>
                    <Button
                      variant="outlined"
                      onClick={activeStep === 0 ? () => navigate('/formulaires') : handleBack}
                      startIcon={<ArrowBackIcon />}
                    >
                      {activeStep === 0 ? 'Annuler' : 'Précédent'}
                    </Button>
                    
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={activeStep === steps.length - 1 ? () => handleNext() : handleNext}
                    >
                      {activeStep === steps.length - 1 ? 'Finaliser' : 'Suivant'}
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default FormNew;