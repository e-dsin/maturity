// vite-plugin-logger.js
const fs = require('fs');
const path = require('path');

/**
 * Plugin Vite pour enregistrer les logs du serveur de développement
 */
function viteLoggerPlugin() {
  const logDir = path.resolve(__dirname, 'logs');
  const devLogPath = path.join(logDir, 'vite-dev.log');
  const buildLogPath = path.join(logDir, 'vite-build.log');
  
  // Créer le répertoire de logs s'il n'existe pas
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  // Stream de logs pour le développement
  let devLogStream = null;
  
  // Formater le message avec horodatage
  const formatMessage = (message) => {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] ${message}\n`;
  };
  
  return {
    name: 'vite-plugin-logger',
    
    configureServer(server) {
      // Ouvrir le stream de logs
      devLogStream = fs.createWriteStream(devLogPath, { flags: 'a' });
      
      // Intercepter les logs du serveur de développement
      const originalInfo = server.config.logger.info;
      const originalWarn = server.config.logger.warn;
      const originalError = server.config.logger.error;
      
      // Remplacer les méthodes de log
      server.config.logger.info = (msg, ...args) => {
        devLogStream.write(formatMessage(`[INFO] ${msg}`));
        originalInfo(msg, ...args);
      };
      
      server.config.logger.warn = (msg, ...args) => {
        devLogStream.write(formatMessage(`[WARN] ${msg}`));
        originalWarn(msg, ...args);
      };
      
      server.config.logger.error = (msg, ...args) => {
        devLogStream.write(formatMessage(`[ERROR] ${msg}`));
        originalError(msg, ...args);
      };
      
      // Nettoyer à la fermeture
      server.httpServer.on('close', () => {
        if (devLogStream) {
          devLogStream.end();
        }
      });
    },
    
    // Logs pour la construction
    buildStart() {
      fs.appendFileSync(buildLogPath, formatMessage(`[BUILD] Début de la construction`));
    },
    
    buildEnd(err) {
      if (err) {
        fs.appendFileSync(buildLogPath, formatMessage(`[BUILD] Erreur lors de la construction: ${err}`));
      } else {
        fs.appendFileSync(buildLogPath, formatMessage(`[BUILD] Construction terminée avec succès`));
      }
    },
    
    closeBundle() {
      fs.appendFileSync(buildLogPath, formatMessage(`[BUILD] Bundle fermé, construction terminée`));
    }
  };
}

module.exports = viteLoggerPlugin;