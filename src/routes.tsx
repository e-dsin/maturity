import React from 'react';
import { RouteObject } from 'react-router-dom';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages du tableau de bord
import Dashboard from './pages/dashboard';
import Users from './pages/dashboard/users';
import Applications from './pages/dashboard/applications';
import Organisations from './pages/dashboard/organisations';
import Forms from './pages/dashboard/forms';
import Questionnaires from './pages/dashboard/questionnaires';
import QuestionnaireDetail from './pages/dashboard/questionnaires/[id]';
import QuestionnaireAdmin from './pages/dashboard/questionnaires/admin';

// Composants d'interprétation
import InterpretationDashboard from './components/InterpretationDashboard';
import OrganizationDashboard from './components/OrganizationDashboard';

// Pages d'authentification
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/forgot-password';

// Optionnel (si tu les réactives plus tard)
// import Reports from './pages/reports';

interface AppRoute extends RouteObject {
  title?: string;
  icon?: React.ReactNode;
  children?: AppRoute[];
  layout?: React.ComponentType<any>;
  isProtected?: boolean;
}

const routes: AppRoute[] = [
  {
    path: '/dashboard',
    element: <Dashboard />,
    title: 'Tableau de bord',
    layout: DashboardLayout,
    isProtected: true,
  },
  {
    path: '/dashboard/users',
    element: <Users />,
    title: 'Acteurs',
    layout: DashboardLayout,
    isProtected: true,
  },
  {
    path: '/dashboard/applications',
    element: <Applications />,
    title: 'Applications',
    layout: DashboardLayout,
    isProtected: true,
  },
  {
    path: '/dashboard/organisations',
    element: <Organisations />,
    title: 'Organisations',
    layout: DashboardLayout,
    isProtected: true,
  },
  {
    path: '/dashboard/forms',
    element: <Forms />,
    title: 'Formulaires',
    layout: DashboardLayout,
    isProtected: true,
  },
  {
    path: '/dashboard/questionnaires',
    element: <Questionnaires />,
    title: 'Questionnaires',
    layout: DashboardLayout,
    isProtected: true,
  },
  {
    path: '/dashboard/questionnaires/:id',
    element: <QuestionnaireDetail />,
    title: 'Détail du questionnaire',
    layout: DashboardLayout,
    isProtected: true,
  },
  {
    path: '/dashboard/questionnaires/admin',
    element: <QuestionnaireAdmin />,
    title: 'Administration des questionnaires',
    layout: DashboardLayout,
    isProtected: true,
  },
  {
    path: '/dashboard/interpretation/application/:id',
    element: <InterpretationDashboard />,
    title: "Interprétation d'une application",
    layout: DashboardLayout,
    isProtected: true,
  },
  {
    path: '/dashboard/interpretation/organisation/:orgName',
    element: <OrganizationDashboard />,
    title: "Interprétation d'une organisation",
    layout: DashboardLayout,
    isProtected: true,
  },
  {
    path: '/auth/login',
    element: <Login />,
    title: 'Connexion',
    layout: AuthLayout,
    isProtected: false,
  },
  {
    path: '/auth/register',
    element: <Register />,
    title: 'Inscription',
    layout: AuthLayout,
    isProtected: false,
  },
  {
    path: '/auth/forgot-password',
    element: <ForgotPassword />,
    title: 'Mot de passe oublié',
    layout: AuthLayout,
    isProtected: false,
  },
  // Décommente si besoin
  // {
  //   path: '/reports',
  //   element: <Reports />,
  //   title: 'Rapports',
  //   layout: DashboardLayout,
  //   isProtected: true,
  // },
];

export default routes;
