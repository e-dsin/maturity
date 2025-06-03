// server/middlewares/auth-middleware.js
const { pool } = require('../db/dbConnection');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// Middleware d'authentification JWT
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Token d\'accès requis' });
    }

    // Vérifier le token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
    
    // Récupérer les informations complètes de l'utilisateur
    const [users] = await pool.query(`
      SELECT a.*, r.nom_role, r.niveau_acces, e.nom_entreprise
      FROM acteurs a
      JOIN roles r ON a.id_role = r.id_role
      LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
      WHERE a.id_acteur = ?
    `, [decoded.id_acteur]);

    if (users.length === 0) {
      return res.status(401).json({ message: 'Utilisateur non trouvé' });
    }

    req.user = users[0];
    next();
  } catch (error) {
    logger.error('Erreur d\'authentification:', error);
    return res.status(403).json({ message: 'Token invalide' });
  }
};

// Middleware de vérification des permissions
const checkPermission = (module, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Utilisateur non authentifié' });
      }

      const { id_acteur, niveau_acces, id_entreprise } = req.user;
      
      // Les consultants ont accès global
      if (niveau_acces === 'GLOBAL') {
        req.user.hasGlobalAccess = true;
        return next();
      }

      // Vérifier les permissions via la procédure stockée
      const [results] = await pool.query(
        'CALL verifier_permission_utilisateur(?, ?, ?, ?, @autorise)',
        [id_acteur, module, action, req.params.entrepriseId || id_entreprise]
      );
      
      const [permission] = await pool.query('SELECT @autorise as autorise');
      
      if (!permission[0].autorise) {
        return res.status(403).json({ 
          message: 'Accès non autorisé à ce module ou cette action' 
        });
      }

      // Ajouter le contexte entreprise pour filtrer les données
      req.user.entrepriseFilter = id_entreprise;
      req.user.hasGlobalAccess = false;
      
      next();
    } catch (error) {
      logger.error('Erreur de vérification des permissions:', error);
      return res.status(500).json({ message: 'Erreur de vérification des permissions' });
    }
  };
};

// Middleware pour filtrer les données par entreprise
const filterByEntreprise = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Utilisateur non authentifié' });
  }

  // Si l'utilisateur a un accès global, pas de filtre
  if (req.user.hasGlobalAccess) {
    return next();
  }

  // Ajouter le filtre entreprise aux requêtes
  req.entrepriseFilter = req.user.id_entreprise;
  next();
};

// Helper pour vérifier une permission spécifique
const hasPermission = async (userId, module, action, entrepriseId = null) => {
  try {
    const [results] = await pool.query(
      'CALL verifier_permission_utilisateur(?, ?, ?, ?, @autorise)',
      [userId, module, action, entrepriseId]
    );
    
    const [permission] = await pool.query('SELECT @autorise as autorise');
    return permission[0].autorise;
  } catch (error) {
    logger.error('Erreur lors de la vérification de permission:', error);
    return false;
  }
};

// Middleware pour les rôles spécifiques
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    if (!roles.includes(req.user.nom_role)) {
      return res.status(403).json({ 
        message: `Accès réservé aux rôles: ${roles.join(', ')}` 
      });
    }

    next();
  };
};

// Middleware pour les consultants uniquement
const requireConsultant = requireRole('CONSULTANT');

// Middleware pour les managers et consultants
const requireManagerOrConsultant = requireRole('MANAGER', 'CONSULTANT');

// Helper pour obtenir les permissions d'un utilisateur
const getUserPermissions = async (userId) => {
  try {
    const [permissions] = await pool.query(`
      SELECT 
        m.nom_module,
        m.route_base,
        rp.peut_voir,
        rp.peut_editer,
        rp.peut_supprimer,
        rp.peut_administrer
      FROM acteurs a
      JOIN roles r ON a.id_role = r.id_role
      JOIN role_permissions rp ON r.id_role = rp.id_role
      JOIN modules m ON rp.id_module = m.id_module
      WHERE a.id_acteur = ? AND m.actif = TRUE
      ORDER BY m.ordre_affichage
    `, [userId]);

    return permissions;
  } catch (error) {
    logger.error('Erreur lors de la récupération des permissions:', error);
    return [];
  }
};

// Middleware pour injecter les permissions dans la réponse
const injectPermissions = async (req, res, next) => {
  if (req.user) {
    req.user.permissions = await getUserPermissions(req.user.id_acteur);
  }
  next();
};

module.exports = {
  authenticateToken,
  checkPermission,
  filterByEntreprise,
  hasPermission,
  requireRole,
  requireConsultant,
  requireManagerOrConsultant,
  getUserPermissions,
  injectPermissions
};