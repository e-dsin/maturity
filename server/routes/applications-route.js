// server/routes/applications-route.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');


// GET mapping application-entreprise
router.get('/entreprise-mapping', async (req, res) => {
  try {
    logger.debug('GET /api/applications/entreprise-mapping - Récupération du mapping application-entreprise');
    
    // Requête SQL pour récupérer toutes les applications avec leur ID d'entreprise
    const [applications] = await pool.query(`
      SELECT 
        a.id_application, 
        a.id_entreprise
      FROM 
        applications a
      ORDER BY 
        a.nom_application
    `);
    
    // Créer un objet de mapping simple
    const mapping = {};
    
    applications.forEach(app => {
      mapping[app.id_application] = app.id_entreprise;
    });
    
    res.status(200).json(mapping);
  } catch (error) {
    logger.error('Erreur lors de la récupération du mapping application-entreprise:', { 
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      message: 'Erreur serveur lors de la récupération du mapping application-entreprise',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET mapping application-entreprise (version alternative avec tableau)
router.get('/entreprise-mapping-array', async (req, res) => {
  try {
    logger.debug('GET /api/applications/entreprise-mapping-array - Récupération du mapping application-entreprise');
    
    // Requête SQL pour récupérer toutes les applications avec leur ID d'entreprise
    const [applications] = await pool.query(`
      SELECT 
        a.id_application, 
        a.id_entreprise,
        a.nom_application,
        e.nom_entreprise
      FROM 
        applications a
      LEFT JOIN 
        entreprises e ON a.id_entreprise = e.id_entreprise
      ORDER BY 
        a.nom_application
    `);
    
    // Renvoyer le tableau complet avec les informations détaillées
    res.status(200).json(applications);
  } catch (error) {
    logger.error('Erreur lors de la récupération du mapping application-entreprise:', { 
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      message: 'Erreur serveur lors de la récupération du mapping application-entreprise',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET toutes les applications
router.get('/', async (req, res) => {
  try {
    const [applications] = await pool.query(`
      SELECT * FROM applications
    `);
    logger.logResourceAccess('applications', 'all', req.user?.id || 'anonymous');
    res.status(200).json(applications);
  } catch (error) {
    logger.logOperationError('récupération des applications', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des applications' });
  }
});

// GET application par ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [applications] = await pool.query(`
      SELECT * FROM applications WHERE id_application = ?
    `, [id]);
    
    if (applications.length === 0) {
      return res.status(404).json({ message: 'Application non trouvée' });
    }
    
    logger.logResourceAccess('application', id, req.user?.id || 'anonymous');
    res.status(200).json(applications[0]);
  } catch (error) {
    logger.logOperationError('récupération de l\'application', error, req.user?.id || 'anonymous', 'application', req.params.id);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'application' });
  }
});

// POST nouvelle application
router.post('/', async (req, res) => {
  try {
    const { 
      nom_application, 
      statut, 
      type, 
      hebergement, 
      architecture_logicielle,
      date_mise_en_prod,
      editeur,
      language,
      description
    } = req.body;
    
    if (!nom_application) {
      return res.status(400).json({ message: 'Données invalides: nom_application est requis' });
    }
    
    const id_application = uuidv4();
    const now = new Date();
    
    await pool.query(`
      INSERT INTO applications (
        id_application, nom_application, statut, type, hebergement, 
        architecture_logicielle, date_mise_en_prod, editeur, language, 
        description, date_creation, date_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id_application, 
      nom_application, 
      statut || 'Projet', 
      type || 'Build', 
      hebergement || 'Cloud', 
      architecture_logicielle || 'Monolithique', 
      date_mise_en_prod, 
      editeur, 
      language, 
      description, 
      now, 
      now
    ]);
    
    logger.logResourceCreation('application', id_application, req.user?.id || 'anonymous');
    
    res.status(201).json({
      id_application,
      nom_application,
      statut: statut || 'Projet',
      type: type || 'Build',
      hebergement: hebergement || 'Cloud',
      architecture_logicielle: architecture_logicielle || 'Monolithique',
      date_mise_en_prod,
      editeur,
      language,
      description,
      date_creation: now,
      date_modification: now
    });
  } catch (error) {
    logger.logOperationError('création de l\'application', error, req.user?.id || 'anonymous');
    res.status(500).json({ message: 'Erreur serveur lors de la création de l\'application' });
  }
});

// PUT mettre à jour une application
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nom_application, 
      statut, 
      type, 
      hebergement, 
      architecture_logicielle,
      date_mise_en_prod,
      editeur,
      language,
      description
    } = req.body;
    
    // Vérifier si l'application existe
    const [applications] = await pool.query('SELECT * FROM applications WHERE id_application = ?', [id]);
    
    if (applications.length === 0) {
      return res.status(404).json({ message: 'Application non trouvée' });
    }
    
    // Construire la requête de mise à jour
    let updateQuery = 'UPDATE applications SET date_modification = NOW()';
    const updateParams = [];
    
    if (nom_application) {
      updateQuery += ', nom_application = ?';
      updateParams.push(nom_application);
    }
    
    if (statut) {
      updateQuery += ', statut = ?';
      updateParams.push(statut);
    }
    
    if (type) {
      updateQuery += ', type = ?';
      updateParams.push(type);
    }
    
    if (hebergement) {
      updateQuery += ', hebergement = ?';
      updateParams.push(hebergement);
    }
    
    if (architecture_logicielle) {
      updateQuery += ', architecture_logicielle = ?';
      updateParams.push(architecture_logicielle);
    }
    
    if (date_mise_en_prod !== undefined) {
      
        // Formatage de la date au format YYYY-MM-DD
        let formattedDate = null;
        if (date_mise_en_prod) {
          try {
            // Convertir la date ISO en objet Date puis formatter en YYYY-MM-DD
            const dateObj = new Date(date_mise_en_prod);
            formattedDate = dateObj.toISOString().split('T')[0]; // Récupère juste YYYY-MM-DD
          } catch (dateError) {
            logger.warn(`Erreur lors du formatage de la date: ${date_mise_en_prod}`, { error: dateError });
            // En cas d'erreur, ne pas mettre à jour ce champ
            formattedDate = null;
          }
        }
        
        updateQuery += ', date_mise_en_prod = ?';
        updateParams.push(formattedDate);
    }
    
    if (editeur !== undefined) {
      updateQuery += ', editeur = ?';
      updateParams.push(editeur);
    }
    
    if (language !== undefined) {
      updateQuery += ', language = ?';
      updateParams.push(language);
    }
    
    if (description !== undefined) {
      updateQuery += ', description = ?';
      updateParams.push(description);
    }
    
    updateQuery += ' WHERE id_application = ?';
    updateParams.push(id);
    
    await pool.query(updateQuery, updateParams);
    
    logger.logResourceUpdate('application', id, req.user?.id || 'anonymous', req.body);
    
    // Récupérer l'application mise à jour
    const [updatedApplications] = await pool.query('SELECT * FROM applications WHERE id_application = ?', [id]);
    
    res.status(200).json(updatedApplications[0]);
  } catch (error) {
    logger.logOperationError('mise à jour de l\'application', error, req.user?.id || 'anonymous', 'application', req.params.id);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de l\'application' });
  }
});

// DELETE supprimer une application
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier si l'application existe
    const [applications] = await pool.query('SELECT * FROM applications WHERE id_application = ?', [id]);
    
    if (applications.length === 0) {
      return res.status(404).json({ message: 'Application non trouvée' });
    }
    
    await pool.query('DELETE FROM applications WHERE id_application = ?', [id]);
    
    logger.logResourceDeletion('application', id, req.user?.id || 'anonymous');
    
    res.status(200).json({ message: 'Application supprimée avec succès' });
  } catch (error) {
    logger.logOperationError('suppression de l\'application', error, req.user?.id || 'anonymous', 'application', req.params.id);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression de l\'application' });
  }
});



module.exports = router;