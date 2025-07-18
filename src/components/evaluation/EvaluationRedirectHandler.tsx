// src/components/evaluation/EvaluationRedirectHandler.tsx
// Composant pour gérer automatiquement les redirections d'évaluation

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Alert, 
  CircularProgress, 
  Typography, 
  Button, 
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Fade
} from '@mui/material';
import { 
  Assessment as AssessmentIcon, 
  CheckCircle, 
  Schedule,
  Email as EmailIcon,
  PlayArrow as PlayIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';

interface EvaluationStatus {
  hasEvaluation: boolean;
  status: 'PENDING_ACCEPTANCE' | 'IN_PROGRESS' | 'READY_TO_START' | 'COMPLETED' | 'NO_EVALUATION' | 'ERROR';
  message: string;
  redirectTo: string;
  invitation?: {
    token: string;
    id_invite: string;
    statut_invitation: string;
    nom_entreprise: string;
    role: string;
    fonction: string;
  };
  evaluation?: {
    statut: string;
    progress?: {
      reponses_donnees: number;
      total_questions: number;
      pourcentage_completion: number;
    };
  };
  shouldAutoRedirect?: boolean;
}

interface EvaluationRedirectHandlerProps {
  children: React.ReactNode;
}

/**
 * ✅ Composant qui gère automatiquement les redirections d'évaluation
 * À placer dans App.tsx pour intercepter les redirections nécessaires
 */
const EvaluationRedirectHandler: React.FC<EvaluationRedirectHandlerProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [evaluationStatus, setEvaluationStatus] = useState<EvaluationStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [showRedirect, setShowRedirect] = useState(false);

  /**
   * ✅ Vérifier le statut d'évaluation de l'utilisateur
   */
  const checkEvaluationStatus = async () => {
    if (!user?.id_acteur || !isAuthenticated) {
      return;
    }

    // ✅ Ne pas vérifier sur certaines pages pour éviter les boucles
    const excludedPaths = [
      '/auth/login',
      '/auth/enterprise-registration',
      '/evaluation-invite',
      '/maturity-evaluation',
      '/unauthorized',
      '/maintenance'
    ];

    if (excludedPaths.some(path => location.pathname.startsWith(path))) {
      console.log('🚫 Vérification évaluation ignorée pour:', location.pathname);
      return;
    }

    try {
      setIsChecking(true);
      setError(null);
      
      console.log('🔍 Vérification statut évaluation pour:', user.nom_prenom);
      
      const response = await api.get(`/evaluation-status/check/${user.id_acteur}`);
      const status: EvaluationStatus = response.data;
      
      console.log('📋 Statut évaluation reçu:', status);
      
      // ✅ Déterminer si une redirection automatique est nécessaire
      status.shouldAutoRedirect = [
        'PENDING_ACCEPTANCE',
        'IN_PROGRESS', 
        'READY_TO_START'
      ].includes(status.status);
      
      setEvaluationStatus(status);
      
      // ✅ REDIRECTION AUTOMATIQUE si nécessaire
      if (status.shouldAutoRedirect && status.redirectTo) {
        console.log('🚀 Redirection automatique nécessaire vers:', status.redirectTo);
        setShowRedirect(true);
        
        // Démarrer le compte à rebours
        startCountdown(status.redirectTo);
      }
      
    } catch (err: any) {
      console.error('❌ Erreur vérification évaluation:', err);
      
      // En cas d'erreur, permettre la navigation normale (non bloquant)
      const errorMessage = err.response?.data?.message || 
                          'Erreur lors de la vérification du statut d\'évaluation';
      setError(errorMessage);
      
      setEvaluationStatus({
        hasEvaluation: false,
        status: 'ERROR',
        message: errorMessage,
        redirectTo: '/dashboard'
      });
      
    } finally {
      setIsChecking(false);
    }
  };

  /**
   * ✅ Démarrer le compte à rebours pour la redirection
   */
  const startCountdown = (redirectPath: string) => {
    let count = 5;
    setCountdown(count);
    
    const timer = setInterval(() => {
      count -= 1;
      setCountdown(count);
      
      if (count <= 0) {
        clearInterval(timer);
        console.log('⏰ Redirection automatique vers:', redirectPath);
        navigate(redirectPath, { replace: true });
      }
    }, 1000);
  };

  /**
   * ✅ Navigation manuelle immédiate
   */
  const goToEvaluation = () => {
    if (evaluationStatus?.redirectTo) {
      console.log('🎯 Navigation manuelle vers:', evaluationStatus.redirectTo);
      navigate(evaluationStatus.redirectTo, { replace: true });
    }
  };

  /**
   * ✅ Ignorer la redirection et continuer
   */
  const skipRedirection = () => {
    console.log('⏭️ Redirection ignorée par l\'utilisateur');
    setShowRedirect(false);
    setEvaluationStatus(null);
  };

  /**
   * ✅ Rafraîchir le statut
   */
  const refreshStatus = () => {
    checkEvaluationStatus();
  };

  /**
   * ✅ Vérification automatique au montage et changement d'utilisateur
   */
  useEffect(() => {
    if (user?.id_acteur && isAuthenticated) {
      console.log('🔄 Auto-vérification statut évaluation...');
      checkEvaluationStatus();
    }
  }, [user?.id_acteur, isAuthenticated, location.pathname]);

  /**
   * ✅ Nettoyage à la déconnexion
   */
  useEffect(() => {
    if (!isAuthenticated) {
      setEvaluationStatus(null);
      setError(null);
      setShowRedirect(false);
    }
  }, [isAuthenticated]);

  /**
   * ✅ Si l'utilisateur n'est pas authentifié, passer directement aux enfants
   */
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  /**
   * ✅ Affichage pendant la vérification (discret)
   */
  if (isChecking) {
    return (
      <>
        {children}
        <Box
          sx={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'background.paper',
            borderRadius: 1,
            padding: 1,
            boxShadow: 2
          }}
        >
          <CircularProgress size={20} sx={{ mr: 1 }} />
          <Typography variant="caption">
            Vérification évaluation...
          </Typography>
        </Box>
      </>
    );
  }

  /**
   * ✅ Affichage en cas d'erreur (non bloquant)
   */
  if (error && !showRedirect) {
    console.warn('⚠️ Erreur évaluation (non bloquant):', error);
    // En cas d'erreur, continuer normalement mais afficher discrètement l'erreur
    return (
      <>
        {children}
        <Box sx={{ position: 'fixed', top: 16, right: 16, zIndex: 9999 }}>
          <Alert 
            severity="warning" 
            onClose={() => setError(null)}
            action={
              <Button size="small" onClick={refreshStatus}>
                <RefreshIcon />
              </Button>
            }
          >
            Impossible de vérifier le statut d'évaluation
          </Alert>
        </Box>
      </>
    );
  }

  /**
   * ✅ Affichage de redirection pour invitation en attente
   */
  if (showRedirect && evaluationStatus?.status === 'PENDING_ACCEPTANCE') {
    return (
      <Fade in={true}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            gap: 3,
            p: 3,
            maxWidth: 'md',
            mx: 'auto',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
          }}
        >
          <Card elevation={8} sx={{ width: '100%', maxWidth: 600 }}>
            <CardContent sx={{ textAlign: 'center', p: 4 }}>
              <EmailIcon sx={{ fontSize: 80, color: 'warning.main', mb: 2 }} />
              
              <Typography variant="h4" component="h1" gutterBottom color="primary">
                Invitation d'évaluation en attente
              </Typography>
              
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Vous avez une invitation d'évaluation qui nécessite votre attention
              </Typography>

              <Box sx={{ my: 3 }}>
                <Alert severity="info" sx={{ textAlign: 'left' }}>
                  <Typography variant="body1" gutterBottom>
                    <strong>Entreprise :</strong> {evaluationStatus.invitation?.nom_entreprise}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Rôle :</strong> {evaluationStatus.invitation?.role}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Fonction :</strong> {evaluationStatus.invitation?.fonction}
                  </Typography>
                </Alert>
              </Box>

              <Box sx={{ mb: 3 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={(5 - countdown) * 20} 
                  sx={{ height: 8, borderRadius: 4 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Redirection automatique dans {countdown} seconde{countdown > 1 ? 's' : ''}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<EmailIcon />}
                  onClick={goToEvaluation}
                  sx={{ minWidth: 180 }}
                >
                  Voir mon invitation
                </Button>
                
                <Button
                  variant="outlined"
                  size="large"
                  onClick={skipRedirection}
                >
                  Continuer plus tard
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Fade>
    );
  }

  /**
   * ✅ Affichage de redirection pour évaluation en cours
   */
  if (showRedirect && evaluationStatus?.status === 'IN_PROGRESS') {
    const progress = evaluationStatus.evaluation?.progress;
    
    return (
      <Fade in={true}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            gap: 3,
            p: 3,
            maxWidth: 'md',
            mx: 'auto',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}
        >
          <Card elevation={8} sx={{ width: '100%', maxWidth: 600 }}>
            <CardContent sx={{ textAlign: 'center', p: 4 }}>
              <Schedule sx={{ fontSize: 80, color: 'info.main', mb: 2 }} />
              
              <Typography variant="h4" component="h1" gutterBottom color="primary">
                Évaluation en cours
              </Typography>
              
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Continuez votre évaluation là où vous vous êtes arrêté
              </Typography>

              {progress && (
                <Box sx={{ my: 3 }}>
                  <Alert severity="info" sx={{ textAlign: 'left' }}>
                    <Typography variant="body1" gutterBottom>
                      <strong>Progression :</strong> {progress.reponses_donnees} / {progress.total_questions} questions
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={progress.pourcentage_completion} 
                      sx={{ mt: 1, height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {progress.pourcentage_completion}% complété
                    </Typography>
                  </Alert>
                </Box>
              )}

              <Box sx={{ mb: 3 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={(5 - countdown) * 20} 
                  sx={{ height: 8, borderRadius: 4 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Redirection dans {countdown} seconde{countdown > 1 ? 's' : ''}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PlayIcon />}
                  onClick={goToEvaluation}
                  sx={{ minWidth: 180 }}
                >
                  Continuer l'évaluation
                </Button>
                
                <Button
                  variant="outlined"
                  size="large"
                  onClick={skipRedirection}
                >
                  Plus tard
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Fade>
    );
  }

  /**
   * ✅ Affichage de redirection pour évaluation prête
   */
  if (showRedirect && evaluationStatus?.status === 'READY_TO_START') {
    return (
      <Fade in={true}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            gap: 3,
            p: 3,
            maxWidth: 'md',
            mx: 'auto',
            background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
          }}
        >
          <Card elevation={8} sx={{ width: '100%', maxWidth: 600 }}>
            <CardContent sx={{ textAlign: 'center', p: 4 }}>
              <AssessmentIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
              
              <Typography variant="h4" component="h1" gutterBottom color="primary">
                Évaluation prête à commencer
              </Typography>
              
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Votre évaluation de maturité digitale vous attend
              </Typography>

              <Box sx={{ my: 3 }}>
                <Alert severity="success" sx={{ textAlign: 'left' }}>
                  <Typography variant="body1">
                    Tout est configuré pour commencer votre évaluation. 
                    Cette évaluation vous permettra de mesurer la maturité digitale 
                    de votre organisation.
                  </Typography>
                </Alert>
              </Box>

              <Box sx={{ mb: 3 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={(5 - countdown) * 20} 
                  sx={{ height: 8, borderRadius: 4 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Démarrage automatique dans {countdown} seconde{countdown > 1 ? 's' : ''}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<AssessmentIcon />}
                  onClick={goToEvaluation}
                  sx={{ minWidth: 180 }}
                >
                  Commencer maintenant
                </Button>
                
                <Button
                  variant="outlined"
                  size="large"
                  onClick={skipRedirection}
                >
                  Reporter
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Fade>
    );
  }

  /**
   * ✅ Affichage de confirmation pour évaluation terminée (non bloquant)
   */
  if (evaluationStatus?.status === 'COMPLETED') {
    return (
      <>
        {children}
        <Box sx={{ position: 'fixed', top: 16, right: 16, zIndex: 9999 }}>
          <Alert 
            severity="success" 
            onClose={() => setEvaluationStatus(null)}
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <CheckCircle sx={{ mr: 1 }} />
            Votre évaluation est terminée !
          </Alert>
        </Box>
      </>
    );
  }

  /**
   * ✅ Affichage normal si pas d'évaluation ou évaluation non critique
   */
  return <>{children}</>;
};

export default EvaluationRedirectHandler;