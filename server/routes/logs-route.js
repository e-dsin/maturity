// server/routes/logs-route.js
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { createError } = require('../middlewares/error-handler');

/**
 * @swagger
 * /api/logs:
 *   post:
 *     summary: Enregistre les logs du frontend
 *     description: Endpoint pour recevoir et enregistrer les logs provenant de l'application frontend
 *     tags: [Logs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - logs
 *             properties:
 *               logs:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - level
 *                     - message
 *                   properties:
 *                     level:
 *                       type: string
 *                       enum: [DEBUG, INFO, WARN, ERROR]
 *                     message:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                     details:
 *                       type: object
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Logs enregistrés avec succès
 *       400:
 *         description: Format de données invalide
 *       500:
 *         description: Erreur serveur
 */
router.post('/', async (req, res, next) => {
  try {
    const { logs, metadata = {} } = req.body;
    
    if (!logs || !Array.isArray(logs) || logs.length === 0) {
      throw createError('Format de logs invalide', 400);
    }
    
    // Enregistrer les informations de métadonnées
    const clientInfo = {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      ...metadata
    };
    
    // Traiter chaque log
    logs.forEach(log => {
      // Format attendu: { level, message, timestamp, details }
      const { level, message, timestamp, details } = log;
      
      // Valider le format minimal
      if (!level || !message) {
        logger.warn('Format de log client invalide', { log });
        return;
      }
      
      // Enrichir avec les informations client
      const enrichedDetails = {
        ...details,
        client: clientInfo
      };
      
      // Logger selon le niveau approprié
      switch (level) {
        case 'DEBUG':
          logger.debug(`[CLIENT] ${message}`, enrichedDetails);
          break;
        case 'INFO':
          logger.info(`[CLIENT] ${message}`, enrichedDetails);
          break;
        case 'WARN':
          logger.warn(`[CLIENT] ${message}`, enrichedDetails);
          break;
        case 'ERROR':
          logger.error(`[CLIENT] ${message}`, enrichedDetails);
          break;
        default:
          logger.info(`[CLIENT] ${message}`, enrichedDetails);
          break;
      }
    });
    
    res.status(200).json({ success: true, received: logs.length });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/logs/health:
 *   get:
 *     summary: Vérification de l'état du service de logs
 *     tags: [Logs]
 *     responses:
 *       200:
 *         description: Service opérationnel
 */
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

module.exports = router;