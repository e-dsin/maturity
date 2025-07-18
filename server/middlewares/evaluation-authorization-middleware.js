// server/middlewares/evaluation-authorization-middleware.js
// Middlewares d'autorisation complémentaires pour les évaluations - Compatible avec auth-middleware existant

const { determineAccessLevel } = require('../utils/evaluationRedirectLogic');
const { getUserRights } = require('./auth-middleware'); // Réutiliser la fonction existante
const logger = require('../utils/logger');

/**
 * Middleware pour vérifier les permissions d'évaluation selon le rôle
 * Extend le système existant avec des règles spécifiques aux évaluations
 * @param {string|Array} requiredLevels - Niveau(x) d'accès requis
 * @returns {Function} Middleware Express
 */
const requireEvaluationAccess = (requiredLevels) => {
  return (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user || !user.nom_role) {
        return res.status(401).json({
          message: 'Utilisateur non authentifié ou rôle manquant'
        });
      }
      
      const userRole = user.nom_role.toUpperCase();
      const accessLevel = determineAccessLevel(userRole, user);
      const userRights = getUserRights(user); // Réutiliser la fonction existante
      
      // Normaliser requiredLevels en tableau
      const levels = Array.isArray(requiredLevels) ? requiredLevels : [requiredLevels];
      const normalizedLevels = levels.map(level => level.toUpperCase());
      
      // Vérifier si le niveau d'accès est autorisé
      const hasAccess = normalizedLevels.includes(accessLevel.level) || 
                       normalizedLevels.includes(accessLevel.scope) ||
                       normalizedLevels.includes(userRole);
      
      if (!hasAccess) {
        logger.warn('Accès évaluation refusé:', {
          userRole,
          accessLevel: accessLevel.level,
          requiredLevels: normalizedLevels,
          userId: user.id_acteur
        });
        
        return res.status(403).json({
          message: 'Accès non autorisé pour votre rôle dans le contexte des évaluations',
          userRole,
          accessLevel: accessLevel.level,
          requiredLevels: normalizedLevels
        });
      }
      
      // Ajouter les informations d'accès à la requête (compatible avec l'existant)
      req.evaluationAccess = accessLevel;
      req.userRole = userRole;
      
      // Garder la compatibilité avec les middlewares existants
      if (!req.userRights) {
        req.userRights = userRights;
      }
      
      next();
    } catch (error) {
      logger.error('Erreur dans le middleware d\'autorisation d\'évaluation:', error);
      res.status(500).json({
        message: 'Erreur lors de la vérification des permissions d\'évaluation'
      });
    }
  };
};

/**
 * Middleware pour filtrer les données d'évaluation selon le niveau d'accès
 * Compatible avec filterByEntreprise existant
 * @param {string} resourceType - Type de ressource ('evaluation', 'formulaire', 'analyse')
 * @returns {Function} Middleware Express
 */
const applyEvaluationDataFilter = (resourceType) => {
  return (req, res, next) => {
    try {
      const user = req.user;
      const evaluationAccess = req.evaluationAccess || determineAccessLevel(user.nom_role, user);
      const userRights = req.userRights || getUserRights(user);
      
      // Réutiliser la logique existante de filtrage d'entreprise si elle existe
      if (!req.enterpriseFilter) {
        // Appliquer la logique de l'auth-middleware existant
        const hasGlobalAccess = userRights.hasGlobalAccess;
        req.enterpriseFilter = {
          isGlobalUser: hasGlobalAccess,
          userEntrepriseId: user.id_entreprise,
          shouldFilter: !hasGlobalAccess && user.id_entreprise,
          userRole: user.nom_role
        };
      }
      
      // Ajouter des filtres spécifiques aux évaluations selon le niveau d'accès
      req.evaluationFilter = {
        ...req.enterpriseFilter, // Hériter du filtrage d'entreprise existant
        accessLevel: evaluationAccess.level,
        canViewAll: evaluationAccess.level === 'GLOBAL',
        canViewEnterprise: evaluationAccess.level === 'ENTREPRISE',
        canViewPersonal: evaluationAccess.level === 'PERSONNEL'
      };
      
      // Appliquer des filtres selon le niveau d'accès et le type de ressource
      switch (evaluationAccess.level) {
        case 'GLOBAL':
          // Aucun filtre : accès à toutes les données (compatible avec l'existant)
          break;
          
        case 'ENTREPRISE':
          // Filtrer sur l'entreprise de l'utilisateur (utilise la logique existante)
          if (resourceType === 'evaluation' || resourceType === 'analyse') {
            req.query.filter_entreprise = user.id_entreprise;
          }
          break;
          
        case 'PERSONNEL':
          // Filtrer sur l'utilisateur uniquement
          if (resourceType === 'formulaire' || resourceType === 'evaluation') {
            req.query.id_acteur = user.id_acteur;
            req.query.filter_acteur = user.id_acteur;
          } else if (resourceType === 'analyse') {
            // Les intervenants ne peuvent pas accéder aux analyses
            return res.status(403).json({
              message: 'Accès non autorisé aux analyses pour les intervenants'
            });
          }
          break;
          
        default:
          return res.status(403).json({
            message: 'Niveau d\'accès non reconnu'
          });
      }
      
      logger.debug('Filtres d\'évaluation appliqués:', {
        userRole: req.userRole,
        accessLevel: evaluationAccess.level,
        resourceType,
        filters: {
          enterprise: req.enterpriseFilter,
          evaluation: req.evaluationFilter,
          query: req.query
        }
      });
      
      next();
    } catch (error) {
      logger.error('Erreur dans le middleware de filtrage d\'évaluation:', error);
      res.status(500).json({
        message: 'Erreur lors de l\'application des filtres d\'évaluation'
      });
    }
  };
};

/**
 * Middleware pour vérifier l'accès à une évaluation spécifique
 * Compatible avec la logique existante de vérification des ressources
 * @param {string} resourceType - Type de ressource
 * @param {string} resourceIdParam - Nom du paramètre contenant l'ID de la ressource
 * @returns {Function} Middleware Express
 */
const checkEvaluationResourceAccess = (resourceType, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      const userRights = req.userRights || getUserRights(user);
      const evaluationAccess = req.evaluationAccess || determineAccessLevel(user.nom_role, user);
      const resourceId = req.params[resourceIdParam];
      
      // Les rôles avec accès global peuvent tout voir (compatible avec l'existant)
      if (userRights.hasGlobalAccess || evaluationAccess.level === 'GLOBAL') {
        return next();
      }
      
      // Vérification spécifique selon le type de ressource et le niveau d'accès
      let hasAccess = false;
      
      switch (evaluationAccess.level) {
        case 'ENTREPRISE':
          // Manager : peut accéder aux ressources de son entreprise
          if (resourceType === 'evaluation' || resourceType === 'analyse') {
            // Vérifier que la ressource appartient à son entreprise
            hasAccess = await checkResourceBelongsToEnterprise(resourceType, resourceId, user.id_entreprise);
          }
          break;
          
        case 'PERSONNEL':
          // Intervenant : peut accéder seulement à ses propres ressources
          if (resourceType === 'formulaire' || resourceType === 'evaluation') {
            hasAccess = await checkResourceBelongsToUser(resourceType, resourceId, user.id_acteur);
          }
          break;
      }
      
      if (!hasAccess) {
        logger.warn('Accès refusé à la ressource d\'évaluation:', {
          userRole: user.nom_role,
          accessLevel: evaluationAccess.level,
          resourceType,
          resourceId,
          userId: user.id_acteur
        });
        
        return res.status(403).json({
          message: 'Accès non autorisé à cette ressource d\'évaluation'
        });
      }
      
      next();
    } catch (error) {
      logger.error('Erreur dans la vérification d\'accès à la ressource d\'évaluation:', error);
      res.status(500).json({
        message: 'Erreur lors de la vérification d\'accès à la ressource d\'évaluation'
      });
    }
  };
};

/**
 * Fonction helper pour vérifier si une ressource appartient à une entreprise
 */
const checkResourceBelongsToEnterprise = async (resourceType, resourceId, enterpriseId) => {
  // Cette fonction devrait être implémentée selon votre schéma de base de données
  // Exemple d'implémentation basique
  try {
    const { pool } = require('../db/dbConnection');
    let query = '';
    
    switch (resourceType) {
      case 'evaluation':
        query = 'SELECT id_entreprise FROM evaluations_maturite_globale WHERE id_evaluation = ?';
        break;
      case 'analyse':
        query = 'SELECT e.id_entreprise FROM analyses a JOIN entreprises e ON a.id_entreprise = e.id_entreprise WHERE a.id_analyse = ?';
        break;
      default:
        return false;
    }
    
    const [results] = await pool.query(query, [resourceId]);
    return results.length > 0 && results[0].id_entreprise === enterpriseId;
  } catch (error) {
    logger.error('Erreur vérification appartenance entreprise:', error);
    return false;
  }
};

/**
 * Fonction helper pour vérifier si une ressource appartient à un utilisateur
 */
const checkResourceBelongsToUser = async (resourceType, resourceId, userId) => {
  try {
    const { pool } = require('../db/dbConnection');
    let query = '';
    
    switch (resourceType) {
      case 'formulaire':
        query = 'SELECT id_acteur FROM formulaires WHERE id_formulaire = ?';
        break;
      case 'evaluation':
        query = 'SELECT id_acteur FROM evaluations_maturite_globale WHERE id_evaluation = ?';
        break;
      default:
        return false;
    }
    
    const [results] = await pool.query(query, [resourceId]);
    return results.length > 0 && results[0].id_acteur === userId;
  } catch (error) {
    logger.error('Erreur vérification appartenance utilisateur:', error);
    return false;
  }
};

module.exports = {
  requireEvaluationAccess,
  applyEvaluationDataFilter,
  checkEvaluationResourceAccess
};