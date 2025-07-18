// server/routes/auth-route.js - Version corrigée avec password_hash

const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const { 
  determineEvaluationRedirect, 
  getEvaluationQuery, 
  getProgressQuery 
} = require('../utils/evaluationRedirectLogic');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); 
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// POST /api/auth/login - Connexion utilisateur CORRIGÉE
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔑 === DÉBUT DEBUG LOGIN ===');
    console.log('📧 Email reçu:', email);
    console.log('🔐 Password reçu:', password);
    console.log('🔐 Password longueur:', password.length);
    
    if (!email || !password) {
      console.log('❌ Email ou password manquant');
      return res.status(400).json({ 
        message: 'Email et mot de passe requis' 
      });
    }
    
    // ÉTAPE 1 : Rechercher l'utilisateur avec le bon champ password_hash
    console.log('🔍 Recherche utilisateur...');
    const [users] = await pool.query(`
      SELECT a.*, r.nom_role, r.niveau_acces, e.nom_entreprise
      FROM acteurs a
      JOIN roles r ON a.id_role = r.id_role
      LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise
      WHERE a.email = ? AND a.is_active = 1
    `, [email]);
    
    console.log('👥 Nombre d\'utilisateurs trouvés:', users.length);
    
    if (users.length === 0) {
      console.log('❌ PROBLÈME : Aucun utilisateur trouvé avec cet email');
      
      // DEBUG SUPPLÉMENTAIRE : Vérifier si l'utilisateur existe sans le filtre is_active
      const [allUsers] = await pool.query(
        'SELECT email, is_active, role FROM acteurs WHERE email = ?',
        [email]
      );
      console.log('🔍 Debug - Utilisateurs avec cet email (tous statuts):', allUsers);
      
      logger.warn(`Tentative de connexion avec email inexistant: ${email}`);
      return res.status(401).json({ 
        message: 'Email ou mot de passe incorrect' 
      });
    }
    
    const user = users[0];
    console.log('✅ Utilisateur trouvé:');
    console.log('  - Email:', user.email);
    console.log('  - Nom:', user.nom_prenom);
    console.log('  - Rôle:', user.role, '/', user.nom_role);
    console.log('  - ID rôle:', user.id_role);
    console.log('  - Actif:', user.is_active);
    console.log('  - Password hash existe:', !!user.password_hash); // ✅ CORRIGÉ
    console.log('  - Password hash longueur:', user.password_hash?.length);
    console.log('  - Password hash début:', user.password_hash?.substring(0, 10) + '...');
    
    // ÉTAPE 2 : Vérifier le password_hash (CORRIGÉ)
    if (!user.password_hash) {
      console.log('❌ PROBLÈME : Password hash est null/undefined');
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }
    
    if (user.password_hash.length < 50) {
      console.log('❌ PROBLÈME : Password hash trop court:', user.password_hash.length);
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }
    
    // ETAPE : Vérification automatique du statut de l'evaluation

    let evaluationStatus = null;
try {
  // Utiliser la requête centralisée
  const { query, params } = getEvaluationQuery(user.id_acteur);
  const [invitations] = await pool.query(query, params);
  
  if (invitations.length > 0) {
    const invitation = invitations[0];
    console.log('📊 Invitation trouvée:', {
      statut_invitation: invitation.statut_invitation,
      statut_evaluation: invitation.statut_evaluation,
      role: invitation.role,
      nom_role: invitation.nom_role
    });
    
    // Vérifier le progrès si évaluation en cours
    let progress = null;
    if (invitation.id_evaluation) {
      const { query: progressQuery, params: progressParams } = getProgressQuery(
        invitation.id_evaluation, 
        user.id_acteur
      );
      const [progressData] = await pool.query(progressQuery, progressParams);
      
      if (progressData[0]) {
        progress = {
          reponses_donnees: progressData[0].reponses_donnees,
          total_questions: progressData[0].total_questions,
          pourcentage_completion: Math.round(
            (progressData[0].reponses_donnees / progressData[0].total_questions) * 100
          )
        };
      }
    }
    
    // ✅ Utiliser la logique centralisée pour déterminer la redirection
    evaluationStatus = determineEvaluationRedirect(invitation, progress, user.id_acteur);
    
  } else {
    console.log('📊 Aucune invitation d\'évaluation trouvée');
    evaluationStatus = {
      hasEvaluation: false,
      status: 'NO_EVALUATION',
      message: 'Aucune évaluation en attente',
      redirectTo: '/dashboard'
    };
  }
} catch (evalError) {
  console.error('⚠️ Erreur lors de la vérification d\'évaluation (non bloquant):', evalError);
  evaluationStatus = {
    hasEvaluation: false,
    status: 'ERROR',
    message: 'Erreur lors de la vérification du statut d\'évaluation',
    redirectTo: '/dashboard'
  };
}

    // ÉTAPE 3 : Test de comparaison bcrypt (CORRIGÉ)
    console.log('🔐 Test comparaison bcrypt...');
    console.log('  - Password à tester:', password);
    console.log('  - Hash stocké (début):', user.password_hash.substring(0, 20) + '...');
    
    const isValidPassword = await bcrypt.compare(password, user.password_hash); // ✅ CORRIGÉ
    console.log('🔐 Résultat comparaison bcrypt:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('❌ PROBLÈME : Mot de passe incorrect');
      
      // DEBUG SUPPLÉMENTAIRE : Tester avec des mots de passe courants
      console.log('🧪 Tests supplémentaires...');
      const testPasswords = [
        'password123', 
        'Password123', 
        '12345678', 
        password.trim(),
        'admin123',
        'manager123'
      ];
      
      for (const testPwd of testPasswords) {
        try {
          const testResult = await bcrypt.compare(testPwd, user.password_hash);
          console.log(`  - Test "${testPwd}":`, testResult ? '✅ MATCH!' : '❌ non');
          if (testResult) {
            console.log('🎉 TROUVÉ : Le vrai mot de passe est:', testPwd);
            break;
          }
        } catch (testError) {
          console.log(`  - Test "${testPwd}": ❌ erreur`, testError.message);
        }
      }
      
      logger.warn(`Tentative de connexion avec mot de passe incorrect pour: ${email}`);
      return res.status(401).json({ 
        message: 'Email ou mot de passe incorrect' 
      });
    }
    
    console.log('✅ Authentification réussie !');
    
    // ÉTAPE 4 : Préparer les données utilisateur pour le frontend
    const userData = {
      id_acteur: user.id_acteur,
      nom_prenom: user.nom_prenom,
      email: user.email,
      organisation: user.organisation,
      nom_role: user.nom_role,           
      niveau_acces: user.niveau_acces,   
      id_entreprise: user.id_entreprise,
      nom_entreprise: user.nom_entreprise
    };
    
    console.log('👤 Données utilisateur préparées:', userData);
    
    // ÉTAPE 5 : Créer le token JWT
    const token = jwt.sign(
      { 
        id_acteur: user.id_acteur,
        email: user.email,
        nom_role: user.nom_role,        
        niveau_acces: user.niveau_acces, 
        id_entreprise: user.id_entreprise
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    console.log('🔑 Token généré avec succès');
    
    // ÉTAPE 6 : Mettre à jour la dernière connexion
    await pool.query(
      'UPDATE acteurs SET date_modification = NOW() WHERE id_acteur = ?', 
      [user.id_acteur]
    );
    
    logger.info(`Connexion réussie pour l'utilisateur: ${email} (${user.nom_role})`);
    console.log('🔑 === FIN DEBUG LOGIN - SUCCÈS ===');
    
    res.status(200).json({
      message: 'Connexion réussie',
      token,
      user: userData
    });
    
  } catch (error) {
    console.log('❌ === ERREUR DANS LOGIN ===');
    console.log('❌ Error:', error);
    console.log('❌ Stack:', error.stack);
    logger.error('Erreur lors de la connexion:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la connexion' 
    });
  }
});

// POST /api/auth/register - Inscription utilisateur (CORRIGÉE)
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
    
    // Hasher le mot de passe (UTILISER LA MÊME MÉTHODE QUE DANS L'ENDPOINT CRÉATION)
    const hashedPassword = await bcrypt.hash(password, 12); // ✅ MÊME SALT ROUNDS
    
    // Créer l'utilisateur
    const id_acteur = uuidv4();
    const now = new Date();
    
    await pool.query(`
      INSERT INTO acteurs (
        id_acteur, nom_prenom, email, password_hash, role, organisation, 
        id_entreprise, id_role, anciennete_role, is_active,
        date_creation, date_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?)
    `, [
      id_acteur, 
      nom_prenom, 
      email, 
      hashedPassword,          // ✅ CORRIGÉ: password_hash
      roles[0].nom_role,       // ✅ CORRIGÉ: role (varchar)
      organisation || 'Non spécifié',
      id_entreprise,
      id_role,                 // ✅ CORRIGÉ: id_role (FK)
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
      nom_role: roles[0].nom_role,        
      niveau_acces: roles[0].niveau_acces, 
      id_entreprise
    };
    
    // Créer le token JWT
    const token = jwt.sign(
      { 
        id_acteur,
        email,
        nom_role: roles[0].nom_role,        
        niveau_acces: roles[0].niveau_acces, 
        id_entreprise
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      token,
      user: userData
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
      nom_role: user.nom_role,           
      niveau_acces: user.niveau_acces,   
      id_entreprise: user.id_entreprise,
      nom_entreprise: user.nom_entreprise
    };
    
    console.log('📤 /auth/me - Données utilisateur:', userData);
    
    res.status(200).json({
      user: userData
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
        nom_role: user.nom_role,        
        niveau_acces: user.niveau_acces, 
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