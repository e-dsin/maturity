// server/middlewares/swagger-middleware.js
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

/**
 * Configure Express pour servir la documentation Swagger
 * @param {express.Application} app - L'application Express
 */
function setupSwaggerDocs(app) {
  try {
    // Chemin vers le fichier Swagger JSON généré
    const swaggerJsonPath = path.join(__dirname, '../../docs/swagger.json');
    const swaggerExists = fs.existsSync(swaggerJsonPath);
    
    if (swaggerExists) {
      // Charger le fichier Swagger généré
      const swaggerDocument = require(swaggerJsonPath);
      
      // Configurer les options de l'interface Swagger UI
      const swaggerUiOptions = {
        explorer: true,
        customCss: '.swagger-ui .topbar { background-color: #0B4E87; }',
        customSiteTitle: "API DevSecOps Maturity",
        customfavIcon: "/favicon.ico",
        swaggerOptions: {
          docExpansion: 'none',
          filter: true,
          defaultModelsExpandDepth: 1,
          defaultModelExpandDepth: 1
        }
      };
      
      // Configurer Swagger UI Express
      app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerUiOptions));
      
      // Servir également les fichiers statiques dans /docs
      app.use('/docs', express.static(path.join(__dirname, '../../docs')));
      
      logger.info('Documentation Swagger configurée avec succès aux points d\'accès /api-docs et /docs');
    } else {
      logger.warn('Fichier Swagger non trouvé. Exécutez d\'abord "npm run generate-docs" pour générer la documentation.');
      
      // Créer une page temporaire pour rediriger vers la génération de docs
      app.use('/api-docs', (req, res) => {
        res.send(`
          <html>
            <head>
              <title>Documentation API non disponible</title>
              <style>
                body { font-family: 'Arial', sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                .message { background-color: #f8d7da; color: #721c24; padding: 20px; border-radius: 5px; }
                code { background-color: #f8f9fa; padding: 2px 4px; border-radius: 3px; }
              </style>
            </head>
            <body>
              <h1>Documentation API non disponible</h1>
              <div class="message">
                <p>La documentation Swagger n'a pas encore été générée.</p>
                <p>Pour générer la documentation, exécutez la commande suivante :</p>
                <code>npm run generate-docs</code>
                <p>Vous pourrez ensuite accéder à cette page pour consulter la documentation API.</p>
              </div>
            </body>
          </html>
        `);
      });
    }
  } catch (error) {
    logger.error('Erreur lors de la configuration de Swagger:', error);
  }
}

module.exports = setupSwaggerDocs;