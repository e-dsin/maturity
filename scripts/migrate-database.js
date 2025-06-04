// scripts/migrate-database.js
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function migrateDatabase() {
  const environment = process.env.ENVIRONMENT || 'dev';
  
  console.log(`🗄️ Migration de la base de données pour ${environment}...`);

  // Configuration de connexion
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });

  try {
    // Lire le fichier de schéma
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');

    console.log('📋 Exécution du schéma de base de données...');
    
    // Diviser le schéma en commandes individuelles
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        await connection.execute(statement);
      }
    }

    console.log('✅ Migration terminée avec succès!');
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrateDatabase();