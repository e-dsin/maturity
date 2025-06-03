// server/middlewares/error-handler.js
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Crée une erreur avec des données supplémentaires
 * @param {string} message - Message d'erreur
 * @param {number} statusCode - Code HTTP (défaut 500)
 * @param {Object} additionalData - Données supplémentaires
 * @returns {Error} Erreur enrichie
 */
const createError = (message, statusCode = 500, additionalData = {}) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errorId = uuidv4();
  
  // Ajouter des données supplémentaires à l'erreur
  Object.keys(additionalData).forEach(key => {
    error[key] = additionalData[key];
  });
  
  return error;
};

/**
 * Middleware de gestion des erreurs pour Express
 */
const errorHandler = (err, req, res, next) => {
  // Détermine le code d'état HTTP à renvoyer
  const statusCode = err.statusCode || res.statusCode === 200 ? 500 : res.statusCode;
  
  // Générer un ID unique pour l'erreur si non existant
  const errorId = err.errorId || uuidv4();
  
  // Collecter le contexte de l'erreur
  const errorContext = {
    errorId,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user ? req.user.id : 'anonymous',
    userAgent: req.headers['user-agent'],
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    timestamp: new Date().toISOString()
  };
  
  // Logger l'erreur avec le contexte
  if (statusCode >= 500) {
    logger.error(`[${errorId}] Erreur serveur: ${err.message}`, errorContext);
  } else if (statusCode >= 400) {
    logger.warn(`[${errorId}] Erreur client: ${err.message}`, errorContext);
  }
  
  // Envoyer la réponse d'erreur formatée
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Une erreur est survenue',
    errorId: errorId,
    // Ne pas exposer la stack trace en production
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

// Middleware pour capturer les erreurs non traitées
const unhandledErrorHandler = (err, req, res, next) => {
  logger.error('Erreur non gérée', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });
  
  // Transmettre l'erreur au gestionnaire d'erreurs standard
  next(err);
};

module.exports = {
  errorHandler,
  unhandledErrorHandler,
  createError
};