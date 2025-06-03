// server/types/maturity-model.js

// Fonction utilitaire pour normaliser les chaînes
function normalizeString(str) {
  if (!str) return '';
  return str.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Enlever les accents
    .replace(/[^a-z0-9]/g, "_") // Remplacer les caractères spéciaux par _
    .trim();
}

// Mapping des alias pour les noms de fonctions
const FONCTION_ALIASES = {
  // Cybersécurité
  'cybersecurite': 'cybersecurite',
  'cybersécurité': 'cybersecurite',
  'cyber_securite': 'cybersecurite',
  'cyber': 'cybersecurite',
  
  // DevSecOps
  'devsecops': 'devsecops',
  'dev_sec_ops': 'devsecops',
  'dev-sec-ops': 'devsecops',
  
  // Modèle Opérationnel
  'modele_operationnel': 'modele_operationnel',
  'modèle_opérationnel': 'modele_operationnel',
  'modele operationnel': 'modele_operationnel',
  'modèle opérationnel': 'modele_operationnel',
  'model_operationnel': 'modele_operationnel',
  
  // Gouvernance SI
  'gouvernance_si': 'gouvernance_si',
  'gouvernance si': 'gouvernance_si',
  'gouvernance': 'gouvernance_si',
  'gov_si': 'gouvernance_si',
  
  // Acculturation Data
  'acculturation_data': 'acculturation_data',
  'acculturation data': 'acculturation_data',
  'data': 'acculturation_data',
  'acculturation': 'acculturation_data'
};

// Définition des fonctions d'évaluation
const FONCTIONS = [
  {
    id: "devsecops",
    nom: "DevSecOps",
    description: "Évaluation de la maturité des pratiques DevSecOps",
    ordre: 1,
    thematiques: [],  // Sera rempli plus bas
    niveauxGlobaux: []  // Sera rempli plus bas
  },
  {
    id: "cybersecurite",
    nom: "Cybersécurité",
    description: "Évaluation des pratiques et processus de cybersécurité",
    ordre: 2,
    thematiques: [],  // Sera rempli plus bas
    niveauxGlobaux: []  // Sera rempli plus bas
  },
  {
    id: "modele_operationnel",
    nom: "Modèle Opérationnel",
    description: "Évaluation de l'efficacité du modèle opérationnel IT",
    ordre: 3,
    thematiques: [],  // Sera rempli plus bas
    niveauxGlobaux: []  // Sera rempli plus bas
  },
  {
    id: "gouvernance_si",
    nom: "Gouvernance SI",
    description: "Évaluation des pratiques de gouvernance du système d'information",
    ordre: 4,
    thematiques: [],  // Sera rempli plus bas
    niveauxGlobaux: []  // Sera rempli plus bas
  },
  {
    id: "acculturation_data",
    nom: "Acculturation Data",
    description: "Évaluation de la maturité dans l'exploitation et la valorisation des données",
    ordre: 5,
    thematiques: [],  // Sera rempli plus bas
    niveauxGlobaux: []  // Sera rempli plus bas
  }
];

// Thématiques pour DevSecOps
const THEMATIQUES_DEVSECOPS = [
  { 
    id: "devsecops_culture", 
    id_fonction: "devsecops", 
    nom: "Culture & Collaboration", 
    description: "Évaluation de la culture collaborative autour de la sécurité", 
    nombreQuestions: 5 
  },
  { 
    id: "devsecops_operations", 
    id_fonction: "devsecops", 
    nom: "Opérations & CI/CD", 
    description: "Évaluation des pratiques opérationnelles et d'intégration continue", 
    nombreQuestions: 8 
  },
  { 
    id: "devsecops_vulnerabilities", 
    id_fonction: "devsecops", 
    nom: "Gestion des vulnérabilités & Sûreté du code", 
    description: "Évaluation des pratiques de détection et correction des vulnérabilités", 
    nombreQuestions: 6 
  },
  { 
    id: "devsecops_access", 
    id_fonction: "devsecops", 
    nom: "Gestion des accès & secrets", 
    description: "Évaluation des pratiques de gestion des accès sécurisés", 
    nombreQuestions: 5 
  },
  { 
    id: "devsecops_observability", 
    id_fonction: "devsecops", 
    nom: "Observabilité & Monitoring", 
    description: "Évaluation des capacités de surveillance et détection", 
    nombreQuestions: 5 
  },
  { 
    id: "devsecops_compliance", 
    id_fonction: "devsecops", 
    nom: "Conformité & Gouvernance", 
    description: "Évaluation de la conformité et des processus de gouvernance", 
    nombreQuestions: 5 
  },
  { 
    id: "devsecops_training", 
    id_fonction: "devsecops", 
    nom: "Formation & Sensibilisation", 
    description: "Évaluation des pratiques de formation à la sécurité", 
    nombreQuestions: 5 
  },
  { 
    id: "devsecops_satisfaction", 
    id_fonction: "devsecops", 
    nom: "Satisfaction Client & Time-to-Market", 
    description: "Évaluation de l'impact sur la satisfaction client et le délai de mise sur le marché", 
    nombreQuestions: 6 
  },
  { 
    id: "devsecops_industrialization", 
    id_fonction: "devsecops", 
    nom: "Industrialisation & Standardisation", 
    description: "Évaluation des pratiques de standardisation et d'industrialisation", 
    nombreQuestions: 5 
  }
];

// Thématiques pour Cybersécurité
const THEMATIQUES_CYBERSECURITE = [
  { 
    id: "cyber_governance", 
    id_fonction: "cybersecurite", 
    nom: "Gouvernance de Sécurité", 
    description: "Évaluation des politiques et de la gouvernance de sécurité", 
    nombreQuestions: 6 
  },
  { 
    id: "cyber_risk", 
    id_fonction: "cybersecurite", 
    nom: "Gestion des Risques", 
    description: "Évaluation des processus d'identification et de gestion des risques", 
    nombreQuestions: 5 
  },
  { 
    id: "cyber_identity", 
    id_fonction: "cybersecurite", 
    nom: "Gestion des Identités", 
    description: "Évaluation des pratiques de gestion des identités et des accès", 
    nombreQuestions: 7 
  },
  { 
    id: "cyber_protection", 
    id_fonction: "cybersecurite", 
    nom: "Protection des Données", 
    description: "Évaluation des mesures de protection des données sensibles", 
    nombreQuestions: 6 
  },
  { 
    id: "cyber_detection", 
    id_fonction: "cybersecurite", 
    nom: "Détection & Réponse", 
    description: "Évaluation des capacités de détection et de réponse aux incidents", 
    nombreQuestions: 8 
  },
  { 
    id: "cyber_resilience", 
    id_fonction: "cybersecurite", 
    nom: "Résilience & Continuité", 
    description: "Évaluation de la résilience et des plans de continuité", 
    nombreQuestions: 5 
  },
  { 
    id: "cyber_supply", 
    id_fonction: "cybersecurite", 
    nom: "Chaîne d'Approvisionnement", 
    description: "Évaluation de la sécurité de la chaîne d'approvisionnement", 
    nombreQuestions: 5 
  },
  { 
    id: "cyber_awareness", 
    id_fonction: "cybersecurite", 
    nom: "Culture & Sensibilisation", 
    description: "Évaluation de la culture de sécurité et des programmes de sensibilisation", 
    nombreQuestions: 5 
  }
];

// Thématiques pour Modèle Opérationnel
const THEMATIQUES_MODELE_OPERATIONNEL = [
  { 
    id: "ops_structure", 
    id_fonction: "modele_operationnel", 
    nom: "Structure Organisationnelle", 
    description: "Évaluation de l'efficacité de la structure organisationnelle IT", 
    nombreQuestions: 5 
  },
  { 
    id: "ops_processes", 
    id_fonction: "modele_operationnel", 
    nom: "Processus & Méthodes", 
    description: "Évaluation de la maturité des processus et méthodes de travail", 
    nombreQuestions: 7 
  },
  { 
    id: "ops_service", 
    id_fonction: "modele_operationnel", 
    nom: "Gestion des Services", 
    description: "Évaluation des pratiques de gestion des services IT", 
    nombreQuestions: 6 
  },
  { 
    id: "ops_performance", 
    id_fonction: "modele_operationnel", 
    nom: "Performance & Mesure", 
    description: "Évaluation des mécanismes de mesure et d'amélioration de la performance", 
    nombreQuestions: 5 
  },
  { 
    id: "ops_sourcing", 
    id_fonction: "modele_operationnel", 
    nom: "Stratégie de Sourcing", 
    description: "Évaluation de la stratégie d'approvisionnement et de gestion des fournisseurs", 
    nombreQuestions: 5 
  },
  { 
    id: "ops_transformation", 
    id_fonction: "modele_operationnel", 
    nom: "Transformation & Agilité", 
    description: "Évaluation de la capacité à s'adapter et se transformer", 
    nombreQuestions: 6 
  },
  { 
    id: "ops_automation", 
    id_fonction: "modele_operationnel", 
    nom: "Automatisation & Efficacité", 
    description: "Évaluation du niveau d'automatisation et d'efficacité opérationnelle", 
    nombreQuestions: 6 
  }
];

// Thématiques pour Gouvernance SI
const THEMATIQUES_GOUVERNANCE_SI = [
  { 
    id: "gouv_alignment", 
    id_fonction: "gouvernance_si", 
    nom: "Alignement Stratégique", 
    description: "Évaluation de l'alignement du SI avec la stratégie d'entreprise", 
    nombreQuestions: 5 
  },
  { 
    id: "gouv_portfolio", 
    id_fonction: "gouvernance_si", 
    nom: "Gestion de Portefeuille", 
    description: "Évaluation des pratiques de gestion du portefeuille de projets et d'applications", 
    nombreQuestions: 6 
  },
  { 
    id: "gouv_architecture", 
    id_fonction: "gouvernance_si", 
    nom: "Architecture d'Entreprise", 
    description: "Évaluation de la maturité de l'architecture d'entreprise", 
    nombreQuestions: 7 
  },
  { 
    id: "gouv_investment", 
    id_fonction: "gouvernance_si", 
    nom: "Investissements & Valeur", 
    description: "Évaluation de la gestion des investissements et de la création de valeur", 
    nombreQuestions: 5 
  },
  { 
    id: "gouv_risks", 
    id_fonction: "gouvernance_si", 
    nom: "Gestion des Risques SI", 
    description: "Évaluation des pratiques de gestion des risques liés au SI", 
    nombreQuestions: 6 
  },
  { 
    id: "gouv_compliance", 
    id_fonction: "gouvernance_si", 
    nom: "Conformité & Régulation", 
    description: "Évaluation de la conformité aux réglementations et standards", 
    nombreQuestions: 5 
  },
  { 
    id: "gouv_performance", 
    id_fonction: "gouvernance_si", 
    nom: "Performance & Mesure", 
    description: "Évaluation des processus de mesure et de pilotage de la performance", 
    nombreQuestions: 5 
  }
];

// Thématiques pour Acculturation Data
const THEMATIQUES_ACCULTURATION_DATA = [
  { 
    id: "data_strategy", 
    id_fonction: "acculturation_data", 
    nom: "Stratégie Data", 
    description: "Évaluation de la vision et stratégie de valorisation des données", 
    nombreQuestions: 5 
  },
  { 
    id: "data_governance", 
    id_fonction: "acculturation_data", 
    nom: "Gouvernance des Données", 
    description: "Évaluation des pratiques de gouvernance et de qualité des données", 
    nombreQuestions: 7 
  },
  { 
    id: "data_architecture", 
    id_fonction: "acculturation_data", 
    nom: "Architecture Data", 
    description: "Évaluation de l'architecture de données et des plateformes analytiques", 
    nombreQuestions: 6 
  },
  { 
    id: "data_skills", 
    id_fonction: "acculturation_data", 
    nom: "Compétences & Culture", 
    description: "Évaluation des compétences data et de la culture data-driven", 
    nombreQuestions: 6 
  },
  { 
    id: "data_analytics", 
    id_fonction: "acculturation_data", 
    nom: "Analytique & BI", 
    description: "Évaluation de la maturité en analytique et business intelligence", 
    nombreQuestions: 7 
  },
  { 
    id: "data_ai", 
    id_fonction: "acculturation_data", 
    nom: "IA & Advanced Analytics", 
    description: "Évaluation de l'utilisation de l'IA et des analyses avancées", 
    nombreQuestions: 5 
  },
  { 
    id: "data_ethics", 
    id_fonction: "acculturation_data", 
    nom: "Éthique & Responsabilité", 
    description: "Évaluation des pratiques éthiques et responsables de l'utilisation des données", 
    nombreQuestions: 5 
  },
  { 
    id: "data_monetization", 
    id_fonction: "acculturation_data", 
    nom: "Monétisation & Valeur", 
    description: "Évaluation des capacités à valoriser et monétiser les données", 
    nombreQuestions: 5 
  }
];

// Niveaux globaux pour chaque fonction
const NIVEAUX_GLOBAUX_DEVSECOPS = [
  {
    id: "devsecops_n1",
    fonction: "devsecops",
    score_min: 0,
    score_max: 1.5,
    niveau: "Niveau 1 - Initial",
    description: "La démarche DevSecOps est embryonnaire. Les pratiques de sécurité sont réactives et souvent perçues comme un frein à la livraison.",
    recommandations: "Priorité à la sensibilisation et à la formation des équipes. Établir les fondations avec une automatisation progressive et des quick-wins visibles."
  },
  {
    id: "devsecops_n2",
    fonction: "devsecops",
    score_min: 1.5,
    score_max: 2.5,
    niveau: "Niveau 2 - Défini",
    description: "Des processus formalisés sont en place mais leur application reste inégale. La sécurité est prise en compte mais tardivement dans le cycle.",
    recommandations: "Renforcer l'intégration de la sécurité dans les pipelines, développer le partage de connaissance entre équipes et standardiser les pratiques."
  },
  {
    id: "devsecops_n3",
    fonction: "devsecops",
    score_min: 2.5,
    score_max: 3.5,
    niveau: "Niveau 3 - Mesuré",
    description: "Les pratiques DevSecOps sont largement adoptées et mesurées. La sécurité est intégrée mais peut encore créer des frictions.",
    recommandations: "Automatiser davantage les contrôles, améliorer l'observabilité et renforcer la culture d'amélioration continue basée sur les métriques."
  },
  {
    id: "devsecops_n4",
    fonction: "devsecops",
    score_min: 3.5,
    score_max: 4.5,
    niveau: "Niveau 4 - Géré",
    description: "L'organisation dispose d'une approche mature avec automatisation avancée et intégration profonde de la sécurité dans les processus.",
    recommandations: "Perfectionner l'orchestration des outils, développer des mécanismes prédictifs et partager les bonnes pratiques à l'échelle de l'organisation."
  },
  {
    id: "devsecops_n5",
    fonction: "devsecops",
    score_min: 4.5,
    score_max: 5.0,
    niveau: "Niveau 5 - Optimisé",
    description: "Excellence opérationnelle avec une sécurité parfaitement intégrée, automatisée et adaptative. La culture de responsabilité partagée est établie.",
    recommandations: "Maintenir l'excellence par l'innovation continue, le mentoring externe et le développement de frameworks propriétaires. Contribuer à l'écosystème DevSecOps."
  }
];

// Niveaux globaux pour Cybersécurité
const NIVEAUX_GLOBAUX_CYBERSECURITE = [
  {
    id: "cyber_n1",
    fonction: "cybersecurite",
    score_min: 0,
    score_max: 1.5,
    niveau: "Niveau 1 - Initial",
    description: "Approche réactive de la cybersécurité. Peu de contrôles formalisés. Réponse principalement après incidents.",
    recommandations: "Établir un cadre de gouvernance basique. Identifier et protéger les actifs critiques. Former les équipes aux fondamentaux de la sécurité."
  },
  {
    id: "cyber_n2",
    fonction: "cybersecurite",
    score_min: 1.5,
    score_max: 2.5,
    niveau: "Niveau 2 - Défini",
    description: "Contrôles de sécurité documentés mais application inégale. Processus définis mais avec des gaps. Approche encore largement réactive.",
    recommandations: "Formaliser une politique de sécurité complète. Mettre en place une gestion des vulnérabilités. Améliorer la sensibilisation à tous les niveaux."
  },
  {
    id: "cyber_n3",
    fonction: "cybersecurite",
    score_min: 2.5,
    score_max: 3.5,
    niveau: "Niveau 3 - Mesuré",
    description: "Contrôles de sécurité largement implémentés et surveillés. Processus cohérents. Début d'approche proactive.",
    recommandations: "Améliorer la détection et la réponse aux incidents. Implémenter une gestion des risques plus formelle. Renforcer les tests de sécurité."
  },
  {
    id: "cyber_n4",
    fonction: "cybersecurite",
    score_min: 3.5,
    score_max: 4.5,
    niveau: "Niveau 4 - Géré",
    description: "Programme de sécurité mature avec des mesures quantitatives. Approche proactive. Intégration profonde des contrôles dans les processus.",
    recommandations: "Optimiser la réponse aux incidents. Développer des analyses avancées de menaces. Renforcer la résilience et la gestion de crise."
  },
  {
    id: "cyber_n5",
    fonction: "cybersecurite",
    score_min: 4.5,
    score_max: 5.0,
    niveau: "Niveau 5 - Optimisé",
    description: "Excellence en cybersécurité. Amélioration continue basée sur l'analyse prédictive. Culture de sécurité forte à tous les niveaux.",
    recommandations: "Maintenir l'excellence par l'innovation. Développer des capacités d'anticipation des menaces. Partager les bonnes pratiques avec l'écosystème."
  }
];

// Niveaux globaux pour Modèle Opérationnel
const NIVEAUX_GLOBAUX_MODELE_OPERATIONNEL = [
  {
    id: "ops_n1",
    fonction: "modele_operationnel",
    score_min: 0,
    score_max: 1.5,
    niveau: "Niveau 1 - Initial",
    description: "Organisation en silos avec des processus majoritairement informels. Forte dépendance aux individus clés.",
    recommandations: "Formaliser les processus de base. Clarifier les rôles et responsabilités. Identifier les opportunités d'amélioration rapide."
  },
  {
    id: "ops_n2",
    fonction: "modele_operationnel",
    score_min: 1.5,
    score_max: 2.5,
    niveau: "Niveau 2 - Défini",
    description: "Processus documentés mais appliqués de façon inégale. Coordination limitée entre équipes. Mesure de performance partielle.",
    recommandations: "Standardiser les processus. Améliorer la coordination cross-fonctionnelle. Développer des indicateurs de performance cohérents."
  },
  {
    id: "ops_n3",
    fonction: "modele_operationnel",
    score_min: 2.5,
    score_max: 3.5,
    niveau: "Niveau 3 - Mesuré",
    description: "Processus bien définis et mesurés. Coordination efficace. Début d'automatisation des tâches répétitives.",
    recommandations: "Accélérer l'automatisation. Optimiser les processus basés sur les métriques. Développer une culture d'amélioration continue."
  },
  {
    id: "ops_n4",
    fonction: "modele_operationnel",
    score_min: 3.5,
    score_max: 4.5,
    niveau: "Niveau 4 - Géré",
    description: "Modèle opérationnel mature avec forte automatisation. Alignement étroit avec les objectifs business. Agilité organisationnelle.",
    recommandations: "Optimiser la chaîne de valeur end-to-end. Améliorer l'innovation organisationnelle. Raffiner la mesure de performance."
  },
  {
    id: "ops_n5",
    fonction: "modele_operationnel",
    score_min: 4.5,
    score_max: 5.0,
    niveau: "Niveau 5 - Optimisé",
    description: "Excellence opérationnelle avec optimisation continue. Organisation adaptative capable d'anticiper les changements du marché.",
    recommandations: "Maintenir l'excellence par l'innovation organisationnelle. Explorer les nouvelles technologies disruptives. Devenir un benchmark du secteur."
  }
];

// Niveaux globaux pour Gouvernance SI
const NIVEAUX_GLOBAUX_GOUVERNANCE_SI = [
  {
    id: "gouv_n1",
    fonction: "gouvernance_si",
    score_min: 0,
    score_max: 1.5,
    niveau: "Niveau 1 - Initial",
    description: "Gouvernance SI ad hoc avec peu de processus formalisés. Décisions prises au cas par cas. Faible alignement avec la stratégie d'entreprise.",
    recommandations: "Établir un cadre de gouvernance basique. Formaliser les processus de priorisation. Améliorer la visibilité sur les décisions SI."
  },
  {
    id: "gouv_n2",
    fonction: "gouvernance_si",
    score_min: 1.5,
    score_max: 2.5,
    niveau: "Niveau 2 - Défini",
    description: "Cadre de gouvernance défini mais application inégale. Processus documentés mais gaps significatifs. Alignement partiel avec le business.",
    recommandations: "Consolider les processus de gouvernance. Améliorer les mécanismes de reporting. Renforcer l'alignement stratégique."
  },
  {
    id: "gouv_n3",
    fonction: "gouvernance_si",
    score_min: 2.5,
    score_max: 3.5,
    niveau: "Niveau 3 - Mesuré",
    description: "Gouvernance SI établie avec processus cohérents et mesurés. Bon alignement stratégique. Gestion de portefeuille efficace.",
    recommandations: "Optimiser les processus de prise de décision. Améliorer la gestion de la valeur. Renforcer la gouvernance des données."
  },
  {
    id: "gouv_n4",
    fonction: "gouvernance_si",
    score_min: 3.5,
    score_max: 4.5,
    niveau: "Niveau 4 - Géré",
    description: "Gouvernance SI mature avec mesures quantitatives. Excellent alignement stratégique. Processus d'optimisation continus.",
    recommandations: "Affiner la mesure de la valeur. Optimiser l'allocation des ressources. Développer des mécanismes prédictifs d'alignement."
  },
  {
    id: "gouv_n5",
    fonction: "gouvernance_si",
    score_min: 4.5,
    score_max: 5.0,
    niveau: "Niveau 5 - Optimisé",
    description: "Excellence en gouvernance SI. Le SI est un moteur d'innovation et de transformation pour l'entreprise. Optimisation continue.",
    recommandations: "Maintenir l'excellence par l'innovation en gouvernance. Explorer les technologies émergentes. Partager les meilleures pratiques."
  }
];

// Niveaux globaux pour Acculturation Data
const NIVEAUX_GLOBAUX_ACCULTURATION_DATA = [
  {
    id: "data_n1",
    fonction: "acculturation_data",
    score_min: 0,
    score_max: 1.5,
    niveau: "Niveau 1 - Initial",
    description: "Utilisation limitée des données. Silos d'information. Peu de compétences analytiques. Décisions rarement basées sur les données.",
    recommandations: "Créer une vision data claire. Identifier des use cases à valeur rapide. Former aux fondamentaux de la data literacy."
  },
  {
    id: "data_n2",
    fonction: "acculturation_data",
    score_min: 1.5,
    score_max: 2.5,
    niveau: "Niveau 2 - Défini",
    description: "Quelques initiatives data formalisées. Début de gouvernance. Compétences analytiques dans des poches isolées. Utilisation basique de BI.",
    recommandations: "Développer une stratégie data cohérente. Améliorer la qualité et l'accessibilité des données. Étendre les compétences analytiques."
  },
  {
    id: "data_n3",
    fonction: "acculturation_data",
    score_min: 2.5,
    score_max: 3.5,
    niveau: "Niveau 3 - Mesuré",
    description: "Utilisation significative des données dans la prise de décision. Bonne gouvernance data. Compétences analytiques répandues.",
    recommandations: "Développer des capacités d'analytique avancée. Améliorer l'intégration des données. Renforcer la culture data-driven."
  },
  {
    id: "data_n4",
    fonction: "acculturation_data",
    score_min: 3.5,
    score_max: 4.5,
    niveau: "Niveau 4 - Géré",
    description: "Organisation fortement data-driven. Utilisation répandue de l'analytique avancée. Gouvernance mature. Création de valeur mesurable.",
    recommandations: "Développer des capacités d'IA et d'analyse prédictive. Optimiser la monétisation des données. Automatiser les flux data et insights."
  },
  {
    id: "data_n5",
    fonction: "acculturation_data",
    score_min: 4.5,
    score_max: 5.0,
    niveau: "Niveau 5 - Optimisé",
    description: "Excellence en exploitation des données. IA et analytique avancée intégrées aux processus métier. Culture data omniprésente.",
    recommandations: "Maintenir l'excellence par l'innovation continue. Explorer les nouvelles frontières comme l'IA générative. Contribuer à l'écosystème data."
  }
];

// Configuration des niveaux thématiques pour toutes les fonctions
const NIVEAUX_THEMATIQUES = [
  // DEVSECOPS - THÉMATIQUES
  
  // Culture & Collaboration
  {
    id: "cult_collab_low",
    fonction: "devsecops",
    thematique: "Culture & Collaboration",
    score_min: 0,
    score_max: 1.5,
    niveau: "Culture & Collaboration - Faible",
    description: "Les équipes travaillent en silos avec peu de partage de responsabilité concernant la sécurité. Communication limitée et réactive.",
    recommandations: "Organiser des ateliers inter-équipes. Mettre en place des réunions régulières Dev-Ops-Sec. Désigner des ambassadeurs sécurité dans chaque équipe."
  },
  {
    id: "cult_collab_mid",
    fonction: "devsecops",
    thematique: "Culture & Collaboration",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Culture & Collaboration - Intermédiaire",
    description: "Collaboration ponctuelle entre les équipes. Security Champions identifiés mais rôle peu formalisé. Communication existante mais non structurée.",
    recommandations: "Formaliser le rôle des Security Champions. Établir des rituels de communication réguliers. Mettre en place des rétrospectives d'incidents communes."
  },
  {
    id: "cult_collab_high",
    fonction: "devsecops",
    thematique: "Culture & Collaboration",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Culture & Collaboration - Avancé",
    description: "Culture \"security as code\" établie où chaque membre prend sa part de responsabilité. Communication fluide et transparente avec canaux dédiés.",
    recommandations: "Partager cette culture avec d'autres équipes. Mettre en place un programme de reconnaissance. Former les nouveaux arrivants à cette culture collaborative."
  },
  
  // Opérations & CI/CD
  {
    id: "ops_cicd_low",
    fonction: "devsecops",
    thematique: "Opérations & CI/CD",
    score_min: 0,
    score_max: 1.5,
    niveau: "Opérations & CI/CD - Faible",
    description: "Processus de déploiement principalement manuels. Peu d'automatisation. Contrôles de sécurité absents des pipelines.",
    recommandations: "Mettre en place une intégration continue basique. Automatiser les tests unitaires. Introduire des scans de vulnérabilités simples."
  },
  {
    id: "ops_cicd_mid",
    fonction: "devsecops",
    thematique: "Opérations & CI/CD",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Opérations & CI/CD - Intermédiaire",
    description: "CI en place pour les projets majeurs. Déploiements semi-automatisés. Quelques contrôles de sécurité mais non systématiques.",
    recommandations: "Étendre CI/CD à tous les projets. Standardiser les pipelines avec security gates. Implémenter Infrastructure as Code."
  },
  {
    id: "ops_cicd_high",
    fonction: "devsecops",
    thematique: "Opérations & CI/CD",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Opérations & CI/CD - Avancé",
    description: "CI/CD complet et automatisé. Suite complète de contrôles de sécurité. IaC avec tests et vérifications. Déploiements entièrement automatisés.",
    recommandations: "Optimiser les performances des pipelines. Explorer le continuous deployment. Mettre en place des mécanismes de rollback automatisés en cas d'anomalie."
  },
  
  // Gestion des vulnérabilités & Sûreté du code
  {
    id: "vuln_code_low",
    fonction: "devsecops",
    thematique: "Gestion des vulnérabilités & Sûreté du code",
    score_min: 0,
    score_max: 1.5,
    niveau: "Vulnérabilités & Code - Faible",
    description: "Absence de mécanismes systématiques de détection des vulnérabilités. Analyses de sécurité manuelles et rares.",
    recommandations: "Mettre en place des outils SAST/DAST de base. Initier des revues de code incluant des vérifications de sécurité."
  },
  {
    id: "vuln_code_mid",
    fonction: "devsecops",
    thematique: "Gestion des vulnérabilités & Sûreté du code",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Vulnérabilités & Code - Intermédiaire",
    description: "Utilisation partielle d'outils automatisés. Quelques revues de sécurité sur le code critique.",
    recommandations: "Standardiser l'utilisation d'outils de scan. Former les développeurs aux bonnes pratiques de codage sécurisé."
  },
  {
    id: "vuln_code_high",
    fonction: "devsecops",
    thematique: "Gestion des vulnérabilités & Sûreté du code",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Vulnérabilités & Code - Avancé",
    description: "Contrôles automatiques intégrés aux pipelines. Revues de code incluant des checklists de sécurité. Feedback loop avec correction rapide.",
    recommandations: "Aller vers une gestion prédictive des vulnérabilités. Consolider la base de code avec des audits réguliers et des bug bounties."
  },

  // Gestion des accès & secrets
  {
    id: "access_low",
    fonction: "devsecops",
    thematique: "Gestion des accès & secrets",
    score_min: 0,
    score_max: 1.5,
    niveau: "Accès & Secrets - Faible",
    description: "Accès gérés manuellement. Secrets stockés en clair dans le code ou des fichiers non sécurisés.",
    recommandations: "Mettre en place une gestion centralisée des secrets (Vault, AWS Secrets Manager, etc.). Appliquer le principe du moindre privilège."
  },
  {
    id: "access_mid",
    fonction: "devsecops",
    thematique: "Gestion des accès & secrets",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Accès & Secrets - Intermédiaire",
    description: "Utilisation partielle de vaults. Accès avec contrôle RBAC mais non régulièrement revus.",
    recommandations: "Automatiser les audits de permissions. Intégrer la rotation automatique des secrets."
  },
  {
    id: "access_high",
    fonction: "devsecops",
    thematique: "Gestion des accès & secrets",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Accès & Secrets - Avancé",
    description: "Secrets chiffrés, rotation automatique. Gestion centralisée intégrée aux workflows DevOps.",
    recommandations: "Déployer une stratégie zero trust. Analyser les accès à l'aide de comportements anormaux (UEBA)."
  },

  // Observabilité & Monitoring
  {
    id: "observability_low",
    fonction: "devsecops",
    thematique: "Observabilité & Monitoring",
    score_min: 0,
    score_max: 1.5,
    niveau: "Observabilité - Faible",
    description: "Peu ou pas de supervision des systèmes. Logs non centralisés. Alertes inexistantes ou inefficaces.",
    recommandations: "Déployer un système centralisé de logs. Mettre en place une supervision basique des services critiques."
  },
  {
    id: "observability_mid",
    fonction: "devsecops",
    thematique: "Observabilité & Monitoring",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Observabilité - Intermédiaire",
    description: "Monitoring en place pour les applications clés. Tableaux de bord partiellement exploités. Alertes parfois ignorées.",
    recommandations: "Formaliser les indicateurs clés. Intégrer logs, métriques et traces. Mettre en place des alertes pertinentes."
  },
  {
    id: "observability_high",
    fonction: "devsecops",
    thematique: "Observabilité & Monitoring",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Observabilité - Avancé",
    description: "Observabilité full stack. Détection proactive des anomalies. Corrélations automatisées entre événements.",
    recommandations: "Mettre en œuvre l'AIOps. Simuler des incidents (chaos engineering) pour tester la réactivité des systèmes."
  },

  // Conformité & Gouvernance
  {
    id: "compliance_low",
    fonction: "devsecops",
    thematique: "Conformité & Gouvernance",
    score_min: 0,
    score_max: 1.5,
    niveau: "Conformité - Faible",
    description: "Peu ou pas de documentation formelle. Non-conformité aux exigences réglementaires. Audits inexistants.",
    recommandations: "Cartographier les exigences applicables (RGPD, ISO, etc.). Documenter les premières politiques de sécurité."
  },
  {
    id: "compliance_mid",
    fonction: "devsecops",
    thematique: "Conformité & Gouvernance",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Conformité - Intermédiaire",
    description: "Politiques en place mais application variable. Quelques audits réalisés. Suivi des écarts partiel.",
    recommandations: "Établir un programme d'audit régulier. Déployer des outils de conformité automatique sur les pipelines."
  },
  {
    id: "compliance_high",
    fonction: "devsecops",
    thematique: "Conformité & Gouvernance",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Conformité - Avancé",
    description: "Conformité intégrée dès la conception (Security by Design). Documentation à jour. Audits passés régulièrement.",
    recommandations: "Automatiser les contrôles de conformité. Participer à des certifications tierces (ISO, SOC 2...)."
  },

  // Formation & Sensibilisation
  {
    id: "training_low",
    fonction: "devsecops",
    thematique: "Formation & Sensibilisation",
    score_min: 0,
    score_max: 1.5,
    niveau: "Formation - Faible",
    description: "Aucune formation spécifique à la sécurité. Connaissances limitées dans les équipes techniques.",
    recommandations: "Organiser des sessions d'initiation. Sensibiliser aux erreurs fréquentes. Déployer des capsules de microlearning."
  },
  {
    id: "training_mid",
    fonction: "devsecops",
    thematique: "Formation & Sensibilisation",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Formation - Intermédiaire",
    description: "Formations régulières disponibles. Participants ciblés. Supports à jour mais peu interactifs.",
    recommandations: "Personnaliser les contenus par profil. Mesurer l'impact des formations. Introduire des serious games ou challenges."
  },
  {
    id: "training_high",
    fonction: "devsecops",
    thematique: "Formation & Sensibilisation",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Formation - Avancé",
    description: "Culture de formation continue. Programmes adaptés, évalués et révisés. Implication de champions internes.",
    recommandations: "Formaliser des parcours certifiants. Développer un système de mentorat. Valoriser les compétences sécurité."
  },

  // Satisfaction Client & Time-to-Market
  {
    id: "satisfaction_low",
    fonction: "devsecops",
    thematique: "Satisfaction Client & Time-to-Market",
    score_min: 0,
    score_max: 1.5,
    niveau: "Satisfaction & Time-to-Market - Faible",
    description: "Livraisons peu fréquentes. Faible visibilité sur les besoins clients. Retours rares ou ignorés.",
    recommandations: "Mettre en place un suivi des incidents. Recueillir les retours des utilisateurs. Identifier les irritants."
  },
  {
    id: "satisfaction_mid",
    fonction: "devsecops",
    thematique: "Satisfaction Client & Time-to-Market",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Satisfaction & Time-to-Market - Intermédiaire",
    description: "Livraisons régulières mais non continues. KPIs suivis mais peu liés à l'expérience utilisateur.",
    recommandations: "Aligner les KPIs sur la valeur client. Accélérer le cycle de feedback. Engager les utilisateurs dans les phases de test."
  },
  {
    id: "satisfaction_high",
    fonction: "devsecops",
    thematique: "Satisfaction Client & Time-to-Market",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Satisfaction & Time-to-Market - Avancé",
    description: "Livraisons fréquentes et fiables. Amélioration continue en réponse aux feedbacks clients. Time-to-market optimisé.",
    recommandations: "Mettre en œuvre des mécanismes de priorisation client. Co-construire les solutions. Suivre le NPS de manière continue."
  },

  // Industrialisation & Standardisation
  {
    id: "industrialisation_low",
    fonction: "devsecops",
    thematique: "Industrialisation & Standardisation",
    score_min: 0,
    score_max: 1.5,
    niveau: "Industrialisation - Faible",
    description: "Processus artisanaux. Forte variabilité entre projets. Outils et pratiques hétérogènes.",
    recommandations: "Identifier les processus répétitifs. Documenter les bonnes pratiques. Unifier les outils critiques."
  },
  {
    id: "industrialisation_mid",
    fonction: "devsecops",
    thematique: "Industrialisation & Standardisation",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Industrialisation - Intermédiaire",
    description: "Début de standardisation. Bonnes pratiques partiellement partagées. Industrialisation limitée à certains domaines.",
    recommandations: "Déployer des templates communs. Formaliser des procédures opérationnelles. Suivre les gains réalisés."
  },
  {
    id: "industrialisation_high",
    fonction: "devsecops",
    thematique: "Industrialisation & Standardisation",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Industrialisation - Avancé",
    description: "Pratiques homogènes à l'échelle de l'organisation. Outils mutualisés. Réduction significative des erreurs et délais.",
    recommandations: "Mesurer la maturité des processus. Promouvoir l'amélioration continue. Documenter et partager les retours d'expérience."
  },

  // CYBERSECURITE - THÉMATIQUES

  // Gouvernance de Sécurité
  {
    id: "cyber_gouvernance_de_securite_low",
    fonction: "cybersecurite",
    thematique: "Gouvernance de Sécurité",
    score_min: 0,
    score_max: 1.5,
    niveau: "Gouvernance de Sécurité - Faible",
    description: "Maturité faible sur cette thématique. Pratiques peu formalisées, approche majoritairement réactive.",
    recommandations: "Structurer les fondations. Mettre en place des pratiques de base et sensibiliser les équipes."
  },
  {
    id: "cyber_gouvernance_de_securite_mid",
    fonction: "cybersecurite",
    thematique: "Gouvernance de Sécurité",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Gouvernance de Sécurité - Intermédiaire",
    description: "Niveau de maturité moyen. Pratiques partiellement définies et en cours de structuration.",
    recommandations: "Standardiser et renforcer les processus existants. Encourager l'amélioration continue."
  },
  {
    id: "cyber_gouvernance_de_securite_high",
    fonction: "cybersecurite",
    thematique: "Gouvernance de Sécurité",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Gouvernance de Sécurité - Avancé",
    description: "Niveau avancé. Pratiques bien établies, mesurées et intégrées dans les processus.",
    recommandations: "Capitaliser sur les acquis. Promouvoir l'innovation, le partage de bonnes pratiques et l'excellence opérationnelle."
  },

  // Gestion des Risques
  {
    id: "cyber_gestion_des_risques_low",
    fonction: "cybersecurite",
    thematique: "Gestion des Risques",
    score_min: 0,
    score_max: 1.5,
    niveau: "Gestion des Risques - Faible",
    description: "Maturité faible sur cette thématique. Pratiques peu formalisées, approche majoritairement réactive.",
    recommandations: "Structurer les fondations. Mettre en place des pratiques de base et sensibiliser les équipes."
  },
  {
    id: "cyber_gestion_des_risques_mid",
    fonction: "cybersecurite",
    thematique: "Gestion des Risques",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Gestion des Risques - Intermédiaire",
    description: "Niveau de maturité moyen. Pratiques partiellement définies et en cours de structuration.",
    recommandations: "Standardiser et renforcer les processus existants. Encourager l'amélioration continue."
  },
  {
    id: "cyber_gestion_des_risques_high",
    fonction: "cybersecurite",
    thematique: "Gestion des Risques",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Gestion des Risques - Avancé",
    description: "Niveau avancé. Pratiques bien établies, mesurées et intégrées dans les processus.",
    recommandations: "Capitaliser sur les acquis. Promouvoir l'innovation, le partage de bonnes pratiques et l'excellence opérationnelle."
  },

  // Gestion des Identités
  {
    id: "cyber_gestion_des_identites_low",
    fonction: "cybersecurite",
    thematique: "Gestion des Identités",
    score_min: 0,
    score_max: 1.5,
    niveau: "Gestion des Identités - Faible",
    description: "Maturité faible sur cette thématique. Pratiques peu formalisées, approche majoritairement réactive.",
    recommandations: "Structurer les fondations. Mettre en place des pratiques de base et sensibiliser les équipes."
  },
  {
    id: "cyber_gestion_des_identites_mid",
    fonction: "cybersecurite",
    thematique: "Gestion des Identités",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Gestion des Identités - Intermédiaire",
    description: "Niveau de maturité moyen. Pratiques partiellement définies et en cours de structuration.",
    recommandations: "Standardiser et renforcer les processus existants. Encourager l'amélioration continue."
  },
  {
    id: "cyber_gestion_des_identites_high",
    fonction: "cybersecurite",
    thematique: "Gestion des Identités",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Gestion des Identités - Avancé",
    description: "Niveau avancé. Pratiques bien établies, mesurées et intégrées dans les processus.",
    recommandations: "Capitaliser sur les acquis. Promouvoir l'innovation, le partage de bonnes pratiques et l'excellence opérationnelle."
  },

  // Protection des Données
  {
    id: "cyber_protection_des_donnees_low",
    fonction: "cybersecurite",
    thematique: "Protection des Données",
    score_min: 0,
    score_max: 1.5,
    niveau: "Protection des Données - Faible",
    description: "Maturité faible sur cette thématique. Pratiques peu formalisées, approche majoritairement réactive.",
    recommandations: "Structurer les fondations. Mettre en place des pratiques de base et sensibiliser les équipes."
  },
  {
    id: "cyber_protection_des_donnees_mid",
    fonction: "cybersecurite",
    thematique: "Protection des Données",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Protection des Données - Intermédiaire",
    description: "Niveau de maturité moyen. Pratiques partiellement définies et en cours de structuration.",
    recommandations: "Standardiser et renforcer les processus existants. Encourager l'amélioration continue."
  },
  {
    id: "cyber_protection_des_donnees_high",
    fonction: "cybersecurite",
    thematique: "Protection des Données",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Protection des Données - Avancé",
    description: "Niveau avancé. Pratiques bien établies, mesurées et intégrées dans les processus.",
    recommandations: "Capitaliser sur les acquis. Promouvoir l'innovation, le partage de bonnes pratiques et l'excellence opérationnelle."
  },

  // Détection & Réponse
  {
    id: "cyber_detection__reponse_low",
    fonction: "cybersecurite",
    thematique: "Détection & Réponse",
    score_min: 0,
    score_max: 1.5,
    niveau: "Détection & Réponse - Faible",
    description: "Maturité faible sur cette thématique. Pratiques peu formalisées, approche majoritairement réactive.",
    recommandations: "Structurer les fondations. Mettre en place des pratiques de base et sensibiliser les équipes."
  },
  {
    id: "cyber_detection__reponse_mid",
    fonction: "cybersecurite",
    thematique: "Détection & Réponse",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Détection & Réponse - Intermédiaire",
    description: "Niveau de maturité moyen. Pratiques partiellement définies et en cours de structuration.",
    recommandations: "Standardiser et renforcer les processus existants. Encourager l'amélioration continue."
  },
  {
    id: "cyber_detection__reponse_high",
    fonction: "cybersecurite",
    thematique: "Détection & Réponse",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Détection & Réponse - Avancé",
    description: "Niveau avancé. Pratiques bien établies, mesurées et intégrées dans les processus.",
    recommandations: "Capitaliser sur les acquis. Promouvoir l'innovation, le partage de bonnes pratiques et l'excellence opérationnelle."
  },

  // Résilience & Continuité
  {
    id: "cyber_resilience__continuite_low",
    fonction: "cybersecurite",
    thematique: "Résilience & Continuité",
    score_min: 0,
    score_max: 1.5,
    niveau: "Résilience & Continuité - Faible",
    description: "Maturité faible sur cette thématique. Pratiques peu formalisées, approche majoritairement réactive.",
    recommandations: "Structurer les fondations. Mettre en place des pratiques de base et sensibiliser les équipes."
  },
  {
    id: "cyber_resilience__continuite_mid",
    fonction: "cybersecurite",
    thematique: "Résilience & Continuité",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Résilience & Continuité - Intermédiaire",
    description: "Niveau de maturité moyen. Pratiques partiellement définies et en cours de structuration.",
    recommandations: "Standardiser et renforcer les processus existants. Encourager l'amélioration continue."
  },
  {
    id: "cyber_resilience__continuite_high",
    fonction: "cybersecurite",
    thematique: "Résilience & Continuité",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Résilience & Continuité - Avancé",
    description: "Niveau avancé. Pratiques bien établies, mesurées et intégrées dans les processus.",
    recommandations: "Capitaliser sur les acquis. Promouvoir l'innovation, le partage de bonnes pratiques et l'excellence opérationnelle."
  },

  // Chaîne d'Approvisionnement
  {
    id: "cyber_chaine_d'approvisionnement_low",
    fonction: "cybersecurite",
    thematique: "Chaîne d'Approvisionnement",
    score_min: 0,
    score_max: 1.5,
    niveau: "Chaîne d'Approvisionnement - Faible",
    description: "Maturité faible sur cette thématique. Pratiques peu formalisées, approche majoritairement réactive.",
    recommandations: "Structurer les fondations. Mettre en place des pratiques de base et sensibiliser les équipes."
  },
  {
    id: "cyber_chaine_d'approvisionnement_mid",
    fonction: "cybersecurite",
    thematique: "Chaîne d'Approvisionnement",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Chaîne d'Approvisionnement - Intermédiaire",
    description: "Niveau de maturité moyen. Pratiques partiellement définies et en cours de structuration.",
    recommandations: "Standardiser et renforcer les processus existants. Encourager l'amélioration continue."
  },
  {
    id: "cyber_chaine_d'approvisionnement_high",
    fonction: "cybersecurite",
    thematique: "Chaîne d'Approvisionnement",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Chaîne d'Approvisionnement - Avancé",
    description: "Niveau avancé. Pratiques bien établies, mesurées et intégrées dans les processus.",
    recommandations: "Capitaliser sur les acquis. Promouvoir l'innovation, le partage de bonnes pratiques et l'excellence opérationnelle."
  },

  // Culture & Sensibilisation
  {
    id: "cyber_culture__sensibilisation_low",
    fonction: "cybersecurite",
    thematique: "Culture & Sensibilisation",
    score_min: 0,
    score_max: 1.5,
    niveau: "Culture & Sensibilisation - Faible",
    description: "Maturité faible sur cette thématique. Pratiques peu formalisées, approche majoritairement réactive.",
    recommandations: "Structurer les fondations. Mettre en place des pratiques de base et sensibiliser les équipes."
  },
  {
    id: "cyber_culture__sensibilisation_mid",
    fonction: "cybersecurite",
    thematique: "Culture & Sensibilisation",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Culture & Sensibilisation - Intermédiaire",
    description: "Niveau de maturité moyen. Pratiques partiellement définies et en cours de structuration.",
    recommandations: "Standardiser et renforcer les processus existants. Encourager l'amélioration continue."
  },
  {
    id: "cyber_culture__sensibilisation_high",
    fonction: "cybersecurite",
    thematique: "Culture & Sensibilisation",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Culture & Sensibilisation - Avancé",
    description: "Niveau avancé. Pratiques bien établies, mesurées et intégrées dans les processus.",
    recommandations: "Capitaliser sur les acquis. Promouvoir l'innovation, le partage de bonnes pratiques et l'excellence opérationnelle."
  },

  // MODELE OPERATIONNEL - THÉMATIQUES

  // Structure Organisationnelle
  {
    id: "ops_structure_organisationnelle_low",
    fonction: "modele_operationnel",
    thematique: "Structure Organisationnelle",
    score_min: 0,
    score_max: 1.5,
    niveau: "Structure Organisationnelle - Faible",
    description: "Maturité faible sur cette thématique. Pratiques peu formalisées, approche majoritairement réactive.",
    recommandations: "Structurer les fondations. Mettre en place des pratiques de base et sensibiliser les équipes."
  },
  {
    id: "ops_structure_organisationnelle_mid",
    fonction: "modele_operationnel",
    thematique: "Structure Organisationnelle",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Structure Organisationnelle - Intermédiaire",
    description: "Niveau de maturité moyen. Pratiques partiellement définies et en cours de structuration.",
    recommandations: "Standardiser et renforcer les processus existants. Encourager l'amélioration continue."
  },
  {
    id: "ops_structure_organisationnelle_high",
    fonction: "modele_operationnel",
    thematique: "Structure Organisationnelle",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Structure Organisationnelle - Avancé",
    description: "Niveau avancé. Pratiques bien établies, mesurées et intégrées dans les processus.",
    recommandations: "Capitaliser sur les acquis. Promouvoir l'innovation, le partage de bonnes pratiques et l'excellence opérationnelle."
  },

  // Processus & Méthodes
  {
    id: "ops_processus__methodes_low",
    fonction: "modele_operationnel",
    thematique: "Processus & Méthodes",
    score_min: 0,
    score_max: 1.5,
    niveau: "Processus & Méthodes - Faible",
    description: "Maturité faible sur cette thématique. Pratiques peu formalisées, approche majoritairement réactive.",
    recommandations: "Structurer les fondations. Mettre en place des pratiques de base et sensibiliser les équipes."
  },
  {
    id: "ops_processus__methodes_mid",
    fonction: "modele_operationnel",
    thematique: "Processus & Méthodes",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Processus & Méthodes - Intermédiaire",
    description: "Niveau de maturité moyen. Pratiques partiellement définies et en cours de structuration.",
    recommandations: "Standardiser et renforcer les processus existants. Encourager l'amélioration continue."
  },
  {
    id: "ops_processus__methodes_high",
    fonction: "modele_operationnel",
    thematique: "Processus & Méthodes",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Processus & Méthodes - Avancé",
    description: "Niveau avancé. Pratiques bien établies, mesurées et intégrées dans les processus.",
    recommandations: "Capitaliser sur les acquis. Promouvoir l'innovation, le partage de bonnes pratiques et l'excellence opérationnelle."
  },

  // Gestion des Services
  {
    id: "ops_gestion_des_services_low",
    fonction: "modele_operationnel",
    thematique: "Gestion des Services",
    score_min: 0,
    score_max: 1.5,
    niveau: "Gestion des Services - Faible",
    description: "Maturité faible sur cette thématique. Pratiques peu formalisées, approche majoritairement réactive.",
    recommandations: "Structurer les fondations. Mettre en place des pratiques de base et sensibiliser les équipes."
  },
  {
    id: "ops_gestion_des_services_mid",
    fonction: "modele_operationnel",
    thematique: "Gestion des Services",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Gestion des Services - Intermédiaire",
    description: "Niveau de maturité moyen. Pratiques partiellement définies et en cours de structuration.",
    recommandations: "Standardiser et renforcer les processus existants. Encourager l'amélioration continue."
  },
  {
    id: "ops_gestion_des_services_high",
    fonction: "modele_operationnel",
    thematique: "Gestion des Services",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Gestion des Services - Avancé",
    description: "Niveau avancé. Pratiques bien établies, mesurées et intégrées dans les processus.",
    recommandations: "Capitaliser sur les acquis. Promouvoir l'innovation, le partage de bonnes pratiques et l'excellence opérationnelle."
  },

  // Performance & Mesure
  {
    id: "ops_performance__mesure_low",
    fonction: "modele_operationnel",
    thematique: "Performance & Mesure",
    score_min: 0,
    score_max: 1.5,
    niveau: "Performance & Mesure - Faible",
    description: "Maturité faible sur cette thématique. Pratiques peu formalisées, approche majoritairement réactive.",
    recommandations: "Structurer les fondations. Mettre en place des pratiques de base et sensibiliser les équipes."
  },
  {
    id: "ops_performance__mesure_mid",
    fonction: "modele_operationnel",
    thematique: "Performance & Mesure",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Performance & Mesure - Intermédiaire",
    description: "Niveau de maturité moyen. Pratiques partiellement définies et en cours de structuration.",
    recommandations: "Standardiser et renforcer les processus existants. Encourager l'amélioration continue."
  },
  {
    id: "ops_performance__mesure_high",
    fonction: "modele_operationnel",
    thematique: "Performance & Mesure",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Performance & Mesure - Avancé",
    description: "Niveau avancé. Pratiques bien établies, mesurées et intégrées dans les processus.",
    recommandations: "Capitaliser sur les acquis. Promouvoir l'innovation, le partage de bonnes pratiques et l'excellence opérationnelle."
  },

  // Stratégie de Sourcing
  {
    id: "ops_strategie_de_sourcing_low",
    fonction: "modele_operationnel",
    thematique: "Stratégie de Sourcing",
    score_min: 0,
    score_max: 1.5,
    niveau: "Stratégie de Sourcing - Faible",
    description: "Maturité faible sur cette thématique. Pratiques peu formalisées, approche majoritairement réactive.",
    recommandations: "Structurer les fondations. Mettre en place des pratiques de base et sensibiliser les équipes."
  },
  {
    id: "ops_strategie_de_sourcing_mid",
    fonction: "modele_operationnel",
    thematique: "Stratégie de Sourcing",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Stratégie de Sourcing - Intermédiaire",
    description: "Niveau de maturité moyen. Pratiques partiellement définies et en cours de structuration.",
    recommandations: "Standardiser et renforcer les processus existants. Encourager l'amélioration continue."
  },
  {
    id: "ops_strategie_de_sourcing_high",
    fonction: "modele_operationnel",
    thematique: "Stratégie de Sourcing",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Stratégie de Sourcing - Avancé",
    description: "Niveau avancé. Pratiques bien établies, mesurées et intégrées dans les processus.",
    recommandations: "Capitaliser sur les acquis. Promouvoir l'innovation, le partage de bonnes pratiques et l'excellence opérationnelle."
  },

  // Transformation & Agilité
  {
    id: "ops_transformation__agilite_low",
    fonction: "modele_operationnel",
    thematique: "Transformation & Agilité",
    score_min: 0,
    score_max: 1.5,
    niveau: "Transformation & Agilité - Faible",
    description: "Maturité faible sur cette thématique. Pratiques peu formalisées, approche majoritairement réactive.",
    recommandations: "Structurer les fondations. Mettre en place des pratiques de base et sensibiliser les équipes."
  },
  {
    id: "ops_transformation__agilite_mid",
    fonction: "modele_operationnel",
    thematique: "Transformation & Agilité",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Transformation & Agilité - Intermédiaire",
    description: "Niveau de maturité moyen. Pratiques partiellement définies et en cours de structuration.",
    recommandations: "Standardiser et renforcer les processus existants. Encourager l'amélioration continue."
  },
  {
    id: "ops_transformation__agilite_high",
    fonction: "modele_operationnel",
    thematique: "Transformation & Agilité",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Transformation & Agilité - Avancé",
    description: "Niveau avancé. Pratiques bien établies, mesurées et intégrées dans les processus.",
    recommandations: "Capitaliser sur les acquis. Promouvoir l'innovation, le partage de bonnes pratiques et l'excellence opérationnelle."
  },

  // Automatisation & Efficacité
  {
    id: "ops_automatisation__efficacite_low",
    fonction: "modele_operationnel",
    thematique: "Automatisation & Efficacité",
    score_min: 0,
    score_max: 1.5,
    niveau: "Automatisation & Efficacité - Faible",
    description: "Maturité faible sur cette thématique. Pratiques peu formalisées, approche majoritairement réactive.",
    recommandations: "Structurer les fondations. Mettre en place des pratiques de base et sensibiliser les équipes."
  },
  {
    id: "ops_automatisation__efficacite_mid",
    fonction: "modele_operationnel",
    thematique: "Automatisation & Efficacité",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Automatisation & Efficacité - Intermédiaire",
    description: "Niveau de maturité moyen. Pratiques partiellement définies et en cours de structuration.",
    recommandations: "Standardiser et renforcer les processus existants. Encourager l'amélioration continue."
  },
  {
    id: "ops_automatisation__efficacite_high",
    fonction: "modele_operationnel",
    thematique: "Automatisation & Efficacité",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Automatisation & Efficacité - Avancé",
    description: "Niveau avancé. Pratiques bien établies, mesurées et intégrées dans les processus.",
    recommandations: "Capitaliser sur les acquis. Promouvoir l'innovation, le partage de bonnes pratiques et l'excellence opérationnelle."
  },

  // GOUVERNANCE SI - THÉMATIQUES

  // Alignement Stratégique
  {
    id: "gouv_alignement_strategique_low",
    fonction: "gouvernance_si",
    thematique: "Alignement Stratégique",
    score_min: 0,
    score_max: 1.5,
    niveau: "Alignement Stratégique - Faible",
    description: "Maturité faible sur cette thématique. Pratiques peu formalisées, approche majoritairement réactive.",
    recommandations: "Structurer les fondations. Mettre en place des pratiques de base et sensibiliser les équipes."
  },
  {
    id: "gouv_alignement_strategique_mid",
    fonction: "gouvernance_si",
    thematique: "Alignement Stratégique",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Alignement Stratégique - Intermédiaire",
    description: "Niveau de maturité moyen. Pratiques partiellement définies et en cours de structuration.",
    recommandations: "Standardiser et renforcer les processus existants. Encourager l'amélioration continue."
  },
  {
    id: "gouv_alignement_strategique_high",
    fonction: "gouvernance_si",
    thematique: "Alignement Stratégique",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Alignement Stratégique - Avancé",
    description: "Niveau avancé. Pratiques bien établies, mesurées et intégrées dans les processus.",
    recommandations: "Capitaliser sur les acquis. Promouvoir l'innovation, le partage de bonnes pratiques et l'excellence opérationnelle."
  },

  // Gestion de Portefeuille
  {
    id: "gouv_gestion_de_portefeuille_low",
    fonction: "gouvernance_si",
    thematique: "Gestion de Portefeuille",
    score_min: 0,
    score_max: 1.5,
    niveau: "Gestion de Portefeuille - Faible",
    description: "Maturité faible sur cette thématique. Pratiques peu formalisées, approche majoritairement réactive.",
    recommandations: "Structurer les fondations. Mettre en place des pratiques de base et sensibiliser les équipes."
  },
  {
    id: "gouv_gestion_de_portefeuille_mid",
    fonction: "gouvernance_si",
    thematique: "Gestion de Portefeuille",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Gestion de Portefeuille - Intermédiaire",
    description: "Niveau de maturité moyen. Pratiques partiellement définies et en cours de structuration.",
    recommandations: "Standardiser et renforcer les processus existants. Encourager l'amélioration continue."
  },
  {
    id: "gouv_gestion_de_portefeuille_high",
    fonction: "gouvernance_si",
    thematique: "Gestion de Portefeuille",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Gestion de Portefeuille - Avancé",
    description: "Niveau avancé. Pratiques bien établies, mesurées et intégrées dans les processus.",
    recommandations: "Capitaliser sur les acquis. Promouvoir l'innovation, le partage de bonnes pratiques et l'excellence opérationnelle."
  },

  // Architecture d'Entreprise
  {
    id: "gouv_architecture_d'entreprise_low",
    fonction: "gouvernance_si",
    thematique: "Architecture d'Entreprise",
    score_min: 0,
    score_max: 1.5,
    niveau: "Architecture d'Entreprise - Faible",
    description: "Maturité faible sur cette thématique. Pratiques peu formalisées, approche majoritairement réactive.",
    recommandations: "Structurer les fondations. Mettre en place des pratiques de base et sensibiliser les équipes."
  },
  {
    id: "gouv_architecture_d'entreprise_mid",
    fonction: "gouvernance_si",
    thematique: "Architecture d'Entreprise",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Architecture d'Entreprise - Intermédiaire",
    description: "Niveau de maturité moyen. Pratiques partiellement définies et en cours de structuration.",
    recommandations: "Standardiser et renforcer les processus existants. Encourager l'amélioration continue."
  },
  {
    id: "gouv_architecture_d'entreprise_high",
    fonction: "gouvernance_si",
    thematique: "Architecture d'Entreprise",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Architecture d'Entreprise - Avancé",
    description: "Niveau avancé. Pratiques bien établies, mesurées et intégrées dans les processus.",
    recommandations: "Capitaliser sur les acquis. Promouvoir l'innovation, le partage de bonnes pratiques et l'excellence opérationnelle."
  },

  // Investissements & Valeur
  {
    id: "gouv_investissements__valeur_low",
    fonction: "gouvernance_si",
    thematique: "Investissements & Valeur",
    score_min: 0,
    score_max: 1.5,
    niveau: "Investissements & Valeur - Faible",
    description: "Maturité faible sur cette thématique. Pratiques peu formalisées, approche majoritairement réactive.",
    recommandations: "Structurer les fondations. Mettre en place des pratiques de base et sensibiliser les équipes."
  },
  {
    id: "gouv_investissements__valeur_mid",
    fonction: "gouvernance_si",
    thematique: "Investissements & Valeur",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Investissements & Valeur - Intermédiaire",
    description: "Niveau de maturité moyen. Pratiques partiellement définies et en cours de structuration.",
    recommandations: "Standardiser et renforcer les processus existants. Encourager l'amélioration continue."
  },
  {
    id: "gouv_investissements__valeur_high",
    fonction: "gouvernance_si",
    thematique: "Investissements & Valeur",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Investissements & Valeur - Avancé",
    description: "Niveau avancé. Pratiques bien établies, mesurées et intégrées dans les processus.",
    recommandations: "Capitaliser sur les acquis. Promouvoir l'innovation, le partage de bonnes pratiques et l'excellence opérationnelle."
  },

  // Gestion des Risques SI
  {
    id: "gouv_gestion_des_risques_si_low",
    fonction: "gouvernance_si",
    thematique: "Gestion des Risques SI",
    score_min: 0,
    score_max: 1.5,
    niveau: "Gestion des Risques SI - Faible",
    description: "Maturité faible sur cette thématique. Pratiques peu formalisées, approche majoritairement réactive.",
    recommandations: "Structurer les fondations. Mettre en place des pratiques de base et sensibiliser les équipes."
  },
  {
    id: "gouv_gestion_des_risques_si_mid",
    fonction: "gouvernance_si",
    thematique: "Gestion des Risques SI",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Gestion des Risques SI - Intermédiaire",
    description: "Niveau de maturité moyen. Pratiques partiellement définies et en cours de structuration.",
    recommandations: "Standardiser et renforcer les processus existants. Encourager l'amélioration continue."
  },
  {
    id: "gouv_gestion_des_risques_si_high",
    fonction: "gouvernance_si",
    thematique: "Gestion des Risques SI",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Gestion des Risques SI - Avancé",
    description: "Niveau avancé. Pratiques bien établies, mesurées et intégrées dans les processus.",
    recommandations: "Capitaliser sur les acquis. Promouvoir l'innovation, le partage de bonnes pratiques et l'excellence opérationnelle."
  },

  // Conformité & Régulation
  {
    id: "gouv_conformite__regulation_low",
    fonction: "gouvernance_si",
    thematique: "Conformité & Régulation",
    score_min: 0,
    score_max: 1.5,
    niveau: "Conformité & Régulation - Faible",
    description: "Maturité faible sur cette thématique. Pratiques peu formalisées, approche majoritairement réactive.",
    recommandations: "Structurer les fondations. Mettre en place des pratiques de base et sensibiliser les équipes."
  },
  {
    id: "gouv_conformite__regulation_mid",
    fonction: "gouvernance_si",
    thematique: "Conformité & Régulation",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Conformité & Régulation - Intermédiaire",
    description: "Niveau de maturité moyen. Pratiques partiellement définies et en cours de structuration.",
    recommandations: "Standardiser et renforcer les processus existants. Encourager l'amélioration continue."
  },
  {
    id: "gouv_conformite__regulation_high",
    fonction: "gouvernance_si",
    thematique: "Conformité & Régulation",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Conformité & Régulation - Avancé",
    description: "Niveau avancé. Pratiques bien établies, mesurées et intégrées dans les processus.",
    recommandations: "Capitaliser sur les acquis. Promouvoir l'innovation, le partage de bonnes pratiques et l'excellence opérationnelle."
  },

  // Performance & Mesure (Gouvernance)
  {
    id: "gouv_performance__mesure_low",
    fonction: "gouvernance_si",
    thematique: "Performance & Mesure",
    score_min: 0,
    score_max: 1.5,
    niveau: "Performance & Mesure - Faible",
    description: "Maturité faible sur cette thématique. Pratiques peu formalisées, approche majoritairement réactive.",
    recommandations: "Structurer les fondations. Mettre en place des pratiques de base et sensibiliser les équipes."
  },
  {
    id: "gouv_performance__mesure_mid",
    fonction: "gouvernance_si",
    thematique: "Performance & Mesure",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Performance & Mesure - Intermédiaire",
    description: "Niveau de maturité moyen. Pratiques partiellement définies et en cours de structuration.",
    recommandations: "Standardiser et renforcer les processus existants. Encourager l'amélioration continue."
  },
  {
    id: "gouv_performance__mesure_high",
    fonction: "gouvernance_si",
    thematique: "Performance & Mesure",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Performance & Mesure - Avancé",
    description: "Niveau avancé. Pratiques bien établies, mesurées et intégrées dans les processus.",
    recommandations: "Capitaliser sur les acquis. Promouvoir l'innovation, le partage de bonnes pratiques et l'excellence opérationnelle."
  },

  // ACCULTURATION DATA - THÉMATIQUES

  // Stratégie Data
  {
    id: "data_strategie_data_low",
    fonction: "acculturation_data",
    thematique: "Stratégie Data",
    score_min: 0,
    score_max: 1.5,
    niveau: "Stratégie Data - Faible",
    description: "Maturité faible sur cette thématique. Pratiques peu formalisées, approche majoritairement réactive.",
    recommandations: "Structurer les fondations. Mettre en place des pratiques de base et sensibiliser les équipes."
  },
  {
    id: "data_strategie_data_mid",
    fonction: "acculturation_data",
    thematique: "Stratégie Data",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Stratégie Data - Intermédiaire",
    description: "Niveau de maturité moyen. Pratiques partiellement définies et en cours de structuration.",
    recommandations: "Standardiser et renforcer les processus existants. Encourager l'amélioration continue."
  },
  {
    id: "data_strategie_data_high",
    fonction: "acculturation_data",
    thematique: "Stratégie Data",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Stratégie Data - Avancé",
    description: "Niveau avancé. Pratiques bien établies, mesurées et intégrées dans les processus.",
    recommandations: "Capitaliser sur les acquis. Promouvoir l'innovation, le partage de bonnes pratiques et l'excellence opérationnelle."
  },

  // Gouvernance des Données
  {
    id: "data_gouvernance_des_donnees_low",
    fonction: "acculturation_data",
    thematique: "Gouvernance des Données",
    score_min: 0,
    score_max: 1.5,
    niveau: "Gouvernance des Données - Faible",
    description: "Maturité faible sur cette thématique. Pratiques peu formalisées, approche majoritairement réactive.",
    recommandations: "Structurer les fondations. Mettre en place des pratiques de base et sensibiliser les équipes."
  },
  {
    id: "data_gouvernance_des_donnees_mid",
    fonction: "acculturation_data",
    thematique: "Gouvernance des Données",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Gouvernance des Données - Intermédiaire",
    description: "Niveau de maturité moyen. Pratiques partiellement définies et en cours de structuration.",
    recommandations: "Standardiser et renforcer les processus existants. Encourager l'amélioration continue."
  },
  {
    id: "data_gouvernance_des_donnees_high",
    fonction: "acculturation_data",
    thematique: "Gouvernance des Données",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Gouvernance des Données - Avancé",
    description: "Niveau avancé. Pratiques bien établies, mesurées et intégrées dans les processus.",
    recommandations: "Capitaliser sur les acquis. Promouvoir l'innovation, le partage de bonnes pratiques et l'excellence opérationnelle."
  },

  // Architecture Data
  {
    id: "data_architecture_data_low",
    fonction: "acculturation_data",
    thematique: "Architecture Data",
    score_min: 0,
    score_max: 1.5,
    niveau: "Architecture Data - Faible",
    description: "Maturité faible sur cette thématique. Pratiques peu formalisées, approche majoritairement réactive.",
    recommandations: "Structurer les fondations. Mettre en place des pratiques de base et sensibiliser les équipes."
  },
  {
    id: "data_architecture_data_mid",
    fonction: "acculturation_data",
    thematique: "Architecture Data",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Architecture Data - Intermédiaire",
    description: "Niveau de maturité moyen. Pratiques partiellement définies et en cours de structuration.",
    recommandations: "Standardiser et renforcer les processus existants. Encourager l'amélioration continue."
  },
  {
    id: "data_architecture_data_high",
    fonction: "acculturation_data",
    thematique: "Architecture Data",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Architecture Data - Avancé",
    description: "Niveau avancé. Pratiques bien établies, mesurées et intégrées dans les processus.",
    recommandations: "Capitaliser sur les acquis. Promouvoir l'innovation, le partage de bonnes pratiques et l'excellence opérationnelle."
  },

  // Compétences & Culture
  {
    id: "data_competences__culture_low",
    fonction: "acculturation_data",
    thematique: "Compétences & Culture",
    score_min: 0,
    score_max: 1.5,
    niveau: "Compétences & Culture - Faible",
    description: "Maturité faible sur cette thématique. Pratiques peu formalisées, approche majoritairement réactive.",
    recommandations: "Structurer les fondations. Mettre en place des pratiques de base et sensibiliser les équipes."
  },
  {
    id: "data_competences__culture_mid",
    fonction: "acculturation_data",
    thematique: "Compétences & Culture",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Compétences & Culture - Intermédiaire",
    description: "Niveau de maturité moyen. Pratiques partiellement définies et en cours de structuration.",
    recommandations: "Standardiser et renforcer les processus existants. Encourager l'amélioration continue."
  },
  {
    id: "data_competences__culture_high",
    fonction: "acculturation_data",
    thematique: "Compétences & Culture",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Compétences & Culture - Avancé",
    description: "Niveau avancé. Pratiques bien établies, mesurées et intégrées dans les processus.",
    recommandations: "Capitaliser sur les acquis. Promouvoir l'innovation, le partage de bonnes pratiques et l'excellence opérationnelle."
  },

  // Analytique & BI
  {
    id: "data_analytique__bi_low",
    fonction: "acculturation_data",
    thematique: "Analytique & BI",
    score_min: 0,
    score_max: 1.5,
    niveau: "Analytique & BI - Faible",
    description: "Maturité faible sur cette thématique. Pratiques peu formalisées, approche majoritairement réactive.",
    recommandations: "Structurer les fondations. Mettre en place des pratiques de base et sensibiliser les équipes."
  },
  {
    id: "data_analytique__bi_mid",
    fonction: "acculturation_data",
    thematique: "Analytique & BI",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Analytique & BI - Intermédiaire",
    description: "Niveau de maturité moyen. Pratiques partiellement définies et en cours de structuration.",
    recommandations: "Standardiser et renforcer les processus existants. Encourager l'amélioration continue."
  },
  {
    id: "data_analytique__bi_high",
    fonction: "acculturation_data",
    thematique: "Analytique & BI",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Analytique & BI - Avancé",
    description: "Niveau avancé. Pratiques bien établies, mesurées et intégrées dans les processus.",
    recommandations: "Capitaliser sur les acquis. Promouvoir l'innovation, le partage de bonnes pratiques et l'excellence opérationnelle."
  },

  // IA & Advanced Analytics
  {
    id: "data_ia__advanced_analytics_low",
    fonction: "acculturation_data",
    thematique: "IA & Advanced Analytics",
    score_min: 0,
    score_max: 1.5,
    niveau: "IA & Advanced Analytics - Faible",
    description: "Maturité faible sur cette thématique. Pratiques peu formalisées, approche majoritairement réactive.",
    recommandations: "Structurer les fondations. Mettre en place des pratiques de base et sensibiliser les équipes."
  },
  {
    id: "data_ia__advanced_analytics_mid",
    fonction: "acculturation_data",
    thematique: "IA & Advanced Analytics",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "IA & Advanced Analytics - Intermédiaire",
    description: "Niveau de maturité moyen. Pratiques partiellement définies et en cours de structuration.",
    recommandations: "Standardiser et renforcer les processus existants. Encourager l'amélioration continue."
  },
  {
    id: "data_ia__advanced_analytics_high",
    fonction: "acculturation_data",
    thematique: "IA & Advanced Analytics",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "IA & Advanced Analytics - Avancé",
    description: "Niveau avancé. Pratiques bien établies, mesurées et intégrées dans les processus.",
    recommandations: "Capitaliser sur les acquis. Promouvoir l'innovation, le partage de bonnes pratiques et l'excellence opérationnelle."
  },

  // Éthique & Responsabilité
  {
    id: "data_ethique__responsabilite_low",
    fonction: "acculturation_data",
    thematique: "Éthique & Responsabilité",
    score_min: 0,
    score_max: 1.5,
    niveau: "Éthique & Responsabilité - Faible",
    description: "Maturité faible sur cette thématique. Pratiques peu formalisées, approche majoritairement réactive.",
    recommandations: "Structurer les fondations. Mettre en place des pratiques de base et sensibiliser les équipes."
  },
  {
    id: "data_ethique__responsabilite_mid",
    fonction: "acculturation_data",
    thematique: "Éthique & Responsabilité",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Éthique & Responsabilité - Intermédiaire",
    description: "Niveau de maturité moyen. Pratiques partiellement définies et en cours de structuration.",
    recommandations: "Standardiser et renforcer les processus existants. Encourager l'amélioration continue."
  },
  {
    id: "data_ethique__responsabilite_high",
    fonction: "acculturation_data",
    thematique: "Éthique & Responsabilité",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Éthique & Responsabilité - Avancé",
    description: "Niveau avancé. Pratiques bien établies, mesurées et intégrées dans les processus.",
    recommandations: "Capitaliser sur les acquis. Promouvoir l'innovation, le partage de bonnes pratiques et l'excellence opérationnelle."
  },

  // Monétisation & Valeur
  {
    id: "data_monetisation__valeur_low",
    fonction: "acculturation_data",
    thematique: "Monétisation & Valeur",
    score_min: 0,
    score_max: 1.5,
    niveau: "Monétisation & Valeur - Faible",
    description: "Maturité faible sur cette thématique. Pratiques peu formalisées, approche majoritairement réactive.",
    recommandations: "Structurer les fondations. Mettre en place des pratiques de base et sensibiliser les équipes."
  },
  {
    id: "data_monetisation__valeur_mid",
    fonction: "acculturation_data",
    thematique: "Monétisation & Valeur",
    score_min: 1.5,
    score_max: 3.5,
    niveau: "Monétisation & Valeur - Intermédiaire",
    description: "Niveau de maturité moyen. Pratiques partiellement définies et en cours de structuration.",
    recommandations: "Standardiser et renforcer les processus existants. Encourager l'amélioration continue."
  },
  {
    id: "data_monetisation__valeur_high",
    fonction: "acculturation_data",
    thematique: "Monétisation & Valeur",
    score_min: 3.5,
    score_max: 5.0,
    niveau: "Monétisation & Valeur - Avancé",
    description: "Niveau avancé. Pratiques bien établies, mesurées et intégrées dans les processus.",
    recommandations: "Capitaliser sur les acquis. Promouvoir l'innovation, le partage de bonnes pratiques et l'excellence opérationnelle."
  }
];

// Fonction pour initialiser la structure complète
function initializeMaturityModel() {
  // Initialiser DevSecOps
  const devsecopsIndex = FONCTIONS.findIndex(f => f.id === "devsecops");
  if (devsecopsIndex !== -1) {
    FONCTIONS[devsecopsIndex].thematiques = THEMATIQUES_DEVSECOPS;
    FONCTIONS[devsecopsIndex].niveauxGlobaux = NIVEAUX_GLOBAUX_DEVSECOPS;
  }
  
  // Initialiser Cybersécurité
  const cyberIndex = FONCTIONS.findIndex(f => f.id === "cybersecurite");
  if (cyberIndex !== -1) {
    FONCTIONS[cyberIndex].thematiques = THEMATIQUES_CYBERSECURITE;
    FONCTIONS[cyberIndex].niveauxGlobaux = NIVEAUX_GLOBAUX_CYBERSECURITE;
  }
  
  // Initialiser Modèle Opérationnel
  const opsIndex = FONCTIONS.findIndex(f => f.id === "modele_operationnel");
  if (opsIndex !== -1) {
    FONCTIONS[opsIndex].thematiques = THEMATIQUES_MODELE_OPERATIONNEL;
    FONCTIONS[opsIndex].niveauxGlobaux = NIVEAUX_GLOBAUX_MODELE_OPERATIONNEL;
  }
  
  // Initialiser Gouvernance SI
  const gouvIndex = FONCTIONS.findIndex(f => f.id === "gouvernance_si");
  if (gouvIndex !== -1) {
    FONCTIONS[gouvIndex].thematiques = THEMATIQUES_GOUVERNANCE_SI;
    FONCTIONS[gouvIndex].niveauxGlobaux = NIVEAUX_GLOBAUX_GOUVERNANCE_SI;
  }
  
  // Initialiser Acculturation Data
  const dataIndex = FONCTIONS.findIndex(f => f.id === "acculturation_data");
  if (dataIndex !== -1) {
    FONCTIONS[dataIndex].thematiques = THEMATIQUES_ACCULTURATION_DATA;
    FONCTIONS[dataIndex].niveauxGlobaux = NIVEAUX_GLOBAUX_ACCULTURATION_DATA;
  }
  
  return FONCTIONS;
}

// Initialiser le modèle
const MATURITY_MODEL = initializeMaturityModel();

// Fonctions helper pour faciliter la recherche

/**
 * Trouve une fonction par son nom ou alias
 * @param {string} name - Le nom de la fonction à rechercher
 * @returns {Object|null} La fonction trouvée ou null
 */
function findFonctionByName(name) {
  if (!name) return null;
  
  const normalizedName = normalizeString(name);
  
  // Chercher d'abord dans les alias
  const canonicalId = FONCTION_ALIASES[normalizedName];
  if (canonicalId) {
    return MATURITY_MODEL.find(f => f.id === canonicalId);
  }
  
  // Chercher par ID exact
  const byId = MATURITY_MODEL.find(f => f.id === name);
  if (byId) return byId;
  
  // Chercher par nom exact
  const byNom = MATURITY_MODEL.find(f => f.nom === name);
  if (byNom) return byNom;
  
  // Chercher par normalisation
  return MATURITY_MODEL.find(f => 
    normalizeString(f.id) === normalizedName || 
    normalizeString(f.nom) === normalizedName
  );
}

/**
 * Trouve le niveau thématique correspondant
 * @param {Object} modelFonction - La fonction du modèle
 * @param {Object} thematique - La thématique
 * @param {number} scoreValue - Le score
 * @returns {Object|null} Le niveau trouvé ou un niveau par défaut
 */
function findMatchingThematicLevel(modelFonction, thematique, scoreValue) {
  if (!modelFonction || !thematique || scoreValue === null || scoreValue === undefined) {
    return null;
  }
  
  const normalizedThematique = normalizeString(thematique.nom);
  
  // Recherche par ID de fonction
  let level = NIVEAUX_THEMATIQUES.find(
    level => level.fonction === modelFonction.id &&
             level.thematique === thematique.nom &&
             scoreValue >= level.score_min &&
             scoreValue <= level.score_max
  );
  
  // Si non trouvé, recherche avec normalisation
  if (!level) {
    level = NIVEAUX_THEMATIQUES.find(
      level => {
        const normalizedLevelFonction = normalizeString(level.fonction);
        const normalizedLevelThematique = normalizeString(level.thematique);
        
        return (normalizedLevelFonction === normalizeString(modelFonction.id) || 
                normalizedLevelFonction === normalizeString(modelFonction.nom)) &&
               normalizedLevelThematique === normalizedThematique &&
               scoreValue >= level.score_min &&
               scoreValue <= level.score_max;
      }
    );
  }
  
  // Fallback avec niveau générique
  if (!level) {
    return generateGenericLevel(thematique.nom, scoreValue);
  }
  
  return level;
}

/**
 * Génère un niveau générique basé sur le score
 * @param {string} thematiqueName - Le nom de la thématique
 * @param {number} score - Le score
 * @returns {Object} Le niveau générique
 */
function generateGenericLevel(thematiqueName, score) {
  if (score >= 3.5) {
    return {
      niveau: `${thematiqueName} - Avancé`,
      description: "Niveau avancé. Pratiques bien établies, mesurées et intégrées dans les processus.",
      recommandations: "Capitaliser sur les acquis. Promouvoir l'innovation, le partage de bonnes pratiques et l'excellence opérationnelle."
    };
  } else if (score >= 1.5) {
    return {
      niveau: `${thematiqueName} - Intermédiaire`,
      description: "Niveau de maturité moyen. Pratiques partiellement définies et en cours de structuration.",
      recommandations: "Standardiser et renforcer les processus existants. Encourager l'amélioration continue."
    };
  } else {
    return {
      niveau: `${thematiqueName} - Faible`,
      description: "Maturité faible sur cette thématique. Pratiques peu formalisées, approche majoritairement réactive.",
      recommandations: "Structurer les fondations. Mettre en place des pratiques de base et sensibiliser les équipes."
    };
  }
}

/**
 * Trouve le niveau global pour une fonction
 * @param {string} fonctionName - Le nom de la fonction
 * @param {number} score - Le score global
 * @returns {Object|null} Le niveau global trouvé
 */
function findGlobalLevel(fonctionName, score) {
  const fonction = findFonctionByName(fonctionName);
  if (!fonction || !fonction.niveauxGlobaux) return null;
  
  return fonction.niveauxGlobaux.find(
    level => score >= level.score_min && score <= level.score_max
  );
}

// Export pour Node.js
module.exports = { 
  MATURITY_MODEL, 
  NIVEAUX_THEMATIQUES,
  findFonctionByName,
  findMatchingThematicLevel,
  findGlobalLevel,
  generateGenericLevel,
  normalizeString
};