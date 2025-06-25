// migrate-to-rds-mariadb.js - Script adapté pour MariaDB
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
require('dotenv').config();

const secretsManager = new SecretsManagerClient({ region: 'eu-west-1' });

// Configuration dynamique - récupère l'endpoint RDS automatiquement
async function getRDSEndpoint() {
  try {
    console.log('🔍 Recherche de l\'endpoint RDS...');
    
    // Essayer de récupérer l'endpoint depuis AWS
    const result = execSync(
      'aws rds describe-db-instances --region eu-west-1 --query "DBInstances[?contains(DBInstanceIdentifier, \'maturity\') || contains(DBInstanceIdentifier, \'backend\')].Endpoint.Address" --output text',
      { encoding: 'utf8', stdio: 'pipe' }
    ).trim();
    
    if (result && result !== 'None' && !result.includes('error')) {
      console.log(`✅ Endpoint RDS trouvé: ${result}`);
      return result;
    }
    
    throw new Error('Endpoint non trouvé automatiquement');
    
  } catch (error) {
    console.log('⚠️  Impossible de récupérer l\'endpoint automatiquement');
    
    // Fallback : utiliser l'endpoint connu
    const fallbackEndpoint = 'maturitybackend-dev-databaseb269d8bb-7h9b2e16ryhv.cd6w86yy2wyp.eu-west-1.rds.amazonaws.com';
    console.log(`📍 Utilisation de l'endpoint connu: ${fallbackEndpoint}`);
    return fallbackEndpoint;
  }
}

// Fonction pour détecter si c'est MariaDB ou MySQL
function detectDatabaseType() {
  try {
    const versionOutput = execSync('mysql --version', { encoding: 'utf8' });
    console.log('📦 Version détectée:', versionOutput.trim());
    
    if (versionOutput.toLowerCase().includes('mariadb')) {
      console.log('🔧 Détection: MariaDB - Utilisation de la syntaxe MariaDB');
      return 'mariadb';
    } else {
      console.log('🔧 Détection: MySQL - Utilisation de la syntaxe MySQL');
      return 'mysql';
    }
  } catch (error) {
    console.log('⚠️  Impossible de détecter le type de base, utilisation de MySQL par défaut');
    return 'mysql';
  }
}

// Fonction pour télécharger et vérifier le certificat SSL RDS
async function ensureSSLCertificate() {
  const certPath = path.resolve('./eu-west-1-bundle.pem');
  const certUrl = 'https://truststore.pki.rds.amazonaws.com/eu-west-1/eu-west-1-bundle.pem';
  
  console.log('🔒 Vérification du certificat SSL RDS...');
  
  // Vérifier si le certificat existe et est valide
  let needDownload = false;
  
  if (!fs.existsSync(certPath)) {
    console.log('📥 Certificat SSL non trouvé, téléchargement nécessaire...');
    needDownload = true;
  } else {
    // Vérifier la taille du certificat (doit être > 1KB)
    const stats = fs.statSync(certPath);
    if (stats.size < 1024) {
      console.log('⚠️  Certificat SSL corrompu, re-téléchargement...');
      needDownload = true;
    } else {
      // Vérifier que c'est bien un certificat PEM
      const content = fs.readFileSync(certPath, 'utf8');
      if (!content.includes('-----BEGIN CERTIFICATE-----')) {
        console.log('⚠️  Certificat SSL invalide, re-téléchargement...');
        needDownload = true;
      } else {
        console.log(`✅ Certificat SSL valide trouvé (${(stats.size / 1024).toFixed(1)} KB)`);
      }
    }
  }
  
  if (needDownload) {
    try {
      console.log(`📥 Téléchargement du certificat depuis: ${certUrl}`);
      
      // Supprimer l'ancien fichier s'il existe
      if (fs.existsSync(certPath)) {
        fs.unlinkSync(certPath);
      }
      
      // Télécharger avec curl avec options de sécurité
      execSync(`curl -L --fail --retry 3 --retry-delay 2 -o "${certPath}" "${certUrl}"`, { 
        stdio: 'inherit',
        timeout: 30000 // 30 secondes timeout
      });
      
      // Vérifier le téléchargement
      if (!fs.existsSync(certPath)) {
        throw new Error('Fichier certificat non créé après téléchargement');
      }
      
      const stats = fs.statSync(certPath);
      const content = fs.readFileSync(certPath, 'utf8');
      
      if (stats.size < 1024 || !content.includes('-----BEGIN CERTIFICATE-----')) {
        throw new Error('Certificat téléchargé invalide');
      }
      
      console.log(`✅ Certificat SSL téléchargé avec succès (${(stats.size / 1024).toFixed(1)} KB)`);
      
      // Afficher quelques informations sur les certificats
      const certCount = (content.match(/-----BEGIN CERTIFICATE-----/g) || []).length;
      console.log(`📋 Nombre de certificats dans le bundle: ${certCount}`);
      
    } catch (error) {
      console.error('❌ Erreur lors du téléchargement du certificat:', error.message);
      
      // Essayer wget en fallback
      try {
        console.log('🔄 Tentative avec wget...');
        execSync(`wget -O "${certPath}" "${certUrl}"`, { stdio: 'inherit' });
        
        if (fs.existsSync(certPath) && fs.statSync(certPath).size > 1024) {
          console.log('✅ Certificat téléchargé avec wget');
        } else {
          throw new Error('Wget a échoué');
        }
      } catch (wgetError) {
        throw new Error(`Impossible de télécharger le certificat SSL: ${error.message}`);
      }
    }
  }
  
  return certPath;
}

// Fonction pour demander le mot de passe de manière sécurisée
function askPassword(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.stdoutMuted = true;
    rl.question(prompt, (password) => {
      rl.close();
      console.log('');
      resolve(password);
    });
    
    rl._writeToOutput = function _writeToOutput(stringToWrite) {
      if (rl.stdoutMuted)
        rl.output.write("*");
      else
        rl.output.write(stringToWrite);
    };
  });
}

async function getRDSCredentials() {
  try {
    console.log('🔐 Tentative de récupération des credentials depuis AWS Secrets Manager...');
    const secretArn = 'arn:aws:secretsmanager:eu-west-1:637423285771:secret:rds!db-bfb35f35-1f2b-47ea-8267-609900bfcb16-TEXf04';
    const command = new GetSecretValueCommand({ SecretId: secretArn });
    const data = await secretsManager.send(command);
    const credentials = JSON.parse(data.SecretString);
    console.log('✅ Credentials récupérés depuis AWS Secrets Manager');
    return {
      username: credentials.username,
      password: credentials.password,
      source: 'AWS Secrets Manager'
    };
  } catch (error) {
    console.log('⚠️  Échec de récupération depuis AWS Secrets Manager');
    console.log('   ', error.message);
    
    const username = 'admin';
    let password = process.env.DB_PASSWORD;
    
    if (!password) {
      console.log('\n📝 Aucun mot de passe trouvé dans DB_PASSWORD');
      password = await askPassword('🔑 Entrez le mot de passe RDS pour admin: ');
    } else {
      console.log('✅ Mot de passe trouvé dans DB_PASSWORD');
    }
    
    return {
      username,
      password,
      source: password ? '.env file' : 'user input'
    };
  }
}

async function createLocalDump() {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
  const dumpFile = `backup_${timestamp}.sql`;
  
  console.log('\n🗄️  Création du dump local...');
  
  try {
    const localConfig = {
      host: process.env.LOCAL_DB_HOST || 'localhost',
      port: process.env.LOCAL_DB_PORT || '3306',
      user: process.env.LOCAL_DB_USER || 'root',
      database: 'maturity_assessment'
    };
    
    console.log('📊 Configuration locale:', localConfig);
    
    let additionalOptions = '';
    const dbType = detectDatabaseType();
    
    try {
      const versionOutput = execSync('mysqldump --version', { encoding: 'utf8' });
      console.log('📦 Version mysqldump:', versionOutput.trim());
      
      if (versionOutput.includes('Ver 8.') || versionOutput.includes('Ver 10.') || versionOutput.includes('MariaDB')) {
        try {
          execSync('mysqldump --help | grep gtid-purged', { stdio: 'pipe' });
          additionalOptions += '--set-gtid-purged=OFF ';
        } catch {
          console.log('  ℹ️  Option --set-gtid-purged non supportée');
        }
        
        try {
          execSync('mysqldump --help | grep column-statistics', { stdio: 'pipe' });
          additionalOptions += '--column-statistics=0 ';
        } catch {
          console.log('  ℹ️  Option --column-statistics non supportée');
        }
      }
    } catch (error) {
      console.log('  ⚠️  Impossible de détecter la version de mysqldump');
    }
    
    const dumpCommand = `mysqldump ` +
      `--host=${localConfig.host} ` +
      `--port=${localConfig.port} ` +
      `--user=${localConfig.user} ` +
      `--password ` +
      `--single-transaction ` +
      `--routines ` +
      `--triggers ` +
      additionalOptions +
      `--default-character-set=utf8mb4 ` +
      `--add-drop-table ` +
      `${localConfig.database} > ${dumpFile}`;
    
    console.log('🔄 Exécution du dump (entrez le mot de passe local quand demandé)...');
    execSync(dumpCommand, { stdio: 'inherit' });
    
    const stats = fs.statSync(dumpFile);
    console.log(`✅ Dump créé: ${dumpFile} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    
    return dumpFile;
  } catch (error) {
    console.error('❌ Erreur lors du dump:', error.message);
    throw error;
  }
}

async function prepareDumpForRDS(dumpFile) {
  console.log('🔧 Préparation du dump pour RDS...');
  
  const preparedFile = dumpFile.replace('.sql', '_rds.sql');
  
  try {
    let content = fs.readFileSync(dumpFile, 'utf8');
    
    const replacements = [
      { from: /utf8mb4_uca1400_ai_ci/g, to: 'utf8mb4_unicode_ci' },
      { from: /utf8mb4_0900_ai_ci/g, to: 'utf8mb4_unicode_ci' },
      { from: /utf8mb4_general_ci/g, to: 'utf8mb4_unicode_ci' },
      { from: /current_timestamp\(\)/g, to: 'CURRENT_TIMESTAMP' },
      { from: /,NO_AUTO_CREATE_USER/g, to: '' },
      { from: /NO_AUTO_CREATE_USER,/g, to: '' },
      { from: /NO_AUTO_CREATE_USER/g, to: '' }
    ];
    
    replacements.forEach(({ from, to }) => {
      const occurrences = (content.match(from) || []).length;
      if (occurrences > 0) {
        console.log(`  📝 Remplacement de ${occurrences} occurrence(s) de ${from.source || from} par ${to || '(supprimé)'}`);
        content = content.replace(from, to);
      }
    });
    
    content = content.replace(/,,/g, ',');
    content = content.replace(/,\s*'/g, "'");
    content = content.replace(/\s+/g, ' ');
    
    fs.writeFileSync(preparedFile, content);
    console.log(`✅ Dump préparé: ${preparedFile}`);
    
    return preparedFile;
  } catch (error) {
    console.error('❌ Erreur lors de la préparation du dump:', error.message);
    throw error;
  }
}

// Configuration adaptée selon le type de base de données
function createDatabaseConfig(dbType, rdsConfig, certPath) {
  if (dbType === 'mariadb') {
    // Configuration MariaDB
    return `[client]
host=${rdsConfig.host}
port=${rdsConfig.port}
user=${rdsConfig.user}
password=${rdsConfig.password}
ssl-ca=${certPath}
ssl
ssl-verify-server-cert=false
default-character-set=utf8mb4
connect_timeout=60`;
  } else {
    // Configuration MySQL
    return `[client]
host=${rdsConfig.host}
port=${rdsConfig.port}
user=${rdsConfig.user}
password=${rdsConfig.password}
ssl-ca=${certPath}
ssl-mode=REQUIRED
ssl-verify-server-cert=false
default-character-set=utf8mb4
connect-timeout=60
read-timeout=60
write-timeout=60`;
  }
}

async function restoreToRDS(dumpFile, credentials, rdsEndpoint, certPath) {
  console.log('\n🚀 Restauration sur RDS...');
  console.log(`📌 Source des credentials: ${credentials.source}`);
  console.log(`🌐 Endpoint RDS: ${rdsEndpoint}`);
  console.log(`🔒 Certificat SSL: ${certPath}`);
  
  // Détecter le type de base de données
  const dbType = detectDatabaseType();
  
  try {
    const rdsConfig = {
      host: rdsEndpoint,
      port: '3306',
      user: credentials.username,
      password: credentials.password,
      database: 'maturity_assessment'
    };
    
    // Créer un fichier temporaire avec la configuration MySQL/MariaDB
    const configFile = `.my_rds_${Date.now()}.cnf`;
    const configContent = createDatabaseConfig(dbType, rdsConfig, certPath);
    
    fs.writeFileSync(configFile, configContent, { mode: 0o600 });
    
    try {
      // Test de connexion avec SSL
      console.log('🔌 Test de connexion RDS avec SSL...');
      
      let testCommand;
      if (dbType === 'mariadb') {
        // Pour MariaDB, test de connexion simplifié
        testCommand = `mysql --defaults-file=${configFile} -e "SELECT VERSION() as db_version, NOW() as time_now;"`;
      } else {
        // Pour MySQL, test avec plus d'informations
        testCommand = `mysql --defaults-file=${configFile} -e "SELECT VERSION() as db_version, NOW() as time_now, @@hostname as hostname;"`;
      }
      
      const testResult = execSync(testCommand, { 
        stdio: 'pipe', 
        encoding: 'utf8', 
        timeout: 30000 
      });
      
      console.log('✅ Connexion RDS avec SSL réussie');
      
      // Afficher les informations de connexion
      const lines = testResult.trim().split('\n');
      if (lines.length > 1) {
        const data = lines[1].split('\t');
        console.log(`📊 Version MySQL/MariaDB RDS: ${data[0] || 'N/A'}`);
        console.log(`🕐 Heure RDS: ${data[1] || 'N/A'}`);
        if (data[2]) {
          console.log(`🖥️  Hostname: ${data[2]}`);
        }
      }
      
      // Vérifier SSL
      console.log('🔐 Vérification SSL...');
      let sslCheckCommand;
      if (dbType === 'mariadb') {
        // MariaDB utilise une syntaxe légèrement différente
        sslCheckCommand = `mysql --defaults-file=${configFile} -e "SHOW STATUS LIKE 'Ssl_cipher';"`;
      } else {
        sslCheckCommand = `mysql --defaults-file=${configFile} -e "SHOW SESSION STATUS LIKE 'Ssl_cipher';"`;
      }
      
      try {
        const sslCheck = execSync(sslCheckCommand, {
          stdio: 'pipe', 
          encoding: 'utf8' 
        });
        
        if (sslCheck.includes('Ssl_cipher') && !sslCheck.includes('\t\t')) {
          console.log('✅ Connexion SSL active');
        } else {
          console.log('⚠️  SSL non détecté, mais connexion établie');
        }
      } catch (sslError) {
        console.log('⚠️  Impossible de vérifier le statut SSL, mais connexion établie');
      }
      
      // Préparer le dump pour RDS
      const preparedDump = await prepareDumpForRDS(dumpFile);
      
      // Restauration
      console.log('📥 Restauration en cours...');
      console.log('   (Cela peut prendre plusieurs minutes...)');
      
      try {
        execSync(`mysql --defaults-file=${configFile} ${rdsConfig.database} < ${preparedDump}`, { 
          stdio: 'inherit',
          timeout: 300000 // 5 minutes timeout
        });
      } catch (restoreError) {
        console.error('\n💡 Erreur de restauration détectée');
        console.error('   Pour debug, vous pouvez essayer :');
        console.error(`   mysql --defaults-file=${configFile} ${rdsConfig.database} --force < ${preparedDump}`);
        throw restoreError;
      }
      
      // Vérification
      console.log('🔍 Vérification des données...');
      const verifyCommand = `mysql --defaults-file=${configFile} ${rdsConfig.database} -e "
        SELECT 'Tables créées:' as Info;
        SHOW TABLES;
        SELECT 'Comptage des lignes:' as Info;
        SELECT 'acteurs' as TableName, COUNT(*) as RowCount FROM acteurs
        UNION ALL
        SELECT 'entreprises', COUNT(*) FROM entreprises
        UNION ALL
        SELECT 'roles', COUNT(*) FROM roles;
      "`;
      
      execSync(verifyCommand, { stdio: 'inherit' });
      console.log('\n🎉 Migration terminée avec succès !');
      
      // Nettoyer le fichier préparé
      if (fs.existsSync(preparedDump)) {
        fs.unlinkSync(preparedDump);
        console.log(`🗑️  Dump temporaire supprimé: ${preparedDump}`);
      }
      
    } finally {
      // Nettoyer le fichier de config
      if (fs.existsSync(configFile)) {
        fs.unlinkSync(configFile);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la restauration:', error.message);
    
    if (error.message.includes('Access denied')) {
      console.error('\n💡 Suggestions pour Access denied:');
      console.error('   - Vérifiez le mot de passe RDS');
      console.error('   - Vérifiez que le Security Group autorise votre IP sur le port 3306');
      console.error('   - Vérifiez que l\'instance RDS est "Publicly accessible"');
    } else if (error.message.includes('Unknown server host') || error.message.includes('timeout')) {
      console.error('\n💡 Suggestions pour connexion:');
      console.error('   - Vérifiez votre connexion Internet');
      console.error('   - Vérifiez que le Security Group autorise votre IP');
      console.error('   - Vérifiez l\'endpoint RDS');
    } else if (error.message.includes('SSL') || error.message.includes('ssl')) {
      console.error('\n💡 Suggestions pour SSL:');
      console.error('   - Le certificat SSL a été téléchargé et vérifié');
      console.error('   - MariaDB utilise une syntaxe SSL différente de MySQL');
      if (dbType === 'mariadb') {
        console.error('   - Mode MariaDB détecté, utilisation de la syntaxe appropriée');
      }
    } else if (error.message.includes('unknown variable')) {
      console.error('\n💡 Le problème des variables inconnues a été corrigé:');
      console.error(`   - Type de base détecté: ${dbType}`);
      console.error('   - Configuration adaptée automatiquement');
    }
    
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 === MIGRATION VERS RDS AVEC SSL (Compatible MariaDB/MySQL) ===\n');
    
    // Vérifier les prérequis
    console.log('📋 Vérification des prérequis...');
    
    try {
      execSync('mysql --version', { stdio: 'pipe' });
      execSync('mysqldump --version', { stdio: 'pipe' });
      console.log('✅ MySQL/MariaDB CLI disponible');
    } catch {
      throw new Error('MySQL/MariaDB CLI non trouvé. Installez MySQL ou MariaDB client.');
    }
    
    // Vérifier AWS CLI
    try {
      execSync('aws --version', { stdio: 'pipe' });
      console.log('✅ AWS CLI disponible');
    } catch {
      console.log('⚠️  AWS CLI non trouvé, utilisation de l\'endpoint manuel');
    }
    
    // Détecter le type de base de données
    const dbType = detectDatabaseType();
    
    // Récupérer l'endpoint RDS
    const rdsEndpoint = await getRDSEndpoint();
    
    // Télécharger et vérifier le certificat SSL
    const certPath = await ensureSSLCertificate();
    
    // Récupérer les credentials RDS
    const rdsCredentials = await getRDSCredentials();
    
    // Étape 1: Dump local
    const dumpFile = await createLocalDump();
    
    // Étape 2: Restauration RDS avec SSL
    await restoreToRDS(dumpFile, rdsCredentials, rdsEndpoint, certPath);
    
    // Instructions finales
    console.log('\n📋 Prochaines étapes:');
    console.log('1. Testez la connexion backend: curl https://api-dev.dev-maturity.e-dsin.fr/api/health/database');
    console.log('2. Testez le login frontend avec un utilisateur existant de votre base');
    console.log('3. Surveillez les logs: aws logs tail /ecs/maturity-backend-dev --follow --region eu-west-1');
    
    console.log(`\n🗑️  Pour supprimer le dump: rm ${dumpFile}`);
    console.log(`🔒 Pour supprimer le certificat: rm ${certPath}`);
    
    console.log(`\n🔧 Type de base détecté: ${dbType}`);
    console.log('✅ Configuration automatiquement adaptée pour votre environnement');
    
  } catch (error) {
    console.error('\n❌ Erreur lors de la migration:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { 
  main, 
  createLocalDump, 
  prepareDumpForRDS, 
  restoreToRDS, 
  ensureSSLCertificate, 
  getRDSEndpoint,
  detectDatabaseType,
  createDatabaseConfig
};