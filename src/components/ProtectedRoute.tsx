// src/components/ProtectedRoute.tsx - Version corrigée
import React, { useEffect, useState, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Box, 
  CircularProgress, 
  Alert, 
  AlertTitle, 
  Button, 
  Typography,
  Paper,
  Container
} from '@mui/material';
import { 
  Lock as LockIcon, 
  AdminPanelSettings as AdminIcon,
  Warning as WarningIcon 
} from '@mui/icons-material';

interface ProtectedRouteProps {
  children: React.ReactNode;
  module?: string;
  action?: string;
  adminOnly?: boolean;
  fallbackUrl?: string;
  showDetailedError?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children,
  module,
  action = 'voir',
  adminOnly = false,
  fallbackUrl = '/auth/login',
  showDetailedError = true
}) => {
  const { 
    isAuthenticated, 
    isLoading, 
    currentUser, 
    hasPermission, 
    canAccessRoute,
    isAdmin, 
    isSuperAdmin
  } = useAuth();
  
  const location = useLocation();
  const [permissionLoading, setPermissionLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{
    type: 'auth' | 'permission' | 'admin';
    message: string;
    suggestion?: string;
  } | null>(null);

  // Mémoriser les valeurs pour éviter les re-renders
  const isUserAdmin = useCallback(() => isAdmin(), [isAdmin]);
  const isUserSuperAdmin = useCallback(() => isSuperAdmin(), [isSuperAdmin]);

  // Vérification des permissions - UNIQUEMENT basée sur les valeurs primitives
  useEffect(() => {
    let isMounted = true; // Pour éviter les setState sur composants démontés

    const checkPermissions = async () => {
      console.log('🔍 ProtectedRoute - Vérification permissions pour:', location.pathname);
      
      try {
        if (!isMounted) return;
        
        setPermissionLoading(true);
        setErrorDetails(null);

        // 1. Vérifier l'authentification
        if (!isAuthenticated) {
          console.log('❌ Utilisateur non authentifié');
          if (isMounted) {
            setErrorDetails({
              type: 'auth',
              message: 'Vous devez être connecté pour accéder à cette page.',
              suggestion: 'Veuillez vous connecter avec vos identifiants.'
            });
            setHasAccess(false);
            setPermissionLoading(false);
          }
          return;
        }

        // 2. Vérifier si admin requis
        if (adminOnly && !isUserAdmin() && !isUserSuperAdmin()) {
          console.log('❌ Accès administrateur requis mais utilisateur non admin');
          if (isMounted) {
            setErrorDetails({
              type: 'admin',
              message: 'Accès réservé aux administrateurs.',
              suggestion: 'Contactez votre administrateur système pour obtenir les droits nécessaires.'
            });
            setHasAccess(false);
            setPermissionLoading(false);
          }
          return;
        }

        // 3. Vérifier les permissions spécifiques
        if (module && hasPermission) {
          const hasModulePermission = hasPermission(module, action);
          console.log(`🔍 Permission ${module}:${action} = ${hasModulePermission ? '✅' : '❌'}`);

          if (!hasModulePermission) {
            if (isMounted) {
              setErrorDetails({
                type: 'permission',
                message: `Vous n'avez pas les permissions nécessaires pour ${action === 'voir' ? 'consulter' : action} ce module.`,
                suggestion: `Module requis: ${module} (${action}). Contactez votre administrateur pour obtenir ces permissions.`
              });
              setHasAccess(false);
              setPermissionLoading(false);
            }
            return;
          }
        }

        // 4. Vérifier l'accès par route
        if (canAccessRoute) {
          const routeAccess = canAccessRoute(location.pathname);
          console.log(`🚦 Accès route ${location.pathname} = ${routeAccess ? '✅' : '❌'}`);

          if (!routeAccess) {
            if (isMounted) {
              setErrorDetails({
                type: 'permission',
                message: 'Vous n\'avez pas accès à cette page.',
                suggestion: 'Vérifiez que vous avez les permissions nécessaires ou contactez votre administrateur.'
              });
              setHasAccess(false);
              setPermissionLoading(false);
            }
            return;
          }
        }

        // 5. Accès autorisé
        console.log('✅ Accès autorisé');
        if (isMounted) {
          setHasAccess(true);
          setPermissionLoading(false);
        }

      } catch (error) {
        console.error('❌ Erreur lors de la vérification des permissions:', error);
        if (isMounted) {
          setErrorDetails({
            type: 'permission',
            message: 'Erreur lors de la vérification des permissions.',
            suggestion: 'Veuillez rafraîchir la page ou contacter le support technique.'
          });
          setHasAccess(false);
          setPermissionLoading(false);
        }
      }
    };

    // Attendre que isLoading soit false avant de vérifier
    if (!isLoading) {
      checkPermissions();
    }

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [
    // UNIQUEMENT les valeurs primitives pour éviter les boucles
    isAuthenticated, 
    isLoading, 
    module, 
    action, 
    adminOnly, 
    location.pathname,
    currentUser?.id_acteur, // Uniquement l'ID au lieu de l'objet entier
    currentUser?.nom_role
  ]); // NE PAS inclure les fonctions ici

  // Affichage du chargement
  if (isLoading || (permissionLoading && isAuthenticated)) {
    return (
      <Box 
        display="flex" 
        flexDirection="column"
        justifyContent="center" 
        alignItems="center" 
        minHeight="80vh"
        gap={2}
      >
        <CircularProgress size={48} />
        <Typography variant="body1" color="text.secondary">
          Vérification des permissions...
        </Typography>
      </Box>
    );
  }

  // Redirection si non authentifié
  if (!isAuthenticated) {
    console.log('🔄 Redirection vers page de connexion');
    return <Navigate to={fallbackUrl} state={{ from: location }} replace />;
  }

  // Affichage des erreurs de permission
  if (!hasAccess && errorDetails) {
    if (!showDetailedError) {
      return <Navigate to="/" replace />;
    }

    return (
      <Container maxWidth="md" sx={{ mt: 8, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <Box display="flex" flexDirection="column" alignItems="center" gap={3}>
            {/* Icône selon le type d'erreur */}
            {errorDetails.type === 'auth' && (
              <LockIcon color="error" sx={{ fontSize: 64 }} />
            )}
            {errorDetails.type === 'admin' && (
              <AdminIcon color="warning" sx={{ fontSize: 64 }} />
            )}
            {errorDetails.type === 'permission' && (
              <WarningIcon color="error" sx={{ fontSize: 64 }} />
            )}

            {/* Message d'erreur */}
            <Alert 
              severity={errorDetails.type === 'admin' ? 'warning' : 'error'} 
              sx={{ width: '100%', textAlign: 'left' }}
            >
              <AlertTitle>
                {errorDetails.type === 'auth' && 'Authentification requise'}
                {errorDetails.type === 'admin' && 'Accès administrateur requis'}
                {errorDetails.type === 'permission' && 'Permissions insuffisantes'}
              </AlertTitle>
              <Typography variant="body1" gutterBottom>
                {errorDetails.message}
              </Typography>
              {errorDetails.suggestion && (
                <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                  💡 {errorDetails.suggestion}
                </Typography>
              )}
            </Alert>

            {/* Actions */}
            <Box display="flex" gap={2} mt={2}>
              <Button 
                variant="contained" 
                onClick={() => window.history.back()}
                color="primary"
              >
                Retour
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => window.location.href = '/'}
                color="primary"
              >
                Accueil
              </Button>
              {errorDetails.type === 'auth' && (
                <Button 
                  variant="contained" 
                  onClick={() => window.location.href = fallbackUrl}
                  color="secondary"
                >
                  Se connecter
                </Button>
              )}
            </Box>
          </Box>
        </Paper>
      </Container>
    );
  }

  // Affichage du contenu protégé
  console.log('✅ Affichage du contenu protégé');
  return <>{children}</>;
};

export default ProtectedRoute;