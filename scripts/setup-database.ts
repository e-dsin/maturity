// scripts/setup-database.ts
import * as fs from 'fs';
import * as path from 'path';
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Configuration de la base de données
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  multipleStatements: true // Important pour exécuter plusieurs requêtes
};

// Fonction pour créer la base de données
async function createDatabase() {
  try {
    console.log('Tentative de connexion à MariaDB...');
    
    // Connexion sans spécifier de base de données
    const connection = await mysql.createConnection(dbConfig);
    
    const dbName = process.env.DB_NAME || 'maturity_assessment';
    
    console.log(`Création de la base de données ${dbName} si elle n'existe pas...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    
    console.log(`Utilisation de la base de données ${dbName}...`);
    await connection.query(`USE ${dbName}`);
    
    console.log('Lecture du script de schéma...');
    const schemaPath = process.env.SQL_SCHEMA_PATH || path.join(__dirname, '../src/db/schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Fichier de schéma non trouvé: ${schemaPath}`);
    }
    
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Définir un délimiteur personnalisé pour les procédures et triggers
    console.log('Exécution du script de schéma...');
    
    // Solution 1: Exécuter le script entier en une fois
    // Cependant, cela pourrait causer des problèmes avec les délimiteurs DELIMITER //
    // await connection.query(schemaSql);
    
    // Solution 2: Diviser le script et exécuter chaque requête séparément
    // Cette approche est plus robuste pour gérer les procédures stockées et les triggers
    const statements = splitSqlStatements(schemaSql);
    
    for (const stmt of statements) {
      try {
        if (stmt.trim()) {
          await connection.query(stmt);
        }
      } catch (err) {
        console.error('Erreur dans la requête SQL:', stmt);
        throw err;
      }
    }
    
    console.log('Base de données initialisée avec succès!');
    
    // Fermeture de la connexion
    await connection.end();
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la base de données:', error);
    process.exit(1);
  }
}

// Fonction pour diviser un script SQL en instructions individuelles
function splitSqlStatements(sql) {
  // Cette fonction divise le script SQL en gérant correctement les délimiteurs
  const statements = [];
  let currentStatement = '';
  let delimiter = ';';
  const lines = sql.split('\n');
  
  for (const line of lines) {
    // Traiter les changements de délimiteur
    if (line.trim().toUpperCase().startsWith('DELIMITER')) {
      // Ajouter l'instruction courante si elle existe
      if (currentStatement.trim()) {
        statements.push(currentStatement);
        currentStatement = '';
      }
      
      // Extraire le nouveau délimiteur
      const newDelimiter = line.trim().split(/\s+/)[1];
      if (newDelimiter === delimiter) {
        continue; // Ignorer si le délimiteur reste le même
      }
      
      delimiter = newDelimiter;
      statements.push(line); // Ajouter la ligne DELIMITER comme instruction
      continue;
    }
    
    // Vérifier si la ligne contient le délimiteur actuel
    if (line.trim().endsWith(delimiter)) {
      // Ajouter la ligne au statement courant
      currentStatement += line.substring(0, line.lastIndexOf(delimiter)) + ';';
      
      // Ajouter le statement à la liste et réinitialiser
      statements.push(currentStatement);
      currentStatement = '';
      
      // Si le délimiteur n'est pas le délimiteur par défaut, revenir au délimiteur par défaut
      if (delimiter !== ';') {
        delimiter = ';';
      }
    } else {
      // Ajouter la ligne au statement courant
      currentStatement += line + '\n';
    }
  }
  
  // Ajouter la dernière instruction si elle existe
  if (currentStatement.trim()) {
    statements.push(currentStatement);
  }
  
  return statements;
}

// Exécuter la fonction principale
createDatabase().catch(console.error);