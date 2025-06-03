// server/routes/grille-interpretation-route.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// GET all interpretation grids
router.get('/', async (req, res) => {
  try {
    logger.debug('GET /api/grille-interpretation - Retrieving all interpretation grids');
    
    const [grilles] = await pool.query(`
      SELECT * FROM grille_interpretation
      ORDER BY fonction, score_min
    `);
    
    res.status(200).json(grilles);
  } catch (error) {
    logger.error('Error retrieving interpretation grids:', { error });
    res.status(500).json({ message: 'Server error while retrieving interpretation grids' });
  }
});

// GET interpretation grid by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`GET /api/grille-interpretation/${id} - Retrieving specific interpretation grid`);
    
    const [grilles] = await pool.query('SELECT * FROM grille_interpretation WHERE id_grille = ?', [id]);
    
    if (grilles.length === 0) {
      return res.status(404).json({ message: 'Interpretation grid not found' });
    }
    
    res.status(200).json(grilles[0]);
  } catch (error) {
    logger.error(`Error retrieving interpretation grid ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Server error while retrieving interpretation grid' });
  }
});

// GET interpretation grids for a specific function
router.get('/fonction/:fonction', async (req, res) => {
  try {
    const { fonction } = req.params;
    logger.debug(`GET /api/grille-interpretation/fonction/${fonction} - Retrieving grids for function`);
    
    const [grilles] = await pool.query(`
      SELECT * FROM grille_interpretation
      WHERE fonction = ?
      ORDER BY score_min
    `, [fonction]);
    
    res.status(200).json(grilles);
  } catch (error) {
    logger.error(`Error retrieving interpretation grids for function ${req.params.fonction}:`, { error });
    res.status(500).json({ message: 'Server error while retrieving interpretation grids' });
  }
});

// GET interpretation grids for a specific theme
router.get('/theme/:theme', async (req, res) => {
  try {
    const { theme } = req.params;
    logger.debug(`GET /api/grille-interpretation/theme/${theme} - Retrieving grids for theme`);
    
    const [grilles] = await pool.query(`
      SELECT * FROM grille_interpretation
      WHERE niveau LIKE CONCAT(?, ' - %')
      ORDER BY score_min
    `, [theme]);
    
    res.status(200).json(grilles);
  } catch (error) {
    logger.error(`Error retrieving interpretation grids for theme ${req.params.theme}:`, { error });
    res.status(500).json({ message: 'Server error while retrieving interpretation grids' });
  }
});

// GET interpretation for a specific score
router.get('/interpret', async (req, res) => {
  try {
    const { fonction, score, theme } = req.query;
    logger.debug('GET /api/grille-interpretation/interpret - Interpreting a score');
    
    if (!fonction || score === undefined) {
      return res.status(400).json({ message: 'Invalid query: fonction and score are required' });
    }
    
    let query = `
      SELECT * FROM grille_interpretation
      WHERE fonction = ?
      AND ? BETWEEN score_min AND score_max
    `;
    
    const params = [fonction, parseFloat(score)];
    
    if (theme) {
      query = `
        SELECT * FROM grille_interpretation
        WHERE niveau LIKE CONCAT(?, ' - %')
        AND ? BETWEEN score_min AND score_max
      `;
      params[0] = theme;
    }
    
    const [grilles] = await pool.query(query, params);
    
    if (grilles.length === 0) {
      // If no specific interpretation found, try to find a generic one
      let interpretation = null;
      
      // Create a generic interpretation based on score
      if (score >= 4) {
        interpretation = { niveau: 'Optimisé', description: 'Niveau excellent', recommandations: 'Maintenir ce niveau' };
      } else if (score >= 3) {
        interpretation = { niveau: 'Mesuré', description: 'Bon niveau', recommandations: 'Améliorer quelques points' };
      } else if (score >= 2) {
        interpretation = { niveau: 'Défini', description: 'Niveau moyen', recommandations: 'Renforcer les processus' };
      } else {
        interpretation = { niveau: 'Initial', description: 'Niveau basique', recommandations: 'Formaliser les pratiques' };
      }
      
      return res.status(200).json({
        interpretation,
        score,
        generic: true
      });
    }
    
    res.status(200).json({
      interpretation: grilles[0],
      score,
      generic: false
    });
  } catch (error) {
    logger.error('Error interpreting score:', { error });
    res.status(500).json({ message: 'Server error while interpreting score' });
  }
});

// POST create new interpretation grid
router.post('/', async (req, res) => {
  try {
    const { fonction, score_min, score_max, niveau, description, recommandations } = req.body;
    logger.debug('POST /api/grille-interpretation - Creating new interpretation grid');
    
    if (!fonction || score_min === undefined || score_max === undefined || !niveau || !description) {
      return res.status(400).json({ 
        message: 'Invalid data: fonction, score_min, score_max, niveau and description are required' 
      });
    }
    
    // Validate score range
    if (parseFloat(score_min) < 0 || parseFloat(score_max) > 5 || parseFloat(score_min) > parseFloat(score_max)) {
      return res.status(400).json({ 
        message: 'Invalid score range: score_min must be >= 0, score_max must be <= 5, and score_min must be <= score_max' 
      });
    }
    
    // Check for overlapping ranges for the same function/theme
    let query = 'SELECT * FROM grille_interpretation WHERE fonction = ?';
    let params = [fonction];
    
    if (niveau.includes(' - ')) {
      // This is a theme-specific interpretation
      const theme = niveau.split(' - ')[0];
      query = 'SELECT * FROM grille_interpretation WHERE niveau LIKE CONCAT(?, \'%\')';
      params = [theme + ' - '];
    }
    
    const [existingGrids] = await pool.query(query, params);
    
    for (const grid of existingGrids) {
      if (
        (parseFloat(score_min) <= parseFloat(grid.score_max) && parseFloat(score_max) >= parseFloat(grid.score_min)) &&
        grid.niveau !== niveau // Allow updating same niveau
      ) {
        return res.status(400).json({ 
          message: `Score range overlaps with existing interpretation: ${grid.niveau} (${grid.score_min}-${grid.score_max})` 
        });
      }
    }
    
    const id_grille = uuidv4();
    
    await pool.query(`
      INSERT INTO grille_interpretation
      (id_grille, fonction, score_min, score_max, niveau, description, recommandations)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      id_grille,
      fonction,
      parseFloat(score_min),
      parseFloat(score_max),
      niveau,
      description,
      recommandations || null
    ]);
    
    const [newGrid] = await pool.query('SELECT * FROM grille_interpretation WHERE id_grille = ?', [id_grille]);
    
    res.status(201).json(newGrid[0]);
  } catch (error) {
    logger.error('Error creating interpretation grid:', { error });
    res.status(500).json({ message: 'Server error while creating interpretation grid' });
  }
});

// PUT update interpretation grid
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fonction, score_min, score_max, niveau, description, recommandations } = req.body;
    logger.debug(`PUT /api/grille-interpretation/${id} - Updating interpretation grid`);
    
    // Check if grid exists
    const [grilles] = await pool.query('SELECT * FROM grille_interpretation WHERE id_grille = ?', [id]);
    if (grilles.length === 0) {
      return res.status(404).json({ message: 'Interpretation grid not found' });
    }
    
    const existingGrid = grilles[0];
    
    // Validate new score range
    if (
      (score_min !== undefined && parseFloat(score_min) < 0) || 
      (score_max !== undefined && parseFloat(score_max) > 5) || 
      (score_min !== undefined && score_max !== undefined && parseFloat(score_min) > parseFloat(score_max))
    ) {
      return res.status(400).json({ 
        message: 'Invalid score range: score_min must be >= 0, score_max must be <= 5, and score_min must be <= score_max' 
      });
    }
    
    // Check for overlapping ranges with other grids
    if (score_min !== undefined || score_max !== undefined || fonction !== undefined || niveau !== undefined) {
      const newFonction = fonction || existingGrid.fonction;
      const newNiveau = niveau || existingGrid.niveau;
      const newScoreMin = score_min !== undefined ? parseFloat(score_min) : parseFloat(existingGrid.score_min);
      const newScoreMax = score_max !== undefined ? parseFloat(score_max) : parseFloat(existingGrid.score_max);
      
      let query = 'SELECT * FROM grille_interpretation WHERE fonction = ? AND id_grille != ?';
      let params = [newFonction, id];
      
      if (newNiveau.includes(' - ')) {
        // This is a theme-specific interpretation
        const theme = newNiveau.split(' - ')[0];
        query = 'SELECT * FROM grille_interpretation WHERE niveau LIKE CONCAT(?, \'%\') AND id_grille != ?';
        params = [theme + ' - ', id];
      }
      
      const [existingGrids] = await pool.query(query, params);
      
      for (const grid of existingGrids) {
        if (
          (newScoreMin <= parseFloat(grid.score_max) && newScoreMax >= parseFloat(grid.score_min)) &&
          grid.niveau !== newNiveau
        ) {
          return res.status(400).json({ 
            message: `Score range overlaps with existing interpretation: ${grid.niveau} (${grid.score_min}-${grid.score_max})` 
          });
        }
      }
    }
    
    // Build update query
    let updateQuery = 'UPDATE grille_interpretation SET date_modification = NOW()';
    const updateParams = [];
    
    if (fonction !== undefined) {
      updateQuery += ', fonction = ?';
      updateParams.push(fonction);
    }
    
    if (score_min !== undefined) {
      updateQuery += ', score_min = ?';
      updateParams.push(parseFloat(score_min));
    }
    
    if (score_max !== undefined) {
      updateQuery += ', score_max = ?';
      updateParams.push(parseFloat(score_max));
    }
    
    if (niveau !== undefined) {
      updateQuery += ', niveau = ?';
      updateParams.push(niveau);
    }
    
    if (description !== undefined) {
      updateQuery += ', description = ?';
      updateParams.push(description);
    }
    
    if (recommandations !== undefined) {
      updateQuery += ', recommandations = ?';
      updateParams.push(recommandations);
    }
    
    updateQuery += ' WHERE id_grille = ?';
    updateParams.push(id);
    
    await pool.query(updateQuery, updateParams);
    
    const [updatedGrid] = await pool.query('SELECT * FROM grille_interpretation WHERE id_grille = ?', [id]);
    
    res.status(200).json(updatedGrid[0]);
  } catch (error) {
    logger.error(`Error updating interpretation grid ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Server error while updating interpretation grid' });
  }
});

// DELETE interpretation grid
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`DELETE /api/grille-interpretation/${id} - Deleting interpretation grid`);
    
    // Check if grid exists
    const [grilles] = await pool.query('SELECT * FROM grille_interpretation WHERE id_grille = ?', [id]);
    if (grilles.length === 0) {
      return res.status(404).json({ message: 'Interpretation grid not found' });
    }
    
    await pool.query('DELETE FROM grille_interpretation WHERE id_grille = ?', [id]);
    
    res.status(200).json({ message: 'Interpretation grid deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting interpretation grid ${req.params.id}:`, { error });
    res.status(500).json({ message: 'Server error while deleting interpretation grid' });
  }
});

// POST import interpretation grids from a template
router.post('/import', async (req, res) => {
  try {
    const { grids, overwrite } = req.body;
    logger.debug('POST /api/grille-interpretation/import - Importing interpretation grids');
    
    if (!grids || !Array.isArray(grids) || grids.length === 0) {
      return res.status(400).json({ message: 'Invalid data: grids must be a non-empty array' });
    }
    
    // Start transaction
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // If overwrite is true, delete existing grids for the specified functions
      if (overwrite) {
        const functions = [...new Set(grids.map(grid => grid.fonction))];
        for (const func of functions) {
          await connection.query('DELETE FROM grille_interpretation WHERE fonction = ?', [func]);
        }
      }
      
      // Insert new grids
      const importedGrids = [];
      for (const grid of grids) {
        const { fonction, score_min, score_max, niveau, description, recommandations } = grid;
        
        if (!fonction || score_min === undefined || score_max === undefined || !niveau || !description) {
          continue; // Skip invalid grid
        }
        
        const id_grille = grid.id_grille || uuidv4();
        
        try {
          await connection.query(`
            INSERT INTO grille_interpretation
            (id_grille, fonction, score_min, score_max, niveau, description, recommandations)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            fonction = VALUES(fonction),
            score_min = VALUES(score_min),
            score_max = VALUES(score_max),
            niveau = VALUES(niveau),
            description = VALUES(description),
            recommandations = VALUES(recommandations),
            date_modification = NOW()
          `, [
            id_grille,
            fonction,
            parseFloat(score_min),
            parseFloat(score_max),
            niveau,
            description,
            recommandations || null
          ]);
          
          importedGrids.push(id_grille);
        } catch (error) {
          logger.warn(`Error importing grid ${niveau}:`, { error });
          // Continue with next grid
        }
      }
      
      await connection.commit();
      
      // Get imported grids
      const [importedGridDetails] = await pool.query(`
        SELECT * FROM grille_interpretation
        WHERE id_grille IN (${importedGrids.map(() => '?').join(',')})
      `, importedGrids);
      
      res.status(200).json({ 
        message: `Successfully imported ${importedGrids.length} interpretation grids`,
        imported_grids: importedGridDetails
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    logger.error('Error importing interpretation grids:', { error });
    res.status(500).json({ message: 'Server error while importing interpretation grids' });
  }
});

module.exports = router;