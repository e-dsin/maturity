// Types de base
export interface Acteur {
  IdActeur: string;
  NomPrenom: string;
  Role: string;
  Organisation: string;
  AncienneteRole: number;
}

export enum ApplicationStatut {
  Projet = 'Projet',
  Run = 'Run'
}

export enum ApplicationType {
  Build = 'Build',
  Buy = 'Buy'
}

export enum HebergementType {
  Cloud = 'Cloud',
  Prem = 'Prem',
  Hybrid = 'Hybrid'
}

export enum ArchiLogicielleType {
  Cloud = 'ERP',
  Prem = 'Multitenant SAAS',
  Hybrid = 'Monolithique'
}

export interface Application {
  IdApplication: string;
  NomApplication: string;
  Statut: ApplicationStatut;
  Type: ApplicationType;
  Hebergement: HebergementType;
  ArchitectureLogicielle: ArchiLogicielleType;
  DateMiseEnProd: string;
  Language: string;
  Editeur: string;
}

export interface Questionnaire {
  IdQuestionnaire: string;
  Fonction: string;
  Thematique: string;
}

export interface Question {
  IdQuestion: string;
  IdQuestionnaire: string;
  Texte: string;
  Ponderation: number;
}

export interface Formulaire {
  IdFormulaire: string;
  IdActeur: string;
  IdApplication: string;
  IdQuestionnaire: string;
  DateCreation: string;
  DateModification: string;
}

export interface Reponse {
  IdReponse: string;
  IdFormulaire: string;
  IdQuestion: string;
  ValeurReponse: string;
  Score: number;
}

// Types composites pour les analyses
export interface MaturityAnalysis {
  application: Application;
  scores: {
    thematique: string;
    score: number;
  }[];
}

export interface ThematiqueScore {
  thematique: string;
  averageScore: number;
  totalResponses: number;
}

