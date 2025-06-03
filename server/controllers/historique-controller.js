// server/controllers/historique-controller.js
const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');

/**
 * Contrôleur pour l'historique des scores
 */

// Récupérer tout l'historique des scores
exports.getAllHistorique = async (req, res) => {
  try {
    const [historique] = await pool.query(`
      SELECT 
        h.id_historique,
        h.id_application,
        a.nom_application,
        h.thematique,
        h.score,
        h.date_mesure
      FROM 
        historique_scores h
      JOIN
        applications a ON h.id_application = a.id_application
      ORDER BY
        h.date_mesure DESC, a.nom_application, h.thematique
    `);
    
    res.status(200).json(historique);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique des scores:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'historique des scores' });
  }
};

// Récupérer l'historique des scores d'une application
exports.getHistoriqueByApplication = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [historique] = await pool.query(`
      SELECT 
        h.id_historique,
        h.id_application,
        h.thematique,
        h.score,
        h.date_mesure
      FROM 
        historique_scores h
      WHERE 
        h.id_application = ?
      ORDER BY
        h.date_mesure DESC, h.thematique
    `, [id]);
    
    res.status(200).json(historique);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique des scores de l\'application:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'historique des scores de l\'application' });
  }
};

// Récupérer l'historique des scores d'une thématique pour une application
exports.getHistoriqueByThematique = async (req, res) => {
  try {
    const { id, thematique } = req.params;
    
    const [historique] = await pool.query(`
      SELECT 
        h.id_historique,
        h.id_application,
        h.thematique,
        h.score,
        h.date_mesure
      FROM 
        historique_scores h
      WHERE 
        h.id_application = ? AND h.thematique = ?
      ORDER BY
        h.date_mesure DESC
    `, [id, thematique]);
    
    res.status(200).json(historique);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique des scores de la thématique:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'historique des scores de la thématique' });
  }
};