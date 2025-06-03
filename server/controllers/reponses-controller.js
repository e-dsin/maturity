// server/controllers/reponses-controller.js
const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');

/**
 * Contrôleur pour les réponses aux questions
 */

// Récupérer toutes les réponses
exports.getAllReponses = async (req, res) => {
  try {
    const [reponses] = await pool.query(`
      SELECT 
        id_reponse,
        id_formulaire,
        id_question,
        valeur_reponse,
        score,
        commentaire,
        date_creation,
        date_modification
      FROM 
        reponses
    `);
    
    res.status(200).json(reponses);
  } catch (error) {
    console.error('Erreur lors de la récupération des réponses:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des réponses' });
  }
};

// Récupérer une réponse par son ID
exports.getReponseById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [reponses] = await pool.query(`
      SELECT 
        id_reponse,
        id_formulaire,
        id_question,
        valeur_reponse,
        score,
        commentaire,
        date_creation,
        date_modification
      FROM 
        reponses
      WHERE 
        id_reponse = ?
    `, [id]);
    
    if (reponses.length === 0) {
      return res.status(404).json({ message: 'Réponse non trouvée' });
    }
    
    res.status(200).json(reponses[0]);
  } catch (error) {
    console.error('Erreur lors de la récupération de la réponse:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de la réponse' });
  }
};

// Créer une nouvelle réponse
exports.createReponse = async (req, res) => {
  try {
    const { id_formulaire, id_question, valeur_reponse, score, commentaire } = req.body;
    
    // Validation des données
    if (!id_formulaire || !id_question || !valeur_reponse || score === undefined) {
      return res.status(400).json({ message: 'Données invalides: id_formulaire, id_question, valeur_reponse et score sont requis' });
    }
    
    // Générer un UUID pour la nouvelle réponse
    const id_reponse = uuidv4();
    const now = new Date();
    
    // Insérer la réponse
    await pool.query(`
      INSERT INTO reponses (
        id_reponse,
        id_formulaire,
        id_question,
        valeur_reponse,
        score,
        commentaire,
        date_creation,
        date_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id_reponse,
      id_formulaire,
      id_question,
      valeur_reponse,
      score,
      commentaire || null,
      now,
      now
    ]);
    
    // Récupérer la réponse créée
    const [reponses] = await pool.query(`
      SELECT 
        id_reponse,
        id_formulaire,
        id_question,
        valeur_reponse,
        score,
        commentaire,
        date_creation,
        date_modification
      FROM 
        reponses
      WHERE 
        id_reponse = ?
    `, [id_reponse]);
    
    res.status(201).json(reponses[0]);
  } catch (error) {
    console.error('Erreur lors de la création de la réponse:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la création de la réponse' });
  }
};

// Mettre à jour une réponse
exports.updateReponse = async (req, res) => {
  try {
    const { id } = req.params;
    const { valeur_reponse, score, commentaire } = req.body;
    
    // Validation des données
    if (!valeur_reponse && score === undefined && commentaire === undefined) {
      return res.status(400).json({ message: 'Aucune donnée à mettre à jour' });
    }
    
    // Vérifier si la réponse existe
    const [existingReponse] = await pool.query('SELECT * FROM reponses WHERE id_reponse = ?', [id]);
    
    if (existingReponse.length === 0) {
      return res.status(404).json({ message: 'Réponse non trouvée' });
    }
    
    // Construire la requête de mise à jour
    let updateQuery = 'UPDATE reponses SET date_modification = NOW()';
    const updateParams = [];
    
    if (valeur_reponse !== undefined) {
      updateQuery += ', valeur_reponse = ?';
      updateParams.push(valeur_reponse);
    }
    
    if (score !== undefined) {
      updateQuery += ', score = ?';
      updateParams.push(score);
    }
    
    if (commentaire !== undefined) {
      updateQuery += ', commentaire = ?';
      updateParams.push(commentaire);
    }
    
    updateQuery += ' WHERE id_reponse = ?';
    updateParams.push(id);
    
    // Exécuter la mise à jour
    await pool.query(updateQuery, updateParams);
    
    // Récupérer la réponse mise à jour
    const [reponses] = await pool.query(`
      SELECT 
        id_reponse,
        id_formulaire,
        id_question,
        valeur_reponse,
        score,
        commentaire,
        date_creation,
        date_modification
      FROM 
        reponses
      WHERE 
        id_reponse = ?
    `, [id]);
    
    res.status(200).json(reponses[0]);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la réponse:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de la réponse' });
  }
};

// Supprimer une réponse
exports.deleteReponse = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier si la réponse existe
    const [existingReponse] = await pool.query('SELECT * FROM reponses WHERE id_reponse = ?', [id]);
    
    if (existingReponse.length === 0) {
      return res.status(404).json({ message: 'Réponse non trouvée' });
    }
    
    // Supprimer la réponse
    await pool.query('DELETE FROM reponses WHERE id_reponse = ?', [id]);
    
    res.status(200).json({ message: 'Réponse supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la réponse:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression de la réponse' });
  }
};

// Récupérer les réponses d'un formulaire
exports.getReponsesByFormulaire = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [reponses] = await pool.query(`
      SELECT 
        r.id_reponse,
        r.id_formulaire,
        r.id_question,
        q.texte as question_texte,
        r.valeur_reponse,
        r.score,
        r.commentaire,
        r.date_creation,
        r.date_modification
      FROM 
        reponses r
      JOIN
        questions q ON r.id_question = q.id_question
      WHERE 
        r.id_formulaire = ?
      ORDER BY
        q.ordre
    `, [id]);
    
    res.status(200).json(reponses);
  } catch (error) {
    console.error('Erreur lors de la récupération des réponses du formulaire:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des réponses du formulaire' });
  }
};