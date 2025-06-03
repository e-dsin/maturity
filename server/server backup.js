// server/server.js - Version mise à jour avec gestion des permissions
const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const requestLogger = require('./middlewares/request-logger');
const { errorHandler, unhandledErrorHandler } = require('./middlewares/error-handler');
const { authenticateToken, injectPermissions } = require('./middlewares/auth-middleware');
const logger = require('./utils/logger');
const dbConnection = require('./db/dbConnection');
const setupSwaggerDocs = require('./middlewares/swagger-middleware');

// Importer les routes existantes
const questionnairesRoutes = require('./routes/questionnaires-route');
const interpretationRoutes = require('./routes/interpretation-route');
const statsRoutes = require('./routes/stats-route');
const formulairesRoutes = require('./routes/formulaires-route');
const applicationsRoutes = require('./routes/applications-route');
const acteursRoutes = require('./routes/acteurs-route');
const reponsesRoutes = require('./routes/reponses-route');
const permissionsRoutes = require('./routes/permissions-route');
const analysesRoutes = require('./routes/analyses-route');
const historiquesRoutes = require('./routes/historique-route');
const questionsRoutes = require('./routes/questions-route');
const entreprisesRoutes = require('./routes/entreprises-route');
const logsRoutes = require('./routes/logs-route');
const fonctionsRoutes = require('./routes/fonctions-route');
const thematiquesRoutes = require('./routes/thematiques-route');
const maturityModelRoutes = require('./routes/maturity-model-route');
const grilleInterpretationRoutes = require('./routes/grille-interpretation-route');

// Importer les nouvelles routes pour la gestion des permissions
const permissionsManagementRoutes = require('./routes/permissions-management-route');
const authRoutes = require('./routes/auth-route');

// Charger les variables d'environnement
dotenv.config();

// Créer l'application Express
const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares globaux
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware pour les logs de requêtes HTTP
app.use(requestLogger);

// Configurer Swagger
setupSwaggerDocs(app);

// Tester la connexion à la base de données
dbConnection.testConnection()
  .then(connected => {
    if (connected) {
      logger.info('Connexion à la base de données réussie');
    } else {
      logger.error('Échec de la connexion à la base de données');
    }
  })
  .catch(error => {
    logger.error('Erreur lors du test de connexion:', { error: error.message, stack: error.stack });
  });

// Routes publiques (pas d'authentification requise)
app.use('/api/auth', authRoutes);

// Route de santé pour vérifier que le serveur fonctionne
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Le serveur fonctionne correctement',
    timestamp: new Date().toISOString()
  });
});

// Middleware d'authentification pour toutes les routes protégées
app.use('/api', authenticateToken);
app.use('/api', injectPermissions);

// Routes API protégées - avec contrôle d'accès intégré dans chaque route
app.use('/api/questionnaires', questionnairesRoutes);
app.use('/api/interpretations', interpretationRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/formulaires', formulairesRoutes);
app.use('/api/entreprises', entreprisesRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/acteurs', acteursRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/reponses', reponsesRoutes);
app.use('/api/historique', historiquesRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/analyses', analysesRoutes);
app.use('/api/fonctions', fonctionsRoutes);
app.use('/api/thematiques', thematiquesRoutes);
app.use('/api/grille-interpretation', grilleInterpretationRoutes);
app.use('/api/maturity-model', maturityModelRoutes);
app.use('/api/logs', logsRoutes);

// Routes de gestion des permissions (accès restreint aux consultants)
app.use('/api/permissions-management', permissionsManagementRoutes);

// Route pour obtenir les permissions de l'utilisateur connecté
app.get('/api/user/permissions', authenticateToken, async (req, res) => {
  try {
    res.status(200).json({
      user: {
        id_acteur: req.user.id_acteur,
        nom_prenom: req.user.nom_prenom,
        email: req.user.email,
        nom_role: req.user.nom_role,
        niveau_acces: req.user.niveau_acces,
        id_entreprise: req.user.id_entreprise,
        nom_entreprise: req.user.nom_entreprise
      },
      permissions: req.user.permissions || [],
      hasGlobalAccess: req.user.hasGlobalAccess || false
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des permissions utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour obtenir les modules accessibles à l'utilisateur
app.get('/api/user/modules', authenticateToken, async (req, res) => {
  try {
    const modules = req.user.permissions
      .filter(perm => perm.peut_voir)
      .map(perm => ({
        nom_module: perm.nom_module,
        route_base: perm.route_base,
        peut_voir: perm.peut_voir,
        peut_editer: perm.peut_editer,
        peut_supprimer: perm.peut_supprimer,
        peut_administrer: perm.peut_administrer
      }));
    
    res.status(200).json(modules);
  } catch (error) {
    logger.error('Erreur lors de la récupération des modules utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// En mode production, servir les fichiers statiques
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../build', 'index.html'));
  });
}

// Middleware de gestion des erreurs
app.use(unhandledErrorHandler);
app.use(errorHandler);

// Démarrer le serveur
const server = app.listen(PORT, () => {
  logger.info(`Serveur démarré sur le port ${PORT} en mode ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Documentation API disponible à: http://localhost:${PORT}/api-docs`);
});

// Gestion propre de l'arrêt du serveur
process.on('SIGTERM', () => {
  logger.info('Signal SIGTERM reçu. Arrêt du serveur...');
  server.close(() => {
    logger.info('Serveur arrêté avec succès');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('Signal SIGINT reçu. Arrêt du serveur...');
  server.close(() => {
    logger.info('Serveur arrêté avec succès');
    process.exit(0);
  });
});

// Capture des erreurs non gérées au niveau du processus
process.on('uncaughtException', (error) => {
  logger.error('Erreur non capturée au niveau du processus:', { 
    error: error.message, 
    stack: error.stack 
  });
  if (process.env.NODE_ENV === 'production') {
    server.close(() => {
      logger.error('Arrêt du serveur après une erreur non capturée');
      process.exit(1);
    });
    setTimeout(() => {
      logger.error('Arrêt forcé du serveur après timeout');
      process.exit(1);
    }, 10000);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promesse rejetée non gérée:', { 
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : 'Pas de stack trace disponible'
  });
});