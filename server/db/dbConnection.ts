// server/db/dbConnection.ts
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

// Configuration de la base de données
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '000000',
  database: process.env.DB_NAME || 'maturity_assessment',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Création du pool de connexions
export const pool = mysql.createPool(dbConfig);

// Fonction pour vérifier la connexion à la base de données
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Connexion à la base de données établie avec succès');
    connection.release();
    return true;
  } catch (error) {
    console.error('Erreur de connexion à la base de données:', error);
    return false;
  }
}

// Fonction pour initialiser la base de données
export async function initDatabase() {
  try {
    // Vérifier si les tables existent déjà
    const [rows] = await pool.query(`
      SELECT COUNT(table_name) as tableCount
      FROM information_schema.tables
      WHERE table_schema = ?
    `, [dbConfig.database]);
    
    const tableCount = (rows as any[])[0].tableCount;
    
    if (tableCount > 0) {
      console.log(`Base de données ${dbConfig.database} déjà initialisée avec ${tableCount} tables`);
      return true;
    }
    
    console.log(`Initialisation de la base de données ${dbConfig.database}...`);
    
    // Lecture et exécution du script de création de base de données
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(__dirname, '../db/schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      console.error(`Fichier de schéma non trouvé: ${schemaPath}`);
      return false;
    }
    
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    const queries = schemaSql.split(';').filter(query => query.trim() !== '');
    
    // Exécution de chaque requête séparément
    for (const query of queries) {
      await pool.query(query);
    }
    
    console.log('Initialisation de la base de données terminée avec succès');
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la base de données:', error);
    return false;
  }
}

export default {
  pool,
  testConnection,
  initDatabase
};