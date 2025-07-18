// src/components/auth/ProtectedRoute.tsx - ROUTE PROTÉGÉE AVEC REDIRECTION INTELLIGENTE
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';

import { useAuth } from '../../hooks/useAuth';
import { useEvaluationRedirect } from '../../hooks/useEvaluationRedirect';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallbackUrl?: string;
  requiresRole?: string[];
  requiresAccessLevel?: 'GLOBAL' | 'ENTREPRISE' | 'PERSONNEL';
  allowEvaluationRedirect?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  fallbackUrl = '/auth/login',
  requiresRole = [],
  requiresAccessLevel,
  allowEvaluationRedirect = true
}) => {
  const location = useLocation();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const { 
    evaluationStatus, 
    handleEvaluationRedirect, 
    isChecking: evaluationLoading,
    canNavigateFreely 
  } = useEvaluationRedirect();

  const [isChecking, setIsChecking] = useState(true);
  const [redirectReason, setRedirectReason] = useState<string>('');

  /**
   * Détermine le niveau d'accès de l'utilisateur
   */
  const getUserAccessLevel = (): 'GLOBAL' | 'ENTREPRISE' | 'PERSONNEL' | 'NONE' => {
    if (!user?.nom_role) return 'NONE';
    
    const role = user.nom_role.toUpperCase();
    if (['CONSULTANT', 'ADMINISTRATEUR', 'SUPER-ADMINISTRATEUR'].includes(role)) {
      return 'GLOBAL';
    } else if (role === 'MANAGER') {
      return 'ENTREPRISE';
    } else if (role === 'INTERVENANT') {
      return 'PERSONNEL';
    }
    return 'NONE';
  };

  /**
   * Vérifie si l'utilisateur a le rôle requis
   */
  const hasRequiredRole = (): boolean => {
    if (requiresRole.length === 0) return true;
    if (!user?.nom_role) return false;
    
    return requiresRole.includes(user.nom_role.toUpperCase());
  };

  /**
   * Vérifie si l'utilisateur a le niveau d'accès requis
   */
  const hasRequiredAccessLevel = (): boolean => {
    if (!requiresAccessLevel) return true;
    
    const userLevel = getUserAccessLevel();
    
    // Hiérarchie des niveaux : GLOBAL > ENTREPRISE > PERSONNEL
    switch (requiresAccessLevel) {
      case 'GLOBAL':
        return userLevel === 'GLOBAL';
      case 'ENTREPRISE':
        return ['GLOBAL', 'ENTREPRISE'].includes(userLevel);
      case 'PERSONNEL':
        return ['GLOBAL', 'ENTREPRISE', 'PERSONNEL'].includes(userLevel);
      default:
        return false;
    }
  };

  /**
   * Effet principal de vérification
   */
  useEffect(() => {
    const checkAccess = async () => {
      if (authLoading || evaluationLoading) {
        return;
      }

      setIsChecking(true);

      try {
        // 1. Vérifier l'authentification
        if (!isAuthenticated) {
          setRedirectReason('Authentification requise');
          setIsChecking(false);
          return;
        }

        // 2. Vérifier les permissions de rôle et niveau d'accès
        if (!hasRequiredRole()) {
          setRedirectReason(`Rôle ${requiresRole.join(' ou ')} requis`);
          setIsChecking(false);
          return;
        }

        if (!hasRequiredAccessLevel()) {
          setRedirectReason(`Niveau d'accès ${requiresAccessLevel} requis`);
          setIsChecking(false);
          return;
        }

        // 3. Vérifier les redirections d'évaluation (si autorisées)
        if (allowEvaluationRedirect && evaluationStatus) {
          // Définir les pages depuis lesquelles on ne redirige pas automatiquement
          const noRedirectPaths = [
            '/evaluation-invite/',
            '/maturity-evaluation/',
            '/dashboard',
            '/profile',
            '/settings'
          ];

          const currentPath = location.pathname;
          const isOnNoRedirectPage = noRedirectPaths.some(path => 
            currentPath.startsWith(path)
          );

          // Si l'utilisateur doit être redirigé et n'est pas sur une page protégée
          if (!isOnNoRedirectPage && !canNavigateFreely) {
            console.log('🔄 Redirection d\'évaluation nécessaire depuis ProtectedRoute');
            const redirected = await handleEvaluationRedirect();
            
            if (redirected) {
              setIsChecking(false);
              return;
            }
          }
        }

        // 4. Tout est bon, autoriser l'accès
        setIsChecking(false);

      } catch (error) {
        console.error('Erreur lors de la vérification d\'accès:', error);
        setRedirectReason('Erreur de vérification des permissions');
        setIsChecking(false);
      }
    };

    checkAccess();
  }, [
    authLoading, 
    evaluationLoading, 
    isAuthenticated, 
    user, 
    location.pathname,
    evaluationStatus,
    canNavigateFreely,
    allowEvaluationRedirect
  ]);

  // Affichage du loading pendant les vérifications
  if (authLoading || evaluationLoading || isChecking) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        gap={2}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          Vérification des permissions...
        </Typography>
      </Box>
    );
  }

  // Redirection si pas authentifié
  if (!isAuthenticated) {
    return (
      <Navigate 
        to={fallbackUrl} 
        state={{ from: location, reason: redirectReason }}
        replace 
      />
    );
  }

  // Vérification des permissions
  if (!hasRequiredRole() || !hasRequiredAccessLevel()) {
    return (
      <Box p={3}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Accès non autorisé
          </Typography>
          <Typography variant="body2">
            {redirectReason}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Votre rôle actuel : <strong>{user?.nom_role}</strong>
          </Typography>
          <Typography variant="body2">
            Niveau d'accès : <strong>{getUserAccessLevel()}</strong>
          </Typography>
        </Alert>
      </Box>
    );
  }

  // Rendu du contenu protégé
  return <>{children}</>;
};

export default ProtectedRoute;