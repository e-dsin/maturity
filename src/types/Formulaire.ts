/**
 * Interface pour les formulaires d'évaluation
 */
export interface Formulaire {
    id_formulaire: string;
    id_acteur: string;
    acteur_nom: string;
    id_application: string;
    nom_application: string;
    id_questionnaire: string;
    questionnaire_titre: string;
    thematique: string;
    date_creation: string;
    date_modification: string;
    statut: 'Brouillon' | 'Soumis' | 'Validé';
    progression?: number;
  }
  
  /**
   * Interface pour la création d'un nouveau formulaire
   */
  export interface CreateFormulaireRequest {
    id_acteur: string;
    id_application: string;
    id_questionnaire: string;
    statut?: 'Brouillon' | 'Soumis' | 'Validé';
  }
  
  /**
   * Interface pour la mise à jour d'un formulaire
   */
  export interface UpdateFormulaireRequest {
    statut: 'Brouillon' | 'Soumis' | 'Validé';
  }
  
  /**
   * Interface pour les réponses du formulaire
   */
  export interface Reponse {
    id_reponse: string;
    id_formulaire: string;
    id_question: string;
    question_texte?: string;
    valeur_reponse: string;
    score: number;
    commentaire?: string;
  }
  
  /**
   * Interface pour la création/mise à jour d'une réponse
   */
  export interface ReponseRequest {
    id_formulaire: string;
    id_question: string;
    valeur_reponse: string;
    score: number;
    commentaire?: string;
  }