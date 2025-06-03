// server/routes/permissions-management-route.js
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

// GET tous les rôles disponibles
router.get('/roles', authenticateToken, requireConsultant, async (req, res) => {
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

// GET tous les modules disponibles
router.get('/modules', authenticateToken, requireConsultant, async (req, res) => {
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

// GET permissions d'un rôle spécifique
router.get('/roles/:roleId/permissions', authenticateToken, requireConsultant, async (req, res) => {
  try {
    const { roleId } = req.params;
    
    const [permissions] = await pool.query(`
      SELECT rp.*, m.nom_module, m.description as module_description
      FROM role_permissions rp
      JOIN modules m ON rp.id_module = m.id_module
      WHERE rp.id_role = ?
      ORDER BY m.ordre_affichage
    `, [roleId]);
    
    res.status(200).json(permissions);
  } catch (error) {
    logger.error('Erreur lors de la récupération des permissions du rôle:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des permissions' });
  }
});

// PUT mettre à jour les permissions d'un rôle
router.put('/roles/:roleId/permissions', authenticateToken, requireConsultant, async (req, res) => {
  try {
    const { roleId } = req.params;
    const { permissions } = req.body;
    
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ message: 'Le format des permissions est invalide' });
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
      
      res.status(200).json({ message: 'Permissions mises à jour avec succès' });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error('Erreur lors de la mise à jour des permissions:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour des permissions' });
  }
});

// GET permissions d'un utilisateur spécifique
router.get('/users/:userId/permissions', authenticateToken, requireManagerOrConsultant, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Vérifier que l'utilisateur peut voir ces permissions
    if (!req.user.hasGlobalAccess && req.user.id_acteur !== userId) {
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
    res.status(200).json(permissions);
  } catch (error) {
    logger.error('Erreur lors de la récupération des permissions utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des permissions' });
  }
});

// GET utilisateurs avec leurs rôles (pour la même entreprise ou tous pour consultants)
router.get('/users', authenticateToken, requireManagerOrConsultant, async (req, res) => {
  try {
    let query = `
      SELECT a.id_acteur, a.nom_prenom, a.email, a.organisation,
             a.id_entreprise, e.nom_entreprise,
             r.nom_role, r.niveau_acces,
             a.date_creation, a.date_modification
      FROM acteurs a
      JOIN roles r ON a.id_role = r.id_role
      LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
    `;
    
    let params = [];
    
    // Filtrer par entreprise si pas consultant
    if (!req.user.hasGlobalAccess) {
      query += ' WHERE a.id_entreprise = ?';
      params.push(req.user.id_entreprise);
    }
    
    query += ' ORDER BY a.nom_prenom';
    
    const [users] = await pool.query(query, params);
    res.status(200).json(users);
  } catch (error) {
    logger.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des utilisateurs' });
  }
});

// POST créer un nouvel utilisateur avec rôle et entreprise
router.post('/users', authenticateToken, requireManagerOrConsultant, async (req, res) => {
  try {
    const { 
      nom_prenom, 
      email, 
      organisation,
      id_entreprise,
      id_role,
      mot_de_passe
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
    
    // Vérifier que le rôle existe
    const [roles] = await pool.query('SELECT * FROM roles WHERE id_role = ?', [id_role]);
    if (roles.length === 0) {
      return res.status(400).json({ message: 'Rôle invalide' });
    }
    
    // Vérifier que l'entreprise existe
    if (id_entreprise) {
      const [entreprises] = await pool.query('SELECT * FROM entreprises WHERE id_entreprise = ?', [id_entreprise]);
      if (entreprises.length === 0) {
        return res.status(400).json({ message: 'Entreprise invalide' });
      }
    }
    
    const id_acteur = uuidv4();
    const now = new Date();
    
    // Créer l'utilisateur
    await pool.query(`
      INSERT INTO acteurs (
        id_acteur, nom_prenom, email, organisation, 
        id_entreprise, id_role, anciennete_role,
        date_creation, date_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id_acteur, 
      nom_prenom, 
      email, 
      organisation || 'Non spécifié',
      id_entreprise,
      id_role,
      0, // ancienneté par défaut
      now, 
      now
    ]);
    
    // Les permissions seront créées automatiquement par le trigger
    
    // Récupérer l'utilisateur créé avec toutes ses informations
    const [newUser] = await pool.query(`
      SELECT a.*, r.nom_role, r.niveau_acces, e.nom_entreprise
      FROM acteurs a
      JOIN roles r ON a.id_role = r.id_role
      LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
      WHERE a.id_acteur = ?
    `, [id_acteur]);
    
    res.status(201).json(newUser[0]);
  } catch (error) {
    logger.error('Erreur lors de la création de l\'utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la création de l\'utilisateur' });
  }
});

// PUT mettre à jour le rôle d'un utilisateur
router.put('/users/:userId/role', authenticateToken, requireManagerOrConsultant, async (req, res) => {
  try {
    const { userId } = req.params;
    const { id_role } = req.body;
    
    if (!id_role) {
      return res.status(400).json({ message: 'ID du rôle requis' });
    }
    
    // Vérifier que l'utilisateur cible existe et appartient à la bonne entreprise
    const [targetUser] = await pool.query(`
      SELECT a.*, r.nom_role 
      FROM acteurs a 
      JOIN roles r ON a.id_role = r.id_role 
      WHERE a.id_acteur = ?
    `, [userId]);
    
    if (targetUser.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    if (!req.user.hasGlobalAccess && targetUser[0].id_entreprise !== req.user.id_entreprise) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }
    
    // Vérifier que le nouveau rôle existe
    const [roles] = await pool.query('SELECT * FROM roles WHERE id_role = ?', [id_role]);
    if (roles.length === 0) {
      return res.status(400).json({ message: 'Rôle invalide' });
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
    
    res.status(200).json({ message: 'Rôle mis à jour avec succès' });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du rôle:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du rôle' });
  }
});

// GET statistiques des permissions par entreprise
router.get('/stats/entreprise/:entrepriseId', authenticateToken, requireManagerOrConsultant, async (req, res) => {
  try {
    const { entrepriseId } = req.params;
    
    // Vérifier l'accès à cette entreprise
    if (!req.user.hasGlobalAccess && entrepriseId !== req.user.id_entreprise) {
      return res.status(403).json({ message: 'Accès non autorisé' });
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
    
    res.status(200).json({
      roles: roleStats,
      modules: moduleStats
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des statistiques' });
  }
});

module.exports = router;