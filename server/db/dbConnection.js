// server/db/dbConnection.js
// Configuration RDS MySQL pour production

const mysql = require('mysql2/promise');
const path = require('path');

// Configuration de base pour RDS
const DB_CONFIG = {
  host: process.env.DB_HOST || 'maturitybackend-dev-databaseb269d8bb-rh7bxy6kcqbb.cd6w86yy2wyp.eu-west-1.rds.amazonaws.com',
  port: parseInt(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || 'maturity_assessment',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD,
  
  // ✅ SOLUTION SSL pour RDS - résout le problème "self-signed certificate"
  ssl: process.env.DB_SSL_DISABLED === 'true' ? false : {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true' ? true : false
  },
  
  charset: 'utf8mb4',
  timezone: '+00:00',
  
  // Configuration du pool de connexions
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
  
  // Timeouts et retry
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  
  // Options pour la stabilité
  multipleStatements: false,
  dateStrings: false
};

// Fonction pour obtenir les credentials AWS Secrets Manager (optionnel)
async function getAWSCredentials() {
  if (!process.env.DB_SECRET_ARN) {
    return null;
  }
  
  try {
    // Si AWS SDK est disponible
    const AWS = require('aws-sdk');
    const secretsManager = new AWS.SecretsManager({
      region: process.env.AWS_REGION || 'eu-west-1'
    });
    
    const data = await secretsManager.getSecretValue({
      SecretId: process.env.DB_SECRET_ARN
    }).promise();
    
    const credentials = JSON.parse(data.SecretString);
    
    console.log('✅ Credentials récupérés depuis AWS Secrets Manager');
    return {
      user: credentials.username,
      password: credentials.password
    };
    
  } catch (error) {
    console.log('⚠️  AWS Secrets Manager non disponible, utilisation des variables d\'environnement');
    return null;
  }
}

// Créer le pool de connexions
async function createPool() {
  try {
    console.log('🔄 Configuration de la connexion à la base de données...');
    
    // Configuration finale
    let finalConfig = { ...DB_CONFIG };
    
    // Essayer d'obtenir les credentials AWS si configuré
    if (process.env.DB_SECRET_ARN && !finalConfig.password) {
      const awsCredentials = await getAWSCredentials();
      if (awsCredentials) {
        finalConfig = { ...finalConfig, ...awsCredentials };
      }
    }
    
    // Vérifier que le mot de passe est présent
    if (!finalConfig.password) {
      throw new Error('❌ Mot de passe de base de données non configuré. Définissez DB_PASSWORD dans .env ou configurez AWS Secrets Manager');
    }
    
    // Afficher la configuration (sans le mot de passe)
    console.log('📋 Configuration RDS:');
    console.log(`   Host: ${finalConfig.host}`);
    console.log(`   Port: ${finalConfig.port}`);
    console.log(`   Database: ${finalConfig.database}`);
    console.log(`   User: ${finalConfig.user}`);
    console.log(`   SSL: ${finalConfig.ssl ? (finalConfig.ssl.rejectUnauthorized ? 'Activé (strict)' : 'Activé (permissif)') : 'Désactivé'}`);
    console.log(`   Connection Limit: ${finalConfig.connectionLimit}`);
    
    // Créer le pool
    const pool = mysql.createPool(finalConfig);
    
    // Test de connexion initial
    console.log('🔌 Test de connexion initial...');
    const connection = await pool.getConnection();
    
    // Test simple
    const [testResult] = await connection.execute('SELECT 1 as test, NOW() as time, VERSION() as version');
    console.log('✅ Connexion RDS établie avec succès !');
    console.log(`   Version MySQL: ${testResult[0].version}`);
    console.log(`   Timestamp: ${testResult[0].time}`);
    
    connection.release();
    
    return pool;
    
  } catch (error) {
    console.error('❌ Erreur lors de la création du pool de connexions:');
    console.error(`   Message: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    
    // Diagnostics d'erreur
    if (error.code === 'ENOTFOUND') {
      console.error('💡 Vérifiez l\'URL de votre instance RDS');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('💡 Vérifiez les Security Groups AWS et que RDS est démarré');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('💡 Vérifiez les credentials (username/password)');
    } else if (error.message.includes('SSL')) {
      console.error('💡 Problème SSL - définissez DB_SSL_DISABLED=true pour tester');
    }
    
    throw error;
  }
}

// Gestionnaire de déconnexion propre
async function closePool() {
  if (pool) {
    console.log('🔌 Fermeture du pool de connexions...');
    await pool.end();
    console.log('✅ Pool fermé');
  }
}

// Fonction de santé de la base de données
async function healthCheck() {
  try {
    if (!pool) {
      throw new Error('Pool non initialisé');
    }
    
    const connection = await pool.getConnection();
    const [result] = await connection.execute('SELECT 1 as alive');
    connection.release();
    
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: error.message, 
      timestamp: new Date().toISOString() 
    };
  }
}

// Initialisation du pool
let pool = null;

// Auto-initialisation
(async () => {
  try {
    pool = await createPool();
    console.log('🎉 Base de données prête !');
  } catch (error) {
    console.error('❌ Échec de l\'initialisation de la base de données');
    process.exit(1);
  }
})();

// Gestion propre de l'arrêt
process.on('SIGTERM', async () => {
  console.log('Signal SIGTERM reçu. Fermeture des connexions DB...');
  await closePool();
});

process.on('SIGINT', async () => {
  console.log('Signal SIGINT reçu. Fermeture des connexions DB...');
  await closePool();
});

// Exports
module.exports = {
  pool: new Proxy({}, {
    get: (target, prop) => {
      if (!pool) {
        throw new Error('Pool de connexions non initialisé');
      }
      return pool[prop];
    }
  }),
  createPool,
  closePool,
  healthCheck,
  DB_CONFIG
};