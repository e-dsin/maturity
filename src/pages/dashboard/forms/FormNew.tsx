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
  CardContent
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import api from '../../../services/api';
import { CreateFormulaireRequest } from '../../../types/Formulaire';

interface Application {
  id_application: string;
  nom_application: string;
}

interface Acteur {
  id_acteur: string;
  nom_prenom: string;
  id_entreprise: string;
  entreprise_nom?: string;
}

interface Questionnaire {
  id_questionnaire: string;
  fonction: string;
  thematique: string;
}

interface Entreprise {
  id_entreprise: string;
  nom_entreprise: string;
}

interface Fonction {
  id_fonction: string;
  nom: string;
}

const FormNew: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [acteurs, setActeurs] = useState<Acteur[]>([]);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [fonctions, setFonctions] = useState<Fonction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  
  // Valeurs du formulaire
  const [formValues, setFormValues] = useState<CreateFormulaireRequest & { id_entreprise?: string, id_fonction?: string }>({
    id_acteur: '',
    id_questionnaire: '',
    id_entreprise: '',
    id_fonction: '',
    statut: 'Brouillon'
  });
  
  // États de validation
  const [validation, setValidation] = useState({
    id_acteur: true,
    id_questionnaire: true,
    id_entreprise: true,
    id_fonction: true
  });
  
  // Étapes du stepper
  const steps = [
    { label: 'Entreprise', icon: <BusinessIcon /> },
    { label: 'Fonction', icon: <AssignmentIcon /> },
    { label: 'Acteur', icon: <PersonIcon /> }
  ];
  
  // Filtres pour limiter les options basés sur les sélections précédentes
  const [filteredActeurs, setFilteredActeurs] = useState<Acteur[]>([]);
  const [filteredQuestionnaires, setFilteredQuestionnaires] = useState<Questionnaire[]>([]);
  
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
        } else {
          console.warn('Format de réponse inattendu pour entreprises:', entreprisesResponse);
        }
        setEntreprises(entreprisesData);
        
        // Récupérer les fonctions
        const fonctionsResponse = await api.get('fonctions');
        let fonctionsData: Fonction[] = [];
        if (Array.isArray(fonctionsResponse)) {
          fonctionsData = fonctionsResponse;
        } else if (fonctionsResponse && fonctionsResponse.data && Array.isArray(fonctionsResponse.data)) {
          fonctionsData = fonctionsResponse.data;
        } else {
          console.warn('Format de réponse inattendu pour fonctions:', fonctionsResponse);
        }
        setFonctions(fonctionsData);
        
        // Récupérer les acteurs
        const acteursResponse = await api.get('acteurs');
        let acteursData: Acteur[] = [];
        if (Array.isArray(acteursResponse)) {
          acteursData = acteursResponse;
        } else if (acteursResponse && acteursResponse.data && Array.isArray(acteursResponse.data)) {
          acteursData = acteursResponse.data;
        } else {
          console.warn('Format de réponse inattendu pour acteurs:', acteursResponse);
        }
        setActeurs(acteursData);
        
        // Récupérer les questionnaires
        const questionnairesResponse = await api.get('questionnaires');
        let questionnairesData: Questionnaire[] = [];
        if (Array.isArray(questionnairesResponse)) {
          questionnairesData = questionnairesResponse;
        } else if (questionnairesResponse && questionnairesResponse.data && Array.isArray(questionnairesResponse.data)) {
          questionnairesData = questionnairesResponse.data;
        } else {
          console.warn('Format de réponse inattendu pour questionnaires:', questionnairesResponse);
        }
        setQuestionnaires(questionnairesData);
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
      
      // Si l'acteur sélectionné ne fait pas partie de l'entreprise sélectionnée, réinitialiser la sélection
      if (formValues.id_acteur && !filtered.some(acteur => acteur.id_acteur === formValues.id_acteur)) {
        setFormValues(prev => ({ ...prev, id_acteur: '' }));
      }
    } else {
      setFilteredActeurs(acteurs);
    }
  }, [formValues.id_entreprise, acteurs]);
  
  // Mettre à jour les questionnaires filtrés lorsque la fonction change
  useEffect(() => {
    if (formValues.id_fonction) {
      const fonction = fonctions.find(f => f.id_fonction === formValues.id_fonction);
      if (fonction) {
        const filtered = questionnaires.filter(q => q.fonction === fonction.nom);
        setFilteredQuestionnaires(filtered);
        
        // Si le questionnaire sélectionné ne correspond pas à la fonction sélectionnée, réinitialiser la sélection
        if (formValues.id_questionnaire && !filtered.some(q => q.id_questionnaire === formValues.id_questionnaire)) {
          setFormValues(prev => ({ ...prev, id_questionnaire: '' }));
        }
      }
    } else {
      setFilteredQuestionnaires(questionnaires);
    }
  }, [formValues.id_fonction, fonctions, questionnaires]);
  
  // Gérer les changements dans le formulaire
  const handleChange = (event: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const name = event.target.name as keyof (CreateFormulaireRequest & { id_entreprise?: string, id_fonction?: string });
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
  
  // Valider l'étape actuelle
  const validateCurrentStep = () => {
    let isValid = true;
    const newValidation = { ...validation };
    
    switch(activeStep) {
      case 0: // Entreprise
        newValidation.id_entreprise = Boolean(formValues.id_entreprise);
        isValid = newValidation.id_entreprise;
        break;
      case 1: // Fonction
        newValidation.id_fonction = Boolean(formValues.id_fonction);
        isValid = newValidation.id_fonction;
        break;
      case 2: // Acteur
        newValidation.id_acteur = Boolean(formValues.id_acteur);
        isValid = newValidation.id_acteur;
        break;
    }
    
    setValidation(newValidation);
    return isValid;
  };
  
  // Valider tout le formulaire
  const validateForm = () => {
    const newValidation = {
      id_acteur: Boolean(formValues.id_acteur),
      id_questionnaire: Boolean(formValues.id_questionnaire),
      id_entreprise: Boolean(formValues.id_entreprise),
      id_fonction: Boolean(formValues.id_fonction)
    };
    
    setValidation(newValidation);
    
    // Retourner true si tous les champs sont valides
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
    
    // Trouver le questionnaire correspondant à la fonction sélectionnée
    if (!formValues.id_questionnaire && formValues.id_fonction) {
      const fonction = fonctions.find(f => f.id_fonction === formValues.id_fonction);
      if (fonction) {
        const matchingQuestionnaire = questionnaires.find(q => q.fonction === fonction.nom);
        if (matchingQuestionnaire) {
          formValues.id_questionnaire = matchingQuestionnaire.id_questionnaire;
        }
      }
    }
    
    if (!validateForm()) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      // Préparer les données à envoyer
      // Note: Le backend exige toujours id_application même si ce n'est plus utilisé dans l'interface
      const { id_entreprise, id_fonction, ...submitData } = formValues;
      
      const DEFAULT_APPLICATION_ID = "892daedf-3423-11f0-9f03-04bf1ba7bd1e";
      // Ajouter un id_application "factice" ou par défaut pour satisfaire l'API
      const dataToSubmit = {
        ...submitData,
        id_application: DEFAULT_APPLICATION_ID // Valeur factice pour satisfaire l'AP
      };
      
      // Supprimer le préfixe '/api/' car api.ts l'ajoute déjà
      const response = await api.post('formulaires', dataToSubmit);
      
      // Rediriger vers le détail du formulaire
      let formId = '';
      if (response && response.data && response.data.id_formulaire) {
        formId = response.data.id_formulaire;
      } else if (response && response.id_formulaire) {
        formId = response.id_formulaire;
      } else {
        console.warn('Format de réponse inattendu pour la création du formulaire:', response);
        // Rediriger quand même vers la liste si on ne peut pas récupérer l'ID
        navigate('/formulaires');
        return;
      }
      
      navigate(`/formulaires/${formId}`);
    } catch (error) {
      console.error('Erreur lors de la création du formulaire:', error);
      setError('Erreur lors de la création du formulaire. Veuillez réessayer plus tard.');
      setSubmitting(false);
    }
  };
  
  // Obtenir le contenu de l'étape actuelle
  const getStepContent = (step: number) => {
    switch (step) {
      case 0: // Entreprise
        return (
          <Grid container spacing={3}>
            <Grid xs={12}>
              <FormControl fullWidth error={!validation.id_entreprise}>
                <InputLabel id="entreprise-label">Entreprise</InputLabel>
                <Select
                  labelId="entreprise-label"
                  id="id_entreprise"
                  name="id_entreprise"
                  value={formValues.id_entreprise}
                  onChange={handleChange}
                  label="Entreprise"
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
      case 1: // Fonction
        return (
          <Grid container spacing={3}>
            <Grid xs={12}>
              <FormControl fullWidth error={!validation.id_fonction}>
                <InputLabel id="fonction-label">Fonction</InputLabel>
                <Select
                  labelId="fonction-label"
                  id="id_fonction"
                  name="id_fonction"
                  value={formValues.id_fonction}
                  onChange={handleChange}
                  label="Fonction"
                  required
                >
                  {fonctions.map((fonction) => (
                    <MenuItem key={fonction.id_fonction} value={fonction.id_fonction}>
                      {fonction.nom}
                    </MenuItem>
                  ))}
                </Select>
                {!validation.id_fonction && (
                  <FormHelperText>La fonction est requise</FormHelperText>
                )}
              </FormControl>
            </Grid>
            
            {formValues.id_fonction && filteredQuestionnaires.length > 0 && (
              <Grid xs={12}>
                <FormControl fullWidth error={!validation.id_questionnaire}>
                  <InputLabel id="questionnaire-label">Questionnaire</InputLabel>
                  <Select
                    labelId="questionnaire-label"
                    id="id_questionnaire"
                    name="id_questionnaire"
                    value={formValues.id_questionnaire}
                    onChange={handleChange}
                    label="Questionnaire"
                    required
                  >
                    {filteredQuestionnaires.map((q) => (
                      <MenuItem key={q.id_questionnaire} value={q.id_questionnaire}>
                        {q.fonction} ({q.thematique})
                      </MenuItem>
                    ))}
                  </Select>
                  {!validation.id_questionnaire && (
                    <FormHelperText>Le questionnaire est requis</FormHelperText>
                  )}
                </FormControl>
              </Grid>
            )}
          </Grid>
        );
      case 2: // Acteur
        return (
          <Grid container spacing={3}>
            <Grid xs={12}>
              <FormControl fullWidth error={!validation.id_acteur}>
                <InputLabel id="acteur-label">Acteur</InputLabel>
                <Select
                  labelId="acteur-label"
                  id="id_acteur"
                  name="id_acteur"
                  value={formValues.id_acteur}
                  onChange={handleChange}
                  label="Acteur"
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
      default:
        return 'Étape inconnue';
    }
  };
  
  // Résumé avant soumission
  const renderSummary = () => {
    const entreprise = entreprises.find(e => e.id_entreprise === formValues.id_entreprise);
    const fonction = fonctions.find(f => f.id_fonction === formValues.id_fonction);
    const acteur = acteurs.find(a => a.id_acteur === formValues.id_acteur);
    const questionnaire = questionnaires.find(q => q.id_questionnaire === formValues.id_questionnaire) || 
                          questionnaires.find(q => q.fonction === fonction?.nom);
    
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Résumé du formulaire
          </Typography>
          <Grid container spacing={2}>
            <Grid xs={12} sm={6}>
              <Typography variant="subtitle2">Entreprise:</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {entreprise?.nom_entreprise || 'Non sélectionnée'}
              </Typography>
              
              <Typography variant="subtitle2">Fonction:</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {fonction?.nom || 'Non sélectionnée'}
              </Typography>
            </Grid>
            <Grid xs={12} sm={6}>
              <Typography variant="subtitle2">Acteur:</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {acteur?.nom_prenom || 'Non sélectionné'}
              </Typography>
              
              {questionnaire && (
                <>
                  <Typography variant="subtitle2">Questionnaire:</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {questionnaire.fonction} ({questionnaire.thematique})
                  </Typography>
                </>
              )}
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
        <Grid xs={12}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Box display="flex" alignItems="center" mb={2}>
              <IconButton color="primary" onClick={() => navigate('/formulaires')} sx={{ mr: 1 }}>
                <ArrowBackIcon />
              </IconButton>
              <Typography component="h1" variant="h5" color="primary">
                Nouveau Formulaire d'Évaluation
              </Typography>
            </Box>
            
            <Typography variant="body2" color="text.secondary">
              Créez un nouveau formulaire d'évaluation en suivant les étapes ci-dessous.
            </Typography>
          </Paper>
        </Grid>
        
        {/* Stepper */}
        <Grid xs={12}>
          <Paper sx={{ p: 2 }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((step, index) => (
                <Step key={index}>
                  <StepLabel
                    StepIconProps={{
                      icon: index === activeStep ? (
                        <Box 
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            width: 24,
                            height: 24
                          }}
                        >
                          {step.icon}
                        </Box>
                      ) : (
                        index + 1
                      )
                    }}
                  >
                    {step.label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Paper>
        </Grid>
        
        {/* Formulaire */}
        <Grid xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box component="form" noValidate onSubmit={handleSubmit}>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
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
                      {submitting ? 'Création en cours...' : 'Créer le formulaire'}
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