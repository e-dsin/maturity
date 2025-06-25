const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const logger = require('../utils/logger');

// GET thématiques par questionnaire
router.get('/:id/thematiques', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [thematiques] = await pool.query(`
      SELECT t.*, f.nom as fonction_nom
      FROM questionnaire_thematiques qt
      JOIN thematiques t ON qt.id_thematique = t.id_thematique
      JOIN fonctions f ON t.id_fonction = f.id_fonction
      WHERE qt.id_questionnaire = ?
      ORDER BY qt.ordre, t.nom
    `, [id]);
    
    res.status(200).json(thematiques);
  } catch (error) {
    logger.error('Error retrieving questionnaire themes:', { error });
    res.status(500).json({ message: 'Server error' });
  }
});

// POST ajouter des thématiques à un questionnaire
router.post('/:id/thematiques', async (req, res) => {
  try {
    const { id } = req.params;
    const { thematiques } = req.body; // Array d'IDs de thématiques
    
    // Supprimer les anciennes liaisons
    await pool.query('DELETE FROM questionnaire_thematiques WHERE id_questionnaire = ?', [id]);
    
    // Ajouter les nouvelles liaisons
    for (let i = 0; i < thematiques.length; i++) {
      await pool.query(`
        INSERT INTO questionnaire_thematiques (id_questionnaire, id_thematique, ordre)
        VALUES (?, ?, ?)
      `, [id, thematiques[i], i + 1]);
    }
    
    res.status(200).json({ message: 'Thématiques mises à jour' });
  } catch (error) {
    logger.error('Error updating questionnaire themes:', { error });
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;