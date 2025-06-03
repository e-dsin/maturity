// src/types/interfaces.ts

/**
 * Interface pour un acteur (utilisateur du système)
 */
export interface Acteur {
    id_acteur: string;
    nom_prenom: string;
    role: string;
    organisation: string;
    anciennete_role: number;
    email?: string;
    date_creation: string;
    date_modification: string;
  }
  
  /**
   * Interface pour une application
   */
  export interface Application {
    id_application: string;
    nom_application: string;
    statut: 'Projet' | 'Run';
    type: 'Build' | 'Buy';
    hebergement: 'Cloud' | 'Prem' | 'Hybrid';
    architecture_logicielle: 'ERP' | 'Multitenant SAAS' | 'MVC' | 'Monolithique';
    date_mise_en_prod?: string;
    language?: string;
    editeur?: string;
    description?: string;
    date_creation: string;
    date_modification: string;
  }
  
  /**
   * Interface pour un questionnaire
   */
  export interface Questionnaire {
    id_questionnaire: string;
    fonction: string;
    thematique: string;
    description?: string;
    date_creation: string;
    date_modification: string;
  }
  
  /**
   * Interface pour une question
   */
  export interface Question {
    id_question: string;
    id_questionnaire: string;
    texte: string;
    ponderation: number;
    ordre?: number;
    date_creation: string;
    date_modification: string;
    
    // Propriétés supplémentaires pour l'affichage frontend
    thematique?: string; // Dérivée du questionnaire
    niveau1?: string;    // Non présent dans la BDD, à gérer côté frontend
    niveau3?: string;    // Non présent dans la BDD, à gérer côté frontend
    niveau5?: string;    // Non présent dans la BDD, à gérer côté frontend
  }
  
  /**
   * Interface pour un formulaire
   */
  export interface Formulaire {
    id_formulaire: string;
    id_acteur: string;
    id_application: string;
    id_questionnaire: string;
    date_creation: string;
    date_modification: string;
    statut: 'Brouillon' | 'Soumis' | 'Validé';
    
    // Propriétés pour les relations (optionnelles)
    acteur?: Acteur;
    application?: Application;
    questionnaire?: Questionnaire;
  }
  
  /**
   * Interface pour une réponse
   */
  export interface Reponse {
    id_reponse: string;
    id_formulaire: string;
    id_question: string;
    valeur_reponse: string;
    score: number;
    commentaire?: string;
    date_creation: string;
    date_modification: string;
    
    // Propriétés pour les relations (optionnelles)
    question?: Question;
  }
  
  /**
   * Interface pour une analyse de maturité
   */
  export interface MaturityAnalyse {
    id_analyse: string;
    id_application: string;
    date_analyse: string;
    score_global?: number;
    
    // Propriétés pour les relations (optionnelles)
    application?: Application;
    thematique_scores?: ThematiqueScore[];
  }
  
  /**
   * Interface pour un score par thématique
   */
  export interface ThematiqueScore {
    id_score: string;
    id_analyse: string;
    thematique: string;
    score: number;
    nombre_reponses: number;
  }
  
  /**
   * Interface pour l'historique des scores
   */
  export interface HistoriqueScore {
    id_historique: string;
    id_application: string;
    thematique: string;
    score: number;
    date_mesure: string;
  }
  
  /**
   * Interface pour les permissions
   */
  export interface Permission {
    id_permission: string;
    id_acteur: string;
    type_ressource: 'APPLICATION' | 'QUESTIONNAIRE' | 'FORMULAIRE' | 'RAPPORT';
    id_ressource?: string;
    peut_voir: boolean;
    peut_editer: boolean;
    peut_supprimer: boolean;
    peut_administrer: boolean;
  }
  
  /**
   * Interface pour la vue des scores des applications
   */
  export interface VueScoreApplication {
    id_application: string;
    nom_application: string;
    statut: 'Projet' | 'Run';
    architecture_logicielle: 'ERP' | 'Multitenant SAAS' | 'MVC' | 'Monolithique';
    score_global?: number;
    date_analyse?: string;
  }
  
  /**
   * Interface pour la vue des détails des formulaires
   */
  export interface VueDetailFormulaire {
    id_formulaire: string;
    date_creation: string;
    id_acteur: string;
    nom_prenom: string;
    role: string;
    organisation: string;
    id_application: string;
    nom_application: string;
    id_questionnaire: string;
    fonction: string;
    thematique: string;
    statut: 'Brouillon' | 'Soumis' | 'Validé';
  }
  
  /**
   * Interface pour la vue des scores par thématique
   */
  export interface VueScoreThematique {
    thematique: string;
    score_moyen: number;
    total_reponses: number;
  }
  
  /**
   * Interface pour la vue de l'historique des applications
   */
  export interface VueHistoriqueApplication {
    id_application: string;
    nom_application: string;
    thematique: string;
    score: number;
    date_mesure: string;
  }
  
  // ===== Interfaces pour les composants UI =====
  
  /**
   * Interface pour les propriétés d'un tableau générique
   */
  export interface TableProps<T> {
    data: T[];
    columns: TableColumn<T>[];
    onRowClick?: (item: T) => void;
    className?: string;
    striped?: boolean;
    hoverable?: boolean;
    bordered?: boolean;
    compact?: boolean;
    headerClassName?: string;
    rowClassName?: (item: T, index: number) => string | undefined;
  }
  
  /**
   * Interface pour une colonne de tableau
   */
  export interface TableColumn<T> {
    key: keyof T | string;
    title: string;
    render?: (item: T) => React.ReactNode;
    width?: string;
    className?: string;
  }
  
  /**
   * Interface pour une carte de statistique
   */
  export interface StatCardProps {
    title: string;
    value: string | number;
    icon?: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'accent1' | 'accent2' | 'accent3' | 'accent4';
    size?: 'sm' | 'md' | 'lg';
    subtitle?: string;
    trend?: {
      value: number;
      label?: string;
      isPositive?: boolean;
    };
  }
  
  /**
   * Interface pour les filtres de recherche des applications
   */
  export interface ApplicationSearchFilters {
    searchTerm: string;
    statut?: 'Projet' | 'Run';
    type?: 'Build' | 'Buy';
    hebergement?: 'Cloud' | 'Prem' | 'Hybrid';
    architecture?: 'ERP' | 'Multitenant SAAS' | 'MVC' | 'Monolithique';
  }
  
  /**
   * Interface pour les filtres de recherche des formulaires
   */
  export interface FormulaireSearchFilters {
    searchTerm: string;
    statut?: 'Brouillon' | 'Soumis' | 'Validé';
    organisation?: string;
    dateDebut?: string;
    dateFin?: string;
  }
  
  /**
   * Interface pour la pagination
   */
  export interface Pagination {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  }
  
  /**
   * Interface pour les options de tri
   */
  export interface SortOptions {
    field: string;
    direction: 'asc' | 'desc';
  }
  
  /**
   * Type pour les réponses API
   */
  export type ApiResponse<T> = {
    success: boolean;
    data?: T;
    error?: string;
    pagination?: Pagination;
  };