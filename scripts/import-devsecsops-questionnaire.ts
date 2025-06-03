// scripts/import-devsecsops-questionnaire.ts
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

// Charger les variables d'environnement
dotenv.config();

// Configuration de la base de données
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'maturity_assessment'
};

// Structure des données du questionnaire DevSecOps
interface DevSecOpsQuestion {
  thematique: string;
  texte: string;
  ponderation: number;
  niveau1: string;
  niveau3: string;
  niveau5: string;
  ordre: number;
}

interface DevSecOpsThematique {
  nom: string;
  description: string;
  nombreQuestions: number;
  totalPoints: number;
  ordre: number;
}

// Fonction principale pour importer le questionnaire
async function importDevSecOpsQuestionnaire() {
  try {
    console.log('Début de l\'importation du questionnaire DevSecOps...');
    
    // Se connecter à la base de données
    const connection = await mysql.createConnection(dbConfig);
    console.log('Connexion à la base de données établie');
    
    // Définir les thématiques
    const thematiques: DevSecOpsThematique[] = [
      {
        nom: "Culture & Collaboration",
        description: "Évaluation de la culture de sécurité et de la collaboration entre les équipes Dev, Ops et Sec",
        nombreQuestions: 5,
        totalPoints: 50,
        ordre: 1
      },
      {
        nom: "Opérations & CI/CD",
        description: "Évaluation des processus d'intégration continue, de livraison continue et d'opérations",
        nombreQuestions: 8,
        totalPoints: 80,
        ordre: 2
      },
      {
        nom: "Gestion des vulnérabilités & Sûreté du code",
        description: "Évaluation des pratiques de détection et correction des vulnérabilités dans le code",
        nombreQuestions: 6,
        totalPoints: 60,
        ordre: 3
      },
      {
        nom: "Gestion des accès & secrets",
        description: "Évaluation des pratiques de gestion des accès, authentification et secrets",
        nombreQuestions: 5,
        totalPoints: 50,
        ordre: 4
      },
      {
        nom: "Observabilité & Monitoring",
        description: "Évaluation des pratiques de surveillance, détection et analyse des incidents de sécurité",
        nombreQuestions: 5,
        totalPoints: 50,
        ordre: 5
      },
      {
        nom: "Conformité & Gouvernance",
        description: "Évaluation de la gestion des exigences réglementaires et des politiques de sécurité",
        nombreQuestions: 5,
        totalPoints: 50,
        ordre: 6
      },
      {
        nom: "Formation & Sensibilisation",
        description: "Évaluation des pratiques de formation et sensibilisation à la sécurité",
        nombreQuestions: 5,
        totalPoints: 50,
        ordre: 7
      },
      {
        nom: "Satisfaction Client & Time-to-Market",
        description: "Évaluation de l'impact des pratiques DevSecOps sur la satisfaction client et les délais de mise sur le marché",
        nombreQuestions: 6,
        totalPoints: 60,
        ordre: 8
      },
      {
        nom: "Industrialisation & Standardisation",
        description: "Évaluation de la standardisation et industrialisation des pratiques DevSecOps",
        nombreQuestions: 5,
        totalPoints: 50,
        ordre: 9
      }
    ];
    
    // Définir les questions
    const questions: DevSecOpsQuestion[] = [
      // Thématique 1: Culture & Collaboration
      {
        thematique: "Culture & Collaboration",
        texte: "Dans quelle mesure la sécurité est-elle considérée comme une responsabilité partagée entre développement, opérations et sécurité ?",
        ponderation: 2,
        niveau1: "La sécurité est exclusivement gérée par l'équipe de sécurité",
        niveau3: "Collaboration ponctuelle entre équipes sur les questions de sécurité",
        niveau5: "Culture \"security as code\" où chaque membre prend sa part de responsabilité",
        ordre: 1
      },
      {
        thematique: "Culture & Collaboration",
        texte: "Comment évaluez-vous la fréquence et la qualité de la communication entre les équipes Dev, Ops et Sec ?",
        ponderation: 2,
        niveau1: "Communication en silos, uniquement lors d'incidents",
        niveau3: "Réunions régulières entre équipes mais sans structure définie",
        niveau5: "Communication fluide et transparente avec canaux dédiés et rituels établis",
        ordre: 2
      },
      {
        thematique: "Culture & Collaboration",
        texte: "À quel niveau des « Security Champions » sont-ils identifiés et actifs dans les équipes de développement ?",
        ponderation: 2,
        niveau1: "Aucun Security Champion identifié",
        niveau3: "Security Champions nommés mais rôle peu formalisé",
        niveau5: "Programme de Security Champions mature avec formation continue et reconnaissance",
        ordre: 3
      },
      {
        thematique: "Culture & Collaboration",
        texte: "Dans quelle mesure les incidents de sécurité sont-ils systématiquement discutés en rétrospective d'équipe pour en tirer des enseignements ?",
        ponderation: 2,
        niveau1: "Pas d'analyse post-incident formalisée",
        niveau3: "Analyse effectuée mais partage limité entre équipes",
        niveau5: "Culture blameless d'apprentissage avec partage transparent et améliorations systématiques",
        ordre: 4
      },
      {
        thematique: "Culture & Collaboration",
        texte: "À quel niveau le management soutient-il activement et concrètement les initiatives DevSecOps ?",
        ponderation: 2,
        niveau1: "Soutien limité ou uniquement déclaratif",
        niveau3: "Soutien visible mais ressources limitées",
        niveau5: "Engagement total avec allocation de ressources dédiées et reconnaissance des initiatives",
        ordre: 5
      },
      
      // Thématique 2: Opérations & CI/CD
      {
        thematique: "Opérations & CI/CD",
        texte: "Comment évaluez-vous la maturité de vos pratiques de gestion de code source (versioning, branching, etc.) ?",
        ponderation: 2,
        niveau1: "Gestion de code basique sans stratégie définie",
        niveau3: "Stratégie de branching documentée et suivie",
        niveau5: "GitOps complet avec automatisation et qualité de code intégrée",
        ordre: 1
      },
      {
        thematique: "Opérations & CI/CD",
        texte: "Dans quelle mesure des outils d'intégration continue (CI) sont-ils utilisés systématiquement ?",
        ponderation: 2,
        niveau1: "Intégration manuelle ou très limitée",
        niveau3: "CI en place pour les projets majeurs uniquement",
        niveau5: "CI standardisée pour tous les projets avec métriques de qualité",
        ordre: 2
      },
      {
        thematique: "Opérations & CI/CD",
        texte: "À quel niveau les pipelines CI/CD intègrent-ils des contrôles de sécurité automatisés ?",
        ponderation: 2,
        niveau1: "Pas de contrôles de sécurité dans les pipelines",
        niveau3: "Quelques contrôles basiques mais non systématiques",
        niveau5: "Suite complète de contrôles de sécurité automatisés et régulièrement mis à jour",
        ordre: 3
      },
      {
        thematique: "Opérations & CI/CD",
        texte: "Comment évaluez-vous la maturité de votre gestion de configuration automatisée (Infrastructure as Code) ?",
        ponderation: 2,
        niveau1: "Configuration manuelle des environnements",
        niveau3: "Utilisation partielle d'IaC avec documentation",
        niveau5: "IaC complet avec tests, vérifications de sécurité et déploiement immutable",
        ordre: 4
      },
      {
        thematique: "Opérations & CI/CD",
        texte: "À quel niveau vos processus de déploiement sont-ils automatisés et fiabilisés ?",
        ponderation: 2,
        niveau1: "Déploiements principalement manuels avec documentation limitée",
        niveau3: "Déploiements semi-automatisés avec validation manuelle",
        niveau5: "Déploiements entièrement automatisés avec rollback automatique et tests de fumée",
        ordre: 5
      },
      {
        thematique: "Opérations & CI/CD",
        texte: "Dans quelle mesure les tests fonctionnels et utilisateurs sont-ils automatisés dans votre pipeline ?",
        ponderation: 2,
        niveau1: "Tests principalement manuels",
        niveau3: "Tests partiellement automatisés sur fonctionnalités critiques",
        niveau5: "Couverture complète avec tests E2E, UAT automatisés et feedback rapide",
        ordre: 6
      },
      {
        thematique: "Opérations & CI/CD",
        texte: "Comment évaluez-vous la qualité de votre supervision des environnements de développement, test et production ?",
        ponderation: 2,
        niveau1: "Supervision basique ou réactive",
        niveau3: "Monitoring en place avec alertes mais couverture partielle",
        niveau5: "Observabilité complète avec corrélation, prédiction et auto-remédiation",
        ordre: 7
      },
      {
        thematique: "Opérations & CI/CD",
        texte: "À quel niveau votre stratégie de sauvegarde et restauration des données et configurations est-elle mature ?",
        ponderation: 2,
        niveau1: "Sauvegardes manuelles ou irrégulières",
        niveau3: "Processus automatisé mais tests de restauration occasionnels",
        niveau5: "Stratégie complète avec tests réguliers et RPO/RTO définis et respectés",
        ordre: 8
      },
      
      // Thématique 3: Gestion des vulnérabilités & Sûreté du code
      {
        thematique: "Gestion des vulnérabilités & Sûreté du code",
        texte: "Dans quelle mesure les dépendances logicielles sont-elles systématiquement analysées pour les vulnérabilités (SCA) ?",
        ponderation: 2,
        niveau1: "Analyse manuelle occasionnelle ou inexistante",
        niveau3: "Analyse automatisée mais gestion incomplète des résultats",
        niveau5: "SCA intégré avec priorisation intelligente et mise à jour proactive des dépendances",
        ordre: 1
      },
      {
        thematique: "Gestion des vulnérabilités & Sûreté du code",
        texte: "Comment évaluez-vous la rapidité et l'efficacité avec lesquelles les vulnérabilités détectées sont suivies et corrigées ?",
        ponderation: 2,
        niveau1: "Pas de processus formalisé de remediation",
        niveau3: "Processus défini mais avec délais variables",
        niveau5: "SLAs de correction définis selon la criticité et systématiquement suivis",
        ordre: 2
      },
      {
        thematique: "Gestion des vulnérabilités & Sûreté du code",
        texte: "À quel niveau un processus de revue de code avec focus sur la sécurité est-il implémenté ?",
        ponderation: 2,
        niveau1: "Revues de code sans focus sécurité",
        niveau3: "Guidelines de sécurité pour les revues mais application variable",
        niveau5: "Process formalisé avec checklists et outils d'aide à la revue sécurité",
        ordre: 3
      },
      {
        thematique: "Gestion des vulnérabilités & Sûreté du code",
        texte: "Dans quelle mesure les applications sont-elles soumises à des tests de pénétration réguliers et rigoureux ?",
        ponderation: 2,
        niveau1: "Tests de pénétration rares ou uniquement en réaction",
        niveau3: "Tests réguliers mais limités en couverture",
        niveau5: "Programme complet incluant tests manuels experts et automatisés avec rotation des méthodologies",
        ordre: 4
      },
      {
        thematique: "Gestion des vulnérabilités & Sûreté du code",
        texte: "À quel niveau un inventaire précis et à jour des composants logiciels (SBOM) est-il maintenu ?",
        ponderation: 2,
        niveau1: "Pas d'inventaire ou inventaire manuel incomplet",
        niveau3: "Inventaire automatisé mais manque de gouvernance",
        niveau5: "SBOM complet et dynamique avec traçabilité des versions et licences",
        ordre: 5
      },
      {
        thematique: "Gestion des vulnérabilités & Sûreté du code",
        texte: "Comment évaluez-vous la qualité et la sécurité intrinsèque du code développé ?",
        ponderation: 2,
        niveau1: "Pas de standards de codage sécurisé définis",
        niveau3: "Standards définis mais vérification manuelle",
        niveau5: "Standards complets avec vérification automatisée et formation continue",
        ordre: 6
      },
      
      // Continuez avec les autres thématiques
      // Thématique 4: Gestion des accès & secrets
      {
        thematique: "Gestion des accès & secrets",
        texte: "Dans quelle mesure l'accès aux environnements est-il basé sur le principe du moindre privilège ?",
        ponderation: 2,
        niveau1: "Privilèges excessifs fréquents, peu de granularité",
        niveau3: "Politique définie mais application inégale",
        niveau5: "Modèle d'accès just-in-time avec réévaluation continue des permissions",
        ordre: 1
      },
      {
        thematique: "Gestion des accès & secrets",
        texte: "Comment évaluez-vous la maturité de votre gestion centralisée et sécurisée des secrets (mots de passe, clés API, certificats) ?",
        ponderation: 2,
        niveau1: "Stockage non sécurisé ou dans le code",
        niveau3: "Utilisation d'un gestionnaire de secrets mais couverture incomplète",
        niveau5: "Solution complète avec rotation automatique et audit des accès",
        ordre: 2
      },
      {
        thematique: "Gestion des accès & secrets",
        texte: "À quel niveau les accès sont-ils régulièrement audités et révoqués si nécessaire ?",
        ponderation: 2,
        niveau1: "Audits rares ou inexistants",
        niveau3: "Audits périodiques mais sans automatisation",
        niveau5: "Audits continus avec détection d'anomalies et révocation automatisée",
        ordre: 3
      },
      {
        thematique: "Gestion des accès & secrets",
        texte: "Dans quelle mesure l'authentification forte (MFA) est-elle systématiquement appliquée ?",
        ponderation: 2,
        niveau1: "MFA absente ou très limitée",
        niveau3: "MFA pour accès critiques uniquement",
        niveau5: "MFA contextuelle et adaptative pour tous les accès importants",
        ordre: 4
      },
      {
        thematique: "Gestion des accès & secrets",
        texte: "Comment évaluez-vous la sécurité des API exposées par vos applications ?",
        ponderation: 2,
        niveau1: "Sécurité API minimale ou inconsistante",
        niveau3: "Standards API security appliqués manuellement",
        niveau5: "Gouvernance API complète avec gateway, tests automatisés et détection d'anomalies",
        ordre: 5
      },
      
      // Thématique 5: Observabilité & Monitoring
      {
        thematique: "Observabilité & Monitoring",
        texte: "Comment évaluez-vous la capacité de vos outils de monitoring à détecter les comportements anormaux ou malveillants ?",
        ponderation: 2,
        niveau1: "Monitoring basique de disponibilité uniquement",
        niveau3: "Détection de quelques patterns connus d'attaques",
        niveau5: "Détection avancée avec machine learning et corrélation d'événements",
        ordre: 1
      },
      {
        thematique: "Observabilité & Monitoring",
        texte: "À quel niveau les logs de sécurité sont-ils centralisés, normalisés et analysés ?",
        ponderation: 2,
        niveau1: "Logs dispersés ou non exploités",
        niveau3: "Centralisation mais analyse limitée",
        niveau5: "SIEM complet avec enrichissement, corrélation et analyse avancée",
        ordre: 2
      },
      {
        thematique: "Observabilité & Monitoring",
        texte: "Dans quelle mesure les alertes de sécurité sont-elles traitées dans des délais définis et selon un processus structuré ?",
        ponderation: 2,
        niveau1: "Pas de SLA défini, traitement ad hoc",
        niveau3: "SLAs définis mais suivi irrégulier",
        niveau5: "Processus complet avec priorisation automatique et escalade",
        ordre: 3
      },
      {
        thematique: "Observabilité & Monitoring",
        texte: "Comment évaluez-vous la qualité et l'accessibilité d'un tableau de bord de sécurité pour les parties prenantes ?",
        ponderation: 2,
        niveau1: "Pas de tableau de bord ou visualisation très basique",
        niveau3: "Dashboard existant mais peu personnalisable",
        niveau5: "Tableaux de bord complets, adaptés aux différentes parties prenantes, avec visibilité en temps réel",
        ordre: 4
      },
      {
        thematique: "Observabilité & Monitoring",
        texte: "À quel niveau vos applications sont-elles instrumentées pour fournir des métriques, traces et logs pertinents ?",
        ponderation: 2,
        niveau1: "Instrumentation minimale ou inconsistante",
        niveau3: "Instrumentation partielle des applications critiques",
        niveau5: "Observabilité complète avec corrélation de métriques, traces et logs à travers tout le système",
        ordre: 5
      },
      
      // Thématique 6: Conformité & Gouvernance
      {
        thematique: "Conformité & Gouvernance",
        texte: "Dans quelle mesure les exigences réglementaires applicables sont-elles identifiées, suivies et intégrées dans les processus ?",
        ponderation: 2,
        niveau1: "Approche réactive aux obligations réglementaires",
        niveau3: "Principales exigences identifiées mais suivi manuel",
        niveau5: "Compliance as code avec traçabilité automatisée des exigences",
        ordre: 1
      },
      {
        thematique: "Conformité & Gouvernance",
        texte: "À quel niveau des politiques de sécurité sont-elles formalisées, communiquées et régulièrement mises à jour ?",
        ponderation: 2,
        niveau1: "Politiques inexistantes ou obsolètes",
        niveau3: "Politiques documentées mais peu consultées",
        niveau5: "Politiques vivantes, accessibles et intégrées aux workflows",
        ordre: 2
      },
      {
        thematique: "Conformité & Gouvernance",
        texte: "Comment évaluez-vous la régularité et la profondeur des audits de conformité réalisés ?",
        ponderation: 2,
        niveau1: "Audits rares ou uniquement externes",
        niveau3: "Programme d'audit défini mais couverture incomplète",
        niveau5: "Audits continus avec auto-évaluation et vérification externe",
        ordre: 3
      },
      {
        thematique: "Conformité & Gouvernance",
        texte: "À quel niveau un processus de gestion des incidents de sécurité est-il documenté, testé et amélioré ?",
        ponderation: 2,
        niveau1: "Processus informel ou réactif",
        niveau3: "Processus documenté mais rarement testé",
        niveau5: "Processus mature avec simulations régulières et amélioration continue",
        ordre: 4
      },
      {
        thematique: "Conformité & Gouvernance",
        texte: "Comment évaluez-vous la maturité de votre processus d'identification, d'évaluation et de traitement des risques de sécurité ?",
        ponderation: 2,
        niveau1: "Gestion des risques ad hoc ou inexistante",
        niveau3: "Processus formalisé mais évaluation subjective",
        niveau5: "Framework complet avec évaluation quantitative et intégration aux décisions business",
        ordre: 5
      },
      
      // Thématique 7: Formation & Sensibilisation
      {
        thematique: "Formation & Sensibilisation",
        texte: "Dans quelle mesure des formations régulières à la sécurité, adaptées aux rôles, sont-elles dispensées à tous les collaborateurs ?",
        ponderation: 2,
        niveau1: "Formations rares ou génériques",
        niveau3: "Programme de formation structuré mais peu personnalisé",
        niveau5: "Formations continues adaptées aux rôles avec validation des compétences",
        ordre: 1
      },
      {
        thematique: "Formation & Sensibilisation",
        texte: "Comment évaluez-vous l'efficacité des campagnes de sensibilisation à la sécurité organisées ?",
        ponderation: 2,
        niveau1: "Campagnes rares ou basiques",
        niveau3: "Campagnes régulières mais impact peu mesuré",
        niveau5: "Programme continu avec mesure d'efficacité et adaptation au contexte",
        ordre: 2
      },
      {
        thematique: "Formation & Sensibilisation",
        texte: "À quel niveau les nouveaux arrivants reçoivent-ils une formation sécurité complète dès leur arrivée ?",
        ponderation: 2,
        niveau1: "Formation minimale ou générique",
        niveau3: "Onboarding sécurité formalisé mais peu spécifique",
        niveau5: "Parcours complet adapté au rôle avec vérification des acquis",
        ordre: 3
      },
      {
        thematique: "Formation & Sensibilisation",
        texte: "Dans quelle mesure existe-t-il une culture de partage des connaissances en sécurité au sein de l'organisation ?",
        ponderation: 2,
        niveau1: "Partage minimal, connaissances en silos",
        niveau3: "Quelques canaux de partage mais utilisation irrégulière",
        niveau5: "Communautés de pratique actives avec documentation vivante et mentorat",
        ordre: 4
      },
      {
        thematique: "Formation & Sensibilisation",
        texte: "À quel niveau organisez-vous des exercices pratiques de sécurité (CTF, bug bounty interne, simulations) ?",
        ponderation: 2,
        niveau1: "Pas d'exercices pratiques",
        niveau3: "Exercices occasionnels pour certaines équipes",
        niveau5: "Programme régulier d'exercices variés avec gamification et reconnaissance",
        ordre: 5
      },
      
      // Thématique 8: Satisfaction Client & Time-to-Market
      {
        thematique: "Satisfaction Client & Time-to-Market",
        texte: "Comment évaluez-vous la satisfaction des équipes internes vis-à-vis des processus DevSecOps ?",
        ponderation: 2,
        niveau1: "Pas de mesure de satisfaction ou feedback négatif",
        niveau3: "Mesure occasionnelle avec satisfaction modérée",
        niveau5: "Mesure continue avec haute satisfaction et amélioration basée sur le feedback",
        ordre: 1
      },
      {
        thematique: "Satisfaction Client & Time-to-Market",
        texte: "Dans quelle mesure mesurez-vous et prenez-vous en compte la satisfaction des clients externes concernant la qualité et la sécurité des produits ?",
        ponderation: 2,
        niveau1: "Pas de mesure spécifique liée à la sécurité",
        niveau3: "Feedback collecté mais peu exploité pour amélioration",
        niveau5: "Processus complet de collecte, analyse et intégration du feedback client",
        ordre: 2
      },
      {
        thematique: "Satisfaction Client & Time-to-Market",
        texte: "Comment évaluez-vous l'impact des pratiques DevSecOps sur la réduction du time-to-market ?",
        ponderation: 2,
        niveau1: "Sécurité perçue comme frein au déploiement",
        niveau3: "Équilibre trouvé mais avec compromis fréquents",
        niveau5: "Sécurité parfaitement intégrée, accélérant le time-to-market par la confiance et l'automatisation",
        ordre: 3
      },
      {
        thematique: "Satisfaction Client & Time-to-Market",
        texte: "À quel niveau les pratiques DevSecOps contribuent-elles à l'innovation plutôt qu'à la freiner ?",
        ponderation: 2,
        niveau1: "Sécurité vue comme contrainte à l'innovation",
        niveau3: "Coexistence sans forte synergie",
        niveau5: "Sécurité comme enabler d'innovation, permettant d'explorer de nouveaux territoires en confiance",
        ordre: 4
      },
      {
        thematique: "Satisfaction Client & Time-to-Market",
        texte: "Comment évaluez-vous l'efficacité de votre approche pour équilibrer rapidité de livraison et dette technique ?",
        ponderation: 2,
        niveau1: "Dette technique rarement prise en compte",
        niveau3: "Dette identifiée mais adressée de façon irrégulière",
        niveau5: "Stratégie proactive de gestion avec budget dédié et amélioration continue",
        ordre: 5
      },
      {
        thematique: "Satisfaction Client & Time-to-Market",
        texte: "Dans quelle mesure disposez-vous d'indicateurs DORA (Lead Time, Deployment Frequency, MTTR, Change Failure Rate) ou équivalents ?",
        ponderation: 2,
        niveau1: "Pas de mesure systématique de la performance",
        niveau3: "Quelques métriques suivies mais peu exploitées",
        niveau5: "Suite complète de métriques avec analyse de tendance et objectifs d'amélioration",
        ordre: 6
      },
      
      // Thématique 9: Industrialisation & Standardisation
      {
        thematique: "Industrialisation & Standardisation",
        texte: "Comment évaluez-vous le niveau de réutilisation des pratiques DevSecOps entre différents projets ou applications ?",
        ponderation: 2,
        niveau1: "Approches spécifiques par projet, peu de partage",
        niveau3: "Tentatives de standardisation mais adoption inégale",
        niveau5: "Framework interne mature avec composants réutilisables et documentation",
        ordre: 1
      },
      {
        thematique: "Industrialisation & Standardisation",
        texte: "À quel niveau proposez-vous des plateformes standardisées aux équipes (Internal Developer Platform) ?",
        ponderation: 2,
        niveau1: "Pas de plateforme standard, configuration ad hoc",
        niveau3: "Quelques services partagés mais adoption limitée",
        niveau5: "Plateforme complète self-service avec sécurité intégrée et forte adoption",
        ordre: 2
      },
      {
        thematique: "Industrialisation & Standardisation",
        texte: "Dans quelle mesure les environnements de développement, test et production sont-ils cohérents et standardisés ?",
        ponderation: 2,
        niveau1: "Environnements très différents, configuration manuelle",
        niveau3: "Standardisation partielle avec documentation",
        niveau5: "Environnements identiques générés à partir du même code avec différenciation contrôlée",
        ordre: 3
      },
      {
        thematique: "Industrialisation & Standardisation",
        texte: "Comment évaluez-vous l'efficacité du transfert de compétences DevSecOps entre équipes et projets ?",
        ponderation: 2,
        niveau1: "Transfert ad hoc ou inexistant",
        niveau3: "Documentation disponible mais peu de mentorat formalisé",
        niveau5: "Programme structuré avec communauté de pratique, rotation et formation par les pairs",
        ordre: 4
      },
      {
        thematique: "Industrialisation & Standardisation",
        texte: "À quel niveau avez-vous établi un centre d'excellence DevSecOps pour promouvoir et industrialiser les meilleures pratiques ?",
        ponderation: 2,
        niveau1: "Pas d'équipe centrale ou rôle dédié",
        niveau3: "Quelques experts identifiés mais rôle consultatif limité",
        niveau5: "Centre d'excellence mature avec roadmap, outils, formation et gouvernance",
        ordre: 5
      }
    ];
    
    // Créer ou mettre à jour le questionnaire DevSecOps
    const idQuestionnaire = uuidv4();
    await connection.execute(`
      INSERT INTO questionnaires (
        id_questionnaire,
        fonction,
        thematique,
        description
      ) VALUES (?, ?, ?, ?)
    `, [
      idQuestionnaire,
      'Évaluation DevSecOps',
      'DevSecOps',
      'Questionnaire complet d\'évaluation de la maturité DevSecOps (50 questions - 500 points)'
    ]);
    
    console.log(`Questionnaire DevSecOps créé avec l'ID: ${idQuestionnaire}`);
    
    // Créer un tableau de métadonnées pour stocker les infos de niveau
    // Utiliser une table temporaire pour les métadonnées des niveaux
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS question_metadata (
        id_question VARCHAR(36) NOT NULL,
        metadata_key VARCHAR(50) NOT NULL,
        metadata_value TEXT,
        PRIMARY KEY (id_question, metadata_key),
        FOREIGN KEY (id_question) REFERENCES questions(id_question) ON DELETE CASCADE
      )
    `);
    
    // Ajouter les questions
    for (const question of questions) {
      const idQuestion = uuidv4();
      
      // Insérer la question
      await connection.execute(`
        INSERT INTO questions (
          id_question,
          id_questionnaire,
          texte,
          ponderation,
          ordre
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        idQuestion,
        idQuestionnaire,
        question.texte,
        question.ponderation,
        question.ordre
      ]);
      
      // Ajouter les métadonnées pour les niveaux
      await connection.execute(`
        INSERT INTO question_metadata (id_question, metadata_key, metadata_value)
        VALUES (?, ?, ?)
      `, [idQuestion, 'niveau1', question.niveau1]);
      
      await connection.execute(`
        INSERT INTO question_metadata (id_question, metadata_key, metadata_value)
        VALUES (?, ?, ?)
      `, [idQuestion, 'niveau3', question.niveau3]);
      
      await connection.execute(`
        INSERT INTO question_metadata (id_question, metadata_key, metadata_value)
        VALUES (?, ?, ?)
      `, [idQuestion, 'niveau5', question.niveau5]);
      
      await connection.execute(`
        INSERT INTO question_metadata (id_question, metadata_key, metadata_value)
        VALUES (?, ?, ?)
      `, [idQuestion, 'thematique', question.thematique]);
    }
    
    console.log(`${questions.length} questions ajoutées au questionnaire DevSecOps`);
    
    // Fermer la connexion
    await connection.end();
    
    console.log('Importation du questionnaire DevSecOps terminée avec succès!');
  } catch (error) {
    console.error('Erreur lors de l\'importation du questionnaire:', error);
    process.exit(1);
  }
}

// Exécuter la fonction principale
importDevSecOpsQuestionnaire().catch(console.error);