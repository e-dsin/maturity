// src/App.tsx - Version corrigée avec route login
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { frFR } from '@mui/material/locale';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';

// Contexts
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages d'authentification
import Login from './pages/auth/Login';

// Pages principales
import Dashboard from './pages/dashboard';
import QuestionnaireIndex from './pages/dashboard/questionnaires';
import QuestionnaireDetail from './pages/dashboard/questionnaires/[id]';
import QuestionnaireAdmin from './pages/dashboard/questionnaires/admin';
import Applications from './pages/dashboard/applications';
import Organisations from './pages/dashboard/organisations';
import AnalysesInterpretations from './pages/dashboard/AnalysesInterpretations';
import AnalysesFonctions from './pages/dashboard/AnalysesInterpretationfunctions';
import CalculateScore from './pages/dashboard/CalculateScore';
import Forms from './pages/dashboard/forms';
import FormDetail from './pages/dashboard/forms/FormDetail';
import FormNew from './pages/dashboard/forms/FormNew';

// Pages d'administration unifiées
import Administration from './pages/Administration';
import MaturityModelAdmin from './pages/MaturityModelAdmin';

// Composant de protection des routes avec permissions
import ProtectedRoute from './components/ProtectedRoute';

// Utils
import logger from './utils/logger';

// Configuration du logger global
if (typeof window !== 'undefined') {
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

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Promesse rejetée non gérée', {
      reason: event.reason?.message || String(event.reason),
      stack: event.reason?.stack
    });
  });

  (window as any).initialLoadTime = performance.now();
}

// Création du thème
const theme = createTheme({
  palette: {
    primary: {
      main: '#0B4E87',
    },
    secondary: {
      main: '#09C4B8',
    },
  },
  typography: {
    fontFamily: '"Ubuntu", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
}, frFR);

// Composant de route protégée avec vérification de permissions spécifiques
interface PermissionRouteProps {
  children: React.ReactNode;
  module: string;
  action?: string;
  adminOnly?: boolean;
}

const PermissionRoute: React.FC<PermissionRouteProps> = ({ 
  children, 
  module, 
  action = 'voir',
  adminOnly = false 
}) => {
  return (
    <ProtectedRoute 
      module={module} 
      action={action} 
      adminOnly={adminOnly}
      showDetailedError={true}
    >
      {children}
    </ProtectedRoute>
  );
};

const App: React.FC = () => {
  useEffect(() => {
    logger.info('Application initialisée avec administration unifiée', {
      version: import.meta.env.VITE_APP_VERSION || 'développement',
      environment: import.meta.env.MODE,
      features: ['unified_administration', 'enhanced_permissions']
    });

    const loadTime = performance.now() - ((window as any).initialLoadTime || 0);
    if (loadTime > 0) {
      logger.logPerformance('app-initial-load', loadTime);
    }

    return () => {
      logger.flush().catch(console.error);
    };
  }, []);
  
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
        <ToastProvider>
          <AuthProvider>
            <Router>
              <Routes>
                {/* === ROUTES PUBLIQUES / AUTHENTIFICATION === */}
                <Route path="/auth" element={<AuthLayout />}>
                  <Route path="login" element={<Login />} />
                  {/* Ajoutez d'autres routes d'auth ici si nécessaire */}
                </Route>

                {/* === ROUTES PROTÉGÉES AVEC LAYOUT PRINCIPAL === */}
                <Route 
                  path="/" 
                  element={
                    <ProtectedRoute fallbackUrl="/auth/login">
                      <MainLayout />
                    </ProtectedRoute>
                  }
                >
                  {/* Dashboard */}
                  <Route 
                    index 
                    element={
                      <PermissionRoute module="DASHBOARD">
                        <Dashboard />
                      </PermissionRoute>
                    } 
                  />

                  {/* Analyses et recommandations */}
                  <Route 
                    path="analyses-interpretations" 
                    element={
                      <PermissionRoute module="ANALYSES">
                        <AnalysesInterpretations />
                      </PermissionRoute>
                    } 
                  />
                  <Route 
                    path="analyses-fonctions" 
                    element={
                      <PermissionRoute module="ANALYSES">
                        <AnalysesFonctions />
                      </PermissionRoute>
                    } 
                  />
                  <Route 
                    path="analyses-fonctions/:id" 
                    element={
                      <PermissionRoute module="ANALYSES">
                        <AnalysesFonctions />
                      </PermissionRoute>
                    } 
                  />
                  <Route 
                    path="analyses-interpretations/:id" 
                    element={
                      <PermissionRoute module="ANALYSES">
                        <AnalysesInterpretations />
                      </PermissionRoute>
                    } 
                  />
                  <Route 
                    path="analyses/calculer/:id" 
                    element={
                      <PermissionRoute module="ANALYSES" action="editer">
                        <CalculateScore />
                      </PermissionRoute>
                    } 
                  />

                  {/* Applications */}
                  <Route 
                    path="applications" 
                    element={
                      <PermissionRoute module="APPLICATIONS">
                        <Applications />
                      </PermissionRoute>
                    } 
                  />

                  {/* Formulaires */}
                  <Route 
                    path="formulaires" 
                    element={
                      <PermissionRoute module="FORMULAIRES">
                        <Forms />
                      </PermissionRoute>
                    } 
                  />
                  <Route 
                    path="formulaires/new" 
                    element={
                      <PermissionRoute module="FORMULAIRES" action="editer">
                        <FormNew />
                      </PermissionRoute>
                    } 
                  />
                  <Route 
                    path="formulaires/:id" 
                    element={
                      <PermissionRoute module="FORMULAIRES">
                        <FormDetail />
                      </PermissionRoute>
                    } 
                  />

                  {/* Questionnaires */}
                  <Route 
                    path="questionnaires" 
                    element={
                      <PermissionRoute module="QUESTIONNAIRES">
                        <QuestionnaireIndex />
                      </PermissionRoute>
                    } 
                  />
                  <Route 
                    path="questionnaires/:id" 
                    element={
                      <PermissionRoute module="QUESTIONNAIRES">
                        <QuestionnaireDetail />
                      </PermissionRoute>
                    } 
                  />
                  <Route 
                    path="questionnaires/admin" 
                    element={
                      <PermissionRoute module="QUESTIONNAIRES" action="administrer">
                        <QuestionnaireAdmin />
                      </PermissionRoute>
                    } 
                  />

                  {/* Organisations/Entreprises */}
                  <Route 
                    path="organisations" 
                    element={
                      <PermissionRoute module="ENTREPRISES">
                        <Organisations />
                      </PermissionRoute>
                    } 
                  />
                  <Route 
                    path="organisations/:name" 
                    element={
                      <PermissionRoute module="ENTREPRISES">
                        <Organisations />
                      </PermissionRoute>
                    } 
                  />

                  {/* === ROUTES D'ADMINISTRATION UNIFIÉES === */}
                  
                  <Route 
                    path="admin" 
                    element={
                      <PermissionRoute module="ADMINISTRATION" adminOnly={true}>
                        <Administration />
                      </PermissionRoute>
                    } 
                  />

                  <Route 
                    path="admin/users" 
                    element={
                      <PermissionRoute module="ADMIN_USERS" adminOnly={true}>
                        <Administration />
                      </PermissionRoute>
                    } 
                  />
                  
                  <Route 
                    path="admin/users/:id" 
                    element={
                      <PermissionRoute module="ADMIN_USERS" adminOnly={true}>
                        <Administration />
                      </PermissionRoute>
                    } 
                  />

                  <Route 
                    path="admin/permissions" 
                    element={
                      <PermissionRoute module="ADMIN_PERMISSIONS" adminOnly={true}>
                        <Administration />
                      </PermissionRoute>
                    } 
                  />

                  <Route 
                    path="admin/roles" 
                    element={
                      <PermissionRoute module="ADMIN_ROLES" adminOnly={true}>
                        <Administration />
                      </PermissionRoute>
                    } 
                  />

                  <Route 
                    path="admin/maturity-model" 
                    element={
                      <PermissionRoute module="ADMIN_MATURITY" adminOnly={true}>
                        <MaturityModelAdmin />
                      </PermissionRoute>
                    } 
                  />

                  <Route 
                    path="admin/system" 
                    element={
                      <PermissionRoute module="ADMIN_SYSTEM" adminOnly={true}>
                        <Administration />
                      </PermissionRoute>
                    } 
                  />

                  {/* === REDIRECTIONS POUR RÉTROCOMPATIBILITÉ === */}
                  <Route 
                    path="users" 
                    element={<Navigate to="/admin/users" replace />} 
                  />
                  <Route 
                    path="users/:id" 
                    element={<Navigate to="/admin/users" replace />} 
                  />
                  <Route 
                    path="permissions" 
                    element={<Navigate to="/admin/permissions" replace />} 
                  />
                </Route>
                
                {/* === REDIRECTIONS VERS LOGIN === */}
                <Route path="/login" element={<Navigate to="/auth/login" replace />} />
                <Route path="*" element={<Navigate to="/auth/login" replace />} />
              </Routes>
            </Router>
          </AuthProvider>
        </ToastProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
};

export default App;