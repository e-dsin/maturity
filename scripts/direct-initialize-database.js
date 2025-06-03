// scripts/direct-initialize-database.js
/**
 * Script d'initialisation direct qui n'utilise pas update-database.ts
 * Exécute directement les requêtes SQL via le connecteur mysql2
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const { execSync } = require('child_process');

dotenv.config();

// Configuration de la base de données
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD
};

// Nom de la base de données
const dbName = process.env.DB_NAME || 'maturity_assessment';

// Chemins des fichiers
const basePath = path.resolve(__dirname, '../src/db');
const schemaPath = path.join(basePath, 'schema.sql');
const splitScriptPath = path.join(__dirname, 'splitSQLSchema.js');

// Vérifier si le script de découpage existe et le créer si nécessaire
function ensureSplitScriptExists() {
  if (!fs.existsSync(splitScriptPath)) {
    console.log(`Le script splitSQLSchema.js n'existe pas. Création...`);
    
    const scriptContent = `/**
 * Script pour diviser le fichier schema.sql en plusieurs fichiers:
 * - schema-tables.sql: Contient les tables, index, et vues
 * - schema-procedures.sql: Contient les procédures stockées
 * - schema-triggers.sql: Contient les triggers
 */
const fs = require('fs');
const path = require('path');

// Chemin du fichier schema.sql
const schemaPath = process.argv[2] || path.join(__dirname, '../src/db/schema.sql');
const baseDir = path.dirname(schemaPath);
const baseName = path.basename(schemaPath, '.sql');

// Chemins des fichiers de sortie
const tablesPath = path.join(baseDir, \`\${baseName}-tables.sql\`);
const procsPath = path.join(baseDir, \`\${baseName}-procedures.sql\`);
const triggersPath = path.join(baseDir, \`\${baseName}-triggers.sql\`);

// Lire le fichier
console.log(\`Lecture du fichier: \${schemaPath}\`);
let schemaContent = fs.readFileSync(schemaPath, 'utf8');

// Extraire les différentes parties du schéma
console.log('Extraction des composants du schéma...');

// 1. Extraire les procédures stockées
const procedures = [];
const procedureRegex = /DELIMITER\\s*\\/\\/\\s*(CREATE\\s+PROCEDURE\\s+.*?END\\s*\\/\\/)/gs;
let match;

while ((match = procedureRegex.exec(schemaContent)) !== null) {
  // Nettoyer la procédure et remplacer // par ;
  let cleanProc = match[1].replace(/END\\s*\\/\\//g, 'END;');
  procedures.push(cleanProc);
  
  // Retirer la procédure du schéma original
  schemaContent = schemaContent.replace(match[0], '-- PROCEDURE EXTRACTED');
}

// 2. Extraire les triggers
const triggers = [];
const triggerRegex = /DELIMITER\\s*\\/\\/\\s*(CREATE\\s+TRIGGER\\s+.*?END\\s*\\/\\/)/gs;

while ((match = triggerRegex.exec(schemaContent)) !== null) {
  // Nettoyer le trigger et remplacer // par ;
  let cleanTrigger = match[1].replace(/END\\s*\\/\\//g, 'END;');
  triggers.push(cleanTrigger);
  
  // Retirer le trigger du schéma original
  schemaContent = schemaContent.replace(match[0], '-- TRIGGER EXTRACTED');
}

// 3. Nettoyer le schéma des tables
let tablesContent = schemaContent.replace(/--\\s*(PROCEDURE|TRIGGER)\\s*EXTRACTED\\s*\\n/g, '');
// Supprimer aussi les DELIMITER ; restants
tablesContent = tablesContent.replace(/DELIMITER\\s*;/g, '');

// 4. Écrire les fichiers
console.log(\`Écriture des tables dans: \${tablesPath}\`);
fs.writeFileSync(tablesPath, tablesContent.trim());

console.log(\`Écriture des \${procedures.length} procédures dans: \${procsPath}\`);
fs.writeFileSync(procsPath, procedures.join('\\n\\n'));

console.log(\`Écriture des \${triggers.length} triggers dans: \${triggersPath}\`);
fs.writeFileSync(triggersPath, triggers.join('\\n\\n'));

console.log('Terminé!');`;
    
    fs.writeFileSync(splitScriptPath, scriptContent);
    console.log(`Script splitSQLSchema.js créé avec succès.`);
  }
}

/**
 * Diviser le fichier schema.sql en plusieurs parties
 */
async function splitSchema() {
  console.log('=== Division du schéma SQL ===');
  
  // S'assurer que le script de découpage existe
  ensureSplitScriptExists();
  
  if (!fs.existsSync(schemaPath)) {
    console.error(`Le fichier schema.sql n'existe pas à: ${schemaPath}`);
    throw new Error('Fichier schema.sql non trouvé');
  }
  
  try {
    execSync(`node ${splitScriptPath} ${schemaPath}`, {
      stdio: 'inherit'
    });
    console.log('Schéma divisé avec succès.');
  } catch (error) {
    console.error('Erreur lors de la division du schéma:', error);
    throw new Error('Échec de la division du schéma');
  }
  
  // Retourner les chemins des fichiers générés
  return {
    tablesPath: path.join(basePath, 'schema-tables.sql'),
    procsPath: path.join(basePath, 'schema-procedures.sql'),
    triggersPath: path.join(basePath, 'schema-triggers.sql')
  };
}

/**
 * Créer et initialiser la base de données
 */
async function initializeDatabase(paths) {
  console.log('\n=== Initialisation de la base de données ===');
  
  let connection;
  try {
    // 1. Créer une connexion sans spécifier de base de données
    console.log('Connexion au serveur MySQL...');
    connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password
    });
    
    // 2. Supprimer la base de données si elle existe
    console.log(`Suppression de la base de données ${dbName} si elle existe...`);
    await connection.query(`DROP DATABASE IF EXISTS ${dbName}`);
    
    // 3. Créer la base de données
    console.log(`Création de la base de données ${dbName}...`);
    await connection.query(`CREATE DATABASE ${dbName}`);
    
    // 4. Utiliser la base de données
    console.log(`Utilisation de la base de données ${dbName}...`);
    await connection.query(`USE ${dbName}`);
    
    // 5. Lire et exécuter le fichier des tables
    console.log('Exécution du script des tables...');
    const tablesContent = fs.readFileSync(paths.tablesPath, 'utf8');
    
    // Diviser par ; pour exécuter chaque commande séparément
    const statements = tablesContent.split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    for (const stmt of statements) {
      try {
        await connection.query(stmt);
      } catch (error) {
        console.error(`Erreur lors de l'exécution de la requête:\n${stmt.substring(0, 100)}...\nErreur:`, error);
        // Continue malgré l'erreur
      }
    }
    
    // 6. Exécuter les procédures stockées
    console.log('\n=== Exécution des procédures stockées ===');
    if (fs.existsSync(paths.procsPath)) {
      const procsContent = fs.readFileSync(paths.procsPath, 'utf8');
      const procs = procsContent.split(';')
        .map(proc => proc.trim())
        .filter(proc => proc.length > 0);
      
      for (const proc of procs) {
        try {
          await connection.query(`${proc}`);
          console.log(`Procédure créée avec succès.`);
        } catch (error) {
          console.error(`Erreur lors de la création de la procédure:\n${proc.substring(0, 100)}...\nErreur:`, error);
          // Continue malgré l'erreur
        }
      }
    }
    
    // 7. Exécuter les triggers
    console.log('\n=== Exécution des triggers ===');
    if (fs.existsSync(paths.triggersPath)) {
      const triggersContent = fs.readFileSync(paths.triggersPath, 'utf8');
      const triggers = triggersContent.split(';')
        .map(trigger => trigger.trim())
        .filter(trigger => trigger.length > 0);
      
      for (const trigger of triggers) {
        try {
          await connection.query(`${trigger}`);
          console.log(`Trigger créé avec succès.`);
        } catch (error) {
          console.error(`Erreur lors de la création du trigger:\n${trigger.substring(0, 100)}...\nErreur:`, error);
          // Continue malgré l'erreur
        }
      }
    }
    
    console.log('\nBase de données initialisée avec succès !');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la base de données:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Charger les données de référence
 */
async function loadReferenceData() {
  console.log('\n=== Chargement des données de référence ===');
  
  try {
    execSync('npx ts-node scripts/seedGrilleInterpretation-fixed.ts', {
      stdio: 'inherit'
    });
    console.log('Données de référence chargées avec succès.');
  } catch (error) {
    console.error('Erreur lors du chargement des données de référence:', error);
    throw new Error('Échec du chargement des données de référence');
  }
}

/**
 * Fonction principale
 */
async function main() {
  try {
    console.log('=== INITIALISATION DIRECTE DE LA BASE DE DONNÉES ===');
    console.log('Environnement:');
    console.log(`- Host: ${dbConfig.host}`);
    console.log(`- Database: ${dbName}`);
    console.log(`- User: ${dbConfig.user}`);
    
    // 1. Diviser le schéma SQL
    const paths = await splitSchema();
    
    // 2. Initialiser la base de données
    await initializeDatabase(paths);
    
    // 3. Charger les données de référence
    await loadReferenceData();
    
    console.log('\n=== INITIALISATION TERMINÉE AVEC SUCCÈS ===');
  } catch (error) {
    console.error('\nERREUR CRITIQUE:', error);
    process.exit(1);
  }
}

// Exécuter le script
main();