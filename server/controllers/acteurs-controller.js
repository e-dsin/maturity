// server/controllers/acteurs-controller.js
const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');
/**
 * Contrôleur pour les acteurs
 */
exports.getAllActeurs = async (req, res) => {
    try {
      // Récupérer tous les acteurs
      const [acteurs] = await pool.query(`
        SELECT 
          id_acteur,
          nom_prenom,
          role,
          organisation,
          anciennete_role,
          email
        FROM 
          acteurs
      `);
      
      res.status(200).json(acteurs);
    } catch (error) {
      console.error('Erreur lors de la récupération des acteurs:', error);
      res.status(500).json({ message: 'Erreur serveur lors de la récupération des acteurs' });
    }
  };