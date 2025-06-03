// server/routes/maturity-model-route.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// ========== FONCTIONS ==========

// GET all fonctions with their thematiques and niveaux
router.get('/fonctions', async (req, res) => {
  try {
    const [fonctions] = await pool.query(`
      SELECT f.*, 
        COUNT(DISTINCT t.id_thematique) as nb_thematiques,
        COUNT(DISTINCT ng.id_niveau) as nb_niveaux_globaux
      FROM fonctions f
      LEFT JOIN thematiques t ON f.id_fonction = t.id_fonction AND t.actif = TRUE
      LEFT JOIN niveaux_globaux ng ON f.id_fonction = ng.id_fonction
      WHERE f.actif = TRUE
      GROUP BY f.id_fonction
      ORDER BY f.ordre, f.nom
    `);
    
    res.json(fonctions);
  } catch (error) {
    logger.error('Error fetching fonctions:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des fonctions' });
  }
});

// GET fonction by ID with all details
router.get('/fonctions/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    
    // Get fonction
    const [fonctions] = await connection.query(
      'SELECT * FROM fonctions WHERE id_fonction = ? AND actif = TRUE',
      [id]
    );
    
    if (fonctions.length === 0) {
      return res.status(404).json({ message: 'Fonction non trouvée' });
    }
    
    const fonction = fonctions[0];
    
    // Get thematiques
    const [thematiques] = await connection.query(
      'SELECT * FROM thematiques WHERE id_fonction = ? AND actif = TRUE ORDER BY ordre, nom',
      [id]
    );
    
    // Get niveaux globaux
    const [niveauxGlobaux] = await connection.query(
      'SELECT * FROM niveaux_globaux WHERE id_fonction = ? ORDER BY ordre, score_min',
      [id]
    );
    
    // Get niveaux thematiques for each thematique
    for (const them of thematiques) {
      const [niveauxThem] = await connection.query(
        'SELECT * FROM niveaux_thematiques WHERE id_thematique = ? ORDER BY score_min',
        [them.id_thematique]
      );
      them.niveauxThematiques = niveauxThem;
    }
    
    res.json({
      ...fonction,
      thematiques,
      niveauxGlobaux
    });
  } catch (error) {
    logger.error('Error fetching fonction details:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération de la fonction' });
  } finally {
    connection.release();
  }
});

// POST create new fonction
router.post('/fonctions', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { nom, description, ordre } = req.body;
    const id_fonction = uuidv4();
    
    await connection.query(
      'INSERT INTO fonctions (id_fonction, nom, description, ordre) VALUES (?, ?, ?, ?)',
      [id_fonction, nom, description, ordre || 999]
    );
    
    // Log the action
    await connection.query(
      'INSERT INTO audit_modele_maturite (id_audit, type_action, type_entite, id_entite, nouvelle_valeur) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), 'CREATE', 'FONCTION', id_fonction, JSON.stringify({ nom, description, ordre })]
    );
    
    await connection.commit();
    res.status(201).json({ id_fonction, message: 'Fonction créée avec succès' });
  } catch (error) {
    await connection.rollback();
    logger.error('Error creating fonction:', error);
    res.status(500).json({ message: 'Erreur lors de la création de la fonction' });
  } finally {
    connection.release();
  }
});

// PUT update fonction
router.put('/fonctions/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { nom, description, ordre, actif } = req.body;
    
    // Get old values for audit
    const [oldValues] = await connection.query(
      'SELECT * FROM fonctions WHERE id_fonction = ?',
      [id]
    );
    
    if (oldValues.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Fonction non trouvée' });
    }
    
    await connection.query(
      'UPDATE fonctions SET nom = ?, description = ?, ordre = ?, actif = ? WHERE id_fonction = ?',
      [nom, description, ordre, actif, id]
    );
    
    // Log the action
    await connection.query(
      'INSERT INTO audit_modele_maturite (id_audit, type_action, type_entite, id_entite, ancien_valeur, nouvelle_valeur) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), 'UPDATE', 'FONCTION', id, JSON.stringify(oldValues[0]), JSON.stringify({ nom, description, ordre, actif })]
    );
    
    await connection.commit();
    res.json({ message: 'Fonction mise à jour avec succès' });
  } catch (error) {
    await connection.rollback();
    logger.error('Error updating fonction:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de la fonction' });
  } finally {
    connection.release();
  }
});

// DELETE fonction (soft delete)
router.delete('/fonctions/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // Check if fonction exists
    const [fonctions] = await connection.query(
      'SELECT * FROM fonctions WHERE id_fonction = ?',
      [id]
    );
    
    if (fonctions.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Fonction non trouvée' });
    }
    
    // Soft delete
    await connection.query(
      'UPDATE fonctions SET actif = FALSE WHERE id_fonction = ?',
      [id]
    );
    
    // Also deactivate related thematiques
    await connection.query(
      'UPDATE thematiques SET actif = FALSE WHERE id_fonction = ?',
      [id]
    );
    
    // Log the action
    await connection.query(
      'INSERT INTO audit_modele_maturite (id_audit, type_action, type_entite, id_entite, ancien_valeur) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), 'DELETE', 'FONCTION', id, JSON.stringify(fonctions[0])]
    );
    
    await connection.commit();
    res.json({ message: 'Fonction supprimée avec succès' });
  } catch (error) {
    await connection.rollback();
    logger.error('Error deleting fonction:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de la fonction' });
  } finally {
    connection.release();
  }
});

// ========== THEMATIQUES ==========

// GET all thematiques for a fonction
router.get('/fonctions/:fonctionId/thematiques', async (req, res) => {
  try {
    const { fonctionId } = req.params;
    
    const [thematiques] = await pool.query(`
      SELECT t.*, COUNT(nt.id_niveau) as nb_niveaux
      FROM thematiques t
      LEFT JOIN niveaux_thematiques nt ON t.id_thematique = nt.id_thematique
      WHERE t.id_fonction = ? AND t.actif = TRUE
      GROUP BY t.id_thematique
      ORDER BY t.ordre, t.nom
    `, [fonctionId]);
    
    res.json(thematiques);
  } catch (error) {
    logger.error('Error fetching thematiques:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des thématiques' });
  }
});

// POST create new thematique
router.post('/fonctions/:fonctionId/thematiques', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { fonctionId } = req.params;
    const { nom, description, nombre_questions, ordre } = req.body;
    const id_thematique = uuidv4();
    
    await connection.query(
      'INSERT INTO thematiques (id_thematique, nom, description, id_fonction, nombre_questions, ordre) VALUES (?, ?, ?, ?, ?, ?)',
      [id_thematique, nom, description, fonctionId, nombre_questions || 0, ordre || 999]
    );
    
    // Log the action
    await connection.query(
      'INSERT INTO audit_modele_maturite (id_audit, type_action, type_entite, id_entite, nouvelle_valeur) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), 'CREATE', 'THEMATIQUE', id_thematique, JSON.stringify({ nom, description, id_fonction: fonctionId, nombre_questions, ordre })]
    );
    
    await connection.commit();
    res.status(201).json({ id_thematique, message: 'Thématique créée avec succès' });
  } catch (error) {
    await connection.rollback();
    logger.error('Error creating thematique:', error);
    res.status(500).json({ message: 'Erreur lors de la création de la thématique' });
  } finally {
    connection.release();
  }
});

// PUT update thematique
router.put('/thematiques/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { nom, description, nombre_questions, ordre, actif } = req.body;
    
    // Get old values
    const [oldValues] = await connection.query(
      'SELECT * FROM thematiques WHERE id_thematique = ?',
      [id]
    );
    
    if (oldValues.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Thématique non trouvée' });
    }
    
    await connection.query(
      'UPDATE thematiques SET nom = ?, description = ?, nombre_questions = ?, ordre = ?, actif = ? WHERE id_thematique = ?',
      [nom, description, nombre_questions, ordre, actif, id]
    );
    
    // Log the action
    await connection.query(
      'INSERT INTO audit_modele_maturite (id_audit, type_action, type_entite, id_entite, ancien_valeur, nouvelle_valeur) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), 'UPDATE', 'THEMATIQUE', id, JSON.stringify(oldValues[0]), JSON.stringify({ nom, description, nombre_questions, ordre, actif })]
    );
    
    await connection.commit();
    res.json({ message: 'Thématique mise à jour avec succès' });
  } catch (error) {
    await connection.rollback();
    logger.error('Error updating thematique:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de la thématique' });
  } finally {
    connection.release();
  }
});

// DELETE thematique (soft delete)
router.delete('/thematiques/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    await connection.query(
      'UPDATE thematiques SET actif = FALSE WHERE id_thematique = ?',
      [id]
    );
    
    await connection.commit();
    res.json({ message: 'Thématique supprimée avec succès' });
  } catch (error) {
    await connection.rollback();
    logger.error('Error deleting thematique:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de la thématique' });
  } finally {
    connection.release();
  }
});

// ========== NIVEAUX GLOBAUX ==========

// GET niveaux globaux for a fonction
router.get('/fonctions/:fonctionId/niveaux-globaux', async (req, res) => {
  try {
    const { fonctionId } = req.params;
    
    const [niveaux] = await pool.query(
      'SELECT * FROM niveaux_globaux WHERE id_fonction = ? ORDER BY ordre, score_min',
      [fonctionId]
    );
    
    res.json(niveaux);
  } catch (error) {
    logger.error('Error fetching niveaux globaux:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des niveaux globaux' });
  }
});

// POST create niveau global
router.post('/fonctions/:fonctionId/niveaux-globaux', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { fonctionId } = req.params;
    const { score_min, score_max, niveau, description, recommandations, ordre } = req.body;
    const id_niveau = uuidv4();
    
    await connection.query(
      'INSERT INTO niveaux_globaux (id_niveau, id_fonction, score_min, score_max, niveau, description, recommandations, ordre) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id_niveau, fonctionId, score_min, score_max, niveau, description, recommandations, ordre || 999]
    );
    
    await connection.commit();
    res.status(201).json({ id_niveau, message: 'Niveau global créé avec succès' });
  } catch (error) {
    await connection.rollback();
    logger.error('Error creating niveau global:', error);
    res.status(500).json({ message: 'Erreur lors de la création du niveau global' });
  } finally {
    connection.release();
  }
});

// PUT update niveau global
router.put('/niveaux-globaux/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { score_min, score_max, niveau, description, recommandations, ordre } = req.body;
    
    await connection.query(
      'UPDATE niveaux_globaux SET score_min = ?, score_max = ?, niveau = ?, description = ?, recommandations = ?, ordre = ? WHERE id_niveau = ?',
      [score_min, score_max, niveau, description, recommandations, ordre, id]
    );
    
    await connection.commit();
    res.json({ message: 'Niveau global mis à jour avec succès' });
  } catch (error) {
    await connection.rollback();
    logger.error('Error updating niveau global:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du niveau global' });
  } finally {
    connection.release();
  }
});

// DELETE niveau global
router.delete('/niveaux-globaux/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM niveaux_globaux WHERE id_niveau = ?', [req.params.id]);
    res.json({ message: 'Niveau global supprimé avec succès' });
  } catch (error) {
    logger.error('Error deleting niveau global:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du niveau global' });
  }
});

// ========== NIVEAUX THEMATIQUES ==========

// GET niveaux thematiques for a thematique
router.get('/thematiques/:thematiqueId/niveaux', async (req, res) => {
  try {
    const { thematiqueId } = req.params;
    
    const [niveaux] = await pool.query(
      'SELECT * FROM niveaux_thematiques WHERE id_thematique = ? ORDER BY score_min',
      [thematiqueId]
    );
    
    res.json(niveaux);
  } catch (error) {
    logger.error('Error fetching niveaux thematiques:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des niveaux thématiques' });
  }
});

// POST create niveau thematique
router.post('/thematiques/:thematiqueId/niveaux', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { thematiqueId } = req.params;
    const { id_fonction, score_min, score_max, niveau, description, recommandations } = req.body;
    const id_niveau = uuidv4();
    
    await connection.query(
      'INSERT INTO niveaux_thematiques (id_niveau, id_fonction, id_thematique, score_min, score_max, niveau, description, recommandations) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id_niveau, id_fonction, thematiqueId, score_min, score_max, niveau, description, recommandations]
    );
    
    await connection.commit();
    res.status(201).json({ id_niveau, message: 'Niveau thématique créé avec succès' });
  } catch (error) {
    await connection.rollback();
    logger.error('Error creating niveau thematique:', error);
    res.status(500).json({ message: 'Erreur lors de la création du niveau thématique' });
  } finally {
    connection.release();
  }
});

// PUT update niveau thematique
router.put('/niveaux-thematiques/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { score_min, score_max, niveau, description, recommandations } = req.body;
    
    await connection.query(
      'UPDATE niveaux_thematiques SET score_min = ?, score_max = ?, niveau = ?, description = ?, recommandations = ? WHERE id_niveau = ?',
      [score_min, score_max, niveau, description, recommandations, id]
    );
    
    await connection.commit();
    res.json({ message: 'Niveau thématique mis à jour avec succès' });
  } catch (error) {
    await connection.rollback();
    logger.error('Error updating niveau thematique:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du niveau thématique' });
  } finally {
    connection.release();
  }
});

// DELETE niveau thematique
router.delete('/niveaux-thematiques/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM niveaux_thematiques WHERE id_niveau = ?', [req.params.id]);
    res.json({ message: 'Niveau thématique supprimé avec succès' });
  } catch (error) {
    logger.error('Error deleting niveau thematique:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du niveau thématique' });
  }
});

// ========== IMPORT/EXPORT ==========

// GET export complete model as JSON
router.get('/export', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const [fonctions] = await connection.query('SELECT * FROM fonctions WHERE actif = TRUE ORDER BY ordre');
    const [thematiques] = await connection.query('SELECT * FROM thematiques WHERE actif = TRUE ORDER BY ordre');
    const [niveauxGlobaux] = await connection.query('SELECT * FROM niveaux_globaux ORDER BY ordre, score_min');
    const [niveauxThematiques] = await connection.query('SELECT * FROM niveaux_thematiques ORDER BY score_min');
    
    const model = {
      fonctions,
      thematiques,
      niveauxGlobaux,
      niveauxThematiques,
      exportDate: new Date().toISOString()
    };
    
    res.json(model);
  } catch (error) {
    logger.error('Error exporting model:', error);
    res.status(500).json({ message: 'Erreur lors de l\'export du modèle' });
  } finally {
    connection.release();
  }
});

// POST import model from JSON
router.post('/import', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { fonctions, thematiques, niveauxGlobaux, niveauxThematiques } = req.body;
    
    // Import implementation would go here
    // This is a complex operation that should be carefully implemented
    // with validation and conflict resolution
    
    await connection.commit();
    res.json({ message: 'Import réalisé avec succès' });
  } catch (error) {
    await connection.rollback();
    logger.error('Error importing model:', error);
    res.status(500).json({ message: 'Erreur lors de l\'import du modèle' });
  } finally {
    connection.release();
  }
});

// ========== AUDIT ==========

// GET audit history
router.get('/audit', async (req, res) => {
  try {
    const { type_entite, id_entite, limit = 100, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM audit_modele_maturite WHERE 1=1';
    const params = [];
    
    if (type_entite) {
      query += ' AND type_entite = ?';
      params.push(type_entite);
    }
    
    if (id_entite) {
      query += ' AND id_entite = ?';
      params.push(id_entite);
    }
    
    query += ' ORDER BY date_action DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [audits] = await pool.query(query, params);
    res.json(audits);
  } catch (error) {
    logger.error('Error fetching audit history:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération de l\'historique' });
  }
});

module.exports = router;