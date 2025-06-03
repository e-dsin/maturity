// server/routes/reponses-route.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');

// GET toutes les réponses
router.get('/', async (req, res) => {
  try {
    const [reponses] = await pool.query(`
      SELECT r.*, q.texte as question_texte, f.id_application
      FROM reponses r
      JOIN questions q ON r.id_question = q.id_question
      JOIN formulaires f ON r.id_formulaire = f.id_formulaire
      ORDER BY r.date_creation DESC
    `);
    res.status(200).json(reponses);
  } catch (error) {
    console.error('Erreur lors de la récupération des réponses:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des réponses' });
  }
});

// GET réponse par ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [reponses] = await pool.query(`
      SELECT r.*, q.texte as question_texte, f.id_application
      FROM reponses r
      JOIN questions q ON r.id_question = q.id_question
      JOIN formulaires f ON r.id_formulaire = f.id_formulaire
      WHERE r.id_reponse = ?
    `, [id]);
    
    if (reponses.length === 0) {
      return res.status(404).json({ message: 'Réponse non trouvée' });
    }
    
    res.status(200).json(reponses[0]);
  } catch (error) {
    console.error('Erreur lors de la récupération de la réponse:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de la réponse' });
  }
});

// GET réponses par formulaire
router.get('/formulaire/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [reponses] = await pool.query(`
      SELECT r.*, q.texte as question_texte, q.type as question_type, q.thematique
      FROM reponses r
      JOIN questions q ON r.id_question = q.id_question
      WHERE r.id_formulaire = ?
      ORDER BY q.ordre ASC
    `, [id]);
    
    res.status(200).json(reponses);
  } catch (error) {
    console.error('Erreur lors de la récupération des réponses par formulaire:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des réponses par formulaire' });
  }
});

// POST nouvelle réponse
router.post('/', async (req, res) => {
  try {
    const { 
      id_formulaire,
      id_question,
      valeur_reponse,
      commentaire,
      score
    } = req.body;
    
    if (!id_formulaire || !id_question || valeur_reponse === undefined) {
      return res.status(400).json({ 
        message: 'Données invalides: id_formulaire, id_question et valeur_reponse sont requis' 
      });
    }
    
    // Vérifier si le formulaire et la question existent
    const [formulaires] = await pool.query('SELECT * FROM formulaires WHERE id_formulaire = ?', [id_formulaire]);
    
    if (formulaires.length === 0) {
      return res.status(404).json({ message: 'Formulaire non trouvé' });
    }
    
    const [questions] = await pool.query('SELECT * FROM questions WHERE id_question = ?', [id_question]);
    
    if (questions.length === 0) {
      return res.status(404).json({ message: 'Question non trouvée' });
    }
    
    // Vérifier si une réponse existe déjà pour cette combinaison formulaire/question
    const [existingReponses] = await pool.query(`
      SELECT * FROM reponses 
      WHERE id_formulaire = ? AND id_question = ?
    `, [id_formulaire, id_question]);
    
    if (existingReponses.length > 0) {
      return res.status(400).json({ 
        message: 'Une réponse existe déjà pour cette question dans ce formulaire' 
      });
    }
    
    const id_reponse = uuidv4();
    const now = new Date();
    
    const questionData = questions[0];
    let calculatedScore = score;
    
    // Calculer le score si non fourni
    if (calculatedScore === undefined) {
      // Logique de calcul de score en fonction du type de question et de la valeur
      // Par exemple, pour une question de type échelle
      if (questionData.type === 'echelle' && !isNaN(valeur_reponse)) {
        calculatedScore = (parseInt(valeur_reponse) / 5) * questionData.points_max;
      } 
      // Pour un choix multiple (oui/non)
      else if (questionData.type === 'choix_unique' && valeur_reponse === 'oui') {
        calculatedScore = questionData.points_max;
      }
      else if (questionData.type === 'choix_unique' && valeur_reponse === 'non') {
        calculatedScore = 0;
      }
      // Valeur par défaut
      else {
        calculatedScore = 0;
      }
    }
    
    await pool.query(`
      INSERT INTO reponses (
        id_reponse, id_formulaire, id_question, valeur_reponse,
        commentaire, score, date_creation, date_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id_reponse,
      id_formulaire,
      id_question,
      valeur_reponse.toString(),
      commentaire || '',
      calculatedScore,
      now,
      now
    ]);
    
    res.status(201).json({
      id_reponse,
      id_formulaire,
      id_question,
      valeur_reponse,
      commentaire: commentaire || '',
      score: calculatedScore,
      date_creation: now,
      date_modification: now
    });
  } catch (error) {
    console.error('Erreur lors de la création de la réponse:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la création de la réponse' });
  }
});


router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { valeur_reponse, commentaire, score } = req.body;
    
    // 1. D'abord, récupérer simplement la réponse sans jointure
    const [reponses] = await pool.query(
      'SELECT * FROM reponses WHERE id_reponse = ?', 
      [id]
    );
    
    if (reponses.length === 0) {
      return res.status(404).json({ message: 'Réponse non trouvée' });
    }
    
    // 2. Construire la requête de mise à jour sans calcul complexe
    const updateQuery = 'UPDATE reponses SET date_modification = NOW()';
    const updateParams = [];
    
    // 3. Ajouter les champs à mettre à jour un par un
    let finalQuery = updateQuery;
    
    if (commentaire !== undefined) {
      finalQuery += ', commentaire = ?';
      updateParams.push(commentaire);
    }
    
    if (valeur_reponse !== undefined) {
      finalQuery += ', valeur_reponse = ?';
      updateParams.push(valeur_reponse.toString());
    }
    
    if (score !== undefined) {
      finalQuery += ', score = ?';
      updateParams.push(score);
    }
    
    // 4. Finaliser la requête
    finalQuery += ' WHERE id_reponse = ?';
    updateParams.push(id);
    
    // 5. Exécuter la requête
    await pool.query(finalQuery, updateParams);
    
    // 6. Récupérer et retourner la réponse mise à jour
    const [updatedReponses] = await pool.query(
      'SELECT * FROM reponses WHERE id_reponse = ?', 
      [id]
    );
    
    res.status(200).json(updatedReponses[0]);
  } catch (error) {
    console.error('Erreur détaillée:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de la réponse' });
  }
});

// DELETE supprimer une réponse
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier si la réponse existe
    const [reponses] = await pool.query('SELECT * FROM reponses WHERE id_reponse = ?', [id]);
    
    if (reponses.length === 0) {
      return res.status(404).json({ message: 'Réponse non trouvée' });
    }
    
    await pool.query('DELETE FROM reponses WHERE id_reponse = ?', [id]);
    
    res.status(200).json({ message: 'Réponse supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la réponse:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression de la réponse' });
  }
});

module.exports = router;