// server/routes/acteurs-route.js - Version mise à jour
const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');
const { 
  authenticateToken, 
  checkPermission, 
  filterByEntreprise,
  requireManagerOrConsultant
} = require('../middlewares/auth-middleware');

// GET tous les acteurs (avec filtrage par entreprise)
router.get('/', 
  authenticateToken, 
  checkPermission('USERS', 'voir'), 
  filterByEntreprise,
  async (req, res) => {
    try {
      let query = `
        SELECT a.*, r.nom_role, r.niveau_acces, e.nom_entreprise
        FROM acteurs a
        JOIN roles r ON a.id_role = r.id_role
        LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
      `;
      
      let params = [];
      
      // Filtrer par entreprise si l'utilisateur n'a pas accès global
      if (!req.user.hasGlobalAccess && req.entrepriseFilter) {
        query += ' WHERE a.id_entreprise = ?';
        params.push(req.entrepriseFilter);
      }
      
      query += ' ORDER BY a.nom_prenom';
      
      const [acteurs] = await pool.query(query, params);
      res.status(200).json(acteurs);
    } catch (error) {
      console.error('Erreur lors de la récupération des acteurs:', error);
      res.status(500).json({ message: 'Erreur serveur lors de la récupération des acteurs' });
    }
  }
);

// GET acteur par ID (avec vérification d'accès)
router.get('/:id', 
  authenticateToken, 
  checkPermission('USERS', 'voir'),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      let query = `
        SELECT a.*, r.nom_role, r.niveau_acces, e.nom_entreprise
        FROM acteurs a
        JOIN roles r ON a.id_role = r.id_role
        LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
        WHERE a.id_acteur = ?
      `;
      
      let params = [id];
      
      // Ajouter le filtre entreprise si nécessaire
      if (!req.user.hasGlobalAccess && req.user.id_entreprise) {
        query += ' AND a.id_entreprise = ?';
        params.push(req.user.id_entreprise);
      }
      
      const [acteurs] = await pool.query(query, params);
      
      if (acteurs.length === 0) {
        return res.status(404).json({ message: 'Acteur non trouvé ou accès non autorisé' });
      }
      
      res.status(200).json(acteurs[0]);
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'acteur:', error);
      res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'acteur' });
    }
  }
);

// POST nouvel acteur (avec validation des permissions)
router.post('/', 
  authenticateToken, 
  checkPermission('USERS', 'editer'),
  async (req, res) => {
    try {
      const { 
        nom_prenom, 
        email,
        organisation,
        id_entreprise,
        id_role,
        anciennete_role
      } = req.body;
      
      if (!nom_prenom || !email || !id_role) {
        return res.status(400).json({ 
          message: 'Données invalides: nom_prenom, email et id_role sont requis' 
        });
      }
      
      // Vérifier que l'utilisateur peut créer un acteur dans cette entreprise
      if (!req.user.hasGlobalAccess && id_entreprise !== req.user.id_entreprise) {
        return res.status(403).json({ 
          message: 'Vous ne pouvez créer des acteurs que pour votre entreprise' 
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
        anciennete_role || 0,
        now, 
        now
      ]);
      
      // Récupérer l'acteur créé avec toutes ses informations
      const [newActeur] = await pool.query(`
        SELECT a.*, r.nom_role, r.niveau_acces, e.nom_entreprise
        FROM acteurs a
        JOIN roles r ON a.id_role = r.id_role
        LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
        WHERE a.id_acteur = ?
      `, [id_acteur]);
      
      res.status(201).json(newActeur[0]);
    } catch (error) {
      console.error('Erreur lors de la création de l\'acteur:', error);
      res.status(500).json({ message: 'Erreur serveur lors de la création de l\'acteur' });
    }
  }
);

// PUT mettre à jour un acteur (avec validation des permissions)
router.put('/:id', 
  authenticateToken, 
  checkPermission('USERS', 'editer'),
  async (req, res) => {
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
      
      // Vérifier que l'acteur existe et appartient à la bonne entreprise
      let checkQuery = 'SELECT * FROM acteurs WHERE id_acteur = ?';
      let checkParams = [id];
      
      if (!req.user.hasGlobalAccess && req.user.id_entreprise) {
        checkQuery += ' AND id_entreprise = ?';
        checkParams.push(req.user.id_entreprise);
      }
      
      const [acteurs] = await pool.query(checkQuery, checkParams);
      
      if (acteurs.length === 0) {
        return res.status(404).json({ message: 'Acteur non trouvé ou accès non autorisé' });
      }
      
      // Vérifier les changements d'entreprise
      if (id_entreprise && !req.user.hasGlobalAccess && id_entreprise !== req.user.id_entreprise) {
        return res.status(403).json({ 
          message: 'Vous ne pouvez pas transférer un acteur vers une autre entreprise' 
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
      
      // Si le rôle a changé, mettre à jour les permissions
      if (id_role !== undefined) {
        await pool.query('DELETE FROM permissions WHERE id_acteur = ?', [id]);
        
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
      }
      
      // Récupérer l'acteur mis à jour
      const [updatedActeurs] = await pool.query(`
        SELECT a.*, r.nom_role, r.niveau_acces, e.nom_entreprise
        FROM acteurs a
        JOIN roles r ON a.id_role = r.id_role
        LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
        WHERE a.id_acteur = ?
      `, [id]);
      
      res.status(200).json(updatedActeurs[0]);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'acteur:', error);
      res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de l\'acteur' });
    }
  }
);

// DELETE supprimer un acteur (avec validation des permissions)
router.delete('/:id', 
  authenticateToken, 
  checkPermission('USERS', 'supprimer'),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // Vérifier que l'acteur existe et appartient à la bonne entreprise
      let checkQuery = 'SELECT * FROM acteurs WHERE id_acteur = ?';
      let checkParams = [id];
      
      if (!req.user.hasGlobalAccess && req.user.id_entreprise) {
        checkQuery += ' AND id_entreprise = ?';
        checkParams.push(req.user.id_entreprise);
      }
      
      const [acteurs] = await pool.query(checkQuery, checkParams);
      
      if (acteurs.length === 0) {
        return res.status(404).json({ message: 'Acteur non trouvé ou accès non autorisé' });
      }
      
      // Empêcher la suppression de son propre compte
      if (id === req.user.id_acteur) {
        return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte' });
      }
      
      await pool.query('DELETE FROM acteurs WHERE id_acteur = ?', [id]);
      
      res.status(200).json({ message: 'Acteur supprimé avec succès' });
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'acteur:', error);
      res.status(500).json({ message: 'Erreur serveur lors de la suppression de l\'acteur' });
    }
  }
);

// GET acteurs par entreprise
router.get('/entreprise/:entrepriseId', 
  authenticateToken, 
  checkPermission('USERS', 'voir'),
  async (req, res) => {
    try {
      const { entrepriseId } = req.params;
      
      // Vérifier l'accès à cette entreprise
      if (!req.user.hasGlobalAccess && entrepriseId !== req.user.id_entreprise) {
        return res.status(403).json({ message: 'Accès non autorisé à cette entreprise' });
      }
      
      const [acteurs] = await pool.query(`
        SELECT a.*, r.nom_role, r.niveau_acces, e.nom_entreprise
        FROM acteurs a
        JOIN roles r ON a.id_role = r.id_role
        LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
        WHERE a.id_entreprise = ?
        ORDER BY a.nom_prenom
      `, [entrepriseId]);
      
      res.status(200).json(acteurs);
    } catch (error) {
      console.error('Erreur lors de la récupération des acteurs par entreprise:', error);
      res.status(500).json({ message: 'Erreur serveur lors de la récupération des acteurs' });
    }
  }
);

module.exports = router;