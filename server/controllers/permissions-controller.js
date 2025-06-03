// server/controllers/permissions-controller.js
const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');

/**
 * Contrôleur pour les permissions utilisateurs
 */

// Récupérer toutes les permissions
exports.getAllPermissions = async (req, res) => {
  try {
    const [permissions] = await pool.query(`
      SELECT 
        p.id_permission,
        p.id_acteur,
        a.nom_prenom as acteur_nom,
        p.type_ressource,
        p.id_ressource,
        p.peut_voir,
        p.peut_editer,
        p.peut_supprimer,
        p.peut_administrer
      FROM 
        permissions p
      JOIN
        acteurs a ON p.id_acteur = a.id_acteur
    `);
    
    res.status(200).json(permissions);
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des permissions' });
  }
};

// Récupérer une permission par son ID
exports.getPermissionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [permissions] = await pool.query(`
      SELECT 
        p.id_permission,
        p.id_acteur,
        a.nom_prenom as acteur_nom,
        p.type_ressource,
        p.id_ressource,
        p.peut_voir,
        p.peut_editer,
        p.peut_supprimer,
        p.peut_administrer
      FROM 
        permissions p
      JOIN
        acteurs a ON p.id_acteur = a.id_acteur
      WHERE 
        p.id_permission = ?
    `, [id]);
    
    if (permissions.length === 0) {
      return res.status(404).json({ message: 'Permission non trouvée' });
    }
    
    res.status(200).json(permissions[0]);
  } catch (error) {
    console.error('Erreur lors de la récupération de la permission:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de la permission' });
  }
};

// Créer une nouvelle permission
exports.createPermission = async (req, res) => {
  try {
    const { 
      id_acteur, 
      type_ressource, 
      id_ressource, 
      peut_voir, 
      peut_editer, 
      peut_supprimer, 
      peut_administrer 
    } = req.body;
    
    // Validation des données
    if (!id_acteur || !type_ressource) {
      return res.status(400).json({ message: 'Données invalides: id_acteur et type_ressource sont requis' });
    }
    
    // Vérifier si l'acteur existe
    const [acteur] = await pool.query('SELECT * FROM acteurs WHERE id_acteur = ?', [id_acteur]);
    if (acteur.length === 0) {
      return res.status(400).json({ message: 'Acteur inexistant' });
    }
    
    // Vérifier si la ressource existe si id_ressource est fourni
    if (id_ressource) {
      let tableToCheck;
      switch (type_ressource) {
        case 'APPLICATION':
          tableToCheck = 'applications';
          break;
        case 'QUESTIONNAIRE':
          tableToCheck = 'questionnaires';
          break;
        case 'FORMULAIRE':
          tableToCheck = 'formulaires';
          break;
        case 'RAPPORT':
          // Pour les rapports, nous n'avons pas de table spécifique
          break;
        default:
          return res.status(400).json({ message: 'Type de ressource invalide' });
      }
      
      if (tableToCheck) {
        const [ressource] = await pool.query(`SELECT * FROM ${tableToCheck} WHERE id_${type_ressource.toLowerCase()} = ?`, [id_ressource]);
        if (ressource.length === 0) {
          return res.status(400).json({ message: 'Ressource inexistante' });
        }
      }
    }
    
    // Générer un UUID pour la nouvelle permission
    const id_permission = uuidv4();
    
    // Valeurs par défaut pour les autorisations
    const peutVoir = peut_voir !== undefined ? peut_voir : false;
    const peutEditer = peut_editer !== undefined ? peut_editer : false;
    const peutSupprimer = peut_supprimer !== undefined ? peut_supprimer : false;
    const peutAdministrer = peut_administrer !== undefined ? peut_administrer : false;
    
    // Insérer la permission
    await pool.query(`
      INSERT INTO permissions (
        id_permission,
        id_acteur,
        type_ressource,
        id_ressource,
        peut_voir,
        peut_editer,
        peut_supprimer,
        peut_administrer
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id_permission,
      id_acteur,
      type_ressource,
      id_ressource || null,
      peutVoir,
      peutEditer,
      peutSupprimer,
      peutAdministrer
    ]);
    
    // Récupérer la permission créée
    const [permissions] = await pool.query(`
      SELECT 
        p.id_permission,
        p.id_acteur,
        a.nom_prenom as acteur_nom,
        p.type_ressource,
        p.id_ressource,
        p.peut_voir,
        p.peut_editer,
        p.peut_supprimer,
        p.peut_administrer
      FROM 
        permissions p
      JOIN
        acteurs a ON p.id_acteur = a.id_acteur
      WHERE 
        p.id_permission = ?
    `, [id_permission]);
    
    res.status(201).json(permissions[0]);
  } catch (error) {
    console.error('Erreur lors de la création de la permission:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la création de la permission' });
  }
};

// Mettre à jour une permission
exports.updatePermission = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      peut_voir, 
      peut_editer, 
      peut_supprimer, 
      peut_administrer 
    } = req.body;
    
    // Validation des données
    if (peut_voir === undefined && peut_editer === undefined && 
        peut_supprimer === undefined && peut_administrer === undefined) {
      return res.status(400).json({ message: 'Aucune donnée à mettre à jour' });
    }
    
    // Vérifier si la permission existe
    const [existingPermission] = await pool.query('SELECT * FROM permissions WHERE id_permission = ?', [id]);
    
    if (existingPermission.length === 0) {
      return res.status(404).json({ message: 'Permission non trouvée' });
    }
    
    // Construire la requête de mise à jour
    let updateQuery = 'UPDATE permissions SET';
    const updateParams = [];
    let isFirstParam = true;
    
    if (peut_voir !== undefined) {
      updateQuery += `${isFirstParam ? ' ' : ', '}peut_voir = ?`;
      updateParams.push(peut_voir);
      isFirstParam = false;
    }
    
    if (peut_editer !== undefined) {
      updateQuery += `${isFirstParam ? ' ' : ', '}peut_editer = ?`;
      updateParams.push(peut_editer);
      isFirstParam = false;
    }
    
    if (peut_supprimer !== undefined) {
      updateQuery += `${isFirstParam ? ' ' : ', '}peut_supprimer = ?`;
      updateParams.push(peut_supprimer);
      isFirstParam = false;
    }
    
    if (peut_administrer !== undefined) {
      updateQuery += `${isFirstParam ? ' ' : ', '}peut_administrer = ?`;
      updateParams.push(peut_administrer);
      isFirstParam = false;
    }
    
    updateQuery += ' WHERE id_permission = ?';
    updateParams.push(id);
    
    // Exécuter la mise à jour
    await pool.query(updateQuery, updateParams);
    
    // Récupérer la permission mise à jour
    const [permissions] = await pool.query(`
      SELECT 
        p.id_permission,
        p.id_acteur,
        a.nom_prenom as acteur_nom,
        p.type_ressource,
        p.id_ressource,
        p.peut_voir,
        p.peut_editer,
        p.peut_supprimer,
        p.peut_administrer
      FROM 
        permissions p
      JOIN
        acteurs a ON p.id_acteur = a.id_acteur
      WHERE 
        p.id_permission = ?
    `, [id]);
    
    res.status(200).json(permissions[0]);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la permission:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de la permission' });
  }
};

// Supprimer une permission
exports.deletePermission = async (req, res) => {
    try {
      const { id } = req.params;
      
      // Vérifier si la permission existe
      const [existingPermission] = await pool.query('SELECT * FROM permissions WHERE id_permission = ?', [id]);
      
      if (existingPermission.length === 0) {
        return res.status(404).json({ message: 'Permission non trouvée' });
      }
      
      // Supprimer la permission
      await pool.query('DELETE FROM permissions WHERE id_permission = ?', [id]);
      
      res.status(200).json({ message: 'Permission supprimée avec succès' });
    } catch (error) {
      console.error('Erreur lors de la suppression de la permission:', error);
      res.status(500).json({ message: 'Erreur serveur lors de la suppression de la permission' });
    }
  };
  
  // Récupérer les permissions d'un acteur
  exports.getPermissionsByActeur = async (req, res) => {
    try {
      const { id } = req.params;
      
      const [permissions] = await pool.query(`
        SELECT 
          p.id_permission,
          p.id_acteur,
          p.type_ressource,
          p.id_ressource,
          p.peut_voir,
          p.peut_editer,
          p.peut_supprimer,
          p.peut_administrer
        FROM 
          permissions p
        WHERE 
          p.id_acteur = ?
      `, [id]);
      
      res.status(200).json(permissions);
    } catch (error) {
      console.error('Erreur lors de la récupération des permissions de l\'acteur:', error);
      res.status(500).json({ message: 'Erreur serveur lors de la récupération des permissions de l\'acteur' });
    }
  };