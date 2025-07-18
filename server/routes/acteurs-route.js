// server/routes/acteurs-route.js 
const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const bcrypt = require('bcrypt');
const { 
  authenticateToken, 
  checkPermission, 
  requireAdminLevel,
  getUserRights 
} = require('../middlewares/auth-middleware');

// Middleware pour vérifier les droits sur les acteurs
const checkActeursPermissions = (action = 'VIEW') => {
  return (req, res, next) => {
    const userRole = req.user.nom_role || req.user.role;
    const isGlobalUser = req.user.niveau_acces === 'GLOBAL' || 
                        userRole === 'SUPER_ADMINISTRATEUR' || 
                        userRole === 'CONSULTANT';
    
    // Définir les droits selon le rôle
    const rights = {
      canViewAll: isGlobalUser || ['ADMINISTRATEUR', 'MANAGER'].includes(userRole),
      canViewOwn: true, // Tout le monde peut voir ses propres infos
      canEdit: ['SUPER_ADMINISTRATEUR', 'ADMINISTRATEUR', 'MANAGER'].includes(userRole),
      canCreate: ['SUPER_ADMINISTRATEUR', 'ADMINISTRATEUR', 'MANAGER'].includes(userRole),
      canDelete: ['SUPER_ADMINISTRATEUR', 'ADMINISTRATEUR'].includes(userRole),
      scope: isGlobalUser ? 'GLOBAL' : 'ENTREPRISE'
    };
    
    // Vérifier l'action demandée
    switch (action) {
      case 'VIEW_ALL':
        if (!rights.canViewAll) {
          return res.status(403).json({ 
            message: 'Droits insuffisants pour consulter les acteurs',
            hint: 'Seuls les administrateurs et managers peuvent voir tous les acteurs'
          });
        }
        break;
      case 'CREATE':
        if (!rights.canCreate) {
          return res.status(403).json({ 
            message: 'Droits insuffisants pour créer des acteurs'
          });
        }
        break;
      case 'EDIT':
        if (!rights.canEdit) {
          return res.status(403).json({ 
            message: 'Droits insuffisants pour modifier des acteurs'
          });
        }
        break;
      case 'DELETE':
        if (!rights.canDelete) {
          return res.status(403).json({ 
            message: 'Droits insuffisants pour supprimer des acteurs'
          });
        }
        break;
    }
    
    req.acteursRights = rights;
    next();
  };
};

// GET /acteurs - Liste tous les acteurs (avec permissions)
router.get('/', authenticateToken, checkActeursPermissions('VIEW_ALL'), async (req, res) => {
  try {
    console.log('📥 GET /acteurs');
    console.log('👤 Demandé par:', req.user.email, 'Rôle:', req.user.nom_role, 'Scope:', req.acteursRights.scope);
    
    let query = `
      SELECT 
        a.id_acteur,
        a.nom_prenom,
        a.email,
        a.id_entreprise,
        a.id_role,
        a.organisation,
        a.anciennete_role,
        a.date_creation,
        a.date_modification,
        a.compte_actif,
        e.nom_entreprise,
        r.nom_role
      FROM acteurs a
      LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
      LEFT JOIN roles r ON a.id_role = r.id_role
      WHERE a.compte_actif = TRUE
    `;
    
    let queryParams = [];
    
    // Filtrer selon le scope de l'utilisateur
    if (req.acteursRights.scope === 'ENTREPRISE') {
      query += ' AND a.id_entreprise = ?';
      queryParams.push(req.user.id_entreprise);
    }
    
    query += ' ORDER BY e.nom_entreprise, a.nom_prenom';
    
    const [acteurs] = await pool.query(query, queryParams);
    
    console.log('✅ Acteurs récupérés:', acteurs.length);
    
    res.status(200).json({
      acteurs,
      scope: req.acteursRights.scope,
      user_rights: req.acteursRights
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des acteurs:', error);
    logger.error('Erreur lors de la récupération des acteurs:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des acteurs' });
  }
});

// GET /acteurs/entreprise/:id - Acteurs d'une entreprise spécifique
router.get('/entreprise/:id', authenticateToken, checkActeursPermissions('VIEW_ALL'), async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📥 GET /acteurs/entreprise/:id pour entreprise:', id);
    console.log('👤 Demandé par:', req.user.email, 'Scope:', req.acteursRights.scope);
    
    // Vérifier les droits d'accès à cette entreprise
    if (req.acteursRights.scope === 'ENTREPRISE' && id !== req.user.id_entreprise) {
      return res.status(403).json({ 
        message: 'Accès non autorisé à cette entreprise',
        hint: 'Vous ne pouvez consulter que les acteurs de votre entreprise'
      });
    }
    
    const [acteurs] = await pool.query(`
      SELECT 
        a.id_acteur,
        a.nom_prenom,
        a.email,
        a.id_entreprise,
        a.id_role,
        a.organisation,
        a.anciennete_role,
        a.date_creation,
        a.date_modification,
        a.compte_actif,
        e.nom_entreprise,
        r.nom_role
      FROM acteurs a
      LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
      LEFT JOIN roles r ON a.id_role = r.id_role
      WHERE a.id_entreprise = ? AND a.compte_actif = TRUE
      ORDER BY a.nom_prenom
    `, [id]);
    
    console.log('✅ Acteurs trouvés pour entreprise', id, ':', acteurs.length);
    
    res.status(200).json({
      acteurs,
      entreprise_id: id,
      scope: req.acteursRights.scope
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des acteurs de l\'entreprise:', error);
    logger.error('Erreur lors de la récupération des acteurs de l\'entreprise:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des acteurs' });
  }
});

// GET /acteurs/:id - Détails d'un acteur
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📥 GET /acteurs/:id pour acteur:', id);
    
    const [acteurs] = await pool.query(`
      SELECT 
        a.id_acteur,
        a.nom_prenom,
        a.email,
        a.id_entreprise,
        a.id_role,
        a.organisation,
        a.anciennete_role,
        a.date_creation,
        a.date_modification,
        a.compte_actif,
        e.nom_entreprise,
        r.nom_role
      FROM acteurs a
      LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
      LEFT JOIN roles r ON a.id_role = r.id_role
      WHERE a.id_acteur = ?
    `, [id]);
    
    if (acteurs.length === 0) {
      return res.status(404).json({ message: 'Acteur non trouvé' });
    }
    
    const acteur = acteurs[0];
    
    // Vérifier les droits d'accès
    const userRole = req.user.nom_role || req.user.role;
    const isGlobalUser = req.user.niveau_acces === 'GLOBAL' || 
                        userRole === 'SUPER_ADMINISTRATEUR' || 
                        userRole === 'CONSULTANT';
    const canViewAll = isGlobalUser || ['ADMINISTRATEUR', 'MANAGER'].includes(userRole);
    const canViewOwn = id === req.user.id_acteur;
    const sameEnterprise = acteur.id_entreprise === req.user.id_entreprise;
    
    if (!canViewAll && !canViewOwn && !sameEnterprise) {
      return res.status(403).json({ 
        message: 'Accès non autorisé à cet acteur'
      });
    }
    
    // Masquer certaines informations sensibles selon les droits
    if (!canViewAll && !canViewOwn) {
      delete acteur.email;
    }
    
    console.log('✅ Acteur récupéré:', acteur.nom_prenom);
    
    res.status(200).json(acteur);
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de l\'acteur:', error);
    logger.error('Erreur lors de la récupération de l\'acteur:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'acteur' });
  }
});

// POST /acteurs - Créer un nouvel acteur
router.post('/', authenticateToken, checkActeursPermissions('CREATE'), async (req, res) => {
  try {
    const {
      nom_prenom,
      email,
      password,
      id_entreprise,
      id_role,
      organisation,
      anciennete_role
    } = req.body;
    
    console.log('📥 POST /acteurs');
    console.log('👤 Créé par:', req.user.email, 'Pour entreprise:', id_entreprise);
    
    // Validation des champs requis
    if (!nom_prenom || !email || !password || !id_entreprise || !id_role || !organisation || !anciennete_role) {
      return res.status(400).json({ 
        message: 'Champs requis manquants',
        required: ['nom_prenom', 'email', 'password', 'id_entreprise', 'id_role', 'organisation', 'anciennete_role']
      });
    }
    
    // Vérifier les droits selon le scope
    if (req.acteursRights.scope === 'ENTREPRISE' && id_entreprise !== req.user.id_entreprise) {
      return res.status(403).json({ 
        message: 'Vous ne pouvez créer des acteurs que pour votre entreprise'
      });
    }
    
    // Vérifier que l'email n'existe pas déjà
    const [existingActeur] = await pool.query(
      'SELECT id_acteur FROM acteurs WHERE email = ?',
      [email]
    );
    
    if (existingActeur.length > 0) {
      return res.status(409).json({ message: 'Un acteur avec cet email existe déjà' });
    }
    
    // Vérifier que l'entreprise existe
    const [entreprise] = await pool.query(
      'SELECT id_entreprise FROM entreprises WHERE id_entreprise = ?',
      [id_entreprise]
    );
    
    if (entreprise.length === 0) {
      return res.status(400).json({ message: 'Entreprise non trouvée' });
    }
    
    // Vérifier que le rôle existe et les droits d'attribution
    const [roles] = await pool.query(
      'SELECT nom_role FROM roles WHERE id_role = ?',
      [id_role]
    );
    
    if (roles.length === 0) {
      return res.status(400).json({ message: 'Rôle non trouvé' });
    }
    
    const targetRole = roles[0].nom_role;
    const userRole = req.user.nom_role || req.user.role;
    
    // Contrôles d'attribution de rôle
    if (targetRole === 'SUPER_ADMINISTRATEUR' && userRole !== 'SUPER_ADMINISTRATEUR') {
      return res.status(403).json({ 
        message: 'Seul un super administrateur peut créer un super administrateur'
      });
    }
    
    if (['ADMINISTRATEUR', 'CONSULTANT'].includes(targetRole) && userRole !== 'SUPER_ADMINISTRATEUR') {
      return res.status(403).json({ 
        message: 'Seul un super administrateur peut créer des administrateurs ou consultants'
      });
    }
    
    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Créer l'acteur
    const id_acteur = uuidv4();
    
    await pool.query(`
      INSERT INTO acteurs (
        id_acteur, nom_prenom, email, password_hash,
        id_entreprise, id_role, organisation, anciennete_role,
        date_creation, date_modification, compte_actif
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), TRUE)
    `, [
      id_acteur, nom_prenom, email, hashedPassword,
      id_entreprise, id_role, organisation, anciennete_role
    ]);
    
    // Récupérer l'acteur créé avec ses relations
    const [newActeur] = await pool.query(`
      SELECT 
        a.id_acteur,
        a.nom_prenom,
        a.email,
        a.id_entreprise,
        a.id_role,
        a.organisation,
        a.anciennete_role,
        a.date_creation,
        a.date_modification,
        a.compte_actif,
        e.nom_entreprise,
        r.nom_role
      FROM acteurs a
      LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
      LEFT JOIN roles r ON a.id_role = r.id_role
      WHERE a.id_acteur = ?
    `, [id_acteur]);
    
    console.log('✅ Acteur créé:', newActeur[0].nom_prenom);
    
    // Log pour audit
    logger.info(`Acteur créé par ${req.user.email}: ${email} (rôle: ${targetRole}, entreprise: ${id_entreprise})`);
    
    res.status(201).json({
      message: 'Acteur créé avec succès',
      acteur: newActeur[0]
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'acteur:', error);
    logger.error('Erreur lors de la création de l\'acteur:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la création de l\'acteur' });
  }
});

// PUT /acteurs/:id - Modifier un acteur
router.put('/:id', authenticateToken, checkActeursPermissions('EDIT'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nom_prenom,
      email,
      id_entreprise,
      id_role,
      organisation,
      anciennete_role
    } = req.body;
    
    console.log('📥 PUT /acteurs/:id pour acteur:', id);
    console.log('👤 Modifié par:', req.user.email);
    
    // Vérifier que l'acteur existe
    const [existingActeur] = await pool.query(
      'SELECT id_acteur, id_entreprise, id_role FROM acteurs WHERE id_acteur = ?',
      [id]
    );
    
    if (existingActeur.length === 0) {
      return res.status(404).json({ message: 'Acteur non trouvé' });
    }
    
    const acteur = existingActeur[0];
    
    // Vérifier les droits d'accès
    if (req.acteursRights.scope === 'ENTREPRISE' && acteur.id_entreprise !== req.user.id_entreprise) {
      return res.status(403).json({ 
        message: 'Vous ne pouvez modifier que les acteurs de votre entreprise'
      });
    }
    
    // Vérifier le rôle actuel de l'acteur
    const [currentRole] = await pool.query(
      'SELECT nom_role FROM roles WHERE id_role = ?',
      [acteur.id_role]
    );
    
    const currentRoleName = currentRole[0]?.nom_role || 'UNKNOWN';
    
    // Empêcher la modification de certains acteurs sensibles
    const userRole = req.user.nom_role || req.user.role;
    if (currentRoleName === 'SUPER_ADMINISTRATEUR' && userRole !== 'SUPER_ADMINISTRATEUR') {
      return res.status(403).json({ 
        message: 'Seul un super administrateur peut modifier un super administrateur'
      });
    }
    
    // Préparer la mise à jour
    let updateQuery = 'UPDATE acteurs SET date_modification = NOW()';
    let updateParams = [];
    
    if (nom_prenom) {
      updateQuery += ', nom_prenom = ?';
      updateParams.push(nom_prenom);
    }
    
    if (email) {
      // Vérifier l'unicité de l'email
      const [emailCheck] = await pool.query(
        'SELECT id_acteur FROM acteurs WHERE email = ? AND id_acteur != ?',
        [email, id]
      );
      
      if (emailCheck.length > 0) {
        return res.status(409).json({ message: 'Un acteur avec cet email existe déjà' });
      }
      
      updateQuery += ', email = ?';
      updateParams.push(email);
    }
    
    if (id_entreprise && req.acteursRights.scope === 'GLOBAL') {
      // Vérifier que l'entreprise existe
      const [entreprise] = await pool.query(
        'SELECT id_entreprise FROM entreprises WHERE id_entreprise = ?',
        [id_entreprise]
      );
      
      if (entreprise.length === 0) {
        return res.status(400).json({ message: 'Entreprise non trouvée' });
      }
      
      updateQuery += ', id_entreprise = ?';
      updateParams.push(id_entreprise);
    }
    
    if (id_role) {
      // Vérifier que le rôle existe et les droits d'attribution
      const [roles] = await pool.query('SELECT nom_role FROM roles WHERE id_role = ?', [id_role]);
      if (roles.length === 0) {
        return res.status(400).json({ message: 'Rôle non trouvé' });
      }
      
      const targetRole = roles[0].nom_role;
      
      if (targetRole === 'SUPER_ADMINISTRATEUR' && userRole !== 'SUPER_ADMINISTRATEUR') {
        return res.status(403).json({ 
          message: 'Seul un super administrateur peut attribuer le rôle super administrateur'
        });
      }
      
      if (['ADMINISTRATEUR', 'CONSULTANT'].includes(targetRole) && userRole !== 'SUPER_ADMINISTRATEUR') {
        return res.status(403).json({ 
          message: 'Seul un super administrateur peut attribuer les rôles administrateur ou consultant'
        });
      }
      
      updateQuery += ', id_role = ?';
      updateParams.push(id_role);
    }
    
    if (organisation) {
      updateQuery += ', organisation = ?';
      updateParams.push(organisation);
    }
    
    if (anciennete_role !== undefined) {
      updateQuery += ', anciennete_role = ?';
      updateParams.push(anciennete_role);
    }
    
    updateQuery += ' WHERE id_acteur = ?';
    updateParams.push(id);
    
    // Exécuter la mise à jour
    await pool.query(updateQuery, updateParams);
    
    // Récupérer l'acteur mis à jour
    const [updatedActeur] = await pool.query(`
      SELECT 
        a.id_acteur,
        a.nom_prenom,
        a.email,
        a.id_entreprise,
        a.id_role,
        a.organisation,
        a.anciennete_role,
        a.date_creation,
        a.date_modification,
        a.compte_actif,
        e.nom_entreprise,
        r.nom_role
      FROM acteurs a
      LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
      LEFT JOIN roles r ON a.id_role = r.id_role
      WHERE a.id_acteur = ?
    `, [id]);
    
    console.log('✅ Acteur mis à jour:', updatedActeur[0].nom_prenom);
    
    // Log pour audit
    logger.info(`Acteur modifié par ${req.user.email}: ${updatedActeur[0].email}`);
    
    res.status(200).json({
      message: 'Acteur mis à jour avec succès',
      acteur: updatedActeur[0]
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour de l\'acteur:', error);
    logger.error('Erreur lors de la mise à jour de l\'acteur:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de l\'acteur' });
  }
});

// DELETE /acteurs/:id - Supprimer un acteur (soft delete)
router.delete('/:id', authenticateToken, checkActeursPermissions('DELETE'), async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('📥 DELETE /acteurs/:id pour acteur:', id);
    console.log('👤 Supprimé par:', req.user.email);
    
    // Vérifier que l'acteur existe
    const [existingActeur] = await pool.query(
      'SELECT id_acteur, id_entreprise, email, nom_prenom FROM acteurs WHERE id_acteur = ?',
      [id]
    );
    
    if (existingActeur.length === 0) {
      return res.status(404).json({ message: 'Acteur non trouvé' });
    }
    
    const acteur = existingActeur[0];
    
    // Empêcher la suppression de son propre compte
    if (id === req.user.id_acteur) {
      return res.status(400).json({ 
        message: 'Vous ne pouvez pas supprimer votre propre compte'
      });
    }
    
    // Vérifier les droits d'accès
    if (req.acteursRights.scope === 'ENTREPRISE' && acteur.id_entreprise !== req.user.id_entreprise) {
      return res.status(403).json({ 
        message: 'Vous ne pouvez supprimer que les acteurs de votre entreprise'
      });
    }
    
    // Soft delete
    await pool.query(
      'UPDATE acteurs SET compte_actif = FALSE, date_modification = NOW() WHERE id_acteur = ?',
      [id]
    );
    
    console.log('✅ Acteur supprimé (soft delete):', acteur.nom_prenom);
    
    // Log pour audit
    logger.info(`Acteur supprimé par ${req.user.email}: ${acteur.email}`);
    
    res.status(200).json({
      message: 'Acteur supprimé avec succès'
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de la suppression de l\'acteur:', error);
    logger.error('Erreur lors de la suppression de l\'acteur:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression de l\'acteur' });
  }
});

// GET /acteurs/permissions/check - Vérifier les droits de l'utilisateur connecté
router.get('/permissions/check', authenticateToken, async (req, res) => {
  try {
    const userRole = req.user.nom_role || req.user.role;
    const isGlobalUser = req.user.niveau_acces === 'GLOBAL' || 
                        userRole === 'SUPER_ADMINISTRATEUR' || 
                        userRole === 'CONSULTANT';
    
    const permissions = {
      canViewAll: isGlobalUser || ['ADMINISTRATEUR', 'MANAGER'].includes(userRole),
      canViewOwn: true,
      canEdit: ['SUPER_ADMINISTRATEUR', 'ADMINISTRATEUR', 'MANAGER'].includes(userRole),
      canCreate: ['SUPER_ADMINISTRATEUR', 'ADMINISTRATEUR', 'MANAGER'].includes(userRole),
      canDelete: ['SUPER_ADMINISTRATEUR', 'ADMINISTRATEUR'].includes(userRole),
      scope: isGlobalUser ? 'GLOBAL' : 'ENTREPRISE',
      role: userRole,
      enterprise: req.user.id_entreprise
    };
    
    res.status(200).json(permissions);
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des permissions:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la vérification des permissions' });
  }
});

module.exports = router;
