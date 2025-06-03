// src/components/AdminProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Typography,
  Alert,
  Container,
  Paper,
  Button
} from '@mui/material';
import { AdminPanelSettings as AdminIcon, Warning as WarningIcon } from '@mui/icons-material';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

// Page d'accès refusé pour les non-administrateurs
const AdminAccessDenied: React.FC = () => {
  const { currentUser } = useAuth();
  
  return (
    <Container maxWidth="md" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <WarningIcon sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
        
        <Typography variant="h4" gutterBottom color="error">
          Accès Administrateur Requis
        </Typography>
        
        <Typography variant="body1" paragraph color="text.secondary">
          Cette section est réservée aux utilisateurs ayant le rôle <strong>Administrateur</strong>.
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
          <strong>Votre rôle actuel :</strong> {currentUser?.nom_role || currentUser?.role || 'Non défini'}<br />
          <strong>Rôle requis :</strong> ADMINISTRATEUR
        </Alert>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          Si vous pensez avoir besoin d'un accès administrateur, contactez votre administrateur système.
        </Typography>
        
        <Button 
          variant="contained" 
          onClick={() => window.history.back()}
          sx={{ mt: 2 }}
        >
          Retour
        </Button>
      </Paper>
    </Container>
  );
};

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, currentUser } = useAuth();
  const location = useLocation();

  // Attendre le chargement
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Typography>Vérification des permissions...</Typography>
      </Box>
    );
  }

  // Rediriger vers login si pas authentifié
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Vérifier si l'utilisateur a le rôle Administrateur
  const isAdmin = currentUser?.nom_role === 'ADMINISTRATEUR' || 
                  currentUser?.role === 'Administrateur' || 
                  currentUser?.role === 'Admin';

  console.log('🔐 AdminProtectedRoute - Vérification accès:', {
    userRole: currentUser?.nom_role || currentUser?.role,
    isAdmin,
    path: location.pathname
  });

  if (!isAdmin) {
    return <AdminAccessDenied />;
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;