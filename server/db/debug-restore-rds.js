// debug-restore-rds.js - Script de diagnostic et restauration
const { execSync } = require('child_process');
const fs = require('fs');

async function checkLocalDump(dumpFile) {
  console.log(`🔍 Analyse du dump local: ${dumpFile}`);
  
  if (!fs.existsSync(dumpFile)) {
    console.log('❌ Fichier dump non trouvé !');
    return false;
  }
  
  const stats = fs.statSync(dumpFile);
  console.log(`📊 Taille du dump: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  
  // Lire les premières lignes
  const content = fs.readFileSync(dumpFile, 'utf8');
  const lines = content.split('\n');
  
  console.log(`📄 Nombre de lignes: ${lines.length}`);
  
  // Chercher les CREATE TABLE
  const createTables = lines.filter(line => line.includes('CREATE TABLE'));
  console.log(`🏗️  Tables trouvées: ${createTables.length}`);
  createTables.forEach(table => {
    const match = table.match(/CREATE TABLE `?(\w+)`?/);
    if (match) console.log(`   - ${match[1]}`);
  });
  
  // Chercher les INSERT
  const inserts = lines.filter(line => line.includes('INSERT INTO'));
  console.log(`📥 Statements INSERT trouvés: ${inserts.length}`);
  
  if (createTables.length === 0) {
    console.log('⚠️  Aucune table trouvée dans le dump !');
    return false;
  }
  
  return true;
}

async function createMinimalSchema() {
  console.log('🏗️  Création du schéma minimal...');
  
  const schemaSQL = `
-- Schéma minimal pour maturity_assessment
USE maturity_assessment;

-- Table des entreprises
CREATE TABLE IF NOT EXISTS entreprises (
    id_entreprise VARCHAR(36) PRIMARY KEY,
    nom_entreprise VARCHAR(100) NOT NULL,
    secteur VARCHAR(50) NOT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table des acteurs (utilisateurs)
CREATE TABLE IF NOT EXISTS acteurs (
    id_acteur VARCHAR(36) PRIMARY KEY,
    nom_prenom VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    organisation VARCHAR(50) NOT NULL,
    id_entreprise VARCHAR(36),
    anciennete_role INT NOT NULL,
    email VARCHAR(100) UNIQUE,
    mot_de_passe VARCHAR(255),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_entreprise) REFERENCES entreprises(id_entreprise)
);

-- Table des applications
CREATE TABLE IF NOT EXISTS applications (
    id_application VARCHAR(36) PRIMARY KEY,
    nom_application VARCHAR(100) NOT NULL,
    statut ENUM('Projet','Run') NOT NULL,
    type ENUM('Build','Buy') NOT NULL,
    hebergement ENUM('Cloud','Prem','Hybrid') NOT NULL,
    architecture_logicielle ENUM('ERP','Multitenant SAAS','MVC','Monolithique') NOT NULL,
    id_entreprise VARCHAR(36),
    date_mise_en_prod DATE,
    language VARCHAR(50),
    editeur VARCHAR(50),
    description TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_entreprise) REFERENCES entreprises(id_entreprise)
);

-- Table des fonctions
CREATE TABLE IF NOT EXISTS fonctions (
    id_fonction VARCHAR(36) PRIMARY KEY,
    nom VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insérer les données de test
INSERT IGNORE INTO entreprises (id_entreprise, nom_entreprise, secteur) VALUES
('test-123', 'Entreprise Test', 'IT'),
('demo-456', 'Demo Corp', 'Finance');

INSERT IGNORE INTO acteurs (id_acteur, nom_prenom, role, organisation, id_entreprise, anciennete_role, email) VALUES
('admin-1', 'Admin Test', 'Admin', 'IT', 'test-123', 5, 'admin@test.com'),
('user-1', 'User Demo', 'Utilisateur', 'Dev', 'test-123', 2, 'user@test.com');

SELECT 'Schema minimal créé avec succès' as status;
`;

  fs.writeFileSync('minimal-schema.sql', schemaSQL);
  console.log('✅ Fichier minimal-schema.sql créé');
  return 'minimal-schema.sql';
}

async function testRDSConnection() {
  console.log('🔌 Test de connexion RDS...');
  
  const endpoint = 'maturitybackend-dev-databaseb269d8bb-7h9b2e16ryhv.cd6w86yy2wyp.eu-west-1.rds.amazonaws.com';
  const certPath = './eu-west-1-bundle.pem';
  
  // Configuration MariaDB pour RDS
  const configContent = `[client]
host=${endpoint}
port=3306
user=admin
ssl-ca=${certPath}
ssl
ssl-verify-server-cert=false
default-character-set=utf8mb4
connect_timeout=60`;
  
  const configFile = `.my_test_${Date.now()}.cnf`;
  fs.writeFileSync(configFile, configContent, { mode: 0o600 });
  
  try {
    // Test basique
    console.log('   Connexion...');
    const testResult = execSync(
      `mysql --defaults-file=${configFile} -e "SELECT 'Connexion OK' as status, VERSION() as version;"`,
      { encoding: 'utf8', stdio: 'pipe' }
    );
    console.log('✅ Connexion RDS réussie');
    console.log(testResult);
    
    // Test base maturity_assessment
    console.log('   Test de la base maturity_assessment...');
    const dbTest = execSync(
      `mysql --defaults-file=${configFile} maturity_assessment -e "SELECT 'Base accessible' as status; SHOW TABLES;"`,
      { encoding: 'utf8', stdio: 'pipe' }
    );
    console.log(dbTest);
    
    return configFile;
    
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);
    throw error;
  } finally {
    // Nettoyer le fichier de config
    if (fs.existsSync(configFile)) {
      fs.unlinkSync(configFile);
    }
  }
}

async function restoreWithDebug(dumpFile, configFile) {
  console.log(`🔄 Restauration avec debug: ${dumpFile}`);
  
  try {
    // Restauration avec logs détaillés
    console.log('   Début de restauration...');
    const restoreCommand = `mysql --defaults-file=${configFile} maturity_assessment --verbose < ${dumpFile}`;
    
    execSync(restoreCommand, { 
      stdio: 'inherit'  // Afficher tous les détails
    });
    
    console.log('✅ Restauration terminée');
    
    // Vérification immédiate
    console.log('🔍 Vérification post-restauration...');
    const verifyResult = execSync(
      `mysql --defaults-file=${configFile} maturity_assessment -e "
        SHOW TABLES;
        SELECT 'Entreprises:' as Info, COUNT(*) as Count FROM entreprises;
        SELECT 'Acteurs:' as Info, COUNT(*) as Count FROM acteurs;
      "`,
      { encoding: 'utf8', stdio: 'pipe' }
    );
    
    console.log(verifyResult);
    
  } catch (error) {
    console.error('❌ Erreur lors de la restauration:', error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 === DIAGNOSTIC ET RESTAURATION RDS ===\n');
    
    // 1. Vérifier le dump local
    const dumpFile = 'backup_20250608T084838.sql';
    const dumpValid = await checkLocalDump(dumpFile);
    
    if (!dumpValid) {
      console.log('\n⚠️  Le dump local semble vide ou corrompu');
      console.log('🔧 Création d\'un schéma minimal pour test...');
      
      const minimalSchema = await createMinimalSchema();
      
      // Test de connexion
      const configFile = await testRDSConnection();
      
      // Restaurer le schéma minimal
      await restoreWithDebug(minimalSchema, configFile);
      
    } else {
      console.log('\n✅ Dump local valide');
      
      // Test de connexion
      const configFile = await testRDSConnection();
      
      // Re-restaurer le dump original avec debug
      await restoreWithDebug(dumpFile, configFile);
    }
    
    console.log('\n🎉 Diagnostic et restauration terminés !');
    
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    
    // Suggestions
    console.log('\n💡 Suggestions:');
    console.log('1. Vérifiez que votre base locale contenait bien des données');
    console.log('2. Re-créez un dump avec --verbose pour plus de détails');
    console.log('3. Testez la restauration locale pour valider le dump');
    console.log('4. Utilisez le schéma minimal pour commencer');
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkLocalDump, createMinimalSchema, testRDSConnection, restoreWithDebug };