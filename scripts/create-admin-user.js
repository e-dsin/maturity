// scripts/create-admin-user.js
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement
dotenv.config();

// Configurer la connexion à la base de données
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'maturity_assessment_db',
  port: process.env.DB_PORT || 3306
};

// Fonction principale pour créer un utilisateur admin
async function createAdminUser() {
  // Définir les informations de l'utilisateur admin
  const adminUser = {
    id_acteur: uuidv4(),
    nom_prenom: process.env.ADMIN_NAME || 'Administrateur Système',
    role: 'Admin',
    organisation: process.env.ADMIN_ORG || 'Direction Informatique Groupe',
    anciennete_role: 5,
    email: process.env.ADMIN_EMAIL || 'admin@qwanza.fr',
    password: process.env.ADMIN_PASSWORD || 'AdminQwanza2025!',
    date_creation: new Date().toISOString().slice(0, 19).replace('T', ' '),
    date_modification: new Date().toISOString().slice(0, 19).replace('T', ' ')
  };

  let connection;
  try {
    // Se connecter à la base de données
    console.log('Connexion à la base de données...');
    connection = await mysql.createConnection(dbConfig);
    console.log('Connexion établie.');

    // Vérifier si une table acteurs existe déjà
    const [tableExists] = await connection.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'acteurs'
    `, [dbConfig.database]);

    // Si la table n'existe pas, vérifier si un fichier schema.sql existe et l'exécuter
    if (tableExists.length === 0) {
      console.log('La table acteurs n\'existe pas. Vérification du schéma SQL...');
      const schemaPath = path.join(__dirname, '..', 'schema.sql');
      
      if (fs.existsSync(schemaPath)) {
        console.log('Fichier schema.sql trouvé. Initialisation de la base de données...');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        const statements = schema.split(';').filter(stmt => stmt.trim());
        
        for (const stmt of statements) {
          if (stmt.trim()) {
            await connection.execute(stmt);
          }
        }
        
        console.log('Schéma de base de données initialisé.');
      } else {
        throw new Error('Le fichier schema.sql n\'existe pas et la table acteurs est manquante.');
      }
    }

    // Vérifier si l'utilisateur admin existe déjà
    const [existingUsers] = await connection.execute(`
      SELECT * FROM acteurs WHERE email = ?
    `, [adminUser.email]);

    if (existingUsers.length > 0) {
      console.log(`Un utilisateur avec l'email ${adminUser.email} existe déjà.`);
      return;
    }

    // Hasher le mot de passe
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(adminUser.password, saltRounds);

    // Insérer l'utilisateur admin
    console.log('Création de l\'utilisateur administrateur...');
    await connection.execute(`
      INSERT INTO acteurs (
        id_acteur, 
        nom_prenom, 
        role, 
        organisation, 
        anciennete_role, 
        email, 
        password,
        date_creation, 
        date_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      adminUser.id_acteur,
      adminUser.nom_prenom,
      adminUser.role,
      adminUser.organisation,
      adminUser.anciennete_role,
      adminUser.email,
      hashedPassword,
      adminUser.date_creation,
      adminUser.date_modification
    ]);

    console.log('Utilisateur administrateur créé avec succès!');
    console.log('-----------------------------------');
    console.log('Détails de l\'utilisateur:');
    console.log('ID:', adminUser.id_acteur);
    console.log('Nom:', adminUser.nom_prenom);
    console.log('Email:', adminUser.email);
    console.log('Mot de passe:', adminUser.password);
    console.log('-----------------------------------');
    console.log('⚠️  N\'oubliez pas de changer ce mot de passe après la première connexion.');

    // Ajouter les permissions admin
    await addAdminPermissions(connection, adminUser.id_acteur);

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Connexion à la base de données fermée.');
    }
  }
}

// Fonction pour ajouter les permissions admin
async function addAdminPermissions(connection, adminId) {
  try {
    console.log('Attribution des permissions administrateur...');
    
    // Vérifier si la table permissions existe
    const [tableExists] = await connection.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'permissions'
    `, [dbConfig.database]);
    
    if (tableExists.length === 0) {
      console.log('La table permissions n\'existe pas. Impossible d\'attribuer des permissions.');
      return;
    }
    
    // Les types de ressources selon votre Swagger
    const resourceTypes = ['APPLICATION', 'QUESTIONNAIRE', 'FORMULAIRE', 'RAPPORT'];
    
    for (const resourceType of resourceTypes) {
      const permissionId = uuidv4();
      
      // Vérifier si une permission globale existe déjà pour ce type et cet utilisateur
      const [existingPermissions] = await connection.execute(`
        SELECT * FROM permissions 
        WHERE id_acteur = ? AND type_ressource = ? AND id_ressource IS NULL
      `, [adminId, resourceType]);
      
      if (existingPermissions.length > 0) {
        console.log(`Une permission de type ${resourceType} existe déjà pour cet utilisateur.`);
        continue;
      }
      
      // Insérer la permission admin globale (id_ressource NULL signifie toutes les ressources)
      await connection.execute(`
        INSERT INTO permissions (
          id_permission,
          id_acteur,
          type_ressource,
          id_ressource,
          peut_voir,
          peut_editer,
          peut_supprimer,
          peut_administrer
        ) VALUES (?, ?, ?, NULL, 1, 1, 1, 1)
      `, [
        permissionId,
        adminId,
        resourceType
      ]);
      
      console.log(`Permission de type ${resourceType} ajoutée.`);
    }
    
    console.log('Toutes les permissions administrateur ont été ajoutées avec succès!');
  } catch (error) {
    console.error('Erreur lors de l\'ajout des permissions:', error);
    throw error;
  }
}

// Exécuter le script
createAdminUser()
  .then(() => {
    console.log('Script terminé avec succès!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erreur non gérée:', error);
    process.exit(1);
  });