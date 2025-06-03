// scripts/initialize-database.js
/**
 * Ce script initialise complètement la base de données en exécutant:
 * 1. Les commandes de création des tables et vues
 * 2. Les procédures stockées
 * 3. Les triggers
 * 4. Les données de référence
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

// Configuration de la base de données
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'maturity_assessment'
};

// Chemins des fichiers
const basePath = path.resolve(__dirname, '../src/db');
const tablesPath = path.join(basePath, 'schema-fixed.sql');
const procsPath = path.join(basePath, 'schema-fixed.sql');
const triggersPath = path.join(basePath, 'schema-fixed.sql');

/**
 * Divise le fichier de schéma en plusieurs parties
 */
async function splitSchema() {
  console.log('=== Division du schéma SQL ===');
  
  const schemaPath = path.join(basePath, 'schema-fixed.sql');
  
  if (!fs.existsSync(schemaPath)) {
    console.error(`Le fichier schema.sql n'existe pas à: ${schemaPath}`);
    throw new Error('Fichier schema.sql non trouvé');
  }
  
  try {
    execSync(`node ${path.join(__dirname, 'splitSQLSchema.js')} ${schemaPath}`, {
      stdio: 'inherit'
    });
    console.log('Schéma divisé avec succès.');
  } catch (error) {
    console.error('Erreur lors de la division du schéma:', error);
    throw new Error('Échec de la division du schéma');
  }
}

/**
 * Créer les tables et autres objets de base de données
 */
async function createTables() {
  console.log('\n=== Création des tables ===');
  
  if (!fs.existsSync(tablesPath)) {
    console.error(`Le fichier des tables n'existe pas: ${tablesPath}`);
    throw new Error('Fichier des tables non trouvé');
  }
  
  try {
    execSync(`npx ts-node scripts/update-database.ts --drop --skip-backup --raw-sql --schema=${tablesPath}`, {
      stdio: 'inherit'
    });
    console.log('Tables créées avec succès.');
  } catch (error) {
    console.error('Erreur lors de la création des tables:', error);
    throw new Error('Échec de la création des tables');
  }
}

/**
 * Exécuter un fichier SQL directement avec mysql
 */
async function executeSQL(filePath, description) {
  console.log(`\n=== Exécution de ${description} ===`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`Le fichier ${description} n'existe pas: ${filePath}`);
    throw new Error(`Fichier ${description} non trouvé`);
  }
  
  const connectionString = `mysql -h${dbConfig.host} -P${dbConfig.port} -u${dbConfig.user} ${dbConfig.password ? `-p${dbConfig.password}` : ''} ${dbConfig.database}`;
  
  try {
    execSync(`${connectionString} < ${filePath}`, {
      stdio: 'inherit',
      shell: true
    });
    console.log(`${description} exécuté(es) avec succès.`);
  } catch (error) {
    console.error(`Erreur lors de l'exécution des ${description}:`, error);
    
    // Plan B: Utiliser le connecteur Node.js
    console.log(`Tentative de connexion directe via node-mysql2...`);
    
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      // Diviser par ; pour exécuter chaque commande séparément
      const statements = fileContent.split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
      
      const connection = await mysql.createConnection(dbConfig);
      
      for (const stmt of statements) {
        try {
          await connection.query(stmt);
        } catch (stmtError) {
          console.error(`Erreur dans l'instruction:\n${stmt}\nErreur:`, stmtError);
        }
      }
      
      await connection.end();
      console.log(`${description} exécuté(es) avec succès via node-mysql2.`);
    } catch (directError) {
      console.error(`Échec également avec node-mysql2:`, directError);
      throw new Error(`Échec de l'exécution des ${description}`);
    }
  }
}

/**
 * Fonction principale
 */
async function main() {
  try {
    console.log('=== INITIALISATION DE LA BASE DE DONNÉES ===');
    console.log('Environnement:');
    console.log(`- Host: ${dbConfig.host}`);
    console.log(`- Database: ${dbConfig.database}`);
    console.log(`- User: ${dbConfig.user}`);
    
    // 1. Diviser le schéma SQL
    await splitSchema();
    
    // 2. Créer les tables
    await createTables();
    
    // 3. Exécuter les procédures stockées
    await executeSQL(procsPath, 'procédures stockées');
    
    // 4. Exécuter les triggers
    await executeSQL(triggersPath, 'triggers');
    
    // 5. Charger les données de référence avec seedGrilleInterpretation
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
    
    console.log('\n=== INITIALISATION TERMINÉE AVEC SUCCÈS ===');
  } catch (error) {
    console.error('\nERREUR CRITIQUE:', error);
    process.exit(1);
  }
}

main();