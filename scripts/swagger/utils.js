// scripts/swagger/util.js
/**
 * Utilitaires pour la génération de la documentation Swagger
 */
const fs = require('fs');
const path = require('path');
const logger = console;

/**
 * Vérifie si un répertoire existe et le crée s'il n'existe pas
 * @param {string} directory - Chemin du répertoire
 */
function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
    logger.log(`Répertoire créé: ${directory}`);
  }
}

/**
 * Écrit un fichier et crée les répertoires parents si nécessaire
 * @param {string} filePath - Chemin du fichier
 * @param {string} content - Contenu du fichier
 */
function writeFileWithDirs(filePath, content) {
  const dir = path.dirname(filePath);
  ensureDirectoryExists(dir);
  fs.writeFileSync(filePath, content);
  logger.log(`Fichier créé: ${filePath}`);
}

/**
 * Génère la documentation Swagger initiale en créant des fichiers pour chaque route
 * @param {Array<string>} routes - Liste des noms de routes
 * @param {string} targetDir - Répertoire cible pour les fichiers générés
 * @param {function} templateFn - Fonction de génération de modèle pour chaque route
 */
function generateInitialDocs(routes, targetDir, templateFn) {
  ensureDirectoryExists(targetDir);
  
  routes.forEach(route => {
    const content = templateFn(route);
    const filePath = path.join(targetDir, `${route}.js`);
    
    writeFileWithDirs(filePath, content);
  });
  
  logger.log(`Documentation initiale générée dans: ${targetDir}`);
}

/**
 * Génère la page HTML pour visualiser la documentation Swagger
 * @param {string} outputPath - Chemin de sortie pour le fichier HTML
 * @param {string} appName - Nom de l'application
 * @param {string} swaggerJsonPath - Chemin relatif vers le fichier swagger.json
 */
function generateSwaggerHtml(outputPath, appName, swaggerJsonPath = './swagger.json') {
  const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appName || 'Documentation API'}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.18.3/swagger-ui.min.css" />
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Ubuntu', sans-serif;
    }
    .swagger-ui .topbar {
      background-color: #0B4E87;
    }
    .swagger-ui .info .title {
      color: #0B4E87;
    }
    .swagger-ui .btn.execute {
      background-color: #09C4B8;
    }
    .swagger-ui .opblock.opblock-get .opblock-summary-method {
      background-color: #61affe;
    }
    .swagger-ui .opblock.opblock-post .opblock-summary-method {
      background-color: #49cc90;
    }
    .swagger-ui .opblock.opblock-put .opblock-summary-method {
      background-color: #fca130;
    }
    .swagger-ui .opblock.opblock-delete .opblock-summary-method {
      background-color: #f93e3e;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  
  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.18.3/swagger-ui-bundle.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.18.3/swagger-ui-standalone-preset.min.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: "${swaggerJsonPath}",
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        docExpansion: 'none',
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
        displayRequestDuration: true,
        filter: true
      });
    }
  </script>
</body>
</html>
`;

  writeFileWithDirs(outputPath, htmlContent);
  logger.log(`Page HTML générée: ${outputPath}`);
}

module.exports = {
  ensureDirectoryExists,
  writeFileWithDirs,
  generateInitialDocs,
  generateSwaggerHtml
};