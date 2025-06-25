// server/server.js - Version corrigée pour RDS avec endpoints health complets
const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Charger les variables d'environnement en premier
dotenv.config();

// Affichage des informations de démarrage
console.log('🚀 === DÉMARRAGE SERVEUR RDS ===');
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', process.env.PORT);
console.log('DB Host:', process.env.DB_HOST ? 'Configuré' : 'Non configuré');
console.log('Frontend URL:', process.env.FRONTEND_URL);
console.log('SSL DB:', process.env.DB_SSL_DISABLED === 'true' ? 'Désactivé' : 'Activé');
console.log('====================================');

// Créer l'application Express
const app = express();
const PORT = process.env.PORT || 3000; // Corrigé : 3000 pour ECS

// === CONFIGURATION CORS ===
app.use((req, res, next) => {
  // Headers CORS permissifs
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, X-Auth-Token');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Log pour debug (seulement pour les routes non-health pour éviter le spam)
  if (!req.path.includes('/health')) {
    console.log(`🌐 ${req.method} ${req.path} - Origin: ${req.headers.origin || 'None'}`);
  }
  
  // Répondre aux requests OPTIONS immédiatement
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Middlewares de base
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// === ROUTES DE SANTÉ INTÉGRÉES (PRIORITÉ ABSOLUE) ===
console.log('🔄 Configuration des routes de santé intégrées...');

// Health check basique (pour ALB et ECS)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Serveur fonctionnel',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    version: '1.0.0'
  });
});

// Health check simple
app.get('/health-simple', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Le serveur fonctionne correctement',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: process.env.DB_HOST ? 'configured' : 'not configured'
  });
});

// Health check détaillé avec info base de données
app.get('/api/health', (req, res) => {
  const healthInfo = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    server: {
      port: PORT,
      nodeVersion: process.version,
      platform: process.platform,
      memory: process.memoryUsage()
    },
    database: {
      configured: !!process.env.DB_HOST,
      host: process.env.DB_HOST ? 'configured' : 'not configured',
      ssl: process.env.DB_SSL_DISABLED !== 'true'
    },
    services: {
      cors: 'enabled',
      routes: 'loaded'
    }
  };
  
  res.status(200).json(healthInfo);
});

// Health check base de données
app.get('/api/health/database', async (req, res) => {
  try {
    // Tentative de connexion à la base de données
    let dbConnection = null;
    let dbStatus = {
      status: 'ERROR',
      connected: false,
      error: 'Database connection not configured'
    };

    if (process.env.DB_HOST) {
      try {
        // Essayer de charger la connexion DB si elle existe
        try {
          const dbModule = require('./db/dbConnection');
          if (dbModule && dbModule.pool) {
            // Tester la connexion
            const connection = await dbModule.pool.getConnection();
            const [rows] = await connection.query('SELECT 1 as test, NOW() as timestamp, VERSION() as version');
            connection.release();
            
            dbStatus = {
              status: 'OK',
              connected: true,
              host: process.env.DB_HOST,
              timestamp: rows[0].timestamp,
              version: rows[0].version,
              ssl: process.env.DB_SSL_DISABLED !== 'true'
            };
            
            // Log de succès
            if (!global.dbLoggedSuccess) {
              console.log('✅ Connexion RDS établie avec succès !');
              console.log(`   Version MySQL: ${rows[0].version}`);
              console.log(`   Timestamp: ${rows[0].timestamp}`);
              console.log('🎉 Base de données prête !');
              global.dbLoggedSuccess = true;
            }
            
          } else {
            throw new Error('Database module not properly loaded');
          }
        } catch (dbError) {
          dbStatus = {
            status: 'ERROR',
            connected: false,
            error: dbError.message,
            host: process.env.DB_HOST
          };
        }
      } catch (moduleError) {
        dbStatus = {
          status: 'WARNING',
          connected: false,
          error: 'Database module not found, but host configured',
          host: process.env.DB_HOST,
          note: 'Server running without database module'
        };
      }
    }

    const statusCode = dbStatus.status === 'OK' ? 200 : (dbStatus.status === 'WARNING' ? 200 : 503);
    
    res.status(statusCode).json({
      database: dbStatus,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });

  } catch (error) {
    console.error('❌ Erreur health check database:', error.message);
    res.status(503).json({
      database: {
        status: 'ERROR',
        connected: false,
        error: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Health check détaillé complet
app.get('/api/health/detailed', (req, res) => {
  const detailedHealth = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    server: {
      uptime: process.uptime(),
      uptimeFormatted: formatUptime(process.uptime()),
      port: PORT,
      environment: process.env.NODE_ENV,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      memory: {
        ...process.memoryUsage(),
        formatted: {
          rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
          heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
          heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`
        }
      }
    },
    configuration: {
      database: {
        host: process.env.DB_HOST ? 'configured' : 'not configured',
        ssl: process.env.DB_SSL_DISABLED !== 'true',
        port: process.env.DB_PORT || '3306'
      },
      frontend: {
        url: process.env.FRONTEND_URL || 'not configured',
        cors: 'enabled'
      },
      logging: {
        level: process.env.LOG_LEVEL || 'info'
      }
    },
    endpoints: {
      health: '/health',
      healthSimple: '/health-simple', 
      healthApi: '/api/health',
      healthDatabase: '/api/health/database',
      healthDetailed: '/api/health/detailed',
      testCors: '/api/test-cors',
      authLogin: 'POST /api/auth/login',
      userPermissions: '/api/user/permissions'
    }
  };

  res.status(200).json(detailedHealth);
});

// Helper function pour formater l'uptime
function formatUptime(uptimeSeconds) {
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = Math.floor(uptimeSeconds % 60);
  return `${hours}h ${minutes}m ${seconds}s`;
}

console.log('✅ Routes de santé configurées: /health, /health-simple, /api/health, /api/health/database, /api/health/detailed');

// === ROUTES DE TEST ===
app.get('/api/test-cors', (req, res) => {
  res.json({ 
    message: 'CORS fonctionne!', 
    origin: req.get('Origin') || 'no-origin',
    timestamp: new Date().toISOString(),
    method: req.method,
    headers: {
      origin: req.get('Origin'),
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer')
    }
  });
});

// === FONCTION HELPER POUR CHARGER LES ROUTES ===
function safeLoadRoute(routeName) {
  try {
    const routePath = `./routes/${routeName}.js`;
    console.log(`🔄 Chargement: ${routeName} depuis ${routePath}`);
    
    // Supprimer du cache pour éviter les problèmes de rechargement
    delete require.cache[require.resolve(routePath)];
    
    // Charger la route
    const route = require(routePath);
    
    // Vérifier que c'est bien un router Express
    if (typeof route === 'function' || (route && typeof route.use === 'function')) {
      console.log(`✅ Route ${routeName} chargée avec succès`);
      return route;
    } else {
      console.log(`⚠️ Route ${routeName} n'exporte pas un router Express valide:`, typeof route);
      return null;
    }
  } catch (error) {
    console.log(`❌ Erreur lors du chargement de ${routeName}:`, error.message);
    return null;
  }
}

// === CHARGEMENT DES ROUTES EXISTANTES ===
console.log('\n🔄 === CHARGEMENT DES ROUTES ===');

const routesToLoad = [
  // Routes d'authentification (priorité)
  { name: 'auth-route', mount: '/api/auth' },
  { name: 'user-permissions-route', mount: '/api/user' },
  { name: 'admin-unified-route', mount: '/api/admin'},
  
  // Routes principales existantes
  { name: 'entreprises-route', mount: '/api/entreprises' },
  { name: 'acteurs-route', mount: '/api/acteurs' },
  { name: 'questionnaires-route', mount: '/api/questionnaires' },
  { name: 'questionnaire-thematiques-route', mount: '/api/questionnaire-thematiques' },
  { name: 'formulaires-route', mount: '/api/formulaires' },
  { name: 'applications-route', mount: '/api/applications' },
  { name: 'analyses-route', mount: '/api/analyses' },
  { name: 'fonctions-route', mount: '/api/fonctions' },
  { name: 'thematiques-route', mount: '/api/thematiques' },
  { name: 'permissions-route', mount: '/api/permissions' },
  { name: 'questions-route', mount: '/api/questions' },
  { name: 'reponses-route', mount: '/api/reponses' },
  { name: 'historique-route', mount: '/api/historique' },
  { name: 'interpretation-route', mount: '/api/interpretations' },
  { name: 'stats-route', mount: '/api/stats' },
  { name: 'logs-route', mount: '/api/logs' },
  { name: 'maturity-model-route', mount: '/api/maturity-model' },
  { name: 'grille-interpretation-route', mount: '/api/grille-interpretation' },
  { name: 'permissions-management-route', mount: '/api/permissions-management' },
    { name: 'benchmark-route', mount: '/api/benchmark' }
];

let loadedRoutes = 0;
let totalRoutes = routesToLoad.length;

routesToLoad.forEach(({ name, mount }) => {
  const route = safeLoadRoute(name);
  if (route) {
    app.use(mount, route);
    loadedRoutes++;
  }
});

console.log(`📊 Routes chargées: ${loadedRoutes}/${totalRoutes}`);

// === ROUTES TEMPORAIRES POUR AUTHENTIFICATION ===
if (loadedRoutes === 0 || !safeLoadRoute('auth-route')) {
  console.log('⚠️ Routes d\'auth non trouvées, utilisation des routes temporaires...');
  
  // Routes d'authentification temporaires
  app.post('/api/auth/login', (req, res) => {
    console.log('🔐 Tentative de login (route temporaire):', req.body?.email);
    
    if (req.body?.email && req.body?.password) {
      const mockUser = {
        id_acteur: 'temp-' + Date.now(),
        nom_prenom: 'Utilisateur Temporaire',
        email: req.body.email,
        role: 'Admin',
        organisation: 'Test Org',
        anciennete_role: 1,
        nom_role: 'CONSULTANT',
        permissions: [
          { nom_module: 'ENTREPRISES', route_base: '/entreprises', peut_voir: true, peut_editer: true, peut_supprimer: true, peut_administrer: true },
          { nom_module: 'APPLICATIONS', route_base: '/applications', peut_voir: true, peut_editer: true, peut_supprimer: true, peut_administrer: true },
          { nom_module: 'ANALYSES', route_base: '/analyses', peut_voir: true, peut_editer: true, peut_supprimer: true, peut_administrer: true },
          { nom_module: 'USERS', route_base: '/users', peut_voir: true, peut_editer: true, peut_supprimer: true, peut_administrer: true }
        ]
      };
      
      const mockPermissions = [
        { nom_module: 'ENTREPRISES', route_base: '/entreprises', peut_voir: true, peut_editer: true, peut_supprimer: true, peut_administrer: true },
        { nom_module: 'APPLICATIONS', route_base: '/applications', peut_voir: true, peut_editer: true, peut_supprimer: true, peut_administrer: true },
        { nom_module: 'ANALYSES', route_base: '/analyses', peut_voir: true, peut_editer: true, peut_supprimer: true, peut_administrer: true },
        { nom_module: 'USERS', route_base: '/users', peut_voir: true, peut_editer: true, peut_supprimer: true, peut_administrer: true }
      ];
      
      res.json({
        user: mockUser,
        permissions: mockPermissions,
        hasGlobalAccess: true,
        token: 'mock-jwt-token-' + Date.now() // Ajout d'un token mock
      });
    } else {
      res.status(400).json({ message: 'Email et mot de passe requis' });
    }
  });

  app.get('/api/user/permissions', (req, res) => {
    const mockUser = {
      id_acteur: 'temp-user',
      nom_prenom: 'Utilisateur Test',
      email: 'test@example.com',
      role: 'Admin'
    };
    
    const mockPermissions = [
      { nom_module: 'ENTREPRISES', route_base: '/entreprises', peut_voir: true, peut_editer: true, peut_supprimer: true, peut_administrer: true },
      { nom_module: 'APPLICATIONS', route_base: '/applications', peut_voir: true, peut_editer: true, peut_supprimer: true, peut_administrer: true },
      { nom_module: 'ANALYSES', route_base: '/analyses', peut_voir: true, peut_editer: true, peut_supprimer: true, peut_administrer: true },
      { nom_module: 'USERS', route_base: '/users', peut_voir: true, peut_editer: true, peut_supprimer: true, peut_administrer: true }
    ];
    
    res.json({
      user: mockUser,
      permissions: mockPermissions,
      hasGlobalAccess: true
    });
  });
}

console.log('=================================\n');

// === GESTION DES ERREURS ===
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', {
    message: err.message,
    path: req.path,
    method: req.method,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
  
  res.status(500).json({ 
    message: 'Erreur serveur interne',
    path: req.path,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../build');
  const indexPath = path.resolve(buildPath, 'index.html');
  const fs = require('fs');
  
  // Vérifier si le dossier build ET index.html existent
  if (fs.existsSync(buildPath) && fs.existsSync(indexPath)) {
    console.log('📁 Serveur de fichiers statiques activé:', buildPath);
    app.use(express.static(buildPath));
    
    // Route catch-all pour SPA (Single Page Application)
    app.get('*', (req, res) => {
      // Éviter de servir l'index.html pour les routes API et health
      if (req.path.startsWith('/api/') || req.path.startsWith('/health')) {
        return res.status(404).json({ 
          message: 'Route API non trouvée',
          path: req.path,
          availableEndpoints: ['/health', '/api/health', '/api/health/database', '/api/auth/login']
        });
      }
      
      // Servir index.html seulement s'il existe
      res.sendFile(indexPath);
    });
  } else {
    console.log('⚠️ Frontend non disponible - mode API seulement');
    console.log(`   Build path: ${buildPath} - ${fs.existsSync(buildPath) ? 'EXISTS' : 'MISSING'}`);
    console.log(`   Index file: ${indexPath} - ${fs.existsSync(indexPath) ? 'EXISTS' : 'MISSING'}`);
    
    // Route catch-all pour mode API seulement
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/health')) {
        return res.status(404).json({ 
          message: 'Route API non trouvée',
          path: req.path,
          availableEndpoints: {
            health: ['/health', '/health-simple', '/api/health', '/api/health/database', '/api/health/detailed'],
            auth: ['POST /api/auth/login', 'GET /api/user/permissions'],
            test: ['/api/test-cors']
          }
        });
      }
      
      // Pour toutes les autres routes, retourner l'info de l'API
      res.status(200).json({
        message: 'API Backend Maturity Assessment',
        status: 'running',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        mode: 'API_ONLY',
        frontend: 'not available',
        endpoints: {
          health: {
            basic: '/health',
            simple: '/health-simple',
            api: '/api/health',
            database: '/api/health/database',
            detailed: '/api/health/detailed'
          },
          auth: {
            login: 'POST /api/auth/login',
            permissions: 'GET /api/user/permissions'
          },
          test: {
            cors: '/api/test-cors'
          }
        },
        loadedRoutes: `${loadedRoutes}/${totalRoutes}`
      });
    });
  }
}

// === DÉMARRAGE DU SERVEUR ===
const server = app.listen(PORT, () => {
  console.log('\n🚀 ===============================');
  console.log(`✅ Serveur RDS démarré sur le port ${PORT}`);
  console.log(`🌐 CORS configuré pour: ${process.env.FRONTEND_URL || 'toutes origines'}`);
  console.log(`📊 Routes chargées: ${loadedRoutes}/${totalRoutes}`);
  console.log('📍 Routes de santé disponibles:');
  console.log(`   ❤️ Santé basique: http://localhost:${PORT}/health`);
  console.log(`   ❤️ Santé simple: http://localhost:${PORT}/health-simple`);
  console.log(`   🩺 Santé API: http://localhost:${PORT}/api/health`);
  console.log(`   🏥 Santé DB: http://localhost:${PORT}/api/health/database`);
  console.log(`   🔍 Santé détaillée: http://localhost:${PORT}/api/health/detailed`);
  console.log(`   🧪 Test CORS: http://localhost:${PORT}/api/test-cors`);
  console.log('📍 Routes d\'authentification temporaires:');
  console.log(`   🔐 Login: POST http://localhost:${PORT}/api/auth/login`);
  console.log(`   🔑 Permissions: GET http://localhost:${PORT}/api/user/permissions`);
  console.log('===============================\n');
});

// Gestion propre de l'arrêt
process.on('SIGTERM', () => {
  console.log('Signal SIGTERM reçu. Arrêt du serveur...');
  server.close(() => {
    console.log('Serveur arrêté avec succès');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Signal SIGINT reçu. Arrêt du serveur...');
  server.close(() => {
    console.log('Serveur arrêté avec succès');
    process.exit(0);
  });
});

module.exports = app;