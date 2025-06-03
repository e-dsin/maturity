// server/routes/admin-unified-route.js - Routes d'administration unifiée
const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');
const { 
  authenticateToken, 
  checkPermission, 
  requireConsultant,
  requireManagerOrConsultant,
  getUserPermissions,
  injectPermissions
} = require('../middlewares/auth-middleware');

// === MIDDLEWARE DE VÉRIFICATION ADMIN ===
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentification requise' });
  }

  const userRole = req.user.nom_role || req.user.role;
  const isAdmin = userRole === 'ADMINISTRATEUR' || userRole === 'SUPER_ADMINISTRATEUR' || 
                  userRole === 'Admin' || userRole === 'SuperAdmin';

  if (!isAdmin) {
    return res.status(403).json({ 
      message: 'Accès réservé aux administrateurs',
      userRole: userRole
    });
  }

  next();
};

const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentification requise' });
  }

  const userRole = req.user.nom_role || req.user.role;
  const isSuperAdmin = userRole === 'SUPER_ADMINISTRATEUR' || userRole === 'SuperAdmin';

  if (!isSuperAdmin) {
    return res.status(403).json({ 
      message: 'Accès réservé aux super administrateurs',
      userRole: userRole
    });
  }

  next();
};

// === DASHBOARD ADMINISTRATEUR ===
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    logger.debug('GET /api/admin/dashboard - Récupération du dashboard admin');

    // Statistiques générales
    const [userStats] = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN r.nom_role = 'ADMINISTRATEUR' THEN 1 END) as admin_count,
        COUNT(CASE WHEN r.nom_role = 'CONSULTANT' THEN 1 END) as consultant_count,
        COUNT(CASE WHEN r.nom_role = 'MANAGER' THEN 1 END) as manager_count,
        COUNT(CASE WHEN r.nom_role = 'INTERVENANT' THEN 1 END) as intervenant_count
      FROM acteurs a
      LEFT JOIN roles r ON a.id_role = r.id_role
    `);

    const [roleStats] = await pool.query(`
      SELECT 
        r.nom_role,
        r.description,
        COUNT(a.id_acteur) as user_count
      FROM roles r
      LEFT JOIN acteurs a ON r.id_role = a.id_role
      GROUP BY r.id_role, r.nom_role, r.description
      ORDER BY user_count DESC
    `);

    const [moduleStats] = await pool.query(`
      SELECT 
        m.nom_module,
        m.description,
        COUNT(DISTINCT rp.id_role) as roles_with_access
      FROM modules m
      LEFT JOIN role_permissions rp ON m.id_module = rp.id_module AND rp.peut_voir = TRUE
      GROUP BY m.id_module, m.nom_module, m.description
      ORDER BY roles_with_access DESC
    `);

    // Activité récente
    const [recentUsers] = await pool.query(`
      SELECT a.nom_prenom, a.email, a.date_creation, r.nom_role
      FROM acteurs a
      LEFT JOIN roles r ON a.id_role = r.id_role
      ORDER BY a.date_creation DESC
      LIMIT 5
    `);

    const dashboardData = {
      stats: {
        users: userStats[0],
        roles: roleStats,
        modules: moduleStats
      },
      recent_activity: {
        new_users: recentUsers
      },
      system_info: {
        version: process.env.APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime()
      }
    };

    res.status(200).json(dashboardData);
  } catch (error) {
    logger.error('Erreur lors de la récupération du dashboard admin:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération du dashboard' });
  }
});

// === GESTION DES UTILISATEURS ===

// GET tous les utilisateurs avec filtrage
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { role, entreprise, search, page = 1, limit = 50 } = req.query;
    
    logger.debug('GET /api/admin/users - Récupération des utilisateurs');

    let query = `
      SELECT a.id_acteur, a.nom_prenom, a.email, a.organisation,
             a.id_entreprise, e.nom_entreprise,
             r.id_role, r.nom_role, r.niveau_acces,
             a.date_creation, a.date_modification,
             a.anciennete_role
      FROM acteurs a
      LEFT JOIN roles r ON a.id_role = r.id_role
      LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
      WHERE 1 = 1
    `;
    
    const params = [];

    // Filtrage par rôle
    if (role) {
      query += ' AND r.nom_role = ?';
      params.push(role);
    }

    // Filtrage par entreprise
    if (entreprise) {
      query += ' AND a.id_entreprise = ?';
      params.push(entreprise);
    }

    // Recherche textuelle
    if (search) {
      query += ' AND (a.nom_prenom LIKE ? OR a.email LIKE ? OR a.organisation LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Filtrage par niveau d'accès utilisateur
    if (!req.user.hasGlobalAccess && req.user.id_entreprise) {
      query += ' AND a.id_entreprise = ?';
      params.push(req.user.id_entreprise);
    }

    query += ' ORDER BY a.nom_prenom';

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [users] = await pool.query(query, params);

    // Compter le total pour la pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM acteurs a
      LEFT JOIN roles r ON a.id_role = r.id_role
      WHERE 1 = 1
    `;
    const countParams = params.slice(0, -2); // Enlever LIMIT et OFFSET

    if (role) countQuery += ' AND r.nom_role = ?';
    if (entreprise) countQuery += ' AND a.id_entreprise = ?';
    if (search) countQuery += ' AND (a.nom_prenom LIKE ? OR a.email LIKE ? OR a.organisation LIKE ?)';
    if (!req.user.hasGlobalAccess && req.user.id_entreprise) countQuery += ' AND a.id_entreprise = ?';

    const [countResult] = await pool.query(countQuery, countParams.slice(0, countParams.length - (search ? 0 : 0)));

    res.status(200).json({
      users,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(countResult[0].total / parseInt(limit)),
        total_items: countResult[0].total,
        items_per_page: parseInt(limit)
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des utilisateurs' });
  }
});

// GET utilisateur par ID
router.get('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [users] = await pool.query(`
      SELECT a.*, r.nom_role, r.niveau_acces, e.nom_entreprise
      FROM acteurs a
      LEFT JOIN roles r ON a.id_role = r.id_role
      LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
      WHERE a.id_acteur = ?
    `, [id]);

    if (users.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Vérifier les permissions d'accès
    const user = users[0];
    if (!req.user.hasGlobalAccess && user.id_entreprise !== req.user.id_entreprise) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    // Récupérer les permissions de l'utilisateur
    const permissions = await getUserPermissions(id);
    
    res.status(200).json({
      ...user,
      permissions
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération de l\'utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'utilisateur' });
  }
});

// POST créer un utilisateur
router.post('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { 
      nom_prenom, 
      email, 
      organisation,
      id_entreprise,
      id_role,
      mot_de_passe,
      anciennete_role = 0
    } = req.body;

    if (!nom_prenom || !email || !id_role) {
      return res.status(400).json({ 
        message: 'Données invalides: nom_prenom, email et id_role sont requis' 
      });
    }

    // Vérifier que l'utilisateur peut créer dans cette entreprise
    if (!req.user.hasGlobalAccess && id_entreprise !== req.user.id_entreprise) {
      return res.status(403).json({ 
        message: 'Vous ne pouvez créer des utilisateurs que pour votre entreprise' 
      });
    }

    // Vérifier que l'email n'existe pas déjà
    const [existingUsers] = await pool.query('SELECT id_acteur FROM acteurs WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'Un utilisateur avec cet email existe déjà' });
    }

    // Vérifier que le rôle existe
    const [roles] = await pool.query('SELECT * FROM roles WHERE id_role = ?', [id_role]);
    if (roles.length === 0) {
      return res.status(400).json({ message: 'Rôle invalide' });
    }

    // Vérifier les droits de création selon le rôle cible
    const targetRole = roles[0];
    const userRole = req.user.nom_role || req.user.role;
    
    // Seul un super admin peut créer des admins
    if ((targetRole.nom_role === 'ADMINISTRATEUR' || targetRole.nom_role === 'SUPER_ADMINISTRATEUR') 
        && userRole !== 'SUPER_ADMINISTRATEUR' && userRole !== 'SuperAdmin') {
      return res.status(403).json({ 
        message: 'Seul un super administrateur peut créer des administrateurs' 
      });
    }

    const id_acteur = uuidv4();
    const now = new Date();
    
    // Hasher le mot de passe si fourni
    let hashedPassword = null;
    if (mot_de_passe) {
      hashedPassword = await bcrypt.hash(mot_de_passe, 10);
    }

    // Créer l'utilisateur
    await pool.query(`
      INSERT INTO acteurs (
        id_acteur, nom_prenom, email, organisation, 
        id_entreprise, id_role, mot_de_passe, anciennete_role,
        date_creation, date_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id_acteur, 
      nom_prenom, 
      email, 
      organisation || 'Non spécifié',
      id_entreprise,
      id_role,
      hashedPassword,
      anciennete_role,
      now, 
      now
    ]);

    // Récupérer l'utilisateur créé avec toutes ses informations
    const [newUser] = await pool.query(`
      SELECT a.*, r.nom_role, r.niveau_acces, e.nom_entreprise
      FROM acteurs a
      LEFT JOIN roles r ON a.id_role = r.id_role
      LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
      WHERE a.id_acteur = ?
    `, [id_acteur]);

    logger.info(`Nouvel utilisateur créé par ${req.user.email}: ${email}`);
    
    res.status(201).json(newUser[0]);
  } catch (error) {
    logger.error('Erreur lors de la création de l\'utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la création de l\'utilisateur' });
  }
});

// PUT mettre à jour un utilisateur
router.put('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nom_prenom, 
      email, 
      organisation,
      id_entreprise,
      id_role,
      anciennete_role
    } = req.body;

    // Vérifier que l'utilisateur existe
    const [users] = await pool.query(`
      SELECT a.*, r.nom_role 
      FROM acteurs a 
      LEFT JOIN roles r ON a.id_role = r.id_role 
      WHERE a.id_acteur = ?
    `, [id]);

    if (users.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const targetUser = users[0];

    // Vérifier les permissions d'accès
    if (!req.user.hasGlobalAccess && targetUser.id_entreprise !== req.user.id_entreprise) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    // Vérifier les droits de modification selon le rôle
    const userRole = req.user.nom_role || req.user.role;
    const targetRole = targetUser.nom_role;

    // Un admin ne peut pas modifier un super admin
    if (targetRole === 'SUPER_ADMINISTRATEUR' && userRole !== 'SUPER_ADMINISTRATEUR' && userRole !== 'SuperAdmin') {
      return res.status(403).json({ 
        message: 'Vous ne pouvez pas modifier un super administrateur' 
      });
    }

    // Construire la requête de mise à jour
    let updateQuery = 'UPDATE acteurs SET date_modification = NOW()';
    const updateParams = [];

    if (nom_prenom) {
      updateQuery += ', nom_prenom = ?';
      updateParams.push(nom_prenom);
    }

    if (email) {
      // Vérifier l'unicité de l'email
      const [existingUsers] = await pool.query('SELECT id_acteur FROM acteurs WHERE email = ? AND id_acteur != ?', [email, id]);
      if (existingUsers.length > 0) {
        return res.status(400).json({ message: 'Un autre utilisateur utilise déjà cet email' });
      }
      updateQuery += ', email = ?';
      updateParams.push(email);
    }

    if (organisation !== undefined) {
      updateQuery += ', organisation = ?';
      updateParams.push(organisation);
    }

    if (id_entreprise !== undefined) {
      updateQuery += ', id_entreprise = ?';
      updateParams.push(id_entreprise);
    }

    if (id_role !== undefined) {
      // Vérifier que le rôle existe
      const [roles] = await pool.query('SELECT * FROM roles WHERE id_role = ?', [id_role]);
      if (roles.length === 0) {
        return res.status(400).json({ message: 'Rôle invalide' });
      }

      // Vérifier les droits d'attribution de rôle
      const newRole = roles[0];
      if ((newRole.nom_role === 'ADMINISTRATEUR' || newRole.nom_role === 'SUPER_ADMINISTRATEUR') 
          && userRole !== 'SUPER_ADMINISTRATEUR' && userRole !== 'SuperAdmin') {
        return res.status(403).json({ 
          message: 'Seul un super administrateur peut attribuer des rôles administrateur' 
        });
      }

      updateQuery += ', id_role = ?';
      updateParams.push(id_role);
    }

    if (anciennete_role !== undefined) {
      updateQuery += ', anciennete_role = ?';
      updateParams.push(anciennete_role);
    }

    updateQuery += ' WHERE id_acteur = ?';
    updateParams.push(id);

    await pool.query(updateQuery, updateParams);

    // Récupérer l'utilisateur mis à jour
    const [updatedUsers] = await pool.query(`
      SELECT a.*, r.nom_role, r.niveau_acces, e.nom_entreprise
      FROM acteurs a
      LEFT JOIN roles r ON a.id_role = r.id_role
      LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
      WHERE a.id_acteur = ?
    `, [id]);

    logger.info(`Utilisateur ${id} mis à jour par ${req.user.email}`);
    
    res.status(200).json(updatedUsers[0]);
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de l\'utilisateur' });
  }
});

// DELETE supprimer un utilisateur
router.delete('/users/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que l'utilisateur existe
    const [users] = await pool.query(`
      SELECT a.*, r.nom_role 
      FROM acteurs a 
      LEFT JOIN roles r ON a.id_role = r.id_role 
      WHERE a.id_acteur = ?
    `, [id]);

    if (users.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const targetUser = users[0];

    // Empêcher la suppression de soi-même
    if (targetUser.id_acteur === req.user.id_acteur) {
      return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    // Vérifier les permissions d'accès
    if (!req.user.hasGlobalAccess && targetUser.id_entreprise !== req.user.id_entreprise) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    // Commencer une transaction
    await pool.query('START TRANSACTION');

    try {
      // Supprimer les permissions associées
      await pool.query('DELETE FROM permissions WHERE id_acteur = ?', [id]);
      
      // Supprimer l'utilisateur
      await pool.query('DELETE FROM acteurs WHERE id_acteur = ?', [id]);
      
      await pool.query('COMMIT');
      
      logger.info(`Utilisateur ${targetUser.email} supprimé par ${req.user.email}`);
      
      res.status(200).json({ message: 'Utilisateur supprimé avec succès' });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error('Erreur lors de la suppression de l\'utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression de l\'utilisateur' });
  }
});

// === GESTION DES RÔLES ===

// GET tous les rôles
router.get('/roles', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [roles] = await pool.query(`
      SELECT r.*, 
             COUNT(DISTINCT a.id_acteur) as nombre_utilisateurs
      FROM roles r
      LEFT JOIN acteurs a ON r.id_role = a.id_role
      GROUP BY r.id_role
      ORDER BY r.nom_role
    `);

    res.status(200).json(roles);
  } catch (error) {
    logger.error('Erreur lors de la récupération des rôles:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des rôles' });
  }
});

// GET permissions d'un rôle
router.get('/roles/:id/permissions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [permissions] = await pool.query(`
      SELECT rp.*, m.nom_module, m.description as module_description, m.route_base
      FROM role_permissions rp
      JOIN modules m ON rp.id_module = m.id_module
      WHERE rp.id_role = ?
      ORDER BY m.ordre_affichage
    `, [id]);

    res.status(200).json(permissions);
  } catch (error) {
    logger.error('Erreur lors de la récupération des permissions du rôle:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des permissions' });
  }
});

// === GESTION DES MODULES ===

// GET tous les modules
router.get('/modules', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [modules] = await pool.query(`
      SELECT * FROM modules
      ORDER BY ordre_affichage, nom_module
    `);

    res.status(200).json(modules);
  } catch (error) {
    logger.error('Erreur lors de la récupération des modules:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des modules' });
  }
});

// === ENDPOINTS UTILITAIRES ===

// GET statistiques générales
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Statistiques des utilisateurs
    const [userStats] = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN r.nom_role LIKE '%ADMIN%' THEN 1 END) as admin_users,
        COUNT(CASE WHEN r.niveau_acces = 'GLOBAL' THEN 1 END) as global_users,
        COUNT(CASE WHEN a.date_creation >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as new_users_month
      FROM acteurs a
      LEFT JOIN roles r ON a.id_role = r.id_role
    `);

    // Statistiques des rôles
    const [roleStats] = await pool.query(`
      SELECT r.nom_role, COUNT(a.id_acteur) as count
      FROM roles r
      LEFT JOIN acteurs a ON r.id_role = a.id_role
      GROUP BY r.id_role, r.nom_role
      ORDER BY count DESC
    `);

    // Statistiques des entreprises
    const [entrepriseStats] = await pool.query(`
      SELECT COUNT(DISTINCT id_entreprise) as total_entreprises
      FROM acteurs
      WHERE id_entreprise IS NOT NULL
    `);

    res.status(200).json({
      users: userStats[0],
      roles: roleStats,
      entreprises: entrepriseStats[0]
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des statistiques' });
  }
});

// GET logs d'audit (si implémenté)
router.get('/audit-logs', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, action, user } = req.query;
    
    // Cette fonctionnalité nécessiterait une table audit_logs
    // Pour l'instant, retourner un placeholder
    res.status(200).json({
      logs: [],
      message: 'Fonctionnalité d\'audit en développement'
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des logs d\'audit:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des logs' });
  }
});

// POST réinitialiser le mot de passe d'un utilisateur
router.post('/users/:id/reset-password', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ 
        message: 'Le mot de passe doit contenir au moins 6 caractères' 
      });
    }

    // Vérifier que l'utilisateur existe
    const [users] = await pool.query('SELECT * FROM acteurs WHERE id_acteur = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Mettre à jour le mot de passe
    await pool.query(
      'UPDATE acteurs SET mot_de_passe = ?, date_modification = NOW() WHERE id_acteur = ?',
      [hashedPassword, id]
    );

    logger.info(`Mot de passe réinitialisé pour l'utilisateur ${id} par ${req.user.email}`);
    
    res.status(200).json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    logger.error('Erreur lors de la réinitialisation du mot de passe:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la réinitialisation du mot de passe' });
  }
});

module.exports = router;