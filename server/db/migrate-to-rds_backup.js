// migrate-to-rds.js - Script de migration avec gestion améliorée des mots de passe
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
require('dotenv').config();

const secretsManager = new SecretsManagerClient({ region: 'eu-west-1' });

// Fonction pour demander le mot de passe de manière sécurisée
function askPassword(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // Masquer la saisie
    rl.stdoutMuted = true;
    rl.question(prompt, (password) => {
      rl.close();
      console.log(''); // Nouvelle ligne après la saisie
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
    
    // Fallback : utiliser les variables d'environnement ou demander
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
    
    // Détecter la version de mysqldump pour adapter les options
    let additionalOptions = '';
    try {
      const versionOutput = execSync('mysqldump --version', { encoding: 'utf8' });
      console.log('📦 Version mysqldump:', versionOutput.trim());
      
      // Vérifier si c'est MySQL 8+ ou MariaDB
      if (versionOutput.includes('Ver 8.') || versionOutput.includes('Ver 10.')) {
        // Tester si les options sont supportées
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
    
    // Le mot de passe local sera demandé par mysqldump directement
    const dumpCommand = `mysqldump ` +
      `--host=${localConfig.host} ` +
      `--port=${localConfig.port} ` +
      `--user=${localConfig.user} ` +
      `--password ` +  // mysqldump demandera le mot de passe
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
    // Lire le dump
    let content = fs.readFileSync(dumpFile, 'utf8');
    
    // Remplacer les collations non supportées
    const replacements = [
      // Remplacer la collation problématique par une compatible
      { from: /utf8mb4_uca1400_ai_ci/g, to: 'utf8mb4_unicode_ci' },
      // Remplacer aussi d'autres collations potentiellement problématiques
      { from: /utf8mb4_0900_ai_ci/g, to: 'utf8mb4_unicode_ci' },
      { from: /utf8mb4_general_ci/g, to: 'utf8mb4_unicode_ci' },
      // Remplacer current_timestamp() par CURRENT_TIMESTAMP
      { from: /current_timestamp\(\)/g, to: 'CURRENT_TIMESTAMP' },
      // Supprimer NO_AUTO_CREATE_USER qui n'existe plus dans MySQL 8.0
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
    
    // Nettoyer les doubles virgules qui pourraient résulter des suppressions
    content = content.replace(/,,/g, ',');
    // Nettoyer les virgules en fin avant les apostrophes
    content = content.replace(/,\s*'/g, "'");
    // Nettoyer les espaces multiples
    content = content.replace(/\s+/g, ' ');
    
    // Écrire le fichier modifié
    fs.writeFileSync(preparedFile, content);
    console.log(`✅ Dump préparé: ${preparedFile}`);
    
    return preparedFile;
  } catch (error) {
    console.error('❌ Erreur lors de la préparation du dump:', error.message);
    throw error;
  }
}

async function restoreToRDS(dumpFile, credentials) {
  console.log('\n🚀 Restauration sur RDS...');
  console.log(`📌 Source des credentials: ${credentials.source}`);
  
  try {
    const rdsConfig = {
      host: 'maturitybackend-dev-databaseb269d8bb-7h9b2e16ryhv.cd6w86yy2wyp.eu-west-1.rds.amazonaws.com',
      port: '3306',
      user: credentials.username,
      password: credentials.password,
      database: 'maturity_assessment'
    };
    
    // Créer un fichier temporaire avec le mot de passe
    const configFile = `.my_rds_${Date.now()}.cnf`;
    const configContent = `[client]
host=${rdsConfig.host}
port=${rdsConfig.port}
user=${rdsConfig.user}
password=${rdsConfig.password}
ssl-ca=./eu-west-1-bundle.pem
default-character-set=utf8mb4`;
    
    fs.writeFileSync(configFile, configContent, { mode: 0o600 }); // Permissions restreintes
    
    try {
      // Test de connexion
      console.log('🔌 Test de connexion RDS...');
      const testResult = execSync(
        `mysql --defaults-file=${configFile} -e "SELECT VERSION() as db_version, NOW() as time_now;"`, 
        { stdio: 'pipe', encoding: 'utf8' }
      );
      console.log('✅ Connexion RDS réussie');
      
      // Afficher la version pour info
      const versionResult = execSync(
        `mysql --defaults-file=${configFile} -e "SELECT VERSION();"`, 
        { stdio: 'pipe', encoding: 'utf8' }
      );
      console.log(`📊 Version MySQL RDS: ${versionResult.toString().split('\n')[1]}`);
      
      // Préparer le dump pour RDS
      const preparedDump = await prepareDumpForRDS(dumpFile);
      
      // Restauration
      console.log('📥 Restauration en cours...');
      try {
        execSync(`mysql --defaults-file=${configFile} ${rdsConfig.database} < ${preparedDump}`, { stdio: 'inherit' });
      } catch (restoreError) {
        // Essayer d'identifier la ligne problématique
        console.error('\n💡 Pour identifier la ligne exacte du problème, vous pouvez exécuter :');
        console.error(`   mysql --defaults-file=${configFile} ${rdsConfig.database} --force < ${preparedDump}`);
        console.error('   Ou examiner le dump autour de la ligne mentionnée dans l\'erreur');
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
        SELECT 'roles', COUNT(*) FROM roles
        UNION ALL
        SELECT 'evaluations', COUNT(*) FROM evaluations;
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
    
    // Si c'est une erreur d'authentification, suggérer de vérifier le mot de passe
    if (error.message.includes('Access denied')) {
      console.error('\n💡 Suggestions:');
      console.error('   - Vérifiez que le mot de passe RDS est correct');
      console.error('   - Vérifiez que DB_PASSWORD dans .env contient le bon mot de passe');
      console.error('   - Essayez de vous connecter manuellement: mysql -h [host] -u admin -p');
    }
    
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 === MIGRATION VERS RDS ===\n');
    
    // Vérifier les prérequis
    console.log('📋 Vérification des prérequis...');
    
    try {
      execSync('mysql --version', { stdio: 'pipe' });
      execSync('mysqldump --version', { stdio: 'pipe' });
      console.log('✅ MySQL CLI disponible');
    } catch {
      throw new Error('MySQL CLI non trouvé. Installez MySQL client.');
    }
    
    // Vérifier le certificat SSL
    const certPath = './eu-west-1-bundle.pem';
    if (!fs.existsSync(certPath)) {
      console.log('📥 Téléchargement du certificat SSL...');
      execSync(`curl -o ${certPath} https://truststore.pki.rds.amazonaws.com/eu-west-1/eu-west-1-bundle.pem`);
    }
    console.log('✅ Certificat SSL présent');
    
    // Récupérer les credentials RDS en premier
    const rdsCredentials = await getRDSCredentials();
    
    // Étape 1: Dump local
    const dumpFile = await createLocalDump();
    
    // Étape 2: Restauration RDS avec les credentials récupérés
    await restoreToRDS(dumpFile, rdsCredentials);
    
    // Étape 3: Instructions finales
    console.log('\n📋 Prochaines étapes:');
    console.log('1. Redémarrez votre serveur: npm run start:server');
    console.log('2. Testez la connexion: curl http://localhost:5000/api/health/database');
    console.log('3. Testez le login: admin@qwanza.fr / [votre_mot_de_passe]');
    
    // Optionnel : proposer de nettoyer le dump
    console.log(`\n🗑️  Pour supprimer le dump: rm ${dumpFile}`);
    
  } catch (error) {
    console.error('\n❌ Erreur lors de la migration:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, createLocalDump, prepareDumpForRDS, restoreToRDS };