// scripts/export-to-postman.js
/**
 * Script pour convertir la documentation Swagger en collection Postman
 * 
 * Ce script:
 * 1. Charge la spécification Swagger générée
 * 2. Convertit la spécification en collection Postman
 * 3. Génère également des environnements Postman pour le développement et la production
 */
const fs = require('fs');
const path = require('path');
const { convert } = require('openapi-to-postmanv2');
const dotenv = require('dotenv');
const { ensureDirectoryExists } = require('./swagger/utils');

// Charger les variables d'environnement
dotenv.config();

// Chemin vers le fichier Swagger JSON généré
const swaggerPath = path.join(__dirname, '../docs/swagger.json');

// Vérifier que le fichier Swagger existe
if (!fs.existsSync(swaggerPath)) {
  console.error('❌ Erreur: Le fichier Swagger n\'existe pas. Exécutez d\'abord "npm run generate-swagger"');
  process.exit(1);
}

// Charger la spécification Swagger
const swaggerSpec = JSON.parse(fs.readFileSync(swaggerPath, 'utf8'));

// Créer le répertoire de sortie s'il n'existe pas
const outputDir = path.join(__dirname, '../docs');
ensureDirectoryExists(outputDir);

// Options pour la conversion
const options = {
  folderStrategy: 'Tags',
  includeAuthInfoInExample: true,
  requestParametersResolution: 'Example',
  schemaFaker: true,
  indentCharacter: '  ',
  requestNameSource: 'Summary'
};

console.log('🔄 Conversion de la documentation Swagger en collection Postman...');

// Convertir Swagger en Postman Collection
convert(
  { type: 'json', data: swaggerSpec },
  options,
  (err, conversionResult) => {
    if (err) {
      console.error('❌ Erreur lors de la conversion:', err);
      return;
    }

    if (!conversionResult.result) {
      console.error('❌ Erreur lors de la conversion:', conversionResult.reason);
      return;
    }

    // Chemin pour sauvegarder la collection Postman
    const postmanOutputPath = path.join(outputDir, 'DSIN_Maturity_API.postman_collection.json');

    // Personnaliser la collection avec les environnements
    const collection = conversionResult.output[0].data;
    
    // Ajouter des informations supplémentaires à la collection
    collection.info.description = "Collection Postman pour l'API d'évaluation de la maturité DSIN";
    collection.info.name = "DSIN Maturity Assessment API";
    
    // Ajouter des variables à la collection
    if (!collection.variable) {
      collection.variable = [];
    }
    
    collection.variable.push({
      key: "baseUrl",
      value: "{{baseUrl}}",
      type: "string"
    });
    
    // Mettre à jour les URLs dans la collection pour utiliser la variable baseUrl
    // Cette fonction est récursive pour parcourir tous les dossiers et requêtes
    const updateUrlsWithVariables = (item) => {
      if (item.request && item.request.url) {
        // Mettre à jour l'URL de la requête pour utiliser la variable baseUrl
        if (typeof item.request.url === 'string') {
          item.request.url = item.request.url.replace(/https?:\/\/[^\/]+/, '{{baseUrl}}');
        } else if (item.request.url.raw) {
          item.request.url.raw = item.request.url.raw.replace(/https?:\/\/[^\/]+/, '{{baseUrl}}');
          
          // Mettre à jour le host également si présent
          if (item.request.url.host) {
            item.request.url.host = ['{{baseUrl}}'];
          }
        }
      }
      
      // Récursivement mettre à jour les éléments dans les dossiers
      if (item.item && Array.isArray(item.item)) {
        item.item.forEach(subItem => updateUrlsWithVariables(subItem));
      }
    };
    
    // Appliquer la mise à jour des URLs à toute la collection
    if (collection.item && Array.isArray(collection.item)) {
      collection.item.forEach(item => updateUrlsWithVariables(item));
    }
    
    // Écrire la collection Postman dans un fichier
    fs.writeFileSync(
      postmanOutputPath,
      JSON.stringify(collection, null, 2)
    );

    console.log(`✅ Collection Postman générée et sauvegardée dans: ${postmanOutputPath}`);
    
    // Créer un environnement Postman pour le développement local
    const devEnvironment = {
      id: "dev-environment",
      name: "Environnement de développement",
      values: [
        {
          key: "baseUrl",
          value: "http://localhost:5000/api",
          enabled: true
        },
        {
          key: "token",
          value: "",
          enabled: true
        }
      ],
      _postman_variable_scope: "environment"
    };
    
    // Créer un environnement Postman pour la production
    const prodEnvironment = {
      id: "prod-environment",
      name: "Environnement de production",
      values: [
        {
          key: "baseUrl",
          value: process.env.VITE_API_URL || "https://api.example.com/api",
          enabled: true
        },
        {
          key: "token",
          value: "",
          enabled: true
        }
      ],
      _postman_variable_scope: "environment"
    };
    
    // Écrire les environnements dans des fichiers
    fs.writeFileSync(
      path.join(outputDir, 'DSIN_Maturity_DEV_Environment.postman_environment.json'),
      JSON.stringify(devEnvironment, null, 2)
    );
    
    fs.writeFileSync(
      path.join(outputDir, 'DSIN_Maturity_PROD_Environment.postman_environment.json'),
      JSON.stringify(prodEnvironment, null, 2)
    );
    
    console.log(`✅ Environnements Postman générés dans le répertoire: ${outputDir}`);
    console.log('📝 Vous pouvez maintenant importer ces fichiers dans Postman en utilisant la fonction "Import".');
  }
);