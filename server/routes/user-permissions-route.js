// server/routes/user-permissions-route.js - Route pour les permissions utilisateur avancées
const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

// Middleware pour vérifier le token JWT
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Token d\'accès requis' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token invalide' });
  }
};

// GET /api/user/permissions - Obtenir l'utilisateur avec ses permissions détaillées
router.get('/permissions', verifyToken, async (req, res) => {
  try {
    console.log('🔑 Récupération permissions détaillées pour:', req.user.email);
    
    // Récupérer les informations complètes de l'utilisateur
    const [users] = await pool.query(`
      SELECT 
        a.id_acteur,
        a.nom_prenom,
        a.email,
        a.organisation,
        a.id_entreprise,
        a.anciennete_role,
        r.nom_role,
        r.niveau_acces,
        e.nom_entreprise
      FROM acteurs a
      JOIN roles r ON a.id_role = r.id_role
      LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
      WHERE a.id_acteur = ?
    `, [req.user.id_acteur]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    const user = users[0];
    
    // Générer les permissions basées sur le rôle
    let permissions = [];
    let hasGlobalAccess = false;
    
    // Déterminer les permissions selon le rôle
    switch (user.nom_role) {
      case 'SUPER_ADMINISTRATEUR':
      case 'ADMINISTRATEUR':
        hasGlobalAccess = true;
        permissions = [
          { nom_module: 'DASHBOARD', route_base: '/', peut_voir: true, peut_editer: true, peut_supprimer: true, peut_administrer: true },
          { nom_module: 'QUESTIONNAIRES', route_base: '/questionnaires', peut_voir: true, peut_editer: true, peut_supprimer: true, peut_administrer: true },
          { nom_module: 'FORMULAIRES', route_base: '/formulaires', peut_voir: true, peut_editer: true, peut_supprimer: true, peut_administrer: true },
          { nom_module: 'ANALYSES', route_base: '/analyses-fonctions', peut_voir: true, peut_editer: true, peut_supprimer: true, peut_administrer: true },
          { nom_module: 'APPLICATIONS', route_base: '/applications', peut_voir: true, peut_editer: true, peut_supprimer: true, peut_administrer: true },
          { nom_module: 'ENTREPRISES', route_base: '/organisations', peut_voir: true, peut_editer: true, peut_supprimer: true, peut_administrer: true },
          { 
            nom_module: 'ADMINISTRATION', 
            route_base: '/admin', 
            peut_voir: true, 
            peut_editer: true, 
            peut_supprimer: true, 
            peut_administrer: true,
            sous_permissions: [
              { nom_module: 'ADMIN_USERS', route_base: '/admin/users', peut_voir: true, peut_editer: true, peut_supprimer: true, peut_administrer: true },
              { nom_module: 'ADMIN_PERMISSIONS', route_base: '/admin/permissions', peut_voir: true, peut_editer: true, peut_supprimer: true, peut_administrer: true },
              { nom_module: 'ADMIN_ROLES', route_base: '/admin/roles', peut_voir: true, peut_editer: true, peut_supprimer: true, peut_administrer: true },
              { nom_module: 'ADMIN_MATURITY', route_base: '/admin/maturity-model', peut_voir: true, peut_editer: true, peut_supprimer: true, peut_administrer: true },
              { nom_module: 'ADMIN_SYSTEM', route_base: '/admin/system', peut_voir: true, peut_editer: true, peut_supprimer: true, peut_administrer: true }
            ]
          }
        ];
        break;
        
      case 'CONSULTANT':
        hasGlobalAccess = user.niveau_acces === 'GLOBAL';
        permissions = [
          { nom_module: 'DASHBOARD', route_base: '/', peut_voir: true, peut_editer: false, peut_supprimer: false, peut_administrer: false },
          { nom_module: 'QUESTIONNAIRES', route_base: '/questionnaires', peut_voir: true, peut_editer: true, peut_supprimer: true, peut_administrer: false },
          { nom_module: 'FORMULAIRES', route_base: '/formulaires', peut_voir: true, peut_editer: true, peut_supprimer: true, peut_administrer: false },
          { nom_module: 'ANALYSES', route_base: '/analyses-fonctions', peut_voir: true, peut_editer: true, peut_supprimer: false, peut_administrer: false },
          { nom_module: 'APPLICATIONS', route_base: '/applications', peut_voir: true, peut_editer: true, peut_supprimer: false, peut_administrer: false },
          { nom_module: 'ENTREPRISES', route_base: '/organisations', peut_voir: true, peut_editer: true, peut_supprimer: false, peut_administrer: false }
        ];
        break;
        
      case 'MANAGER':
        permissions = [
          { nom_module: 'DASHBOARD', route_base: '/', peut_voir: true, peut_editer: false, peut_supprimer: false, peut_administrer: false },
          { nom_module: 'QUESTIONNAIRES', route_base: '/questionnaires', peut_voir: true, peut_editer: true, peut_supprimer: false, peut_administrer: false },
          { nom_module: 'FORMULAIRES', route_base: '/formulaires', peut_voir: true, peut_editer: true, peut_supprimer: false, peut_administrer: false },
          { nom_module: 'ANALYSES', route_base: '/analyses-fonctions', peut_voir: true, peut_editer: false, peut_supprimer: false, peut_administrer: false },
          { nom_module: 'APPLICATIONS', route_base: '/applications', peut_voir: true, peut_editer: false, peut_supprimer: false, peut_administrer: false }
        ];
        break;
        
      default: // INTERVENANT
        permissions = [
          { nom_module: 'DASHBOARD', route_base: '/', peut_voir: true, peut_editer: false, peut_supprimer: false, peut_administrer: false },
          { nom_module: 'QUESTIONNAIRES', route_base: '/questionnaires', peut_voir: true, peut_editer: true, peut_supprimer: false, peut_administrer: false },
          { nom_module: 'FORMULAIRES', route_base: '/formulaires', peut_voir: true, peut_editer: true, peut_supprimer: false, peut_administrer: false },
          { nom_module: 'ANALYSES', route_base: '/analyses-fonctions', peut_voir: true, peut_editer: false, peut_supprimer: false, peut_administrer: false }
        ];
        break;
    }
    
    console.log(`✅ Permissions générées pour ${user.nom_role}: ${permissions.length} modules`);
    
    res.status(200).json({
      user: {
        id_acteur: user.id_acteur,
        nom_prenom: user.nom_prenom,
        email: user.email,
        organisation: user.organisation,
        nom_role: user.nom_role,
        niveau_acces: user.niveau_acces,
        id_entreprise: user.id_entreprise,
        nom_entreprise: user.nom_entreprise,
        anciennete_role: user.anciennete_role
      },
      permissions,
      hasGlobalAccess
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des permissions:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/user/profile - Obtenir le profil utilisateur simplifié
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const [users] = await pool.query(`
      SELECT 
        a.id_acteur,
        a.nom_prenom,
        a.email,
        a.organisation,
        r.nom_role,
        r.niveau_acces
      FROM acteurs a
      JOIN roles r ON a.id_role = r.id_role
      WHERE a.id_acteur = ?
    `, [req.user.id_acteur]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    res.status(200).json({
      user: users[0]
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du profil:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// PUT /api/user/profile - Mettre à jour le profil utilisateur
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { nom_prenom, organisation } = req.body;
    
    const updateFields = [];
    const updateValues = [];
    
    if (nom_prenom) {
      updateFields.push('nom_prenom = ?');
      updateValues.push(nom_prenom);
    }
    
    if (organisation) {
      updateFields.push('organisation = ?');
      updateValues.push(organisation);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'Aucune donnée à mettre à jour' });
    }
    
    updateFields.push('date_modification = NOW()');
    updateValues.push(req.user.id_acteur);
    
    await pool.query(
      `UPDATE acteurs SET ${updateFields.join(', ')} WHERE id_acteur = ?`,
      updateValues
    );
    
    // Récupérer les données mises à jour
    const [users] = await pool.query(`
      SELECT 
        a.id_acteur,
        a.nom_prenom,
        a.email,
        a.organisation,
        r.nom_role,
        r.niveau_acces
      FROM acteurs a
      JOIN roles r ON a.id_role = r.id_role
      WHERE a.id_acteur = ?
    `, [req.user.id_acteur]);
    
    console.log(`✅ Profil mis à jour pour: ${req.user.email}`);
    
    res.status(200).json({
      message: 'Profil mis à jour avec succès',
      user: users[0]
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du profil:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;