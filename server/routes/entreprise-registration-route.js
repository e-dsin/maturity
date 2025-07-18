// server/routes/entreprise-registration-route.js - VERSION CORRIGÉE SELON SCHÉMA

const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { body, validationResult } = require('express-validator');

// Validation des données d'entrée
const validateEnterpriseRegistration = [
  body('nom_entreprise').isLength({ min: 2 }).withMessage('Nom d entreprise trop court'),
  body('secteur').isIn([
    'Banque/Finance', 'Assurance', 'Industrie', 'Commerce/Distribution',
    'AgroPastoral', 'Santé', 'Éducation', 'Administration publique',
    'Transport/Logistique', 'Énergie/Utilities', 'Télécommunications',
    'Services et conseils', 'Autre'
  ]).withMessage('Secteur invalide'),
  body('email').isEmail().withMessage('Email entreprise invalide'),
  body('taille_entreprise').isIn(['TPE', 'PME', 'ETI', 'GE']).withMessage('Taille d entreprise invalide'),
  body('chiffre_affaires').isNumeric().withMessage('Chiffre d affaires invalide'),
  body('effectif_total').isInt({ min: 1 }).withMessage('Effectif total invalide'),
  body('manager_nom_prenom').isLength({ min: 2 }).withMessage('Nom du manager trop court'),
  body('manager_email').isEmail().withMessage('Email du manager invalide'),
  body('manager_mot_de_passe').isLength({ min: 8 }).withMessage('Mot de passe trop court')
];

// Helper function pour obtenir ou créer le rôle Manager
const getOrCreateManagerRole = async (connection) => {
  try {
    const [roles] = await connection.query(
      'SELECT id_role FROM roles WHERE nom_role = ?',
      ['Manager']
    );
    
    if (roles.length > 0) {
      return roles[0].id_role;
    }
    
    const roleId = uuidv4();
    await connection.query(
      'INSERT INTO roles (id_role, nom_role, description, niveau_acces) VALUES (?, ?, ?, ?)',
      [roleId, 'Manager', 'Manager d entreprise', 'ENTREPRISE']
    );
    
    logger.info('Rôle Manager créé:', roleId);
    return roleId;
    
  } catch (error) {
    logger.error('Erreur création rôle Manager:', error);
    throw error;
  }
};

// POST /api/entreprise-registration
router.post('/', validateEnterpriseRegistration, async (req, res) => {
  let connection = null;
  let transactionStarted = false;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const {
      nom_entreprise,
      secteur,
      description = '',
      adresse = '',
      telephone = '',
      email,
      site_web = '',
      taille_entreprise,
      chiffre_affaires = 0,
      effectif_total,
      ville_siege_social = '',
      pays_siege_social = 'France',
      manager_nom_prenom,
      manager_email,
      manager_mot_de_passe,
      vision_transformation_numerique = ''
    } = req.body;

    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    // Vérifications d'unicité
    const [existingEnterprise] = await connection.query(
      'SELECT id_entreprise FROM entreprises WHERE email = ?',
      [email]
    );
    
    if (existingEnterprise.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        message: 'Email entreprise déjà utilisé'
      });
    }

    const [existingManager] = await connection.query(
      'SELECT id_acteur FROM acteurs WHERE email = ?',
      [manager_email]
    );
    
    if (existingManager.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        message: 'Email manager déjà utilisé'
      });
    }

    // Création entreprise - Requête corrigée selon le schéma
    const id_entreprise = uuidv4();
    const now = new Date();

    await connection.query(`
      INSERT INTO entreprises (
        id_entreprise, nom_entreprise, secteur, description, adresse, 
        telephone, email, site_web, taille_entreprise, chiffre_affaires, 
        effectif_total, ville_siege_social, pays_siege_social, 
        statut_evaluation, vision_transformation_numerique, 
        date_creation, date_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id_entreprise,
      nom_entreprise,
      secteur,
      description,
      adresse,
      telephone,
      email,
      site_web,
      taille_entreprise,
      parseFloat(chiffre_affaires) || 0,
      parseInt(effectif_total),
      ville_siege_social,
      pays_siege_social,
      'EN_ATTENTE',
      vision_transformation_numerique,
      now,
      now
    ]);

    logger.info('Entreprise créée:', { id_entreprise });

    // Création ou récupération du rôle Manager
    const managerRoleId = await getOrCreateManagerRole(connection);

    // Création manager - Requête corrigée selon le schéma
    const id_acteur_manager = uuidv4();
    const hashedPassword = await bcrypt.hash(manager_mot_de_passe, 12);

    // Note: Le schéma montre que 'role' et 'id_role' existent tous les deux
    await connection.query(`
      INSERT INTO acteurs (
        id_acteur, nom_prenom, email, password_hash, role, organisation, 
        id_entreprise, id_role, anciennete_role, is_active, compte_actif,
        date_creation, date_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id_acteur_manager,
      manager_nom_prenom,
      manager_email,
      hashedPassword,
      'Manager', // Champ role texte
      nom_entreprise,
      id_entreprise,
      managerRoleId, // Référence vers la table roles
      0,
      1, // is_active
      1, // compte_actif
      now,
      now
    ]);

    logger.info('Manager créé:', { id_acteur_manager });

    await connection.commit();
    transactionStarted = false;

    // Récupération des données pour réponse
    const [enterpriseData] = await connection.query(
      'SELECT * FROM entreprises WHERE id_entreprise = ?',
      [id_entreprise]
    );

    const [managerData] = await connection.query(`
      SELECT a.*, r.nom_role, e.nom_entreprise 
      FROM acteurs a 
      JOIN roles r ON a.id_role = r.id_role 
      JOIN entreprises e ON a.id_entreprise = e.id_entreprise 
      WHERE a.id_acteur = ?
    `, [id_acteur_manager]);

    logger.info('Création terminée avec succès');

    res.status(201).json({
      message: 'Entreprise et manager créés avec succès',
      entreprise: enterpriseData[0],
      manager: {
        id_acteur: managerData[0].id_acteur,
        id_manager: managerData[0].id_acteur,
        nom_prenom: managerData[0].nom_prenom,
        email: managerData[0].email,
        role: managerData[0].nom_role,
        id_entreprise: managerData[0].id_entreprise,
        nom_entreprise: managerData[0].nom_entreprise
      }
    });

  } catch (error) {
    if (transactionStarted && connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        logger.error('Erreur rollback:', rollbackError);
      }
    }
    
    logger.error('Erreur création entreprise:', error);
    res.status(500).json({
      message: 'Erreur serveur lors de la création',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// GET /api/entreprise-registration - Test endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    message: 'Endpoint entreprise-registration opérationnel',
    version: '3.0.0-schema-fixed',
    status: 'active',
    timestamp: new Date().toISOString(),
    features: [
      'Création entreprise',
      'Création manager automatique',
      'Validation complète',
      'Gestion transactions',
      'Compatible avec schéma DB'
    ]
  });
});

module.exports = router;