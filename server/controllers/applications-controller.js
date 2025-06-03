// server/controllers/applications-controller.js
const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');

/**
 * Contrôleur pour les applications
 */
exports.getAllApplications = async (req, res) => {
  try {
    // Récupérer toutes les applications
    const [applications] = await pool.query(`
      SELECT 
        id_application,
        nom_application,
        statut,
        type,
        hebergement,
        architecture_logicielle,
        date_mise_en_prod,
        editeur,
        language,
        description
      FROM 
        applications
    `);
    
    res.status(200).json(applications);
  } catch (error) {
    console.error('Erreur lors de la récupération des applications:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des applications' });
  }
};

exports.getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Récupérer l'application par son ID
    const [applications] = await pool.query(`
      SELECT 
        id_application,
        nom_application,
        statut,
        type,
        hebergement,
        architecture_logicielle,
        date_mise_en_prod,
        editeur,
        language,
        description
      FROM 
        applications
      WHERE 
        id_application = ?
    `, [id]);
    
    if (applications.length === 0) {
      return res.status(404).json({ message: 'Application non trouvée' });
    }
    
    res.status(200).json(applications[0]);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'application:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'application' });
  }
};

// Créer une nouvelle application
exports.createApplication = async (req, res) => {
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
    
    // Validation des données
    if (!nom_application || !statut || !type || !hebergement || !architecture_logicielle) {
      return res.status(400).json({ 
        message: 'Données invalides: nom_application, statut, type, hebergement et architecture_logicielle sont requis' 
      });
    }
    
    // Vérifier que les valeurs énumérées sont valides
    const statutValues = ['Projet', 'Run'];
    const typeValues = ['Build', 'Buy'];
    const hebergementValues = ['Cloud', 'Prem', 'Hybrid'];
    const architectureValues = ['ERP', 'Multitenant SAAS', 'MVC', 'Monolithique'];
    
    if (!statutValues.includes(statut)) {
      return res.status(400).json({ message: 'Statut invalide: doit être "Projet" ou "Run"' });
    }
    
    if (!typeValues.includes(type)) {
      return res.status(400).json({ message: 'Type invalide: doit être "Build" ou "Buy"' });
    }
    
    if (!hebergementValues.includes(hebergement)) {
      return res.status(400).json({ message: 'Hébergement invalide: doit être "Cloud", "Prem" ou "Hybrid"' });
    }
    
    if (!architectureValues.includes(architecture_logicielle)) {
      return res.status(400).json({ 
        message: 'Architecture invalide: doit être "ERP", "Multitenant SAAS", "MVC" ou "Monolithique"' 
      });
    }
    
    // Valider le format de la date si fournie
    if (date_mise_en_prod) {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/; // Format YYYY-MM-DD
      if (!datePattern.test(date_mise_en_prod)) {
        return res.status(400).json({ message: 'Format de date invalide: doit être YYYY-MM-DD' });
      }
    }
    
    // Générer un UUID pour la nouvelle application
    const id_application = uuidv4();
    
    // Insérer l'application
    await pool.query(`
      INSERT INTO applications (
        id_application,
        nom_application,
        statut,
        type,
        hebergement,
        architecture_logicielle,
        date_mise_en_prod,
        editeur,
        language,
        description,
        date_creation,
        date_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      id_application,
      nom_application,
      statut,
      type,
      hebergement,
      architecture_logicielle,
      date_mise_en_prod || null,
      editeur || null,
      language || null,
      description || null
    ]);
    
    // Récupérer l'application créée
    const [applications] = await pool.query(`
      SELECT 
        id_application,
        nom_application,
        statut,
        type,
        hebergement,
        architecture_logicielle,
        date_mise_en_prod,
        editeur,
        language,
        description
      FROM 
        applications
      WHERE 
        id_application = ?
    `, [id_application]);
    
    res.status(201).json(applications[0]);
  } catch (error) {
    console.error('Erreur lors de la création de l\'application:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la création de l\'application' });
  }
};

// Mettre à jour une application
exports.updateApplication = async (req, res) => {
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
    const [existingApplication] = await pool.query('SELECT * FROM applications WHERE id_application = ?', [id]);
    
    if (existingApplication.length === 0) {
      return res.status(404).json({ message: 'Application non trouvée' });
    }
    
    // Validation des valeurs énumérées si elles sont fournies
    if (statut) {
      const statutValues = ['Projet', 'Run'];
      if (!statutValues.includes(statut)) {
        return res.status(400).json({ message: 'Statut invalide: doit être "Projet" ou "Run"' });
      }
    }
    
    if (type) {
      const typeValues = ['Build', 'Buy'];
      if (!typeValues.includes(type)) {
        return res.status(400).json({ message: 'Type invalide: doit être "Build" ou "Buy"' });
      }
    }
    
    if (hebergement) {
      const hebergementValues = ['Cloud', 'Prem', 'Hybrid'];
      if (!hebergementValues.includes(hebergement)) {
        return res.status(400).json({ message: 'Hébergement invalide: doit être "Cloud", "Prem" ou "Hybrid"' });
      }
    }
    
    if (architecture_logicielle) {
      const architectureValues = ['ERP', 'Multitenant SAAS', 'MVC', 'Monolithique'];
      if (!architectureValues.includes(architecture_logicielle)) {
        return res.status(400).json({ 
          message: 'Architecture invalide: doit être "ERP", "Multitenant SAAS", "MVC" ou "Monolithique"' 
        });
      }
    }
    
    // Valider le format de la date si fournie
    if (date_mise_en_prod) {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/; // Format YYYY-MM-DD
      if (!datePattern.test(date_mise_en_prod)) {
        return res.status(400).json({ message: 'Format de date invalide: doit être YYYY-MM-DD' });
      }
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
      updateQuery += ', date_mise_en_prod = ?';
      updateParams.push(date_mise_en_prod || null);
    }
    
    if (editeur !== undefined) {
      updateQuery += ', editeur = ?';
      updateParams.push(editeur || null);
    }
    
    if (language !== undefined) {
      updateQuery += ', language = ?';
      updateParams.push(language || null);
    }
    
    if (description !== undefined) {
      updateQuery += ', description = ?';
      updateParams.push(description || null);
    }
    
    updateQuery += ' WHERE id_application = ?';
    updateParams.push(id);
    
    // Exécuter la mise à jour
    await pool.query(updateQuery, updateParams);
    
    // Récupérer l'application mise à jour
    const [applications] = await pool.query(`
      SELECT 
        id_application,
        nom_application,
        statut,
        type,
        hebergement,
        architecture_logicielle,
        date_mise_en_prod,
        editeur,
        language,
        description
      FROM 
        applications
      WHERE 
        id_application = ?
    `, [id]);
    
    res.status(200).json(applications[0]);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'application:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de l\'application' });
  }
};

// Supprimer une application
exports.deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier si l'application existe
    const [existingApplication] = await pool.query('SELECT * FROM applications WHERE id_application = ?', [id]);
    
    if (existingApplication.length === 0) {
      return res.status(404).json({ message: 'Application non trouvée' });
    }
    
    // Vérifier les dépendances (formulaires, analyses, etc.)
    const [formulaires] = await pool.query('SELECT COUNT(*) as count FROM formulaires WHERE id_application = ?', [id]);
    const [analyses] = await pool.query('SELECT COUNT(*) as count FROM maturity_analyses WHERE id_application = ?', [id]);
    
    if (formulaires[0].count > 0 || analyses[0].count > 0) {
      return res.status(409).json({ 
        message: 'Impossible de supprimer l\'application car elle est référencée par des formulaires ou des analyses' 
      });
    }
    
    // Supprimer les permissions associées
    await pool.query('DELETE FROM permissions WHERE type_ressource = "APPLICATION" AND id_ressource = ?', [id]);
    
    // Supprimer l'application
    await pool.query('DELETE FROM applications WHERE id_application = ?', [id]);
    
    res.status(200).json({ message: 'Application supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'application:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression de l\'application' });
  }
};