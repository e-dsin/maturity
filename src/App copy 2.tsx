// src/App.jsx - Version V2 avec nouvelles fonctionnalités
import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { frFR } from '@mui/material/locale';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';

// Contexts
import { AuthProvider } from './contexts/AuthContext';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages d'authentification
import Login from './pages/auth/Login';
import EnterpriseRegistration from './pages/auth/EnterpriseRegistration';

// Pages principales existantes
import Dashboard from './pages/dashboard';
import QuestionnaireIndex from './pages/dashboard/questionnaires';
import QuestionnaireDetail from './pages/dashboard/questionnaires/[id]';
import QuestionnaireAdmin from './pages/dashboard/questionnaires/admin';
import Applications from './pages/dashboard/applications';
import Organisations from './pages/dashboard/organisations';
import CalculateScore from './pages/dashboard/CalculateScore';
import Forms from './pages/dashboard/forms';
import FormDetail from './pages/dashboard/forms/FormDetail';
import FormNew from './pages/dashboard/forms/FormNew';

// Pages d'analyses - V1 et V2
import AnalysesInterpretations from './pages/dashboard/AnalysesInterpretations';
import AnalysesFonctions from './pages/dashboard/AnalysesInterpretationfunctions';
import AnalysesInterpretationsEntreprises from './pages/dashboard/AnalysesInterpretationsEntreprises';

// Nouvelles pages V2
import MaturityEvaluation from './pages/MaturityEvaluation';

// Pages d'administration
import Administration from './pages/Administration';
import MaturityModelAdmin from './pages/MaturityModelAdmin';

// Composants de protection
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

// Composant de route protégée avec permissions
const PermissionRoute = ({ children, module, action = 'voir', adminOnly = false }) => {
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

const App = () => {
  useEffect(() => {
    logger.info('Application V2 initialisée', {
      version: import.meta.env.VITE_APP_VERSION || '2.0.0-dev',
      environment: import.meta.env.MODE,
      features: [
        'enterprise_registration',
        'maturity_evaluation', 
        'enterprise_analysis',
        'unified_administration',
        'enhanced_permissions'
      ]
    });

    const loadTime = performance.now() - ((window as any).initialLoadTime || 0);
    if (loadTime > 0) {
      logger.logPerformance('app-v2-initial-load', loadTime);
    }

    return () => {
      logger.flush().catch(console.error);
    };
  }, []);
  
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
        <AuthProvider>
          <Routes>
            {/* === ROUTES PUBLIQUES / AUTHENTIFICATION === */}
            <Route path="/auth" element={<AuthLayout />}>
              <Route path="login" element={<Login />} />
              {/* 🆕 NOUVELLE ROUTE V2 - Enregistrement entreprise */}
              <Route path="enterprise-registration" element={<EnterpriseRegistration />} />
              <Route path="enterprise-registration/step/:step" element={<EnterpriseRegistration />} />
            </Route>

            {/* 🆕 NOUVELLES ROUTES V2 - Évaluation de maturité (hors AuthLayout) */}
            <Route 
              path="/maturity-evaluation/:enterpriseId" 
              element={
                <ProtectedRoute fallbackUrl="/auth/login">
                  <MaturityEvaluation />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/maturity-analysis/:evaluationId" 
              element={
                <ProtectedRoute fallbackUrl="/auth/login">
                  <AnalysesInterpretationsEntreprises />
                </ProtectedRoute>
              } 
            />

            {/* === ROUTES PROTÉGÉES AVEC LAYOUT PRINCIPAL === */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute fallbackUrl="/auth/login">
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              {/* Dashboard principal */}
              <Route 
                index 
                element={
                  <PermissionRoute module="DASHBOARD">
                    <Dashboard />
                  </PermissionRoute>
                } 
              />

              {/* === ANALYSES ET INTERPRÉTATIONS === */}
              
              {/* V1 - Analyses par application (conservé) */}
              <Route 
                path="analyses-interpretations" 
                element={
                  <PermissionRoute module="ANALYSES">
                    <AnalysesInterpretations />
                  </PermissionRoute>
                } 
              />

              {/* V1 - Analyses par fonction (conservé) */}
              <Route 
                path="analyses-interpretations-functions" 
                element={
                  <PermissionRoute module="ANALYSES">
                    <AnalysesFonctions />
                  </PermissionRoute>
                } 
              />

              {/* 🆕 V2 - Analyses par entreprise (nouveau) */}
              <Route 
                path="analyses-interpretations-entreprises" 
                element={
                  <PermissionRoute module="ANALYSES">
                    <AnalysesInterpretationsEntreprises />
                  </PermissionRoute>
                } 
              />

              {/* Calcul de scores */}
              <Route 
                path="calculate-score" 
                element={
                  <PermissionRoute module="ANALYSES" action="editer">
                    <CalculateScore />
                  </PermissionRoute>
                } 
              />

              {/* === QUESTIONNAIRES === */}
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
                path="questionnaires-admin" 
                element={
                  <PermissionRoute module="QUESTIONNAIRES" action="administrer" adminOnly={true}>
                    <QuestionnaireAdmin />
                  </PermissionRoute>
                } 
              />

              {/* === FORMULAIRES === */}
              <Route 
                path="forms" 
                element={
                  <PermissionRoute module="FORMULAIRES">
                    <Forms />
                  </PermissionRoute>
                } 
              />

              <Route 
                path="forms/new" 
                element={
                  <PermissionRoute module="FORMULAIRES" action="editer">
                    <FormNew />
                  </PermissionRoute>
                } 
              />

              <Route 
                path="forms/:id" 
                element={
                  <PermissionRoute module="FORMULAIRES">
                    <FormDetail />
                  </PermissionRoute>
                } 
              />

              {/* === APPLICATIONS === */}
              <Route 
                path="applications" 
                element={
                  <PermissionRoute module="APPLICATIONS">
                    <Applications />
                  </PermissionRoute>
                } 
              />

              {/* === ORGANISATIONS / ENTREPRISES === */}
              <Route 
                path="organisations" 
                element={
                  <PermissionRoute module="ENTREPRISES">
                    <Organisations />
                  </PermissionRoute>
                } 
              />

              {/* === ADMINISTRATION === */}
              
              {/* Administration unifiée */}
              <Route 
                path="administration" 
                element={
                  <PermissionRoute module="ADMINISTRATION" adminOnly={true}>
                    <Administration />
                  </PermissionRoute>
                } 
              />

              {/* Gestion du modèle de maturité */}
              <Route 
                path="maturity-model-admin" 
                element={
                  <PermissionRoute module="ADMINISTRATION" action="administrer" adminOnly={true}>
                    <MaturityModelAdmin />
                  </PermissionRoute>
                } 
              />

              {/* 🆕 V2 - Routes d'administration spécifiques */}
              <Route 
                path="administration/users" 
                element={
                  <PermissionRoute module="ADMINISTRATION" action="administrer">
                    <Administration />
                  </PermissionRoute>
                } 
              />

              <Route 
                path="administration/enterprises" 
                element={
                  <PermissionRoute module="ADMINISTRATION" action="administrer">
                    <Administration />
                  </PermissionRoute>
                } 
              />

              <Route 
                path="administration/roles" 
                element={
                  <PermissionRoute module="ADMINISTRATION" action="administrer" adminOnly={true}>
                    <Administration />
                  </PermissionRoute>
                } 
              />

              <Route 
                path="administration/permissions" 
                element={
                  <PermissionRoute module="ADMINISTRATION" action="administrer" adminOnly={true}>
                    <Administration />
                  </PermissionRoute>
                } 
              />

              {/* === ROUTES DE COMPATIBILITÉ === */}
              
              {/* Redirections pour compatibilité V1 */}
              <Route path="analyses-functions" element={<Navigate to="/analyses-interpretations-functions" replace />} />
              <Route path="analyses" element={<Navigate to="/analyses-interpretations" replace />} />
              <Route path="admin" element={<Navigate to="/administration" replace />} />
              
              {/* 🆕 Route par défaut vers analyses entreprises pour les nouveaux utilisateurs */}
              <Route path="welcome" element={<Navigate to="/analyses-interpretations-entreprises" replace />} />
            </Route>

            {/* === ROUTES DE FALLBACK === */}
            
            {/* Redirection racine intelligente */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute fallbackUrl="/auth/login">
                  <Navigate to="/dashboard" replace />
                </ProtectedRoute>
              } 
            />

            {/* Routes d'erreur et fallback */}
            <Route path="/unauthorized" element={
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '100vh',
                flexDirection: 'column',
                gap: '20px'
              }}>
                <h1>🚫 Accès non autorisé</h1>
                <p>Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
                <button onClick={() => window.history.back()}>
                  Retour
                </button>
              </div>
            } />

            <Route path="/maintenance" element={
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '100vh',
                flexDirection: 'column',
                gap: '20px'
              }}>
                <h1>🔧 Maintenance en cours</h1>
                <p>La plateforme est temporairement indisponible pour maintenance.</p>
                <p>Veuillez réessayer dans quelques minutes.</p>
              </div>
            } />

            {/* Catch-all - 404 */}
            <Route path="*" element={
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '100vh',
                flexDirection: 'column',
                gap: '20px'
              }}>
                <h1>📄 Page non trouvée</h1>
                <p>La page que vous recherchez n'existe pas.</p>
                <div>
                  <button onClick={() => window.location.href = '/'} style={{ marginRight: '10px' }}>
                    Accueil
                  </button>
                  <button onClick={() => window.history.back()}>
                    Retour
                  </button>
                </div>
              </div>
            } />
          </Routes>
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
};

export default App;