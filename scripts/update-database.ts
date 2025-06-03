// scripts/update-database-strict.ts
import * as fs from 'fs';
import * as path from 'path';
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { promisify } from 'util';
import { exec } from 'child_process';

// Promisifier exec pour l'utiliser avec async/await
const execPromise = promisify(exec);

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

// Options de configuration
const options = {
  schemaPath: process.env.SQL_SCHEMA_PATH || path.join(__dirname, '../src/db/schema.sql'),
  dropDatabase: process.argv.includes('--drop') || false,
  backupDatabase: process.argv.includes('--backup') || process.argv.includes('--drop') || false,
  forceUpdate: process.argv.includes('--force') || false,
  skipBackup: process.argv.includes('--skip-backup') || false,
  debug: process.argv.includes('--debug') || false,
  useRawSql: process.argv.includes('--raw-sql') || false
};

// Fonction pour créer ou mettre à jour la base de données
async function setupDatabase() {
  let connection;
  try {
    console.log('Tentative de connexion à MariaDB...');
    
    // Connexion sans spécifier de base de données
    connection = await mysql.createConnection(dbConfig);
    
    const dbName = process.env.DB_NAME || 'maturity_assessment';
    
    // Vérifier si la base de données existe
    const [rows] = await connection.query(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
      [dbName]
    );
    
    const dbExists = (rows as any[]).length > 0;
    
    // Créer une sauvegarde si demandé et si la BD existe
    if (options.backupDatabase && dbExists && !options.skipBackup) {
      try {
        await backupDatabase(connection, dbName);
      } catch (backupError) {
        console.error('Erreur lors de la sauvegarde, mais le processus continue:', backupError);
        // Continuer même si la sauvegarde échoue
      }
    }
    
    // Supprimer la base de données si demandé
    if (options.dropDatabase && dbExists) {
      console.log(`Suppression de la base de données ${dbName}...`);
      await connection.query(`DROP DATABASE ${dbName}`);
      console.log(`Base de données ${dbName} supprimée.`);
    }
    
    // Créer la base de données si elle n'existe pas ou a été supprimée
    if (!dbExists || options.dropDatabase) {
      console.log(`Création de la base de données ${dbName}...`);
      await connection.query(`CREATE DATABASE ${dbName}`);
      console.log(`Base de données ${dbName} créée.`);
    } else {
      console.log(`La base de données ${dbName} existe déjà.`);
      if (!options.forceUpdate) {
        console.log('Utilisez --force pour mettre à jour une base de données existante.');
        console.log('Utilisez --drop pour supprimer et recréer la base de données.');
        console.log('Utilisez --backup pour sauvegarder la base de données avant modification.');
        console.log('Utilisez --skip-backup pour ignorer la sauvegarde.');
        console.log('Utilisez --debug pour afficher les requêtes SQL avant de les exécuter.');
        console.log('Utilisez --raw-sql pour exécuter le fichier SQL sans le découper.');
        return;
      }
    }
    
    console.log(`Utilisation de la base de données ${dbName}...`);
    await connection.query(`USE ${dbName}`);
    
    console.log('Lecture du script de schéma...');
    if (!fs.existsSync(options.schemaPath)) {
      throw new Error(`Fichier de schéma non trouvé: ${options.schemaPath}`);
    }
    
    const schemaSql = fs.readFileSync(options.schemaPath, 'utf8');
    
    // Si on est en mode update (sans drop), on va supprimer les objets existants
    if (dbExists && options.forceUpdate && !options.dropDatabase) {
      console.log('Suppression des objets existants pour mise à jour...');
      await dropExistingObjects(connection, dbName);
    }
    
    console.log('Exécution du script de schéma...');
    
    if (options.useRawSql) {
      // Mode d'exécution brut sans découpage
      console.log('Exécution du script SQL complet sans découpage...');
      try {
        await connection.query(schemaSql);
        console.log('Script SQL exécuté avec succès!');
      } catch (err: any) {
        console.error('Erreur lors de l\'exécution du script SQL complet:', err.message);
        throw err;
      }
    } else {
      // Mode d'exécution par morceaux
      // Méthode 1: Exécuter manuellement les instructions de création de tables
      await executeSchemaInParts(connection, schemaSql, dbName);
    }
    
    console.log('Base de données mise à jour avec succès!');
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la base de données:', error);
    process.exit(1);
  } finally {
    // Fermeture de la connexion
    if (connection) {
      await connection.end();
    }
  }
}

// Fonction pour exécuter le schéma en parties spécifiques
async function executeSchemaInParts(connection: mysql.Connection, schemaSql: string, dbName: string): Promise<void> {
  try {
    // Étape 1: Extraire toutes les créations de tables
    const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?\s*\(([\s\S]*?)(?:ENGINE=|;\s*$)/gi;
    let match;
    const tableScripts = [];
    
    while ((match = tableRegex.exec(schemaSql)) !== null) {
      const tableName = match[1];
      let tableScript = match[0];
      
      // S'assurer que le script se termine par un ;
      if (!tableScript.trim().endsWith(';')) {
        tableScript = tableScript.trim() + ';';
      }
      
      tableScripts.push({
        name: tableName,
        script: tableScript
      });
    }
    
    // Étape 2: Créer les tables dans l'ordre
    console.log(`Création de ${tableScripts.length} tables...`);
    
    for (const table of tableScripts) {
      if (options.debug) {
        console.log(`Création de la table ${table.name}...`);
        console.log(table.script.substring(0, 100) + '...');
      }
      
      try {
        await connection.query(table.script);
        console.log(`Table ${table.name} créée avec succès.`);
      } catch (err: any) {
        console.error(`Erreur lors de la création de la table ${table.name}:`, err.message);
        if (!options.forceUpdate) {
          throw err;
        }
      }
    }
    
    // Étape 3: Extraire et créer les vues
    const viewRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+`?(\w+)`?\s+AS([\s\S]*?);/gi;
    const viewScripts = [];
    
    while ((match = viewRegex.exec(schemaSql)) !== null) {
      const viewName = match[1];
      const viewScript = match[0];
      
      viewScripts.push({
        name: viewName,
        script: viewScript
      });
    }
    
    console.log(`Création de ${viewScripts.length} vues...`);
    
    for (const view of viewScripts) {
      if (options.debug) {
        console.log(`Création de la vue ${view.name}...`);
        console.log(view.script.substring(0, 100) + '...');
      }
      
      try {
        await connection.query(view.script);
        console.log(`Vue ${view.name} créée avec succès.`);
      } catch (err: any) {
        console.error(`Erreur lors de la création de la vue ${view.name}:`, err.message);
        if (!options.forceUpdate) {
          throw err;
        }
      }
    }
    
    // Étape 4: Extraire et créer les procédures stockées
    const procRegex = /CREATE\s+PROCEDURE\s+`?(\w+)`?\s*\(([\s\S]*?)END;/gi;
    const procScripts = [];
    
    while ((match = procRegex.exec(schemaSql)) !== null) {
      const procName = match[1];
      const procScript = match[0];
      
      procScripts.push({
        name: procName,
        script: procScript
      });
    }
    
    console.log(`Création de ${procScripts.length} procédures stockées...`);
    
    for (const proc of procScripts) {
      if (options.debug) {
        console.log(`Création de la procédure ${proc.name}...`);
        console.log(proc.script.substring(0, 100) + '...');
      }
      
      try {
        await connection.query(proc.script);
        console.log(`Procédure ${proc.name} créée avec succès.`);
      } catch (err: any) {
        console.error(`Erreur lors de la création de la procédure ${proc.name}:`, err.message);
        if (!options.forceUpdate) {
          throw err;
        }
      }
    }
    
    // Étape 5: Extraire et créer les triggers
    const triggerRegex = /CREATE\s+TRIGGER\s+`?(\w+)`?\s+([\s\S]*?)END;/gi;
    const triggerScripts = [];
    
    while ((match = triggerRegex.exec(schemaSql)) !== null) {
      const triggerName = match[1];
      const triggerScript = match[0];
      
      triggerScripts.push({
        name: triggerName,
        script: triggerScript
      });
    }
    
    console.log(`Création de ${triggerScripts.length} triggers...`);
    
    for (const trigger of triggerScripts) {
      if (options.debug) {
        console.log(`Création du trigger ${trigger.name}...`);
        console.log(trigger.script.substring(0, 100) + '...');
      }
      
      try {
        await connection.query(trigger.script);
        console.log(`Trigger ${trigger.name} créé avec succès.`);
      } catch (err: any) {
        console.error(`Erreur lors de la création du trigger ${trigger.name}:`, err.message);
        if (!options.forceUpdate) {
          throw err;
        }
      }
    }
  } catch (error) {
    console.error('Erreur lors de l\'exécution du schéma par parties:', error);
    throw error;
  }
}

// Fonction pour faire une sauvegarde de la base de données
async function backupDatabase(connection: mysql.Connection, dbName: string) {
  try {
    console.log(`Sauvegarde de la base de données ${dbName}...`);
    
    // Créer un répertoire de sauvegarde s'il n'existe pas
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Générer un nom de fichier avec la date et l'heure
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `${dbName}_${timestamp}.sql`);
    
    try {
      // Construire la commande mysqldump
      const mysqldumpCmd = [
        'mysqldump',
        `--host=${dbConfig.host}`,
        `--port=${dbConfig.port}`,
        `--user=${dbConfig.user}`,
        dbConfig.password ? `--password=${dbConfig.password}` : '',
        '--routines',
        '--triggers',
        '--events',
        dbName,
        `> "${backupFile}"`
      ].filter(Boolean).join(' ');
      
      // Exécuter la commande
      const { stderr } = await execPromise(mysqldumpCmd);
      
      if (stderr && stderr.trim()) {
        console.warn('Avertissement lors de la sauvegarde:', stderr);
      }
      
      console.log(`Base de données sauvegardée dans ${backupFile}`);
      return backupFile;
    } catch (error: any) {
      // Si mysqldump n'est pas disponible, utiliser une méthode alternative
      if (error.message && (error.message.includes('n\'est pas reconnu') || 
                            error.message.includes('not recognized') ||
                            error.message.includes('command not found'))) {
        console.warn('La commande mysqldump n\'est pas disponible sur ce système.');
        console.warn('Sauvegarde manuelle via le script SQL...');
        
        // Méthode alternative
        return await createManualBackup(connection, dbName, backupFile);
      } else {
        // Autre erreur
        throw error;
      }
    }
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la base de données:', error);
    console.log('La sauvegarde a échoué, mais le processus va continuer...');
    return null;
  }
}

// Fonction pour créer une sauvegarde manuelle
async function createManualBackup(connection: mysql.Connection, dbName: string, backupFile: string): Promise<string> {
  // Méthode alternative : créer un script SQL qui exporte la structure
  let backupContent = `-- Sauvegarde manuelle de la base de données ${dbName}\n`;
  backupContent += `-- Date: ${new Date().toISOString()}\n\n`;
  
  // Créer une base de données avec le même nom
  backupContent += `CREATE DATABASE IF NOT EXISTS ${dbName};\n`;
  backupContent += `USE ${dbName};\n\n`;
  
  // Exporter la liste des tables
  const [tables] = await connection.query(
    `SELECT table_name FROM information_schema.tables 
     WHERE table_schema = ? AND table_type = 'BASE TABLE'`, 
    [dbName]
  );
  
  // Pour chaque table, exporter sa structure
  for (const table of (tables as any[])) {
    const tableName = table.table_name;
    
    // Obtenir la structure de la table
    const [showCreate] = await connection.query(`SHOW CREATE TABLE ${tableName}`);
    if ((showCreate as any[]).length > 0) {
      const createStatement = (showCreate as any[])[0]['Create Table'];
      backupContent += `DROP TABLE IF EXISTS ${tableName};\n`;
      backupContent += `${createStatement};\n\n`;
    }
  }
  
  // Exporter la liste des vues
  const [views] = await connection.query(
    `SELECT table_name FROM information_schema.views 
     WHERE table_schema = ?`, 
    [dbName]
  );
  
  // Pour chaque vue, exporter sa structure
  for (const view of (views as any[])) {
    const viewName = view.table_name;
    
    // Obtenir la structure de la vue
    const [showCreate] = await connection.query(`SHOW CREATE VIEW ${viewName}`);
    if ((showCreate as any[]).length > 0) {
      const createStatement = (showCreate as any[])[0]['Create View'];
      backupContent += `DROP VIEW IF EXISTS ${viewName};\n`;
      backupContent += `${createStatement};\n\n`;
    }
  }
  
  // Exporter la liste des procédures stockées
  const [procedures] = await connection.query(
    `SELECT routine_name FROM information_schema.routines 
     WHERE routine_schema = ? AND routine_type = 'PROCEDURE'`, 
    [dbName]
  );
  
  // Pour chaque procédure, exporter sa structure
  for (const proc of (procedures as any[])) {
    const procName = proc.routine_name;
    
    // Obtenir la structure de la procédure
    const [showCreate] = await connection.query(`SHOW CREATE PROCEDURE ${procName}`);
    if ((showCreate as any[]).length > 0) {
      const createStatement = (showCreate as any[])[0]['Create Procedure'];
      backupContent += `DROP PROCEDURE IF EXISTS ${procName};\n`;
      backupContent += `${createStatement};\n\n`;
    }
  }
  
  // Exporter la liste des triggers
  const [triggers] = await connection.query(
    `SELECT trigger_name FROM information_schema.triggers 
     WHERE trigger_schema = ?`, 
    [dbName]
  );
  
  // Pour chaque trigger, exporter sa structure
  for (const trigger of (triggers as any[])) {
    const triggerName = trigger.trigger_name;
    
    // Obtenir la structure du trigger
    const [showCreate] = await connection.query(`SHOW CREATE TRIGGER ${triggerName}`);
    if ((showCreate as any[]).length > 0) {
      const createStatement = (showCreate as any[])[0]['SQL Original Statement'];
      backupContent += `DROP TRIGGER IF EXISTS ${triggerName};\n`;
      backupContent += `${createStatement};\n\n`;
    }
  }
  
  // Écrire le fichier de sauvegarde
  fs.writeFileSync(backupFile, backupContent);
  
  console.log(`Base de données sauvegardée manuellement dans ${backupFile}`);
  console.log('Note: Cette sauvegarde contient uniquement la structure, pas les données.');
  return backupFile;
}

// Fonction pour supprimer les objets existants dans la base de données
async function dropExistingObjects(connection: mysql.Connection, dbName: string) {
  try {
    // Désactiver les contraintes de clés étrangères
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // 1. Supprimer les vues
    const [views] = await connection.query(
      `SELECT table_name 
       FROM information_schema.views 
       WHERE table_schema = ?`, 
      [dbName]
    );
    
    for (const view of (views as any[])) {
      await connection.query(`DROP VIEW IF EXISTS ${view.table_name}`);
      console.log(`Vue ${view.table_name} supprimée.`);
    }
    
    // 2. Supprimer les procédures stockées
    const [procedures] = await connection.query(
      `SELECT routine_name 
       FROM information_schema.routines 
       WHERE routine_schema = ? AND routine_type = 'PROCEDURE'`, 
      [dbName]
    );
    
    for (const proc of (procedures as any[])) {
      await connection.query(`DROP PROCEDURE IF EXISTS ${proc.routine_name}`);
      console.log(`Procédure ${proc.routine_name} supprimée.`);
    }
    
    // 3. Supprimer les triggers
    const [triggers] = await connection.query(
      `SELECT trigger_name 
       FROM information_schema.triggers 
       WHERE trigger_schema = ?`, 
      [dbName]
    );
    
    for (const trigger of (triggers as any[])) {
      await connection.query(`DROP TRIGGER IF EXISTS ${trigger.trigger_name}`);
      console.log(`Trigger ${trigger.trigger_name} supprimé.`);
    }
    
    // 4. Supprimer les tables
    const [tables] = await connection.query(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = ? AND table_type = 'BASE TABLE'`, 
      [dbName]
    );
    
    for (const table of (tables as any[])) {
      await connection.query(`DROP TABLE IF EXISTS ${table.table_name}`);
      console.log(`Table ${table.table_name} supprimée.`);
    }
    
    // Réactiver les contraintes de clés étrangères
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('Tous les objets existants ont été supprimés.');
  } catch (error) {
    console.error('Erreur lors de la suppression des objets existants:', error);
    throw error;
  }
}

// Exécuter la fonction principale
setupDatabase().catch(console.error);