// server/swagger-config.js
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const dotenv = require('dotenv');

// Charger les variables d'environnement
dotenv.config();

// Options de base pour Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: process.env.VITE_APP_NAME || 'Plateforme d\'Évaluation de la Maturité des DSIN',
      version: process.env.VITE_APP_VERSION || '1.0.0',
      description: 'Documentation API pour l\'application d\'évaluation de la maturité DevSecOps',
      contact: {
        name: 'Support API',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: process.env.VITE_API_URL || 'http://localhost:5000/api',
        description: 'Serveur de développement'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{
      bearerAuth: []
    }],
    paths: {
      '/applications': {
        get: {
          summary: 'Récupère la liste des applications',
          tags: ['Applications'],
          responses: {
            '200': {
              description: 'Liste des applications récupérée avec succès',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        idApplication: {
                          type: 'string',
                          description: 'Identifiant unique de l\'application'
                        },
                        nomApplication: {
                          type: 'string',
                          description: 'Nom de l\'application'
                        },
                        statut: {
                          type: 'string',
                          description: 'Statut de l\'application'
                        },
                        hebergement: {
                          type: 'string',
                          description: 'Type d\'hébergement'
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/applications/{idApplication}': {
        get: {
          summary: 'Récupère une application par son ID',
          tags: ['Applications'],
          parameters: [
            {
              name: 'idApplication',
              in: 'path',
              required: true,
              schema: {
                type: 'string'
              },
              description: 'Identifiant de l\'application'
            }
          ],
          responses: {
            '200': {
              description: 'Application récupérée avec succès'
            }
          }
        }
      },
      '/interpretation/application/{idApplication}': {
        get: {
          summary: 'Récupère l\'analyse complète pour une application',
          tags: ['Interpretation'],
          parameters: [
            {
              name: 'idApplication',
              in: 'path',
              required: true,
              schema: {
                type: 'string'
              },
              description: 'Identifiant de l\'application'
            }
          ],
          responses: {
            '200': {
              description: 'Analyse complète récupérée avec succès'
            }
          }
        }
      },
      '/stats/overview': {
        get: {
          summary: 'Récupère un aperçu des statistiques générales',
          tags: ['Statistiques'],
          responses: {
            '200': {
              description: 'Statistiques récupérées avec succès'
            }
          }
        }
      }
    }
  },
  apis: ['./server/swagger/swagger-docs.js'] // Pas besoin de scanner les fichiers car nous définissons les routes directement
};

// Initialiser swagger-jsdoc
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Configurer les options UI
const swaggerUiOptions = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }', // Supprimer la barre supérieure
  customSiteTitle: process.env.VITE_APP_NAME || 'Documentation API'
};

// Fonction pour configurer Swagger dans Express
const setupSwagger = (app) => {
  // Route pour la documentation Swagger
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
  
  // Endpoint pour obtenir le fichier swagger.json
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  
  console.log(`Documentation Swagger disponible à l'URL: http://localhost:${process.env.PORT || 5000}/api-docs`);
};

module.exports = setupSwagger;