// src/pages/auth/ForgotPassword.tsx - Version Material-UI
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Container
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Email as EmailIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { forgotPassword, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Rediriger si déjà authentifié
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);
  
  const validateEmail = (email: string) => {
    return /\S+@\S+\.\S+/.test(email);
  };
  
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Validation de l'email
    if (!email.trim()) {
      setError('L\'email est requis');
      return;
    }
    
    if (!validateEmail(email)) {
      setError('L\'email n\'est pas valide');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      await forgotPassword(email);
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de l\'envoi du mail');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
    // Clear error when user starts typing
    if (error) setError('');
  };
  
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
            
            {!isSubmitted ? (
              <>
                {/* Formulaire de récupération */}
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <EmailIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
                  <Typography variant="h5" component="h2" gutterBottom>
                    Mot de passe oublié
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe
                  </Typography>
                </Box>
                
                {error && (
                  <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                    {error}
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
                    value={email}
                    onChange={handleChange}
                    error={!!error}
                    disabled={isLoading}
                    placeholder="votre.email@exemple.com"
                  />
                  
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    sx={{ mt: 3, mb: 2, py: 1.5 }}
                    disabled={isLoading || !email.trim()}
                    startIcon={isLoading ? <CircularProgress size={20} /> : <EmailIcon />}
                  >
                    {isLoading ? 'Envoi en cours...' : 'Envoyer les instructions'}
                  </Button>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <Link to="/auth/login" style={{ textDecoration: 'none' }}>
                      <Button
                        variant="text"
                        startIcon={<ArrowBackIcon />}
                        color="primary"
                      >
                        Retour à la connexion
                      </Button>
                    </Link>
                  </Box>
                </Box>
              </>
            ) : (
              <>
                {/* Message de confirmation */}
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <CheckCircleIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
                  <Typography variant="h5" component="h2" color="success.main" gutterBottom>
                    Instructions envoyées !
                  </Typography>
                </Box>
                
                <Alert severity="success" sx={{ width: '100%', mb: 3 }}>
                  <Typography variant="body1">
                    Si l'adresse <strong>{email}</strong> est associée à un compte, vous recevrez un email contenant les instructions pour réinitialiser votre mot de passe.
                  </Typography>
                </Alert>
                
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Vous n'avez pas reçu l'email ? Vérifiez votre dossier spam ou tentez de renvoyer les instructions.
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setIsSubmitted(false);
                        setEmail('');
                        setError('');
                      }}
                      startIcon={<EmailIcon />}
                    >
                      Renvoyer les instructions
                    </Button>
                    
                    <Link to="/auth/login" style={{ textDecoration: 'none' }}>
                      <Button
                        variant="text"
                        startIcon={<ArrowBackIcon />}
                        color="primary"
                        fullWidth
                      >
                        Retour à la connexion
                      </Button>
                    </Link>
                  </Box>
                </Box>
              </>
            )}
          </Box>
        </Paper>

        {/* Aide pour les développeurs */}
        {process.env.NODE_ENV === 'development' && !isSubmitted && (
          <Paper elevation={1} sx={{ mt: 2, p: 2, bgcolor: 'warning.light', width: '100%' }}>
            <Typography variant="caption" color="warning.contrastText">
              <strong>🧪 Mode Développement</strong><br />
              <strong>Note:</strong> La fonctionnalité de récupération de mot de passe doit être implémentée côté serveur.<br />
              <em>Actuellement, cette page simule l'envoi d'un email de récupération.</em>
            </Typography>
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default ForgotPassword;