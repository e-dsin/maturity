// server/routes/questionnaires-route.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// GET tous les questionnaires
router.get('/', async (req, res) => {
  try {
    logger.debug('GET /api/questionnaire - Récupération de tous les questionnaires');
    
    const [questionnaires] = await pool.query(`
      SELECT * FROM questionnaires ORDER BY date_creation DESC
    `);
    
    // Adapter les données pour le frontend (utiliser 'fonction' au lieu de 'titre')
    const adaptedQuestionnaires = questionnaires.map(q => ({
      ...q,
      fonction: q.fonction || q.titre || ''
    }));
    
    res.status(200).json(adaptedQuestionnaires);
  } catch (error) {
    console.error('Erreur lors de la récupération des questionnaires:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des questionnaires' });
  }
});

// GET statistiques des questionnaires
router.get('/stats', async (req, res) => {
    try {
      logger.debug('GET /api/questionnaire/stats - Récupération des statistiques des questionnaires');
  
       // Compter le nombre de formulaires par questionnaire
      // Cette requête est conçue pour fonctionner même si la structure est différente
      const [questionnaires] = await pool.query(`SELECT * FROM questionnaires`);
      
   // Construire manuellement les statistiques si la requête complexe échoue
   const stats = await Promise.all(questionnaires.map(async (q) => {
      try {
        // Essayer de compter les formulaires associés
        const [formCount] = await pool.query(`
          SELECT COUNT(*) as count FROM formulaires WHERE id_questionnaire = ?
        `, [q.id_questionnaire]);
        
        const count = formCount[0]?.count || 0;
        
        return {
          id_questionnaire: q.id_questionnaire,
          fonction: q.fonction || q.titre || '',
          num_evaluations: count,
          score_moyen: 0 // Valeur par défaut
        };
      } catch (err) {
        // En cas d'erreur, retourner des valeurs par défaut
        return {
          id_questionnaire: q.id_questionnaire,
          fonction: q.fonction || q.titre || '',
          num_evaluations: 0,
          score_moyen: 0
        };
      }
    }));
    
    res.status(200).json(stats);
  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques des questionnaires:', { error });
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des statistiques' });
  }
  });
  

// GET questionnaire par ID
router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      logger.debug(`GET /api/questionnaire/${id} - Récupération d'un questionnaire spécifique`);
      
      const [questionnaires] = await pool.query(`
        SELECT * FROM questionnaires WHERE id_questionnaire = ?
      `, [id]);
      
      if (questionnaires.length === 0) {
        return res.status(404).json({ message: 'Questionnaire non trouvé' });
      }
      
      // Adapter les champs pour correspondre à ce qu'attend le frontend
      const q = questionnaires[0];
      const adaptedQuestionnaire = {
        id_questionnaire: q.id_questionnaire,
        nom: q.nom || '',
        fonction: q.fonction || q.titre || '',
        thematique: q.thematique || '',
        description: q.description || '',
        date_creation: q.date_creation || new Date(),
        date_modification: q.date_modification || q.date_creation || new Date(),
        version: q.version || '1.0',
        etat: q.etat || 'Actif'
      };
      
      res.status(200).json(adaptedQuestionnaire);
    } catch (error) {
      logger.error(`Erreur lors de la récupération du questionnaire ${req.params.id}:`, { error });
      res.status(500).json({ message: 'Erreur serveur lors de la récupération du questionnaire' });
    }
  });  
    
// GET questions par questionnaire
router.get('/:id/questions', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [questions] = await pool.query(`
      SELECT DISTINCT q.*, t.nom as thematique_nom
      FROM questions q
      JOIN thematiques t ON q.id_thematique = t.id_thematique
      JOIN questionnaire_thematiques qt ON t.id_thematique = qt.id_thematique
      WHERE qt.id_questionnaire = ?
      ORDER BY qt.ordre, q.ordre
    `, [id]);
    
    res.status(200).json(questions);
  } catch (error) {
    logger.error('Error retrieving questions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// GET statistiques d'un questionnaire spécifique
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug(`GET /api/questionnaire/${id}/stats - Récupération des statistiques d'un questionnaire spécifique`);

    // Vérifier si le questionnaire existe
    const [questionnaires] = await pool.query(`
      SELECT * FROM questionnaires WHERE id_questionnaire = ?
    `, [id]);
    
    if (questionnaires.length === 0) {
      return res.status(404).json({ message: 'Questionnaire non trouvé' });
    }
    
   // Essayer de compter les formulaires
    let numForms = 0;
    try {
      const [formCount] = await pool.query(`
        SELECT COUNT(*) as count FROM formulaires WHERE id_questionnaire = ?
      `, [id]);
      numForms = formCount[0]?.count || 0;
    } catch (err) {
      logger.warn(`Erreur lors du comptage des formulaires pour le questionnaire ${id}:`, { error: err });
    }
    
      // Construire les statistiques simplifiées
      const stats = {
        id_questionnaire: id,
        fonction: questionnaires[0].fonction || questionnaires[0].titre || '',
        num_evaluations: numForms,
        score_moyen: 0
      };
      
      res.status(200).json(stats);
    } catch (error) {
      logger.error(`Erreur lors de la récupération des statistiques du questionnaire ${req.params.id}:`, { error });
      res.status(500).json({ message: 'Erreur serveur lors de la récupération des statistiques du questionnaire' });
    }
  });

// POST nouveau questionnaire
router.post('/', async (req, res) => {
  try {
    const { nom, description, thematiques } = req.body;
    
    if (!nom) {
      return res.status(400).json({ message: 'Le nom est requis' });
    }
    
    const id_questionnaire = uuidv4();
    
    // Créer le questionnaire
    await pool.query(`
      INSERT INTO questionnaires (id_questionnaire, nom, description)
      VALUES (?, ?, ?)
    `, [id_questionnaire, nom, description || null]);
    
    // Ajouter les thématiques si fournies
    if (thematiques && thematiques.length > 0) {
      for (let i = 0; i < thematiques.length; i++) {
        await pool.query(`
          INSERT INTO questionnaire_thematiques (id_questionnaire, id_thematique, ordre)
          VALUES (?, ?, ?)
        `, [id_questionnaire, thematiques[i], i + 1]);
      }
    }
    
    const [newQuestionnaire] = await pool.query(
      'SELECT * FROM questionnaires WHERE id_questionnaire = ?', 
      [id_questionnaire]
    );
    
    res.status(201).json(newQuestionnaire[0]);
  } catch (error) {
    logger.error('Error creating questionnaire:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT mettre à jour un questionnaire
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, description, thematiques } = req.body;
    
    console.log('📥 Mise à jour questionnaire:', id, { nom, description, thematiques });
    
    // Vérifier si le questionnaire existe
    const [questionnaires] = await pool.query('SELECT * FROM questionnaires WHERE id_questionnaire = ?', [id]);
    
    if (questionnaires.length === 0) {
      return res.status(404).json({ message: 'Questionnaire non trouvé' });
    }
    
    // Construire la requête de mise à jour
    let updateQuery = 'UPDATE questionnaires SET';
    const updateParams = [];
    const updates = [];
    
    if (nom !== undefined) {
      updates.push(' nom = ?');
      updateParams.push(nom);
    }
    
    if (description !== undefined) {
      updates.push(' description = ?');
      updateParams.push(description);
    }
    
    // Si aucune mise à jour, retourner le questionnaire existant
    if (updates.length === 0 && !thematiques) {
      return res.status(200).json(questionnaires[0]);
    }
    
    // Mettre à jour les champs du questionnaire si nécessaire
    if (updates.length > 0) {
      updateQuery += updates.join(',') + ' WHERE id_questionnaire = ?';
      updateParams.push(id);
      
      console.log('📤 Requête UPDATE:', updateQuery);
      console.log('📤 Paramètres:', updateParams);
      
      await pool.query(updateQuery, updateParams);
    }
    
    // Mettre à jour les thématiques si fournies
    if (thematiques && Array.isArray(thematiques)) {
      // Supprimer les anciennes liaisons
      await pool.query('DELETE FROM questionnaire_thematiques WHERE id_questionnaire = ?', [id]);
      
      // Ajouter les nouvelles liaisons
      for (let i = 0; i < thematiques.length; i++) {
        await pool.query(`
          INSERT INTO questionnaire_thematiques (id_questionnaire, id_thematique, ordre)
          VALUES (?, ?, ?)
        `, [id, thematiques[i], i + 1]);
      }
    }
    
    // Récupérer le questionnaire mis à jour
    const [updatedQuestionnaires] = await pool.query('SELECT * FROM questionnaires WHERE id_questionnaire = ?', [id]);
    
    // Récupérer aussi les thématiques associées
    const [linkedThematiques] = await pool.query(`
      SELECT t.id_thematique, t.nom
      FROM questionnaire_thematiques qt
      JOIN thematiques t ON qt.id_thematique = t.id_thematique
      WHERE qt.id_questionnaire = ?
      ORDER BY qt.ordre
    `, [id]);
    
    const result = {
      ...updatedQuestionnaires[0],
      thematiques: linkedThematiques
    };
    
    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du questionnaire:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du questionnaire' });
  }
});

// DELETE supprimer un questionnaire
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier si le questionnaire existe
    const [questionnaires] = await pool.query('SELECT * FROM questionnaires WHERE id_questionnaire = ?', [id]);
    
    if (questionnaires.length === 0) {
      return res.status(404).json({ message: 'Questionnaire non trouvé' });
    }
    
    // Vérifier s'il existe des formulaires liés
    const [formulaires] = await pool.query('SELECT COUNT(*) as count FROM formulaires WHERE id_questionnaire = ?', [id]);
    
    if (formulaires[0].count > 0) {
      return res.status(400).json({ 
        message: 'Impossible de supprimer ce questionnaire car il est lié à des formulaires existants'
      });
    }
    
    // Supprimer d'abord les questions associées
    await pool.query('DELETE FROM questions WHERE id_questionnaire = ?', [id]);
    
    // Supprimer le questionnaire
    await pool.query('DELETE FROM questionnaires WHERE id_questionnaire = ?', [id]);
    
    res.status(200).json({ message: 'Questionnaire supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du questionnaire:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression du questionnaire' });
  }
});

module.exports = router;