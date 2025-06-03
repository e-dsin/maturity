// src/pages/dashboard/types/AnalysesTypes.ts
export interface Thematique {
    thematique: string;
    score: number;
    id_score?: string;
    nombre_reponses?: number;
    niveau?: string;
    description?: string;
    recommandations?: string;
  }
  
  export interface Analyse {
    id_analyse: string;
    id_application: string;
    nom_application?: string;
    nom?: string;
    date_analyse: string;
    score_global?: number;
    scoreGlobal?: number;
    thematiques?: Thematique[];
    organisation?: string;
  }
  
  export interface Application {
    id_application: string;
    nom_application: string;
  }
  
  export interface Interpretation {
    niveau: string;
    description: string;
    recommandations: string;
    score: number;
  }

  export interface Entreprise {
    id_entreprise: string;
    nom_entreprise: string;
    secteur: string;
  }
  
  export interface InterpretationSummary {
    id_analyse: string;
    id_entreprise?: string;
    id_application: string;
    nom_application: string;
    score_global: number;
    niveau_global: string;
    description_globale: string;
    recommandations_globales: string;
    date_analyse: string;
    organisation?: string;
  }
  
  export interface HistoriqueScore {
    id_historique: string;
    id_application: string;
    thematique: string;
    score: number;
    date_mesure: string;
  }
  
  export interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
  }
  
  export interface FilterState {
    application: string;
    niveau: string;
    organisation: string;
    scoreMin: string;
    scoreMax: string;
  }
  
  export interface AnalysesInterpretationsUIProps {
    loading: boolean;
    error: string | null;
    applications: Application[];
    selectedApplication: string;
    analyses: Analyse[];
    selectedAnalyse: Analyse | null;
    interpretation: Interpretation | null;
    historique: HistoriqueScore[];
    filteredHistorique: HistoriqueScore[];
    selectedEntreprise: string;
    entreprises: Entreprise[];
    tabValue: number;
    selectedThematique: string;
    openDialog: boolean;
    newAnalyseData: { id_application: string, thematiques: Thematique[] };
    interpretationsSummary: InterpretationSummary[];
    page: number;
    rowsPerPage: number;
    order: 'asc' | 'desc';
    orderBy: keyof InterpretationSummary;
    searchTerm: string;
    filters: FilterState;
    showFilters: boolean;
    uniqueThematiques: string[];
    handleApplicationChange: (event: React.ChangeEvent<{ value: unknown }>) => void;
    handleEntrepriseChange: (event: React.ChangeEvent<{ value: unknown }>) => void;
    handleAnalyseChange: (analyse: Analyse) => void;
    handleThematiqueChange: (event: React.ChangeEvent<{ value: unknown }>) => void;
    handleTabChange: (event: React.SyntheticEvent, newValue: number) => void;
    handleOpenNewAnalyseDialog: () => void;
    handleCloseDialog: () => void;
    addThematique: () => void;
    updateThematique: (index: number, field: keyof Thematique, value: any) => void;
    removeThematique: (index: number) => void;
    createNewAnalyse: () => void;
    calculateNewAnalyse: () => void;
    getScoreGlobal: () => string;
    prepareHistoriqueData: () => any[];
    handleChangePage: (event: unknown, newPage: number) => void;
    handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleRequestSort: (property: keyof InterpretationSummary) => void;
    getFilteredData: () => InterpretationSummary[];
    getUniqueValues: (field: keyof InterpretationSummary) => unknown[];
    setSearchTerm: (term: string) => void;
    setFilters: (filters: FilterState) => void;
    setShowFilters: (show: boolean) => void;
    fetchAllInterpretations: () => Promise<void>;
    fetchAnalysesByApplication: (appId: string) => void;
    fetchAnalysesByEntreprise: (entrepriseId: string) => void; 
    fetchHistoriqueByEntreprise: (entrepriseId: string) => void;
  }