// scripts/setup-local-auth-fixed.js
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

class FixedAuthSetup {
  constructor() {
    this.dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'maturity_assessment'
    };
  }

  async checkColumnExists(connection, tableName, columnName) {
    try {
      const [columns] = await connection.execute(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = ? 
        AND COLUMN_NAME = ?
      `, [this.dbConfig.database, tableName, columnName]);
      
      return columns[0].count > 0;
    } catch (error) {
      console.error(`Erreur lors de la vérification de la colonne ${columnName}:`, error.message);
      return false;
    }
  }

  async getTableStructure(connection, tableName) {
    try {
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? 
        ORDER BY ORDINAL_POSITION
      `, [this.dbConfig.database, tableName]);
      
      return columns;
    } catch (error) {
      console.error(`Erreur lors de la récupération de la structure de ${tableName}:`, error.message);
      return [];
    }
  }

  async addColumnIfNotExists(connection, tableName, columnName, columnDefinition) {
    try {
      const exists = await this.checkColumnExists(connection, tableName, columnName);
      
      if (!exists) {
        const sql = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`;
        await connection.execute(sql);
        console.log(`✅ Colonne ${columnName} ajoutée à ${tableName}`);
      } else {
        console.log(`ℹ️  Colonne ${columnName} existe déjà dans ${tableName}`);
      }
    } catch (error) {
      console.error(`❌ Erreur lors de l'ajout de la colonne ${columnName}:`, error.message);
      throw error;
    }
  }

  async runMigration() {
    let connection;
    
    try {
      console.log('🔄 Connexion à la base de données...');
      connection = await mysql.createConnection(this.dbConfig);
      console.log('✅ Connexion établie');

      console.log('🔄 Mise à jour de la table acteurs...');
      
      // Ajouter les colonnes une par une pour l'authentification
      await this.addColumnIfNotExists(connection, 'acteurs', 'password_hash', 'VARCHAR(255) NULL');
      await this.addColumnIfNotExists(connection, 'acteurs', 'oauth_provider', 'ENUM(\'local\', \'google\', \'microsoft\', \'apple\') DEFAULT \'local\'');
      await this.addColumnIfNotExists(connection, 'acteurs', 'oauth_id', 'VARCHAR(255) NULL');
      await this.addColumnIfNotExists(connection, 'acteurs', 'is_active', 'BOOLEAN DEFAULT true');
      await this.addColumnIfNotExists(connection, 'acteurs', 'last_login', 'TIMESTAMP NULL');
      await this.addColumnIfNotExists(connection, 'acteurs', 'failed_login_attempts', 'INT DEFAULT 0');
      await this.addColumnIfNotExists(connection, 'acteurs', 'account_locked_until', 'TIMESTAMP NULL');
      await this.addColumnIfNotExists(connection, 'acteurs', 'password_reset_token', 'VARCHAR(255) NULL');
      await this.addColumnIfNotExists(connection, 'acteurs', 'password_reset_expires', 'TIMESTAMP NULL');

      console.log('🔄 Analyse de la table permissions...');
      
      // Analyser la structure de la table permissions
      const permissionsStructure = await this.getTableStructure(connection, 'permissions');
      console.log('📋 Structure actuelle de la table permissions:');
      permissionsStructure.forEach(col => {
        console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
      });

      // Ajouter les colonnes manquantes pour les permissions si nécessaire
      await this.addColumnIfNotExists(connection, 'permissions', 'ressource', 'VARCHAR(100) NULL');
      await this.addColumnIfNotExists(connection, 'permissions', 'action', 'ENUM(\'read\', \'write\', \'delete\', \'admin\') NULL');
      await this.addColumnIfNotExists(connection, 'permissions', 'conditions', 'JSON NULL');
      await this.addColumnIfNotExists(connection, 'permissions', 'is_active', 'BOOLEAN DEFAULT true');

      // Ajouter les colonnes date si elles n'existent pas
      const hasDateCreation = await this.checkColumnExists(connection, 'permissions', 'date_creation');
      const hasDateModification = await this.checkColumnExists(connection, 'permissions', 'date_modification');
      
      if (!hasDateCreation) {
        await this.addColumnIfNotExists(connection, 'permissions', 'date_creation', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
      }
      
      if (!hasDateModification) {
        await this.addColumnIfNotExists(connection, 'permissions', 'date_modification', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
      }

      // Créer les index si ils n'existent pas
      console.log('🔄 Création des index...');
      
      try {
        await connection.execute('CREATE INDEX idx_oauth_provider_id ON acteurs(oauth_provider, oauth_id)');
        console.log('✅ Index idx_oauth_provider_id créé');
      } catch (error) {
        if (error.message.includes('Duplicate key name')) {
          console.log('ℹ️  Index idx_oauth_provider_id existe déjà');
        } else {
          console.warn('⚠️  Impossible de créer l\'index idx_oauth_provider_id:', error.message);
        }
      }

      try {
        await connection.execute('CREATE INDEX idx_password_reset_token ON acteurs(password_reset_token)');
        console.log('✅ Index idx_password_reset_token créé');
      } catch (error) {
        if (error.message.includes('Duplicate key name')) {
          console.log('ℹ️  Index idx_password_reset_token existe déjà');
        } else {
          console.warn('⚠️  Impossible de créer l\'index idx_password_reset_token:', error.message);
        }
      }

      // Mettre à jour les données existantes
      console.log('🔄 Mise à jour des données existantes...');
      
      await connection.execute('UPDATE acteurs SET oauth_provider = \'local\' WHERE oauth_provider IS NULL');
      await connection.execute('UPDATE acteurs SET is_active = true WHERE is_active IS NULL');
      await connection.execute('UPDATE acteurs SET failed_login_attempts = 0 WHERE failed_login_attempts IS NULL');

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
            'UPDATE acteurs SET password_hash = ?, oauth_provider = ?, is_active = ? WHERE email = ?',
            [passwordHash, 'local', true, adminEmail]
          );
          console.log('✅ Mot de passe admin mis à jour');
        } else {
          console.log('ℹ️  L\'utilisateur admin existe déjà avec un mot de passe');
        }
        return existingAdmins[0].id_acteur;
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

      console.log('✅ Utilisateur administrateur créé avec succès');
      console.log('📧 Email:', adminEmail);
      console.log('🔑 Mot de passe:', adminPassword);
      console.log('⚠️  IMPORTANT: Changez ce mot de passe lors de la première connexion!');

      return adminId;

    } catch (error) {
      console.error('❌ Erreur lors de la création de l\'admin:', error.message);
      throw error;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async createBasicPermissions(adminId) {
    let connection;
    
    try {
      console.log('🔄 Création des permissions de base...');
      connection = await mysql.createConnection(this.dbConfig);

      // Vérifier si les permissions existent déjà
      const [existingPerms] = await connection.execute(
        'SELECT COUNT(*) as count FROM permissions WHERE id_acteur = ?',
        [adminId]
      );

      if (existingPerms[0].count > 0) {
        console.log('ℹ️  Les permissions admin existent déjà');
        return;
      }

      // Vérifier la structure de la table permissions pour déterminer comment insérer
      const hasRessourceCol = await this.checkColumnExists(connection, 'permissions', 'ressource');
      const hasActionCol = await this.checkColumnExists(connection, 'permissions', 'action');
      const hasDateCreation = await this.checkColumnExists(connection, 'permissions', 'date_creation');
      const hasDateModification = await this.checkColumnExists(connection, 'permissions', 'date_modification');

      if (hasRessourceCol && hasActionCol) {
        // Nouveau format avec ressource/action
        const permissions = [
          { ressource: 'users', action: 'admin' },
          { ressource: 'applications', action: 'admin' },
          { ressource: 'questionnaires', action: 'admin' },
          { ressource: 'formulaires', action: 'admin' },
          { ressource: 'analyses', action: 'admin' },
          { ressource: 'permissions', action: 'admin' },
          { ressource: 'system', action: 'admin' }
        ];

        for (const perm of permissions) {
          try {
            let insertSQL;
            let params;

            if (hasDateCreation && hasDateModification) {
              insertSQL = `
                INSERT INTO permissions (id_permission, id_acteur, ressource, action, is_active, date_creation, date_modification)
                VALUES (?, ?, ?, ?, ?, NOW(), NOW())
              `;
              params = [uuidv4(), adminId, perm.ressource, perm.action, true];
            } else {
              insertSQL = `
                INSERT INTO permissions (id_permission, id_acteur, ressource, action, is_active)
                VALUES (?, ?, ?, ?, ?)
              `;
              params = [uuidv4(), adminId, perm.ressource, perm.action, true];
            }

            await connection.execute(insertSQL, params);
            console.log(`✅ Permission ${perm.ressource}:${perm.action} créée`);
          } catch (error) {
            if (error.message.includes('Duplicate entry')) {
              console.log(`ℹ️  Permission ${perm.ressource}:${perm.action} existe déjà`);
            } else {
              console.warn(`⚠️  Erreur lors de la création de la permission ${perm.ressource}:${perm.action}:`, error.message);
            }
          }
        }
      } else {
        // Ancien format avec type_ressource/boolean
        console.log('ℹ️  Utilisation de l\'ancien format de permissions');
        
        const oldPermissions = [
          { type_ressource: 'APPLICATION', peut_administrer: true },
          { type_ressource: 'QUESTIONNAIRE', peut_administrer: true },
          { type_ressource: 'FORMULAIRE', peut_administrer: true },
          { type_ressource: 'RAPPORT', peut_administrer: true }
        ];

        for (const perm of oldPermissions) {
          try {
            await connection.execute(`
              INSERT INTO permissions (id_permission, id_acteur, type_ressource, peut_voir, peut_editer, peut_supprimer, peut_administrer)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [uuidv4(), adminId, perm.type_ressource, true, true, true, perm.peut_administrer]);
            
            console.log(`✅ Permission ${perm.type_ressource} créée`);
          } catch (error) {
            if (error.message.includes('Duplicate entry')) {
              console.log(`ℹ️  Permission ${perm.type_ressource} existe déjà`);
            } else {
              console.warn(`⚠️  Erreur lors de la création de la permission ${perm.type_ressource}:`, error.message);
            }
          }
        }
      }

      console.log('✅ Permissions de base créées');

    } catch (error) {
      console.error('❌ Erreur lors de la création des permissions:', error.message);
      // Ne pas faire échouer le setup si les permissions échouent
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
      
      // Vérifier que la table permissions existe
      const [permTables] = await connection.execute(
        "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = 'permissions'",
        [this.dbConfig.database]
      );
      
      if (permTables[0].count === 0) {
        console.log('❌ La table permissions n\'existe pas. Veuillez d\'abord créer le schéma de base.');
        return false;
      }
      
      console.log('✅ Table permissions trouvée');
      return true;
      
    } catch (error) {
      console.error('❌ Erreur de connexion:', error.message);
      console.log('🔧 Vérifiez vos paramètres dans .env:');
      console.log('   DB_HOST=' + this.dbConfig.host);
      console.log('   DB_PORT=' + this.dbConfig.port);
      console.log('   DB_USER=' + this.dbConfig.user);
      console.log('   DB_NAME=' + this.dbConfig.database);
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
        'SELECT email, role FROM acteurs WHERE role = ? AND password_hash IS NOT NULL',
        ['Admin']
      );
      
      if (admins.length > 0) {
        console.log('✅ Utilisateur admin configuré:', admins[0].email);
      } else {
        console.log('⚠️  Aucun utilisateur admin avec mot de passe trouvé');
      }

      // Vérifier les permissions
      const [permissions] = await connection.execute(
        'SELECT COUNT(*) as count FROM permissions'
      );
      
      console.log(`✅ ${permissions[0].count} permissions configurées dans la base`);
      
    } catch (error) {
      console.error('❌ Erreur lors de la vérification:', error.message);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async run() {
    console.log('🚀 Setup de l\'authentification locale (version corrigée)...\n');

    try {
      // 1. Test de connexion
      const connectionOk = await this.testConnection();
      if (!connectionOk) {
        console.log('\n💡 Assurez-vous que:');
        console.log('   - MariaDB/MySQL est démarré');
        console.log('   - La base de données existe');
        console.log('   - Les tables de base sont créées');
        console.log('   - Les paramètres .env sont corrects');
        return;
      }
      console.log('');

      // 2. Migration
      await this.runMigration();
      console.log('');

      // 3. Créer l'admin
      const adminId = await this.createAdminUser();
      console.log('');

      // 4. Créer les permissions
      if (adminId) {
        await this.createBasicPermissions(adminId);
        console.log('');
      }

      // 5. Vérification
      await this.verifySetup();
      console.log('');

      console.log('🎉 Setup terminé avec succès!');
      console.log('');
      console.log('📋 Prochaines étapes:');
      console.log('1. Vérifiez que JWT_SECRET est défini dans .env');
      console.log('2. Créez les fichiers d\'authentification (services, middlewares, routes)');
      console.log('3. Démarrez le serveur: npm run start:server');
      console.log('4. Testez la connexion avec admin@qwanza.fr');

    } catch (error) {
      console.error('\n💥 Erreur lors du setup:', error.message);
      process.exit(1);
    }
  }
}

// Exécution du script
if (require.main === module) {
  const setup = new FixedAuthSetup();
  setup.run();
}

module.exports = FixedAuthSetup;