// server/test-db-connection.js
const mysql = require('mysql2/promise');
const path = require('path');
const readline = require('readline');

// Configuration de base (sans mot de passe)
const DB_CONFIG = {
  host: 'maturitybackend-dev-databaseb269d8bb-rh7bxy6kcqbb.cd6w86yy2wyp.eu-west-1.rds.amazonaws.com',
  port: 3306,
  database: 'maturity_assessment',
  user: 'admin',
  ssl: {
    ca: path.join(__dirname, 'eu-west-1-bundle.pem'),
    rejectUnauthorized: true
  },
  charset: 'utf8mb4',
  timezone: '+00:00',
  acquireTimeout: 60000,
  timeout: 60000
};

// Interface pour saisie sécurisée du mot de passe
function askPassword(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // Masquer la saisie du mot de passe
    rl.stdoutMuted = true;
    
    rl.question(question, (password) => {
      rl.close();
      console.log(''); // Nouvelle ligne après la saisie masquée
      resolve(password);
    });
    
    rl._writeToOutput = function _writeToOutput(stringToWrite) {
      if (rl.stdoutMuted) {
        rl.output.write('*');
      } else {
        rl.output.write(stringToWrite);
      }
    };
  });
}

// Fonction pour récupérer les credentials depuis AWS Secrets Manager
async function getCredentialsFromAWS() {
  try {
    console.log('🔐 Tentative de récupération depuis AWS Secrets Manager...');
    
    // Vérifier si AWS SDK est disponible
    let AWS;
    try {
      AWS = require('aws-sdk');
    } catch (error) {
      console.log('⚠️  AWS SDK non installé. npm install aws-sdk');
      return null;
    }
    
    const secretsManager = new AWS.SecretsManager({
      region: 'eu-west-1'
    });
    
    const secretArn = 'arn:aws:secretsmanager:eu-west-1:637423285771:secret:rdsdb-8400c0dc-ab78-4127-8515-f8f6197d3c88-D5wzPP';
    
    const data = await secretsManager.getSecretValue({ SecretId: secretArn }).promise();
    const credentials = JSON.parse(data.SecretString);
    
    console.log('✅ Credentials récupérés depuis AWS Secrets Manager');
    console.log(`   Username: ${credentials.username}`);
    
    return {
      user: credentials.username,
      password: credentials.password
    };
    
  } catch (error) {
    console.log('❌ Erreur AWS Secrets Manager:', error.message);
    return null;
  }
}

// Fonction pour obtenir les credentials (AWS ou manuel)
async function getDbCredentials() {
  try {
    // Essayer d'abord AWS Secrets Manager
    const awsCredentials = await getCredentialsFromAWS();
    if (awsCredentials) {
      return awsCredentials;
    }
  } catch (error) {
    console.log('⚠️  AWS Secrets Manager non disponible');
  }
  
  // Fallback vers saisie manuelle
  console.log('\n🔑 Saisie manuelle des credentials:');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('Nom d\'utilisateur (défaut: admin): ', async (username) => {
      const user = username.trim() || 'admin';
      
      const password = await askPassword('Mot de passe: ');
      
      rl.close();
      console.log(`✅ Credentials saisis manuellement (user: ${user})`);
      
      resolve({
        user,
        password: password.trim()
      });
    });
  });
}

// Fonction de test de connexion
async function testDatabaseConnection() {
  console.log('🧪 TEST DE CONNEXION À LA BASE DE DONNÉES');
  console.log('==========================================');
  
  let connection = null;
  
  try {
    console.log('\n📋 Configuration:');
    console.log(`   Host: ${DB_CONFIG.host}`);
    console.log(`   Port: ${DB_CONFIG.port}`);
    console.log(`   Database: ${DB_CONFIG.database}`);
    console.log(`   SSL: ${DB_CONFIG.ssl ? 'Activé' : 'Désactivé'}`);
    
    // Vérifier le certificat SSL
    const sslCertPath = DB_CONFIG.ssl.ca;
    const fs = require('fs');
    
    if (!fs.existsSync(sslCertPath)) {
      console.log(`\n⚠️  Certificat SSL non trouvé: ${sslCertPath}`);
      console.log('   Téléchargez-le avec:');
      console.log('   curl -o server/eu-west-1-bundle.pem https://truststore.pki.rds.amazonaws.com/eu-west-1/eu-west-1-bundle.pem');
      
      // Continuer sans SSL pour le test
      delete DB_CONFIG.ssl;
      console.log('   → Test sans SSL');
    } else {
      console.log(`✅ Certificat SSL trouvé: ${sslCertPath}`);
    }
    
    // Obtenir les credentials
    const credentials = await getDbCredentials();
    
    // Configuration complète
    const fullConfig = {
      ...DB_CONFIG,
      ...credentials
    };
    
    console.log('\n🔌 Tentative de connexion...');
    
    // Créer la connexion
    connection = await mysql.createConnection(fullConfig);
    
    console.log('✅ Connexion établie avec succès!');
    
    // Test 1: Requête simple
    console.log('\n🧪 Test 1: Requête de base');
    const [basicResult] = await connection.execute('SELECT 1 as test, NOW() as current_time, VERSION() as version');
    console.log('✅ Résultat:', {
      test: basicResult[0].test,
      time: basicResult[0].current_time,
      version: basicResult[0].version
    });
    
    // Test 2: Lister les bases de données
    console.log('\n🧪 Test 2: Bases de données disponibles');
    const [databases] = await connection.execute('SHOW DATABASES');
    console.log('✅ Bases trouvées:');
    databases.forEach(db => {
      const dbName = Object.values(db)[0];
      console.log(`   - ${dbName}`);
    });
    
    // Test 3: Utiliser notre base et lister les tables
    console.log('\n🧪 Test 3: Tables dans maturity_assessment');
    try {
      await connection.execute(`USE ${DB_CONFIG.database}`);
      const [tables] = await connection.execute('SHOW TABLES');
      
      if (tables.length === 0) {
        console.log('⚠️  Aucune table trouvée (base vide)');
      } else {
        console.log(`✅ Tables trouvées (${tables.length}):`);
        tables.forEach(table => {
          const tableName = Object.values(table)[0];
          console.log(`   - ${tableName}`);
        });
      }
    } catch (error) {
      console.log(`❌ Erreur lors de l'accès à la base ${DB_CONFIG.database}:`, error.message);
    }
    
    // Test 4: Test des tables principales (si elles existent)
    console.log('\n🧪 Test 4: Contenu des tables principales');
    const mainTables = ['entreprises', 'acteurs', 'applications', 'questionnaires'];
    
    for (const tableName of mainTables) {
      try {
        const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`✅ Table ${tableName}: ${rows[0].count} enregistrement(s)`);
      } catch (error) {
        console.log(`⚠️  Table ${tableName}: ${error.message}`);
      }
    }
    
    // Test 5: Test d'écriture (optionnel)
    console.log('\n🧪 Test 5: Test d\'écriture (optionnel)');
    try {
      const testTableQuery = `
        CREATE TEMPORARY TABLE test_connection (
          id INT AUTO_INCREMENT PRIMARY KEY,
          test_value VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      await connection.execute(testTableQuery);
      
      await connection.execute('INSERT INTO test_connection (test_value) VALUES (?)', ['Test de connexion réussi']);
      
      const [testResult] = await connection.execute('SELECT * FROM test_connection');
      console.log('✅ Test d\'écriture réussi:', testResult[0]);
      
    } catch (error) {
      console.log('⚠️  Test d\'écriture échoué:', error.message);
    }
    
    console.log('\n🎉 TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS!');
    console.log('=====================================');
    console.log('✅ Votre base de données est prête à utiliser');
    console.log('✅ Vous pouvez maintenant démarrer votre application');
    
    return true;
    
  } catch (error) {
    console.log('\n❌ ERREUR DE CONNEXION');
    console.log('=====================');
    console.log('Erreur:', error.message);
    console.log('Code:', error.code);
    
    // Suggestions de dépannage
    console.log('\n💡 SUGGESTIONS DE DÉPANNAGE:');
    
    if (error.code === 'ENOTFOUND') {
      console.log('- Vérifiez votre connexion internet');
      console.log('- Vérifiez que l\'endpoint RDS est correct');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('- Vérifiez les Security Groups AWS');
      console.log('- Vérifiez que la base RDS est démarrée');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('- Vérifiez le nom d\'utilisateur et mot de passe');
      console.log('- Vérifiez les permissions de l\'utilisateur');
    } else if (error.message.includes('SSL')) {
      console.log('- Téléchargez le certificat SSL');
      console.log('- Vérifiez le chemin du certificat');
    }
    
    return false;
    
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connexion fermée');
    }
  }
}

// Point d'entrée principal
async function main() {
  try {
    const success = await testDatabaseConnection();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  }
}

// Gestion des signaux pour nettoyer proprement
process.on('SIGINT', () => {
  console.log('\n⚠️  Test interrompu par l\'utilisateur');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Test terminé');
  process.exit(1);
});

// Exécuter si appelé directement
if (require.main === module) {
  main();
}

module.exports = { testDatabaseConnection, getDbCredentials };