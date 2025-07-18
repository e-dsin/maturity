// src/pages/auth/Login.tsx - AVEC REDIRECTION AUTOMATIQUE VERS EVALUATION

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  Container
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  Business as BusinessIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';

import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

interface LoginForm {
  email: string;
  password: string;
}

interface EvaluationStatus {
  hasEvaluation: boolean;
  status: string;
  message: string;
  redirectTo: string;
  invitation?: {
    token: string;
    id_invite: string;
    statut_invitation: string;
  };
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  // États du formulaire
  const [form, setForm] = useState<LoginForm>({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [redirectInfo, setRedirectInfo] = useState<{
    show: boolean;
    message: string;
  }>({ show: false, message: '' });

  const from = location.state?.from?.pathname || '/';

  /**
   * Validation du formulaire
   */
  const isFormValid = (): boolean => {
    return form.email.trim() !== '' && form.password.trim() !== '';
  };

  /**
   * ✅ NOUVELLE FONCTION : Vérifier le statut d'évaluation de l'utilisateur
   */
  const checkEvaluationStatus = async (userId: string): Promise<EvaluationStatus | null> => {
    try {
      console.log('🔍 Vérification statut évaluation pour utilisateur:', userId);
      
      const response = await api.get(`/evaluation-status/check/${userId}`);
      const evaluationStatus: EvaluationStatus = response.data;
      
      console.log('📋 Statut évaluation:', evaluationStatus);
      
      return evaluationStatus;
    } catch (error: any) {
      console.warn('⚠️ Erreur vérification évaluation (non bloquant):', error);
      // Si l'API échoue, ne pas bloquer la connexion
      return null;
    }
  };

  /**
   * ✅ FONCTION MISE À JOUR : Déterminer la redirection avec priorité évaluation
   */
  const determineRedirectPath = async (user: any): Promise<string> => {
    console.log('🎯 Détermination redirection pour:', user.nom_prenom);

    // ✅ PRIORITÉ 1 : Vérifier le statut d'évaluation
    const evaluationStatus = await checkEvaluationStatus(user.id_acteur);
    
    if (evaluationStatus?.hasEvaluation) {
      console.log('🎯 Évaluation détectée:', evaluationStatus.status);
      
      switch (evaluationStatus.status) {
        case 'PENDING_ACCEPTANCE':
          console.log('📧 Invitation en attente → EvaluationInvite');
          return evaluationStatus.redirectTo; // /evaluation-invite/{token}
          
        case 'IN_PROGRESS':
          console.log('⏳ Évaluation en cours → MaturityEvaluation');
          return evaluationStatus.redirectTo; // /maturity-evaluation
          
        case 'READY_TO_START':
          console.log('🚀 Prêt à commencer → MaturityEvaluation');
          return evaluationStatus.redirectTo; // /maturity-evaluation
          
        case 'COMPLETED':
          console.log('✅ Évaluation terminée → Résultats');
          return evaluationStatus.redirectTo; // /dashboard/results
          
        default:
          console.log('❓ Statut évaluation inconnu:', evaluationStatus.status);
      }
    }

    // ✅ PRIORITÉ 2 : Redirection selon le rôle (logique existante)
    const role = user.nom_role?.toUpperCase();
    console.log('🎯 Redirection selon le rôle:', role);

    switch (role) {
      case 'MANAGER':
        console.log('📊 Manager → Analyses entreprise');
        if (user.id_entreprise) {
          return `/analyses-interpretations-entreprises?id_entreprise=${user.id_entreprise}`;
        } else {
          return '/dashboard?error=no_enterprise';
        }
        
      case 'CONSULTANT':
      case 'ADMINISTRATEUR':
      case 'SUPER-ADMINISTRATEUR':
        console.log('👨‍💼 Admin/Consultant → Dashboard');
        return '/dashboard';
        
      case 'INTERVENANT':
        console.log('👷 Intervenant → Formulaires');
        return '/forms';
        
      default:
        console.log('🏠 Redirection par défaut → Dashboard');
        return '/dashboard';
    }
  };

  /**
   * Redirection si déjà authentifié
   */
  useEffect(() => {
    if (isAuthenticated) {
      console.log('👤 Utilisateur déjà connecté, redirection...');
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  /**
   * Affichage du message de redirection
   */
  const showRedirectMessage = (message: string) => {
    setRedirectInfo({ show: true, message });
    setTimeout(() => {
      setRedirectInfo({ show: false, message: '' });
    }, 3000);
  };

  /**
   * ✅ FONCTION MISE À JOUR : Gestion de la soumission avec vérification évaluation
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    try {
      setLoading(true);
      setError('');

      console.log('🔐 Tentative de connexion pour:', form.email);

      // 1. Connexion
      const result = await login(form.email, form.password);
      
      if (result && result.user) {
        console.log('✅ Connexion réussie');
        
        // 2. ✅ NOUVEAU : Déterminer la redirection avec vérification évaluation
        const redirectPath = await determineRedirectPath(result.user);
        
        // 3. Afficher le message approprié
        let redirectMessage = '';
        
        if (redirectPath.includes('/evaluation-invite/')) {
          redirectMessage = '📧 Redirection vers votre invitation d\'évaluation...';
        } else if (redirectPath.includes('/maturity-evaluation')) {
          redirectMessage = '📋 Redirection vers votre évaluation...';
        } else if (redirectPath.includes('/analyses-interpretations-entreprises')) {
          redirectMessage = '📊 Redirection vers vos analyses d\'entreprise...';
        } else if (redirectPath === '/forms') {
          redirectMessage = '📝 Redirection vers vos formulaires...';
        } else {
          redirectMessage = '🏠 Redirection vers le dashboard...';
        }

        console.log('🎯 Redirection prévue:', redirectPath);
        showRedirectMessage(redirectMessage);

        // 4. Redirection après délai
        setTimeout(() => {
          if (from !== '/') {
            navigate(from, { replace: true });
          } else {
            navigate(redirectPath, { replace: true });
          }
        }, 1500);

      } else {
        throw new Error('Données de connexion invalides');
      }

    } catch (err: any) {
      console.error('❌ Erreur de connexion:', err);
      
      let errorMessage = 'Erreur de connexion';

      if (err.response?.status === 401) {
        errorMessage = 'Email ou mot de passe incorrect';
      } else if (err.response?.status === 403) {
        errorMessage = 'Compte désactivé ou accès non autorisé';
      } else if (err.response?.status === 429) {
        errorMessage = 'Trop de tentatives. Veuillez patienter quelques minutes.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Gestion des changements dans les champs
   */
  const handleInputChange = (field: keyof LoginForm) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    
    if (error) {
      setError('');
    }
  };

  return (
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', py: 4 }}>
      {/* Logo et titre */}
      <Box textAlign="center" mb={4}>
        <AssessmentIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          DSIN Maturité
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Plateforme d'évaluation de maturité digitale
        </Typography>
      </Box>

      {/* Message de redirection */}
      {redirectInfo.show && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {redirectInfo.message}
        </Alert>
      )}

      {/* Formulaire de connexion */}
      <Card elevation={4}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" component="h2" textAlign="center" gutterBottom>
            Connexion
          </Typography>
          
          <Box component="form" onSubmit={handleSubmit} noValidate>
            {/* Champ Email */}
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Adresse email"
              name="email"
              autoComplete="email"
              autoFocus
              value={form.email}
              onChange={handleInputChange('email')}
              disabled={loading}
            />
            
            {/* Champ Mot de passe */}
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Mot de passe"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={form.password}
              onChange={handleInputChange('password')}
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Erreur */}
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            {/* Bouton de connexion */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading || !isFormValid()}
              startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
              sx={{ mt: 3, mb: 2 }}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Liens supplémentaires */}
      <Box mt={3} textAlign="center">
        <Button
          variant="outlined"
          startIcon={<BusinessIcon />}
          onClick={() => navigate('/auth/enterprise-registration')}
        >
          Inscrire mon entreprise
        </Button>
        
        <Typography variant="caption" display="block" color="text.secondary" mt={2}>
          Version 2.0 - Plateforme DSIN
        </Typography>
      </Box>
    </Container>
  );
};

export default Login;