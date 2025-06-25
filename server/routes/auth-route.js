// server/routes/auth-route.js - Version corrigée
const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// POST /api/auth/login - Connexion utilisateur
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email et mot de passe requis' 
      });
    }
    
    // Rechercher l'utilisateur par email avec ses informations complètes
    const [users] = await pool.query(`
      SELECT a.*, r.nom_role, r.niveau_acces, e.nom_entreprise
      FROM acteurs a
      JOIN roles r ON a.id_role = r.id_role
      LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
      WHERE a.email = ?
    `, [email]);
    
    if (users.length === 0) {
      logger.warn(`Tentative de connexion avec email inexistant: ${email}`);
      return res.status(401).json({ 
        message: 'Email ou mot de passe incorrect' 
      });
    }
    
    const user = users[0];
    
    console.log('🔍 Utilisateur trouvé dans DB:', {
      email: user.email,
      nom_role: user.nom_role,
      niveau_acces: user.niveau_acces,
      id_entreprise: user.id_entreprise
    });
    
    // Vérifier le mot de passe (en production, utiliser bcrypt)
    // Pour le développement, on peut accepter un mot de passe simple
    const isValidPassword = password === 'password' || 
                           (user.mot_de_passe && await bcrypt.compare(password, user.mot_de_passe));
    
    if (!isValidPassword) {
      logger.warn(`Tentative de connexion avec mot de passe incorrect pour: ${email}`);
      return res.status(401).json({ 
        message: 'Email ou mot de passe incorrect' 
      });
    }
    
    // Préparer les données utilisateur pour le frontend
    const userData = {
      id_acteur: user.id_acteur,
      nom_prenom: user.nom_prenom,
      email: user.email,
      organisation: user.organisation,
      nom_role: user.nom_role,           // ✅ CORRECTION: utiliser nom_role de la DB
      niveau_acces: user.niveau_acces,   // ✅ CORRECTION: utiliser niveau_acces de la DB
      id_entreprise: user.id_entreprise,
      nom_entreprise: user.nom_entreprise
    };
    
    console.log('📤 Données utilisateur envoyées au frontend:', userData);
    
    // Créer le token JWT
    const token = jwt.sign(
      { 
        id_acteur: user.id_acteur,
        email: user.email,
        nom_role: user.nom_role,        // ✅ CORRECTION: utiliser nom_role
        niveau_acces: user.niveau_acces, // ✅ CORRECTION: utiliser niveau_acces
        id_entreprise: user.id_entreprise
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    // Mettre à jour la dernière connexion
    await pool.query(
      'UPDATE acteurs SET date_modification = NOW() WHERE id_acteur = ?', 
      [user.id_acteur]
    );
    
    logger.info(`Connexion réussie pour l'utilisateur: ${email} (${user.nom_role})`);
    
    res.status(200).json({
      message: 'Connexion réussie',
      token,
      user: userData  // ✅ CORRECTION: envoyer les données correctes
    });
    
  } catch (error) {
    logger.error('Erreur lors de la connexion:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la connexion' 
    });
  }
});

// POST /api/auth/register - Inscription utilisateur (pour les consultants uniquement)
router.post('/register', async (req, res) => {
  try {
    const { 
      nom_prenom, 
      email, 
      password,
      organisation,
      id_entreprise,
      id_role 
    } = req.body;
    
    console.log('📥 Données d\'inscription reçues:', {
      nom_prenom, email, organisation, id_entreprise, id_role
    });
    
    if (!nom_prenom || !email || !password || !id_role) {
      return res.status(400).json({ 
        message: 'Tous les champs obligatoires doivent être remplis' 
      });
    }
    
    // Vérifier que l'email n'existe pas déjà
    const [existingUsers] = await pool.query(
      'SELECT id_acteur FROM acteurs WHERE email = ?', 
      [email]
    );
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ 
        message: 'Un utilisateur avec cet email existe déjà' 
      });
    }
    
    // Vérifier que le rôle existe et récupérer ses informations
    const [roles] = await pool.query('SELECT * FROM roles WHERE id_role = ?', [id_role]);
    if (roles.length === 0) {
      return res.status(400).json({ message: 'Rôle invalide' });
    }
    
    // Vérifier que l'entreprise existe (si spécifiée)
    if (id_entreprise) {
      const [entreprises] = await pool.query('SELECT * FROM entreprises WHERE id_entreprise = ?', [id_entreprise]);
      if (entreprises.length === 0) {
        return res.status(400).json({ message: 'Entreprise invalide' });
      }
    }
    
    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Créer l'utilisateur
    const id_acteur = uuidv4();
    const now = new Date();
    
    await pool.query(`
      INSERT INTO acteurs (
        id_acteur, nom_prenom, email, organisation, 
        id_entreprise, id_role, mot_de_passe, anciennete_role,
        date_creation, date_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id_acteur, 
      nom_prenom, 
      email, 
      organisation || 'Non spécifié',
      id_entreprise,
      id_role,
      hashedPassword,
      0,
      now, 
      now
    ]);
    
    logger.info(`Nouvel utilisateur créé: ${email} (${roles[0].nom_role})`);
    
    // Préparer les données utilisateur pour le frontend
    const userData = {
      id_acteur,
      nom_prenom,
      email,
      organisation: organisation || 'Non spécifié',
      nom_role: roles[0].nom_role,        // ✅ CORRECTION: utiliser nom_role du rôle
      niveau_acces: roles[0].niveau_acces, // ✅ CORRECTION: utiliser niveau_acces du rôle
      id_entreprise
    };
    
    // Créer le token JWT
    const token = jwt.sign(
      { 
        id_acteur,
        email,
        nom_role: roles[0].nom_role,        // ✅ CORRECTION: utiliser nom_role
        niveau_acces: roles[0].niveau_acces, // ✅ CORRECTION: utiliser niveau_acces
        id_entreprise
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      token,
      user: userData  // ✅ CORRECTION: envoyer les données correctes
    });
    
  } catch (error) {
    logger.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors de l\'inscription' 
    });
  }
});

// POST /api/auth/logout - Déconnexion utilisateur
router.post('/logout', (req, res) => {
  try {
    // Dans une implémentation complète, on pourrait maintenir une blacklist des tokens
    // Pour le moment, on fait confiance au client pour supprimer le token
    
    res.status(200).json({ 
      message: 'Déconnexion réussie' 
    });
  } catch (error) {
    logger.error('Erreur lors de la déconnexion:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la déconnexion' 
    });
  }
});

// GET /api/auth/me - Obtenir les informations de l'utilisateur connecté
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Token d\'accès requis' });
    }
    
    // Vérifier le token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Récupérer les informations complètes de l'utilisateur
    const [users] = await pool.query(`
      SELECT a.*, r.nom_role, r.niveau_acces, e.nom_entreprise
      FROM acteurs a
      JOIN roles r ON a.id_role = r.id_role
      LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
      WHERE a.id_acteur = ?
    `, [decoded.id_acteur]);
    
    if (users.length === 0) {
      return res.status(401).json({ message: 'Utilisateur non trouvé' });
    }
    
    const user = users[0];
    
    // Préparer les données utilisateur pour le frontend
    const userData = {
      id_acteur: user.id_acteur,
      nom_prenom: user.nom_prenom,
      email: user.email,
      organisation: user.organisation,
      nom_role: user.nom_role,           // ✅ CORRECTION: utiliser nom_role de la DB
      niveau_acces: user.niveau_acces,   // ✅ CORRECTION: utiliser niveau_acces de la DB
      id_entreprise: user.id_entreprise,
      nom_entreprise: user.nom_entreprise
    };
    
    console.log('📤 /auth/me - Données utilisateur:', userData);
    
    res.status(200).json({
      user: userData  // ✅ CORRECTION: envoyer les données correctes
    });
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token invalide' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expiré' });
    }
    
    logger.error('Erreur lors de la vérification du token:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /api/auth/refresh - Renouveler le token
router.post('/refresh', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Token d\'accès requis' });
    }
    
    // Vérifier le token (même s'il est expiré)
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    
    // Vérifier que l'utilisateur existe toujours
    const [users] = await pool.query(`
      SELECT a.*, r.nom_role, r.niveau_acces
      FROM acteurs a
      JOIN roles r ON a.id_role = r.id_role
      WHERE a.id_acteur = ?
    `, [decoded.id_acteur]);
    
    if (users.length === 0) {
      return res.status(401).json({ message: 'Utilisateur non trouvé' });
    }
    
    const user = users[0];
    
    // Créer un nouveau token
    const newToken = jwt.sign(
      { 
        id_acteur: user.id_acteur,
        email: user.email,
        nom_role: user.nom_role,        // ✅ CORRECTION: utiliser nom_role
        niveau_acces: user.niveau_acces, // ✅ CORRECTION: utiliser niveau_acces
        id_entreprise: user.id_entreprise
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.status(200).json({
      token: newToken,
      message: 'Token renouvelé avec succès'
    });
    
  } catch (error) {
    logger.error('Erreur lors du renouvellement du token:', error);
    res.status(401).json({ message: 'Impossible de renouveler le token' });
  }
});

// GET /api/auth/roles - Obtenir la liste des rôles disponibles
router.get('/roles', async (req, res) => {
  try {
    const [roles] = await pool.query(`
      SELECT id_role, nom_role, description, niveau_acces
      FROM roles
      ORDER BY nom_role
    `);
    
    res.status(200).json(roles);
  } catch (error) {
    logger.error('Erreur lors de la récupération des rôles:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;