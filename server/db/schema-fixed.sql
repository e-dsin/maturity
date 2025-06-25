/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-11.7.2-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: maturity_assessment
-- ------------------------------------------------------
-- Server version	11.7.2-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Current Database: `maturity_assessment`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `maturity_assessment` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci */;

USE `maturity_assessment`;

--
-- Table structure for table `acteurs`
--

DROP TABLE IF EXISTS `acteurs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `acteurs` (
  `id_acteur` varchar(36) NOT NULL,
  `nom_prenom` varchar(100) DEFAULT NULL,
  `role` varchar(50) NOT NULL,
  `id_role` varchar(36) DEFAULT NULL,
  `organisation` varchar(50) NOT NULL,
  `id_entreprise` varchar(36) DEFAULT NULL,
  `anciennete_role` int(11) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `date_creation` timestamp NULL DEFAULT current_timestamp(),
  `date_modification` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `password_hash` varchar(255) DEFAULT NULL,
  `oauth_provider` enum('local','google','microsoft','apple') DEFAULT 'local',
  `profile_picture` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `last_login` timestamp NULL DEFAULT NULL,
  `password_reset_token` varchar(255) DEFAULT NULL,
  `password_reset_expires` timestamp NULL DEFAULT NULL,
  `email_verified` tinyint(1) DEFAULT 0,
  `email_verification_token` varchar(255) DEFAULT NULL,
  `failed_login_attempts` int(11) DEFAULT 0,
  `account_locked_until` timestamp NULL DEFAULT NULL,
  `oauth_id` varchar(255) DEFAULT NULL,
  `mot_de_passe` varchar(255) DEFAULT NULL,
  `derniere_connexion` timestamp NULL DEFAULT NULL,
  `compte_actif` tinyint(1) DEFAULT 1,
  `tentatives_connexion` int(11) DEFAULT 0,
  `date_expiration_mdp` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id_acteur`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_acteurs_email` (`email`),
  KEY `idx_password_reset_token` (`password_reset_token`),
  KEY `idx_account_locked_until` (`account_locked_until`),
  KEY `idx_oauth_provider_id` (`oauth_provider`,`oauth_id`),
  KEY `idx_acteur_role` (`id_role`),
  KEY `idx_acteur_entreprise` (`id_entreprise`),
  KEY `idx_acteur_email` (`email`),
  KEY `idx_acteur_actif` (`compte_actif`),
  CONSTRAINT `acteurs_ibfk_1` FOREIGN KEY (`id_entreprise`) REFERENCES `entreprises` (`id_entreprise`),
  CONSTRAINT `fk_acteur_role` FOREIGN KEY (`id_role`) REFERENCES `roles` (`id_role`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_uca1400_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER after_acteur_insert
AFTER INSERT ON acteurs
FOR EACH ROW
BEGIN
    
    INSERT INTO permissions (id_permission, id_acteur, id_module, type_ressource, peut_voir, peut_editer, peut_supprimer, peut_administrer, conditions)
    SELECT 
        UUID(),
        NEW.id_acteur,
        rp.id_module,
        CASE 
            WHEN m.nom_module = 'QUESTIONNAIRES' THEN 'QUESTIONNAIRE'
            WHEN m.nom_module = 'FORMULAIRES' THEN 'FORMULAIRE'
            WHEN m.nom_module = 'APPLICATIONS' THEN 'APPLICATION'
            ELSE 'RAPPORT'
        END as type_ressource,
        rp.peut_voir,
        rp.peut_editer,
        rp.peut_supprimer,
        rp.peut_administrer,
        JSON_OBJECT('entreprise_id', NEW.id_entreprise)
    FROM role_permissions rp
    JOIN modules m ON rp.id_module = m.id_module
    WHERE rp.id_role = NEW.id_role;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_uca1400_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER audit_acteurs_update
AFTER UPDATE ON acteurs
FOR EACH ROW
BEGIN
    IF NEW.nom_prenom != OLD.nom_prenom OR 
       NEW.email != OLD.email OR 
       NEW.id_role != OLD.id_role OR
       NEW.compte_actif != OLD.compte_actif THEN
        
        INSERT INTO audit_logs (
            id_log, id_acteur, action, table_affectee, id_ressource,
            details_avant, details_apres, date_action
        ) VALUES (
            UUID(),
            NEW.id_acteur,
            'UPDATE_USER',
            'acteurs',
            NEW.id_acteur,
            JSON_OBJECT(
                'nom_prenom', OLD.nom_prenom,
                'email', OLD.email,
                'id_role', OLD.id_role,
                'compte_actif', OLD.compte_actif
            ),
            JSON_OBJECT(
                'nom_prenom', NEW.nom_prenom,
                'email', NEW.email,
                'id_role', NEW.id_role,
                'compte_actif', NEW.compte_actif
            ),
            NOW()
        );
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_uca1400_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER audit_acteurs_delete
BEFORE DELETE ON acteurs
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (
        id_log, id_acteur, action, table_affectee, id_ressource,
        details_avant, date_action
    ) VALUES (
        UUID(),
        OLD.id_acteur,
        'DELETE_USER',
        'acteurs',
        OLD.id_acteur,
        JSON_OBJECT(
            'nom_prenom', OLD.nom_prenom,
            'email', OLD.email,
            'id_role', OLD.id_role
        ),
        NOW()
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `applications`
--

DROP TABLE IF EXISTS `applications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `applications` (
  `id_application` varchar(36) NOT NULL,
  `nom_application` varchar(100) NOT NULL,
  `statut` enum('Projet','Run') NOT NULL,
  `type` enum('Build','Buy') NOT NULL,
  `hebergement` enum('Cloud','Prem','Hybrid') NOT NULL,
  `architecture_logicielle` enum('ERP','Multitenant SAAS','MVC','Monolithique') NOT NULL,
  `id_entreprise` varchar(36) DEFAULT NULL,
  `date_mise_en_prod` date DEFAULT NULL,
  `language` varchar(50) DEFAULT NULL,
  `editeur` varchar(50) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `date_creation` timestamp NULL DEFAULT current_timestamp(),
  `date_modification` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_application`),
  KEY `fk_application_entreprise` (`id_entreprise`),
  CONSTRAINT `applications_ibfk_1` FOREIGN KEY (`id_entreprise`) REFERENCES `entreprises` (`id_entreprise`),
  CONSTRAINT `fk_application_entreprise` FOREIGN KEY (`id_entreprise`) REFERENCES `entreprises` (`id_entreprise`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id_log` varchar(36) NOT NULL,
  `id_acteur` varchar(36) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `table_affectee` varchar(50) DEFAULT NULL,
  `id_ressource` varchar(36) DEFAULT NULL,
  `details_avant` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details_avant`)),
  `details_apres` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details_apres`)),
  `adresse_ip` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `date_action` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_log`),
  KEY `idx_audit_acteur` (`id_acteur`),
  KEY `idx_audit_action` (`action`),
  KEY `idx_audit_date` (`date_action`),
  KEY `idx_audit_table` (`table_affectee`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`id_acteur`) REFERENCES `acteurs` (`id_acteur`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `audit_modele_maturite`
--

DROP TABLE IF EXISTS `audit_modele_maturite`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_modele_maturite` (
  `id_audit` varchar(36) NOT NULL,
  `type_action` enum('CREATE','UPDATE','DELETE') NOT NULL,
  `type_entite` enum('FONCTION','THEMATIQUE','NIVEAU_GLOBAL','NIVEAU_THEMATIQUE') NOT NULL,
  `id_entite` varchar(36) DEFAULT NULL,
  `ancien_valeur` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`ancien_valeur`)),
  `nouvelle_valeur` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`nouvelle_valeur`)),
  `id_utilisateur` varchar(36) DEFAULT NULL,
  `date_action` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_audit`),
  KEY `idx_audit_date` (`date_action`),
  KEY `idx_audit_entite` (`type_entite`,`id_entite`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `entreprise_scores`
--

DROP TABLE IF EXISTS `entreprise_scores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `entreprise_scores` (
  `id_entreprise` varchar(36) NOT NULL,
  `score_global` decimal(5,2) NOT NULL,
  `date_calcul` date NOT NULL,
  PRIMARY KEY (`id_entreprise`),
  CONSTRAINT `entreprise_scores_ibfk_1` FOREIGN KEY (`id_entreprise`) REFERENCES `entreprises` (`id_entreprise`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `entreprises`
--

DROP TABLE IF EXISTS `entreprises`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `entreprises` (
  `id_entreprise` varchar(36) NOT NULL,
  `nom_entreprise` varchar(100) NOT NULL,
  `secteur` varchar(50) NOT NULL,
  `date_creation` timestamp NULL DEFAULT current_timestamp(),
  `date_modification` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_entreprise`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fonctions`
--

DROP TABLE IF EXISTS `fonctions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `fonctions` (
  `id_fonction` varchar(36) NOT NULL,
  `nom` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `date_creation` timestamp NULL DEFAULT current_timestamp(),
  `date_modification` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `ordre` int(11) DEFAULT NULL,
  `actif` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id_fonction`),
  UNIQUE KEY `nom` (`nom`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `formulaires`
--

DROP TABLE IF EXISTS `formulaires`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `formulaires` (
  `id_formulaire` varchar(36) NOT NULL,
  `id_acteur` varchar(36) NOT NULL,
  `id_application` varchar(36) NOT NULL,
  `id_questionnaire` varchar(36) NOT NULL,
  `date_creation` timestamp NOT NULL,
  `date_modification` timestamp NOT NULL,
  `statut` enum('Brouillon','Soumis','Validé') DEFAULT 'Brouillon',
  PRIMARY KEY (`id_formulaire`),
  KEY `idx_formulaire_app` (`id_application`),
  KEY `idx_formulaire_acteur` (`id_acteur`),
  KEY `idx_formulaire_questionnaire` (`id_questionnaire`),
  CONSTRAINT `formulaires_ibfk_1` FOREIGN KEY (`id_acteur`) REFERENCES `acteurs` (`id_acteur`),
  CONSTRAINT `formulaires_ibfk_2` FOREIGN KEY (`id_application`) REFERENCES `applications` (`id_application`),
  CONSTRAINT `formulaires_ibfk_3` FOREIGN KEY (`id_questionnaire`) REFERENCES `questionnaires` (`id_questionnaire`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `grille_interpretation`
--

DROP TABLE IF EXISTS `grille_interpretation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `grille_interpretation` (
  `id_grille` varchar(36) NOT NULL,
  `fonction` varchar(100) NOT NULL,
  `score_min` decimal(5,2) NOT NULL,
  `score_max` decimal(5,2) NOT NULL,
  `niveau` varchar(50) NOT NULL,
  `description` text NOT NULL,
  `recommandations` text DEFAULT NULL,
  `date_creation` timestamp NULL DEFAULT current_timestamp(),
  `date_modification` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_grille`),
  KEY `idx_grille_fonction` (`fonction`),
  KEY `idx_grille_niveau` (`niveau`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `historique_scores`
--

DROP TABLE IF EXISTS `historique_scores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `historique_scores` (
  `id_historique` varchar(36) NOT NULL,
  `id_application` varchar(36) NOT NULL,
  `id_entreprise` varchar(36) DEFAULT NULL,
  `thematique` varchar(50) NOT NULL,
  `score` decimal(5,2) NOT NULL,
  `date_mesure` date NOT NULL,
  PRIMARY KEY (`id_historique`),
  KEY `idx_historique_app` (`id_application`),
  KEY `idx_historique_date` (`date_mesure`),
  KEY `fk_historique_entreprise` (`id_entreprise`),
  CONSTRAINT `fk_historique_entreprise` FOREIGN KEY (`id_entreprise`) REFERENCES `entreprises` (`id_entreprise`),
  CONSTRAINT `historique_scores_ibfk_1` FOREIGN KEY (`id_application`) REFERENCES `applications` (`id_application`),
  CONSTRAINT `historique_scores_ibfk_2` FOREIGN KEY (`id_entreprise`) REFERENCES `entreprises` (`id_entreprise`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `historique_scores_entreprises`
--

DROP TABLE IF EXISTS `historique_scores_entreprises`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `historique_scores_entreprises` (
  `id_historique` varchar(36) NOT NULL,
  `id_entreprise` varchar(36) NOT NULL,
  `score_global` decimal(5,2) NOT NULL,
  `date_mesure` date NOT NULL,
  PRIMARY KEY (`id_historique`),
  KEY `idx_hse_entreprise` (`id_entreprise`),
  KEY `idx_hse_date` (`date_mesure`),
  CONSTRAINT `historique_scores_entreprises_ibfk_1` FOREIGN KEY (`id_entreprise`) REFERENCES `entreprises` (`id_entreprise`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `maturity_analyses`
--

DROP TABLE IF EXISTS `maturity_analyses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `maturity_analyses` (
  `id_analyse` varchar(36) NOT NULL,
  `id_application` varchar(36) NOT NULL,
  `date_analyse` timestamp NULL DEFAULT current_timestamp(),
  `score_global` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id_analyse`),
  KEY `idx_analyse_app` (`id_application`),
  CONSTRAINT `maturity_analyses_ibfk_1` FOREIGN KEY (`id_application`) REFERENCES `applications` (`id_application`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `modules`
--

DROP TABLE IF EXISTS `modules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `modules` (
  `id_module` varchar(36) NOT NULL,
  `nom_module` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `route_base` varchar(100) DEFAULT NULL,
  `icone` varchar(50) DEFAULT NULL,
  `ordre_affichage` int(11) DEFAULT 0,
  `actif` tinyint(1) DEFAULT 1,
  `date_creation` timestamp NULL DEFAULT current_timestamp(),
  `date_modification` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_module`),
  UNIQUE KEY `nom_module` (`nom_module`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `niveaux_globaux`
--

DROP TABLE IF EXISTS `niveaux_globaux`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `niveaux_globaux` (
  `id_niveau` varchar(36) NOT NULL,
  `id_fonction` varchar(36) NOT NULL,
  `score_min` decimal(5,2) NOT NULL,
  `score_max` decimal(5,2) NOT NULL,
  `niveau` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `recommandations` text DEFAULT NULL,
  `ordre` int(11) DEFAULT NULL,
  `date_creation` timestamp NULL DEFAULT current_timestamp(),
  `date_modification` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_niveau`),
  KEY `idx_niveau_fonction` (`id_fonction`),
  KEY `idx_niveau_score` (`score_min`,`score_max`),
  CONSTRAINT `niveaux_globaux_ibfk_1` FOREIGN KEY (`id_fonction`) REFERENCES `fonctions` (`id_fonction`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `niveaux_thematiques`
--

DROP TABLE IF EXISTS `niveaux_thematiques`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `niveaux_thematiques` (
  `id_niveau` varchar(36) NOT NULL,
  `id_fonction` varchar(36) NOT NULL,
  `id_thematique` varchar(36) NOT NULL,
  `score_min` decimal(5,2) NOT NULL,
  `score_max` decimal(5,2) NOT NULL,
  `niveau` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `recommandations` text DEFAULT NULL,
  `ordre` int(11) DEFAULT NULL,
  `date_creation` timestamp NULL DEFAULT current_timestamp(),
  `date_modification` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_niveau`),
  KEY `idx_niveau_them_fonction` (`id_fonction`),
  KEY `idx_niveau_them_thematique` (`id_thematique`),
  KEY `idx_niveau_them_score` (`score_min`,`score_max`),
  CONSTRAINT `niveaux_thematiques_ibfk_1` FOREIGN KEY (`id_fonction`) REFERENCES `fonctions` (`id_fonction`) ON DELETE CASCADE,
  CONSTRAINT `niveaux_thematiques_ibfk_2` FOREIGN KEY (`id_thematique`) REFERENCES `thematiques` (`id_thematique`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id_permission` varchar(36) NOT NULL,
  `id_acteur` varchar(36) NOT NULL,
  `type_ressource` enum('APPLICATION','QUESTIONNAIRE','FORMULAIRE','RAPPORT') NOT NULL,
  `id_module` varchar(36) DEFAULT NULL,
  `id_ressource` varchar(36) DEFAULT NULL,
  `peut_voir` tinyint(1) DEFAULT 0,
  `peut_editer` tinyint(1) DEFAULT 0,
  `peut_supprimer` tinyint(1) DEFAULT 0,
  `peut_administrer` tinyint(1) DEFAULT 0,
  `ressource` varchar(100) DEFAULT NULL,
  `action` enum('read','write','delete','admin') DEFAULT NULL,
  `conditions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`conditions`)),
  `is_active` tinyint(1) DEFAULT 1,
  `date_creation` timestamp NULL DEFAULT current_timestamp(),
  `date_modification` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_permission`),
  UNIQUE KEY `unique_permission` (`id_acteur`,`ressource`,`action`),
  KEY `idx_permission_acteur` (`id_acteur`),
  KEY `idx_permission_ressource` (`type_ressource`,`id_ressource`),
  KEY `idx_permission_module` (`id_module`),
  CONSTRAINT `fk_permission_module` FOREIGN KEY (`id_module`) REFERENCES `modules` (`id_module`),
  CONSTRAINT `permissions_ibfk_1` FOREIGN KEY (`id_acteur`) REFERENCES `acteurs` (`id_acteur`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `question_metadata`
--

DROP TABLE IF EXISTS `question_metadata`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `question_metadata` (
  `id_question` varchar(36) NOT NULL,
  `metadata_key` varchar(50) NOT NULL,
  `metadata_value` text DEFAULT NULL,
  PRIMARY KEY (`id_question`,`metadata_key`),
  CONSTRAINT `question_metadata_ibfk_1` FOREIGN KEY (`id_question`) REFERENCES `questions` (`id_question`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `questionnaires`
--

DROP TABLE IF EXISTS `questionnaires`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `questionnaires` (
  `id_questionnaire` varchar(36) NOT NULL,
  `fonction` varchar(100) NOT NULL,
  `thematique` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `date_creation` timestamp NULL DEFAULT current_timestamp(),
  `date_modification` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_questionnaire`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `questions`
--

DROP TABLE IF EXISTS `questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `questions` (
  `id_question` varchar(36) NOT NULL,
  `id_questionnaire` varchar(36) NOT NULL,
  `id_thematique` varchar(36) NOT NULL,
  `texte` text NOT NULL,
  `ponderation` int(11) NOT NULL,
  `ordre` int(11) DEFAULT NULL,
  `date_creation` timestamp NULL DEFAULT current_timestamp(),
  `date_modification` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_question`),
  KEY `id_questionnaire` (`id_questionnaire`),
  KEY `id_thematique` (`id_thematique`),
  CONSTRAINT `questions_ibfk_1` FOREIGN KEY (`id_questionnaire`) REFERENCES `questionnaires` (`id_questionnaire`) ON DELETE CASCADE,
  CONSTRAINT `questions_ibfk_2` FOREIGN KEY (`id_thematique`) REFERENCES `thematiques` (`id_thematique`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `reponses`
--

DROP TABLE IF EXISTS `reponses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `reponses` (
  `id_reponse` varchar(36) NOT NULL,
  `id_formulaire` varchar(36) NOT NULL,
  `id_question` varchar(36) NOT NULL,
  `valeur_reponse` varchar(255) NOT NULL,
  `score` int(11) NOT NULL,
  `commentaire` text DEFAULT NULL,
  `date_creation` timestamp NULL DEFAULT current_timestamp(),
  `date_modification` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_reponse`),
  KEY `idx_reponse_formulaire` (`id_formulaire`),
  KEY `idx_reponse_question` (`id_question`),
  CONSTRAINT `reponses_ibfk_1` FOREIGN KEY (`id_formulaire`) REFERENCES `formulaires` (`id_formulaire`) ON DELETE CASCADE,
  CONSTRAINT `reponses_ibfk_2` FOREIGN KEY (`id_question`) REFERENCES `questions` (`id_question`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_uca1400_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER after_reponse_insert
AFTER INSERT ON reponses
FOR EACH ROW
BEGIN
    DECLARE v_id_application VARCHAR(36);

    
    SELECT f.id_application INTO v_id_application
    FROM formulaires f
    WHERE f.id_formulaire = NEW.id_formulaire;

    
    IF v_id_application IS NOT NULL THEN
        UPDATE applications 
        SET date_modification = CURRENT_TIMESTAMP 
        WHERE id_application = v_id_application;
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `id_role_permission` varchar(36) NOT NULL,
  `id_role` varchar(36) NOT NULL,
  `id_module` varchar(36) NOT NULL,
  `peut_voir` tinyint(1) DEFAULT 0,
  `peut_editer` tinyint(1) DEFAULT 0,
  `peut_supprimer` tinyint(1) DEFAULT 0,
  `peut_administrer` tinyint(1) DEFAULT 0,
  `date_creation` timestamp NULL DEFAULT current_timestamp(),
  `date_modification` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_role_permission`),
  UNIQUE KEY `unique_role_module` (`id_role`,`id_module`),
  KEY `id_module` (`id_module`),
  CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`id_role`) REFERENCES `roles` (`id_role`) ON DELETE CASCADE,
  CONSTRAINT `role_permissions_ibfk_2` FOREIGN KEY (`id_module`) REFERENCES `modules` (`id_module`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id_role` varchar(36) NOT NULL,
  `nom_role` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `niveau_acces` enum('ENTREPRISE','GLOBAL') NOT NULL DEFAULT 'ENTREPRISE',
  `date_creation` timestamp NULL DEFAULT current_timestamp(),
  `date_modification` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_role`),
  UNIQUE KEY `nom_role` (`nom_role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `thematique_scores`
--

DROP TABLE IF EXISTS `thematique_scores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `thematique_scores` (
  `id_score` varchar(36) NOT NULL,
  `id_analyse` varchar(36) NOT NULL,
  `thematique` varchar(50) NOT NULL,
  `score` decimal(5,2) NOT NULL,
  `nombre_reponses` int(11) NOT NULL,
  PRIMARY KEY (`id_score`),
  KEY `idx_score_analyse` (`id_analyse`),
  KEY `idx_score_thematique` (`thematique`),
  CONSTRAINT `thematique_scores_ibfk_1` FOREIGN KEY (`id_analyse`) REFERENCES `maturity_analyses` (`id_analyse`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `thematiques`
--

DROP TABLE IF EXISTS `thematiques`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `thematiques` (
  `id_thematique` varchar(36) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `id_fonction` varchar(36) NOT NULL,
  `date_creation` timestamp NULL DEFAULT current_timestamp(),
  `date_modification` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `nombre_questions` int(11) DEFAULT 0,
  `ordre` int(11) DEFAULT NULL,
  `actif` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id_thematique`),
  UNIQUE KEY `nom` (`nom`,`id_fonction`),
  KEY `id_fonction` (`id_fonction`),
  CONSTRAINT `thematiques_ibfk_1` FOREIGN KEY (`id_fonction`) REFERENCES `fonctions` (`id_fonction`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_sessions`
--

DROP TABLE IF EXISTS `user_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_sessions` (
  `session_id` varchar(128) NOT NULL,
  `id_acteur` varchar(36) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `last_activity` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `expires_at` timestamp NOT NULL,
  PRIMARY KEY (`session_id`),
  KEY `idx_acteur` (`id_acteur`),
  KEY `idx_expires` (`expires_at`),
  CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`id_acteur`) REFERENCES `acteurs` (`id_acteur`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `vue_analyses_recentes`
--

DROP TABLE IF EXISTS `vue_analyses_recentes`;
/*!50001 DROP VIEW IF EXISTS `vue_analyses_recentes`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vue_analyses_recentes` AS SELECT
 1 AS `id_analyse`,
  1 AS `id_application`,
  1 AS `nom_application`,
  1 AS `id_entreprise`,
  1 AS `nom_entreprise`,
  1 AS `date_analyse`,
  1 AS `score_global`,
  1 AS `nombre_thematiques`,
  1 AS `nombre_fonctions` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vue_dashboard`
--

DROP TABLE IF EXISTS `vue_dashboard`;
/*!50001 DROP VIEW IF EXISTS `vue_dashboard`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vue_dashboard` AS SELECT
 1 AS `categorie`,
  1 AS `total`,
  1 AS `score_moyen`,
  1 AS `total_entreprises`,
  1 AS `date_calcul` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vue_dashboard_securisee`
--

DROP TABLE IF EXISTS `vue_dashboard_securisee`;
/*!50001 DROP VIEW IF EXISTS `vue_dashboard_securisee`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vue_dashboard_securisee` AS SELECT
 1 AS `categorie`,
  1 AS `total`,
  1 AS `score_moyen`,
  1 AS `nombre_entites`,
  1 AS `date_calcul` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vue_details_formulaires`
--

DROP TABLE IF EXISTS `vue_details_formulaires`;
/*!50001 DROP VIEW IF EXISTS `vue_details_formulaires`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vue_details_formulaires` AS SELECT
 1 AS `id_formulaire`,
  1 AS `date_creation`,
  1 AS `id_acteur`,
  1 AS `nom_prenom`,
  1 AS `role`,
  1 AS `organisation`,
  1 AS `id_application`,
  1 AS `nom_application`,
  1 AS `id_questionnaire`,
  1 AS `fonction`,
  1 AS `thematique`,
  1 AS `statut` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vue_evolution_entreprises`
--

DROP TABLE IF EXISTS `vue_evolution_entreprises`;
/*!50001 DROP VIEW IF EXISTS `vue_evolution_entreprises`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vue_evolution_entreprises` AS SELECT
 1 AS `id_entreprise`,
  1 AS `nom_entreprise`,
  1 AS `secteur`,
  1 AS `date_mesure`,
  1 AS `score_global`,
  1 AS `score_precedent`,
  1 AS `evolution`,
  1 AS `nombre_applications` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vue_historique_application`
--

DROP TABLE IF EXISTS `vue_historique_application`;
/*!50001 DROP VIEW IF EXISTS `vue_historique_application`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vue_historique_application` AS SELECT
 1 AS `id_application`,
  1 AS `nom_application`,
  1 AS `thematique`,
  1 AS `score`,
  1 AS `date_mesure` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vue_historique_progression`
--

DROP TABLE IF EXISTS `vue_historique_progression`;
/*!50001 DROP VIEW IF EXISTS `vue_historique_progression`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vue_historique_progression` AS SELECT
 1 AS `niveau`,
  1 AS `id_entite`,
  1 AS `nom_entite`,
  1 AS `id_entreprise`,
  1 AS `nom_entreprise`,
  1 AS `date_mesure`,
  1 AS `score`,
  1 AS `id_analyse` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vue_interpretation_resultats`
--

DROP TABLE IF EXISTS `vue_interpretation_resultats`;
/*!50001 DROP VIEW IF EXISTS `vue_interpretation_resultats`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vue_interpretation_resultats` AS SELECT
 1 AS `id_analyse`,
  1 AS `id_application`,
  1 AS `nom_application`,
  1 AS `date_analyse`,
  1 AS `score_global`,
  1 AS `niveau_global`,
  1 AS `description_globale`,
  1 AS `recommandations_globales`,
  1 AS `id_entreprise`,
  1 AS `nom_entreprise` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vue_interpretation_thematiques`
--

DROP TABLE IF EXISTS `vue_interpretation_thematiques`;
/*!50001 DROP VIEW IF EXISTS `vue_interpretation_thematiques`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vue_interpretation_thematiques` AS SELECT
 1 AS `id_analyse`,
  1 AS `id_score`,
  1 AS `thematique`,
  1 AS `score`,
  1 AS `nombre_reponses`,
  1 AS `id_application`,
  1 AS `nom_application`,
  1 AS `id_thematique`,
  1 AS `id_fonction`,
  1 AS `fonction_nom`,
  1 AS `niveau`,
  1 AS `description`,
  1 AS `recommandations` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vue_modele_maturite`
--

DROP TABLE IF EXISTS `vue_modele_maturite`;
/*!50001 DROP VIEW IF EXISTS `vue_modele_maturite`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vue_modele_maturite` AS SELECT
 1 AS `id_fonction`,
  1 AS `nom_fonction`,
  1 AS `description_fonction`,
  1 AS `ordre_fonction`,
  1 AS `id_thematique`,
  1 AS `nom_thematique`,
  1 AS `description_thematique`,
  1 AS `nombre_questions`,
  1 AS `ordre_thematique`,
  1 AS `nombre_niveaux_globaux`,
  1 AS `nombre_niveaux_thematiques` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vue_permissions_utilisateur`
--

DROP TABLE IF EXISTS `vue_permissions_utilisateur`;
/*!50001 DROP VIEW IF EXISTS `vue_permissions_utilisateur`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vue_permissions_utilisateur` AS SELECT
 1 AS `id_acteur`,
  1 AS `nom_prenom`,
  1 AS `email`,
  1 AS `nom_module`,
  1 AS `module_description`,
  1 AS `route_base`,
  1 AS `peut_voir`,
  1 AS `peut_editer`,
  1 AS `peut_supprimer`,
  1 AS `peut_administrer` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vue_scores_applications`
--

DROP TABLE IF EXISTS `vue_scores_applications`;
/*!50001 DROP VIEW IF EXISTS `vue_scores_applications`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vue_scores_applications` AS SELECT
 1 AS `id_application`,
  1 AS `nom_application`,
  1 AS `statut`,
  1 AS `architecture_logicielle`,
  1 AS `score_global`,
  1 AS `date_analyse`,
  1 AS `id_entreprise`,
  1 AS `nom_entreprise` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vue_scores_entreprises`
--

DROP TABLE IF EXISTS `vue_scores_entreprises`;
/*!50001 DROP VIEW IF EXISTS `vue_scores_entreprises`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vue_scores_entreprises` AS SELECT
 1 AS `id_entreprise`,
  1 AS `nom_entreprise`,
  1 AS `secteur`,
  1 AS `score_global`,
  1 AS `date_calcul`,
  1 AS `nombre_applications`,
  1 AS `nombre_thematiques`,
  1 AS `nombre_fonctions`,
  1 AS `nombre_analyses` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vue_scores_entreprises_securisee`
--

DROP TABLE IF EXISTS `vue_scores_entreprises_securisee`;
/*!50001 DROP VIEW IF EXISTS `vue_scores_entreprises_securisee`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vue_scores_entreprises_securisee` AS SELECT
 1 AS `id_entreprise`,
  1 AS `nom_entreprise`,
  1 AS `secteur`,
  1 AS `score_global`,
  1 AS `date_calcul`,
  1 AS `nombre_applications`,
  1 AS `nombre_thematiques` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vue_scores_fonctions`
--

DROP TABLE IF EXISTS `vue_scores_fonctions`;
/*!50001 DROP VIEW IF EXISTS `vue_scores_fonctions`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vue_scores_fonctions` AS SELECT
 1 AS `id_fonction`,
  1 AS `fonction_nom`,
  1 AS `description`,
  1 AS `score_moyen`,
  1 AS `nombre_applications`,
  1 AS `nombre_entreprises`,
  1 AS `nombre_thematiques`,
  1 AS `derniere_analyse` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vue_scores_fonctions_securisee`
--

DROP TABLE IF EXISTS `vue_scores_fonctions_securisee`;
/*!50001 DROP VIEW IF EXISTS `vue_scores_fonctions_securisee`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vue_scores_fonctions_securisee` AS SELECT
 1 AS `id_fonction`,
  1 AS `fonction_nom`,
  1 AS `description`,
  1 AS `score_moyen`,
  1 AS `nombre_applications`,
  1 AS `nombre_thematiques` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vue_scores_thematiques`
--

DROP TABLE IF EXISTS `vue_scores_thematiques`;
/*!50001 DROP VIEW IF EXISTS `vue_scores_thematiques`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vue_scores_thematiques` AS SELECT
 1 AS `thematique`,
  1 AS `score_moyen`,
  1 AS `total_reponses` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vue_scores_thematiques_detaillees`
--

DROP TABLE IF EXISTS `vue_scores_thematiques_detaillees`;
/*!50001 DROP VIEW IF EXISTS `vue_scores_thematiques_detaillees`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vue_scores_thematiques_detaillees` AS SELECT
 1 AS `id_thematique`,
  1 AS `thematique_nom`,
  1 AS `description`,
  1 AS `id_fonction`,
  1 AS `fonction_nom`,
  1 AS `score_moyen`,
  1 AS `score_min`,
  1 AS `score_max`,
  1 AS `nombre_applications`,
  1 AS `nombre_entreprises`,
  1 AS `derniere_analyse` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vue_scores_thematiques_securisee`
--

DROP TABLE IF EXISTS `vue_scores_thematiques_securisee`;
/*!50001 DROP VIEW IF EXISTS `vue_scores_thematiques_securisee`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vue_scores_thematiques_securisee` AS SELECT
 1 AS `id_thematique`,
  1 AS `thematique_nom`,
  1 AS `description`,
  1 AS `id_fonction`,
  1 AS `fonction_nom`,
  1 AS `score_moyen`,
  1 AS `nombre_applications` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vue_stats_formulaires`
--

DROP TABLE IF EXISTS `vue_stats_formulaires`;
/*!50001 DROP VIEW IF EXISTS `vue_stats_formulaires`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vue_stats_formulaires` AS SELECT
 1 AS `id_questionnaire`,
  1 AS `fonction`,
  1 AS `thematique`,
  1 AS `nombre_formulaires`,
  1 AS `nombre_applications`,
  1 AS `nombre_entreprises`,
  1 AS `score_moyen_genere`,
  1 AS `derniere_utilisation` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vue_utilisateurs_complets`
--

DROP TABLE IF EXISTS `vue_utilisateurs_complets`;
/*!50001 DROP VIEW IF EXISTS `vue_utilisateurs_complets`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vue_utilisateurs_complets` AS SELECT
 1 AS `id_acteur`,
  1 AS `nom_prenom`,
  1 AS `email`,
  1 AS `organisation`,
  1 AS `id_entreprise`,
  1 AS `nom_entreprise`,
  1 AS `id_role`,
  1 AS `nom_role`,
  1 AS `niveau_acces`,
  1 AS `compte_actif`,
  1 AS `derniere_connexion`,
  1 AS `date_creation`,
  1 AS `date_modification` */;
SET character_set_client = @saved_cs_client;

--
-- Current Database: `maturity_assessment`
--

USE `maturity_assessment`;

--
-- Final view structure for view `vue_analyses_recentes`
--

/*!50001 DROP VIEW IF EXISTS `vue_analyses_recentes`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vue_analyses_recentes` AS select `ma`.`id_analyse` AS `id_analyse`,`ma`.`id_application` AS `id_application`,`a`.`nom_application` AS `nom_application`,`a`.`id_entreprise` AS `id_entreprise`,`e`.`nom_entreprise` AS `nom_entreprise`,`ma`.`date_analyse` AS `date_analyse`,`ma`.`score_global` AS `score_global`,count(distinct `ts`.`thematique`) AS `nombre_thematiques`,(select count(distinct `f`.`id_fonction`) from ((`thematique_scores` `ts2` join `thematiques` `t` on(`ts2`.`thematique` = `t`.`nom`)) join `fonctions` `f` on(`t`.`id_fonction` = `f`.`id_fonction`)) where `ts2`.`id_analyse` = `ma`.`id_analyse`) AS `nombre_fonctions` from (((`maturity_analyses` `ma` join `applications` `a` on(`ma`.`id_application` = `a`.`id_application`)) left join `entreprises` `e` on(`a`.`id_entreprise` = `e`.`id_entreprise`)) join `thematique_scores` `ts` on(`ma`.`id_analyse` = `ts`.`id_analyse`)) where `ma`.`id_analyse` in (select max(`maturity_analyses`.`id_analyse`) from `maturity_analyses` group by `maturity_analyses`.`id_application`) group by `ma`.`id_analyse`,`ma`.`id_application`,`a`.`nom_application`,`a`.`id_entreprise`,`e`.`nom_entreprise`,`ma`.`date_analyse`,`ma`.`score_global` order by `ma`.`date_analyse` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vue_dashboard`
--

/*!50001 DROP VIEW IF EXISTS `vue_dashboard`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vue_dashboard` AS select 'applications' AS `categorie`,count(0) AS `total`,coalesce(avg(`ma`.`score_global`),0) AS `score_moyen`,count(distinct `e`.`id_entreprise`) AS `total_entreprises`,current_timestamp() AS `date_calcul` from ((`applications` `a` left join `entreprises` `e` on(`a`.`id_entreprise` = `e`.`id_entreprise`)) left join `maturity_analyses` `ma` on(`a`.`id_application` = `ma`.`id_application`)) where `ma`.`id_analyse` in (select max(`maturity_analyses`.`id_analyse`) from `maturity_analyses` group by `maturity_analyses`.`id_application`) union all select 'fonctions' AS `categorie`,count(0) AS `total`,(select avg(`ts`.`score`) from (`thematique_scores` `ts` join `thematiques` `t` on(`ts`.`thematique` = `t`.`nom`)) where exists(select 1 from `fonctions` `f2` where `f2`.`id_fonction` = `t`.`id_fonction` limit 1)) AS `score_moyen`,count(distinct `fonctions`.`id_fonction`) AS `total_entreprises`,current_timestamp() AS `date_calcul` from `fonctions` union all select 'thematiques' AS `categorie`,count(0) AS `total`,(select avg(`thematique_scores`.`score`) from `thematique_scores`) AS `score_moyen`,count(distinct `thematiques`.`id_fonction`) AS `total_entreprises`,current_timestamp() AS `date_calcul` from `thematiques` union all select 'entreprises' AS `categorie`,count(0) AS `total`,coalesce(avg(`es`.`score_global`),0) AS `score_moyen`,count(distinct `e`.`id_entreprise`) AS `total_entreprises`,current_timestamp() AS `date_calcul` from (`entreprises` `e` left join `entreprise_scores` `es` on(`e`.`id_entreprise` = `es`.`id_entreprise`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vue_dashboard_securisee`
--

/*!50001 DROP VIEW IF EXISTS `vue_dashboard_securisee`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vue_dashboard_securisee` AS select 'applications' AS `categorie`,count(0) AS `total`,(select avg(`ma`.`score_global`) from `maturity_analyses` `ma` where `ma`.`id_analyse` in (select max(`maturity_analyses`.`id_analyse`) from `maturity_analyses` group by `maturity_analyses`.`id_application`)) AS `score_moyen`,count(distinct `applications`.`id_application`) AS `nombre_entites`,current_timestamp() AS `date_calcul` from `applications` union all select 'fonctions' AS `categorie`,count(0) AS `total`,(select avg(`ts`.`score`) from ((`thematique_scores` `ts` join `thematiques` `t` on(`ts`.`thematique` = `t`.`nom`)) join `fonctions` `f` on(`t`.`id_fonction` = `f`.`id_fonction`))) AS `score_moyen`,count(distinct `fonctions`.`id_fonction`) AS `nombre_entites`,current_timestamp() AS `date_calcul` from `fonctions` union all select 'thematiques' AS `categorie`,count(0) AS `total`,(select avg(`ts`.`score`) from (`thematique_scores` `ts` join `thematiques` `t` on(`ts`.`thematique` = `t`.`nom`))) AS `score_moyen`,count(distinct `thematiques`.`id_thematique`) AS `nombre_entites`,current_timestamp() AS `date_calcul` from `thematiques` union all select 'entreprises' AS `categorie`,count(0) AS `total`,(select avg(`ma`.`score_global`) from ((`maturity_analyses` `ma` join `applications` `a` on(`ma`.`id_application` = `a`.`id_application`)) join `entreprises` `e2` on(`a`.`id_entreprise` = `e2`.`id_entreprise`)) where `ma`.`id_analyse` in (select max(`maturity_analyses`.`id_analyse`) from `maturity_analyses` group by `maturity_analyses`.`id_application`)) AS `score_moyen`,count(distinct `e`.`id_entreprise`) AS `nombre_entites`,current_timestamp() AS `date_calcul` from `entreprises` `e` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vue_details_formulaires`
--

/*!50001 DROP VIEW IF EXISTS `vue_details_formulaires`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vue_details_formulaires` AS select `f`.`id_formulaire` AS `id_formulaire`,`f`.`date_creation` AS `date_creation`,`a`.`id_acteur` AS `id_acteur`,`a`.`nom_prenom` AS `nom_prenom`,`a`.`role` AS `role`,`a`.`organisation` AS `organisation`,`app`.`id_application` AS `id_application`,`app`.`nom_application` AS `nom_application`,`q`.`id_questionnaire` AS `id_questionnaire`,`q`.`fonction` AS `fonction`,`q`.`thematique` AS `thematique`,`f`.`statut` AS `statut` from (((`formulaires` `f` join `acteurs` `a` on(`f`.`id_acteur` = `a`.`id_acteur`)) join `applications` `app` on(`f`.`id_application` = `app`.`id_application`)) join `questionnaires` `q` on(`f`.`id_questionnaire` = `q`.`id_questionnaire`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vue_evolution_entreprises`
--

/*!50001 DROP VIEW IF EXISTS `vue_evolution_entreprises`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vue_evolution_entreprises` AS select `e`.`id_entreprise` AS `id_entreprise`,`e`.`nom_entreprise` AS `nom_entreprise`,`e`.`secteur` AS `secteur`,`hse`.`date_mesure` AS `date_mesure`,`hse`.`score_global` AS `score_global`,coalesce(lag(`hse`.`score_global`,1) over ( partition by `e`.`id_entreprise` order by `hse`.`date_mesure`),0) AS `score_precedent`,coalesce(`hse`.`score_global` - lag(`hse`.`score_global`,1) over ( partition by `e`.`id_entreprise` order by `hse`.`date_mesure`),0) AS `evolution`,count(distinct `a`.`id_application`) AS `nombre_applications` from ((`entreprises` `e` join `historique_scores_entreprises` `hse` on(`e`.`id_entreprise` = `hse`.`id_entreprise`)) left join `applications` `a` on(`e`.`id_entreprise` = `a`.`id_entreprise` and `a`.`id_application` in (select `maturity_analyses`.`id_application` from `maturity_analyses`))) group by `e`.`id_entreprise`,`e`.`nom_entreprise`,`e`.`secteur`,`hse`.`date_mesure`,`hse`.`score_global` order by `e`.`nom_entreprise`,`hse`.`date_mesure` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vue_historique_application`
--

/*!50001 DROP VIEW IF EXISTS `vue_historique_application`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vue_historique_application` AS select `app`.`id_application` AS `id_application`,`app`.`nom_application` AS `nom_application`,`hs`.`thematique` AS `thematique`,`hs`.`score` AS `score`,`hs`.`date_mesure` AS `date_mesure` from (`historique_scores` `hs` join `applications` `app` on(`hs`.`id_application` = `app`.`id_application`)) order by `app`.`nom_application`,`hs`.`thematique`,`hs`.`date_mesure` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vue_historique_progression`
--

/*!50001 DROP VIEW IF EXISTS `vue_historique_progression`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vue_historique_progression` AS select 'application' AS `niveau`,`a`.`id_application` AS `id_entite`,`a`.`nom_application` AS `nom_entite`,`a`.`id_entreprise` AS `id_entreprise`,`e`.`nom_entreprise` AS `nom_entreprise`,`ma`.`date_analyse` AS `date_mesure`,`ma`.`score_global` AS `score`,`ma`.`id_analyse` AS `id_analyse` from ((`maturity_analyses` `ma` join `applications` `a` on(`ma`.`id_application` = `a`.`id_application`)) left join `entreprises` `e` on(`a`.`id_entreprise` = `e`.`id_entreprise`)) union all select 'fonction' AS `niveau`,`f`.`id_fonction` AS `id_entite`,`f`.`nom` AS `nom_entite`,`a`.`id_entreprise` AS `id_entreprise`,`e`.`nom_entreprise` AS `nom_entreprise`,`ma`.`date_analyse` AS `date_mesure`,avg(`ts`.`score`) AS `score`,`ma`.`id_analyse` AS `id_analyse` from (((((`thematique_scores` `ts` join `maturity_analyses` `ma` on(`ts`.`id_analyse` = `ma`.`id_analyse`)) join `applications` `a` on(`ma`.`id_application` = `a`.`id_application`)) left join `entreprises` `e` on(`a`.`id_entreprise` = `e`.`id_entreprise`)) join `thematiques` `t` on(`ts`.`thematique` = `t`.`nom`)) join `fonctions` `f` on(`t`.`id_fonction` = `f`.`id_fonction`)) group by `f`.`id_fonction`,`f`.`nom`,`a`.`id_entreprise`,`e`.`nom_entreprise`,`ma`.`date_analyse`,`ma`.`id_analyse` union all select 'theme' AS `niveau`,`t`.`id_thematique` AS `id_entite`,`t`.`nom` AS `nom_entite`,`a`.`id_entreprise` AS `id_entreprise`,`e`.`nom_entreprise` AS `nom_entreprise`,`ma`.`date_analyse` AS `date_mesure`,`ts`.`score` AS `score`,`ma`.`id_analyse` AS `id_analyse` from ((((`thematique_scores` `ts` join `maturity_analyses` `ma` on(`ts`.`id_analyse` = `ma`.`id_analyse`)) join `applications` `a` on(`ma`.`id_application` = `a`.`id_application`)) left join `entreprises` `e` on(`a`.`id_entreprise` = `e`.`id_entreprise`)) join `thematiques` `t` on(`ts`.`thematique` = `t`.`nom`)) order by `niveau`,`nom_entite`,`date_mesure` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vue_interpretation_resultats`
--

/*!50001 DROP VIEW IF EXISTS `vue_interpretation_resultats`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vue_interpretation_resultats` AS select `ma`.`id_analyse` AS `id_analyse`,`ma`.`id_application` AS `id_application`,`a`.`nom_application` AS `nom_application`,`ma`.`date_analyse` AS `date_analyse`,`ma`.`score_global` AS `score_global`,case when `ma`.`score_global` >= 4 then 'Optimisé' when `ma`.`score_global` >= 3 then 'Mesuré' when `ma`.`score_global` >= 2 then 'Défini' when `ma`.`score_global` > 0 then 'Initial' else 'Non évalué' end AS `niveau_global`,'Description basée sur le niveau de maturité. Une analyse plus détaillée est disponible via les grilles d\'interprétation.' AS `description_globale`,'Recommandations basées sur le niveau de maturité. Des recommandations détaillées sont disponibles via les grilles d\'interprétation.' AS `recommandations_globales`,(select `maturity_assessment`.`applications`.`id_entreprise` from `maturity_assessment`.`applications` where `maturity_assessment`.`applications`.`id_application` = `ma`.`id_application`) AS `id_entreprise`,(select `maturity_assessment`.`entreprises`.`nom_entreprise` from `maturity_assessment`.`entreprises` where `maturity_assessment`.`entreprises`.`id_entreprise` = (select `maturity_assessment`.`applications`.`id_entreprise` from `maturity_assessment`.`applications` where `maturity_assessment`.`applications`.`id_application` = `ma`.`id_application`)) AS `nom_entreprise` from (((`maturity_assessment`.`maturity_analyses` `ma` join `maturity_assessment`.`applications` `a` on(`ma`.`id_application` = `a`.`id_application`)) left join (select 1 AS `dummy` from `information_schema`.`tables` where `information_schema`.`tables`.`TABLE_NAME` = 'grille_interpretation' limit 1) `check_gi` on(1 = 1)) left join (select `maturity_assessment`.`grille_interpretation`.`id_grille` AS `id_grille`,`maturity_assessment`.`grille_interpretation`.`fonction` AS `fonction`,`maturity_assessment`.`grille_interpretation`.`score_min` AS `score_min`,`maturity_assessment`.`grille_interpretation`.`score_max` AS `score_max`,`maturity_assessment`.`grille_interpretation`.`niveau` AS `niveau`,`maturity_assessment`.`grille_interpretation`.`description` AS `description`,`maturity_assessment`.`grille_interpretation`.`recommandations` AS `recommandations`,`maturity_assessment`.`grille_interpretation`.`date_creation` AS `date_creation`,`maturity_assessment`.`grille_interpretation`.`date_modification` AS `date_modification` from `maturity_assessment`.`grille_interpretation` where exists(select 1 from `information_schema`.`tables` where `information_schema`.`tables`.`TABLE_NAME` = 'grille_interpretation' limit 1)) `gi` on(`gi`.`fonction` = 'global' and `ma`.`score_global` between `gi`.`score_min` and `gi`.`score_max`)) order by `ma`.`date_analyse` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vue_interpretation_thematiques`
--

/*!50001 DROP VIEW IF EXISTS `vue_interpretation_thematiques`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vue_interpretation_thematiques` AS select `ts`.`id_analyse` AS `id_analyse`,`ts`.`id_score` AS `id_score`,`ts`.`thematique` AS `thematique`,`ts`.`score` AS `score`,`ts`.`nombre_reponses` AS `nombre_reponses`,`ma`.`id_application` AS `id_application`,`a`.`nom_application` AS `nom_application`,`t`.`id_thematique` AS `id_thematique`,`t`.`id_fonction` AS `id_fonction`,`f`.`nom` AS `fonction_nom`,`gi`.`niveau` AS `niveau`,`gi`.`description` AS `description`,`gi`.`recommandations` AS `recommandations` from (((((`thematique_scores` `ts` join `maturity_analyses` `ma` on(`ts`.`id_analyse` = `ma`.`id_analyse`)) join `applications` `a` on(`ma`.`id_application` = `a`.`id_application`)) left join `thematiques` `t` on(`ts`.`thematique` = `t`.`nom`)) left join `fonctions` `f` on(`t`.`id_fonction` = `f`.`id_fonction`)) left join `grille_interpretation` `gi` on(`gi`.`niveau` like concat(`ts`.`thematique`,' - %') and `ts`.`score` between `gi`.`score_min` and `gi`.`score_max`)) order by `ma`.`date_analyse` desc,`f`.`nom`,`ts`.`thematique` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vue_modele_maturite`
--

/*!50001 DROP VIEW IF EXISTS `vue_modele_maturite`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vue_modele_maturite` AS select `f`.`id_fonction` AS `id_fonction`,`f`.`nom` AS `nom_fonction`,`f`.`description` AS `description_fonction`,`f`.`ordre` AS `ordre_fonction`,`t`.`id_thematique` AS `id_thematique`,`t`.`nom` AS `nom_thematique`,`t`.`description` AS `description_thematique`,`t`.`nombre_questions` AS `nombre_questions`,`t`.`ordre` AS `ordre_thematique`,count(distinct `ng`.`id_niveau`) AS `nombre_niveaux_globaux`,count(distinct `nt`.`id_niveau`) AS `nombre_niveaux_thematiques` from (((`fonctions` `f` left join `thematiques` `t` on(`f`.`id_fonction` = `t`.`id_fonction`)) left join `niveaux_globaux` `ng` on(`f`.`id_fonction` = `ng`.`id_fonction`)) left join `niveaux_thematiques` `nt` on(`t`.`id_thematique` = `nt`.`id_thematique`)) where `f`.`actif` = 1 and (`t`.`actif` = 1 or `t`.`actif` is null) group by `f`.`id_fonction`,`f`.`nom`,`f`.`description`,`f`.`ordre`,`t`.`id_thematique`,`t`.`nom`,`t`.`description`,`t`.`nombre_questions`,`t`.`ordre` order by `f`.`ordre`,`t`.`ordre` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vue_permissions_utilisateur`
--

/*!50001 DROP VIEW IF EXISTS `vue_permissions_utilisateur`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vue_permissions_utilisateur` AS select `a`.`id_acteur` AS `id_acteur`,`a`.`nom_prenom` AS `nom_prenom`,`a`.`email` AS `email`,`m`.`nom_module` AS `nom_module`,`m`.`description` AS `module_description`,`m`.`route_base` AS `route_base`,`rp`.`peut_voir` AS `peut_voir`,`rp`.`peut_editer` AS `peut_editer`,`rp`.`peut_supprimer` AS `peut_supprimer`,`rp`.`peut_administrer` AS `peut_administrer` from (((`acteurs` `a` join `roles` `r` on(`a`.`id_role` = `r`.`id_role`)) join `role_permissions` `rp` on(`r`.`id_role` = `rp`.`id_role`)) join `modules` `m` on(`rp`.`id_module` = `m`.`id_module`)) where `a`.`compte_actif` = 1 and `m`.`actif` = 1 */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vue_scores_applications`
--

/*!50001 DROP VIEW IF EXISTS `vue_scores_applications`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vue_scores_applications` AS select `a`.`id_application` AS `id_application`,`a`.`nom_application` AS `nom_application`,`a`.`statut` AS `statut`,`a`.`architecture_logicielle` AS `architecture_logicielle`,`ma`.`score_global` AS `score_global`,`ma`.`date_analyse` AS `date_analyse`,(select `applications`.`id_entreprise` from `applications` where `applications`.`id_application` = `a`.`id_application`) AS `id_entreprise`,(select `entreprises`.`nom_entreprise` from `entreprises` where `entreprises`.`id_entreprise` = `a`.`id_entreprise`) AS `nom_entreprise` from (`applications` `a` left join `maturity_analyses` `ma` on(`a`.`id_application` = `ma`.`id_application`)) where `ma`.`id_analyse` in (select max(`maturity_analyses`.`id_analyse`) from `maturity_analyses` group by `maturity_analyses`.`id_application`) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vue_scores_entreprises`
--

/*!50001 DROP VIEW IF EXISTS `vue_scores_entreprises`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vue_scores_entreprises` AS select `e`.`id_entreprise` AS `id_entreprise`,`e`.`nom_entreprise` AS `nom_entreprise`,`e`.`secteur` AS `secteur`,`es`.`score_global` AS `score_global`,`es`.`date_calcul` AS `date_calcul`,count(distinct `a`.`id_application`) AS `nombre_applications`,count(distinct `ts`.`thematique`) AS `nombre_thematiques`,count(distinct `f`.`id_fonction`) AS `nombre_fonctions`,count(distinct `ma`.`id_analyse`) AS `nombre_analyses` from ((((((`entreprises` `e` left join `entreprise_scores` `es` on(`e`.`id_entreprise` = `es`.`id_entreprise`)) left join `applications` `a` on(`e`.`id_entreprise` = `a`.`id_entreprise`)) left join `maturity_analyses` `ma` on(`a`.`id_application` = `ma`.`id_application`)) left join `thematique_scores` `ts` on(`ma`.`id_analyse` = `ts`.`id_analyse`)) left join `thematiques` `t` on(`ts`.`thematique` = `t`.`nom`)) left join `fonctions` `f` on(`t`.`id_fonction` = `f`.`id_fonction`)) group by `e`.`id_entreprise`,`e`.`nom_entreprise`,`e`.`secteur`,`es`.`score_global`,`es`.`date_calcul` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vue_scores_entreprises_securisee`
--

/*!50001 DROP VIEW IF EXISTS `vue_scores_entreprises_securisee`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vue_scores_entreprises_securisee` AS select `e`.`id_entreprise` AS `id_entreprise`,`e`.`nom_entreprise` AS `nom_entreprise`,`e`.`secteur` AS `secteur`,(select avg(`ma`.`score_global`) from (`applications` `a` join `maturity_analyses` `ma` on(`a`.`id_application` = `ma`.`id_application`)) where `a`.`id_entreprise` = `e`.`id_entreprise` and `ma`.`id_analyse` in (select max(`maturity_analyses`.`id_analyse`) from `maturity_analyses` where `maturity_analyses`.`id_application` = `a`.`id_application`)) AS `score_global`,curdate() AS `date_calcul`,(select count(0) from `applications` where `applications`.`id_entreprise` = `e`.`id_entreprise`) AS `nombre_applications`,(select count(distinct `ts`.`thematique`) from ((`thematique_scores` `ts` join `maturity_analyses` `ma` on(`ts`.`id_analyse` = `ma`.`id_analyse`)) join `applications` `a` on(`ma`.`id_application` = `a`.`id_application`)) where `a`.`id_entreprise` = `e`.`id_entreprise`) AS `nombre_thematiques` from `entreprises` `e` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vue_scores_fonctions`
--

/*!50001 DROP VIEW IF EXISTS `vue_scores_fonctions`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vue_scores_fonctions` AS select `f`.`id_fonction` AS `id_fonction`,`f`.`nom` AS `fonction_nom`,`f`.`description` AS `description`,avg(`ts`.`score`) AS `score_moyen`,count(distinct `a`.`id_application`) AS `nombre_applications`,count(distinct `a`.`id_entreprise`) AS `nombre_entreprises`,count(distinct `t`.`id_thematique`) AS `nombre_thematiques`,max(`ma`.`date_analyse`) AS `derniere_analyse` from ((((`fonctions` `f` join `thematiques` `t` on(`f`.`id_fonction` = `t`.`id_fonction`)) join `thematique_scores` `ts` on(`t`.`nom` = `ts`.`thematique`)) join `maturity_analyses` `ma` on(`ts`.`id_analyse` = `ma`.`id_analyse`)) join `applications` `a` on(`ma`.`id_application` = `a`.`id_application`)) where `ma`.`id_analyse` in (select max(`maturity_analyses`.`id_analyse`) from `maturity_analyses` group by `maturity_analyses`.`id_application`) group by `f`.`id_fonction`,`f`.`nom`,`f`.`description` order by avg(`ts`.`score`) desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vue_scores_fonctions_securisee`
--

/*!50001 DROP VIEW IF EXISTS `vue_scores_fonctions_securisee`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vue_scores_fonctions_securisee` AS select `f`.`id_fonction` AS `id_fonction`,`f`.`nom` AS `fonction_nom`,`f`.`description` AS `description`,(select avg(`ts`.`score`) from (`thematique_scores` `ts` join `thematiques` `t` on(`ts`.`thematique` = `t`.`nom`)) where `t`.`id_fonction` = `f`.`id_fonction`) AS `score_moyen`,(select count(distinct `a`.`id_application`) from (((`thematique_scores` `ts` join `maturity_analyses` `ma` on(`ts`.`id_analyse` = `ma`.`id_analyse`)) join `applications` `a` on(`ma`.`id_application` = `a`.`id_application`)) join `thematiques` `t` on(`ts`.`thematique` = `t`.`nom`)) where `t`.`id_fonction` = `f`.`id_fonction`) AS `nombre_applications`,(select count(distinct `t`.`id_thematique`) from `thematiques` `t` where `t`.`id_fonction` = `f`.`id_fonction`) AS `nombre_thematiques` from `fonctions` `f` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vue_scores_thematiques`
--

/*!50001 DROP VIEW IF EXISTS `vue_scores_thematiques`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vue_scores_thematiques` AS select `ts`.`thematique` AS `thematique`,avg(`ts`.`score`) AS `score_moyen`,sum(`ts`.`nombre_reponses`) AS `total_reponses` from (`thematique_scores` `ts` join `maturity_analyses` `ma` on(`ts`.`id_analyse` = `ma`.`id_analyse`)) where `ma`.`id_analyse` in (select max(`maturity_analyses`.`id_analyse`) from `maturity_analyses` group by `maturity_analyses`.`id_application`) group by `ts`.`thematique` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vue_scores_thematiques_detaillees`
--

/*!50001 DROP VIEW IF EXISTS `vue_scores_thematiques_detaillees`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vue_scores_thematiques_detaillees` AS select `t`.`id_thematique` AS `id_thematique`,`t`.`nom` AS `thematique_nom`,`t`.`description` AS `description`,`f`.`id_fonction` AS `id_fonction`,`f`.`nom` AS `fonction_nom`,avg(`ts`.`score`) AS `score_moyen`,min(`ts`.`score`) AS `score_min`,max(`ts`.`score`) AS `score_max`,count(distinct `ma`.`id_application`) AS `nombre_applications`,count(distinct `a`.`id_entreprise`) AS `nombre_entreprises`,max(`ma`.`date_analyse`) AS `derniere_analyse` from ((((`thematiques` `t` join `fonctions` `f` on(`t`.`id_fonction` = `f`.`id_fonction`)) join `thematique_scores` `ts` on(`t`.`nom` = `ts`.`thematique`)) join `maturity_analyses` `ma` on(`ts`.`id_analyse` = `ma`.`id_analyse`)) join `applications` `a` on(`ma`.`id_application` = `a`.`id_application`)) where `ma`.`id_analyse` in (select max(`maturity_analyses`.`id_analyse`) from `maturity_analyses` group by `maturity_analyses`.`id_application`) group by `t`.`id_thematique`,`t`.`nom`,`t`.`description`,`f`.`id_fonction`,`f`.`nom` order by `f`.`nom`,avg(`ts`.`score`) desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vue_scores_thematiques_securisee`
--

/*!50001 DROP VIEW IF EXISTS `vue_scores_thematiques_securisee`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vue_scores_thematiques_securisee` AS select `t`.`id_thematique` AS `id_thematique`,`t`.`nom` AS `thematique_nom`,`t`.`description` AS `description`,`f`.`id_fonction` AS `id_fonction`,`f`.`nom` AS `fonction_nom`,(select avg(`ts`.`score`) from `thematique_scores` `ts` where `ts`.`thematique` = `t`.`nom`) AS `score_moyen`,(select count(distinct `ma`.`id_application`) from (`thematique_scores` `ts` join `maturity_analyses` `ma` on(`ts`.`id_analyse` = `ma`.`id_analyse`)) where `ts`.`thematique` = `t`.`nom`) AS `nombre_applications` from (`thematiques` `t` join `fonctions` `f` on(`t`.`id_fonction` = `f`.`id_fonction`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vue_stats_formulaires`
--

/*!50001 DROP VIEW IF EXISTS `vue_stats_formulaires`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vue_stats_formulaires` AS select `q`.`id_questionnaire` AS `id_questionnaire`,`q`.`fonction` AS `fonction`,`q`.`thematique` AS `thematique`,count(distinct `f`.`id_formulaire`) AS `nombre_formulaires`,count(distinct `f`.`id_application`) AS `nombre_applications`,count(distinct `a`.`id_entreprise`) AS `nombre_entreprises`,avg(`ma`.`score_global`) AS `score_moyen_genere`,max(`f`.`date_modification`) AS `derniere_utilisation` from (((`questionnaires` `q` left join `formulaires` `f` on(`q`.`id_questionnaire` = `f`.`id_questionnaire`)) left join `applications` `a` on(`f`.`id_application` = `a`.`id_application`)) left join `maturity_analyses` `ma` on(`a`.`id_application` = `ma`.`id_application` and `ma`.`id_analyse` in (select max(`maturity_analyses`.`id_analyse`) from `maturity_analyses` group by `maturity_analyses`.`id_application`))) group by `q`.`id_questionnaire`,`q`.`fonction`,`q`.`thematique` order by count(distinct `f`.`id_formulaire`) desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vue_utilisateurs_complets`
--

/*!50001 DROP VIEW IF EXISTS `vue_utilisateurs_complets`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vue_utilisateurs_complets` AS select `a`.`id_acteur` AS `id_acteur`,`a`.`nom_prenom` AS `nom_prenom`,`a`.`email` AS `email`,`a`.`organisation` AS `organisation`,`a`.`id_entreprise` AS `id_entreprise`,`e`.`nom_entreprise` AS `nom_entreprise`,`a`.`id_role` AS `id_role`,`r`.`nom_role` AS `nom_role`,`r`.`niveau_acces` AS `niveau_acces`,`a`.`compte_actif` AS `compte_actif`,`a`.`derniere_connexion` AS `derniere_connexion`,`a`.`date_creation` AS `date_creation`,`a`.`date_modification` AS `date_modification` from ((`acteurs` `a` left join `roles` `r` on(`a`.`id_role` = `r`.`id_role`)) left join `entreprises` `e` on(`a`.`id_entreprise` = `e`.`id_entreprise`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2025-06-04  1:24:20
