// server/middlewares/request-logger.js
const morgan = require('morgan');
const logger = require('../utils/logger');

// Format personnalisé pour les logs de requêtes
const requestFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms';

// Création d'un stream pour rediriger les logs de Morgan vers Winston
const stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

// Options de Morgan

const morganOptions = {
  skip: (req) => {
    return req.url === '/health' || 
           req.url.startsWith('/api-docs') ||
           req.url.startsWith('/api/logs');
  }
};

// Middleware pour enregistrer les requêtes HTTP
const requestLogger = morgan(requestFormat, morganOptions);

module.exports = requestLogger;