// scripts/setup-local-auth.js
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

class LocalAuthSetup {
  constructor() {
    this.dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'maturity_assessment',
      multipleStatements: true
    };
  }

  async runMigration() {
    let connection;
    
    try {
      console.log('🔄 Connexion à la base de données...');
      connection = await mysql.createConnection(this.dbConfig);
      console.log('✅ Connexion établie');

      // Migration simple pour l'authentification locale
      const migrationSQL = `
        USE ${this.dbConfig.database};

        -- Vérifier et ajouter les colonnes pour l'authentification
        SET @sql = (SELECT IF(
            (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = '${this.dbConfig.database}' 
             AND TABLE_NAME = 'acteurs' 
             AND COLUMN_NAME = 'password_hash') = 0,
            'ALTER TABLE acteurs ADD COLUMN password_hash VARCHAR(255) NULL',
            'SELECT "password_hash existe déjà" as message'
        ));
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;

        SET @sql = (SELECT IF(
            (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = '${this.dbConfig.database}' 
             AND TABLE_NAME = 'acteurs' 
             AND COLUMN_NAME = 'oauth_provider') = 0,
            'ALTER TABLE acteurs ADD COLUMN oauth_provider ENUM(\\'local\\', \\'google\\', \\'microsoft\\', \\'apple\\') DEFAULT \\'local\\'',
            'SELECT "oauth_provider existe déjà" as message'
        ));
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;

        SET @sql = (SELECT IF(
            (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = '${this.dbConfig.database}' 
             AND TABLE_NAME = 'acteurs' 
             AND COLUMN_NAME = 'is_active') = 0,
            'ALTER TABLE acteurs ADD COLUMN is_active BOOLEAN DEFAULT true',
            'SELECT "is_active existe déjà" as message'
        ));
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;

        SET @sql = (SELECT IF(
            (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = '${this.dbConfig.database}' 
             AND TABLE_NAME = 'acteurs' 
             AND COLUMN_NAME = 'last_login') = 0,
            'ALTER TABLE acteurs ADD COLUMN last_login TIMESTAMP NULL',
            'SELECT "last_login existe déjà" as message'
        ));
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;

        SET @sql = (SELECT IF(
            (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = '${this.dbConfig.database}' 
             AND TABLE_NAME = 'acteurs' 
             AND COLUMN_NAME = 'failed_login_attempts') = 0,
            'ALTER TABLE acteurs ADD COLUMN failed_login_attempts INT DEFAULT 0',
            'SELECT "failed_login_attempts existe déjà" as message'
        ));
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;

        SET @sql = (SELECT IF(
            (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = '${this.dbConfig.database}' 
             AND TABLE_NAME = 'acteurs' 
             AND COLUMN_NAME = 'account_locked_until') = 0,
            'ALTER TABLE acteurs ADD COLUMN account_locked_until TIMESTAMP NULL',
            'SELECT "account_locked_until existe déjà" as message'
        ));
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;

        SET @sql = (SELECT IF(
            (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = '${this.dbConfig.database}' 
             AND TABLE_NAME = 'acteurs' 
             AND COLUMN_NAME = 'password_reset_token') = 0,
            'ALTER TABLE acteurs ADD COLUMN password_reset_token VARCHAR(255) NULL',
            'SELECT "password_reset_token existe déjà" as message'
        ));
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;

        SET @sql = (SELECT IF(
            (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = '${this.dbConfig.database}' 
             AND TABLE_NAME = 'acteurs' 
             AND COLUMN_NAME = 'password_reset_expires') = 0,
            'ALTER TABLE acteurs ADD COLUMN password_reset_expires TIMESTAMP NULL',
            'SELECT "password_reset_expires existe déjà" as message'
        ));
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;

        -- Évolution de la table permissions
        SET @sql = (SELECT IF(
            (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = '${this.dbConfig.database}' 
             AND TABLE_NAME = 'permissions' 
             AND COLUMN_NAME = 'ressource') = 0,
            'ALTER TABLE permissions ADD COLUMN ressource VARCHAR(100) NULL',
            'SELECT "ressource existe déjà dans permissions" as message'
        ));
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;

        SET @sql = (SELECT IF(
            (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = '${this.dbConfig.database}' 
             AND TABLE_NAME = 'permissions' 
             AND COLUMN_NAME = 'action') = 0,
            'ALTER TABLE permissions ADD COLUMN action ENUM(\\'read\\', \\'write\\', \\'delete\\', \\'admin\\') NULL',
            'SELECT "action existe déjà dans permissions" as message'
        ));
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;

        SET @sql = (SELECT IF(
            (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = '${this.dbConfig.database}' 
             AND TABLE_NAME = 'permissions' 
             AND COLUMN_NAME = 'is_active') = 0,
            'ALTER TABLE permissions ADD COLUMN is_active BOOLEAN DEFAULT true',
            'SELECT "is_active existe déjà dans permissions" as message'
        ));
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;

        -- Mettre à jour tous les utilisateurs existants pour qu'ils aient oauth_provider = 'local'
        UPDATE acteurs SET oauth_provider = 'local' WHERE oauth_provider IS NULL;
        UPDATE acteurs SET is_active = true WHERE is_active IS NULL;
      `;

      console.log('🔄 Exécution de la migration...');
      await connection.execute(migrationSQL);
      console.log('✅ Migration terminée avec succès');

    } catch (error) {
      console.error('❌ Erreur lors de la migration:', error.message);
      throw error;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async createAdminUser() {
    let connection;
    
    try {
      console.log('🔄 Création de l\'utilisateur administrateur...');
      connection = await mysql.createConnection(this.dbConfig);

      const adminEmail = process.env.ADMIN_EMAIL || 'admin@qwanza.fr';
      const adminPassword = process.env.ADMIN_PASSWORD || 'AdminQwanza2025!';

      // Vérifier si un admin avec cet email existe déjà
      const [existingAdmins] = await connection.execute(
        'SELECT id_acteur, password_hash FROM acteurs WHERE email = ?',
        [adminEmail]
      );

      if (existingAdmins.length > 0) {
        // Mettre à jour le mot de passe si nécessaire
        if (!existingAdmins[0].password_hash) {
          const passwordHash = await bcrypt.hash(adminPassword, 12);
          await connection.execute(
            'UPDATE acteurs SET password_hash = ?, oauth_provider = "local", is_active = true WHERE email = ?',
            [passwordHash, adminEmail]
          );
          console.log('✅ Mot de passe admin mis à jour');
        } else {
          console.log('ℹ️  L\'utilisateur admin existe déjà avec un mot de passe');
        }
        return;
      }

      // Créer l'utilisateur admin
      const adminId = uuidv4();
      const passwordHash = await bcrypt.hash(adminPassword, 12);

      await connection.execute(`
        INSERT INTO acteurs (
          id_acteur, nom_prenom, email, password_hash, role, organisation,
          oauth_provider, is_active, anciennete_role, date_creation, date_modification
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        adminId,
        process.env.ADMIN_NAME || 'Administrateur Système',
        adminEmail,
        passwordHash,
        'Admin',
        process.env.ADMIN_ORG || 'Direction Informatique',
        'local',
        true,
        5
      ]);

      // Créer les permissions admin de base
      const permissions = [
        { ressource: 'users', action: 'admin' },
        { ressource: 'applications', action: 'admin' },
        { ressource: 'questionnaires', action: 'admin' },
        { ressource: 'formulaires', action: 'admin' },
        { ressource: 'analyses', action: 'admin' }
      ];

      for (const perm of permissions) {
        await connection.execute(`
          INSERT INTO permissions (id_permission, id_acteur, ressource, action, is_active, date_creation, date_modification)
          VALUES (?, ?, ?, ?, true, NOW(), NOW())
        `, [uuidv4(), adminId, perm.ressource, perm.action]);
      }

      console.log('✅ Utilisateur administrateur créé avec succès');
      console.log('📧 Email:', adminEmail);
      console.log('🔑 Mot de passe:', adminPassword);
      console.log('⚠️  IMPORTANT: Changez ce mot de passe lors de la première connexion!');

    } catch (error) {
      console.error('❌ Erreur lors de la création de l\'admin:', error.message);
      throw error;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async testConnection() {
    let connection;
    try {
      console.log('🔄 Test de connexion à la base de données...');
      connection = await mysql.createConnection(this.dbConfig);
      
      const [result] = await connection.execute('SELECT 1 as test');
      console.log('✅ Connexion à la base de données réussie');
      
      // Vérifier que la table acteurs existe
      const [tables] = await connection.execute(
        "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = 'acteurs'",
        [this.dbConfig.database]
      );
      
      if (tables[0].count === 0) {
        console.log('❌ La table acteurs n\'existe pas. Veuillez d\'abord créer le schéma de base.');
        return false;
      }
      
      console.log('✅ Table acteurs trouvée');
      return true;
      
    } catch (error) {
      console.error('❌ Erreur de connexion:', error.message);
      return false;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async verifySetup() {
    let connection;
    try {
      console.log('🔄 Vérification de la configuration...');
      connection = await mysql.createConnection(this.dbConfig);
      
      // Vérifier les colonnes ajoutées
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'acteurs' 
        AND COLUMN_NAME IN ('password_hash', 'oauth_provider', 'is_active', 'last_login')
      `, [this.dbConfig.database]);
      
      console.log('✅ Colonnes d\'authentification présentes:', columns.map(c => c.COLUMN_NAME).join(', '));
      
      // Vérifier l'utilisateur admin
      const [admins] = await connection.execute(
        'SELECT email, role FROM acteurs WHERE role = "Admin" AND password_hash IS NOT NULL'
      );
      
      if (admins.length > 0) {
        console.log('✅ Utilisateur admin configuré:', admins[0].email);
      } else {
        console.log('⚠️  Aucun utilisateur admin avec mot de passe trouvé');
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de la vérification:', error.message);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async run() {
    console.log('🚀 Setup de l\'authentification locale...\n');

    try {
      // 1. Test de connexion
      const connectionOk = await this.testConnection();
      if (!connectionOk) {
        console.log('\n💡 Assurez-vous que:');
        console.log('   - MySQL est démarré');
        console.log('   - La base de données existe');
        console.log('   - Les paramètres .env sont corrects');
        return;
      }
      console.log('');

      // 2. Migration
      await this.runMigration();
      console.log('');

      // 3. Créer l'admin
      await this.createAdminUser();
      console.log('');

      // 4. Vérification
      await this.verifySetup();
      console.log('');

      console.log('🎉 Setup terminé avec succès!');
      console.log('');
      console.log('📋 Prochaines étapes:');
      console.log('1. Vérifiez que JWT_SECRET est défini dans .env');
      console.log('2. Démarrez le serveur: npm run start:server');
      console.log('3. Testez la connexion avec les endpoints /api/auth/login');
      console.log('4. Utilisez admin@qwanza.fr avec le mot de passe affiché ci-dessus');

    } catch (error) {
      console.error('\n💥 Erreur lors du setup:', error.message);
      process.exit(1);
    }
  }
}

// Exécution du script
if (require.main === module) {
  const setup = new LocalAuthSetup();
  setup.run();
}

module.exports = LocalAuthSetup;