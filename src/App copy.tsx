// src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { AuthProvider } from './contexts/AuthContext';
import { LoggerProvider } from './contexts/LoggerContext';
import ProtectedRoute from './components/ProtectedRoute';
import TestAuth from './components/TestAuth';
import routes from './routes';
import logger from './utils/logger';
import { frFR } from '@mui/material/locale';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages
import Dashboard from './pages/dashboard';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/forgot-password';
import QuestionnaireIndex from './pages/dashboard/questionnaires';
import QuestionnaireDetail from './pages/dashboard/questionnaires/[id]';
import QuestionnaireAdmin from './pages/dashboard/questionnaires/admin';
import Forms from './pages/dashboard/forms';
import Users from './pages/dashboard/users';
import Applications from './pages/dashboard/applications';
import Organisations from './pages/dashboard/organisations';
import AnalysesInterpretations from './pages/dashboard/AnalysesInterpretations';


// Initialisation du logger global
if (typeof window !== 'undefined') {
  // Enregistrer les erreurs non gérées au niveau de l'application
  window.onerror = (message, source, lineno, colno, error) => {
    logger.error('Erreur globale non gérée', {
      message,
      source,
      lineno,
      colno,
      stack: error?.stack
    });
    return false;
  };

  // Enregistrer le rejet de promesses non gérées
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Promesse rejetée non gérée', {
      reason: event.reason?.message || String(event.reason),
      stack: event.reason?.stack
    });
  });

  // Initialiser le temps de chargement initial
  (window as any).initialLoadTime = performance.now();
}

// Création du thème
const theme = createTheme({
  palette: {
    primary: {
      main: '#2196f3',
    },
    secondary: {
      main: '#f50057',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
}, frFR);

const App: React.FC = () => {
  // Enregistrer l'initialisation de l'application
  useEffect(() => {
    logger.info('Application initialisée', {
      version: import.meta.env.VITE_APP_VERSION || 'développement',
      environment: import.meta.env.MODE
    });

    // Log de performance au chargement initial
    const loadTime = performance.now() - ((window as any).initialLoadTime || 0);
    if (loadTime > 0) {
      logger.logPerformance('app-initial-load', loadTime);
    }

    // Nettoyage à la fermeture
    return () => {
      logger.flush().catch(console.error);
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
    <Router>
      <LoggerProvider>
        <AuthProvider>
          <TestAuth /> {/* Ajoutez ce composant en haut pour tester */}
          <Routes>
            {/* Routes d'authentification */}
            <Route path="/auth" element={<AuthLayout />}>
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
            </Route>
            
            {/* Routes protégées */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="users" element={<Users />} />
              <Route path="applications" element={<Applications />} />
              <Route path="analyses-interpretations" element={<AnalysesInterpretations />} />
              <Route path="analyses-interpretations/:id" element={<AnalysesInterpretations />} />
              <Route path="organisations" element={<Organisations />} />
              <Route path="organizations/:name" element={<Organisations />} />
              <Route path="forms" element={<Forms />} />
              <Route path="questionnaires" element={<QuestionnaireIndex />} />
              <Route path="questionnaires/:id" element={<QuestionnaireDetail />} />
              <Route path="questionnaires/admin" element={<QuestionnaireAdmin />} />
              <Route path="users" element={<Users />} />
              <Route path="users/:id" element={<Users />} />
              {/* Ajoutez vos autres routes dashboard ici */}
            </Route>
            
            {/* Redirection par défaut */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </LoggerProvider>
    </Router>
    </ThemeProvider>
  );
};

export default App;