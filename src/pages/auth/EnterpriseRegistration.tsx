// src/pages/auth/EnterpriseRegistration.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Grid, Paper, Typography, Box, TextField, Button, Stepper, Step, StepLabel,
  FormControl, InputLabel, Select, MenuItem, Alert, CircularProgress, Card, CardContent,
  InputAdornment, IconButton, Divider, LinearProgress, Chip, FormHelperText, List,
  ListItem, ListItemText, ListItemIcon, ListItemSecondaryAction, Radio, RadioGroup,
  FormControlLabel, FormLabel, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  Visibility, VisibilityOff, Business, Person, PersonAdd, Analytics, ArrowBack,
  ArrowForward, CheckCircle, LocationOn, Email, Phone, Language, People, TrendingUp,
  Info, Add, Delete, Warning, Share, Launch, Assignment, Security, Computer, 
  Storage, Code, Lightbulb
} from '@mui/icons-material';
import api from '../../services/api';

interface EnterpriseRegistrationData {
  nom_entreprise: string;
  secteur: string;
  description: string;
  adresse: string;
  telephone: string;
  email: string;
  site_web: string;
  taille_entreprise: 'TPE' | 'PME' | 'ETI' | 'GE' | '';
  chiffre_affaires: number | '';
  effectif_total: number | '';
  ville_siege_social: string;
  pays_siege_social: string;
  manager_nom_prenom: string;
  manager_email: string;
  manager_mot_de_passe: string;
  vision_transformation_numerique: string;
}

interface TeamMember {
  id: string;
  nom_prenom: string;
  email: string;
  fonction: string;
  role: 'Evaluateur' | 'Observateur';
}

interface MotivationData {
  vision_transformation_numerique: string;
  motivations: {
    [key: string]: {
      motivation: string;
      but: string;
      objectif: string;
      mesure: string;
    };
  };
}

interface ValidationErrors {
  [key: string]: string;
}

interface EvaluationLink {
  acteurId: string;
  nom_prenom: string;
  email: string;
  fonction: string;
  role: string;
  evaluationLink: string;
  isManager?: boolean;
  inviteId: string;
}

interface ApiCompleteResponse {
  entreprise: {
    id_entreprise: string;
    nom_entreprise: string;
    secteur: string;
    description: string;
    adresse: string;
    telephone: string;
    email: string;
    site_web: string;
    taille_entreprise: 'TPE' | 'PME' | 'ETI' | 'GE' | '';
    chiffre_affaires: number | '';
    effectif_total: number | '';
    ville_siege_social: string;
    pays_siege_social: string;
  };
  manager: {
    id_acteur: string;
    nom_prenom: string;
    email: string;
    role: string;
    manager_nom_prenom: string;
    manager_email: string;
    manager_mot_de_passe: string;
  };
  membres: Array<{
    id_acteur: string;
    nom_prenom: string;
    email: string;
    fonction: string;
    role: string;
  }>;
  evaluation: {
    id_evaluation: string;
    statut: string;
  };
  invitations: Array<{
    id_invite: string;
    nom_prenom: string;
    email: string;
    fonction: string;
    role: string;
    inviteLink: string;
    actorId: string;
  }>;
}

interface FinalResults {
  enterpriseId: string;
  managerActorId: string;
  teamMembers: Array<{
    id: string;
    nom_prenom: string;
    email: string;
    fonction: string;
    role: string;
  }>;
  evaluationLinks: EvaluationLink[];
  evaluation?: {
    id_evaluation: string;
    statut: string;
  };
}

const EnterpriseRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [finalResults, setFinalResults] = useState<FinalResults | null>(null);

  // États du formulaire
  const [formData, setFormData] = useState<EnterpriseRegistrationData>({
    nom_entreprise: '',
    secteur: '',
    description: '',
    adresse: '',
    telephone: '',
    email: '',
    site_web: '',
    taille_entreprise: '',
    chiffre_affaires: '',
    effectif_total: '',
    ville_siege_social: '',
    pays_siege_social: 'France',
    manager_nom_prenom: '',
    manager_email: '',
    manager_mot_de_passe: '',
    vision_transformation_numerique: ''
  });

  // États pour la motivation
  const [motivationData, setMotivationData] = useState<MotivationData>({
    vision_transformation_numerique: '',
    motivations: {
      cybersecurite: { motivation: '', but: '', objectif: '', mesure: '' },
      maturite_digitale: { motivation: '', but: '', objectif: '', mesure: '' },
      gouvernance_donnees: { motivation: '', but: '', objectif: '', mesure: '' },
      devsecops: { motivation: '', but: '', objectif: '', mesure: '' },
      innovation_numerique: { motivation: '', but: '', objectif: '', mesure: '' }
    }
  });

  const [currentFonction, setCurrentFonction] = useState(0);
  
  const fonctions = [
    { code: 'cybersecurite', label: 'Cybersécurité', icon: Security, color: '#d32f2f' },
    { code: 'maturite_digitale', label: 'Maturité Digitale', icon: Computer, color: '#1976d2' },
    { code: 'gouvernance_donnees', label: 'Gouvernance des Données', icon: Storage, color: '#388e3c' },
    { code: 'devsecops', label: 'DevSecOps', icon: Code, color: '#f57c00' },
    { code: 'innovation_numerique', label: 'Innovation Numérique', icon: Lightbulb, color: '#7b1fa2' }
  ];

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const steps = [
    { label: 'Informations entreprise', icon: Business, color: '#2196F3' },
    { label: 'Manager principal', icon: Person, color: '#4CAF50' },
    { label: 'Motivation stratégique', icon: TrendingUp, color: '#FF9800' },
    { label: 'Équipe d\'évaluation', icon: PersonAdd, color: '#9C27B0' },
    { label: 'Résumé', icon: CheckCircle, color: '#00BCD4' }
  ];

  const secteurs = [
    'Banque/Finance', 'Assurance', 'Industrie', 'Commerce/Distribution',
    'AgroPastoral', 'Santé', 'Éducation', 'Administration publique',
    'Transport/Logistique', 'Énergie/Utilities', 'Télécommunications',
    'Services et conseils', 'Autre'
  ];

  // Validation des données
  const validateStep = (step: number): boolean => {
    const errors: ValidationErrors = {};

    switch (step) {
      case 0: // Informations entreprise
        if (!formData.nom_entreprise) errors.nom_entreprise = 'Nom requis';
        if (!formData.secteur) errors.secteur = 'Secteur requis';
        if (!formData.email) errors.email = 'Email requis';
        if (!formData.taille_entreprise) errors.taille_entreprise = 'Taille requise';
        if (!formData.effectif_total) errors.effectif_total = 'Effectif requis';
        if (!formData.ville_siege_social) errors.ville_siege_social = 'Ville requise';
        
        // Validation cohérence effectif/taille
        const effectif = Number(formData.effectif_total);
        if (effectif && formData.taille_entreprise) {
          if ((formData.taille_entreprise === 'TPE' && effectif >= 10) ||
              (formData.taille_entreprise === 'PME' && (effectif < 10 || effectif >= 250)) ||
              (formData.taille_entreprise === 'ETI' && (effectif < 250 || effectif >= 5000)) ||
              (formData.taille_entreprise === 'GE' && effectif < 5000)) {
            errors.effectif_coherence = 'L\'effectif ne correspond pas à la taille d\'entreprise sélectionnée';
          }
        }
        break;

      case 1: // Manager
        if (!formData.manager_nom_prenom) errors.manager_nom_prenom = 'Nom requis';
        if (!formData.manager_email) errors.manager_email = 'Email requis';
        if (!formData.manager_mot_de_passe || formData.manager_mot_de_passe.length < 8) {
          errors.manager_mot_de_passe = 'Mot de passe requis (min 8 caractères)';
        }
        break;

      case 2: // Motivation
        if (!motivationData.vision_transformation_numerique) {
          errors.vision = 'Vision requise';
        }
        // Vérifier qu'au moins une motivation est remplie pour chaque fonction
        for (const fonction of fonctions) {
          const motivation = motivationData.motivations[fonction.code];
          if (!motivation.motivation && !motivation.but && !motivation.objectif && !motivation.mesure) {
            errors[fonction.code] = `Au moins un élément de motivation requis pour ${fonction.label}`;
          }
        }
        break;

      case 3: // Équipe
        // Pas de validation obligatoire pour l'équipe
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [field]: event.target.value });
    setValidationErrors({ ...validationErrors, [field]: '' });
  };

  const handleMotivationChange = (fonction: string, field: string, value: string) => {
    setMotivationData({
      ...motivationData,
      motivations: {
        ...motivationData.motivations,
        [fonction]: {
          ...motivationData.motivations[fonction],
          [field]: value
        }
      }
    });
  };

  const handleNext = async () => {
    if (!validateStep(activeStep)) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    setError('');
    
    try {
      if (activeStep === 0) {
        console.log('✅ Étape Entreprise validée');
      } else if (activeStep === 1) {
        console.log('✅ Étape Manager validée');
      } else if (activeStep === 2) {
        console.log('✅ Étape Motivation validée');
        // Transférer la vision vers formData
        setFormData({
          ...formData,
          vision_transformation_numerique: motivationData.vision_transformation_numerique
        });
      } else if (activeStep === 3) {
        console.log('👥 Création entreprise complète...');
        await createEnterprise();
      } else if (activeStep === 4) {
        console.log('👥 Étape Équipe terminée - Vérification...');
        await generateEvaluationLinks();
      }
      
      console.log(`➡️ Passage à l'étape ${activeStep + 1}`);
      setActiveStep(prev => prev + 1);
      setError('');
    } catch (error: any) {
      console.error(`❌ Erreur lors du passage étape ${activeStep}:`, error);
      setError(`Erreur à l'étape ${activeStep + 1}: ${error.message || 'Erreur inconnue'}`);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
    setError('');
  };

  const createEnterprise = async () => {
    setLoading(true);
    try {
      console.log('🏢 Création complète : entreprise + manager + membres + invitations...');
      
      const registrationData = {
        // Données entreprise
        nom_entreprise: formData.nom_entreprise,
        secteur: formData.secteur,
        description: formData.description,
        adresse: formData.adresse,
        telephone: formData.telephone,
        email: formData.email,
        site_web: formData.site_web,
        taille_entreprise: formData.taille_entreprise,
        chiffre_affaires: formData.chiffre_affaires,
        effectif_total: formData.effectif_total,
        ville_siege_social: formData.ville_siege_social,
        pays_siege_social: formData.pays_siege_social,
        
        // Données manager
        manager_nom_prenom: formData.manager_nom_prenom,
        manager_email: formData.manager_email,
        manager_mot_de_passe: formData.manager_mot_de_passe,
        
        // Données motivation
        vision_transformation_numerique: motivationData.vision_transformation_numerique,
        motivations: Object.entries(motivationData.motivations).map(([code_fonction, data]) => ({
          code_fonction,
          ...data
        })),
        
        // Données membres
        membres: teamMembers.map(member => ({
          nom_prenom: member.nom_prenom,
          email: member.email,
          fonction: member.fonction
        }))
      };

      console.log('📤 Envoi de TOUTES les données:', {
        entreprise: registrationData.nom_entreprise,
        manager: registrationData.manager_email,
        motivations: registrationData.motivations.length,
        membres: registrationData.membres.length
      });

      const response = await api.post('/entreprise-registration', registrationData);
      
      console.log('✅ Réponse COMPLÈTE de l\'API:', response);

      const { entreprise, manager, membres, evaluation, invitations } = response.data as ApiCompleteResponse;

      setFinalResults({
        enterpriseId: entreprise.id_entreprise,
        managerActorId: manager.id_acteur,
        teamMembers: membres || [],
        evaluationLinks: invitations?.map((inv: any) => ({
          acteurId: inv.actorId,
          nom_prenom: inv.nom_prenom,
          email: inv.email,
          fonction: inv.fonction,
          role: inv.role,
          evaluationLink: inv.inviteLink,
          isManager: inv.role === 'MANAGER',
          inviteId: inv.id_invite
        })) || [],
        evaluation
      });

      console.log('🎉 Entreprise créée avec succès avec tous les éléments');
    } catch (error: any) {
      console.error('❌ Erreur création entreprise complète:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const generateEvaluationLinks = async () => {
    if (!finalResults) {
      throw new Error('Résultats non disponibles');
    }

    try {
      console.log('🔍 Vérification des liens d\'évaluation...');
      
      const response = await api.get(`/evaluation-invite/check/${finalResults.enterpriseId}`);
      console.log('✅ Statut des invitations:', response.data);
      
      if (!response.data.allInvitationsReady) {
        throw new Error('Les invitations ne sont pas encore prêtes');
      }
      
      console.log('🎉 Vérification terminée - Tous les liens sont prêts !');
      
    } catch (error: any) {
      console.error('❌ Erreur vérification liens:', error);
      setError(`Erreur lors de la vérification des liens: ${error.message}`);
      throw error;
    }
  };

  const addTeamMember = () => {
    const newMember: TeamMember = {
      id: Date.now().toString(),
      nom_prenom: '',
      email: '',
      fonction: '',
      role: 'Evaluateur'
    };
    setTeamMembers([...teamMembers, newMember]);
  };

  const updateTeamMember = (id: string, field: keyof TeamMember, value: string) => {
    setTeamMembers(teamMembers.map(member =>
      member.id === id ? { ...member, [field]: value } : member
    ));
  };

  const removeTeamMember = (id: string) => {
    setTeamMembers(teamMembers.filter(member => member.id !== id));
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log('📋 Lien copié dans le presse-papier');
    } catch (err) {
      console.error('❌ Erreur copie:', err);
    }
  };

  // Rendu des étapes
  const renderStepContent = () => {
    switch (activeStep) {
      case 0: // Informations entreprise
        return (
          <Box sx={{ p: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Business sx={{ fontSize: 48, color: steps[0].color, mb: 2 }} />
              <Typography variant="h5" gutterBottom sx={{ color: steps[0].color, fontWeight: 700 }}>
                Informations de votre entreprise
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Renseignez toutes les informations de votre organisation
              </Typography>
            </Box>

            <Grid container spacing={4}>
              {validationErrors.effectif_coherence && (
                <Grid size={12}>
                  <Alert severity="warning" icon={<Warning />}>
                    {validationErrors.effectif_coherence}
                  </Alert>
                </Grid>
              )}

              <Grid size={12}>
                <Typography variant="h6" gutterBottom sx={{ color: steps[0].color, mb: 3 }}>
                  📋 Informations de base
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  required
                  fullWidth
                  label="Nom de l'entreprise"
                  value={formData.nom_entreprise}
                  onChange={handleChange('nom_entreprise')}
                  error={!!validationErrors.nom_entreprise}
                  helperText={validationErrors.nom_entreprise}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Business /></InputAdornment>
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required error={!!validationErrors.secteur}>
                  <InputLabel>Secteur d'activité</InputLabel>
                  <Select
                    value={formData.secteur}
                    onChange={(e) => setFormData({ ...formData, secteur: e.target.value })}
                    label="Secteur d'activité"
                  >
                    {secteurs.map((secteur) => (
                      <MenuItem key={secteur} value={secteur}>{secteur}</MenuItem>
                    ))}
                  </Select>
                  {validationErrors.secteur && (
                    <FormHelperText>{validationErrors.secteur}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              <Grid size={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description de l'entreprise"
                  value={formData.description}
                  onChange={handleChange('description')}
                  placeholder="Décrivez brièvement votre activité principale..."
                />
              </Grid>

              <Grid size={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom sx={{ color: steps[0].color, mb: 3, mt: 3 }}>
                  📍 Coordonnées
                </Typography>
              </Grid>

              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Adresse complète"
                  value={formData.adresse}
                  onChange={handleChange('adresse')}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><LocationOn /></InputAdornment>
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  required
                  fullWidth
                  label="Ville du siège social"
                  value={formData.ville_siege_social}
                  onChange={handleChange('ville_siege_social')}
                  error={!!validationErrors.ville_siege_social}
                  helperText={validationErrors.ville_siege_social}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Pays"
                  value={formData.pays_siege_social}
                  onChange={handleChange('pays_siege_social')}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Téléphone"
                  value={formData.telephone}
                  onChange={handleChange('telephone')}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Phone /></InputAdornment>
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  required
                  fullWidth
                  type="email"
                  label="Email de l'entreprise"
                  value={formData.email}
                  onChange={handleChange('email')}
                  error={!!validationErrors.email}
                  helperText={validationErrors.email}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Email /></InputAdornment>
                  }}
                />
              </Grid>

              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Site web"
                  value={formData.site_web}
                  onChange={handleChange('site_web')}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Language /></InputAdornment>
                  }}
                />
              </Grid>

              <Grid size={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom sx={{ color: steps[0].color, mb: 3, mt: 3 }}>
                  📊 Taille et activité
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth required error={!!validationErrors.taille_entreprise}>
                  <InputLabel>Taille de l'entreprise</InputLabel>
                  <Select
                    value={formData.taille_entreprise}
                    onChange={(e) => setFormData({ ...formData, taille_entreprise: e.target.value as any })}
                    label="Taille de l'entreprise"
                  >
                    <MenuItem value="TPE">TPE (Moins de 10 salariés)</MenuItem>
                    <MenuItem value="PME">PME (10 à 249 salariés)</MenuItem>
                    <MenuItem value="ETI">ETI (250 à 4999 salariés)</MenuItem>
                    <MenuItem value="GE">GE (5000 salariés et plus)</MenuItem>
                  </Select>
                  {validationErrors.taille_entreprise && (
                    <FormHelperText>{validationErrors.taille_entreprise}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  required
                  fullWidth
                  type="number"
                  label="Effectif total"
                  value={formData.effectif_total}
                  onChange={handleChange('effectif_total')}
                  error={!!validationErrors.effectif_total}
                  helperText={validationErrors.effectif_total}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><People /></InputAdornment>
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Chiffre d'affaires (€)"
                  value={formData.chiffre_affaires}
                  onChange={handleChange('chiffre_affaires')}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">€</InputAdornment>
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 1: // Manager
        return (
          <Box sx={{ p: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Person sx={{ fontSize: 48, color: steps[1].color, mb: 2 }} />
              <Typography variant="h5" gutterBottom sx={{ color: steps[1].color, fontWeight: 700 }}>
                Manager principal
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Désignez le responsable de l'évaluation de maturité
              </Typography>
            </Box>

            <Card sx={{ p: 3, borderLeft: `4px solid ${steps[1].color}` }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: steps[1].color, mb: 3 }}>
                  👤 Informations du manager
                </Typography>

                <Grid container spacing={3}>
                  <Grid size={12}>
                    <TextField
                      required
                      fullWidth
                      label="Nom et prénom"
                      value={formData.manager_nom_prenom}
                      onChange={handleChange('manager_nom_prenom')}
                      error={!!validationErrors.manager_nom_prenom}
                      helperText={validationErrors.manager_nom_prenom}
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><Person /></InputAdornment>
                      }}
                    />
                  </Grid>

                  <Grid size={12}>
                    <TextField
                      required
                      fullWidth
                      type="email"
                      label="Email professionnel"
                      value={formData.manager_email}
                      onChange={handleChange('manager_email')}
                      error={!!validationErrors.manager_email}
                      helperText={validationErrors.manager_email || 'Cet email sera utilisé pour la connexion'}
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><Email /></InputAdornment>
                      }}
                    />
                  </Grid>

                  <Grid size={12}>
                    <TextField
                      required
                      fullWidth
                      type={showPassword ? 'text' : 'password'}
                      label="Mot de passe"
                      value={formData.manager_mot_de_passe}
                      onChange={handleChange('manager_mot_de_passe')}
                      error={!!validationErrors.manager_mot_de_passe}
                      helperText={validationErrors.manager_mot_de_passe || 'Minimum 8 caractères'}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>
                </Grid>

                <Alert severity="info" sx={{ mt: 3 }}>
                  <Typography variant="body2">
                    Le manager aura accès à :
                  </Typography>
                  <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                    <li>La gestion complète de l'évaluation</li>
                    <li>L'invitation des membres de l'équipe</li>
                    <li>La visualisation des résultats consolidés</li>
                    <li>L'export des rapports de maturité</li>
                  </ul>
                </Alert>
              </CardContent>
            </Card>
          </Box>
        );

      case 2: // Motivation
        return (
          <Box sx={{ p: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <TrendingUp sx={{ fontSize: 48, color: steps[2].color, mb: 2 }} />
              <Typography variant="h5" gutterBottom sx={{ color: steps[2].color, fontWeight: 700 }}>
                Motivation de la stratégie
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Définissez votre vision et vos objectifs par fonction
              </Typography>
            </Box>

            {/* Vision globale */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ color: steps[2].color, mb: 2 }}>
                📊 Vision à long terme
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Vision de la transformation numérique"
                value={motivationData.vision_transformation_numerique}
                onChange={(e) => setMotivationData({
                  ...motivationData,
                  vision_transformation_numerique: e.target.value
                })}
                placeholder="Décrivez votre vision stratégique pour la transformation numérique de votre entreprise..."
                helperText="Cette vision guidera l'ensemble de votre stratégie de transformation"
                error={!!validationErrors.vision}
              />
            </Box>

            {/* Motivations par fonction avec pagination */}
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                🎯 Motivations par fonction
              </Typography>
              
              {/* Indicateur de progression */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                {fonctions.map((_, index) => (
                  <Box
                    key={index}
                    sx={{
                      width: 40,
                      height: 4,
                      backgroundColor: index === currentFonction ? steps[2].color : 'grey.300',
                      mx: 0.5,
                      borderRadius: 2,
                      transition: 'all 0.3s',
                      cursor: 'pointer'
                    }}
                    onClick={() => setCurrentFonction(index)}
                  />
                ))}
              </Box>

              {/* Fonction courante */}
              <Card sx={{ mb: 3, borderLeft: `4px solid ${fonctions[currentFonction].color}` }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    {React.createElement(fonctions[currentFonction].icon, { 
                      sx: { color: fonctions[currentFonction].color, mr: 2 } 
                    })}
                    <Typography variant="h6" sx={{ color: fonctions[currentFonction].color }}>
                      {fonctions[currentFonction].label}
                    </Typography>
                  </Box>

                  <Grid container spacing={3}>
                    <Grid size={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="Motivation"
                        value={motivationData.motivations[fonctions[currentFonction].code].motivation}
                        onChange={(e) => handleMotivationChange(fonctions[currentFonction].code, 'motivation', e.target.value)}
                        placeholder="Pourquoi cette fonction est-elle importante pour votre entreprise ?"
                      />
                    </Grid>
                    <Grid size={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="But"
                        value={motivationData.motivations[fonctions[currentFonction].code].but}
                        onChange={(e) => handleMotivationChange(fonctions[currentFonction].code, 'but', e.target.value)}
                        placeholder="Quel est le but principal visé ?"
                      />
                    </Grid>
                    <Grid size={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="Objectif"
                        value={motivationData.motivations[fonctions[currentFonction].code].objectif}
                        onChange={(e) => handleMotivationChange(fonctions[currentFonction].code, 'objectif', e.target.value)}
                        placeholder="Quel objectif mesurable souhaitez-vous atteindre ?"
                      />
                    </Grid>
                    <Grid size={12}>
                      <TextField
                        fullWidth
                        label="Mesure"
                        value={motivationData.motivations[fonctions[currentFonction].code].mesure}
                        onChange={(e) => handleMotivationChange(fonctions[currentFonction].code, 'mesure', e.target.value)}
                        placeholder="Comment mesurerez-vous le succès ? (KPI, indicateur...)"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Navigation entre fonctions */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button
                  variant="outlined"
                  startIcon={<ArrowBack />}
                  onClick={() => setCurrentFonction(Math.max(0, currentFonction - 1))}
                  disabled={currentFonction === 0}
                >
                  Fonction précédente
                </Button>
                <Button
                  variant="outlined"
                  endIcon={<ArrowForward />}
                  onClick={() => setCurrentFonction(Math.min(fonctions.length - 1, currentFonction + 1))}
                  disabled={currentFonction === fonctions.length - 1}
                >
                  Fonction suivante
                </Button>
              </Box>
            </Box>
          </Box>
        );

      case 3: // Équipe
        return (
          <Box sx={{ p: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <PersonAdd sx={{ fontSize: 48, color: steps[3].color, mb: 2 }} />
              <Typography variant="h5" gutterBottom sx={{ color: steps[3].color, fontWeight: 700 }}>
                Équipe d'évaluation
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ajoutez les membres qui participeront à l'évaluation (optionnel)
              </Typography>
            </Box>

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Vous pouvez ajouter des membres maintenant ou plus tard depuis votre tableau de bord.
                Chaque membre recevra un lien personnalisé pour participer à l'évaluation.
              </Typography>
            </Alert>

            {teamMembers.map((member, index) => (
              <Card key={member.id} sx={{ mb: 2, borderLeft: `4px solid ${steps[3].color}` }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ color: steps[3].color }}>
                      Membre {index + 1}
                    </Typography>
                    <IconButton onClick={() => removeTeamMember(member.id)} color="error" size="small">
                      <Delete />
                    </IconButton>
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Nom et prénom"
                        value={member.nom_prenom}
                        onChange={(e) => updateTeamMember(member.id, 'nom_prenom', e.target.value)}
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        type="email"
                        label="Email"
                        value={member.email}
                        onChange={(e) => updateTeamMember(member.id, 'email', e.target.value)}
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Fonction"
                        value={member.fonction}
                        onChange={(e) => updateTeamMember(member.id, 'fonction', e.target.value)}
                        size="small"
                        placeholder="Ex: Responsable IT, DSI..."
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Rôle</InputLabel>
                        <Select
                          value={member.role}
                          onChange={(e) => updateTeamMember(member.id, 'role', e.target.value)}
                          label="Rôle"
                        >
                          <MenuItem value="Evaluateur">Évaluateur (participe à l'évaluation)</MenuItem>
                          <MenuItem value="Observateur">Observateur (consultation uniquement)</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}

            <Button
              fullWidth
              variant="outlined"
              onClick={addTeamMember}
              startIcon={<Add />}
              sx={{ mt: 2, borderStyle: 'dashed' }}
            >
              Ajouter un membre
            </Button>

            {teamMembers.length === 0 && (
              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  Aucun membre ajouté. Vous pourrez inviter des membres plus tard depuis votre tableau de bord.
                </Typography>
              </Alert>
            )}
          </Box>
        );

      case 4: // Résumé
        return (
          <Box sx={{ p: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h4" gutterBottom sx={{ color: 'success.main', fontWeight: 700 }}>
                Inscription réussie !
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Votre entreprise a été créée avec succès
              </Typography>
            </Box>

            {finalResults && (
              <>
                <Card sx={{ mb: 3, borderLeft: '4px solid #2196F3' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ color: '#2196F3' }}>
                      📊 Récapitulatif
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Grid container spacing={2}>
                      <Grid size={6}>
                        <Typography variant="body2" color="text.secondary">Entreprise</Typography>
                        <Typography variant="body1" fontWeight="bold">{formData.nom_entreprise}</Typography>
                      </Grid>
                      <Grid size={6}>
                        <Typography variant="body2" color="text.secondary">Secteur</Typography>
                        <Typography variant="body1">{formData.secteur}</Typography>
                      </Grid>
                      <Grid size={6}>
                        <Typography variant="body2" color="text.secondary">Manager</Typography>
                        <Typography variant="body1">{formData.manager_nom_prenom}</Typography>
                      </Grid>
                      <Grid size={6}>
                        <Typography variant="body2" color="text.secondary">Email manager</Typography>
                        <Typography variant="body1">{formData.manager_email}</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {finalResults.evaluationLinks.length > 0 && (
                  <Card sx={{ mb: 3, borderLeft: '4px solid #4CAF50' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ color: '#4CAF50' }}>
                        🔗 Liens d'évaluation
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Partagez ces liens avec les membres de votre équipe
                      </Typography>
                      
                      <List>
                        {finalResults.evaluationLinks.map((link) => (
                          <ListItem
                            key={link.inviteId}
                            sx={{
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 1,
                              mb: 1
                            }}
                          >
                            <ListItemIcon>
                              {link.isManager ? <Person color="primary" /> : <PersonAdd />}
                            </ListItemIcon>
                            <ListItemText
                              primary={link.nom_prenom}
                              secondary={
                                <>
                                  <Typography variant="caption" display="block">
                                    {link.email} • {link.fonction || 'Non spécifié'}
                                  </Typography>
                                  <Typography variant="caption" color="primary">
                                    {link.evaluationLink}
                                  </Typography>
                                </>
                              }
                            />
                            <ListItemSecondaryAction>
                              <Tooltip title="Copier le lien">
                                <IconButton onClick={() => copyToClipboard(link.evaluationLink)}>
                                  <Share />
                                </IconButton>
                              </Tooltip>
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                )}

                <Alert severity="success" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    Un email de confirmation a été envoyé au manager avec les instructions de connexion.
                  </Typography>
                </Alert>

                <Box sx={{ textAlign: 'center', mt: 4 }}>
                  <Typography variant="h6" gutterBottom>
                    Prochaines étapes
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    1. Connectez-vous avec l'email et le mot de passe du manager<br />
                    2. Commencez l'évaluation de maturité<br />
                    3. Invitez d'autres membres si nécessaire<br />
                    4. Consultez vos résultats et recommandations
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ overflow: 'hidden' }}>
        <Box sx={{ p: 3, backgroundColor: 'primary.main', color: 'white' }}>
          <Typography variant="h4" align="center" fontWeight="bold">
            Inscription Entreprise
          </Typography>
          <Typography variant="body1" align="center" sx={{ mt: 1, opacity: 0.9 }}>
            Créez votre compte pour évaluer la maturité numérique de votre organisation
          </Typography>
        </Box>

        <Box sx={{ p: 3 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel
                  StepIconComponent={() => (
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: activeStep >= index ? step.color : 'grey.300',
                        color: 'white',
                        transition: 'all 0.3s'
                      }}
                    >
                      {React.createElement(step.icon, { fontSize: 'small' })}
                    </Box>
                  )}
                >
                  <Typography variant="caption" sx={{ 
                    color: activeStep >= index ? 'text.primary' : 'text.secondary',
                    fontWeight: activeStep === index ? 600 : 400
                  }}>
                    {step.label}
                  </Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        <Divider />

        <Box sx={{ minHeight: 400 }}>
          {error && (
            <Alert severity="error" onClose={() => setError('')} sx={{ m: 2 }}>
              {error}
            </Alert>
          )}
          
          {loading && (
            <Box sx={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              zIndex: 1000
            }}>
              <CircularProgress size={60} />
              <Typography variant="h6" sx={{ mt: 3 }}>
                {activeStep === 1 ? 'Création de votre entreprise...' :
                 activeStep === 2 ? 'Enregistrement des motivations...' :
                 activeStep === 3 ? 'Génération des liens d\'évaluation...' :
                 'Traitement en cours...'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Veuillez patienter, cette opération peut prendre quelques secondes
              </Typography>
            </Box>
          )}
          
          {renderStepContent()}
        </Box>

        <Box sx={{
          p: 3,
          backgroundColor: 'grey.50',
          display: 'flex',
          justifyContent: 'space-between',
          borderTop: '1px solid',
          borderColor: 'grey.200'
        }}>
          <Button
            onClick={handleBack}
            disabled={activeStep === 0 || loading}
            startIcon={<ArrowBack />}
            variant="outlined"
            size="large"
          >
            Précédent
          </Button>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/auth/login')}
              disabled={loading}
              size="large"
            >
              Annuler
            </Button>
            
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={() => {
                  setSuccess(true);
                  setTimeout(() => {
                    navigate('/auth/login');
                  }, 2000);
                }}
                size="large"
                sx={{
                  minWidth: 160,
                  background: `linear-gradient(135deg, ${steps[4].color} 0%, ${steps[4].color}CC 100%)`,
                }}
              >
                Aller à la connexion
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                endIcon={<ArrowForward />}
                disabled={loading}
                size="large"
                sx={{
                  backgroundColor: steps[activeStep].color,
                  '&:hover': { 
                    backgroundColor: steps[activeStep].color, 
                    filter: 'brightness(0.9)' 
                  }
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Suivant'}
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default EnterpriseRegistration;