// seedGrilleInterpretation-updated.ts
import { pool } from '../server/db/dbConnection';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
import {
  FONCTIONS,
  NIVEAUX_GLOBAUX_DEVSECOPS,
  NIVEAUX_GLOBAUX_CYBERSECURITE,
  NIVEAUX_GLOBAUX_MODELE_OPERATIONNEL,
  NIVEAUX_GLOBAUX_GOUVERNANCE_SI,
  NIVEAUX_GLOBAUX_ACCULTURATION_DATA,
  NIVEAUX_THEMATIQUES
} from '../src/types/maturity-model';

dotenv.config();

/**
 * Fonction pour créer la table grille_interpretation si elle n'existe pas
 */
async function createGrilleInterpretationTable() {
  try {
    console.log('Vérification/création de la table grille_interpretation...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS grille_interpretation (
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
      )
    `);
    
    console.log('Table grille_interpretation vérifiée/créée avec succès.');
  } catch (error) {
    console.error('Erreur lors de la création de la table:', error);
    throw error;
  }
}

/**
 * Fonction pour créer la table fonctions si elle n'existe pas
 */
async function createFunctionsTable() {
  try {
    console.log('Vérification/création de la table fonctions...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS fonctions (
        id_fonction VARCHAR(36) PRIMARY KEY,
        nom VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        ordre INT,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Table fonctions vérifiée/créée avec succès.');
  } catch (error) {
    console.error('Erreur lors de la création de la table fonctions:', error);
    throw error;
  }
}

/**
 * Fonction pour créer la table thematiques si elle n'existe pas
 */
async function createThematiquesTable() {
  try {
    console.log('Vérification/création de la table thematiques...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS thematiques (
        id_thematique VARCHAR(36) PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        description TEXT,
        id_fonction VARCHAR(36) NOT NULL,
        ordre INT,
        nombre_questions INT,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (id_fonction) REFERENCES fonctions(id_fonction),
        UNIQUE KEY (nom, id_fonction)
      )
    `);
    
    console.log('Table thematiques vérifiée/créée avec succès.');
  } catch (error) {
    console.error('Erreur lors de la création de la table thematiques:', error);
    throw error;
  }
}

/**
 * Fonction pour vérifier et ajouter la colonne ordre si nécessaire
 */
async function ensureTableColumnsExist() {
  try {
    console.log('Vérification des colonnes requises...');
    
    // Vérifier si la colonne ordre existe dans la table fonctions
    const [fonctionsColumns] = await pool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'fonctions'
      AND COLUMN_NAME = 'ordre'
    `);
    
    if ((fonctionsColumns as any[]).length === 0) {
      console.log('Ajout de la colonne ordre à la table fonctions...');
      await pool.query(`
        ALTER TABLE fonctions 
        ADD COLUMN ordre INT AFTER description
      `);
    }
    
    // Vérifier si la colonne ordre existe dans la table thematiques
    const [thematiquesColumns] = await pool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'thematiques'
      AND COLUMN_NAME = 'ordre'
    `);
    
    if ((thematiquesColumns as any[]).length === 0) {
      console.log('Ajout de la colonne ordre à la table thematiques...');
      await pool.query(`
        ALTER TABLE thematiques 
        ADD COLUMN ordre INT AFTER id_fonction
      `);
    }
    
    // Vérifier si la colonne nombre_questions existe dans la table thematiques
    const [nombreQuestionsColumns] = await pool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'thematiques'
      AND COLUMN_NAME = 'nombre_questions'
    `);
    
    if ((nombreQuestionsColumns as any[]).length === 0) {
      console.log('Ajout de la colonne nombre_questions à la table thematiques...');
      await pool.query(`
        ALTER TABLE thematiques 
        ADD COLUMN nombre_questions INT AFTER ordre
      `);
    }
    
    console.log('Vérification des colonnes terminée.');
  } catch (error) {
    console.error('Erreur lors de la vérification/ajout des colonnes:', error);
    throw error;
  }
}

/**
 * Fonction pour nettoyer les données existantes
 */
async function cleanExistingData() {
  try {
    console.log('Nettoyage des données existantes...');
    
    // Récupérer toutes les fonctions existantes
    const [fonctions] = await pool.query('SELECT nom FROM fonctions');
    const fonctionNames = (fonctions as any[]).map(f => f.nom);
    
    // Supprimer les données associées à ces fonctions dans grille_interpretation
    if (fonctionNames.length > 0) {
      const placeholders = fonctionNames.map(() => '?').join(', ');
      await pool.query(`DELETE FROM grille_interpretation WHERE fonction IN (${placeholders})`, fonctionNames);
    }
    
    try {
      // Supprimer les thématiques (les contraintes de clé étrangère vont supprimer les associations)
      await pool.query('DELETE FROM thematiques');
    } catch (error) {
      console.warn('Attention: Impossible de supprimer les thématiques. Cela peut être normal si des contraintes existent:', error);
    }
    
    try {
      // Supprimer les fonctions
      await pool.query('DELETE FROM fonctions');
    } catch (error) {
      console.warn('Attention: Impossible de supprimer les fonctions. Cela peut être normal si des contraintes existent:', error);
      // Alternative: mettre à jour les fonctions existantes
      for (const fonction of FONCTIONS) {
        await pool.query(`
          UPDATE fonctions 
          SET description = ?, ordre = ?
          WHERE id_fonction = ?
        `, [fonction.description, fonction.ordre || null, fonction.id]);
      }
    }
    
    console.log('Données existantes nettoyées avec succès.');
  } catch (error) {
    console.error('Erreur lors du nettoyage des données:', error);
    throw error;
  }
}

/**
 * Fonction pour insérer les fonctions
 */
async function insertFonctions() {
  try {
    console.log('Insertion des fonctions...');
    
    for (const fonction of FONCTIONS) {
      try {
        await pool.query(`
          INSERT INTO fonctions 
          (id_fonction, nom, description, ordre) 
          VALUES (?, ?, ?, ?)`,
          [
            fonction.id,
            fonction.nom,
            fonction.description,
            fonction.ordre || null
          ]
        );
      } catch (error) {
        // Si l'insertion échoue (probablement à cause d'une clé existante),
        // essayer de mettre à jour à la place
        await pool.query(`
          UPDATE fonctions 
          SET nom = ?, description = ?, ordre = ?
          WHERE id_fonction = ?
        `, [
          fonction.nom,
          fonction.description,
          fonction.ordre || null,
          fonction.id
        ]);
      }
    }
    
    console.log('Fonctions insérées avec succès.');
  } catch (error) {
    console.error('Erreur lors de l\'insertion des fonctions:', error);
    throw error;
  }
}

/**
 * Fonction pour insérer les thématiques
 */
async function insertThematiques() {
  try {
    console.log('Insertion des thématiques...');
    
    for (const fonction of FONCTIONS) {
      for (const thematique of fonction.thematiques) {
        try {
          await pool.query(`
            INSERT INTO thematiques 
            (id_thematique, nom, description, id_fonction, ordre, nombre_questions) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
              thematique.id,
              thematique.nom,
              thematique.description,
              fonction.id,
              thematique.ordre || null,
              thematique.nombreQuestions || null
            ]
          );
        } catch (error) {
          // Si l'insertion échoue, essayer de mettre à jour
          await pool.query(`
            UPDATE thematiques 
            SET nom = ?, description = ?, ordre = ?, nombre_questions = ?
            WHERE id_thematique = ?
          `, [
            thematique.nom,
            thematique.description,
            thematique.ordre || null,
            thematique.nombreQuestions || null,
            thematique.id
          ]);
        }
      }
    }
    
    console.log('Thématiques insérées avec succès.');
  } catch (error) {
    console.error('Erreur lors de l\'insertion des thématiques:', error);
    throw error;
  }
}

/**
 * Fonction pour insérer tous les niveaux globaux de maturité
 */
async function insertAllGlobalMaturityLevels() {
  try {
    console.log('Insertion des niveaux globaux de maturité...');
    
    // Combiner tous les niveaux globaux
    const allGlobalLevels = [
      ...NIVEAUX_GLOBAUX_DEVSECOPS,
      ...NIVEAUX_GLOBAUX_CYBERSECURITE,
      ...NIVEAUX_GLOBAUX_MODELE_OPERATIONNEL,
      ...NIVEAUX_GLOBAUX_GOUVERNANCE_SI,
      ...NIVEAUX_GLOBAUX_ACCULTURATION_DATA
    ];
    
    for (const level of allGlobalLevels) {
      try {
        await pool.query(`
          INSERT INTO grille_interpretation 
          (id_grille, fonction, score_min, score_max, niveau, description, recommandations) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            level.id,
            level.fonction,
            level.score_min,
            level.score_max,
            level.niveau,
            level.description,
            level.recommandations
          ]
        );
      } catch (error) {
        // En cas d'erreur (par exemple clé dupliquée), essayer de mettre à jour
        await pool.query(`
          UPDATE grille_interpretation 
          SET fonction = ?, score_min = ?, score_max = ?, niveau = ?, description = ?, recommandations = ?
          WHERE id_grille = ?
        `, [
          level.fonction,
          level.score_min,
          level.score_max,
          level.niveau,
          level.description,
          level.recommandations,
          level.id
        ]);
      }
    }
    
    console.log('Niveaux globaux de maturité insérés avec succès.');
  } catch (error) {
    console.error('Erreur lors de l\'insertion des niveaux globaux:', error);
    throw error;
  }
}

/**
 * Fonction pour insérer les interprétations par thématique
 */
async function insertThematicInterpretations() {
  try {
    console.log('Insertion des interprétations par thématique...');
    
    for (const level of NIVEAUX_THEMATIQUES) {
      try {
        await pool.query(`
          INSERT INTO grille_interpretation 
          (id_grille, fonction, score_min, score_max, niveau, description, recommandations) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            level.id,
            level.fonction,
            level.score_min,
            level.score_max,
            level.niveau,
            level.description,
            level.recommandations
          ]
        );
      } catch (error) {
        // En cas d'erreur, essayer de mettre à jour
        await pool.query(`
          UPDATE grille_interpretation 
          SET fonction = ?, score_min = ?, score_max = ?, niveau = ?, description = ?, recommandations = ?
          WHERE id_grille = ?
        `, [
          level.fonction,
          level.score_min,
          level.score_max,
          level.niveau,
          level.description,
          level.recommandations,
          level.id
        ]);
      }
    }
    
    console.log('Interprétations par thématique insérées avec succès.');
  } catch (error) {
    console.error('Erreur lors de l\'insertion des interprétations par thématique:', error);
    throw error;
  }
}

/**
 * Fonction pour créer les vues SQL
 */
async function createViews() {
  try {
    console.log('Création des vues SQL...');
    
    // Vue pour faciliter l'interprétation des résultats
    await pool.query(`
      CREATE OR REPLACE VIEW vue_interpretation_resultats AS
      SELECT 
        ma.id_analyse,
        ma.id_application,
        a.nom_application,
        ma.score_global,
        gi.niveau AS niveau_global,
        gi.description AS description_globale,
        gi.recommandations AS recommandations_globales,
        ma.date_analyse
      FROM 
        maturity_analyses ma
      JOIN 
        applications a ON ma.id_application = a.id_application
      LEFT JOIN 
        grille_interpretation gi ON 
          gi.fonction = 'devsecops' AND 
          ma.score_global BETWEEN gi.score_min AND gi.score_max AND
          gi.niveau NOT LIKE '%-%'
    `);
    
    // Vue pour l'interprétation par thématique - maintenant plus générique
    await pool.query(`
      CREATE OR REPLACE VIEW vue_interpretation_thematiques AS
      SELECT 
        ts.id_analyse,
        ts.thematique,
        ts.score,
        gi.fonction,
        gi.niveau,
        gi.description,
        gi.recommandations
      FROM 
        thematique_scores ts
      JOIN
        maturity_analyses ma ON ts.id_analyse = ma.id_analyse  
      LEFT JOIN 
        grille_interpretation gi ON 
          gi.niveau LIKE CONCAT(ts.thematique, ' - %') AND
          ts.score BETWEEN gi.score_min AND gi.score_max
    `);
    
    console.log('Vues SQL créées avec succès.');
  } catch (error) {
    console.error('Erreur lors de la création des vues:', error);
    throw error;
  }
}

/**
 * Fonction principale qui exécute toutes les étapes
 */
async function seedGrilleInterpretation() {
  const connection = await pool.getConnection();
  
  try {
    // Début de la transaction
    await connection.beginTransaction();
    
    // 1. Créer les tables si elles n'existent pas
    await createGrilleInterpretationTable();
    await createFunctionsTable();
    await createThematiquesTable();
    
    // 2. S'assurer que toutes les colonnes existent
    await ensureTableColumnsExist();
    
    // 3. Nettoyer les données existantes
    await cleanExistingData();
    
    // 4. Insérer les fonctions
    await insertFonctions();
    
    // 5. Insérer les thématiques
    await insertThematiques();
    
    // 6. Insérer les niveaux globaux de maturité
    await insertAllGlobalMaturityLevels();
    
    // 7. Insérer les interprétations par thématique
    await insertThematicInterpretations();
    
    // 8. Créer les vues SQL
    await createViews();
    
    // Valider la transaction
    await connection.commit();
    console.log('Grille d\'interprétation créée et remplie avec succès !');
    
  } catch (error) {
    // Annuler la transaction en cas d'erreur
    await connection.rollback();
    console.error('Erreur lors de la création de la grille d\'interprétation:', error);
    throw error;
  } finally {
    // Libérer la connexion
    connection.release();
  }
}

/**
 * Exécution du script
 */
async function main() {
  try {
    console.log('Démarrage du script de création de la grille d\'interprétation...');
    await seedGrilleInterpretation();
    process.exit(0);
  } catch (error) {
    console.error('Échec du script:', error);
    process.exit(1);
  }
}

main();