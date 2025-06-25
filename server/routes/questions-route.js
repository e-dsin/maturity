// ✅ Nouveau fichier : server/routes/questions-route.js (complet avec fonctionnalités étendues)
const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// ✅ GET question par ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('SELECT * FROM questions WHERE id_question = ?', [id]);
    if (result.length === 0) {
      return res.status(404).json({ message: 'Question non trouvée' });
    }
    res.status(200).json(result[0]);
  } catch (error) {
    logger.error('Erreur GET /questions/:id', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ✅ GET questions par thématique
router.get('/thematique/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [questions] = await pool.query(
      'SELECT * FROM questions WHERE id_thematique = ? ORDER BY ordre ASC, date_creation DESC',
      [id]
    );
    res.status(200).json(questions);
  } catch (error) {
    logger.error('Erreur get questions par thématique :', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ✅ POST nouvelle question
router.post('/', async (req, res) => {
  try {
    const { texte, ponderation, ordre, id_thematique, aide_reponse } = req.body;

    if (!id_thematique || !texte) {
      return res.status(400).json({ message: 'id_thematique et texte requis' });
    }

    const [thematique] = await pool.query('SELECT * FROM thematiques WHERE id_thematique = ?', [id_thematique]);
    if (thematique.length === 0) {
      return res.status(404).json({ message: 'Thématique non trouvée' });
    }

    const now = new Date();
    const id_question = uuidv4();

    const [maxOrdre] = await pool.query(
      'SELECT COALESCE(MAX(ordre), 0) + 1 as next_ordre FROM questions WHERE id_thematique = ?',
      [id_thematique]
    );

    await pool.query(
      `INSERT INTO questions (
        id_question, id_thematique, texte, ponderation, ordre, aide_reponse, date_creation, date_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id_question, id_thematique, texte, ponderation || 1, ordre || maxOrdre[0].next_ordre, aide_reponse || null, now, now]
    );

    const [newQuestion] = await pool.query('SELECT * FROM questions WHERE id_question = ?', [id_question]);
    res.status(201).json(newQuestion[0]);
  } catch (error) {
    logger.error('Erreur post question :', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ✅ PUT mise à jour question
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { texte, ponderation, ordre, id_thematique, aide_reponse } = req.body;

    const [q] = await pool.query('SELECT * FROM questions WHERE id_question = ?', [id]);
    if (q.length === 0) {
      return res.status(404).json({ message: 'Question non trouvée' });
    }

    const updateFields = [];
    const values = [];

    if (texte !== undefined) { updateFields.push('texte = ?'); values.push(texte); }
    if (ponderation !== undefined) { updateFields.push('ponderation = ?'); values.push(ponderation); }
    if (ordre !== undefined) { updateFields.push('ordre = ?'); values.push(ordre); }
    if (id_thematique !== undefined) { updateFields.push('id_thematique = ?'); values.push(id_thematique); }
    if (aide_reponse !== undefined) { updateFields.push('aide_reponse = ?'); values.push(aide_reponse); }

    updateFields.push('date_modification = NOW()');

    await pool.query(
      `UPDATE questions SET ${updateFields.join(', ')} WHERE id_question = ?`,
      [...values, id]
    );

    const [updated] = await pool.query('SELECT * FROM questions WHERE id_question = ?', [id]);
    res.status(200).json(updated[0]);
  } catch (error) {
    logger.error('Erreur update question :', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ✅ DELETE
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [q] = await pool.query('SELECT * FROM questions WHERE id_question = ?', [id]);
    if (q.length === 0) {
      return res.status(404).json({ message: 'Question non trouvée' });
    }

    const [linked] = await pool.query('SELECT COUNT(*) as nb FROM reponses WHERE id_question = ?', [id]);
    if (linked[0].nb > 0) {
      return res.status(400).json({ message: 'Question liée à des réponses' });
    }

    await pool.query('DELETE FROM questions WHERE id_question = ?', [id]);
    res.status(200).json({ message: 'Question supprimée' });
  } catch (error) {
    logger.error('Erreur delete question :', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ✅ POST duplication par thématique
router.post('/:id/duplicate', async (req, res) => {
  try {
    const { id } = req.params;
    const { id_thematique_destination } = req.body;

    const [original] = await pool.query('SELECT * FROM questions WHERE id_question = ?', [id]);
    if (original.length === 0) {
      return res.status(404).json({ message: 'Question originale non trouvée' });
    }

    const destId = id_thematique_destination || original[0].id_thematique;
    const [them] = await pool.query('SELECT * FROM thematiques WHERE id_thematique = ?', [destId]);
    if (them.length === 0) {
      return res.status(404).json({ message: 'Thématique de destination non trouvée' });
    }

    const [maxOrdre] = await pool.query(
      'SELECT COALESCE(MAX(ordre), 0) + 1 as next_ordre FROM questions WHERE id_thematique = ?',
      [destId]
    );

    const newId = uuidv4();
    const now = new Date();

    await pool.query(
      `INSERT INTO questions (id_question, id_thematique, texte, ponderation, ordre, aide_reponse, date_creation, date_modification)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [newId, destId, `${original[0].texte} (copie)`, original[0].ponderation, maxOrdre[0].next_ordre, original[0].aide_reponse, now, now]
    );

    const [dup] = await pool.query('SELECT * FROM questions WHERE id_question = ?', [newId]);
    res.status(201).json(dup[0]);
  } catch (error) {
    logger.error('Erreur duplication question :', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ✅ PUT réordonner questions d’une thématique
router.put('/thematique/:id/reorder', async (req, res) => {
  try {
    const { id } = req.params;
    const { questions: reordered } = req.body; // array of { id_question, ordre }

    const [thems] = await pool.query('SELECT * FROM thematiques WHERE id_thematique = ?', [id]);
    if (thems.length === 0) {
      return res.status(404).json({ message: 'Thématique non trouvée' });
    }

    for (const q of reordered) {
      if (q.id_question && q.ordre !== undefined) {
        await pool.query(
          'UPDATE questions SET ordre = ?, date_modification = NOW() WHERE id_question = ? AND id_thematique = ?',
          [q.ordre, q.id_question, id]
        );
      }
    }

    const [result] = await pool.query(
      'SELECT * FROM questions WHERE id_thematique = ? ORDER BY ordre ASC',
      [id]
    );

    res.status(200).json(result);
  } catch (error) {
    logger.error('Erreur reorder questions :', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
