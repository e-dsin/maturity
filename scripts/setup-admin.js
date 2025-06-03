// scripts/setup-admin.js
const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupAdmin() {
  let connection;
  
  try {
    console.log('🔄 Connexion à la base de données...');
    
    // Connexion à la base de données (sans multipleStatements)
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'maturity_assessment'
    });

    console.log('✅ Connexion réussie !');

    // === 1. CRÉER LES TABLES SI ELLES N'EXISTENT PAS ===
    console.log('🔧 Vérification et création des tables...');

    // Table roles
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS roles (
        id_role VARCHAR(36) PRIMARY KEY,
        nom_role VARCHAR(50) NOT NULL,
        description TEXT,
        niveau_acces ENUM('ENTREPRISE', 'GLOBAL') DEFAULT 'ENTREPRISE',
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Table entreprises
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS entreprises (
        id_entreprise VARCHAR(36) PRIMARY KEY,
        nom_entreprise VARCHAR(100) NOT NULL,
        secteur VARCHAR(50) NOT NULL,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Table acteurs
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS acteurs (
        id_acteur VARCHAR(36) PRIMARY KEY,
        nom_prenom VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        organisation VARCHAR(50),
        id_entreprise VARCHAR(36),
        id_role VARCHAR(36),
        anciennete_role INT DEFAULT 0,
        mot_de_passe VARCHAR(255),
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (id_entreprise) REFERENCES entreprises(id_entreprise),
        FOREIGN KEY (id_role) REFERENCES roles(id_role)
      )
    `);

    // Table modules
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS modules (
        id_module VARCHAR(36) PRIMARY KEY,
        nom_module VARCHAR(50) NOT NULL,
        description TEXT,
        route_base VARCHAR(100),
        actif BOOLEAN DEFAULT TRUE,
        ordre_affichage INT DEFAULT 0,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Table role_permissions
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id_role_permission VARCHAR(36) PRIMARY KEY,
        id_role VARCHAR(36) NOT NULL,
        id_module VARCHAR(36) NOT NULL,
        peut_voir BOOLEAN DEFAULT FALSE,
        peut_editer BOOLEAN DEFAULT FALSE,
        peut_supprimer BOOLEAN DEFAULT FALSE,
        peut_administrer BOOLEAN DEFAULT FALSE,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (id_role) REFERENCES roles(id_role),
        FOREIGN KEY (id_module) REFERENCES modules(id_module)
      )
    `);

    console.log('✅ Tables vérifiées/créées');

    // === 2. INSÉRER LES RÔLES ===
    console.log('👥 Création des rôles...');
    
    const roles = [
      ['role-administrateur', 'ADMINISTRATEUR', 'Administrateur avec tous les droits sur la plateforme', 'GLOBAL'],
      ['role-consultant', 'CONSULTANT', 'Consultant avec accès global à toutes les entreprises', 'GLOBAL'],
      ['role-manager', 'MANAGER', 'Manager avec accès à son entreprise', 'ENTREPRISE'],
      ['role-intervenant', 'INTERVENANT', 'Intervenant avec accès limité', 'ENTREPRISE']
    ];

    for (const [id_role, nom_role, description, niveau_acces] of roles) {
      await connection.execute(`
        INSERT IGNORE INTO roles (id_role, nom_role, description, niveau_acces, date_creation, date_modification) 
        VALUES (?, ?, ?, ?, NOW(), NOW())
      `, [id_role, nom_role, description, niveau_acces]);
    }

    console.log('✅ Rôles créés');

    // === 3. CRÉER L'ENTREPRISE QWANZA ===
    console.log('🏢 Création de l\'entreprise Qwanza...');
    
    await connection.execute(`
      INSERT IGNORE INTO entreprises (id_entreprise, nom_entreprise, secteur, date_creation, date_modification) 
      VALUES (?, ?, ?, NOW(), NOW())
    `, ['entreprise-qwanza', 'Qwanza', 'Conseil IT']);

    console.log('✅ Entreprise créée');

    // === 4. CRÉER L'UTILISATEUR ADMIN ===
    console.log('👤 Création de l\'utilisateur administrateur...');
    
    // Vérifier si l'utilisateur existe déjà
    const [existingUsers] = await connection.execute(
      'SELECT id_acteur FROM acteurs WHERE email = ?',
      ['admin@qwanza.fr']
    );

    if (existingUsers.length > 0) {
      // Mettre à jour l'utilisateur existant
      await connection.execute(`
        UPDATE acteurs 
        SET nom_prenom = ?, organisation = ?, id_role = ?, id_entreprise = ?, date_modification = NOW()
        WHERE email = ?
      `, [
        'Administrateur Qwanza',
        'Direction Informatique', 
        'role-administrateur',
        'entreprise-qwanza',
        'admin@qwanza.fr'
      ]);
      console.log('✅ Utilisateur admin mis à jour');
    } else {
      // Créer le nouvel utilisateur
      await connection.execute(`
        INSERT INTO acteurs (
          id_acteur, nom_prenom, email, organisation, id_entreprise, 
          id_role, anciennete_role, mot_de_passe, date_creation, date_modification
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        'admin-qwanza-001',
        'Administrateur Qwanza',
        'admin@qwanza.fr',
        'Direction Informatique',
        'entreprise-qwanza',
        'role-administrateur',
        5,
        null
      ]);
      console.log('✅ Utilisateur admin créé');
    }

    // === 5. CRÉER LES MODULES ===
    console.log('📦 Création des modules...');
    
    const modules = [
      ['module-dashboard', 'DASHBOARD', 'Tableau de bord principal', '/dashboard', true, 1],
      ['module-questionnaires', 'QUESTIONNAIRES', 'Gestion des questionnaires', '/questionnaires', true, 2],
      ['module-formulaires', 'FORMULAIRES', 'Gestion des formulaires', '/formulaires', true, 3],
      ['module-analyses', 'ANALYSES', 'Analyses et rapports', '/analyses-fonctions', true, 4],
      ['module-applications', 'APPLICATIONS', 'Gestion des applications', '/applications', true, 5],
      ['module-users', 'USERS', 'Gestion des utilisateurs', '/users', true, 6],
      ['module-admin', 'ADMIN', 'Administration système', '/admin', true, 7]
    ];

    for (const [id_module, nom_module, description, route_base, actif, ordre] of modules) {
      await connection.execute(`
        INSERT IGNORE INTO modules 
        (id_module, nom_module, description, route_base, actif, ordre_affichage, date_creation, date_modification) 
        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [id_module, nom_module, description, route_base, actif, ordre]);
    }

    console.log('✅ Modules créés');

    // === 6. CRÉER LES PERMISSIONS ADMINISTRATEUR ===
    console.log('🔐 Création des permissions administrateur...');
    
    // Récupérer tous les modules actifs
    const [modulesList] = await connection.execute(
      'SELECT id_module, nom_module FROM modules WHERE actif = TRUE'
    );

    // Créer les permissions pour l'administrateur
    for (const module of modulesList) {
      const permissionId = `perm-admin-${module.nom_module}`;
      
      await connection.execute(`
        INSERT IGNORE INTO role_permissions 
        (id_role_permission, id_role, id_module, peut_voir, peut_editer, peut_supprimer, peut_administrer, date_creation, date_modification)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        permissionId,
        'role-administrateur', 
        module.id_module,
        true, true, true, true
      ]);
    }

    console.log('✅ Permissions administrateur créées');

    // === 7. VÉRIFICATION FINALE ===
    console.log('🔍 Vérification finale...');
    
    const [adminUser] = await connection.execute(`
      SELECT a.*, r.nom_role, r.niveau_acces, e.nom_entreprise 
      FROM acteurs a 
      JOIN roles r ON a.id_role = r.id_role 
      LEFT JOIN entreprises e ON a.id_entreprise = e.id_entreprise 
      WHERE a.email = ?
    `, ['admin@qwanza.fr']);

    if (adminUser.length > 0) {
      const user = adminUser[0];
      console.log('\n🎉 === CONFIGURATION TERMINÉE AVEC SUCCÈS ===');
      console.log('✅ Utilisateur administrateur créé :');
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   👤 Nom: ${user.nom_prenom}`);
      console.log(`   🏢 Organisation: ${user.organisation}`);
      console.log(`   🎭 Rôle: ${user.nom_role}`);
      console.log(`   🔑 Niveau d'accès: ${user.niveau_acces}`);
      console.log(`   🏢 Entreprise: ${user.nom_entreprise}`);
      
      // Vérifier les permissions
      const [permissions] = await connection.execute(`
        SELECT COUNT(*) as count FROM role_permissions WHERE id_role = ?
      `, ['role-administrateur']);
      
      console.log(`   🔐 Permissions: ${permissions[0].count} modules autorisés`);
      
      console.log('\n🚀 PRÊT À UTILISER :');
      console.log('   🔗 Connectez-vous avec :');
      console.log('   📧 Email: admin@qwanza.fr');
      console.log('   🔒 Mot de passe: password');
      console.log('   🎯 Rôle: Administrateur (accès total)');
      console.log('==========================================\n');
    } else {
      console.log('❌ Erreur : L\'utilisateur admin n\'a pas été trouvé après création');
    }

  } catch (error) {
    console.error('❌ Erreur lors du setup:', error.message);
    console.error('📋 Code d\'erreur:', error.code);
    console.error('📋 SQL State:', error.sqlState);
    
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('\n💡 Suggestion: Vérifiez que la base de données existe et que les tables sont créées');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Suggestion: Vérifiez vos identifiants de base de données dans le fichier .env');
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connexion fermée');
    }
  }
}

// Fonction utilitaire pour afficher la configuration
async function showConfig() {
  console.log('\n📋 Configuration actuelle :');
  console.log(`   🏠 Host: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`   👤 User: ${process.env.DB_USER || 'root'}`);
  console.log(`   🎯 Database: ${process.env.DB_NAME || 'maturity_assessment'}`);
  console.log(`   🔒 Password: ${process.env.DB_PASSWORD ? '***' : '(vide)'}`);
}

// Afficher la config et exécuter le script
console.log('🚀 === SETUP ADMINISTRATEUR POUR MARIADB 11.7 ===');
showConfig();
setupAdmin();