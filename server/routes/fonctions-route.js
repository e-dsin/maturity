// server/routes/fonctions-route.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// GET all functions
router.get('/', async (req, res) => {
  try {
    logger.debug('GET /api/fonctions - Retrieving all functions');
    
    const [fonctions] = await pool.query(`
      SELECT f.*,
             COUNT(DISTINCT t.id_thematique) as nombre_thematiques
      FROM fonctions f
      LEFT JOIN thematiques t ON f.id_fonction = t.id_fonction
      GROUP BY f.id_fonction
      ORDER BY f.nom
    `);
    
    res.status(200).json(fonctions);
  } catch (error) {
    logger.error('Error retrieving functions:', { error });
    res.status(500).json({ message: 'Server error while retrieving functions' });
  }
});

// GET functions for a specific enterprise
router.get('/entreprises/:id', async (req, res) => {
    try {
      const { id } = req.params;
      logger.debug(`GET /api/fonctions/entreprises/${id} - Retrieving functions for enterprise`);
      
      // Check if enterprise exists
      const [entreprises] = await pool.query('SELECT * FROM entreprises WHERE id_entreprise = ?', [id]);
      if (entreprises.length === 0) {
        return res.status(404).json({ message: 'Enterprise not found' });
      }
      
      // Get functions with scores for this enterprise
      // Adjust this query based on your database schema
      const [fonctions] = await pool.query(`
        SELECT DISTINCT f.*, 
          AVG(ts.score) as score_global
        FROM fonctions f
        JOIN thematiques t ON f.id_fonction = t.id_fonction
        JOIN thematique_scores ts ON t.nom = ts.thematique
        JOIN maturity_analyses ma ON ts.id_analyse = ma.id_analyse
        JOIN applications a ON ma.id_application = a.id_application
        WHERE a.id_entreprise = ?
        GROUP BY f.id_fonction
        ORDER BY f.nom
      `, [id]);
      
      res.status(200).json(fonctions);
    } catch (error) {
      logger.error(`Error retrieving functions for enterprise ${req.params.id}:`, { error });
      res.status(500).json({ message: 'Server error while retrieving functions for enterprise' });
    }
  });

// GET function by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`GET /api/fonctions/${id} - Retrieving specific function`);
    
    // Get function details
    const [fonctions] = await pool.query(`
      SELECT * FROM fonctions WHERE id_fonction = ?
    `, [id]);
    
    if (fonctions.length === 0) {
      return res.status(404).json({ message: 'Function not found' });
    }
    
    // Get themes for this function
    const [themes] = await pool.query(`
      SELECT * FROM thematiques WHERE id_fonction = ?
      ORDER BY nom
    `, [id]);
    
    // Get interpretation grids for this function
    const [grilles] = await pool.query(`
      SELECT * FROM grille_interpretation 
      WHERE fonction = ?
      ORDER BY score_min
    `, [fonctions[0].nom]);
    
    const fonction = {
      ...fonctions[0],
      themes,
      grilles_interpretation: grilles
    };
    
    res.status(200).json(fonction);
  } catch (error) {
    logger.error(`Error retrieving function ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Server error while retrieving function' });
  }
});

// GET themes for a function
router.get('/:id/themes', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`GET /api/fonctions/${id}/themes - Retrieving themes for function`);
    
    // Check if function exists
    const [fonctions] = await pool.query('SELECT * FROM fonctions WHERE id_fonction = ?', [id]);
    if (fonctions.length === 0) {
      return res.status(404).json({ message: 'Function not found' });
    }
    
    const [themes] = await pool.query(`
      SELECT * FROM thematiques WHERE id_fonction = ?
      ORDER BY nom
    `, [id]);
    
    res.status(200).json(themes);
  } catch (error) {
    logger.error(`Error retrieving themes for function ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Server error while retrieving themes' });
  }
});

// GET statistics for a function across all applications
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`GET /api/fonctions/${id}/stats - Retrieving stats for function`);
    
    // Check if function exists
    const [fonctions] = await pool.query('SELECT * FROM fonctions WHERE id_fonction = ?', [id]);
    if (fonctions.length === 0) {
      return res.status(404).json({ message: 'Function not found' });
    }
    
    // Get themes for this function
    const [themes] = await pool.query(`
      SELECT * FROM thematiques WHERE id_fonction = ?
    `, [id]);
    
    // Get average scores per theme
    const themeScores = await Promise.all(themes.map(async (theme) => {
      const [scores] = await pool.query(`
        SELECT AVG(ts.score) as avg_score,
               COUNT(DISTINCT ma.id_application) as num_applications
        FROM thematique_scores ts
        JOIN maturity_analyses ma ON ts.id_analyse = ma.id_analyse
        WHERE ts.thematique = ?
        AND ma.id_analyse IN (
          SELECT MAX(id_analyse) FROM maturity_analyses
          GROUP BY id_application
        )
      `, [theme.nom]);
      
      return {
        ...theme,
        avg_score: scores[0].avg_score || 0,
        num_applications: scores[0].num_applications || 0
      };
    }));
    
    // Get average function score
    let avgScore = 0;
    if (themeScores.length > 0) {
      avgScore = themeScores.reduce((sum, theme) => sum + (theme.avg_score || 0), 0) / themeScores.length;
    }
    
    // Get number of applications that have a score for this function
    const [applicationCount] = await pool.query(`
      SELECT COUNT(DISTINCT ma.id_application) as count
      FROM thematique_scores ts
      JOIN maturity_analyses ma ON ts.id_analyse = ma.id_analyse
      JOIN thematiques t ON ts.thematique = t.nom
      WHERE t.id_fonction = ?
      AND ma.id_analyse IN (
        SELECT MAX(id_analyse) FROM maturity_analyses
        GROUP BY id_application
      )
    `, [id]);
    
    // Get top 5 applications by score
    const [topApplications] = await pool.query(`
      SELECT a.id_application, a.nom_application, AVG(ts.score) as avg_score
      FROM thematique_scores ts
      JOIN maturity_analyses ma ON ts.id_analyse = ma.id_analyse
      JOIN applications a ON ma.id_application = a.id_application
      JOIN thematiques t ON ts.thematique = t.nom
      WHERE t.id_fonction = ?
      AND ma.id_analyse IN (
        SELECT MAX(id_analyse) FROM maturity_analyses
        GROUP BY id_application
      )
      GROUP BY a.id_application, a.nom_application
      ORDER BY avg_score DESC
      LIMIT 5
    `, [id]);
    
    const stats = {
      id_fonction: id,
      nom: fonctions[0].nom,
      avg_score: avgScore,
      num_applications: applicationCount[0].count || 0,
      num_themes: themes.length,
      top_applications: topApplications,
      theme_scores: themeScores
    };
    
    res.status(200).json(stats);
  } catch (error) {
    logger.error(`Error retrieving stats for function ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Server error while retrieving function stats' });
  }
});

// POST create new function
router.post('/', async (req, res) => {
  try {
    const { nom, description } = req.body;
    logger.debug('POST /api/fonctions - Creating new function');
    
    if (!nom) {
      return res.status(400).json({ message: 'Invalid data: nom is required' });
    }
    
    const id_fonction = uuidv4();
    
    await pool.query(`
      INSERT INTO fonctions (id_fonction, nom, description)
      VALUES (?, ?, ?)
    `, [id_fonction, nom, description || null]);
    
    const [newFunction] = await pool.query('SELECT * FROM fonctions WHERE id_fonction = ?', [id_fonction]);
    
    res.status(201).json(newFunction[0]);
  } catch (error) {
    logger.error('Error creating function:', { error });
    res.status(500).json({ message: 'Server error while creating function' });
  }
});

// PUT update function
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, description } = req.body;
    logger.debug(`PUT /api/fonctions/${id} - Updating function`);
    
    // Check if function exists
    const [fonctions] = await pool.query('SELECT * FROM fonctions WHERE id_fonction = ?', [id]);
    if (fonctions.length === 0) {
      return res.status(404).json({ message: 'Function not found' });
    }
    
    // Build update query
    let updateQuery = 'UPDATE fonctions SET date_modification = NOW()';
    const updateParams = [];
    
    if (nom) {
      updateQuery += ', nom = ?';
      updateParams.push(nom);
    }
    
    if (description !== undefined) {
      updateQuery += ', description = ?';
      updateParams.push(description);
    }
    
    updateQuery += ' WHERE id_fonction = ?';
    updateParams.push(id);
    
    await pool.query(updateQuery, updateParams);
    
    const [updatedFunction] = await pool.query('SELECT * FROM fonctions WHERE id_fonction = ?', [id]);
    
    res.status(200).json(updatedFunction[0]);
  } catch (error) {
    logger.error(`Error updating function ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Server error while updating function' });
  }
});

// DELETE function
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`DELETE /api/fonctions/${id} - Deleting function`);
    
    // Check if function exists
    const [fonctions] = await pool.query('SELECT * FROM fonctions WHERE id_fonction = ?', [id]);
    if (fonctions.length === 0) {
      return res.status(404).json({ message: 'Function not found' });
    }
    
    // Check if there are themes associated with this function
    const [themes] = await pool.query('SELECT COUNT(*) as count FROM thematiques WHERE id_fonction = ?', [id]);
    if (themes[0].count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete function with associated themes. Please delete or reassign themes first.' 
      });
    }
    
    await pool.query('DELETE FROM fonctions WHERE id_fonction = ?', [id]);
    
    res.status(200).json({ message: 'Function deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting function ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Server error while deleting function' });
  }
});

module.exports = router;