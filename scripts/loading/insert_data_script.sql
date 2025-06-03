-- Script complet pour créer les questionnaires, questions, applications, formulaires et réponses
USE maturity_assessment;

-- Vérifier et créer les fonctions si elles n'existent pas déjà
INSERT INTO fonctions (id_fonction, nom, description)
SELECT UUID(), 'cybersecurite', 'Évaluation des pratiques et processus de cybersécurité'
WHERE NOT EXISTS (SELECT 1 FROM fonctions WHERE nom = 'cybersecurite');

INSERT INTO fonctions (id_fonction, nom, description)
SELECT UUID(), 'acculturation_data', 'Évaluation de la maturité dans l''exploitation et la valorisation des données'
WHERE NOT EXISTS (SELECT 1 FROM fonctions WHERE nom = 'acculturation_data');

INSERT INTO fonctions (id_fonction, nom, description)
SELECT UUID(), 'modele_operationnel', 'Évaluation de l''efficacité du modèle opérationnel IT'
WHERE NOT EXISTS (SELECT 1 FROM fonctions WHERE nom = 'modele_operationnel');

-- Vérifier si les entreprises existent déjà (elles devraient exister d'après les données fournies)
SET @count_enterprises = (SELECT COUNT(*) FROM entreprises);
SELECT CONCAT('Nombre d''entreprises existantes: ', @count_enterprises) AS 'Info';

-- Si aucune entreprise n'existe, en créer
-- Utiliser les id_entreprise existants dans la table acteurs
-- (normalement, vous n'aurez pas besoin de cette partie car les données d'entreprise existent déjà)
INSERT INTO entreprises (id_entreprise, nom_entreprise, secteur)
SELECT DISTINCT id_entreprise, CONCAT('Entreprise-', id_entreprise), 
    ELT(1 + FLOOR(RAND() * 5), 'Technologie', 'Finance', 'Industrie', 'Santé', 'Distribution')
FROM acteurs 
WHERE NOT EXISTS (SELECT 1 FROM entreprises WHERE id_entreprise = acteurs.id_entreprise);

-- Créer les questionnaires
INSERT INTO questionnaires (id_questionnaire, fonction, thematique, description)
VALUES
  (UUID(), 'cybersecurite', 'Évaluation complète', 'Évaluation de la maturité en cybersécurité'),
  (UUID(), 'acculturation_data', 'Évaluation complète', 'Évaluation de la maturité en exploitation des données'),
  (UUID(), 'modele_operationnel', 'Évaluation complète', 'Évaluation de la maturité du modèle opérationnel');

-- Stocker les IDs des questionnaires
SET @id_questionnaire_cyber = (SELECT id_questionnaire FROM questionnaires WHERE fonction = 'cybersecurite' ORDER BY date_creation DESC LIMIT 1);
SET @id_questionnaire_data = (SELECT id_questionnaire FROM questionnaires WHERE fonction = 'acculturation_data' ORDER BY date_creation DESC LIMIT 1);
SET @id_questionnaire_ops = (SELECT id_questionnaire FROM questionnaires WHERE fonction = 'modele_operationnel' ORDER BY date_creation DESC LIMIT 1);

-- Créer ou récupérer les thématiques pour cybersecurite et stocker leurs IDs
-- Récupérer l'ID fonction pour cybersecurite
SET @id_fonction_cyber = (SELECT id_fonction FROM fonctions WHERE nom = 'cybersecurite' LIMIT 1);

-- Thématique 'Gouvernance de Sécurité'
INSERT INTO thematiques (id_thematique, nom, description, id_fonction)
SELECT UUID(), 'Gouvernance de Sécurité', 'Évaluation des politiques et de la gouvernance de sécurité', @id_fonction_cyber
WHERE NOT EXISTS (SELECT 1 FROM thematiques WHERE nom = 'Gouvernance de Sécurité' AND id_fonction = @id_fonction_cyber);

SET @id_thematique_cyber_gouvernance_de_securite = (SELECT id_thematique FROM thematiques WHERE nom = 'Gouvernance de Sécurité' AND id_fonction = @id_fonction_cyber LIMIT 1);

-- Thématique 'Gestion des Risques'
INSERT INTO thematiques (id_thematique, nom, description, id_fonction)
SELECT UUID(), 'Gestion des Risques', 'Évaluation des processus d''identification et de gestion des risques', @id_fonction_cyber
WHERE NOT EXISTS (SELECT 1 FROM thematiques WHERE nom = 'Gestion des Risques' AND id_fonction = @id_fonction_cyber);

SET @id_thematique_cyber_gestion_des_risques = (SELECT id_thematique FROM thematiques WHERE nom = 'Gestion des Risques' AND id_fonction = @id_fonction_cyber LIMIT 1);

-- Thématique 'Gestion des Identités'
INSERT INTO thematiques (id_thematique, nom, description, id_fonction)
SELECT UUID(), 'Gestion des Identités', 'Évaluation des pratiques de gestion des identités et des accès', @id_fonction_cyber
WHERE NOT EXISTS (SELECT 1 FROM thematiques WHERE nom = 'Gestion des Identités' AND id_fonction = @id_fonction_cyber);

SET @id_thematique_cyber_gestion_des_identites = (SELECT id_thematique FROM thematiques WHERE nom = 'Gestion des Identités' AND id_fonction = @id_fonction_cyber LIMIT 1);

-- Thématique 'Protection des Données'
INSERT INTO thematiques (id_thematique, nom, description, id_fonction)
SELECT UUID(), 'Protection des Données', 'Évaluation des mesures de protection des données sensibles', @id_fonction_cyber
WHERE NOT EXISTS (SELECT 1 FROM thematiques WHERE nom = 'Protection des Données' AND id_fonction = @id_fonction_cyber);

SET @id_thematique_cyber_protection_des_donnees = (SELECT id_thematique FROM thematiques WHERE nom = 'Protection des Données' AND id_fonction = @id_fonction_cyber LIMIT 1);

-- Thématique 'Détection & Réponse'
INSERT INTO thematiques (id_thematique, nom, description, id_fonction)
SELECT UUID(), 'Détection & Réponse', 'Évaluation des capacités de détection et de réponse aux incidents', @id_fonction_cyber
WHERE NOT EXISTS (SELECT 1 FROM thematiques WHERE nom = 'Détection & Réponse' AND id_fonction = @id_fonction_cyber);

SET @id_thematique_cyber_detection__reponse = (SELECT id_thematique FROM thematiques WHERE nom = 'Détection & Réponse' AND id_fonction = @id_fonction_cyber LIMIT 1);

-- Thématique 'Résilience & Continuité'
INSERT INTO thematiques (id_thematique, nom, description, id_fonction)
SELECT UUID(), 'Résilience & Continuité', 'Évaluation de la résilience et des plans de continuité', @id_fonction_cyber
WHERE NOT EXISTS (SELECT 1 FROM thematiques WHERE nom = 'Résilience & Continuité' AND id_fonction = @id_fonction_cyber);

SET @id_thematique_cyber_resilience__continuite = (SELECT id_thematique FROM thematiques WHERE nom = 'Résilience & Continuité' AND id_fonction = @id_fonction_cyber LIMIT 1);

-- Thématique 'Culture & Sensibilisation'
INSERT INTO thematiques (id_thematique, nom, description, id_fonction)
SELECT UUID(), 'Culture & Sensibilisation', 'Évaluation de la culture de sécurité et des programmes de sensibilisation', @id_fonction_cyber
WHERE NOT EXISTS (SELECT 1 FROM thematiques WHERE nom = 'Culture & Sensibilisation' AND id_fonction = @id_fonction_cyber);

SET @id_thematique_cyber_culture__sensibilisation = (SELECT id_thematique FROM thematiques WHERE nom = 'Culture & Sensibilisation' AND id_fonction = @id_fonction_cyber LIMIT 1);

-- Thématique 'Chaîne d''Approvisionnement'
INSERT INTO thematiques (id_thematique, nom, description, id_fonction)
SELECT UUID(), 'Chaîne d''Approvisionnement', 'Évaluation de la sécurité de la chaîne d''approvisionnement', @id_fonction_cyber
WHERE NOT EXISTS (SELECT 1 FROM thematiques WHERE nom = 'Chaîne d''Approvisionnement' AND id_fonction = @id_fonction_cyber);

SET @id_thematique_cyber_chaine_approvisionnement = (SELECT id_thematique FROM thematiques WHERE nom = 'Chaîne d''Approvisionnement' AND id_fonction = @id_fonction_cyber LIMIT 1);

-- Récupérer l'ID fonction pour acculturation_data
SET @id_fonction_data = (SELECT id_fonction FROM fonctions WHERE nom = 'acculturation_data' LIMIT 1);

-- Thématique 'Stratégie Data'
INSERT INTO thematiques (id_thematique, nom, description, id_fonction)
SELECT UUID(), 'Stratégie Data', 'Évaluation de la vision et stratégie de valorisation des données', @id_fonction_data
WHERE NOT EXISTS (SELECT 1 FROM thematiques WHERE nom = 'Stratégie Data' AND id_fonction = @id_fonction_data);

SET @id_thematique_data_strategie_data = (SELECT id_thematique FROM thematiques WHERE nom = 'Stratégie Data' AND id_fonction = @id_fonction_data LIMIT 1);

-- Thématique 'Gouvernance des Données'
INSERT INTO thematiques (id_thematique, nom, description, id_fonction)
SELECT UUID(), 'Gouvernance des Données', 'Évaluation des pratiques de gouvernance et de qualité des données', @id_fonction_data
WHERE NOT EXISTS (SELECT 1 FROM thematiques WHERE nom = 'Gouvernance des Données' AND id_fonction = @id_fonction_data);

SET @id_thematique_data_gouvernance_des_donnees = (SELECT id_thematique FROM thematiques WHERE nom = 'Gouvernance des Données' AND id_fonction = @id_fonction_data LIMIT 1);

-- Thématique 'Architecture Data'
INSERT INTO thematiques (id_thematique, nom, description, id_fonction)
SELECT UUID(), 'Architecture Data', 'Évaluation de l''architecture de données et des plateformes analytiques', @id_fonction_data
WHERE NOT EXISTS (SELECT 1 FROM thematiques WHERE nom = 'Architecture Data' AND id_fonction = @id_fonction_data);

SET @id_thematique_data_architecture_data = (SELECT id_thematique FROM thematiques WHERE nom = 'Architecture Data' AND id_fonction = @id_fonction_data LIMIT 1);

-- Thématique 'Compétences & Culture'
INSERT INTO thematiques (id_thematique, nom, description, id_fonction)
SELECT UUID(), 'Compétences & Culture', 'Évaluation des compétences data et de la culture data-driven', @id_fonction_data
WHERE NOT EXISTS (SELECT 1 FROM thematiques WHERE nom = 'Compétences & Culture' AND id_fonction = @id_fonction_data);

SET @id_thematique_data_competences__culture = (SELECT id_thematique FROM thematiques WHERE nom = 'Compétences & Culture' AND id_fonction = @id_fonction_data LIMIT 1);

-- Thématique 'Analytique & BI'
INSERT INTO thematiques (id_thematique, nom, description, id_fonction)
SELECT UUID(), 'Analytique & BI', 'Évaluation de la maturité en analytique et business intelligence', @id_fonction_data
WHERE NOT EXISTS (SELECT 1 FROM thematiques WHERE nom = 'Analytique & BI' AND id_fonction = @id_fonction_data);

SET @id_thematique_data_analytique__bi = (SELECT id_thematique FROM thematiques WHERE nom = 'Analytique & BI' AND id_fonction = @id_fonction_data LIMIT 1);

-- Thématique 'IA & Advanced Analytics'
INSERT INTO thematiques (id_thematique, nom, description, id_fonction)
SELECT UUID(), 'IA & Advanced Analytics', 'Évaluation de l''utilisation de l''IA et des analyses avancées', @id_fonction_data
WHERE NOT EXISTS (SELECT 1 FROM thematiques WHERE nom = 'IA & Advanced Analytics' AND id_fonction = @id_fonction_data);

SET @id_thematique_data_ia__advanced_analytics = (SELECT id_thematique FROM thematiques WHERE nom = 'IA & Advanced Analytics' AND id_fonction = @id_fonction_data LIMIT 1);

-- Thématique 'Éthique & Responsabilité'
INSERT INTO thematiques (id_thematique, nom, description, id_fonction)
SELECT UUID(), 'Éthique & Responsabilité', 'Évaluation des pratiques éthiques et responsables de l''utilisation des données', @id_fonction_data
WHERE NOT EXISTS (SELECT 1 FROM thematiques WHERE nom = 'Éthique & Responsabilité' AND id_fonction = @id_fonction_data);

SET @id_thematique_data_ethique__responsabilite = (SELECT id_thematique FROM thematiques WHERE nom = 'Éthique & Responsabilité' AND id_fonction = @id_fonction_data LIMIT 1);

-- Thématique 'Monétisation & Valeur'
INSERT INTO thematiques (id_thematique, nom, description, id_fonction)
SELECT UUID(), 'Monétisation & Valeur', 'Évaluation des capacités à valoriser et monétiser les données', @id_fonction_data
WHERE NOT EXISTS (SELECT 1 FROM thematiques WHERE nom = 'Monétisation & Valeur' AND id_fonction = @id_fonction_data);

SET @id_thematique_data_monetisation__valeur = (SELECT id_thematique FROM thematiques WHERE nom = 'Monétisation & Valeur' AND id_fonction = @id_fonction_data LIMIT 1);

-- Récupérer l'ID fonction pour modele_operationnel
SET @id_fonction_ops = (SELECT id_fonction FROM fonctions WHERE nom = 'modele_operationnel' LIMIT 1);

-- Thématique 'Structure Organisationnelle'
INSERT INTO thematiques (id_thematique, nom, description, id_fonction)
SELECT UUID(), 'Structure Organisationnelle', 'Évaluation de l''efficacité de la structure organisationnelle IT', @id_fonction_ops
WHERE NOT EXISTS (SELECT 1 FROM thematiques WHERE nom = 'Structure Organisationnelle' AND id_fonction = @id_fonction_ops);

SET @id_thematique_ops_structure_organisationnelle = (SELECT id_thematique FROM thematiques WHERE nom = 'Structure Organisationnelle' AND id_fonction = @id_fonction_ops LIMIT 1);

-- Thématique 'Processus & Méthodes'
INSERT INTO thematiques (id_thematique, nom, description, id_fonction)
SELECT UUID(), 'Processus & Méthodes', 'Évaluation de la maturité des processus et méthodes de travail', @id_fonction_ops
WHERE NOT EXISTS (SELECT 1 FROM thematiques WHERE nom = 'Processus & Méthodes' AND id_fonction = @id_fonction_ops);

SET @id_thematique_ops_processus__methodes = (SELECT id_thematique FROM thematiques WHERE nom = 'Processus & Méthodes' AND id_fonction = @id_fonction_ops LIMIT 1);

-- Thématique 'Gestion des Services'
INSERT INTO thematiques (id_thematique, nom, description, id_fonction)
SELECT UUID(), 'Gestion des Services', 'Évaluation des pratiques de gestion des services IT', @id_fonction_ops
WHERE NOT EXISTS (SELECT 1 FROM thematiques WHERE nom = 'Gestion des Services' AND id_fonction = @id_fonction_ops);

SET @id_thematique_ops_gestion_des_services = (SELECT id_thematique FROM thematiques WHERE nom = 'Gestion des Services' AND id_fonction = @id_fonction_ops LIMIT 1);

-- Thématique 'Performance & Mesure'
INSERT INTO thematiques (id_thematique, nom, description, id_fonction)
SELECT UUID(), 'Performance & Mesure', 'Évaluation des mécanismes de mesure et d''amélioration de la performance', @id_fonction_ops
WHERE NOT EXISTS (SELECT 1 FROM thematiques WHERE nom = 'Performance & Mesure' AND id_fonction = @id_fonction_ops);

SET @id_thematique_ops_performance__mesure = (SELECT id_thematique FROM thematiques WHERE nom = 'Performance & Mesure' AND id_fonction = @id_fonction_ops LIMIT 1);

-- Thématique 'Stratégie de Sourcing'
INSERT INTO thematiques (id_thematique, nom, description, id_fonction)
SELECT UUID(), 'Stratégie de Sourcing', 'Évaluation de la stratégie d''approvisionnement et de gestion des fournisseurs', @id_fonction_ops
WHERE NOT EXISTS (SELECT 1 FROM thematiques WHERE nom = 'Stratégie de Sourcing' AND id_fonction = @id_fonction_ops);

SET @id_thematique_ops_strategie_de_sourcing = (SELECT id_thematique FROM thematiques WHERE nom = 'Stratégie de Sourcing' AND id_fonction = @id_fonction_ops LIMIT 1);

-- Thématique 'Transformation & Agilité'
INSERT INTO thematiques (id_thematique, nom, description, id_fonction)
SELECT UUID(), 'Transformation & Agilité', 'Évaluation de la capacité à s''adapter et se transformer', @id_fonction_ops
WHERE NOT EXISTS (SELECT 1 FROM thematiques WHERE nom = 'Transformation & Agilité' AND id_fonction = @id_fonction_ops);

SET @id_thematique_ops_transformation__agilite = (SELECT id_thematique FROM thematiques WHERE nom = 'Transformation & Agilité' AND id_fonction = @id_fonction_ops LIMIT 1);

-- Thématique 'Automatisation & Efficacité'
INSERT INTO thematiques (id_thematique, nom, description, id_fonction)
SELECT UUID(), 'Automatisation & Efficacité', 'Évaluation du niveau d''automatisation et d''efficacité opérationnelle', @id_fonction_ops
WHERE NOT EXISTS (SELECT 1 FROM thematiques WHERE nom = 'Automatisation & Efficacité' AND id_fonction = @id_fonction_ops);

SET @id_thematique_ops_automatisation__efficacite = (SELECT id_thematique FROM thematiques WHERE nom = 'Automatisation & Efficacité' AND id_fonction = @id_fonction_ops LIMIT 1);

-- Créer des applications pour chaque entreprise
-- Récupérer la liste des IDs d'entreprise
DROP TEMPORARY TABLE IF EXISTS temp_enterprises;
CREATE TEMPORARY TABLE temp_enterprises AS
SELECT DISTINCT id_entreprise FROM acteurs ORDER BY id_entreprise;

-- Créer 2 applications par entreprise
INSERT INTO applications (id_application, nom_application, statut, type, hebergement, architecture_logicielle, id_entreprise, date_mise_en_prod, language, editeur, description)
SELECT 
    UUID(), 
    CONCAT('App-', e.id_entreprise, '-1'),
    IF(RAND() < 0.8, 'Run', 'Projet'),
    IF(RAND() < 0.6, 'Build', 'Buy'),
    ELT(1 + FLOOR(RAND() * 3), 'Cloud', 'Prem', 'Hybrid'),
    ELT(1 + FLOOR(RAND() * 4), 'ERP', 'Multitenant SAAS', 'MVC', 'Monolithique'),
    e.id_entreprise,
    DATE_SUB(CURRENT_DATE, INTERVAL FLOOR(365 + RAND() * 730) DAY),
    ELT(1 + FLOOR(RAND() * 5), 'Java', 'Python', 'C#', 'JavaScript', 'PHP'),
    ELT(1 + FLOOR(RAND() * 5), 'Microsoft', 'Oracle', 'SAP', 'IBM', 'In-house'),
    CONCAT('Application principale pour ', e.id_entreprise)
FROM temp_enterprises e;

INSERT INTO applications (id_application, nom_application, statut, type, hebergement, architecture_logicielle, id_entreprise, date_mise_en_prod, language, editeur, description)
SELECT 
    UUID(), 
    CONCAT('App-', e.id_entreprise, '-2'),
    IF(RAND() < 0.8, 'Run', 'Projet'),
    IF(RAND() < 0.6, 'Build', 'Buy'),
    ELT(1 + FLOOR(RAND() * 3), 'Cloud', 'Prem', 'Hybrid'),
    ELT(1 + FLOOR(RAND() * 4), 'ERP', 'Multitenant SAAS', 'MVC', 'Monolithique'),
    e.id_entreprise,
    DATE_SUB(CURRENT_DATE, INTERVAL FLOOR(365 + RAND() * 730) DAY),
    ELT(1 + FLOOR(RAND() * 5), 'Java', 'Python', 'C#', 'JavaScript', 'PHP'),
    ELT(1 + FLOOR(RAND() * 5), 'Microsoft', 'Oracle', 'SAP', 'IBM', 'In-house'),
    CONCAT('Application secondaire pour ', e.id_entreprise)
FROM temp_enterprises e;

-- Stocker les IDs d'application pour chaque entreprise
DROP TEMPORARY TABLE IF EXISTS temp_apps;
CREATE TEMPORARY TABLE temp_apps AS
SELECT id_application, id_entreprise FROM applications;

-- Créer 50 questions pour le questionnaire cybersecurite
-- Gouvernance de Sécurité (6 questions)
INSERT INTO questions (id_question, id_questionnaire, id_thematique, texte, ponderation, ordre)
VALUES
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_gouvernance_de_securite, 'Existe-t-il une politique de sécurité formalisée et documentée ?', 10, 1),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_gouvernance_de_securite, 'La politique de sécurité est-elle révisée régulièrement ?', 10, 2),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_gouvernance_de_securite, 'Existe-t-il un responsable de la sécurité (RSSI/CISO) clairement identifié ?', 10, 3),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_gouvernance_de_securite, 'Un comité de pilotage de la sécurité se réunit-il régulièrement ?', 10, 4),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_gouvernance_de_securite, 'Le management supporte-t-il activement les initiatives de sécurité ?', 10, 5),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_gouvernance_de_securite, 'Existe-t-il des indicateurs de performance de sécurité (KPI) suivis régulièrement ?', 10, 6);

-- Gestion des Risques (6 questions)
INSERT INTO questions (id_question, id_questionnaire, id_thematique, texte, ponderation, ordre)
VALUES
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_gestion_des_risques, 'Une méthodologie formelle d''analyse des risques est-elle appliquée ?', 10, 7),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_gestion_des_risques, 'Les risques de sécurité sont-ils régulièrement réévalués ?', 10, 8),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_gestion_des_risques, 'Existe-t-il un registre des risques maintenu à jour ?', 10, 9),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_gestion_des_risques, 'Les plans de traitement des risques sont-ils suivis et contrôlés ?', 10, 10),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_gestion_des_risques, 'L''appétence au risque est-elle définie et communiquée ?', 10, 11),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_gestion_des_risques, 'Les scénarios d''attaque sont-ils analysés et pris en compte ?', 10, 12);

-- Gestion des Identités (7 questions)
INSERT INTO questions (id_question, id_questionnaire, id_thematique, texte, ponderation, ordre)
VALUES
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_gestion_des_identites, 'L''authentification forte (MFA) est-elle déployée pour les accès privilégiés ?', 10, 13),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_gestion_des_identites, 'La gestion des identités est-elle centralisée ?', 10, 14),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_gestion_des_identites, 'Les droits d''accès sont-ils régulièrement revus ?', 10, 15),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_gestion_des_identites, 'Le principe du moindre privilège est-il appliqué ?', 10, 16),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_gestion_des_identites, 'Existe-t-il un processus formalisé de révocation des accès ?', 10, 17),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_gestion_des_identites, 'Les comptes à privilèges font-ils l''objet d''une surveillance particulière ?', 10, 18),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_gestion_des_identites, 'L''entreprise utilise-t-elle un système de gestion des identités (IAM) ?', 10, 19);

-- Protection des Données (6 questions)
INSERT INTO questions (id_question, id_questionnaire, id_thematique, texte, ponderation, ordre)
VALUES
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_protection_des_donnees, 'Une classification des données est-elle en place ?', 10, 20),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_protection_des_donnees, 'Le chiffrement des données sensibles est-il appliqué ?', 10, 21),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_protection_des_donnees, 'Des contrôles d''accès aux données sont-ils en place selon leur sensibilité ?', 10, 22),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_protection_des_donnees, 'La protection des données en transit est-elle assurée ?', 10, 23),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_protection_des_donnees, 'Des solutions de DLP (Data Loss Prevention) sont-elles déployées ?', 10, 24),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_protection_des_donnees, 'La conformité aux réglementations sur les données (RGPD, etc.) est-elle assurée ?', 10, 25);

-- Détection & Réponse (8 questions)
INSERT INTO questions (id_question, id_questionnaire, id_thematique, texte, ponderation, ordre)
VALUES
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_detection__reponse, 'Un SOC (Security Operations Center) est-il en place ?', 10, 26),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_detection__reponse, 'Des solutions SIEM sont-elles déployées ?', 10, 27),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_detection__reponse, 'Une surveillance 24/7 est-elle assurée ?', 10, 28),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_detection__reponse, 'Le temps de détection des incidents est-il mesuré ?', 10, 29),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_detection__reponse, 'Existe-t-il une procédure formalisée de réponse aux incidents ?', 10, 30),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_detection__reponse, 'Des investigations numériques (forensics) peuvent-elles être menées ?', 10, 31),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_detection__reponse, 'Les incidents de sécurité font-ils l''objet d''une analyse post-mortem ?', 10, 32),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_detection__reponse, 'Des outils de détection avancée (EDR, NDR) sont-ils déployés ?', 10, 33);

-- Résilience & Continuité (6 questions)
INSERT INTO questions (id_question, id_questionnaire, id_thematique, texte, ponderation, ordre)
VALUES
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_resilience__continuite, 'Un plan de continuité d''activité (PCA) est-il documenté et testé ?', 10, 34),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_resilience__continuite, 'Des sauvegardes régulières sont-elles réalisées et testées ?', 10, 35),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_resilience__continuite, 'Une stratégie de reprise après sinistre est-elle définie ?', 10, 36),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_resilience__continuite, 'Des exercices de simulation de crise sont-ils réalisés ?', 10, 37),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_resilience__continuite, 'Le RPO (Recovery Point Objective) et RTO (Recovery Time Objective) sont-ils définis ?', 10, 38),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_resilience__continuite, 'Des sites de secours sont-ils disponibles en cas de besoin ?', 10, 39);

-- Culture & Sensibilisation (5 questions)
INSERT INTO questions (id_question, id_questionnaire, id_thematique, texte, ponderation, ordre)
VALUES
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_culture__sensibilisation, 'Des formations de sensibilisation à la sécurité sont-elles dispensées régulièrement ?', 10, 40),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_culture__sensibilisation, 'Des campagnes de phishing simulé sont-elles réalisées ?', 10, 41),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_culture__sensibilisation, 'Les nouveaux employés reçoivent-ils une formation sur la sécurité ?', 10, 42),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_culture__sensibilisation, 'La direction communique-t-elle sur l''importance de la sécurité ?', 10, 43),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_culture__sensibilisation, 'Existe-t-il un programme de récompense pour signalement de vulnérabilités ?', 10, 44);

-- Chaîne d'Approvisionnement (6 questions)
INSERT INTO questions (id_question, id_questionnaire, id_thematique, texte, ponderation, ordre)
VALUES
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_chaine_approvisionnement, 'Les fournisseurs font-ils l''objet d''une évaluation de sécurité ?', 10, 45),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_chaine_approvisionnement, 'Les contrats avec les fournisseurs incluent-ils des clauses de sécurité ?', 10, 46),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_chaine_approvisionnement, 'Le niveau de sécurité des fournisseurs est-il surveillé dans le temps ?', 10, 47),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_chaine_approvisionnement, 'Des audits de sécurité sont-ils réalisés chez les fournisseurs critiques ?', 10, 48),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_chaine_approvisionnement, 'Des plans de continuité sont-ils définis en cas de défaillance d''un fournisseur ?', 10, 49),
(UUID(), @id_questionnaire_cyber, @id_thematique_cyber_chaine_approvisionnement, 'La sécurité des composants logiciels tiers est-elle vérifiée ?', 10, 50);

-- Créer 50 questions pour le questionnaire acculturation_data
-- Stratégie Data (6 questions)
INSERT INTO questions (id_question, id_questionnaire, id_thematique, texte, ponderation, ordre)
VALUES
(UUID(), @id_questionnaire_data, @id_thematique_data_strategie_data, 'Existe-t-il une stratégie data formalisée et alignée avec la stratégie d''entreprise ?', 10, 1),
(UUID(), @id_questionnaire_data, @id_thematique_data_strategie_data, 'Des objectifs mesurables sont-ils définis pour la valorisation des données ?', 10, 2),
(UUID(), @id_questionnaire_data, @id_thematique_data_strategie_data, 'La direction est-elle impliquée dans la définition de la stratégie data ?', 10, 3),
(UUID(), @id_questionnaire_data, @id_thematique_data_strategie_data, 'Un inventaire des cas d''usage à valeur ajoutée est-il maintenu ?', 10, 4),
(UUID(), @id_questionnaire_data, @id_thematique_data_strategie_data, 'La stratégie data fait-elle l''objet d''une revue régulière ?', 10, 5),
(UUID(), @id_questionnaire_data, @id_thematique_data_strategie_data, 'Existe-t-il un Chief Data Officer ou équivalent ?', 10, 6);

-- Gouvernance des Données (7 questions)
INSERT INTO questions (id_question, id_questionnaire, id_thematique, texte, ponderation, ordre)
VALUES
(UUID(), @id_questionnaire_data, @id_thematique_data_gouvernance_des_donnees, 'Un cadre de gouvernance des données est-il formalisé ?', 10, 7),
(UUID(), @id_questionnaire_data, @id_thematique_data_gouvernance_des_donnees, 'Des data owners sont-ils identifiés pour les données critiques ?', 10, 8),
(UUID(), @id_questionnaire_data, @id_thematique_data_gouvernance_des_donnees, 'La qualité des données fait-elle l''objet d''une mesure régulière ?', 10, 9),
(UUID(), @id_questionnaire_data, @id_thematique_data_gouvernance_des_donnees, 'Un dictionnaire de données (métadonnées) est-il disponible ?', 10, 10),
(UUID(), @id_questionnaire_data, @id_thematique_data_gouvernance_des_donnees, 'Des procédures de gestion du cycle de vie des données sont-elles définies ?', 10, 11),
(UUID(), @id_questionnaire_data, @id_thematique_data_gouvernance_des_donnees, 'Les problèmes de qualité des données sont-ils adressés à la source ?', 10, 12),
(UUID(), @id_questionnaire_data, @id_thematique_data_gouvernance_des_donnees, 'Un conseil de gouvernance des données se réunit-il régulièrement ?', 10, 13);

-- Architecture Data (6 questions)
INSERT INTO questions (id_question, id_questionnaire, id_thematique, texte, ponderation, ordre)
VALUES
(UUID(), @id_questionnaire_data, @id_thematique_data_architecture_data, 'Une architecture de données formalisée existe-t-elle ?', 10, 14),
(UUID(), @id_questionnaire_data, @id_thematique_data_architecture_data, 'Des data lakes ou data warehouses sont-ils en place ?', 10, 15),
(UUID(), @id_questionnaire_data, @id_thematique_data_architecture_data, 'L''architecture supporte-t-elle des cas d''usage variés (batch, temps réel) ?', 10, 16),
(UUID(), @id_questionnaire_data, @id_thematique_data_architecture_data, 'L''architecture est-elle évolutive et scalable ?', 10, 17),
(UUID(), @id_questionnaire_data, @id_thematique_data_architecture_data, 'Des plateformes de self-service analytics sont-elles disponibles ?', 10, 18),
(UUID(), @id_questionnaire_data, @id_thematique_data_architecture_data, 'L''architecture est-elle régulièrement revue et mise à jour ?', 10, 19);

-- Compétences & Culture (6 questions)
INSERT INTO questions (id_question, id_questionnaire, id_thematique, texte, ponderation, ordre)
VALUES
(UUID(), @id_questionnaire_data, @id_thematique_data_competences__culture, 'Existe-t-il un programme de formation aux compétences data ?', 10, 20),
(UUID(), @id_questionnaire_data, @id_thematique_data_competences__culture, 'Les décisions sont-elles régulièrement basées sur des données ?', 10, 21),
(UUID(), @id_questionnaire_data, @id_thematique_data_competences__culture, 'Des data champions sont-ils identifiés dans les différents métiers ?', 10, 22),
(UUID(), @id_questionnaire_data, @id_thematique_data_competences__culture, 'Le niveau de data literacy des collaborateurs est-il évalué ?', 10, 23),
(UUID(), @id_questionnaire_data, @id_thematique_data_competences__culture, 'Les équipes métier ont-elles accès à des ressources data en self-service ?', 10, 24),
(UUID(), @id_questionnaire_data, @id_thematique_data_competences__culture, 'Des communautés de pratique data existent-elles ?', 10, 25);

-- Analytique & BI (7 questions)
INSERT INTO questions (id_question, id_questionnaire, id_thematique, texte, ponderation, ordre)
VALUES
(UUID(), @id_questionnaire_data, @id_thematique_data_analytique__bi, 'Des outils de BI modernes sont-ils déployés ?', 10, 26),
(UUID(), @id_questionnaire_data, @id_thematique_data_analytique__bi, 'Les KPIs métier sont-ils définis et suivis via des dashboards ?', 10, 27),
(UUID(), @id_questionnaire_data, @id_thematique_data_analytique__bi, 'Les analyses sont-elles disponibles sur mobile ?', 10, 28),
(UUID(), @id_questionnaire_data, @id_thematique_data_analytique__bi, 'Les utilisateurs peuvent-ils créer leurs propres analyses ?', 10, 29),
(UUID(), @id_questionnaire_data, @id_thematique_data_analytique__bi, 'L''analytique est-elle intégrée dans les applications métier ?', 10, 30),
(UUID(), @id_questionnaire_data, @id_thematique_data_analytique__bi, 'Des alertes basées sur les données sont-elles configurées ?', 10, 31),
(UUID(), @id_questionnaire_data, @id_thematique_data_analytique__bi, 'L''utilisation des dashboards et rapports est-elle mesurée ?', 10, 32);

-- IA & Advanced Analytics (5 questions)
INSERT INTO questions (id_question, id_questionnaire, id_thematique, texte, ponderation, ordre)
VALUES
(UUID(), @id_questionnaire_data, @id_thematique_data_ia__advanced_analytics, 'Des modèles prédictifs sont-ils déployés en production ?', 10, 33),
(UUID(), @id_questionnaire_data, @id_thematique_data_ia__advanced_analytics, 'Existe-t-il une équipe dédiée à l''IA/ML ?', 10, 34),
(UUID(), @id_questionnaire_data, @id_thematique_data_ia__advanced_analytics, 'Une plateforme MLOps est-elle en place ?', 10, 35),
(UUID(), @id_questionnaire_data, @id_thematique_data_ia__advanced_analytics, 'Des processus de validation des modèles sont-ils formalisés ?', 10, 36),
(UUID(), @id_questionnaire_data, @id_thematique_data_ia__advanced_analytics, 'Les modèles font-ils l''objet d''un monitoring en production ?', 10, 37);

-- Éthique & Responsabilité (6 questions)
INSERT INTO questions (id_question, id_questionnaire, id_thematique, texte, ponderation, ordre)
VALUES
(UUID(), @id_questionnaire_data, @id_thematique_data_ethique__responsabilite, 'Une charte d''éthique des données est-elle formalisée ?', 10, 38),
(UUID(), @id_questionnaire_data, @id_thematique_data_ethique__responsabilite, 'Les algorithmes sont-ils évalués pour leurs biais potentiels ?', 10, 39),
(UUID(), @id_questionnaire_data, @id_thematique_data_ethique__responsabilite, 'La transparence des modèles est-elle recherchée ?', 10, 40),
(UUID(), @id_questionnaire_data, @id_thematique_data_ethique__responsabilite, 'Les considérations éthiques sont-elles intégrées dès la conception ?', 10, 41),
(UUID(), @id_questionnaire_data, @id_thematique_data_ethique__responsabilite, 'Le consentement des utilisateurs est-il géré de manière transparente ?', 10, 42),
(UUID(), @id_questionnaire_data, @id_thematique_data_ethique__responsabilite, 'Des audits d''algorithmes sont-ils réalisés ?', 10, 43);

-- Monétisation & Valeur (7 questions)
INSERT INTO questions (id_question, id_questionnaire, id_thematique, texte, ponderation, ordre)
VALUES
(UUID(), @id_questionnaire_data, @id_thematique_data_monetisation__valeur, 'L''impact business des initiatives data est-il mesuré ?', 10, 44),
(UUID(), @id_questionnaire_data, @id_thematique_data_monetisation__valeur, 'Des produits basés sur les données ont-ils été développés ?', 10, 45),
(UUID(), @id_questionnaire_data, @id_thematique_data_monetisation__valeur, 'Des partenariats data sont-ils mis en place ?', 10, 46),
(UUID(), @id_questionnaire_data, @id_thematique_data_monetisation__valeur, 'Une stratégie de valorisation des données est-elle définie ?', 10, 47),
(UUID(), @id_questionnaire_data, @id_thematique_data_monetisation__valeur, 'Les données sont-elles considérées comme un actif stratégique ?', 10, 48),
(UUID(), @id_questionnaire_data, @id_thematique_data_monetisation__valeur, 'Des revenus directs sont-ils générés par les données ?', 10, 49),
(UUID(), @id_questionnaire_data, @id_thematique_data_monetisation__valeur, 'Le ROI des initiatives data est-il calculé ?', 10, 50);

-- Créer 50 questions pour le questionnaire modele_operationnel
-- Structure Organisationnelle (7 questions)
INSERT INTO questions (id_question, id_questionnaire, id_thematique, texte, ponderation, ordre)
VALUES
(UUID(), @id_questionnaire_ops, @id_thematique_ops_structure_organisationnelle, 'L''organisation IT est-elle clairement définie et documentée ?', 10, 1),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_structure_organisationnelle, 'Les rôles et responsabilités sont-ils clairement définis ?', 10, 2),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_structure_organisationnelle, 'L''organisation favorise-t-elle la collaboration cross-fonctionnelle ?', 10, 3),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_structure_organisationnelle, 'La structure organisationnelle est-elle alignée avec les objectifs business ?', 10, 4),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_structure_organisationnelle, 'L''organisation permet-elle une prise de décision rapide ?', 10, 5),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_structure_organisationnelle, 'Des équipes pluridisciplinaires sont-elles en place ?', 10, 6),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_structure_organisationnelle, 'L''organisation fait-elle l''objet d''une évaluation régulière ?', 10, 7);

-- Processus & Méthodes (8 questions)
INSERT INTO questions (id_question, id_questionnaire, id_thematique, texte, ponderation, ordre)
VALUES
(UUID(), @id_questionnaire_ops, @id_thematique_ops_processus__methodes, 'Les principaux processus IT sont-ils documentés ?', 10, 8),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_processus__methodes, 'Des méthodologies agiles sont-elles adoptées ?', 10, 9),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_processus__methodes, 'Les processus font-ils l''objet d''une amélioration continue ?', 10, 10),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_processus__methodes, 'Des rituels d''échange sont-ils en place et respectés ?', 10, 11),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_processus__methodes, 'Les processus sont-ils alignés sur les frameworks standards (ITIL, DevOps) ?', 10, 12),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_processus__methodes, 'La performance des processus est-elle mesurée ?', 10, 13),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_processus__methodes, 'Les processus sont-ils optimisés pour réduire les goulots d''étranglement ?', 10, 14),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_processus__methodes, 'Une gestion de la connaissance est-elle en place ?', 10, 15);

-- Gestion des Services (7 questions)
INSERT INTO questions (id_question, id_questionnaire, id_thematique, texte, ponderation, ordre)
VALUES
(UUID(), @id_questionnaire_ops, @id_thematique_ops_gestion_des_services, 'Un catalogue de services IT est-il défini et maintenu ?', 10, 16),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_gestion_des_services, 'Des SLAs sont-ils définis pour les services critiques ?', 10, 17),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_gestion_des_services, 'Un processus de gestion des incidents est-il en place ?', 10, 18),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_gestion_des_services, 'Un processus de gestion des problèmes est-il en place ?', 10, 19),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_gestion_des_services, 'Un processus de gestion des changements est-il appliqué ?', 10, 20),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_gestion_des_services, 'La satisfaction des utilisateurs est-elle mesurée ?', 10, 21),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_gestion_des_services, 'Une démarche d''amélioration continue des services est-elle en place ?', 10, 22);

-- Performance & Mesure (6 questions)
INSERT INTO questions (id_question, id_questionnaire, id_thematique, texte, ponderation, ordre)
VALUES
(UUID(), @id_questionnaire_ops, @id_thematique_ops_performance__mesure, 'Des KPIs opérationnels sont-ils définis et suivis ?', 10, 23),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_performance__mesure, 'Des objectifs de performance sont-ils définis et réévalués ?', 10, 24),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_performance__mesure, 'Des tableaux de bord de suivi de la performance sont-ils disponibles ?', 10, 25),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_performance__mesure, 'Les écarts de performance font-ils l''objet d''actions correctives ?', 10, 26),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_performance__mesure, 'Le coût des services IT est-il mesuré ?', 10, 27),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_performance__mesure, 'La valeur ajoutée des services IT est-elle évaluée ?', 10, 28);

-- Stratégie de Sourcing (6 questions)
INSERT INTO questions (id_question, id_questionnaire, id_thematique, texte, ponderation, ordre)
VALUES
(UUID(), @id_questionnaire_ops, @id_thematique_ops_strategie_de_sourcing, 'Une stratégie de sourcing claire est-elle définie ?', 10, 29),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_strategie_de_sourcing, 'La performance des fournisseurs est-elle évaluée régulièrement ?', 10, 30),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_strategie_de_sourcing, 'Des modèles d''externalisation innovants sont-ils explorés ?', 10, 31),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_strategie_de_sourcing, 'Le multi-sourcing est-il géré efficacement ?', 10, 32),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_strategie_de_sourcing, 'La stratégie de sourcing est-elle alignée avec la stratégie IT globale ?', 10, 33),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_strategie_de_sourcing, 'Des plans de sortie sont-ils définis pour les contrats d''externalisation ?', 10, 34);

-- Transformation & Agilité (8 questions)
INSERT INTO questions (id_question, id_questionnaire, id_thematique, texte, ponderation, ordre)
VALUES
(UUID(), @id_questionnaire_ops, @id_thematique_ops_transformation__agilite, 'L''organisation est-elle capable de s''adapter rapidement aux changements ?', 10, 35),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_transformation__agilite, 'Des initiatives de transformation IT sont-elles en cours ?', 10, 36),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_transformation__agilite, 'La résistance au changement est-elle adressée efficacement ?', 10, 37),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_transformation__agilite, 'L''innovation est-elle encouragée et valorisée ?', 10, 38),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_transformation__agilite, 'Des pratiques de gestion du changement sont-elles appliquées ?', 10, 39),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_transformation__agilite, 'Les équipes sont-elles formées pour s''adapter aux nouvelles technologies ?', 10, 40),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_transformation__agilite, 'La dette technique est-elle gérée activement ?', 10, 41),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_transformation__agilite, 'Des initiatives d''amélioration continue sont-elles en place ?', 10, 42);

-- Automatisation & Efficacité (8 questions)
INSERT INTO questions (id_question, id_questionnaire, id_thematique, texte, ponderation, ordre)
VALUES
(UUID(), @id_questionnaire_ops, @id_thematique_ops_automatisation__efficacite, 'Des tâches répétitives sont-elles automatisées ?', 10, 43),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_automatisation__efficacite, 'Des outils d''automatisation modernes sont-ils déployés ?', 10, 44),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_automatisation__efficacite, 'L''Infrastructure as Code est-elle mise en oeuvre ?', 10, 45),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_automatisation__efficacite, 'Les processus opérationnels sont-ils optimisés pour l''efficacité ?', 10, 46),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_automatisation__efficacite, 'Des technologies d''automatisation cognitive (RPA, IA) sont-elles utilisées ?', 10, 47),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_automatisation__efficacite, 'L''automatisation est-elle vue comme une priorité stratégique ?', 10, 48),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_automatisation__efficacite, 'Les gains d''efficacité sont-ils mesurés ?', 10, 49),
(UUID(), @id_questionnaire_ops, @id_thematique_ops_automatisation__efficacite, 'Une roadmap d''automatisation est-elle définie ?', 10, 50);

-- Créer des formulaires pour chaque acteur, application et questionnaire
-- Pour chaque acteur, créer des formulaires pour les applications de leur entreprise et tous les questionnaires
DROP TEMPORARY TABLE IF EXISTS temp_actor_application;
CREATE TEMPORARY TABLE temp_actor_application AS
SELECT 
    a.id_acteur, 
    app.id_application, 
    a.id_entreprise
FROM 
    acteurs a
JOIN 
    applications app ON a.id_entreprise = app.id_entreprise;

-- Créer les formulaires
INSERT INTO formulaires (id_formulaire, id_acteur, id_application, id_questionnaire, date_creation, date_modification, statut)
SELECT 
    UUID(), 
    aa.id_acteur, 
    aa.id_application, 
    @id_questionnaire_cyber,
    DATE_SUB(CURRENT_TIMESTAMP, INTERVAL FLOOR(RAND() * 90) DAY),
    CURRENT_TIMESTAMP,
    'Soumis'
FROM 
    temp_actor_application aa;

INSERT INTO formulaires (id_formulaire, id_acteur, id_application, id_questionnaire, date_creation, date_modification, statut)
SELECT 
    UUID(), 
    aa.id_acteur, 
    aa.id_application, 
    @id_questionnaire_data,
    DATE_SUB(CURRENT_TIMESTAMP, INTERVAL FLOOR(RAND() * 90) DAY),
    CURRENT_TIMESTAMP,
    'Soumis'
FROM 
    temp_actor_application aa;

INSERT INTO formulaires (id_formulaire, id_acteur, id_application, id_questionnaire, date_creation, date_modification, statut)
SELECT 
    UUID(), 
    aa.id_acteur, 
    aa.id_application, 
    @id_questionnaire_ops,
    DATE_SUB(CURRENT_TIMESTAMP, INTERVAL FLOOR(RAND() * 90) DAY),
    CURRENT_TIMESTAMP,
    'Soumis'
FROM 
    temp_actor_application aa;

-- Créer des réponses pour chaque formulaire
-- D'abord, récupérer tous les formulaires
DROP TEMPORARY TABLE IF EXISTS temp_forms;
CREATE TEMPORARY TABLE temp_forms AS
SELECT id_formulaire, id_questionnaire FROM formulaires;

-- Maintenant, générer des réponses pour les questionnaires de cybersécurité
INSERT INTO reponses (id_reponse, id_formulaire, id_question, valeur_reponse, score, commentaire)
SELECT
    UUID(),
    f.id_formulaire,
    q.id_question,
    CASE FLOOR(RAND() * 3)
        WHEN 0 THEN 'Faible'
        WHEN 1 THEN 'Intermédiaire'
        WHEN 2 THEN 'Avancé'
    END AS valeur_reponse,
    CASE FLOOR(RAND() * 3)
        WHEN 0 THEN 1
        WHEN 1 THEN 3
        WHEN 2 THEN 5
    END AS score,
    CASE FLOOR(RAND() * 3)
        WHEN 0 THEN 'Besoin d''amélioration significative'
        WHEN 1 THEN 'En progression'
        WHEN 2 THEN 'Conforme aux attentes'
    END AS commentaire
FROM
    temp_forms f
JOIN
    questions q ON f.id_questionnaire = q.id_questionnaire
WHERE
    f.id_questionnaire = @id_questionnaire_cyber;

-- Générer des réponses pour les questionnaires d'acculturation data
INSERT INTO reponses (id_reponse, id_formulaire, id_question, valeur_reponse, score, commentaire)
SELECT
    UUID(),
    f.id_formulaire,
    q.id_question,
    CASE FLOOR(RAND() * 3)
        WHEN 0 THEN 'Faible'
        WHEN 1 THEN 'Intermédiaire'
        WHEN 2 THEN 'Avancé'
    END AS valeur_reponse,
    CASE FLOOR(RAND() * 3)
        WHEN 0 THEN 1
        WHEN 1 THEN 3
        WHEN 2 THEN 5
    END AS score,
    CASE FLOOR(RAND() * 3)
        WHEN 0 THEN 'Besoin d''amélioration significative'
        WHEN 1 THEN 'En progression'
        WHEN 2 THEN 'Conforme aux attentes'
    END AS commentaire
FROM
    temp_forms f
JOIN
    questions q ON f.id_questionnaire = q.id_questionnaire
WHERE
    f.id_questionnaire = @id_questionnaire_data;

-- Générer des réponses pour les questionnaires de modèle opérationnel
INSERT INTO reponses (id_reponse, id_formulaire, id_question, valeur_reponse, score, commentaire)
SELECT
    UUID(),
    f.id_formulaire,
    q.id_question,
    CASE FLOOR(RAND() * 3)
        WHEN 0 THEN 'Faible'
        WHEN 1 THEN 'Intermédiaire'
        WHEN 2 THEN 'Avancé'
    END AS valeur_reponse,
    CASE FLOOR(RAND() * 3)
        WHEN 0 THEN 1
        WHEN 1 THEN 3
        WHEN 2 THEN 5
    END AS score,
    CASE FLOOR(RAND() * 3)
        WHEN 0 THEN 'Besoin d''amélioration significative'
        WHEN 1 THEN 'En progression'
        WHEN 2 THEN 'Conforme aux attentes'
    END AS commentaire
FROM
    temp_forms f
JOIN
    questions q ON f.id_questionnaire = q.id_questionnaire
WHERE
    f.id_questionnaire = @id_questionnaire_ops;

-- Nettoyer les tables temporaires
DROP TEMPORARY TABLE IF EXISTS temp_enterprises;
DROP TEMPORARY TABLE IF EXISTS temp_apps;
DROP TEMPORARY TABLE IF EXISTS temp_actor_application;
DROP TEMPORARY TABLE IF EXISTS temp_forms;

-- Afficher quelques statistiques pour vérification
SELECT 'Nombre de fonctions:' AS 'Info', COUNT(*) AS 'Count' FROM fonctions;
SELECT 'Nombre de thématiques:' AS 'Info', COUNT(*) AS 'Count' FROM thematiques;
SELECT 'Nombre de questionnaires:' AS 'Info', COUNT(*) AS 'Count' FROM questionnaires;
SELECT 'Nombre de questions:' AS 'Info', COUNT(*) AS 'Count' FROM questions;
SELECT 'Nombre d''applications:' AS 'Info', COUNT(*) AS 'Count' FROM applications;
SELECT 'Nombre de formulaires:' AS 'Info', COUNT(*) AS 'Count' FROM formulaires;
SELECT 'Nombre de réponses:' AS 'Info', COUNT(*) AS 'Count' FROM reponses;