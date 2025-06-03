// scripts/generate-all-docs.js
/**
 * Script pour générer toute la documentation API
 * 
 * Ce script exécute les étapes suivantes :
 * 1. Génération de la documentation Swagger
 * 2. Conversion de la documentation Swagger en collection Postman
 */
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Démarrage de la génération de toute la documentation API...');

// Créer le répertoire docs s'il n'existe pas
const docsDir = path.join(__dirname, '../docs');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
  console.log(`📁 Répertoire docs créé: ${docsDir}`);
}

// Fonction pour exécuter un script et attendre sa fin
function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    console.log(`📝 Exécution du script: ${scriptPath}`);
    
    const scriptProcess = exec(`node ${scriptPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Erreur lors de l'exécution de ${scriptPath}:`, error);
        reject(error);
        return;
      }
      
      if (stderr) {
        console.warn(`⚠️ Avertissements lors de l'exécution de ${scriptPath}:`, stderr);
      }
      
      console.log(`✅ Sortie de ${scriptPath}:`, stdout);
      resolve();
    });
    
    // Afficher la sortie en temps réel
    scriptProcess.stdout.on('data', (data) => {
      process.stdout.write(data);
    });
    
    scriptProcess.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}

// Exécuter les scripts de génération en séquence
async function generateAllDocs() {
  try {
    // 1. Générer la documentation Swagger
    await runScript(path.join(__dirname, './generate-swagger-docs.js'));
    
    // 2. Générer la collection Postman
    await runScript(path.join(__dirname, './export-to-postman.js'));
    
    console.log('\n🎉 Génération de toute la documentation terminée avec succès!');
    console.log(`📂 Les fichiers de documentation sont disponibles dans: ${docsDir}`);
    console.log('🔍 Pour consulter la documentation API, ouvrez docs/index.html dans votre navigateur');
    console.log('📋 Pour importer la collection Postman, utilisez le fichier docs/DSIN_Maturity_API.postman_collection.json');
    console.log('🌐 Pour accéder à la documentation via le serveur, démarrez le serveur et accédez à http://localhost:5000/api-docs');
  } catch (error) {
    console.error('❌ Erreur lors de la génération de la documentation:', error);
    process.exit(1);
  }
}

// Lancer la génération
generateAllDocs();