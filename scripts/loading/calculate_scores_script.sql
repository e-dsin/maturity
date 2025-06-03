-- Script pour calculer les scores de maturité
USE maturity_assessment;

-- Calculer les scores pour chaque application
-- 1. D'abord, on récupère toutes les applications
DROP TEMPORARY TABLE IF EXISTS temp_applications;
CREATE TEMPORARY TABLE temp_applications AS
SELECT id_application FROM applications;

-- 2. On calcule les scores pour chaque application
-- Cette procédure va exécuter pour chaque application:
-- - Calculer les scores par thématique
-- - Calculer un score global
-- - Insérer des enregistrements dans les tables maturity_analyses et thematique_scores
-- - Ajouter des entrées dans l'historique des scores
DELIMITER //
CREATE PROCEDURE calculate_all_maturity_scores()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE app_id VARCHAR(36);
    DECLARE cur CURSOR FOR SELECT id_application FROM temp_applications;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur;
    
    read_loop: LOOP
        FETCH cur INTO app_id;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Appeler la procédure de calcul des scores pour cette application
        CALL calculer_scores_maturite(app_id);
    END LOOP;
    
    CLOSE cur;
END //
DELIMITER ;

-- 3. Exécuter la procédure pour calculer tous les scores
CALL calculate_all_maturity_scores();

-- 4. Calculer les scores pour chaque entreprise
-- Cette procédure utilise les scores des applications pour calculer 
-- un score global par entreprise
DROP TEMPORARY TABLE IF EXISTS temp_enterprises;
CREATE TEMPORARY TABLE temp_enterprises AS
SELECT DISTINCT id_entreprise FROM applications;

DELIMITER //
CREATE PROCEDURE calculate_all_enterprise_scores()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE ent_id VARCHAR(36);
    DECLARE cur CURSOR FOR SELECT id_entreprise FROM temp_enterprises;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur;
    
    read_loop: LOOP
        FETCH cur INTO ent_id;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Appeler la procédure de calcul des scores pour cette entreprise
        CALL calculer_score_entreprise(ent_id);
    END LOOP;
    
    CLOSE cur;
END //
DELIMITER ;

-- 5. Exécuter la procédure pour calculer tous les scores d'entreprise
CALL calculate_all_enterprise_scores();

-- 6. Drop les procédures temporaires
DROP PROCEDURE calculate_all_maturity_scores;
DROP PROCEDURE calculate_all_enterprise_scores;

-- 7. Nettoyer les tables temporaires
DROP TEMPORARY TABLE IF EXISTS temp_applications;
DROP TEMPORARY TABLE IF EXISTS temp_enterprises;

-- 8. Afficher quelques résultats pour vérification
SELECT 'Analyses de maturité par application:' AS 'Info';
SELECT 
    a.nom_application,
    ma.score_global,
    ma.date_analyse
FROM 
    maturity_analyses ma
JOIN 
    applications a ON ma.id_application = a.id_application
ORDER BY 
    ma.score_global DESC
LIMIT 10;

SELECT 'Scores par thématique:' AS 'Info';
SELECT 
    a.nom_application,
    ts.thematique,
    ts.score,
    ts.nombre_reponses
FROM 
    thematique_scores ts
JOIN 
    maturity_analyses ma ON ts.id_analyse = ma.id_analyse
JOIN 
    applications a ON ma.id_application = a.id_application
ORDER BY 
    a.nom_application, ts.score DESC
LIMIT 20;

SELECT 'Scores par entreprise:' AS 'Info';
SELECT 
    e.nom_entreprise,
    es.score_global,
    es.date_calcul
FROM 
    entreprise_scores es
JOIN 
    entreprises e ON es.id_entreprise = e.id_entreprise
ORDER BY 
    es.score_global DESC;

SELECT 'Historique des scores par entreprise:' AS 'Info';
SELECT 
    e.nom_entreprise,
    hse.score_global,
    hse.date_mesure
FROM 
    historique_scores_entreprises hse
JOIN 
    entreprises e ON hse.id_entreprise = e.id_entreprise
ORDER BY 
    e.nom_entreprise, hse.date_mesure DESC
LIMIT 20;