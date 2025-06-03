// src/scripts/dataDefinitions.ts
/**
 * Configuration des données à générer
 */
export const CONFIG = {
    NUM_APPLICATIONS_PAR_ORG: 3,     // 3 applications par entreprise
    NUM_FORMULAIRES_PAR_APP: 10,     // 10 formulaires par application
    DATE_DEBUT: new Date('2024-11-01'),
    DATE_FIN: new Date('2025-04-30'),
  };
  
  /**
   * Entreprises du CAC40 pour nos données de test
   */
  export const ENTREPRISES = [
    { nom: 'TotalEnergies', secteur: 'Énergie' },
    { nom: 'LVMH', secteur: 'Luxe' },
    { nom: 'Sanofi', secteur: 'Pharmaceutique' },
    { nom: 'BNP Paribas', secteur: 'Finance' },
    { nom: 'Airbus', secteur: 'Aéronautique' },
    { nom: 'AXA', secteur: 'Assurance' },
    { nom: 'Carrefour', secteur: 'Distribution' },
    { nom: 'Danone', secteur: 'Agroalimentaire' },
    { nom: 'Engie', secteur: 'Énergie' },
    { nom: 'L\'Oréal', secteur: 'Cosmétique' }
  ];
  
  /**
   * Types d'applications possibles
   */
  export const TYPES_APPLICATIONS = [
    { nom: 'CRM Client', statut: 'Run', type: 'Buy', hebergement: 'Cloud', architecture: 'Multitenant SAAS', editeur: 'Salesforce' },
    { nom: 'ERP Finance', statut: 'Run', type: 'Buy', hebergement: 'Prem', architecture: 'ERP', editeur: 'SAP' },
    { nom: 'Portail RH', statut: 'Run', type: 'Buy', hebergement: 'Cloud', architecture: 'Multitenant SAAS', editeur: 'Workday' },
    { nom: 'Site Web Institutionnel', statut: 'Run', type: 'Build', hebergement: 'Cloud', architecture: 'MVC', language: 'JavaScript' },
    { nom: 'Application Mobile', statut: 'Run', type: 'Build', hebergement: 'Cloud', architecture: 'MVC', language: 'Swift/Kotlin' },
    { nom: 'Plateforme Data', statut: 'Run', type: 'Build', hebergement: 'Hybrid', architecture: 'Monolithique', language: 'Python' },
    { nom: 'Système de Gestion Documentaire', statut: 'Run', type: 'Buy', hebergement: 'Cloud', architecture: 'Multitenant SAAS', editeur: 'Microsoft' },
    { nom: 'Intranet', statut: 'Run', type: 'Build', hebergement: 'Prem', architecture: 'MVC', language: 'PHP' },
    { nom: 'Plateforme e-Commerce', statut: 'Projet', type: 'Build', hebergement: 'Cloud', architecture: 'MVC', language: 'Java' },
    { nom: 'Application IoT', statut: 'Projet', type: 'Build', hebergement: 'Hybrid', architecture: 'Monolithique', language: 'C++' },
    { nom: 'Système de Gestion des Stocks', statut: 'Run', type: 'Buy', hebergement: 'Cloud', architecture: 'ERP', editeur: 'Oracle' },
    { nom: 'Plateforme BI', statut: 'Run', type: 'Build', hebergement: 'Cloud', architecture: 'MVC', language: 'Python/R' },
    { nom: 'Système de Gestion de la Chaîne Logistique', statut: 'Run', type: 'Buy', hebergement: 'Prem', architecture: 'ERP', editeur: 'SAP' },
    { nom: 'Application de Suivi Clients', statut: 'Run', type: 'Build', hebergement: 'Cloud', architecture: 'MVC', language: 'JavaScript' },
    { nom: 'Plateforme de Formation', statut: 'Run', type: 'Buy', hebergement: 'Cloud', architecture: 'Multitenant SAAS', editeur: 'Cornerstone' },
    { nom: 'Portail Fournisseurs', statut: 'Run', type: 'Build', hebergement: 'Cloud', architecture: 'MVC', language: 'Java' },
    { nom: 'Système de Gestion des Risques', statut: 'Run', type: 'Buy', hebergement: 'Hybrid', architecture: 'Monolithique', editeur: 'SAS' },
    { nom: 'Plateforme Analytics', statut: 'Projet', type: 'Build', hebergement: 'Cloud', architecture: 'MVC', language: 'Python' },
    { nom: 'Système de Gestion de Contenu', statut: 'Run', type: 'Buy', hebergement: 'Cloud', architecture: 'Multitenant SAAS', editeur: 'Adobe' },
    { nom: 'Application Métier', statut: 'Run', type: 'Build', hebergement: 'Prem', architecture: 'Monolithique', language: 'C#' },
    { nom: 'Plateforme Collaboration', statut: 'Run', type: 'Buy', hebergement: 'Cloud', architecture: 'Multitenant SAAS', editeur: 'Microsoft' },
    { nom: 'Système Comptable', statut: 'Run', type: 'Buy', hebergement: 'Prem', architecture: 'ERP', editeur: 'Sage' },
    { nom: 'Plateforme Marketing', statut: 'Run', type: 'Buy', hebergement: 'Cloud', architecture: 'Multitenant SAAS', editeur: 'Adobe' },
    { nom: 'Système de Gestion de Projets', statut: 'Run', type: 'Buy', hebergement: 'Cloud', architecture: 'Multitenant SAAS', editeur: 'Atlassian' },
    { nom: 'Application R&D', statut: 'Projet', type: 'Build', hebergement: 'Hybrid', architecture: 'MVC', language: 'Java' },
    { nom: 'Plateforme RH', statut: 'Run', type: 'Buy', hebergement: 'Cloud', architecture: 'Multitenant SAAS', editeur: 'Workday' },
    { nom: 'Système de Reporting', statut: 'Run', type: 'Build', hebergement: 'Prem', architecture: 'Monolithique', language: 'Python' },
    { nom: 'Application de Gestion des Ventes', statut: 'Run', type: 'Buy', hebergement: 'Cloud', architecture: 'Multitenant SAAS', editeur: 'Salesforce' },
    { nom: 'Plateforme API', statut: 'Run', type: 'Build', hebergement: 'Cloud', architecture: 'MVC', language: 'Node.js' },
    { nom: 'Système de Supervision IT', statut: 'Run', type: 'Buy', hebergement: 'Hybrid', architecture: 'Monolithique', editeur: 'Dynatrace' }
  ];
  
  /**
   * Rôles possibles pour les acteurs
   */
  export const ROLES = [
    'Développeur', 'Architecte', 'DevOps Engineer', 'Security Engineer', 'Product Owner', 
    'Scrum Master', 'Tech Lead', 'QA Engineer', 'DBA', 'Infrastructure Engineer',
    'CTO', 'CISO', 'DSI', 'Responsable Digital', 'Chef de Projet'
  ];
  
  /**
   * Niveau de maturité par entreprise
   */
  export const PROFIL_MATURITE_ENTREPRISE = {
    'TotalEnergies': 'avancé',
    'LVMH': 'intermédiaire',
    'Sanofi': 'avancé',
    'BNP Paribas': 'intermédiaire',
    'Airbus': 'débutant',
    'AXA': 'avancé',
    'Carrefour': 'intermédiaire',
    'Danone': 'débutant',
    'Engie': 'intermédiaire',
    'L\'Oréal': 'avancé'
  } as const;
  
  /**
   * Structure des thématiques du questionnaire DevSecOps
   */
  export interface Thematique {
    id: number;
    nom: string;
    description: string;
    questions: number;
  }
  
  export const THEMATIQUES: Thematique[] = [
    { id: 1, nom: 'Culture & Collaboration', description: 'Évaluation de la culture collaborative autour de la sécurité', questions: 5 },
    { id: 2, nom: 'Opérations & CI/CD', description: 'Évaluation des pratiques opérationnelles et d\'intégration continue', questions: 8 },
    { id: 3, nom: 'Gestion des vulnérabilités & Sûreté du code', description: 'Évaluation des pratiques de détection et correction des vulnérabilités', questions: 6 },
    { id: 4, nom: 'Gestion des accès & secrets', description: 'Évaluation des pratiques de gestion des accès sécurisés', questions: 5 },
    { id: 5, nom: 'Observabilité & Monitoring', description: 'Évaluation des capacités de surveillance et détection', questions: 5 },
    { id: 6, nom: 'Conformité & Gouvernance', description: 'Évaluation de la conformité et des processus de gouvernance', questions: 5 },
    { id: 7, nom: 'Formation & Sensibilisation', description: 'Évaluation des pratiques de formation à la sécurité', questions: 5 },
    { id: 8, nom: 'Satisfaction Client & Time-to-Market', description: 'Évaluation de l\'impact sur la satisfaction client et le délai de mise sur le marché', questions: 6 },
    { id: 9, nom: 'Industrialisation & Standardisation', description: 'Évaluation des pratiques de standardisation et d\'industrialisation', questions: 5 }
  ];
  
  /**
   * Structure des questions du questionnaire DevSecOps
   */
  export interface Question {
    id: number;
    thematique: string;
    texte: string;
    ponderation: number;
    indicateurs: {
      niveau1: string;
      niveau3: string;
      niveau5: string;
    };
  }
  
  // Les 50 questions du questionnaire DevSecOps
  export const QUESTIONS: Question[] = [
    // Thématique 1: Culture & Collaboration
    { 
      id: 1, 
      thematique: 'Culture & Collaboration', 
      texte: 'Dans quelle mesure la sécurité est-elle considérée comme une responsabilité partagée entre développement, opérations et sécurité ?', 
      ponderation: 2,
      indicateurs: {
        niveau1: 'La sécurité est exclusivement gérée par l\'équipe de sécurité',
        niveau3: 'Collaboration ponctuelle entre équipes sur les questions de sécurité',
        niveau5: 'Culture "security as code" où chaque membre prend sa part de responsabilité'
      }
    },
    { 
      id: 2, 
      thematique: 'Culture & Collaboration', 
      texte: 'Comment évaluez-vous la fréquence et la qualité de la communication entre les équipes Dev, Ops et Sec ?', 
      ponderation: 2,
      indicateurs: {
        niveau1: 'Communication en silos, uniquement lors d\'incidents',
        niveau3: 'Réunions régulières entre équipes mais sans structure définie',
        niveau5: 'Communication fluide et transparente avec canaux dédiés et rituels établis'
      }
    },
    { 
      id: 3, 
      thematique: 'Culture & Collaboration', 
      texte: 'À quel niveau des « Security Champions » sont-ils identifiés et actifs dans les équipes de développement ?', 
      ponderation: 2,
      indicateurs: {
        niveau1: 'Aucun Security Champion identifié',
        niveau3: 'Security Champions nommés mais rôle peu formalisé',
        niveau5: 'Programme de Security Champions mature avec formation continue et reconnaissance'
      }
    },
    { 
      id: 4, 
      thematique: 'Culture & Collaboration', 
      texte: 'Dans quelle mesure les incidents de sécurité sont-ils systématiquement discutés en rétrospective d\'équipe pour en tirer des enseignements ?', 
      ponderation: 2,
      indicateurs: {
        niveau1: 'Pas d\'analyse post-incident formalisée',
        niveau3: 'Analyse effectuée mais partage limité entre équipes',
        niveau5: 'Culture blameless d\'apprentissage avec partage transparent et améliorations systématiques'
      }
    },
    { 
      id: 5, 
      thematique: 'Culture & Collaboration', 
      texte: 'À quel niveau le management soutient-il activement et concrètement les initiatives DevSecOps ?', 
      ponderation: 2,
      indicateurs: {
        niveau1: 'Soutien limité ou uniquement déclaratif',
        niveau3: 'Soutien visible mais ressources limitées',
        niveau5: 'Engagement total avec allocation de ressources dédiées et reconnaissance des initiatives'
      }
    },
  
    // Thématique 2: Opérations & CI/CD
    { 
      id: 6, 
      thematique: 'Opérations & CI/CD', 
      texte: 'Comment évaluez-vous la maturité de vos pratiques de gestion de code source (versioning, branching, etc.) ?', 
      ponderation: 2,
      indicateurs: {
        niveau1: 'Gestion de code basique sans stratégie définie',
        niveau3: 'Stratégie de branching documentée et suivie',
        niveau5: 'GitOps complet avec automatisation et qualité de code intégrée'
      }
    },
    { 
      id: 7, 
      thematique: 'Opérations & CI/CD', 
      texte: 'Dans quelle mesure des outils d\'intégration continue (CI) sont-ils utilisés systématiquement ?', 
      ponderation: 2,
      indicateurs: {
        niveau1: 'Intégration manuelle ou très limitée',
        niveau3: 'CI en place pour les projets majeurs uniquement',
        niveau5: 'CI standardisée pour tous les projets avec métriques de qualité'
      }
    },
    { 
      id: 8, 
      thematique: 'Opérations & CI/CD', 
      texte: 'À quel niveau les pipelines CI/CD intègrent-ils des contrôles de sécurité automatisés ?', 
      ponderation: 2,
      indicateurs: {
        niveau1: 'Pas de contrôles de sécurité dans les pipelines',
        niveau3: 'Quelques contrôles basiques mais non systématiques',
        niveau5: 'Suite complète de contrôles de sécurité automatisés et régulièrement mis à jour'
      }
    },
    { 
      id: 9, 
      thematique: 'Opérations & CI/CD', 
      texte: 'Comment évaluez-vous la maturité de votre gestion de configuration automatisée (Infrastructure as Code) ?', 
      ponderation: 2,
      indicateurs: {
        niveau1: 'Configuration manuelle des environnements',
        niveau3: 'Utilisation partielle d\'IaC avec documentation',
        niveau5: 'IaC complet avec tests, vérifications de sécurité et déploiement immutable'
      }
    },
    { 
      id: 10, 
      thematique: 'Opérations & CI/CD', 
      texte: 'À quel niveau vos processus de déploiement sont-ils automatisés et fiabilisés ?', 
      ponderation: 2,
      indicateurs: {
        niveau1: 'Déploiements principalement manuels avec documentation limitée',
        niveau3: 'Déploiements semi-automatisés avec validation manuelle',
        niveau5: 'Déploiements entièrement automatisés avec rollback automatique et tests de fumée'
      }
    }
    // Les autres questions sont omises pour raccourcir le fichier, mais seraient incluses dans un vrai scénario
  ];
  
  // Grille d'interprétation pour les niveaux de maturité
  export const GRILLE_INTERPRETATION = [
    // Grille globale
    {
      fonction: 'DevSecOps-Global',
      score_min: 0,
      score_max: 1.5,
      niveau: 'Niveau 1 - Initial',
      description: 'La démarche DevSecOps est embryonnaire. Les pratiques de sécurité sont réactives et souvent perçues comme un frein à la livraison.',
      recommandations: 'Priorité à la sensibilisation et à la formation des équipes. Établir les fondations avec une automatisation progressive et des quick-wins visibles.'
    },
    {
      fonction: 'DevSecOps-Global',
      score_min: 1.5,
      score_max: 2.5,
      niveau: 'Niveau 2 - Défini',
      description: 'Des processus formalisés sont en place mais leur application reste inégale. La sécurité est prise en compte mais tardivement dans le cycle.',
      recommandations: 'Renforcer l\'intégration de la sécurité dans les pipelines, développer le partage de connaissance entre équipes et standardiser les pratiques.'
    },
    {
      fonction: 'DevSecOps-Global',
      score_min: 2.5,
      score_max: 3.5,
      niveau: 'Niveau 3 - Mesuré',
      description: 'Les pratiques DevSecOps sont largement adoptées et mesurées. La sécurité est intégrée mais peut encore créer des frictions.',
      recommandations: 'Automatiser davantage les contrôles, améliorer l\'observabilité et renforcer la culture d\'amélioration continue basée sur les métriques.'
    },
    {
      fonction: 'DevSecOps-Global',
      score_min: 3.5,
      score_max: 4.5,
      niveau: 'Niveau 4 - Géré',
      description: 'L\'organisation dispose d\'une approche mature avec automatisation avancée et intégration profonde de la sécurité dans les processus.',
      recommandations: 'Perfectionner l\'orchestration des outils, développer des mécanismes prédictifs et partager les bonnes pratiques à l\'échelle de l\'organisation.'
    },
    {
      fonction: 'DevSecOps-Global',
      score_min: 4.5,
      score_max: 5,
      niveau: 'Niveau 5 - Optimisé',
      description: 'Excellence opérationnelle avec une sécurité parfaitement intégrée, automatisée et adaptative. La culture de responsabilité partagée est établie.',
      recommandations: 'Maintenir l\'excellence par l\'innovation continue, le mentoring externe et le développement de frameworks propriétaires. Contribuer à l\'écosystème DevSecOps.'
    }
  ];