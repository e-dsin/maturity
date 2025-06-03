// server/middlewares/auth.js - Version JavaScript
const jwt = require('jsonwebtoken');

/**
 * Middleware d'authentification
 * En mode développement, l'authentification peut être contournée avec DEV_MODE=true dans .env
 */
const authMiddleware = (req, res, next) => {
  // Vérifier si on est en mode développement
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const bypassAuth = process.env.DEV_MODE === 'true';
  
  // Si on est en mode développement et que l'authentification est désactivée
  if (isDevelopment && bypassAuth) {
    console.log('[DEV MODE] Authentification contournée');
    req.user = { id: 'dev-user', role: 'admin' }; // Utilisateur fictif pour le développement
    return next();
  }
  
  try {
    // Récupérer le token depuis les headers
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Accès non autorisé. Token manquant.' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_dev_secret');
    
    // Ajouter l'utilisateur décodé à la requête
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Erreur d\'authentification:', error.message);
    res.status(401).json({ message: 'Accès non autorisé. Token invalide.' });
  }
};

module.exports = authMiddleware;