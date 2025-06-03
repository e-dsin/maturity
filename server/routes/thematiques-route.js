// server/routes/thematiques-route.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// GET all themes
router.get('/', async (req, res) => {
  try {
    logger.debug('GET /api/thematiques - Retrieving all themes');
    
    const [thematiques] = await pool.query(`
      SELECT t.*, f.nom as fonction_nom
      FROM thematiques t
      JOIN fonctions f ON t.id_fonction = f.id_fonction
      ORDER BY f.nom, t.nom
    `);
    
    res.status(200).json(thematiques);
  } catch (error) {
    logger.error('Error retrieving themes:', { error });
    res.status(500).json({ message: 'Server error while retrieving themes' });
  }
});

// GET theme by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`GET /api/thematiques/${id} - Retrieving specific theme`);
    
    // Get theme details
    const [thematiques] = await pool.query(`
      SELECT t.*, f.nom as fonction_nom
      FROM thematiques t
      JOIN fonctions f ON t.id_fonction = f.id_fonction
      WHERE t.id_thematique = ?
    `, [id]);
    
    if (thematiques.length === 0) {
      return res.status(404).json({ message: 'Theme not found' });
    }
    
    // Get questions associated with this theme
    const [questions] = await pool.query(`
      SELECT q.* 
      FROM questions q
      WHERE q.id_thematique = ?
      ORDER BY q.ordre
    `, [id]);
    
    // Get interpretation grids for this theme
    let interpretations = [];
    try {
      const [grilles] = await pool.query(`
        SELECT * FROM grille_interpretation 
        WHERE niveau LIKE CONCAT(?, ' - %')
        ORDER BY score_min
      `, [thematiques[0].nom]);
      
      interpretations = grilles;
    } catch (error) {
      logger.warn(`Could not retrieve interpretations for theme ${id}: ${error.message}`);
    }
    
    // Get statistics across applications
    let stats = {
      avg_score: 0,
      num_applications: 0,
      num_questions: questions.length
    };
    
    try {
      const [scoreStats] = await pool.query(`
        SELECT AVG(ts.score) as avg_score,
               COUNT(DISTINCT ma.id_application) as num_applications
        FROM thematique_scores ts
        JOIN maturity_analyses ma ON ts.id_analyse = ma.id_analyse
        WHERE ts.thematique = ?
        AND ma.id_analyse IN (
          SELECT MAX(id_analyse) FROM maturity_analyses
          GROUP BY id_application
        )
      `, [thematiques[0].nom]);
      
      if (scoreStats.length > 0) {
        stats.avg_score = scoreStats[0].avg_score || 0;
        stats.num_applications = scoreStats[0].num_applications || 0;
      }
    } catch (error) {
      logger.warn(`Could not retrieve score statistics for theme ${id}: ${error.message}`);
    }
    
    const theme = {
      ...thematiques[0],
      questions,
      interpretations,
      stats
    };
    
    res.status(200).json(theme);
  } catch (error) {
    logger.error(`Error retrieving theme ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Server error while retrieving theme' });
  }
});

// GET statistics for a theme across all applications
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`GET /api/thematiques/${id}/stats - Retrieving stats for theme`);
    
    // Check if theme exists
    const [thematiques] = await pool.query(`
      SELECT t.*, f.nom as fonction_nom
      FROM thematiques t
      JOIN fonctions f ON t.id_fonction = f.id_fonction
      WHERE t.id_thematique = ?
    `, [id]);
    
    if (thematiques.length === 0) {
      return res.status(404).json({ message: 'Theme not found' });
    }
    
    const theme = thematiques[0];
    
    // Get score statistics
    const [scoreStats] = await pool.query(`
      SELECT 
        AVG(ts.score) as avg_score,
        MIN(ts.score) as min_score,
        MAX(ts.score) as max_score,
        COUNT(DISTINCT ma.id_application) as num_applications
      FROM thematique_scores ts
      JOIN maturity_analyses ma ON ts.id_analyse = ma.id_analyse
      WHERE ts.thematique = ?
      AND ma.id_analyse IN (
        SELECT MAX(id_analyse) FROM maturity_analyses
        GROUP BY id_application
      )
    `, [theme.nom]);
    
    // Get top 5 applications by score
    const [topApplications] = await pool.query(`
      SELECT a.id_application, a.nom_application, ts.score
      FROM thematique_scores ts
      JOIN maturity_analyses ma ON ts.id_analyse = ma.id_analyse
      JOIN applications a ON ma.id_application = a.id_application
      WHERE ts.thematique = ?
      AND ma.id_analyse IN (
        SELECT MAX(id_analyse) FROM maturity_analyses
        GROUP BY id_application
      )
      ORDER BY ts.score DESC
      LIMIT 5
    `, [theme.nom]);
    
    // Get bottom 5 applications by score
    const [bottomApplications] = await pool.query(`
      SELECT a.id_application, a.nom_application, ts.score
      FROM thematique_scores ts
      JOIN maturity_analyses ma ON ts.id_analyse = ma.id_analyse
      JOIN applications a ON ma.id_application = a.id_application
      WHERE ts.thematique = ?
      AND ma.id_analyse IN (
        SELECT MAX(id_analyse) FROM maturity_analyses
        GROUP BY id_application
      )
      ORDER BY ts.score ASC
      LIMIT 5
    `, [theme.nom]);
    
    // Get score distribution (count by score range)
    const [distribution] = await pool.query(`
      SELECT 
        CASE
          WHEN score < 1 THEN '0-1'
          WHEN score < 2 THEN '1-2'
          WHEN score < 3 THEN '2-3'
          WHEN score < 4 THEN '3-4'
          ELSE '4-5'
        END as range,
        COUNT(*) as count
      FROM thematique_scores
      WHERE thematique = ?
      AND id_analyse IN (
        SELECT MAX(id_analyse) FROM maturity_analyses
        GROUP BY id_application
      )
      GROUP BY range
      ORDER BY range
    `, [theme.nom]);
    
    // Get score history
    const [history] = await pool.query(`
      SELECT ts.score, DATE(ma.date_analyse) as date
      FROM thematique_scores ts
      JOIN maturity_analyses ma ON ts.id_analyse = ma.id_analyse
      WHERE ts.thematique = ?
      ORDER BY ma.date_analyse DESC
      LIMIT 30
    `, [theme.nom]);
    
    // Get questions for this theme
    const [questions] = await pool.query(`
      SELECT COUNT(*) as count
      FROM questions
      WHERE id_thematique = ?
    `, [id]);
    
    const stats = {
      id_thematique: id,
      nom: theme.nom,
      fonction: theme.fonction_nom,
      avg_score: scoreStats[0]?.avg_score || 0,
      min_score: scoreStats[0]?.min_score || 0,
      max_score: scoreStats[0]?.max_score || 0,
      num_applications: scoreStats[0]?.num_applications || 0,
      num_questions: questions[0]?.count || 0,
      top_applications: topApplications,
      bottom_applications: bottomApplications,
      score_distribution: distribution,
      score_history: history
    };
    
    res.status(200).json(stats);
  } catch (error) {
    logger.error(`Error retrieving stats for theme ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Server error while retrieving theme stats' });
  }
});

// GET applications scored by a theme
router.get('/:id/applications', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`GET /api/thematiques/${id}/applications - Retrieving applications scored by theme`);
    
    // Check if theme exists
    const [thematiques] = await pool.query('SELECT * FROM thematiques WHERE id_thematique = ?', [id]);
    if (thematiques.length === 0) {
      return res.status(404).json({ message: 'Theme not found' });
    }
    
    // Get applications with their score for this theme
    const [applications] = await pool.query(`
      SELECT a.id_application, a.nom_application, a.statut, a.type, 
             ts.score, ma.date_analyse,
             e.id_entreprise, e.nom_entreprise
      FROM thematique_scores ts
      JOIN maturity_analyses ma ON ts.id_analyse = ma.id_analyse
      JOIN applications a ON ma.id_application = a.id_application
      LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
      WHERE ts.thematique = ?
      AND ma.id_analyse IN (
        SELECT MAX(id_analyse) FROM maturity_analyses
        GROUP BY id_application
      )
      ORDER BY ts.score DESC
    `, [thematiques[0].nom]);
    
    res.status(200).json(applications);
  } catch (error) {
    logger.error(`Error retrieving applications for theme ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Server error while retrieving applications' });
  }
});

// POST create new theme
router.post('/', async (req, res) => {
  try {
    const { nom, description, id_fonction } = req.body;
    logger.debug('POST /api/thematiques - Creating new theme');
    
    if (!nom || !id_fonction) {
      return res.status(400).json({ message: 'Invalid data: nom and id_fonction are required' });
    }
    
    // Check if function exists
    const [fonctions] = await pool.query('SELECT * FROM fonctions WHERE id_fonction = ?', [id_fonction]);
    if (fonctions.length === 0) {
      return res.status(404).json({ message: 'Function not found' });
    }
    
    const id_thematique = uuidv4();
    
    await pool.query(`
      INSERT INTO thematiques (id_thematique, nom, description, id_fonction)
      VALUES (?, ?, ?, ?)
    `, [id_thematique, nom, description || null, id_fonction]);
    
    const [newTheme] = await pool.query(`
      SELECT t.*, f.nom as fonction_nom
      FROM thematiques t
      JOIN fonctions f ON t.id_fonction = f.id_fonction
      WHERE t.id_thematique = ?
    `, [id_thematique]);
    
    res.status(201).json(newTheme[0]);
  } catch (error) {
    logger.error('Error creating theme:', { error });
    res.status(500).json({ message: 'Server error while creating theme' });
  }
});

// PUT update theme
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, description, id_fonction } = req.body;
    logger.debug(`PUT /api/thematiques/${id} - Updating theme`);
    
    // Check if theme exists
    const [thematiques] = await pool.query('SELECT * FROM thematiques WHERE id_thematique = ?', [id]);
    if (thematiques.length === 0) {
      return res.status(404).json({ message: 'Theme not found' });
    }
    
    // Build update query
    let updateQuery = 'UPDATE thematiques SET date_modification = NOW()';
    const updateParams = [];
    
    if (nom) {
      updateQuery += ', nom = ?';
      updateParams.push(nom);
    }
    
    if (description !== undefined) {
      updateQuery += ', description = ?';
      updateParams.push(description);
    }
    
    if (id_fonction) {
      // Check if function exists
      const [fonctions] = await pool.query('SELECT * FROM fonctions WHERE id_fonction = ?', [id_fonction]);
      if (fonctions.length === 0) {
        return res.status(404).json({ message: 'Function not found' });
      }
      
      updateQuery += ', id_fonction = ?';
      updateParams.push(id_fonction);
    }
    
    updateQuery += ' WHERE id_thematique = ?';
    updateParams.push(id);
    
    await pool.query(updateQuery, updateParams);
    
    const [updatedTheme] = await pool.query(`
      SELECT t.*, f.nom as fonction_nom
      FROM thematiques t
      JOIN fonctions f ON t.id_fonction = f.id_fonction
      WHERE t.id_thematique = ?
    `, [id]);
    
    res.status(200).json(updatedTheme[0]);
  } catch (error) {
    logger.error(`Error updating theme ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Server error while updating theme' });
  }
});

// DELETE theme
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`DELETE /api/thematiques/${id} - Deleting theme`);
    
    // Check if theme exists
    const [thematiques] = await pool.query('SELECT * FROM thematiques WHERE id_thematique = ?', [id]);
    if (thematiques.length === 0) {
      return res.status(404).json({ message: 'Theme not found' });
    }
    
    // Check if there are questions associated with this theme
    const [questions] = await pool.query('SELECT COUNT(*) as count FROM questions WHERE id_thematique = ?', [id]);
    if (questions[0].count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete theme with associated questions. Please delete or reassign questions first.' 
      });
    }
    
    // Check if there are scores associated with this theme
    const [scores] = await pool.query('SELECT COUNT(*) as count FROM thematique_scores WHERE thematique = ?', [thematiques[0].nom]);
    if (scores[0].count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete theme with associated scores. This theme has been used in assessments.' 
      });
    }
    
    await pool.query('DELETE FROM thematiques WHERE id_thematique = ?', [id]);
    
    res.status(200).json({ message: 'Theme deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting theme ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Server error while deleting theme' });
  }
});

module.exports = router;