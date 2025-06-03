const oauthService = require('../services/auth-services');

const checkPermission = (ressource, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentification requise' });
      }

      const permissions = await oauthService.getUserPermissions(req.user.id_acteur);
      
      // Vérifier si l'utilisateur a la permission pour cette ressource/action
      const resourcePermissions = permissions[ressource];
      
      if (!resourcePermissions) {
        return res.status(403).json({ 
          message: 'Accès refusé - Ressource non autorisée',
          required: { ressource, action }
        });
      }

      const hasPermission = resourcePermissions.some(perm => 
        perm.action === action || perm.action === 'admin'
      );

      if (!hasPermission) {
        return res.status(403).json({ 
          message: 'Accès refusé - Action non autorisée',
          required: { ressource, action }
        });
      }

      // Ajouter les permissions au request pour usage ultérieur
      req.userPermissions = permissions;
      next();
    } catch (error) {
      res.status(500).json({ message: 'Erreur lors de la vérification des permissions' });
    }
  };
};

const hasAnyPermission = (ressource, actions = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentification requise' });
      }

      const permissions = await oauthService.getUserPermissions(req.user.id_acteur);
      const resourcePermissions = permissions[ressource];
      
      if (!resourcePermissions) {
        return res.status(403).json({ message: 'Accès refusé à cette ressource' });
      }

      const hasAnyAction = actions.some(action =>
        resourcePermissions.some(perm => 
          perm.action === action || perm.action === 'admin'
        )
      );

      if (!hasAnyAction) {
        return res.status(403).json({ message: 'Accès refusé pour ces actions' });
      }

      req.userPermissions = permissions;
      next();
    } catch (error) {
      res.status(500).json({ message: 'Erreur lors de la vérification des permissions' });
    }
  };
};

module.exports = {
  checkPermission,
  hasAnyPermission
};