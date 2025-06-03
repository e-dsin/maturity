const { pool } = require('../db/dbConnection');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/oauth-config');

class OAuthService {
  async findOrCreateUser(profile, provider) {
    try {
      // Rechercher l'utilisateur existant
      const [existingUsers] = await pool.query(
        'SELECT * FROM acteurs WHERE oauth_provider = ? AND oauth_id = ?',
        [provider, profile.id]
      );

      if (existingUsers.length > 0) {
        // Mettre à jour la dernière connexion
        await pool.query(
          'UPDATE acteurs SET last_login = NOW() WHERE id_acteur = ?',
          [existingUsers[0].id_acteur]
        );
        return existingUsers[0];
      }

      // Créer un nouvel utilisateur
      const userId = uuidv4();
      const userData = {
        id_acteur: userId,
        nom_prenom: profile.displayName || `${profile.name?.givenName} ${profile.name?.familyName}`,
        email: profile.emails?.[0]?.value,
        oauth_provider: provider,
        oauth_id: profile.id,
        profile_picture: profile.photos?.[0]?.value,
        role: 'Utilisateur', // Rôle par défaut
        organisation: 'Non définie',
        anciennete_role: 0,
        created_by_oauth: true,
        is_active: true
      };

      await pool.query(
        `INSERT INTO acteurs (
          id_acteur, nom_prenom, email, oauth_provider, oauth_id, 
          profile_picture, role, organisation, anciennete_role, 
          created_by_oauth, is_active, date_creation, date_modification
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        Object.values(userData)
      );

      return userData;
    } catch (error) {
      throw new Error(`Erreur lors de la création/recherche utilisateur: ${error.message}`);
    }
  }

  generateJWT(user) {
    const payload = {
      id_acteur: user.id_acteur,
      email: user.email,
      role: user.role,
      organisation: user.organisation
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    });
  }

  async getUserPermissions(userId) {
    try {
      const [permissions] = await pool.query(
        `SELECT ressource, action, conditions 
         FROM permissions 
         WHERE id_acteur = ? AND is_active = true`,
        [userId]
      );

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
      throw new Error(`Erreur lors de la récupération des permissions: ${error.message}`);
    }
  }
}

module.exports = new OAuthService();