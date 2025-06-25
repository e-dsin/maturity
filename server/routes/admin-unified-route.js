// server/routes/admin-unified-routes.js - Version améliorée avec contrôles d'accès
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
  getUserPermissions
} = require('../middlewares/auth-middleware');

// === MIDDLEWARE DE VÉRIFICATION ADMIN AMÉLIORÉ ===
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    logger.warn('Tentative d\'accès admin sans authentification');
    return res.status(401).json({ message: 'Authentification requise' });
  }

  const userRole = req.user.nom_role || req.user.role;
  console.log('🔍 Vérification accès admin - Rôle utilisateur:', userRole);
  
  const isAdmin = userRole === 'ADMINISTRATEUR' || 
                  userRole === 'SUPER_ADMINISTRATEUR' || 
                  userRole === 'Admin' || 
                  userRole === 'SuperAdmin';

  if (!isAdmin) {
    logger.warn(`Accès admin refusé pour le rôle: ${userRole}`);
    return res.status(403).json({ 
      message: 'Accès réservé aux administrateurs',
      userRole: userRole
    });
  }

  console.log('✅ Accès admin autorisé pour:', userRole);
  next();
};

const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentification requise' });
  }

  const userRole = req.user.nom_role || req.user.role;
  const isSuperAdmin = userRole === 'SUPER_ADMINISTRATEUR' || userRole === 'SuperAdmin';

  if (!isSuperAdmin) {
    logger.warn(`Accès super admin refusé pour le rôle: ${userRole}`);
    return res.status(403).json({ 
      message: 'Accès réservé aux super administrateurs',
      userRole: userRole
    });
  }

  next();
};

// Middleware pour déterminer le scope d'accès
const setScopeAccess = (req, res, next) => {
  const userRole = req.user.nom_role || req.user.role;
  const isGlobalUser = userRole === 'SUPER_ADMINISTRATEUR' || 
                      userRole === 'CONSULTANT' ||
                      req.user.niveau_acces === 'GLOBAL';
  
  req.userScope = {
    isGlobal: isGlobalUser,
    canViewAll: isGlobalUser || userRole === 'ADMINISTRATEUR',
    canEditAll: userRole === 'SUPER_ADMINISTRATEUR' || userRole === 'ADMINISTRATEUR',
    canDeleteAll: userRole === 'SUPER_ADMINISTRATEUR',
    canManagePermissions: userRole === 'SUPER_ADMINISTRATEUR' || userRole === 'ADMINISTRATEUR',
    canManageRoles: userRole === 'SUPER_ADMINISTRATEUR',
    scope: isGlobalUser ? 'GLOBAL' : 'ENTREPRISE',
    entrepriseId: req.user.id_entreprise
  };
  
  console.log('🔍 Scope utilisateur défini:', req.userScope);
  next();
};

// === GESTION DES UTILISATEURS ===

// GET tous les utilisateurs avec filtrage amélioré
router.get('/users', authenticateToken, requireAdmin, setScopeAccess, async (req, res) => {
  try {
    const { role, entreprise, search, page = 1, limit = 50 } = req.query;
    
    console.log('📥 GET /api/admin/users - Paramètres:', { role, entreprise, search, page, limit });
    console.log('👤 Demandé par:', req.user.email, 'Scope:', req.userScope.scope);

    let query = `
      SELECT a.id_acteur, a.nom_prenom, a.email, a.organisation,
             a.id_entreprise, e.nom_entreprise,
             r.id_role, r.nom_role, r.niveau_acces,
             a.date_creation, a.date_modification,
             a.anciennete_role,
             r.nom_role as role
      FROM acteurs a
      LEFT JOIN roles r ON a.id_role = r.id_role
      LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
      WHERE 1 = 1
    `;
    
    const params = [];

    // Filtrage par scope utilisateur
    if (!req.userScope.isGlobal && req.userScope.entrepriseId) {
      query += ' AND a.id_entreprise = ?';
      params.push(req.userScope.entrepriseId);
      console.log('🔍 Filtrage par entreprise utilisateur:', req.userScope.entrepriseId);
    }

    // Filtrage par rôle
    if (role) {
      query += ' AND r.nom_role = ?';
      params.push(role);
    }

    // Filtrage par entreprise (en plus du scope)
    if (entreprise && req.userScope.isGlobal) {
      query += ' AND a.id_entreprise = ?';
      params.push(entreprise);
    }

    // Recherche textuelle
    if (search) {
      query += ' AND (a.nom_prenom LIKE ? OR a.email LIKE ? OR a.organisation LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY a.nom_prenom';

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    console.log('🔍 Requête SQL:', query);
    console.log('📊 Paramètres:', params);

    const [users] = await pool.query(query, params);

    // Compter le total pour la pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM acteurs a
      LEFT JOIN roles r ON a.id_role = r.id_role
      WHERE 1 = 1
    `;
    let countParams = [];

    // Reprendre les mêmes filtres pour le count
    if (!req.userScope.isGlobal && req.userScope.entrepriseId) {
      countQuery += ' AND a.id_entreprise = ?';
      countParams.push(req.userScope.entrepriseId);
    }
    if (role) {
      countQuery += ' AND r.nom_role = ?';
      countParams.push(role);
    }
    if (entreprise && req.userScope.isGlobal) {
      countQuery += ' AND a.id_entreprise = ?';
      countParams.push(entreprise);
    }
    if (search) {
      countQuery += ' AND (a.nom_prenom LIKE ? OR a.email LIKE ? OR a.organisation LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    const [countResult] = await pool.query(countQuery, countParams);

    console.log('✅ Utilisateurs trouvés:', users.length, 'Total:', countResult[0].total);

    res.status(200).json({
      users,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(countResult[0].total / parseInt(limit)),
        total_items: countResult[0].total,
        items_per_page: parseInt(limit)
      },
      scope: req.userScope.scope,
      entreprise_filter: req.userScope.isGlobal ? null : req.userScope.entrepriseId
    });
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des utilisateurs:', error);
    logger.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des utilisateurs' });
  }
});

// GET utilisateur par ID avec contrôles d'accès
router.get('/users/:id', authenticateToken, requireAdmin, setScopeAccess, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('📥 GET /api/admin/users/:id - ID:', id);
    console.log('👤 Demandé par:', req.user.email, 'Scope:', req.userScope.scope);
    
    const [users] = await pool.query(`
      SELECT a.*, r.nom_role, r.niveau_acces, e.nom_entreprise,
             r.nom_role as role
      FROM acteurs a
      LEFT JOIN roles r ON a.id_role = r.id_role
      LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
      WHERE a.id_acteur = ?
    `, [id]);

    if (users.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const user = users[0];
    
    // Vérifier les permissions d'accès selon le scope
    if (!req.userScope.isGlobal && user.id_entreprise !== req.userScope.entrepriseId) {
      console.log('🚫 Accès refusé - Entreprise différente:', user.id_entreprise, 'vs', req.userScope.entrepriseId);
      return res.status(403).json({ 
        message: 'Accès non autorisé - utilisateur d\'une autre entreprise' 
      });
    }

    // Récupérer les permissions de l'utilisateur (optionnel)
    try {
      const permissions = await getUserPermissions(id);
      user.permissions = permissions;
    } catch (permError) {
      console.warn('⚠️ Impossible de récupérer les permissions:', permError.message);
      user.permissions = [];
    }
    
    console.log('✅ Utilisateur trouvé:', user.email);
    res.status(200).json(user);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de l\'utilisateur:', error);
    logger.error('Erreur lors de la récupération de l\'utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'utilisateur' });
  }
});

// POST créer un utilisateur avec contrôles renforcés
router.post('/users', authenticateToken, requireAdmin, setScopeAccess, async (req, res) => {
  try {
    console.log('📥 POST /api/admin/users - Données reçues:', req.body);
    console.log('👤 Créé par:', req.user.email, 'Scope:', req.userScope.scope);
    
    const { 
      nom_prenom, 
      email, 
      organisation,
      id_entreprise,
      id_role,
      mot_de_passe,
      anciennete_role = 0
    } = req.body;

    // Validation des données requises
    if (!nom_prenom || !email || !id_role) {
      return res.status(400).json({ 
        message: 'Données invalides: nom_prenom, email et id_role sont requis' 
      });
    }

    // Déterminer l'entreprise finale selon le scope
    let finalEntreprise = id_entreprise;
    if (!req.userScope.isGlobal) {
      // Pour les admins non-globaux, forcer leur entreprise
      finalEntreprise = req.userScope.entrepriseId;
      console.log('🔒 Entreprise forcée selon le scope:', finalEntreprise);
    } else if (id_entreprise && id_entreprise !== req.userScope.entrepriseId) {
      // Admin global peut créer dans d'autres entreprises
      finalEntreprise = id_entreprise;
    }

    // Vérifier que l'email n'existe pas déjà
    const [existingUsers] = await pool.query('SELECT id_acteur FROM acteurs WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'Un utilisateur avec cet email existe déjà' });
    }

    // Vérifier que le rôle existe et les droits d'attribution
    const [roles] = await pool.query('SELECT * FROM roles WHERE id_role = ?', [id_role]);
    if (roles.length === 0) {
      return res.status(400).json({ message: 'Rôle invalide' });
    }

    const targetRole = roles[0];
    const userRole = req.user.nom_role || req.user.role;
    
    // Contrôles de sécurité selon le rôle cible
    if (targetRole.nom_role === 'SUPER_ADMINISTRATEUR' && userRole !== 'SUPER_ADMINISTRATEUR') {
      return res.status(403).json({ 
        message: 'Seul un super administrateur peut créer des super administrateurs' 
      });
    }

    if ((targetRole.nom_role === 'ADMINISTRATEUR') && userRole !== 'SUPER_ADMINISTRATEUR') {
      return res.status(403).json({ 
        message: 'Seul un super administrateur peut créer des administrateurs' 
      });
    }

    if ((targetRole.nom_role === 'CONSULTANT') && userRole !== 'SUPER_ADMINISTRATEUR') {
      return res.status(403).json({ 
        message: 'Seul un super administrateur peut créer des consultants' 
      });
    }

    // Vérifier que l'entreprise existe (si spécifiée)
    if (finalEntreprise) {
      const [entreprises] = await pool.query('SELECT * FROM entreprises WHERE id_entreprise = ?', [finalEntreprise]);
      if (entreprises.length === 0) {
        return res.status(400).json({ message: 'Entreprise invalide' });
      }
    }

    const id_acteur = uuidv4();
    const now = new Date();
    
    // Hasher le mot de passe si fourni
    let hashedPassword = null;
    if (mot_de_passe) {
      hashedPassword = await bcrypt.hash(mot_de_passe, 10);
      console.log('🔒 Mot de passe hashé');
    }

    console.log('📤 Création utilisateur avec:', {
      id_acteur,
      nom_prenom,
      email,
      organisation: organisation || 'Non spécifié',
      id_entreprise: finalEntreprise,
      id_role: targetRole.nom_role,
      hasPassword: !!hashedPassword,
      createdBy: req.user.email,
      scope: req.userScope.scope
    });

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
      finalEntreprise,
      id_role,
      hashedPassword,
      anciennete_role,
      now, 
      now
    ]);

    console.log('✅ Utilisateur créé dans la DB');

    // Créer les permissions basées sur le rôle
    try {
      await pool.query(`
        INSERT INTO permissions (id_permission, id_acteur, id_module, type_ressource, peut_voir, peut_editer, peut_supprimer, peut_administrer, conditions)
        SELECT 
          UUID(),
          ?,
          rp.id_module,
          CASE 
            WHEN m.nom_module = 'QUESTIONNAIRES' THEN 'QUESTIONNAIRE'
            WHEN m.nom_module = 'FORMULAIRES' THEN 'FORMULAIRE'
            WHEN m.nom_module = 'APPLICATIONS' THEN 'APPLICATION'
            ELSE 'RAPPORT'
          END as type_ressource,
          rp.peut_voir,
          rp.peut_editer,
          rp.peut_supprimer,
          rp.peut_administrer,
          JSON_OBJECT('entreprise_id', ?)
        FROM role_permissions rp
        JOIN modules m ON rp.id_module = m.id_module
        WHERE rp.id_role = ?
      `, [id_acteur, finalEntreprise, id_role]);
      
      console.log('✅ Permissions créées pour l\'utilisateur');
    } catch (permError) {
      console.warn('⚠️ Erreur lors de la création des permissions (continuons):', permError.message);
    }

    // Récupérer l'utilisateur créé avec toutes ses informations
    const [newUser] = await pool.query(`
      SELECT a.*, r.nom_role, r.niveau_acces, e.nom_entreprise,
             r.nom_role as role
      FROM acteurs a
      LEFT JOIN roles r ON a.id_role = r.id_role
      LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
      WHERE a.id_acteur = ?
    `, [id_acteur]);

    logger.info(`Nouvel utilisateur créé par ${req.user.email} (${userRole}): ${email} (${targetRole.nom_role}, entreprise: ${finalEntreprise})`);
    
    console.log('✅ Utilisateur créé avec succès:', newUser[0]?.email);
    res.status(201).json({
      ...newUser[0],
      created_by: req.user.email,
      scope: req.userScope.scope
    });
  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'utilisateur:', error);
    logger.error('Erreur lors de la création de l\'utilisateur:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la création de l\'utilisateur',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT mettre à jour un utilisateur avec contrôles d'accès
router.put('/users/:id', authenticateToken, requireAdmin, setScopeAccess, async (req, res) => {
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

    console.log('📥 PUT /api/admin/users/:id - ID:', id, 'Données:', req.body);
    console.log('👤 Modifié par:', req.user.email, 'Scope:', req.userScope.scope);

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
    const userRole = req.user.nom_role || req.user.role;

    // Vérifier les permissions d'accès selon le scope
    if (!req.userScope.isGlobal && targetUser.id_entreprise !== req.userScope.entrepriseId) {
      return res.status(403).json({ 
        message: 'Accès non autorisé - utilisateur d\'une autre entreprise' 
      });
    }

    // Empêcher la modification de son propre compte
    if (id === req.user.id_acteur) {
      return res.status(400).json({ 
        message: 'Vous ne pouvez pas modifier votre propre compte via cette interface' 
      });
    }

    // Vérifier les droits de modification selon le rôle cible
    if (targetUser.nom_role === 'SUPER_ADMINISTRATEUR' && userRole !== 'SUPER_ADMINISTRATEUR') {
      return res.status(403).json({ 
        message: 'Seul un super administrateur peut modifier un super administrateur' 
      });
    }

    // Construire la requête de mise à jour dynamiquement
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
      // Contrôler le changement d'entreprise selon le scope
      if (!req.userScope.isGlobal) {
        return res.status(403).json({ 
          message: 'Vous ne pouvez pas changer l\'entreprise d\'un utilisateur' 
        });
      }
      updateQuery += ', id_entreprise = ?';
      updateParams.push(id_entreprise);
    }

    if (id_role !== undefined) {
      // Vérifier que le rôle existe
      const [roles] = await pool.query('SELECT * FROM roles WHERE id_role = ?', [id_role]);
      if (roles.length === 0) {
        return res.status(400).json({ message: 'Rôle invalide' });
      }

      const newRole = roles[0];
      
      // Vérifier les droits d'attribution de rôle
      if (newRole.nom_role === 'SUPER_ADMINISTRATEUR' && userRole !== 'SUPER_ADMINISTRATEUR') {
        return res.status(403).json({ 
          message: 'Seul un super administrateur peut attribuer le rôle super administrateur' 
        });
      }

      if ((newRole.nom_role === 'ADMINISTRATEUR' || newRole.nom_role === 'CONSULTANT') 
          && userRole !== 'SUPER_ADMINISTRATEUR') {
        return res.status(403).json({ 
          message: 'Seul un super administrateur peut attribuer des rôles administrateur ou consultant' 
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

    console.log('🔄 Requête de mise à jour:', updateQuery);
    await pool.query(updateQuery, updateParams);

    // Si le rôle a changé, mettre à jour les permissions
    if (id_role !== undefined) {
      try {
        // Supprimer les anciennes permissions
        await pool.query('DELETE FROM permissions WHERE id_acteur = ?', [id]);
        
        // Recréer les permissions basées sur le nouveau rôle
        await pool.query(`
          INSERT INTO permissions (id_permission, id_acteur, id_module, type_ressource, peut_voir, peut_editer, peut_supprimer, peut_administrer, conditions)
          SELECT 
            UUID(),
            ?,
            rp.id_module,
            CASE 
              WHEN m.nom_module = 'QUESTIONNAIRES' THEN 'QUESTIONNAIRE'
              WHEN m.nom_module = 'FORMULAIRES' THEN 'FORMULAIRE'
              WHEN m.nom_module = 'APPLICATIONS' THEN 'APPLICATION'
              ELSE 'RAPPORT'
            END as type_ressource,
            rp.peut_voir,
            rp.peut_editer,
            rp.peut_supprimer,
            rp.peut_administrer,
            JSON_OBJECT('entreprise_id', (SELECT id_entreprise FROM acteurs WHERE id_acteur = ?))
          FROM role_permissions rp
          JOIN modules m ON rp.id_module = m.id_module
          WHERE rp.id_role = ?
        `, [id, id, id_role]);
        
        console.log('✅ Permissions mises à jour suite au changement de rôle');
      } catch (permError) {
        console.warn('⚠️ Erreur lors de la mise à jour des permissions:', permError.message);
      }
    }

    // Récupérer l'utilisateur mis à jour
    const [updatedUsers] = await pool.query(`
      SELECT a.*, r.nom_role, r.niveau_acces, e.nom_entreprise,
             r.nom_role as role
      FROM acteurs a
      LEFT JOIN roles r ON a.id_role = r.id_role
      LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
      WHERE a.id_acteur = ?
    `, [id]);

    logger.info(`Utilisateur ${targetUser.email} mis à jour par ${req.user.email} (${userRole})`);
    
    console.log('✅ Utilisateur mis à jour avec succès');
    res.status(200).json({
      ...updatedUsers[0],
      updated_by: req.user.email,
      scope: req.userScope.scope
    });
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour de l\'utilisateur:', error);
    logger.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de l\'utilisateur' });
  }
});

// DELETE supprimer un utilisateur (Super Admin uniquement)
router.delete('/users/:id', authenticateToken, requireSuperAdmin, setScopeAccess, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('📥 DELETE /api/admin/users/:id - ID:', id);
    console.log('👤 Supprimé par:', req.user.email);

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

    // Vérifier les contraintes selon le scope (même pour super admin)
    if (!req.userScope.isGlobal && targetUser.id_entreprise !== req.userScope.entrepriseId) {
      return res.status(403).json({ 
        message: 'Vous ne pouvez supprimer que les utilisateurs de votre entreprise' 
      });
    }

    // Commencer une transaction
    await pool.query('START TRANSACTION');

    try {
      // Supprimer les permissions associées
      await pool.query('DELETE FROM permissions WHERE id_acteur = ?', [id]);
      
      // Supprimer l'utilisateur
      await pool.query('DELETE FROM acteurs WHERE id_acteur = ?', [id]);
      
      await pool.query('COMMIT');
      
      logger.info(`Utilisateur ${targetUser.email} (${targetUser.nom_role}) supprimé par ${req.user.email}`);
      
      console.log('✅ Utilisateur supprimé avec succès');
      res.status(200).json({ 
        message: 'Utilisateur supprimé avec succès',
        deleted_user: targetUser.email,
        deleted_by: req.user.email
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('❌ Erreur lors de la suppression de l\'utilisateur:', error);
    logger.error('Erreur lors de la suppression de l\'utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression de l\'utilisateur' });
  }
});

// === GESTION DES RÔLES (Super Admin uniquement) ===

// GET tous les rôles
router.get('/roles', authenticateToken, requireAdmin, setScopeAccess, async (req, res) => {
  try {
    console.log('📥 GET /api/admin/roles');
    console.log('👤 Demandé par:', req.user.email, 'Scope:', req.userScope.scope);
    
    const [roles] = await pool.query(`
      SELECT r.*, 
             COUNT(DISTINCT a.id_acteur) as nombre_utilisateurs
      FROM roles r
      LEFT JOIN acteurs a ON r.id_role = a.id_role
      GROUP BY r.id_role
      ORDER BY r.nom_role
    `);

    console.log('✅ Rôles trouvés:', roles.length);
    res.status(200).json(roles);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des rôles:', error);
    logger.error('Erreur lors de la récupération des rôles:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des rôles' });
  }
});

// GET permissions d'un rôle avec contrôles d'accès
router.get('/roles/:id/permissions', authenticateToken, requireAdmin, setScopeAccess, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('📥 GET /api/admin/roles/:id/permissions - ID:', id);
    console.log('👤 Demandé par:', req.user.email, 'Scope:', req.userScope.scope);

    const [permissions] = await pool.query(`
      SELECT rp.*, m.nom_module, m.description as module_description, m.route_base
      FROM role_permissions rp
      JOIN modules m ON rp.id_module = m.id_module
      WHERE rp.id_role = ?
      ORDER BY m.ordre_affichage
    `, [id]);

    console.log('✅ Permissions du rôle trouvées:', permissions.length);
    res.status(200).json(permissions);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des permissions du rôle:', error);
    logger.error('Erreur lors de la récupération des permissions du rôle:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des permissions' });
  }
});

// === GESTION DES MODULES ===

// GET tous les modules
router.get('/modules', authenticateToken, requireAdmin, setScopeAccess, async (req, res) => {
  try {
    console.log('📥 GET /api/admin/modules');
    console.log('👤 Demandé par:', req.user.email, 'Scope:', req.userScope.scope);
    
    const [modules] = await pool.query(`
      SELECT * FROM modules
      ORDER BY ordre_affichage, nom_module
    `);

    console.log('✅ Modules trouvés:', modules.length);
    res.status(200).json(modules);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des modules:', error);
    logger.error('Erreur lors de la récupération des modules:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des modules' });
  }
});

// === UTILITAIRES ===

// GET statistiques générales avec scope
router.get('/stats', authenticateToken, requireAdmin, setScopeAccess, async (req, res) => {
  try {
    console.log('📥 GET /api/admin/stats');
    console.log('👤 Demandé par:', req.user.email, 'Scope:', req.userScope.scope);
    
    // Base query selon le scope
    let userWhereClause = '';
    let userParams = [];
    
    if (!req.userScope.isGlobal && req.userScope.entrepriseId) {
      userWhereClause = 'WHERE a.id_entreprise = ?';
      userParams = [req.userScope.entrepriseId];
    }
    
    // Statistiques des utilisateurs
    const [userStats] = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN r.nom_role LIKE '%ADMIN%' THEN 1 END) as admin_users,
        COUNT(CASE WHEN r.niveau_acces = 'GLOBAL' THEN 1 END) as global_users,
        COUNT(CASE WHEN a.date_creation >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as new_users_month
      FROM acteurs a
      LEFT JOIN roles r ON a.id_role = r.id_role
      ${userWhereClause}
    `, userParams);

    // Statistiques des rôles (selon scope)
    const [roleStats] = await pool.query(`
      SELECT r.nom_role, COUNT(a.id_acteur) as count
      FROM roles r
      LEFT JOIN acteurs a ON r.id_role = a.id_role ${!req.userScope.isGlobal && req.userScope.entrepriseId ? 'AND a.id_entreprise = ?' : ''}
      GROUP BY r.id_role, r.nom_role
      ORDER BY count DESC
    `, !req.userScope.isGlobal && req.userScope.entrepriseId ? [req.userScope.entrepriseId] : []);

    // Statistiques des entreprises (global uniquement)
    let entrepriseStats = { total_entreprises: 1 };
    if (req.userScope.isGlobal) {
      const [entStats] = await pool.query(`
        SELECT COUNT(DISTINCT id_entreprise) as total_entreprises
        FROM acteurs
        WHERE id_entreprise IS NOT NULL
      `);
      entrepriseStats = entStats[0];
    }

    const stats = {
      users: userStats[0],
      roles: roleStats,
      entreprises: entrepriseStats,
      scope: req.userScope.scope,
      entreprise_filter: req.userScope.isGlobal ? null : req.userScope.entrepriseId
    };

    console.log('✅ Statistiques récupérées');
    res.status(200).json(stats);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des statistiques:', error);
    logger.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des statistiques' });
  }
});

// POST réinitialiser le mot de passe d'un utilisateur
router.post('/users/:id/reset-password', authenticateToken, requireAdmin, setScopeAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    console.log('📥 POST /api/admin/users/:id/reset-password - ID:', id);
    console.log('👤 Demandé par:', req.user.email, 'Scope:', req.userScope.scope);

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ 
        message: 'Le mot de passe doit contenir au moins 6 caractères' 
      });
    }

    // Vérifier que l'utilisateur existe et les droits d'accès
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

    // Vérifier les permissions d'accès selon le scope
    if (!req.userScope.isGlobal && targetUser.id_entreprise !== req.userScope.entrepriseId) {
      return res.status(403).json({ 
        message: 'Accès non autorisé - utilisateur d\'une autre entreprise' 
      });
    }

    // Vérifier les droits selon le rôle cible
    const userRole = req.user.nom_role || req.user.role;
    if (targetUser.nom_role === 'SUPER_ADMINISTRATEUR' && userRole !== 'SUPER_ADMINISTRATEUR') {
      return res.status(403).json({ 
        message: 'Seul un super administrateur peut réinitialiser le mot de passe d\'un super administrateur' 
      });
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Mettre à jour le mot de passe
    await pool.query(
      'UPDATE acteurs SET mot_de_passe = ?, date_modification = NOW() WHERE id_acteur = ?',
      [hashedPassword, id]
    );

    logger.info(`Mot de passe réinitialisé pour l'utilisateur ${targetUser.email} par ${req.user.email} (${userRole})`);
    
    console.log('✅ Mot de passe réinitialisé avec succès');
    res.status(200).json({ 
      message: 'Mot de passe réinitialisé avec succès',
      target_user: targetUser.email,
      reset_by: req.user.email
    });
  } catch (error) {
    console.error('❌ Erreur lors de la réinitialisation du mot de passe:', error);
    logger.error('Erreur lors de la réinitialisation du mot de passe:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la réinitialisation du mot de passe' });
  }
});

// GET informations sur les droits de l'utilisateur connecté
router.get('/user-rights', authenticateToken, setScopeAccess, async (req, res) => {
  try {
    console.log('📥 GET /api/admin/user-rights');
    console.log('👤 Demandé par:', req.user.email);
    
    res.status(200).json({
      ...req.userScope,
      user: {
        id: req.user.id_acteur,
        email: req.user.email,
        role: req.user.nom_role || req.user.role,
        entreprise: req.user.id_entreprise
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des droits utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des droits' });
  }
});

module.exports = router;