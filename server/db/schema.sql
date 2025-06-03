-- Création de la base de données
CREATE DATABASE IF NOT EXISTS maturity_assessment;
USE maturity_assessment;

-- Table des entreprises
CREATE TABLE entreprises (
    id_entreprise VARCHAR(36) PRIMARY KEY,
    nom_entreprise VARCHAR(100) NOT NULL,
    secteur VARCHAR(50) NOT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table des acteurs (utilisateurs du système)
CREATE TABLE acteurs (
    id_acteur VARCHAR(36) PRIMARY KEY,
    nom_prenom VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    organisation VARCHAR(50) NOT NULL,
    id_entreprise VARCHAR(36),
    anciennete_role INT NOT NULL,
    email VARCHAR(100) UNIQUE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_entreprise) REFERENCES entreprises(id_entreprise)
);

-- Table des applications
CREATE TABLE applications (
    id_application VARCHAR(36) PRIMARY KEY,
    nom_application VARCHAR(100) NOT NULL,
    statut ENUM('Projet','Run') NOT NULL,
    type ENUM('Build','Buy') NOT NULL,
    hebergement ENUM('Cloud','Prem','Hybrid') NOT NULL,
    architecture_logicielle ENUM('ERP','Multitenant SAAS','MVC','Monolithique') NOT NULL,
    id_entreprise VARCHAR(36),
    date_mise_en_prod DATE,
    language VARCHAR(50),
    editeur VARCHAR(50),
    description TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_entreprise) REFERENCES entreprises(id_entreprise)
);

-- Table des fonctions (ex: DevSecOps, DevOps, SecOps, etc.)
CREATE TABLE fonctions (
    id_fonction VARCHAR(36) PRIMARY KEY,
    nom VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table des thématiques
CREATE TABLE thematiques (
    id_thematique VARCHAR(36) PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    description TEXT,
    id_fonction VARCHAR(36) NOT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_fonction) REFERENCES fonctions(id_fonction),
    UNIQUE KEY (nom, id_fonction)
);

-- Table des questionnaires
CREATE TABLE questionnaires (
    id_questionnaire VARCHAR(36) PRIMARY KEY,
    fonction VARCHAR(100) NOT NULL,
    thematique VARCHAR(50) NOT NULL,
    description TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table des questions (maintenant liées directement aux thématiques)
CREATE TABLE questions (
    id_question VARCHAR(36) PRIMARY KEY,
    id_questionnaire VARCHAR(36) NOT NULL,
    id_thematique VARCHAR(36) NOT NULL,
    texte TEXT NOT NULL,
    ponderation INT NOT NULL,
    ordre INT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_questionnaire) REFERENCES questionnaires(id_questionnaire) ON DELETE CASCADE,
    FOREIGN KEY (id_thematique) REFERENCES thematiques(id_thematique)
);

-- Table des métadonnées de questions
CREATE TABLE question_metadata (
    id_question VARCHAR(36) NOT NULL,
    metadata_key VARCHAR(50) NOT NULL,
    metadata_value TEXT,
    PRIMARY KEY (id_question, metadata_key),
    FOREIGN KEY (id_question) REFERENCES questions(id_question) ON DELETE CASCADE
);

-- Table des formulaires
CREATE TABLE formulaires (
    id_formulaire VARCHAR(36) PRIMARY KEY,
    id_acteur VARCHAR(36) NOT NULL,
    id_application VARCHAR(36) NOT NULL,
    id_questionnaire VARCHAR(36) NOT NULL,
    date_creation TIMESTAMP NOT NULL,
    date_modification TIMESTAMP NOT NULL,
    statut ENUM('Brouillon','Soumis','Validé') DEFAULT 'Brouillon',
    FOREIGN KEY (id_acteur) REFERENCES acteurs(id_acteur),
    FOREIGN KEY (id_application) REFERENCES applications(id_application),
    FOREIGN KEY (id_questionnaire) REFERENCES questionnaires(id_questionnaire),
    INDEX idx_formulaire_app (id_application),
    INDEX idx_formulaire_acteur (id_acteur),
    INDEX idx_formulaire_questionnaire (id_questionnaire)
);

-- Table des réponses
CREATE TABLE reponses (
    id_reponse VARCHAR(36) PRIMARY KEY,
    id_formulaire VARCHAR(36) NOT NULL,
    id_question VARCHAR(36) NOT NULL,
    valeur_reponse VARCHAR(255) NOT NULL,
    score INT NOT NULL,
    commentaire TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_formulaire) REFERENCES formulaires(id_formulaire) ON DELETE CASCADE,
    FOREIGN KEY (id_question) REFERENCES questions(id_question),
    INDEX idx_reponse_formulaire (id_formulaire),
    INDEX idx_reponse_question (id_question)
);

-- Table des synthèses de maturité par application
CREATE TABLE maturity_analyses (
    id_analyse VARCHAR(36) PRIMARY KEY,
    id_application VARCHAR(36) NOT NULL,
    date_analyse TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    score_global DECIMAL(5,2),
    FOREIGN KEY (id_application) REFERENCES applications(id_application),
    INDEX idx_analyse_app (id_application)
);

-- Table des scores par thématique pour chaque analyse de maturité
CREATE TABLE thematique_scores (
    id_score VARCHAR(36) PRIMARY KEY,
    id_analyse VARCHAR(36) NOT NULL,
    thematique VARCHAR(50) NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    nombre_reponses INT NOT NULL,
    FOREIGN KEY (id_analyse) REFERENCES maturity_analyses(id_analyse) ON DELETE CASCADE,
    INDEX idx_score_analyse (id_analyse),
    INDEX idx_score_thematique (thematique)
);

-- Table pour l'historique des scores de maturité
CREATE TABLE historique_scores (
    id_historique VARCHAR(36) PRIMARY KEY,
    id_application VARCHAR(36) NOT NULL,
    id_entreprise VARCHAR(36) NULL,
    thematique VARCHAR(50) NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    date_mesure DATE NOT NULL,
    FOREIGN KEY (id_application) REFERENCES applications(id_application),
    FOREIGN KEY (id_entreprise) REFERENCES entreprises(id_entreprise),
    INDEX idx_historique_app (id_application),
    INDEX idx_historique_date (date_mesure)
);

-- Table pour l'historique des scores par entreprise
CREATE TABLE historique_scores_entreprises (
    id_historique VARCHAR(36) PRIMARY KEY,
    id_entreprise VARCHAR(36) NOT NULL,
    score_global DECIMAL(5,2) NOT NULL,
    date_mesure DATE NOT NULL,
    FOREIGN KEY (id_entreprise) REFERENCES entreprises(id_entreprise),
    INDEX idx_hse_entreprise (id_entreprise),
    INDEX idx_hse_date (date_mesure)
);

-- Table pour les permissions utilisateurs
CREATE TABLE permissions (
    id_permission VARCHAR(36) PRIMARY KEY,
    id_acteur VARCHAR(36) NOT NULL,
    type_ressource ENUM('APPLICATION', 'QUESTIONNAIRE', 'FORMULAIRE', 'RAPPORT') NOT NULL,
    id_ressource VARCHAR(36),
    peut_voir BOOLEAN DEFAULT FALSE,
    peut_editer BOOLEAN DEFAULT FALSE,
    peut_supprimer BOOLEAN DEFAULT FALSE,
    peut_administrer BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (id_acteur) REFERENCES acteurs(id_acteur) ON DELETE CASCADE,
    INDEX idx_permission_acteur (id_acteur),
    INDEX idx_permission_ressource (type_ressource, id_ressource)
);

-- Table pour la grille d'interprétation des scores
CREATE TABLE grille_interpretation (
    id_grille VARCHAR(36) PRIMARY KEY,
    fonction VARCHAR(100) NOT NULL,
    score_min DECIMAL(5,2) NOT NULL,
    score_max DECIMAL(5,2) NOT NULL,
    niveau VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    recommandations TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_grille_fonction (fonction),
    INDEX idx_grille_niveau (niveau)
);

-- Vues pour faciliter les requêtes courantes

-- Vue pour les scores globaux des applications
CREATE VIEW vue_scores_applications AS
SELECT 
    a.id_application,
    a.nom_application,
    a.statut,
    a.architecture_logicielle,
    ma.score_global,
    ma.date_analyse
FROM applications a
LEFT JOIN maturity_analyses ma ON a.id_application = ma.id_application
WHERE ma.id_analyse IN (
    SELECT MAX(id_analyse) 
    FROM maturity_analyses 
    GROUP BY id_application
);

-- Vue pour les détails des formulaires avec informations associées
CREATE VIEW vue_details_formulaires AS
SELECT 
    f.id_formulaire,
    f.date_creation,
    a.id_acteur,
    a.nom_prenom,
    a.role,
    a.organisation,
    app.id_application,
    app.nom_application,
    q.id_questionnaire,
    q.fonction,
    q.thematique,
    f.statut
FROM formulaires f
JOIN acteurs a ON f.id_acteur = a.id_acteur
JOIN applications app ON f.id_application = app.id_application
JOIN questionnaires q ON f.id_questionnaire = q.id_questionnaire;

-- Vue pour les scores par thématique
CREATE VIEW vue_scores_thematiques AS
SELECT 
    ts.thematique,
    AVG(ts.score) as score_moyen,
    SUM(ts.nombre_reponses) as total_reponses
FROM thematique_scores ts
JOIN maturity_analyses ma ON ts.id_analyse = ma.id_analyse
WHERE ma.id_analyse IN (
    SELECT MAX(id_analyse) 
    FROM maturity_analyses 
    GROUP BY id_application
)
GROUP BY ts.thematique;

-- Vue pour l'historique des scores par application
CREATE VIEW vue_historique_application AS
SELECT 
    app.id_application,
    app.nom_application,
    hs.thematique,
    hs.score,
    hs.date_mesure
FROM historique_scores hs
JOIN applications app ON hs.id_application = app.id_application
ORDER BY app.nom_application, hs.thematique, hs.date_mesure;

-- Vue pour les scores par entreprise
CREATE VIEW vue_scores_entreprises AS
SELECT 
    e.id_entreprise,
    e.nom_entreprise,
    AVG(ma.score_global) as score_moyen,
    COUNT(DISTINCT ma.id_application) as nombre_applications,
    MAX(ma.date_analyse) as derniere_analyse
FROM entreprises e
JOIN applications a ON e.id_entreprise = a.id_entreprise
JOIN maturity_analyses ma ON a.id_application = ma.id_application
WHERE ma.id_analyse IN (
    SELECT MAX(id_analyse) 
    FROM maturity_analyses 
    GROUP BY id_application
)
GROUP BY e.id_entreprise, e.nom_entreprise;

-- Vue pour l'interprétation des résultats
CREATE VIEW vue_interpretation_resultats AS
SELECT 
    ma.id_analyse,
    ma.id_application,
    a.nom_application,
    ma.score_global,
    CASE 
        WHEN ma.score_global >= 4 THEN 'Optimisé'
        WHEN ma.score_global >= 3 THEN 'Mesuré'
        WHEN ma.score_global >= 2 THEN 'Défini'
        WHEN ma.score_global > 0 THEN 'Initial'
        ELSE 'Non évalué'
    END AS niveau_global,
    'Description générique' AS description_globale,
    'Recommandations génériques' AS recommandations_globales,
    ma.date_analyse
FROM maturity_analyses ma
JOIN applications a ON ma.id_application = a.id_application;

-- Vue pour l'interprétation des thématiques
CREATE VIEW vue_interpretation_thematiques AS
SELECT 
    ts.id_analyse,
    ts.thematique,
    ts.score,
    gi.niveau,
    gi.description,
    gi.recommandations
FROM thematique_scores ts
LEFT JOIN grille_interpretation gi ON 
    gi.fonction = 'DevSecOps-Thematique' AND 
    gi.niveau LIKE CONCAT(ts.thematique, ' - %') AND
    ts.score BETWEEN gi.score_min AND gi.score_max;

-- Procédure pour calculer et mettre à jour les scores de maturité
DELIMITER //
CREATE PROCEDURE calculer_scores_maturite(IN p_id_application VARCHAR(36))
BEGIN
    DECLARE v_id_analyse VARCHAR(36);
    DECLARE v_score_global DECIMAL(5,2);
    
    -- Générer un ID unique pour l'analyse
    SET v_id_analyse = UUID();
    
    -- Insérer l'analyse de maturité
    INSERT INTO maturity_analyses (id_analyse, id_application) 
    VALUES (v_id_analyse, p_id_application);
    
    -- Calculer et insérer les scores par thématique
    INSERT INTO thematique_scores (id_score, id_analyse, thematique, score, nombre_reponses)
    SELECT 
        UUID(),
        v_id_analyse,
        t.nom,
        AVG(r.score),
        COUNT(r.id_reponse)
    FROM formulaires f
    JOIN reponses r ON f.id_formulaire = r.id_formulaire
    JOIN questions q ON r.id_question = q.id_question
    JOIN thematiques t ON q.id_thematique = t.id_thematique
    WHERE f.id_application = p_id_application
    GROUP BY t.nom;
    
    -- Calculer le score global
    SELECT AVG(score) INTO v_score_global
    FROM thematique_scores
    WHERE id_analyse = v_id_analyse;
    
    -- Mettre à jour l'analyse avec le score global
    UPDATE maturity_analyses
    SET score_global = v_score_global
    WHERE id_analyse = v_id_analyse;
    
    -- Ajouter à l'historique
    INSERT INTO historique_scores (id_historique, id_application, thematique, score, date_mesure)
    SELECT 
        UUID(),
        p_id_application,
        thematique,
        score,
        CURDATE()
    FROM thematique_scores
    WHERE id_analyse = v_id_analyse;
END //
DELIMITER ;

-- Procédure pour calculer les scores globaux par entreprise
DELIMITER //
CREATE PROCEDURE calculer_scores_entreprise(IN p_id_entreprise VARCHAR(36))
BEGIN
    DECLARE v_score_global DECIMAL(5,2);
    DECLARE v_id_historique VARCHAR(36);
    
    -- Calculer le score global de l'entreprise (moyenne des scores de ses applications)
    SELECT AVG(ma.score_global) INTO v_score_global
    FROM applications a
    JOIN maturity_analyses ma ON a.id_application = ma.id_application
    WHERE a.id_entreprise = p_id_entreprise
    AND ma.id_analyse IN (
        SELECT MAX(id_analyse) 
        FROM maturity_analyses 
        WHERE id_application = a.id_application
    );
    
    -- Si un score a été calculé, l'enregistrer dans l'historique
    IF v_score_global IS NOT NULL THEN
        SET v_id_historique = UUID();
        
        INSERT INTO historique_scores_entreprises (id_historique, id_entreprise, score_global, date_mesure)
        VALUES (v_id_historique, p_id_entreprise, v_score_global, CURDATE());
    END IF;
END //
DELIMITER ;

-- Trigger pour mettre à jour automatiquement les scores après l'ajout de réponses
DELIMITER //
CREATE TRIGGER after_reponse_insert
AFTER INSERT ON reponses
FOR EACH ROW
BEGIN
    DECLARE v_id_application VARCHAR(36);
    
    -- Récupérer l'ID de l'application liée à la réponse
    SELECT id_application INTO v_id_application
    FROM formulaires
    WHERE id_formulaire = NEW.id_formulaire;
    
    -- Si on trouve une application associée, mettre à jour la date de modification
    IF v_id_application IS NOT NULL THEN
        UPDATE applications 
        SET date_modification = CURRENT_TIMESTAMP 
        WHERE id_application = v_id_application;
    END IF;
END //
DELIMITER ;