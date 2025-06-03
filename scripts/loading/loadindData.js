const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Charger les variables d'environnement du fichier .env
dotenv.config();

// Configuration des options de ligne de commande
const argv = yargs(hideBin(process.argv))
  .option('action', {
    type: 'string',
    description: 'Action à exécuter: insert (pour l\'insertion des données), calculate (pour le calcul des scores), both (les deux)',
    demandOption: true,
    choices: ['insert', 'calculate', 'both']
  })
  .help()
  .argv;

// Configuration de la connexion à la base de données à partir des variables d'environnement
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'maturity_assessment',
  multipleStatements: true
};

// Chemins des scripts SQL - adaptez les chemins selon votre structure de projet
const insertScriptPath = path.join(__dirname, './insert_data_script.sql');
const calculateScriptPath = path.join(__dirname, './calculate_scores_script.sql');

// Fonction pour lire un fichier SQL
async function readSqlFile(filePath) {
  try {
    return await fs.promises.readFile(filePath, 'utf8');
  } catch (err) {
    console.error(`Erreur lors de la lecture du fichier ${filePath}:`, err);
    throw err;
  }
}

// Fonction pour exécuter un script SQL
async function executeSqlScript(connection, sql, scriptName) {
  console.log(`Exécution du script ${scriptName}...`);
  try {
    const startTime = Date.now();
    const [results] = await connection.query(sql);
    const endTime = Date.now();
    console.log(`Script ${scriptName} exécuté avec succès en ${(endTime - startTime) / 1000} secondes.`);
    return results;
  } catch (err) {
    console.error(`Erreur lors de l'exécution du script ${scriptName}:`, err);
    throw err;
  }
}

// Fonction principale
async function main() {
  let connection;
  try {
    // Connexion à la base de données
    console.log(`Connexion à la base de données MySQL ${dbConfig.database} sur ${dbConfig.host}:${dbConfig.port}...`);
    connection = await mysql.createConnection(dbConfig);
    console.log('Connecté avec succès.');

    // Exécution des scripts selon l'option choisie
    if (argv.action === 'insert' || argv.action === 'both') {
      const insertSql = await readSqlFile(insertScriptPath);
      await executeSqlScript(connection, insertSql, 'insert_data');
    }

    if (argv.action === 'calculate' || argv.action === 'both') {
      const calculateSql = await readSqlFile(calculateScriptPath);
      await executeSqlScript(connection, calculateSql, 'calculate_scores');
    }

  } catch (err) {
    console.error('Une erreur est survenue:', err);
    process.exit(1);
  } finally {
    // Fermeture de la connexion
    if (connection) {
      console.log('Fermeture de la connexion à la base de données...');
      await connection.end();
      console.log('Connexion fermée.');
    }
  }
}

// Exécution de la fonction principale
main().catch(err => {
  console.error('Erreur non gérée:', err);
  process.exit(1);
});