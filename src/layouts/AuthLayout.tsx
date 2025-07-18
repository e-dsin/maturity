// src/layouts/AuthLayout.tsx - Version V2 simplifiée
import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Box, Container, Paper, useTheme, useMediaQuery } from '@mui/material';

interface AuthLayoutProps {
  children?: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Déterminer le type de page pour ajuster la largeur
  const isRegistrationPage = location.pathname.includes('/auth/enterprise-registration');
  const isEvaluationPage = location.pathname.includes('/maturity-evaluation');
  
  // Configuration responsive selon le type de page
  const getContainerWidth = () => {
    if (isRegistrationPage) return 'md'; // Plus large pour le formulaire d'entreprise
    if (isEvaluationPage) return 'lg';   // Très large pour l'évaluation
    return 'sm';                         // Standard pour login
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'grey.50',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        py: { xs: 2, sm: 4 },
        px: { xs: 1, sm: 2 }
      }}
    >
      {/* En-tête avec logo et titre */}
      <Container maxWidth="sm" sx={{ textAlign: 'center', mb: 4 }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
      
        </Link>
        
        <Box>
          <Box
            component="h1"
            sx={{
              fontSize: { xs: '1.5rem', sm: '1.875rem' },
              fontWeight: 800,
              color: 'grey.900',
              mb: 1,
              mt: 0
            }}
          >
            Plateforme d'Évaluation de la Maturité des DSIN
          </Box>
          
          {/* Sous-titre dynamique selon la page */}
          {isRegistrationPage && (
            <Box
              component="p"
              sx={{
                fontSize: '0.875rem',
                color: 'grey.600',
                mt: 1,
                mb: 0
              }}
            >
              Créez votre compte entreprise et évaluez votre maturité DSIN
            </Box>
          )}
          
          {!isRegistrationPage && !isEvaluationPage && (
            <Box
              component="p"
              sx={{
                fontSize: '0.875rem',
                color: 'grey.600',
                mt: 1,
                mb: 0
              }}
            >
              Accédez à votre plateforme de maturité numérique
            </Box>
          )}
        </Box>
      </Container>

      {/* Contenu principal avec largeur adaptative */}
      <Container maxWidth={getContainerWidth()}>
        <Paper
          elevation={isMobile ? 1 : 3}
          sx={{
            py: { xs: 3, sm: 4 },
            px: { xs: 2, sm: 4 },
            borderRadius: 2,
            backgroundColor: 'white',
            boxShadow: isMobile 
              ? '0 1px 3px rgba(0, 0, 0, 0.1)' 
              : '0 10px 25px rgba(0, 0, 0, 0.1)'
          }}
        >
          {/* Le contenu des pages (Login, EnterpriseRegistration, etc.) */}
          <Outlet />
        </Paper>
      </Container>

      {/* Footer simple */}
      <Container maxWidth="sm" sx={{ textAlign: 'center', mt: 4 }}>
        <Box
          component="p"
          sx={{
            fontSize: '0.75rem',
            color: 'grey.500',
            mb: 0
          }}
        >
          © Qwanza 2025 - All rights reserved
        </Box>
        
        {/* Indicateur de version */}
        <Box
          component="p"
          sx={{
            fontSize: '0.7rem',
            color: 'grey.400',
            mt: 1,
            mb: 0,
            fontStyle: 'italic'
          }}
        >
          Platform V2.0 • Powered by Mundo Archi
        </Box>
      </Container>
    </Box>
  );
};

export default AuthLayout;