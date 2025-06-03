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
    res.status(200).json(questionnaires);
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
    logger.debug(`GET /api/questionnaire/${id}/questions - Récupération des questions d'un questionnaire`);

    // Vérifier si le questionnaire existe
    const [questionnaires] = await pool.query(`
      SELECT * FROM questionnaires WHERE id_questionnaire = ?
    `, [id]);
    
    if (questionnaires.length === 0) {
      return res.status(404).json({ message: 'Questionnaire non trouvé' });
    }
    
    // Récupérer les questions associées
    const [questions] = await pool.query(`
      SELECT * FROM questions 
      WHERE id_questionnaire = ?
      ORDER BY ordre ASC
    `, [id]);
    
    res.status(200).json(questions);
  } catch (error) {
    console.error('Erreur lors de la récupération des questions:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des questions' });
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
    const { 
      titre,
      description,
      version,
      thematique,
      etat,
      instructions
    } = req.body;
    
    if (!titre || !thematique) {
      return res.status(400).json({ 
        message: 'Données invalides: titre et thematique sont requis' 
      });
    }
    
    const id_questionnaire = uuidv4();
    const now = new Date();
    
    await pool.query(`
      INSERT INTO questionnaires (
        id_questionnaire, titre, description, version, thematique,
        etat, instructions, date_creation, date_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id_questionnaire,
      titre,
      description || '',
      version || '1.0',
      thematique,
      etat || 'Actif',
      instructions || '',
      now,
      now
    ]);
    
    res.status(201).json({
      id_questionnaire,
      titre,
      description: description || '',
      version: version || '1.0',
      thematique,
      etat: etat || 'Actif',
      instructions: instructions || '',
      date_creation: now,
      date_modification: now
    });
  } catch (error) {
    console.error('Erreur lors de la création du questionnaire:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la création du questionnaire' });
  }
});

// PUT mettre à jour un questionnaire
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      titre,
      description,
      version,
      thematique,
      etat,
      instructions
    } = req.body;
    
    // Vérifier si le questionnaire existe
    const [questionnaires] = await pool.query('SELECT * FROM questionnaires WHERE id_questionnaire = ?', [id]);
    
    if (questionnaires.length === 0) {
      return res.status(404).json({ message: 'Questionnaire non trouvé' });
    }
    
    // Construire la requête de mise à jour
    let updateQuery = 'UPDATE questionnaires SET date_modification = NOW()';
    const updateParams = [];
    
    if (titre !== undefined) {
      updateQuery += ', titre = ?';
      updateParams.push(titre);
    }
    
    if (description !== undefined) {
      updateQuery += ', description = ?';
      updateParams.push(description);
    }
    
    if (version !== undefined) {
      updateQuery += ', version = ?';
      updateParams.push(version);
    }
    
    if (thematique !== undefined) {
      updateQuery += ', thematique = ?';
      updateParams.push(thematique);
    }
    
    if (etat !== undefined) {
      updateQuery += ', etat = ?';
      updateParams.push(etat);
    }
    
    if (instructions !== undefined) {
      updateQuery += ', instructions = ?';
      updateParams.push(instructions);
    }
    
    updateQuery += ' WHERE id_questionnaire = ?';
    updateParams.push(id);
    
    await pool.query(updateQuery, updateParams);
    
    // Récupérer le questionnaire mis à jour
    const [updatedQuestionnaires] = await pool.query('SELECT * FROM questionnaires WHERE id_questionnaire = ?', [id]);
    
    res.status(200).json(updatedQuestionnaires[0]);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du questionnaire:', error);
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