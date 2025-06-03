// server/utils/logger.js
const winston = require('winston');
const { format, transports } = winston;
const path = require('path');
const fs = require('fs');

// Création du répertoire de logs s'il n'existe pas
const logDir = path.join(__dirname, '../logs');
try {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
} catch (error) {
  console.error('Erreur lors de la création du répertoire de logs:', error);
}

// Format personnalisé pour les logs
const customFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.splat(),
  format.json()
);

// Création du logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: customFormat,
  defaultMeta: { service: 'maturity-assessment-api' },
  transports: [
    // Logs d'erreur dans un fichier séparé
    new transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Tous les logs combinés
    new transports.File({ 
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Logs de niveau HTTP (pour les requêtes API)
    new transports.File({ 
      filename: path.join(logDir, 'http.log'), 
      level: 'http',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ]
});

// Ajout de la sortie console en développement
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.combine(
      format.colorize(),
      format.simple()
    )
  }));
}

// Ajouter des méthodes utilitaires au logger
logger.logResourceAccess = (resourceType, resourceId, userId) => {
  logger.info(`Accès à ${resourceType} #${resourceId}`, {
    resourceType,
    resourceId,
    userId,
    action: 'access'
  });
};

logger.logResourceCreation = (resourceType, resourceId, userId) => {
  logger.info(`Création de ${resourceType} #${resourceId}`, {
    resourceType,
    resourceId,
    userId,
    action: 'create'
  });
};

logger.logResourceUpdate = (resourceType, resourceId, userId, changes) => {
  logger.info(`Modification de ${resourceType} #${resourceId}`, {
    resourceType,
    resourceId,
    userId,
    changes,
    action: 'update'
  });
};

logger.logResourceDeletion = (resourceType, resourceId, userId) => {
  logger.info(`Suppression de ${resourceType} #${resourceId}`, {
    resourceType,
    resourceId,
    userId,
    action: 'delete'
  });
};

logger.logOperationError = (operation, error, userId = null, resourceType = null, resourceId = null) => {
  const logData = {
    operation,
    errorMessage: error.message,
    errorStack: error.stack,
    action: 'error'
  };
  
  if (userId) logData.userId = userId;
  if (resourceType) logData.resourceType = resourceType;
  if (resourceId) logData.resourceId = resourceId;
  
  logger.error(`Erreur dans l'opération ${operation}`, logData);
};

// Exporter le logger avec ses méthodes utilitaires
module.exports = logger;