// src/routes/AppRoutes.tsx - VERSION MISE À JOUR
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute, PermissionRoute } from '../components/auth';
import { AuthLayout, MainLayout } from '../layouts';

// Pages d'authentification existantes
import Login from '../pages/auth/Login';
import EnterpriseRegistration from '../pages/auth/EnterpriseRegistration';

// Pages d'évaluation existantes
import EvaluationInvite from '../pages/evaluation/EvaluationInvite';
import MaturityEvaluation from '../pages/evaluation/MaturityEvaluation';

// Pages dashboard existantes
import Dashboard from '../pages/dashboard/Dashboard';
import AnalysesInterpretations from '../pages/dashboard/AnalysesInterpretations';

// 🆕 NOUVELLES PAGES pour la redirection selon les rôles
import AnalysesInterpretationsEntreprises from '../pages/dashboard/AnalysesInterpretationsEntreprises';
import FormulairesFiltered from '../pages/dashboard/FormulairesFiltered';

// Pages existantes (à garder telles quelles)
import Formulaires from '../pages/dashboard/Formulaires';
import Questionnaires from '../pages/dashboard/Questionnaires';
import Applications from '../pages/dashboard/Applications';
import Entreprises from '../pages/dashboard/Entreprises';
import Acteurs from '../pages/dashboard/Acteurs';
import Roles from '../pages/dashboard/Roles';
import Permissions from '../pages/dashboard/Permissions';
import Modules from '../pages/dashboard/Modules';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* === ROUTES PUBLIQUES / AUTHENTIFICATION === */}
      <Route path="/auth" element={<AuthLayout />}>
        <Route path="login" element={<Login />} />
        <Route path="enterprise-registration" element={<EnterpriseRegistration />} />
        <Route path="enterprise-registration/step/:step" element={<EnterpriseRegistration />} />
        
        {/* ✅ Route pour les invitations d'évaluation (statut EN ATTENTE) */}
        <Route path="evaluation-invite/:token" element={<EvaluationInvite />} />
      </Route>

      {/* === ROUTES D'ÉVALUATION (hors AuthLayout) === */}
      {/* ✅ Route pour l'évaluation en cours (statut EN PROGRESSION) */}
      <Route 
        path="/maturity-evaluation/:enterpriseId" 
        element={
          <ProtectedRoute fallbackUrl="/auth/login">
            <MaturityEvaluation />
          </ProtectedRoute>
        } 
      />

      {/* Route pour l'analyse post-évaluation */}
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
        <Route index element={<Dashboard />} />

        {/* === ANALYSES ET INTERPRÉTATIONS === */}
        
        {/* 🆕 Route pour les analyses d'entreprise spécifiques (MANAGERS) */}
        <Route 
          path="analyses-interpretations-entreprises" 
          element={
            <PermissionRoute module="ANALYSES">
              <AnalysesInterpretationsEntreprises />
            </PermissionRoute>
          } 
        />
        
        {/* Route existante pour les analyses générales (RÔLES GLOBAUX) */}
        <Route 
          path="analyses-interpretations" 
          element={
            <PermissionRoute module="ANALYSES">
              <AnalysesInterpretations />
            </PermissionRoute>
          } 
        />

        {/* === FORMULAIRES === */}
        
        {/* 🆕 Route pour les formulaires filtrés (redirection depuis auth) */}
        <Route 
          path="formulaires-filtered" 
          element={
            <PermissionRoute module="FORMULAIRES">
              <FormulairesFiltered />
            </PermissionRoute>
          } 
        />
        
        {/* Route existante pour les formulaires (navigation normale) */}
        <Route 
          path="formulaires" 
          element={
            <PermissionRoute module="FORMULAIRES">
              <Formulaires />
            </PermissionRoute>
          } 
        />

        {/* === AUTRES ROUTES EXISTANTES (INCHANGÉES) === */}
        
        <Route 
          path="questionnaires" 
          element={
            <PermissionRoute module="QUESTIONNAIRES">
              <Questionnaires />
            </PermissionRoute>
          } 
        />
        
        <Route 
          path="questionnaires/:id" 
          element={
            <PermissionRoute module="QUESTIONNAIRES">
              <Questionnaires />
            </PermissionRoute>
          } 
        />

        <Route 
          path="applications" 
          element={
            <PermissionRoute module="APPLICATIONS">
              <Applications />
            </PermissionRoute>
          } 
        />

        <Route 
          path="organisations" 
          element={
            <PermissionRoute module="ENTREPRISES">
              <Entreprises />
            </PermissionRoute>
          } 
        />

        <Route 
          path="acteurs" 
          element={
            <PermissionRoute module="USERS">
              <Acteurs />
            </PermissionRoute>
          } 
        />

        <Route 
          path="roles" 
          element={
            <PermissionRoute module="ADMIN" action="administrer">
              <Roles />
            </PermissionRoute>
          } 
        />

        <Route 
          path="permissions" 
          element={
            <PermissionRoute module="ADMIN" action="administrer">
              <Permissions />
            </PermissionRoute>
          } 
        />

        <Route 
          path="modules" 
          element={
            <PermissionRoute module="ADMIN" action="administrer">
              <Modules />
            </PermissionRoute>
          } 
        />

        {/* Route catch-all pour les URLs non reconnues */}
        <Route path="*" element={<Dashboard />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;