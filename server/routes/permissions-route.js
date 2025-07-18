// server/routes/permissions-route.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');

// GET toutes les permissions
router.get('/', async (req, res) => {
  try {
    const [permissions] = await pool.query(`
      SELECT p.*, a.nom_prenom
      FROM permissions p
      JOIN acteurs a ON p.id_acteur = a.id_acteur
    `);
    res.status(200).json(permissions);
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des permissions' });
  }
});

// GET permission par ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [permissions] = await pool.query(`
      SELECT p.*, a.nom_prenom
      FROM permissions p
      JOIN acteurs a ON p.id_acteur = a.id_acteur
      WHERE p.id_permission = ?
    `, [id]);
    
    if (permissions.length === 0) {
      return res.status(404).json({ message: 'Permission non trouvée' });
    }
    
    res.status(200).json(permissions[0]);
  } catch (error) {
    console.error('Erreur lors de la récupération de la permission:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de la permission' });
  }
});

// GET permissions par acteur
router.get('/acteur/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [permissions] = await pool.query(`
      SELECT * FROM permissions WHERE id_acteur = ?
    `, [id]);
    
    res.status(200).json(permissions);
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions par acteur:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des permissions par acteur' });
  }
});

// POST nouvelle permission
router.post('/', async (req, res) => {
  try {
    const { 
      id_acteur,
      ressource,
      action,
      conditions
    } = req.body;
    
    if (!id_acteur || !ressource || !action) {
      return res.status(400).json({ 
        message: 'Données invalides: id_acteur, ressource et action sont requis' 
      });
    }
    
    const id_permission = uuidv4();
    const now = new Date();
    
    await pool.query(`
      INSERT INTO permissions (
        id_permission, id_acteur, ressource, action,
        conditions, date_creation, date_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      id_permission,
      id_acteur,
      ressource,
      action,
      JSON.stringify(conditions || {}),
      now,
      now
    ]);
    
    res.status(201).json({
      id_permission,
      id_acteur,
      ressource,
      action,
      conditions: conditions || {},
      date_creation: now,
      date_modification: now
    });
  } catch (error) {
    console.error('Erreur lors de la création de la permission:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la création de la permission' });
  }
});

// PUT mettre à jour une permission
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      ressource,
      action,
      conditions
    } = req.body;
    
    // Vérifier si la permission existe
    const [permissions] = await pool.query('SELECT * FROM permissions WHERE id_permission = ?', [id]);
    
    if (permissions.length === 0) {
      return res.status(404).json({ message: 'Permission non trouvée' });
    }
    
    // Construire la requête de mise à jour
    let updateQuery = 'UPDATE permissions SET date_modification = NOW()';
    const updateParams = [];
    
    if (ressource !== undefined) {
      updateQuery += ', ressource = ?';
      updateParams.push(ressource);
    }
    
    if (action !== undefined) {
      updateQuery += ', action = ?';
      updateParams.push(action);
    }
    
    if (conditions !== undefined) {
      updateQuery += ', conditions = ?';
      updateParams.push(JSON.stringify(conditions));
    }
    
    updateQuery += ' WHERE id_permission = ?';
    updateParams.push(id);
    
    await pool.query(updateQuery, updateParams);
    
    // Récupérer la permission mise à jour
    const [updatedPermissions] = await pool.query('SELECT * FROM permissions WHERE id_permission = ?', [id]);
    
    // Convertir les chaînes JSON en objets
    const updatedPermission = {
      ...updatedPermissions[0],
      conditions: JSON.parse(updatedPermissions[0].conditions || '{}')
    };
    
    res.status(200).json(updatedPermission);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la permission:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de la permission' });
  }
});

// DELETE supprimer une permission
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier si la permission existe
    const [permissions] = await pool.query('SELECT * FROM permissions WHERE id_permission = ?', [id]);
    
    if (permissions.length === 0) {
      return res.status(404).json({ message: 'Permission non trouvée' });
    }
    
    await pool.query('DELETE FROM permissions WHERE id_permission = ?', [id]);
    
    res.status(200).json({ message: 'Permission supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la permission:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression de la permission' });
  }
});

module.exports = router;