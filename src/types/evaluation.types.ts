// src/types/evaluation.types.ts
// Types et interfaces pour le système d'évaluation et de redirection

// =============================================================================
// TYPES DE BASE
// =============================================================================

export type UserRole = 
  | 'SUPER-ADMINISTRATEUR'
  | 'ADMINISTRATEUR' 
  | 'CONSULTANT'
  | 'MANAGER'
  | 'INTERVENANT';

export type AccessLevel = 
  | 'GLOBAL'      // Vue sur toutes les entreprises
  | 'ENTREPRISE'  // Vue sur son entreprise uniquement
  | 'PERSONNEL'   // Vue sur ses données personnelles uniquement
  | 'LIMITED'     // Accès limité
  | 'NONE';       // Aucun accès

export type EvaluationStatusType =
  | 'PENDING_ACCEPTANCE'  // En attente d'acceptation
  | 'IN_PROGRESS'         // En cours
  | 'COMPLETED'           // Terminé
  | 'EXPIRED'             // Expiré
  | 'NO_EVALUATION'       // Aucune évaluation
  | 'ERROR';              // Erreur

export type InvitationStatus =
  | 'ATTENTE'    // En attente
  | 'ACCEPTE'    // Accepté
  | 'REFUSE'     // Refusé
  | 'EXPIRE';    // Expiré

export type EvaluationProgressStatus =
  | 'NOUVEAU'    // Nouveau
  | 'EN_COURS'   // En cours
  | 'TERMINE'    // Terminé
  | 'SUSPENDU';  // Suspendu

// =============================================================================
// INTERFACES UTILISATEUR ET AUTHENTIFICATION
// =============================================================================

export interface User {
  id_acteur: string;
  nom_prenom: string;
  email: string;
  nom_role: UserRole;
  id_entreprise: string;
  nom_entreprise: string;
  hasGlobalAccess: boolean;
  scope: 'GLOBAL' | 'ENTREPRISE';
  niveau_acces?: string;
}

export interface UserRights {
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isConsultant: boolean;
  isManager: boolean;
  hasGlobalAccess: boolean;
  scope: AccessLevel;
  entrepriseId?: string;
  canViewAll: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
  canManageRoles: boolean;
  canManagePermissions: boolean;
  canManageModules: boolean;
}

export interface AccessLevelConfig {
  level: AccessLevel;
  scope: 'GLOBAL' | 'ENTREPRISE';
  canViewAllEnterprises: boolean;
  canViewAllEvaluations: boolean;
  canViewAllFormulaires: boolean;
  canViewEnterpriseData?: boolean;
  canViewOwnData?: boolean;
  defaultRedirectPath: string;
  hasGlobalAccess: boolean;
}

// =============================================================================
// INTERFACES ÉVALUATION ET INVITATIONS
// =============================================================================

export interface EvaluationProgress {
  reponses_donnees: number;
  total_questions: number;
  pourcentage_completion: number;
}

export interface EvaluationInvitation {
  id_invite: string;
  token: string;
  id_entreprise: string;
  id_acteur: string;
  id_evaluation: string;
  nom_prenom: string;
  email: string;
  fonction: string;
  role: UserRole;
  nom_role?: UserRole;
  statut_invitation: InvitationStatus;
  statut_evaluation?: EvaluationProgressStatus;
  date_creation: string;
  date_expiration: string;
  date_completion?: string;
  nom_entreprise?: string;
  score_global?: number;
}

export interface EvaluationStatus {
  hasEvaluation: boolean;
  status: EvaluationStatusType;
  message: string;
  redirectTo: string;
  userRole?: UserRole;
  accessLevel?: AccessLevel;
  scope?: 'GLOBAL' | 'ENTREPRISE';
  shouldResume?: boolean;
  invitation?: EvaluationInvitation;
  progress?: EvaluationProgress;
}

// =============================================================================
// INTERFACES API ET RÉPONSES
// =============================================================================

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  userAccess?: {
    hasGlobalAccess: boolean;
    canViewAll?: boolean;
    accessLevel?: AccessLevel;
    filteredByEnterprise?: boolean;
    canViewEnterprise?: boolean;
    canViewPersonal?: boolean;
  };
  total?: number;
  success?: boolean;
}

export interface LoginResponse {
  message: string;
  user: User;
  token: string;
  evaluationStatus?: EvaluationStatus;
  redirectTo: string;
  redirectReason?: 'evaluation' | 'role' | 'default';
}

export interface EnterpriseFilter {
  isGlobalUser: boolean;
  userEntrepriseId?: string;
  shouldFilter: boolean;
  userRole: UserRole;
}

export interface EvaluationFilter {
  accessLevel: AccessLevel;
  canViewAll: boolean;
  canViewEnterprise: boolean;
  canViewPersonal: boolean;
}

// =============================================================================
// INTERFACES POUR LES COMPOSANTS
// =============================================================================

export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: NavigationItem[];
  roles?: UserRole[];
  accessLevels?: AccessLevel[];
  badge?: string | number;
  tooltip?: string;
  disabled?: boolean;
}

export interface StatusBadgeProps {
  color: 'warning' | 'info' | 'success' | 'error' | 'secondary';
  text: string;
  icon: string;
}

export interface RedirectInfo {
  show: boolean;
  message: string;
  type: 'evaluation' | 'role' | 'default';
}

// =============================================================================
// INTERFACES POUR LES DONNÉES MÉTIER
// =============================================================================

export interface Entreprise {
  id_entreprise: string;
  nom_entreprise: string;
  secteur: string;
  taille_entreprise: string;
  description?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  site_web?: string;
  ville_siege_social?: string;
  pays_siege_social?: string;
  statut_evaluation?: string;
  date_creation: string;
  date_modification: string;
}

export interface Application {
  id_application: string;
  nom_application: string;
  statut: string;
  type: string;
  hebergement?: string;
  architecture_logicielle?: string;
  id_entreprise: string;
  nom_entreprise?: string;
  date_creation?: string;
  date_modification?: string;
}

export interface Formulaire {
  id_formulaire: string;
  id_acteur: string;
  id_application: string;
  id_questionnaire: string;
  statut: 'Brouillon' | 'Soumis' | 'Validé';
  progression: number;
  date_creation: string;
  date_modification: string;
  questionnaire_nom?: string;
  nom_application?: string;
  nom_entreprise?: string;
  acteur_nom?: string;
}

export interface Analyse {
  id_analyse: string;
  date_analyse: string;
  score_global: number;
  id_application: string;
  nom_application: string;
  nom_entreprise: string;
  interpretation?: {
    niveau: string;
    description: string;
    recommandations: string;
  };
}

// =============================================================================
// INTERFACES POUR LES HOOKS
// =============================================================================

export interface UseEvaluationRedirectReturn {
  evaluationStatus: EvaluationStatus | null;
  isChecking: boolean;
  checkEvaluationStatus: () => Promise<EvaluationStatus | null>;
  handleEvaluationRedirect: (force?: boolean) => Promise<boolean>;
  handleLoginRedirect: () => Promise<void>;
  getStatusBadgeProps: () => StatusBadgeProps | null;
  getDefaultRedirectByRole: (userRole: string, userEnterpriseId?: string) => string;
  goToEvaluation: () => void;
  shouldRedirectFromCurrentPage: () => boolean;
  hasActiveEvaluation: boolean;
  needsAttention: boolean;
  canNavigateFreely: boolean;
}

export interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

// =============================================================================
// CONSTANTES ET CONFIGURATIONS
// =============================================================================

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  'SUPER-ADMINISTRATEUR': 5,
  'ADMINISTRATEUR': 4,
  'CONSULTANT': 3,
  'MANAGER': 2,
  'INTERVENANT': 1
};

export const GLOBAL_ROLES: UserRole[] = [
  'CONSULTANT',
  'ADMINISTRATEUR', 
  'SUPER-ADMINISTRATEUR'
];

export const ROLE_ROUTES: Record<AccessLevel, string> = {
  GLOBAL: '/analyses-interpretations',
  ENTREPRISE: '/analyses-interpretations-entreprises',
  PERSONNEL: '/formulaires-filtered',
  LIMITED: '/dashboard',
  NONE: '/auth/login'
};

export const EVALUATION_STATUS_COLORS: Record<EvaluationStatusType, 'warning' | 'info' | 'success' | 'error' | 'secondary'> = {
  PENDING_ACCEPTANCE: 'warning',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  EXPIRED: 'error',
  NO_EVALUATION: 'secondary',
  ERROR: 'error'
};

// =============================================================================
// TYPES POUR LES MIDDLEWARES ET SÉCURITÉ
// =============================================================================

export interface SecurityContext {
  user: User;
  userRights: UserRights;
  enterpriseFilter: EnterpriseFilter;
  evaluationFilter?: EvaluationFilter;
  accessLevel: AccessLevel;
}

export interface PermissionCheck {
  hasAccess: boolean;
  reason?: string;
  requiredRole?: UserRole[];
  requiredAccessLevel?: AccessLevel;
}

export interface RouteProtection {
  requiresAuth: boolean;
  allowedRoles?: UserRole[];
  requiredAccessLevel?: AccessLevel;
  allowEvaluationRedirect?: boolean;
  customPermissionCheck?: (context: SecurityContext) => PermissionCheck;
}

// =============================================================================
// TYPES POUR LES STATISTIQUES ET RAPPORTS
// =============================================================================

export interface FormulairesStats {
  total: number;
  brouillons: number;
  soumis: number;
  valides: number;
  progression_moyenne: number;
}

export interface EnterpriseAnalysisStats {
  total_analyses: number;
  score_moyen: number;
  derniere_analyse: string;
  applications_evaluees: number;
}

export interface EvaluationMetrics {
  totalEvaluations: number;
  completedEvaluations: number;
  averageScore: number;
  averageCompletionTime: number;
  participationRate: number;
}

// =============================================================================
// EXPORT GROUPÉ DES TYPES PRINCIPAUX
// =============================================================================

export type {
  User,
  UserRole,
  AccessLevel,
  EvaluationStatus,
  EvaluationInvitation,
  EvaluationProgress,
  LoginResponse,
  ApiResponse,
  UseEvaluationRedirectReturn,
  UseAuthReturn,
  SecurityContext,
  RouteProtection
};
