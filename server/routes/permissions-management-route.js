// server/routes/permissions-management-route.js - Version améliorée avec contrôles d'accès
const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { 
  authenticateToken, 
  checkPermission, 
  requireConsultant,
  requireManagerOrConsultant,
  getUserPermissions
} = require('../middlewares/auth-middleware');
const bcrypt = require('bcrypt');

// Middleware pour vérifier les droits selon le rôle
const checkRoleAccess = (requiredLevel = 'VIEW') => {
  return (req, res, next) => {
    const userRole = req.user.nom_role || req.user.role;
    const isGlobalUser = req.user.niveau_acces === 'GLOBAL' || 
                        userRole === 'SUPER_ADMINISTRATEUR' || 
                        userRole === 'CONSULTANT';
    
    // Déterminer les droits selon le rôle
    const userRights = {
      canViewAll: isGlobalUser || userRole === 'ADMINISTRATEUR' || userRole === 'MANAGER',
      canEdit: userRole === 'SUPER_ADMINISTRATEUR' || userRole === 'ADMINISTRATEUR',
      canDelete: userRole === 'SUPER_ADMINISTRATEUR',
      canManagePermissions: userRole === 'SUPER_ADMINISTRATEUR' || userRole === 'ADMINISTRATEUR',
      canManageRoles: userRole === 'SUPER_ADMINISTRATEUR',
      scope: isGlobalUser ? 'GLOBAL' : 'ENTREPRISE'
    };

    // Vérifier le niveau requis
    switch (requiredLevel) {
      case 'VIEW':
        if (!userRights.canViewAll) {
          return res.status(403).json({ message: 'Droits insuffisants pour consulter ces données' });
        }
        break;
      case 'EDIT':
        if (!userRights.canEdit) {
          return res.status(403).json({ message: 'Droits insuffisants pour modifier ces données' });
        }
        break;
      case 'DELETE':
        if (!userRights.canDelete) {
          return res.status(403).json({ message: 'Droits insuffisants pour supprimer ces données' });
        }
        break;
      case 'MANAGE_PERMISSIONS':
        if (!userRights.canManagePermissions) {
          return res.status(403).json({ message: 'Droits insuffisants pour gérer les permissions' });
        }
        break;
      case 'MANAGE_ROLES':
        if (!userRights.canManageRoles) {
          return res.status(403).json({ message: 'Seul un super administrateur peut gérer les rôles' });
        }
        break;
    }

    req.userRights = userRights;
    next();
  };
};

// GET tous les rôles disponibles
router.get('/roles', authenticateToken, checkRoleAccess('VIEW'), async (req, res) => {
  try {
    console.log('📥 GET /permissions-management/roles');
    console.log('👤 Utilisateur:', req.user.email, 'Rôle:', req.user.nom_role, 'Scope:', req.userRights.scope);
    
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
    logger.error('Erreur lors de la récupération des rôles:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des rôles' });
  }
});

// GET tous les modules disponibles
router.get('/modules', authenticateToken, checkRoleAccess('VIEW'), async (req, res) => {
  try {
    console.log('📥 GET /permissions-management/modules');
    
    const [modules] = await pool.query(`
      SELECT * FROM modules
      ORDER BY ordre_affichage, nom_module
    `);
    
    console.log('✅ Modules trouvés:', modules.length);
    res.status(200).json(modules);
  } catch (error) {
    logger.error('Erreur lors de la récupération des modules:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des modules' });
  }
});

// GET permissions d'un rôle spécifique
router.get('/roles/:roleId/permissions', authenticateToken, checkRoleAccess('VIEW'), async (req, res) => {
  try {
    const { roleId } = req.params;
    
    console.log('📥 GET /permissions-management/roles/:roleId/permissions - Role ID:', roleId);
    console.log('👤 Demandé par:', req.user.email, 'Scope:', req.userRights.scope);
    
    const [permissions] = await pool.query(`
      SELECT rp.*, m.nom_module, m.description as module_description
      FROM role_permissions rp
      JOIN modules m ON rp.id_module = m.id_module
      WHERE rp.id_role = ?
      ORDER BY m.ordre_affichage
    `, [roleId]);
    
    console.log('✅ Permissions trouvées:', permissions.length);
    res.status(200).json(permissions);
  } catch (error) {
    logger.error('Erreur lors de la récupération des permissions du rôle:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des permissions' });
  }
});

// PUT mettre à jour les permissions d'un rôle
router.put('/roles/:roleId/permissions', authenticateToken, checkRoleAccess('MANAGE_PERMISSIONS'), async (req, res) => {
  try {
    const { roleId } = req.params;
    const { permissions } = req.body;
    
    console.log('📥 PUT /permissions-management/roles/:roleId/permissions');
    console.log('👤 Modifié par:', req.user.email, 'Rôle:', req.user.nom_role);
    console.log('🔧 Role ID:', roleId, 'Permissions à mettre à jour:', permissions.length);
    
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ message: 'Le format des permissions est invalide' });
    }

    // Vérifier que le rôle existe
    const [roles] = await pool.query('SELECT * FROM roles WHERE id_role = ?', [roleId]);
    if (roles.length === 0) {
      return res.status(404).json({ message: 'Rôle non trouvé' });
    }

    const targetRole = roles[0];
    
    // Vérifier les droits de modification selon le rôle cible
    if (targetRole.nom_role === 'SUPER_ADMINISTRATEUR' && req.user.nom_role !== 'SUPER_ADMINISTRATEUR') {
      return res.status(403).json({ 
        message: 'Seul un super administrateur peut modifier les permissions d\'un super administrateur' 
      });
    }
    
    // Commencer une transaction
    await pool.query('START TRANSACTION');
    
    try {
      // Supprimer les anciennes permissions
      await pool.query('DELETE FROM role_permissions WHERE id_role = ?', [roleId]);
      
      // Insérer les nouvelles permissions
      for (const perm of permissions) {
        await pool.query(`
          INSERT INTO role_permissions (
            id_role_permission, id_role, id_module, 
            peut_voir, peut_editer, peut_supprimer, peut_administrer
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          uuidv4(),
          roleId,
          perm.id_module,
          perm.peut_voir || false,
          perm.peut_editer || false,
          perm.peut_supprimer || false,
          perm.peut_administrer || false
        ]);
      }
      
      // Mettre à jour les permissions individuelles des utilisateurs ayant ce rôle
      await pool.query(`
        DELETE p FROM permissions p
        JOIN acteurs a ON p.id_acteur = a.id_acteur
        WHERE a.id_role = ?
      `, [roleId]);
      
      // Recréer les permissions individuelles
      await pool.query(`
        INSERT INTO permissions (id_permission, id_acteur, id_module, type_ressource, peut_voir, peut_editer, peut_supprimer, peut_administrer, conditions)
        SELECT 
          UUID(),
          a.id_acteur,
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
          JSON_OBJECT('entreprise_id', a.id_entreprise)
        FROM acteurs a
        JOIN role_permissions rp ON a.id_role = rp.id_role
        JOIN modules m ON rp.id_module = m.id_module
        WHERE a.id_role = ?
      `, [roleId]);
      
      await pool.query('COMMIT');
      
      logger.info(`Permissions du rôle ${targetRole.nom_role} mises à jour par ${req.user.email}`);
      console.log('✅ Permissions mises à jour avec succès');
      
      res.status(200).json({ 
        message: 'Permissions mises à jour avec succès',
        role: targetRole.nom_role,
        updated_by: req.user.email
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour des permissions:', error);
    logger.error('Erreur lors de la mise à jour des permissions:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour des permissions' });
  }
});

// GET permissions d'un utilisateur spécifique
router.get('/users/:userId/permissions', authenticateToken, checkRoleAccess('VIEW'), async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('📥 GET /permissions-management/users/:userId/permissions - User ID:', userId);
    console.log('👤 Demandé par:', req.user.email, 'Scope:', req.userRights.scope);
    
    // Vérifier que l'utilisateur peut voir ces permissions
    if (req.userRights.scope === 'ENTREPRISE' && req.user.id_acteur !== userId) {
      // Vérifier que l'utilisateur cible appartient à la même entreprise
      const [targetUser] = await pool.query(
        'SELECT id_entreprise FROM acteurs WHERE id_acteur = ?', 
        [userId]
      );
      
      if (targetUser.length === 0 || targetUser[0].id_entreprise !== req.user.id_entreprise) {
        return res.status(403).json({ message: 'Accès non autorisé' });
      }
    }
    
    const permissions = await getUserPermissions(userId);
    console.log('✅ Permissions utilisateur trouvées:', permissions.length);
    res.status(200).json(permissions);
  } catch (error) {
    logger.error('Erreur lors de la récupération des permissions utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des permissions' });
  }
});

// GET utilisateurs avec leurs rôles (filtré selon les droits)
router.get('/users', authenticateToken, checkRoleAccess('VIEW'), async (req, res) => {
  try {
    console.log('📥 GET /permissions-management/users');
    console.log('👤 Demandé par:', req.user.email, 'Scope:', req.userRights.scope);
    
    let query = `
      SELECT a.id_acteur, a.nom_prenom, a.email, a.organisation,
             a.id_entreprise, e.nom_entreprise,
             a.id_role, r.nom_role, r.niveau_acces,
             a.date_creation, a.date_modification,
             r.nom_role as role
      FROM acteurs a
      JOIN roles r ON a.id_role = r.id_role
      LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
    `;
    
    let params = [];
    
    // Filtrer par entreprise selon le scope
    if (req.userRights.scope === 'ENTREPRISE' && req.user.id_entreprise) {
      query += ' WHERE a.id_entreprise = ?';
      params.push(req.user.id_entreprise);
      console.log('🔍 Filtrage par entreprise:', req.user.id_entreprise);
    }
    
    query += ' ORDER BY a.nom_prenom';
    
    console.log('🔍 Requête utilisateurs:', query);
    console.log('🔍 Paramètres:', params);
    
    const [users] = await pool.query(query, params);
    
    console.log('✅ Utilisateurs trouvés:', users.length);
    
    res.status(200).json(users);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des utilisateurs:', error);
    logger.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des utilisateurs' });
  }
});

// POST créer un nouvel utilisateur avec contrôles renforcés
router.post('/users', authenticateToken, checkRoleAccess('EDIT'), async (req, res) => {
  try {
    console.log('📥 POST /permissions-management/users');
    console.log('👤 Créé par:', req.user.email, 'Rôle:', req.user.nom_role);
    console.log('📦 Données reçues:', req.body);
    
    const { 
      nom_prenom, 
      email, 
      organisation,
      id_entreprise,
      id_role,
      mot_de_passe
    } = req.body;
    
    // Validation des données requises
    if (!nom_prenom || !email || !id_role) {
      console.error('❌ Données manquantes:', { nom_prenom: !!nom_prenom, email: !!email, id_role: !!id_role });
      return res.status(400).json({ 
        message: 'Données invalides: nom_prenom, email et id_role sont requis' 
      });
    }
    
    // Vérifier les contraintes selon le scope utilisateur
    if (req.userRights.scope === 'ENTREPRISE') {
      if (!req.user.id_entreprise) {
        return res.status(400).json({ 
          message: 'Impossible de déterminer votre entreprise' 
        });
      }
      
      if (id_entreprise && id_entreprise !== req.user.id_entreprise) {
        console.error('❌ Tentative de création dans une autre entreprise:', {
          userEntreprise: req.user.id_entreprise,
          targetEntreprise: id_entreprise
        });
        return res.status(403).json({ 
          message: 'Vous ne pouvez créer des utilisateurs que pour votre entreprise' 
        });
      }
    }

    // Vérifier que l'email n'existe pas déjà
    const [existingUsers] = await pool.query(
      'SELECT id_acteur FROM acteurs WHERE email = ?', 
      [email]
    );
    
    if (existingUsers.length > 0) {
      console.error('❌ Email déjà existant:', email);
      return res.status(400).json({ 
        message: 'Un utilisateur avec cet email existe déjà' 
      });
    }
    
    // Vérifier que le rôle existe et les droits d'attribution
    const [roles] = await pool.query('SELECT * FROM roles WHERE id_role = ?', [id_role]);
    if (roles.length === 0) {
      console.error('❌ Rôle invalide:', id_role);
      return res.status(400).json({ message: 'Rôle invalide' });
    }
    
    const targetRole = roles[0];
    
    // Contrôles de sécurité selon le rôle cible
    if (targetRole.nom_role === 'SUPER_ADMINISTRATEUR' && req.user.nom_role !== 'SUPER_ADMINISTRATEUR') {
      return res.status(403).json({ 
        message: 'Seul un super administrateur peut créer des super administrateurs' 
      });
    }
    
    if ((targetRole.nom_role === 'ADMINISTRATEUR' || targetRole.nom_role === 'CONSULTANT') 
        && req.user.nom_role !== 'SUPER_ADMINISTRATEUR') {
      return res.status(403).json({ 
        message: 'Seul un super administrateur peut créer des administrateurs ou consultants' 
      });
    }
    
    // Définir l'entreprise finale
    const finalEntreprise = req.userRights.scope === 'ENTREPRISE' 
      ? req.user.id_entreprise 
      : (id_entreprise || req.user.id_entreprise);
    
    // Vérifier que l'entreprise existe (si spécifiée)
    if (finalEntreprise) {
      const [entreprises] = await pool.query('SELECT * FROM entreprises WHERE id_entreprise = ?', [finalEntreprise]);
      if (entreprises.length === 0) {
        console.error('❌ Entreprise invalide:', finalEntreprise);
        return res.status(400).json({ message: 'Entreprise invalide' });
      }
    }
    
    const id_acteur = uuidv4();
    const now = new Date();
    let hashedPassword = null;

    // Hash password if provided
    if (mot_de_passe) {
      hashedPassword = await bcrypt.hash(mot_de_passe, 10);
      console.log('🔒 Mot de passe hashé');
    }
    
    console.log('📤 Création utilisateur avec données:', {
      id_acteur,
      nom_prenom,
      email,
      organisation: organisation || 'Non spécifié',
      id_entreprise: finalEntreprise,
      id_role: targetRole.nom_role,
      hasPassword: !!hashedPassword
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
      0, // ancienneté par défaut
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
      JOIN roles r ON a.id_role = r.id_role
      LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
      WHERE a.id_acteur = ?
    `, [id_acteur]);
    
    console.log('✅ Utilisateur créé avec succès:', newUser[0]?.email);
    
    // Log pour audit
    logger.info(`Nouvel utilisateur créé par ${req.user.email}: ${email} (rôle: ${targetRole.nom_role}, entreprise: ${finalEntreprise})`);
    
    res.status(201).json({
      ...newUser[0],
      message: 'Utilisateur créé avec succès'
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

// PUT mettre à jour le rôle d'un utilisateur
router.put('/users/:userId/role', authenticateToken, checkRoleAccess('EDIT'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { id_role } = req.body;
    
    console.log('📥 PUT /permissions-management/users/:userId/role');
    console.log('👤 Modifié par:', req.user.email, 'User ID:', userId, 'Nouveau rôle:', id_role);
    
    if (!id_role) {
      return res.status(400).json({ message: 'ID du rôle requis' });
    }
    
    // Vérifier que l'utilisateur cible existe et les droits d'accès
    const [targetUser] = await pool.query(`
      SELECT a.*, r.nom_role 
      FROM acteurs a 
      JOIN roles r ON a.id_role = r.id_role 
      WHERE a.id_acteur = ?
    `, [userId]);
    
    if (targetUser.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    const user = targetUser[0];
    
    // Vérifier les droits d'accès selon le scope
    if (req.userRights.scope === 'ENTREPRISE' && user.id_entreprise !== req.user.id_entreprise) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }
    
    // Vérifier les droits de modification selon le rôle actuel
    if (user.nom_role === 'SUPER_ADMINISTRATEUR' && req.user.nom_role !== 'SUPER_ADMINISTRATEUR') {
      return res.status(403).json({ 
        message: 'Seul un super administrateur peut modifier un super administrateur' 
      });
    }
    
    // Vérifier que le nouveau rôle existe et les droits d'attribution
    const [roles] = await pool.query('SELECT * FROM roles WHERE id_role = ?', [id_role]);
    if (roles.length === 0) {
      return res.status(400).json({ message: 'Rôle invalide' });
    }
    
    const newRole = roles[0];
    
    // Contrôles de sécurité pour l'attribution du nouveau rôle
    if (newRole.nom_role === 'SUPER_ADMINISTRATEUR' && req.user.nom_role !== 'SUPER_ADMINISTRATEUR') {
      return res.status(403).json({ 
        message: 'Seul un super administrateur peut attribuer le rôle super administrateur' 
      });
    }
    
    if ((newRole.nom_role === 'ADMINISTRATEUR' || newRole.nom_role === 'CONSULTANT') 
        && req.user.nom_role !== 'SUPER_ADMINISTRATEUR') {
      return res.status(403).json({ 
        message: 'Seul un super administrateur peut attribuer les rôles administrateur ou consultant' 
      });
    }
    
    // Empêcher la modification de son propre rôle
    if (userId === req.user.id_acteur) {
      return res.status(400).json({ 
        message: 'Vous ne pouvez pas modifier votre propre rôle' 
      });
    }
    
    // Mettre à jour le rôle
    await pool.query('UPDATE acteurs SET id_role = ?, date_modification = NOW() WHERE id_acteur = ?', [id_role, userId]);
    
    // Supprimer les anciennes permissions individuelles
    await pool.query('DELETE FROM permissions WHERE id_acteur = ?', [userId]);
    
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
    `, [userId, userId, id_role]);
    
    logger.info(`Rôle de l'utilisateur ${user.email} modifié de ${user.nom_role} vers ${newRole.nom_role} par ${req.user.email}`);
    console.log('✅ Rôle mis à jour avec succès');
    
    res.status(200).json({ 
      message: 'Rôle mis à jour avec succès',
      ancien_role: user.nom_role,
      nouveau_role: newRole.nom_role,
      updated_by: req.user.email
    });
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du rôle:', error);
    logger.error('Erreur lors de la mise à jour du rôle:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du rôle' });
  }
});

// GET statistiques des permissions par entreprise (avec contrôles d'accès)
router.get('/stats/entreprise/:entrepriseId', authenticateToken, checkRoleAccess('VIEW'), async (req, res) => {
  try {
    const { entrepriseId } = req.params;
    
    console.log('📥 GET /permissions-management/stats/entreprise/:entrepriseId');
    console.log('👤 Demandé par:', req.user.email, 'Entreprise cible:', entrepriseId);
    
    // Vérifier l'accès à cette entreprise
    if (req.userRights.scope === 'ENTREPRISE' && req.user.id_entreprise !== entrepriseId) {
      return res.status(403).json({ message: 'Accès non autorisé à cette entreprise' });
    }
    
    // Statistiques des utilisateurs par rôle
    const [roleStats] = await pool.query(`
      SELECT r.nom_role, COUNT(a.id_acteur) as nombre_utilisateurs
      FROM roles r
      LEFT JOIN acteurs a ON r.id_role = a.id_role AND a.id_entreprise = ?
      GROUP BY r.id_role, r.nom_role
      ORDER BY r.nom_role
    `, [entrepriseId]);
    
    // Modules les plus utilisés
    const [moduleStats] = await pool.query(`
      SELECT m.nom_module, COUNT(DISTINCT a.id_acteur) as utilisateurs_autorises
      FROM modules m
      JOIN role_permissions rp ON m.id_module = rp.id_module
      JOIN acteurs a ON rp.id_role = a.id_role
      WHERE a.id_entreprise = ? AND rp.peut_voir = TRUE
      GROUP BY m.id_module, m.nom_module
      ORDER BY utilisateurs_autorises DESC
    `, [entrepriseId]);
    
    console.log('✅ Statistiques récupérées pour l\'entreprise:', entrepriseId);
    
    res.status(200).json({
      entreprise_id: entrepriseId,
      roles: roleStats,
      modules: moduleStats,
      scope: req.userRights.scope,
      generated_by: req.user.email
    });
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des statistiques:', error);
    logger.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des statistiques' });
  }
});

// GET informations sur les droits de l'utilisateur connecté
router.get('/user-rights', authenticateToken, async (req, res) => {
  try {
    const userRole = req.user.nom_role || req.user.role;
    const isGlobalUser = req.user.niveau_acces === 'GLOBAL' || 
                        userRole === 'SUPER_ADMINISTRATEUR' || 
                        userRole === 'CONSULTANT';
    
    const userRights = {
      canViewAll: isGlobalUser || userRole === 'ADMINISTRATEUR' || userRole === 'MANAGER',
      canEdit: userRole === 'SUPER_ADMINISTRATEUR' || userRole === 'ADMINISTRATEUR',
      canDelete: userRole === 'SUPER_ADMINISTRATEUR',
      canManagePermissions: userRole === 'SUPER_ADMINISTRATEUR' || userRole === 'ADMINISTRATEUR',
      canManageRoles: userRole === 'SUPER_ADMINISTRATEUR',
      canManageUsers: userRole === 'SUPER_ADMINISTRATEUR' || userRole === 'ADMINISTRATEUR',
      canManageModules: userRole === 'SUPER_ADMINISTRATEUR',
      scope: isGlobalUser ? 'GLOBAL' : 'ENTREPRISE',
      role: userRole,
      entreprise: req.user.id_entreprise
    };

    res.status(200).json(userRights);
  } catch (error) {
    logger.error('Erreur lors de la récupération des droits utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des droits' });
  }
});

module.exports = router;