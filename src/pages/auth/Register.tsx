// src/pages/auth/Register.tsx - Version Material-UI avec Grid classique
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Container,
  Grid,
  SelectChangeEvent
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

interface RegisterForm {
  nom_prenom: string;
  email: string;
  password: string;
  confirmPassword: string;
  id_role: string;
  organisation: string;
  id_entreprise: string;
}

interface Role {
  id_role: string;
  nom_role: string;
  description: string;
}

interface Entreprise {
  id_entreprise: string;
  nom_entreprise: string;
  secteur?: string;
}

const Register: React.FC = () => {
  const [formData, setFormData] = useState<RegisterForm>({
    nom_prenom: '',
    email: '',
    password: '',
    confirmPassword: '',
    id_role: '',
    organisation: '',
    id_entreprise: ''
  });
  
  const [roles, setRoles] = useState<Role[]>([]);
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Rediriger si déjà authentifié
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Charger les données initiales
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        // Charger les rôles
        const rolesResponse = await api.get('auth/roles');
        setRoles(rolesResponse || []);

        // Charger les entreprises
        const entreprisesResponse = await api.get('entreprises');
        const entreprisesData = entreprisesResponse.map((ent: any) => ({
          id_entreprise: ent.id_entreprise,
          nom_entreprise: ent.nom_entreprise,
          secteur: ent.secteur
        }));
        setEntreprises(entreprisesData);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        setErrors({ general: 'Erreur lors du chargement des données' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);
  
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear specific field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  const handleSelectChange = (event: SelectChangeEvent) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name as string]: value }));
    
    // Clear specific field error when user makes selection
    if (errors[name as string]) {
      setErrors(prev => ({ ...prev, [name as string]: '' }));
    }
  };
  
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    let isValid = true;
    
    // Validation du nom
    if (!formData.nom_prenom.trim()) {
      newErrors.nom_prenom = 'Le nom et prénom sont requis';
      isValid = false;
    }
    
    // Validation de l'email
    if (!formData.email) {
      newErrors.email = 'L\'email est requis';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'L\'email n\'est pas valide';
      isValid = false;
    }
    
    // Validation du mot de passe
    if (!formData.password) {
      newErrors.password = 'Le mot de passe est requis';
      isValid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
      isValid = false;
    }
    
    // Validation de la confirmation du mot de passe
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
      isValid = false;
    }
    
    // Validation du rôle
    if (!formData.id_role) {
      newErrors.id_role = 'Le rôle est requis';
      isValid = false;
    }
    
    // Validation de l'organisation
    if (!formData.organisation.trim()) {
      newErrors.organisation = 'L\'organisation est requise';
      isValid = false;
    }

    // Validation de l'entreprise
    if (!formData.id_entreprise) {
      newErrors.id_entreprise = 'L\'entreprise est requise';
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };
  
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setErrors({});
    
    try {
      const userData = {
        nom_prenom: formData.nom_prenom,
        email: formData.email,
        password: formData.password,
        id_role: formData.id_role,
        organisation: formData.organisation,
        id_entreprise: formData.id_entreprise
      };
      
      await register(userData);
      navigate('/');
    } catch (error: any) {
      setErrors({
        general: error.message || 'Une erreur est survenue lors de l\'inscription'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Container component="main" maxWidth="xs">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <CircularProgress />
          <Typography variant="body1" sx={{ mt: 2 }}>
            Chargement des données...
          </Typography>
        </Box>
      </Container>
    );
  }
  
  return (
    <Container component="main" maxWidth="md">
      <Box
        sx={{
          marginTop: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* En-tête */}
            <Typography 
              component="h1" 
              variant="h4" 
              gutterBottom
              sx={{ 
                color: 'primary.main',
                fontWeight: 'bold'
              }}
            >
              eQwanza
            </Typography>
            <Typography variant="h5" component="h2" gutterBottom>
              Inscription
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" paragraph>
              Créez votre compte pour accéder à la plateforme d'évaluation de maturité
            </Typography>
            
            {/* Affichage des erreurs */}
            {errors.general && (
              <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                {errors.general}
              </Alert>
            )}
            
            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 2, width: '100%' }}>
              <Grid container spacing={2}>
                {/* Informations personnelles */}
                <Grid item xs={12}>
                  <Typography variant="h6" color="primary" gutterBottom>
                    Informations personnelles
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    id="nom_prenom"
                    label="Nom et prénom"
                    name="nom_prenom"
                    autoComplete="name"
                    value={formData.nom_prenom}
                    onChange={handleChange}
                    error={!!errors.nom_prenom}
                    helperText={errors.nom_prenom}
                    disabled={isSubmitting}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    id="email"
                    label="Adresse email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    error={!!errors.email}
                    helperText={errors.email}
                    disabled={isSubmitting}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    name="password"
                    label="Mot de passe"
                    type="password"
                    id="password"
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={handleChange}
                    error={!!errors.password}
                    helperText={errors.password || "Minimum 6 caractères"}
                    disabled={isSubmitting}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    name="confirmPassword"
                    label="Confirmer le mot de passe"
                    type="password"
                    id="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword}
                    disabled={isSubmitting}
                  />
                </Grid>

                {/* Informations professionnelles */}
                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Typography variant="h6" color="primary" gutterBottom>
                    Informations professionnelles
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth error={!!errors.id_role} disabled={isSubmitting}>
                    <InputLabel id="role-label">Rôle *</InputLabel>
                    <Select
                      labelId="role-label"
                      id="id_role"
                      name="id_role"
                      value={formData.id_role}
                      label="Rôle *"
                      onChange={handleSelectChange}
                    >
                      {roles.map((role) => (
                        <MenuItem key={role.id_role} value={role.id_role}>
                          {role.nom_role}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.id_role && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                        {errors.id_role}
                      </Typography>
                    )}
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    id="organisation"
                    label="Organisation/Département"
                    name="organisation"
                    placeholder="ex: IT, RH, Finance, Marketing..."
                    value={formData.organisation}
                    onChange={handleChange}
                    error={!!errors.organisation}
                    helperText={errors.organisation || "Votre département ou service"}
                    disabled={isSubmitting}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControl fullWidth error={!!errors.id_entreprise} disabled={isSubmitting}>
                    <InputLabel id="entreprise-label">Entreprise *</InputLabel>
                    <Select
                      labelId="entreprise-label"
                      id="id_entreprise"
                      name="id_entreprise"
                      value={formData.id_entreprise}
                      label="Entreprise *"
                      onChange={handleSelectChange}
                    >
                      {entreprises.map((entreprise) => (
                        <MenuItem key={entreprise.id_entreprise} value={entreprise.id_entreprise}>
                          {entreprise.nom_entreprise}
                          {entreprise.secteur && (
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                              ({entreprise.secteur})
                            </Typography>
                          )}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.id_entreprise && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                        {errors.id_entreprise}
                      </Typography>
                    )}
                  </FormControl>
                </Grid>
              </Grid>
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2, py: 1.5 }}
                disabled={isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
              >
                {isSubmitting ? 'Inscription en cours...' : 'S\'inscrire'}
              </Button>
              
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Link to="/auth/login" style={{ textDecoration: 'none' }}>
                  <Typography variant="body2" color="primary">
                    Vous avez déjà un compte ? Se connecter
                  </Typography>
                </Link>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Aide pour les développeurs */}
        {process.env.NODE_ENV === 'development' && (
          <Paper elevation={1} sx={{ mt: 2, p: 2, bgcolor: 'info.light', width: '100%' }}>
            <Typography variant="caption" color="info.contrastText">
              <strong>🧪 Mode Développement</strong><br />
              <strong>Rôles disponibles:</strong> {roles.map(r => r.nom_role).join(', ')}<br />
              <strong>Entreprises:</strong> {entreprises.map(e => e.nom_entreprise).join(', ')}<br />
              <em>Sélectionnez vos informations et créez votre compte</em>
            </Typography>
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default Register;