// migrate-maturity-model.js
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const { 
  MATURITY_MODEL, 
  NIVEAUX_THEMATIQUES 
} = require('../server/types/maturity-model');
require('dotenv').config();

// Configuration de la connexion
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'maturity_assessment',
  multipleStatements: true
};

async function migrateMaturityModel() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connexion à la base de données établie');
    
    // Démarrer une transaction
    await connection.beginTransaction();
    
    // 1. Migrer ou mettre à jour les fonctions
    console.log('Migration des fonctions...');
    for (const fonction of MATURITY_MODEL) {
      // Vérifier si la fonction existe déjà
      const [existing] = await connection.query(
        'SELECT id_fonction FROM fonctions WHERE nom = ?',
        [fonction.nom]
      );
      
      if (existing.length > 0) {
        // Mettre à jour la fonction existante
        await connection.query(
          'UPDATE fonctions SET description = ?, ordre = ? WHERE nom = ?',
          [fonction.description, fonction.ordre, fonction.nom]
        );
        fonction.db_id = existing[0].id_fonction;
        console.log(`Fonction mise à jour: ${fonction.nom}`);
      } else {
        // Créer une nouvelle fonction
        const id_fonction = uuidv4();
        await connection.query(
          'INSERT INTO fonctions (id_fonction, nom, description, ordre) VALUES (?, ?, ?, ?)',
          [id_fonction, fonction.nom, fonction.description, fonction.ordre]
        );
        fonction.db_id = id_fonction;
        console.log(`Fonction créée: ${fonction.nom}`);
      }
      
      // 2. Migrer les thématiques de cette fonction
      console.log(`Migration des thématiques pour ${fonction.nom}...`);
      const thematiqueMap = {};
      
      for (const thematique of fonction.thematiques) {
        const [existingThem] = await connection.query(
          'SELECT id_thematique FROM thematiques WHERE nom = ? AND id_fonction = ?',
          [thematique.nom, fonction.db_id]
        );
        
        if (existingThem.length > 0) {
          // Mettre à jour la thématique existante
          await connection.query(
            'UPDATE thematiques SET description = ?, nombre_questions = ?, ordre = ? WHERE id_thematique = ?',
            [thematique.description, thematique.nombreQuestions || 0, thematique.ordre || 0, existingThem[0].id_thematique]
          );
          thematiqueMap[thematique.nom] = existingThem[0].id_thematique;
          console.log(`  Thématique mise à jour: ${thematique.nom}`);
        } else {
          // Créer une nouvelle thématique
          const id_thematique = uuidv4();
          await connection.query(
            'INSERT INTO thematiques (id_thematique, nom, description, id_fonction, nombre_questions, ordre) VALUES (?, ?, ?, ?, ?, ?)',
            [id_thematique, thematique.nom, thematique.description, fonction.db_id, thematique.nombreQuestions || 0, thematique.ordre || 0]
          );
          thematiqueMap[thematique.nom] = id_thematique;
          console.log(`  Thématique créée: ${thematique.nom}`);
        }
      }
      
      // 3. Migrer les niveaux globaux de cette fonction
      console.log(`Migration des niveaux globaux pour ${fonction.nom}...`);
      
      // Supprimer les anciens niveaux pour éviter les doublons
      await connection.query(
        'DELETE FROM niveaux_globaux WHERE id_fonction = ?',
        [fonction.db_id]
      );
      
      for (let i = 0; i < fonction.niveauxGlobaux.length; i++) {
        const niveau = fonction.niveauxGlobaux[i];
        const id_niveau = uuidv4();
        
        await connection.query(
          'INSERT INTO niveaux_globaux (id_niveau, id_fonction, score_min, score_max, niveau, description, recommandations, ordre) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [id_niveau, fonction.db_id, niveau.score_min, niveau.score_max, niveau.niveau, niveau.description, niveau.recommandations, i + 1]
        );
        console.log(`  Niveau global créé: ${niveau.niveau}`);
      }
      
      // 4. Migrer les niveaux thématiques
      console.log(`Migration des niveaux thématiques pour ${fonction.nom}...`);
      
      // Supprimer les anciens niveaux thématiques
      await connection.query(
        'DELETE FROM niveaux_thematiques WHERE id_fonction = ?',
        [fonction.db_id]
      );
      
      // Filtrer les niveaux thématiques pour cette fonction
      const fonctionNiveauxThematiques = NIVEAUX_THEMATIQUES.filter(
        nt => nt.fonction === fonction.id || nt.fonction === fonction.nom
      );
      
      for (const niveauThem of fonctionNiveauxThematiques) {
        // Trouver l'id de la thématique correspondante
        const id_thematique = thematiqueMap[niveauThem.thematique];
        
        if (id_thematique) {
          const id_niveau = uuidv4();
          
          await connection.query(
            'INSERT INTO niveaux_thematiques (id_niveau, id_fonction, id_thematique, score_min, score_max, niveau, description, recommandations) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id_niveau, fonction.db_id, id_thematique, niveauThem.score_min, niveauThem.score_max, niveauThem.niveau, niveauThem.description, niveauThem.recommandations]
          );
          console.log(`  Niveau thématique créé: ${niveauThem.niveau}`);
        }
      }
    }
    
    // Valider la transaction
    await connection.commit();
    console.log('Migration terminée avec succès!');
    
    // Afficher les statistiques
    const [stats] = await connection.query(`
      SELECT 
        (SELECT COUNT(*) FROM fonctions) as nb_fonctions,
        (SELECT COUNT(*) FROM thematiques) as nb_thematiques,
        (SELECT COUNT(*) FROM niveaux_globaux) as nb_niveaux_globaux,
        (SELECT COUNT(*) FROM niveaux_thematiques) as nb_niveaux_thematiques
    `);
    
    console.log('\nStatistiques après migration:');
    console.log(`- Fonctions: ${stats[0].nb_fonctions}`);
    console.log(`- Thématiques: ${stats[0].nb_thematiques}`);
    console.log(`- Niveaux globaux: ${stats[0].nb_niveaux_globaux}`);
    console.log(`- Niveaux thématiques: ${stats[0].nb_niveaux_thematiques}`);
    
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Erreur lors de la migration:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Exécuter la migration
migrateMaturityModel();