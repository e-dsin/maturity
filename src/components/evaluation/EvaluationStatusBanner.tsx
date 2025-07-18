// src/components/evaluation/EvaluationStatusBanner.tsx
// Banner contextuel pour afficher le statut d'évaluation

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  LinearProgress,
  Typography,
  Chip,
  Slide,
  Paper,
  IconButton,
  Collapse
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Close as CloseIcon,
  PlayArrow as PlayArrowIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';

import { useEvaluationRedirect } from '../../hooks/useEvaluationRedirect';
import { useState } from 'react';

const EvaluationStatusBanner: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { evaluationStatus, needsAttention, goToEvaluation } = useEvaluationRedirect();
  const [dismissed, setDismissed] = useState(false);

  // Ne pas afficher le banner sur certaines pages
  const hiddenPaths = [
    '/auth/',
    '/evaluation-invite/',
    '/maturity-evaluation/',
    '/maturity-analysis/'
  ];

  const shouldHideBanner = hiddenPaths.some(path => 
    location.pathname.startsWith(path)
  );

  if (shouldHideBanner || !evaluationStatus?.hasEvaluation || dismissed) {
    return null;
  }

  /**
   * Configuration selon le statut
   */
  const getStatusConfig = () => {
    switch (evaluationStatus.status) {
      case 'PENDING_ACCEPTANCE':
        return {
          severity: 'warning' as const,
          icon: <WarningIcon />,
          title: 'Invitation d\'évaluation en attente',
          message: 'Vous avez reçu une invitation pour participer à une évaluation de maturité.',
          actionLabel: 'Accepter l\'invitation',
          actionIcon: <PlayArrowIcon />,
          showProgress: false,
          dismissible: false
        };

      case 'IN_PROGRESS':
        return {
          severity: 'info' as const,
          icon: <AssessmentIcon />,
          title: 'Évaluation en cours',
          message: `Votre évaluation de maturité est en cours. Progression actuelle : ${evaluationStatus.progress?.pourcentage_completion || 0}%`,
          actionLabel: 'Continuer l\'évaluation',
          actionIcon: <PlayArrowIcon />,
          showProgress: true,
          dismissible: true
        };

      case 'COMPLETED':
        return {
          severity: 'success' as const,
          icon: <CheckCircleIcon />,
          title: 'Évaluation terminée',
          message: 'Votre évaluation de maturité est terminée. Consultez vos résultats.',
          actionLabel: 'Voir les résultats',
          actionIcon: <VisibilityIcon />,
          showProgress: false,
          dismissible: true
        };

      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  /**
   * Actions
   */
  const handleAction = () => {
    goToEvaluation();
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  return (
    <Slide direction="down" in={!dismissed} mountOnEnter unmountOnExit>
      <Paper 
        elevation={0}
        sx={{ 
          position: 'sticky',
          top: 64, // Hauteur de l'AppBar
          zIndex: 1000,
          borderRadius: 0,
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Alert
          severity={config.severity}
          icon={config.icon}
          sx={{
            borderRadius: 0,
            '& .MuiAlert-message': {
              width: '100%'
            }
          }}
          action={
            <Box display="flex" alignItems="center" gap={1}>
              <Button
                color="inherit"
                variant="outlined"
                size="small"
                startIcon={config.actionIcon}
                onClick={handleAction}
                sx={{
                  borderColor: 'currentColor',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                {config.actionLabel}
              </Button>
              
              {config.dismissible && (
                <IconButton
                  color="inherit"
                  size="small"
                  onClick={handleDismiss}
                  sx={{ ml: 1 }}
                >
                  <CloseIcon />
                </IconButton>
              )}
            </Box>
          }
        >
          <AlertTitle sx={{ mb: 1 }}>
            <Box display="flex" alignItems="center" gap={1}>
              {config.title}
              
              {evaluationStatus.invitation && (
                <Chip
                  label={evaluationStatus.invitation.role || evaluationStatus.userRole}
                  size="small"
                  variant="outlined"
                  sx={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'inherit',
                    borderColor: 'currentColor'
                  }}
                />
              )}
            </Box>
          </AlertTitle>

          <Typography variant="body2" sx={{ mb: config.showProgress ? 1 : 0 }}>
            {config.message}
          </Typography>

          {/* Barre de progression pour les évaluations en cours */}
          {config.showProgress && evaluationStatus.progress && (
            <Box sx={{ mt: 1 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                <Typography variant="caption">
                  {evaluationStatus.progress.reponses_donnees} / {evaluationStatus.progress.total_questions} questions
                </Typography>
                <Typography variant="caption" fontWeight="bold">
                  {evaluationStatus.progress.pourcentage_completion}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={evaluationStatus.progress.pourcentage_completion}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 3,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)'
                  }
                }}
              />
            </Box>
          )}

          {/* Informations additionnelles */}
          {evaluationStatus.invitation && (
            <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {evaluationStatus.invitation.nom_entreprise && (
                <Chip
                  label={`Entreprise: ${evaluationStatus.invitation.nom_entreprise}`}
                  size="small"
                  variant="outlined"
                  sx={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: 'inherit',
                    borderColor: 'rgba(255, 255, 255, 0.3)'
                  }}
                />
              )}
              
              {evaluationStatus.invitation.date_expiration && (
                <Chip
                  icon={<ScheduleIcon sx={{ fontSize: 16 }} />}
                  label={`Expire: ${new Date(evaluationStatus.invitation.date_expiration).toLocaleDateString('fr-FR')}`}
                  size="small"
                  variant="outlined"
                  sx={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: 'inherit',
                    borderColor: 'rgba(255, 255, 255, 0.3)'
                  }}
                />
              )}
            </Box>
          )}
        </Alert>
      </Paper>
    </Slide>
  );
};

export default EvaluationStatusBanner;