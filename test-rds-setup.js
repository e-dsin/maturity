// test-rds-setup.js
// Script pour tester la configuration RDS complète

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config();

console.log('🧪 ===============================================');
console.log('   TEST DE CONFIGURATION RDS COMPLETE');
console.log('===============================================');

// Configuration à tester
const CONFIG = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL_DISABLED === 'true' ? false : {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true'
  },
  charset: 'utf8mb4',
  timezone: '+00:00'
};

async function testConfiguration() {
  console.log('\n📋 VERIFICATION DE LA CONFIGURATION:');
  console.log('=====================================');
  
  // Vérifier les variables d'environnement
  const requiredVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  let configOK = true;
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      console.log(`❌ ${varName}: MANQUANT`);
      configOK = false;
    } else {
      console.log(`✅ ${varName}: ${'*'.repeat(Math.min(value.length, 20))}`);
    }
  });
  
  console.log(`✅ DB_PORT: ${CONFIG.port}`);
  console.log(`✅ SSL: ${CONFIG.ssl ? 'Activé' : 'Désactivé'}`);
  if (CONFIG.ssl && typeof CONFIG.ssl === 'object') {
    console.log(`   - rejectUnauthorized: ${CONFIG.ssl.rejectUnauthorized}`);
  }
  
  if (!configOK) {
    console.log('\n❌ Configuration incomplète. Vérifiez votre fichier .env');
    process.exit(1);
  }
  
  return true;
}

async function testConnection() {
  console.log('\n🔌 TEST DE CONNEXION:');
  console.log('=====================');
  
  let connection = null;
  
  try {
    console.log('⏳ Connexion à RDS...');
    connection = await mysql.createConnection(CONFIG);
    console.log('✅ Connexion établie !');
    
    // Test 1: Requête de base
    console.log('\n🧪 Test 1: Requête de base');
    const [basicResult] = await connection.execute('SELECT 1 as test, NOW() as time, VERSION() as version, CONNECTION_ID() as conn_id');
    console.log(`   ✅ Test: ${basicResult[0].test}`);
    console.log(`   ✅ Time: ${basicResult[0].time}`);
    console.log(`   ✅ Version: ${basicResult[0].version}`);
    console.log(`   ✅ Connection ID: ${basicResult[0].conn_id}`);
    
    // Test 2: Vérifier la base de données
    console.log('\n🧪 Test 2: Accès à la base de données');
    await connection.execute(`USE ${CONFIG.database}`);
    console.log(`   ✅ Base "${CONFIG.database}" accessible`);
    
    // Test 3: Lister les tables
    console.log('\n🧪 Test 3: Inventaire des tables');
    const [tables] = await connection.execute('SHOW TABLES');
    
    if (tables.length === 0) {
      console.log('   ⚠️  Aucune table trouvée (base vide)');
    } else {
      console.log(`   ✅ ${tables.length} tables trouvées:`);
      tables.forEach(table => {
        const tableName = Object.values(table)[0];
        console.log(`      - ${tableName}`);
      });
    }
    
    // Test 4: Vérifier les tables principales
    console.log('\n🧪 Test 4: Tables principales de l\'application');
    const mainTables = ['entreprises', 'acteurs', 'applications', 'questionnaires', 'fonctions', 'thematiques'];
    
    for (const tableName of mainTables) {
      try {
        const [count] = await connection.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`   ✅ ${tableName}: ${count[0].count} enregistrements`);
      } catch (error) {
        console.log(`   ❌ ${tableName}: ${error.message}`);
      }
    }
    
    // Test 5: Test d'écriture (table temporaire)
    console.log('\n🧪 Test 5: Test d\'écriture');
    try {
      await connection.execute(`
        CREATE TEMPORARY TABLE test_rds_setup (
          id INT AUTO_INCREMENT PRIMARY KEY,
          test_value VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await connection.execute(
        'INSERT INTO test_rds_setup (test_value) VALUES (?)',
        ['Test RDS Setup - ' + new Date().toISOString()]
      );
      
      const [writeResult] = await connection.execute('SELECT * FROM test_rds_setup');
      console.log(`   ✅ Écriture réussie: ${writeResult[0].test_value}`);
      
    } catch (error) {
      console.log(`   ❌ Test d'écriture échoué: ${error.message}`);
    }
    
    console.log('\n🎉 TOUS LES TESTS DE CONNEXION RÉUSSIS !');
    return true;
    
  } catch (error) {
    console.log(`\n❌ ERREUR DE CONNEXION:`);
    console.log(`   Message: ${error.message}`);
    console.log(`   Code: ${error.code}`);
    
    // Diagnostics
    console.log('\n💡 DIAGNOSTICS:');
    if (error.code === 'ENOTFOUND') {
      console.log('   ❌ Problème DNS - Vérifiez DB_HOST');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('   ❌ Connexion refusée - Vérifiez les Security Groups AWS');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('   ❌ Accès refusé - Vérifiez DB_USER et DB_PASSWORD');
    } else if (error.message.includes('SSL')) {
      console.log('   ❌ Problème SSL - Essayez avec DB_SSL_DISABLED=true');
    }
    
    return false;
    
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connexion fermée');
    }
  }
}

async function testPool() {
  console.log('\n🏊 TEST DU POOL DE CONNEXIONS:');
  console.log('==============================');
  
  let pool = null;
  
  try {
    // Configuration du pool
    const poolConfig = {
      ...CONFIG,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0
    };
    
    console.log('⏳ Création du pool de connexions...');
    pool = mysql.createPool(poolConfig);
    console.log('✅ Pool créé');
    
    // Test de connexions multiples
    console.log('\n🧪 Test de connexions simultanées...');
    const promises = [];
    
    for (let i = 1; i <= 3; i++) {
      promises.push(
        pool.execute('SELECT ? as connection_num, CONNECTION_ID() as conn_id', [i])
      );
    }
    
    const results = await Promise.all(promises);
    
    results.forEach(([rows], index) => {
      console.log(`   ✅ Connexion ${index + 1}: ID ${rows[0].conn_id}`);
    });
    
    console.log('\n🎉 POOL DE CONNEXIONS FONCTIONNEL !');
    return true;
    
  } catch (error) {
    console.log(`\n❌ ERREUR POOL:`);
    console.log(`   ${error.message}`);
    return false;
    
  } finally {
    if (pool) {
      await pool.end();
      console.log('\n🔌 Pool fermé');
    }
  }
}

async function testApplicationRoutes() {
  console.log('\n🛣️  TEST DES ROUTES PRINCIPALES:');
  console.log('=================================');
  
  // Simuler l'import du module de connexion
  try {
    // Test d'import du module
    console.log('⏳ Test d\'import du module dbConnection...');
    
    // Nettoyer le cache pour un test propre
    const dbConnectionPath = path.resolve('./server/db/dbConnection.js');
    delete require.cache[dbConnectionPath];
    
    const { pool } = require('./server/db/dbConnection');
    console.log('✅ Module dbConnection importé');
    
    // Attendre que le pool soit initialisé
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test d'une requête via le pool
    console.log('\n🧪 Test via le pool de l\'application...');
    const [result] = await pool.execute('SELECT "Application Pool Test" as message, NOW() as timestamp');
    console.log(`   ✅ ${result[0].message} - ${result[0].timestamp}`);
    
    console.log('\n🎉 MODULE D\'APPLICATION FONCTIONNEL !');
    return true;
    
  } catch (error) {
    console.log(`\n❌ ERREUR MODULE APPLICATION:`);
    console.log(`   ${error.message}`);
    return false;
  }
}

// Fonction principale
async function main() {
  let allTestsPassed = true;
  
  try {
    // Test 1: Configuration
    await testConfiguration();
    
    // Test 2: Connexion simple
    const connectionTest = await testConnection();
    if (!connectionTest) allTestsPassed = false;
    
    // Test 3: Pool de connexions
    const poolTest = await testPool();
    if (!poolTest) allTestsPassed = false;
    
    // Test 4: Module application
    const appTest = await testApplicationRoutes();
    if (!appTest) allTestsPassed = false;
    
    // Résultat final
    console.log('\n📊 RÉSUMÉ FINAL:');
    console.log('================');
    
    if (allTestsPassed) {
      console.log('🎉 TOUS LES TESTS RÉUSSIS !');
      console.log('✅ Votre application est prête pour RDS');
      console.log('✅ Vous pouvez démarrer votre serveur avec: npm run start:server');
      console.log('✅ Routes de santé disponibles:');
      console.log('   - GET http://localhost:5000/health');
      console.log('   - GET http://localhost:5000/api/health');
      console.log('   - GET http://localhost:5000/api/health/database');
    } else {
      console.log('❌ CERTAINS TESTS ONT ÉCHOUÉ');
      console.log('⚠️  Vérifiez la configuration avant de démarrer l\'application');
    }
    
    process.exit(allTestsPassed ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ ERREUR FATALE:', error.message);
    process.exit(1);
  }
}

// Gestion des signaux
process.on('SIGINT', () => {
  console.log('\n⚠️  Test interrompu par l\'utilisateur');
  process.exit(1);
});

// Exécuter le test
if (require.main === module) {
  main();
}

module.exports = { testConfiguration, testConnection, testPool };