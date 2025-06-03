const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');

// Créer un logger simple si winston n'est pas disponible
let logger;
try {
  logger = require('../utils/logger');
} catch (error) {
  logger = {
    info: console.log,
    warn: console.warn,
    error: console.error
  };
}

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
    this.jwtExpiration = process.env.JWT_EXPIRATION || '24h';
    this.maxLoginAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
    this.lockoutDuration = parseInt(process.env.ACCOUNT_LOCKOUT_DURATION) * 60 * 1000 || 15 * 60 * 1000; // 15 minutes par défaut
  }

  // Hacher un mot de passe
  async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // Vérifier un mot de passe
  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  // Générer un token JWT
  generateJWT(user) {
    const payload = {
      id_acteur: user.id_acteur,
      email: user.email,
      role: user.role,
      organisation: user.organisation,
      oauth_provider: user.oauth_provider || 'local'
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiration,
      issuer: 'maturity-assessment-app',
      audience: 'maturity-assessment-users'
    });
  }

  // Vérifier un token JWT
  verifyJWT(token) {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: 'maturity-assessment-app',
        audience: 'maturity-assessment-users'
      });
    } catch (error) {
      throw new Error('Token invalide ou expiré');
    }
  }

  // Vérifier si le compte est verrouillé
  async isAccountLocked(userId) {
    const [users] = await pool.query(
      'SELECT account_locked_until FROM acteurs WHERE id_acteur = ?',
      [userId]
    );

    if (users.length === 0) return false;

    const lockedUntil = users[0].account_locked_until;
    if (!lockedUntil) return false;

    return new Date() < new Date(lockedUntil);
  }

  // Incrémenter les tentatives de connexion échouées
  async incrementFailedAttempts(email) {
    const [result] = await pool.query(`
      UPDATE acteurs 
      SET failed_login_attempts = failed_login_attempts + 1,
          account_locked_until = CASE 
            WHEN failed_login_attempts + 1 >= ? THEN DATE_ADD(NOW(), INTERVAL ? MICROSECOND)
            ELSE account_locked_until
          END
      WHERE email = ?
    `, [this.maxLoginAttempts, this.lockoutDuration * 1000, email]);

    return result.affectedRows > 0;
  }

  // Réinitialiser les tentatives de connexion
  async resetFailedAttempts(userId) {
    await pool.query(`
      UPDATE acteurs 
      SET failed_login_attempts = 0, 
          account_locked_until = NULL,
          last_login = NOW()
      WHERE id_acteur = ?
    `, [userId]);
  }

  // Authentification locale
  async authenticateLocal(email, password) {
    try {
      // Récupérer l'utilisateur
      const [users] = await pool.query(`
        SELECT id_acteur, nom_prenom, email, password_hash, role, organisation,
               is_active, failed_login_attempts, account_locked_until, oauth_provider
        FROM acteurs 
        WHERE email = ? AND oauth_provider = 'local'
      `, [email]);

      if (users.length === 0) {
        logger.warn('Tentative de connexion avec email inexistant', { email });
        throw new Error('Email ou mot de passe incorrect');
      }

      const user = users[0];

      // Vérifier si le compte est actif
      if (!user.is_active) {
        logger.warn('Tentative de connexion sur compte désactivé', { email, userId: user.id_acteur });
        throw new Error('Compte désactivé');
      }

      // Vérifier si le compte est verrouillé
      if (await this.isAccountLocked(user.id_acteur)) {
        logger.warn('Tentative de connexion sur compte verrouillé', { email, userId: user.id_acteur });
        throw new Error('Compte temporairement verrouillé. Réessayez plus tard.');
      }

      // Vérifier le mot de passe
      if (!user.password_hash || !await this.verifyPassword(password, user.password_hash)) {
        await this.incrementFailedAttempts(email);
        logger.warn('Tentative de connexion avec mot de passe incorrect', { email, userId: user.id_acteur });
        throw new Error('Email ou mot de passe incorrect');
      }

      // Connexion réussie
      await this.resetFailedAttempts(user.id_acteur);
      
      logger.info('Connexion réussie', { email, userId: user.id_acteur });

      // Retourner l'utilisateur sans le hash du mot de passe
      const { password_hash, failed_login_attempts, account_locked_until, ...safeUser } = user;
      return safeUser;

    } catch (error) {
      logger.error('Erreur lors de l\'authentification', { email, error: error.message });
      throw error;
    }
  }

  // Créer un nouvel utilisateur
  async register(userData) {
    const { nom_prenom, email, password, role = 'Utilisateur', organisation = 'Non définie' } = userData;

    try {
      // Vérifier si l'email existe déjà
      const [existingUsers] = await pool.query(
        'SELECT id_acteur FROM acteurs WHERE email = ?',
        [email]
      );

      if (existingUsers.length > 0) {
        throw new Error('Cet email est déjà utilisé');
      }

      // Hacher le mot de passe
      const passwordHash = await this.hashPassword(password);
      const userId = uuidv4();

      // Créer l'utilisateur
      await pool.query(`
        INSERT INTO acteurs (
          id_acteur, nom_prenom, email, password_hash, role, organisation,
          oauth_provider, is_active, anciennete_role,
          date_creation, date_modification
        ) VALUES (?, ?, ?, ?, ?, ?, 'local', true, 0, NOW(), NOW())
      `, [userId, nom_prenom, email, passwordHash, role, organisation]);

      logger.info('Nouvel utilisateur créé', { email, userId, role });

      return {
        id_acteur: userId,
        nom_prenom,
        email,
        role,
        organisation,
        oauth_provider: 'local',
        is_active: true
      };

    } catch (error) {
      logger.error('Erreur lors de l\'inscription', { email, error: error.message });
      throw error;
    }
  }

  // Récupérer les permissions d'un utilisateur
  async getUserPermissions(userId) {
    try {
      const [permissions] = await pool.query(`
        SELECT ressource, action, conditions 
        FROM permissions 
        WHERE id_acteur = ? AND is_active = true
      `, [userId]);

      return permissions.reduce((acc, perm) => {
        if (!acc[perm.ressource]) {
          acc[perm.ressource] = [];
        }
        acc[perm.ressource].push({
          action: perm.action,
          conditions: perm.conditions ? JSON.parse(perm.conditions) : {}
        });
        return acc;
      }, {});
    } catch (error) {
      logger.error('Erreur lors de la récupération des permissions', { userId, error: error.message });
      throw error;
    }
  }

  // Générer un token de réinitialisation de mot de passe
  async generatePasswordResetToken(email) {
    try {
      const [users] = await pool.query(
        'SELECT id_acteur FROM acteurs WHERE email = ? AND oauth_provider = "local"',
        [email]
      );

      if (users.length === 0) {
        throw new Error('Aucun compte trouvé avec cet email');
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

      await pool.query(`
        UPDATE acteurs 
        SET password_reset_token = ?, password_reset_expires = ?
        WHERE email = ?
      `, [resetToken, expiresAt, email]);

      logger.info('Token de réinitialisation généré', { email });
      return resetToken;

    } catch (error) {
      logger.error('Erreur lors de la génération du token de réinitialisation', { email, error: error.message });
      throw error;
    }
  }

  // Réinitialiser le mot de passe
  async resetPassword(token, newPassword) {
    try {
      const [users] = await pool.query(`
        SELECT id_acteur, email 
        FROM acteurs 
        WHERE password_reset_token = ? 
        AND password_reset_expires > NOW()
        AND oauth_provider = 'local'
      `, [token]);

      if (users.length === 0) {
        throw new Error('Token invalide ou expiré');
      }

      const passwordHash = await this.hashPassword(newPassword);

      await pool.query(`
        UPDATE acteurs 
        SET password_hash = ?, 
            password_reset_token = NULL, 
            password_reset_expires = NULL,
            failed_login_attempts = 0,
            account_locked_until = NULL
        WHERE id_acteur = ?
      `, [passwordHash, users[0].id_acteur]);

      logger.info('Mot de passe réinitialisé', { email: users[0].email, userId: users[0].id_acteur });
      return true;

    } catch (error) {
      logger.error('Erreur lors de la réinitialisation du mot de passe', { token, error: error.message });
      throw error;
    }
  }

  // Changer le mot de passe (utilisateur connecté)
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const [users] = await pool.query(
        'SELECT password_hash FROM acteurs WHERE id_acteur = ? AND oauth_provider = "local"',
        [userId]
      );

      if (users.length === 0) {
        throw new Error('Utilisateur non trouvé');
      }

      // Vérifier le mot de passe actuel
      if (!await this.verifyPassword(currentPassword, users[0].password_hash)) {
        throw new Error('Mot de passe actuel incorrect');
      }

      // Hacher le nouveau mot de passe
      const passwordHash = await this.hashPassword(newPassword);

      await pool.query(
        'UPDATE acteurs SET password_hash = ? WHERE id_acteur = ?',
        [passwordHash, userId]
      );

      logger.info('Mot de passe changé', { userId });
      return true;

    } catch (error) {
      logger.error('Erreur lors du changement de mot de passe', { userId, error: error.message });
      throw error;
    }
  }
}

module.exports = new AuthService();