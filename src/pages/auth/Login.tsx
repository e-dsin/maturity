// src/pages/auth/Login.tsx - Version corrigée pour éviter les boucles
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Paper,
  Container
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

interface LocationState {
  from?: {
    pathname: string;
  };
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error, isLoading, isAuthenticated } = useAuth();
  
  const [formData, setFormData] = useState({
    email: 'intervenant@qwanza.fr', // Pré-remplir avec l'admin
    password: 'Intervenant@01', // Mot de passe par défaut
    rememberMe: false
  });
  
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Corriger la redirection par défaut vers '/' au lieu de '/dashboard'
  const from = (location.state as LocationState)?.from?.pathname || '/';

  // Rediriger si déjà authentifié - OPTIMISÉ pour éviter les boucles
  useEffect(() => {
    // Attendre que le loading soit terminé avant de rediriger
    if (isAuthenticated && !isLoading) {
      console.log('✅ Utilisateur déjà authentifié, redirection vers:', from);
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, from]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'rememberMe' ? checked : value
    }));
    
    // Clear errors when user starts typing
    if (localError) setLocalError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);

    if (!formData.email || !formData.password) {
      setLocalError('Veuillez remplir tous les champs');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('🔄 Tentative de connexion avec:', formData.email);
      await login(formData.email, formData.password);
      
      // La redirection se fera automatiquement via useEffect
      console.log('✅ Connexion réussie');
      
    } catch (err: any) {
      console.error('❌ Erreur de connexion:', err);
      setLocalError(err.message || 'Erreur de connexion. Vérifiez vos identifiants.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Affichage de chargement global
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
            Vérification de l'authentification...
          </Typography>
        </Box>
      </Container>
    );
  }

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
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* En-tête amélioré */}
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
            <Typography variant="body2" color="text.secondary" align="center" paragraph>
              Plateforme d'Évaluation de Maturité - Accédez à votre espace
            </Typography>
            
            {/* Affichage des erreurs */}
            {(error || localError) && (
              <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                {error || localError}
              </Alert>
            )}
            
            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Adresse email"
                name="email"
                type="email"
                autoComplete="email"
                autoFocus
                value={formData.email}
                onChange={handleChange}
                disabled={isSubmitting || isLoading}
              />
              
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Mot de passe"
                type="password"
                id="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                disabled={isSubmitting || isLoading}
              />
              
              <FormControlLabel
                control={
                  <Checkbox
                    value="remember"
                    color="primary"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    disabled={isSubmitting || isLoading}
                  />
                }
                label="Se souvenir de moi"
              />
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2, py: 1.5 }}
                disabled={isSubmitting || isLoading}
                startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
              >
                {isSubmitting ? 'Connexion en cours...' : 'Se connecter'}
              </Button>
              
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Link to="/auth/register" style={{ textDecoration: 'none' }}>
                  <Typography variant="body2" color="primary">
                    Pas encore de compte ? S'inscrire
                  </Typography>
                </Link>
              </Box>
            </Box>
          </Box>
        </Paper>
        
        {/* Aide pour les développeurs - Mise à jour */}
        {process.env.NODE_ENV === 'development' && (
          <Paper elevation={1} sx={{ mt: 2, p: 2, bgcolor: 'info.light', width: '100%' }}>
            <Typography variant="caption" color="info.contrastText">
              <strong>🧪 Mode Développement</strong><br />
              <strong>Email:</strong> admin@qwanza.fr<br />
              <strong>Mot de passe:</strong> ********<br />
              <strong>Rôle:</strong> Administrateur (accès total)<br />
              <em>Ces identifiants sont pré-remplis pour faciliter les tests</em>
            </Typography>
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default Login;