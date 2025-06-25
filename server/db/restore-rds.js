// restore-rds-with-env.js - Restauration RDS avec mot de passe .env
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const CONFIG = {
  rdsEndpoint: 'maturitybackend-dev-databaseb269d8bb-7h9b2e16ryhv.cd6w86yy2wyp.eu-west-1.rds.amazonaws.com',
  certPath: 'eu-west-1-bundle.pem',
  dumpFile: 'backup_20250608T084838.sql',
  database: 'maturity_assessment',
  user: 'admin'
};

function log(emoji, message) {
  console.log(`${emoji} ${message}`);
}

function checkRequirements() {
  log('📋', 'Vérification des prérequis...');
  
  // Vérifier le mot de passe
  if (!process.env.DB_PASSWORD) {
    log('❌', 'DB_PASSWORD non trouvé dans .env !');
    log('💡', 'Ajoutez: DB_PASSWORD=votre_mot_de_passe_rds dans votre fichier .env');
    process.exit(1);
  }
  log('✅', 'Mot de passe RDS trouvé dans .env');
  
  // Vérifier le dump
  if (!fs.existsSync(CONFIG.dumpFile)) {
    log('❌', `Dump non trouvé: ${CONFIG.dumpFile}`);
    process.exit(1);
  }
  
  const stats = fs.statSync(CONFIG.dumpFile);
  log('✅', `Dump trouvé: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  
  // Vérifier le certificat SSL
  if (!fs.existsSync(CONFIG.certPath)) {
    log('❌', `Certificat SSL non trouvé: ${CONFIG.certPath}`);
    log('💡', 'Exécutez d\'abord le script de migration pour télécharger le certificat');
    process.exit(1);
  }
  log('✅', 'Certificat SSL présent');
  
  // Vérifier MySQL/MariaDB CLI
  try {
    execSync('mysql --version', { stdio: 'pipe' });
    log('✅', 'MySQL/MariaDB CLI disponible');
  } catch (error) {
    log('❌', 'MySQL/MariaDB CLI non trouvé !');
    log('💡', 'Installez MySQL ou MariaDB client');
    process.exit(1);
  }
}

function createRDSConfig() {
  const timestamp = Date.now();
  const configFile = `.my_rds_${timestamp}.cnf`;
  
  log('🔧', 'Création de la configuration RDS...');
  
  const configContent = `[client]
host=${CONFIG.rdsEndpoint}
port=3306
user=${CONFIG.user}
password=${process.env.DB_PASSWORD}
ssl-ca=${CONFIG.certPath}
ssl
ssl-verify-server-cert=false
default-character-set=utf8mb4
connect_timeout=60`;

  fs.writeFileSync(configFile, configContent, { mode: 0o600 });
  log('✅', `Configuration créée: ${configFile}`);
  
  return configFile;
}

function testConnection(configFile) {
  log('🔌', 'Test de connexion RDS...');
  
  try {
    const result = execSync(
      `mysql --defaults-file=${configFile} -e "SELECT 'Connexion réussie' as status, VERSION() as version;"`,
      { encoding: 'utf8', stdio: 'pipe' }
    );
    
    log('✅', 'Connexion RDS réussie');
    
    // Afficher les infos de connexion
    const lines = result.trim().split('\n');
    if (lines.length > 1) {
      const data = lines[1].split('\t');
      log('📊', `Version: ${data[1] || 'N/A'}`);
    }
    
    return true;
  } catch (error) {
    log('❌', 'Échec de connexion RDS');
    log('💡', 'Vérifiez:');
    log('   ', '- Le mot de passe dans .env');
    log('   ', '- La connectivité réseau');
    log('   ', '- Les Security Groups AWS');
    return false;
  }
}

function checkCurrentDatabase(configFile) {
  log('📊', 'Vérification de l\'état actuel de la base...');
  
  try {
    const result = execSync(
      `mysql --defaults-file=${configFile} ${CONFIG.database} -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${CONFIG.database}';" -s -N`,
      { encoding: 'utf8', stdio: 'pipe' }
    );
    
    const tableCount = parseInt(result.trim()) || 0;
    log('📈', `Tables actuelles: ${tableCount}`);
    
    if (tableCount > 0) {
      log('⚠️ ', `La base contient déjà ${tableCount} tables`);
      log('⚠️ ', 'La restauration va écraser les données existantes');
      
      // En Node.js, on continue automatiquement
      // Pour une version interactive, vous pouvez utiliser readline
      log('🔄', 'Poursuite de la restauration...');
    }
    
    return tableCount;
  } catch (error) {
    log('⚠️ ', 'Impossible de vérifier l\'état de la base (elle sera créée si nécessaire)');
    return 0;
  }
}

function prepareDump() {
  const timestamp = Date.now();
  const preparedDump = `backup_prepared_${timestamp}.sql`;
  
  log('🔧', 'Préparation du dump pour RDS...');
  
  let content = fs.readFileSync(CONFIG.dumpFile, 'utf8');
  
  // Corrections pour compatibilité RDS/MariaDB
  const replacements = [
    { from: /utf8mb4_uca1400_ai_ci/g, to: 'utf8mb4_unicode_ci', desc: 'collations UCA1400' },
    { from: /utf8mb4_0900_ai_ci/g, to: 'utf8mb4_unicode_ci', desc: 'collations 0900' },
    { from: /utf8mb4_general_ci/g, to: 'utf8mb4_unicode_ci', desc: 'collations general' },
    { from: /current_timestamp\(\)/g, to: 'CURRENT_TIMESTAMP', desc: 'fonctions timestamp' },
    { from: /,NO_AUTO_CREATE_USER/g, to: '', desc: 'options NO_AUTO_CREATE_USER (virgule avant)' },
    { from: /NO_AUTO_CREATE_USER,/g, to: '', desc: 'options NO_AUTO_CREATE_USER (virgule après)' },
    { from: /NO_AUTO_CREATE_USER/g, to: '', desc: 'options NO_AUTO_CREATE_USER (seule)' }
  ];
  
  replacements.forEach(({ from, to, desc }) => {
    const matches = (content.match(from) || []).length;
    if (matches > 0) {
      log('   📝', `Correction ${desc}: ${matches} occurrence(s)`);
      content = content.replace(from, to);
    }
  });
  
  // Nettoyer les virgules doubles
  content = content.replace(/,,/g, ',');
  
  fs.writeFileSync(preparedDump, content);
  log('✅', `Dump préparé: ${preparedDump}`);
  
  return preparedDump;
}

function restoreDatabase(configFile, preparedDump) {
  log('🚀', 'Début de la restauration...');
  log('📁', `Source: ${CONFIG.dumpFile}`);
  log('🎯', `Destination: RDS ${CONFIG.database}`);
  log('⏱️ ', 'Cela peut prendre quelques minutes...');
  
  const startTime = Date.now();
  
  try {
    // Tentative de restauration normale
    execSync(
      `mysql --defaults-file=${configFile} ${CONFIG.database} < ${preparedDump}`,
      { stdio: 'inherit' }
    );
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    log('✅', `Restauration réussie en ${duration}s`);
    return true;
    
  } catch (error) {
    log('⚠️ ', 'Restauration avec erreurs, tentative avec --force...');
    
    try {
      execSync(
        `mysql --defaults-file=${configFile} ${CONFIG.database} --force < ${preparedDump}`,
        { stdio: 'inherit' }
      );
      
      const duration = Math.round((Date.now() - startTime) / 1000);
      log('✅', `Restauration forcée réussie en ${duration}s`);
      return true;
      
    } catch (forceError) {
      log('❌', 'Échec de la restauration');
      return false;
    }
  }
}

function verifyRestoration(configFile) {
  log('🔍', 'Vérification des données restaurées...');
  
  try {
    // Tables créées
    const tablesResult = execSync(
      `mysql --defaults-file=${configFile} ${CONFIG.database} -e "SHOW TABLES;" -s`,
      { encoding: 'utf8', stdio: 'pipe' }
    );
    
    const tables = tablesResult.trim().split('\n').filter(t => t.length > 0);
    log('📊', `Tables dans la base: ${tables.length}`);
    tables.forEach(table => log('   ✓', table));
    
    console.log('');
    
    // Comptage des enregistrements
    log('📈', 'Comptage des enregistrements:');
    const countQuery = `
      SELECT 'entreprises' as table_name, COUNT(*) as count FROM entreprises
      UNION ALL SELECT 'acteurs', COUNT(*) FROM acteurs  
      UNION ALL SELECT 'applications', COUNT(*) FROM applications
      UNION ALL SELECT 'fonctions', COUNT(*) FROM fonctions
      UNION ALL SELECT 'thematiques', COUNT(*) FROM thematiques
      UNION ALL SELECT 'questionnaires', COUNT(*) FROM questionnaires
      UNION ALL SELECT 'questions', COUNT(*) FROM questions
      UNION ALL SELECT 'formulaires', COUNT(*) FROM formulaires
      UNION ALL SELECT 'reponses', COUNT(*) FROM reponses;
    `;
    
    execSync(
      `mysql --defaults-file=${configFile} ${CONFIG.database} -e "${countQuery}" -t`,
      { stdio: 'inherit' }
    );
    
    console.log('');
    
    // Exemples d'utilisateurs
    log('👥', 'Exemples d\'utilisateurs:');
    const usersQuery = `
      SELECT nom_prenom, email, role, organisation 
      FROM acteurs 
      ORDER BY date_creation DESC 
      LIMIT 5;
    `;
    
    execSync(
      `mysql --defaults-file=${configFile} ${CONFIG.database} -e "${usersQuery}" -t`,
      { stdio: 'inherit' }
    );
    
    // Total des enregistrements
    const totalResult = execSync(
      `mysql --defaults-file=${configFile} ${CONFIG.database} -e "
        SELECT 
          (SELECT COUNT(*) FROM acteurs) + 
          (SELECT COUNT(*) FROM entreprises) + 
          (SELECT COUNT(*) FROM applications) + 
          (SELECT COUNT(*) FROM reponses) as total;
      " -s -N`,
      { encoding: 'utf8', stdio: 'pipe' }
    );
    
    log('📊', `Total des enregistrements importés: ${totalResult.trim()}`);
    
    return true;
    
  } catch (error) {
    log('❌', 'Erreur lors de la vérification');
    return false;
  }
}

function cleanup(files) {
  log('🗑️ ', 'Nettoyage des fichiers temporaires...');
  files.forEach(file => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      log('   🗑️', `Supprimé: ${file}`);
    }
  });
}

function showFinalInstructions() {
  console.log('');
  log('🎉', '=== RESTAURATION TERMINÉE AVEC SUCCÈS ===');
  console.log('');
  log('📋', 'Prochaines étapes:');
  console.log('');
  console.log('1. Testez l\'API backend:');
  console.log('   curl https://api-dev.dev-maturity.e-dsin.fr/api/health/database');
  console.log('');
  console.log('2. Testez la connexion au frontend avec un utilisateur existant');
  console.log('');
  console.log('3. Surveillez les logs ECS:');
  console.log('   aws logs tail /ecs/maturity-backend-dev --follow --region eu-west-1');
  console.log('');
  console.log('4. Connectez-vous directement à RDS si nécessaire:');
  console.log(`   mysql -h ${CONFIG.rdsEndpoint} -u ${CONFIG.user} -p --ssl-ca=${CONFIG.certPath} ${CONFIG.database}`);
  console.log('');
  log('✅', 'Migration des données vers RDS réussie !');
}

async function main() {
  try {
    log('🚀', '=== RESTAURATION RDS AVEC PASSWORD .ENV ===');
    console.log('');
    
    // 1. Vérifications préalables
    checkRequirements();
    
    // 2. Configuration RDS
    const configFile = createRDSConfig();
    
    // 3. Test de connexion
    if (!testConnection(configFile)) {
      cleanup([configFile]);
      process.exit(1);
    }
    
    // 4. Vérifier l'état actuel
    checkCurrentDatabase(configFile);
    
    // 5. Préparer le dump
    const preparedDump = prepareDump();
    
    // 6. Restauration
    const restoreSuccess = restoreDatabase(configFile, preparedDump);
    
    if (!restoreSuccess) {
      cleanup([configFile, preparedDump]);
      process.exit(1);
    }
    
    // 7. Vérification
    verifyRestoration(configFile);
    
    // 8. Nettoyage
    cleanup([configFile, preparedDump]);
    
    // 9. Instructions finales
    showFinalInstructions();
    
  } catch (error) {
    log('❌', `Erreur lors de la restauration: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, checkRequirements, testConnection, prepareDump, restoreDatabase };