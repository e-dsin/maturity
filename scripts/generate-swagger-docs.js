// scripts/generate-swagger-docs.js
/**
 * Script pour générer la documentation Swagger
 * 
 * Ce script:
 * 1. Configure les options Swagger
 * 2. Génère la documentation Swagger initiale si elle n'existe pas
 * 3. Génère les fichiers de documentation en formats JSON et YAML
 * 4. Crée une page HTML pour visualiser la documentation
 */
const fs = require('fs');
const path = require('path');
const swaggerJsDoc = require('swagger-jsdoc');
const yaml = require('js-yaml');
const dotenv = require('dotenv');

// Importer les sous-modules
const swaggerOptions = require('./swagger/config');
const { generateSwaggerTemplate } = require('./swagger/templates');
const { 
  ensureDirectoryExists, 
  writeFileWithDirs, 
  generateInitialDocs,
  generateSwaggerHtml
} = require('./swagger/utils');

// Charger les variables d'environnement
dotenv.config();

// Liste des routes à documenter
const routes = [
  'applications',
  'analyses',
  'interpretations',
  'questionnaires',
  'formulaires',
  'entreprises',
  'historique',
  'stats',
  'questions',
  'reponses',
  'acteurs',
  'permissions',
  'logs'
];

// Répertoire pour les fichiers Swagger dans le projet
const swaggerDir = path.join(__dirname, '../server/swagger');

// Vérifier si le répertoire swagger existe, sinon le créer avec la documentation initiale
if (!fs.existsSync(swaggerDir)) {
  console.log('Répertoire swagger non trouvé, génération de la documentation initiale...');
  ensureDirectoryExists(swaggerDir);
  generateInitialDocs(routes, swaggerDir, generateSwaggerTemplate);
} else {
  console.log('Répertoire swagger trouvé.');
}

// Générer la spécification Swagger
console.log('Génération de la documentation Swagger...');
const swaggerSpec = swaggerJsDoc(swaggerOptions);

// Créer le répertoire de sortie s'il n'existe pas
const outputDir = path.join(__dirname, '../docs');
ensureDirectoryExists(outputDir);

// Chemin pour sauvegarder la spécification Swagger
const swaggerOutputPath = path.join(outputDir, 'swagger.json');
const swaggerYamlOutputPath = path.join(outputDir, 'swagger.yaml');

// Écrire la spécification Swagger en JSON
writeFileWithDirs(swaggerOutputPath, JSON.stringify(swaggerSpec, null, 2));
console.log(`Spécification Swagger JSON générée et sauvegardée dans: ${swaggerOutputPath}`);

// Convertir en YAML
try {
  const swaggerYaml = yaml.dump(swaggerSpec);
  writeFileWithDirs(swaggerYamlOutputPath, swaggerYaml);
  console.log(`Spécification Swagger YAML générée et sauvegardée dans: ${swaggerYamlOutputPath}`);
} catch (error) {
  console.warn('Erreur lors de la génération du fichier YAML:', error);
}

// Création d'une page HTML pour visualiser la documentation
const htmlOutputPath = path.join(outputDir, 'index.html');
const appName = process.env.VITE_APP_NAME || 'Documentation API DevSecOps Maturity';
generateSwaggerHtml(htmlOutputPath, appName);
console.log(`Page HTML pour la documentation générée et sauvegardée dans: ${htmlOutputPath}`);
console.log(`Vous pouvez ouvrir cette page dans un navigateur pour visualiser la documentation`);

// Exporter la spécification pour une utilisation externe
module.exports = swaggerSpec;