// complete-database-setup.js
// Initialisation de la base de données avec les données de dataDefinitions et dataGenerators
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');

// Charger les variables d'environnement
dotenv.config();

// Constantes pour la configuration de la base de données
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'maturity_assessment',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Chemin vers le fichier schema-fixed.sql
const SCHEMA_SQL_PATH = path.resolve(__dirname, '../src/db/schema-fixed.sql');

/**
 * Fonction principale qui exécute toutes les étapes de configuration
 */
async function setupDatabase() {
  console.log('========================================');
  console.log('   Démarrage de la configuration de la base de données');
  console.log('========================================');

  try {
    // 1. Créer la base de données et les tables de base
    await createDatabaseSchema();

    // 2. Importer les données de dataDefinitions et dataGenerators
    const data = await importDataFromTypeScript();

    // 3. Insérer les données de base
    await insertBaseData(data);

    console.log('========================================');
    console.log('   Configuration initiale terminée avec succès !');
    console.log('   Pour générer des données de test, utilisez:');
    console.log('   node generate-data.js');
    console.log('   Pour exécuter les procédures stockées, utilisez:');
    console.log('   node run-stored-procedures.js');
    console.log('========================================');
    process.exit(0);
  } catch (error) {
    console.error('ERREUR lors de la configuration:', error);
    process.exit(1);
  }
}

/**
 * Fonction pour créer la base de données et les tables initiales
 */
async function createDatabaseSchema() {
  console.log('1. Création de la base de données et des tables...');
  
  let connection;
  try {
    // Créer une connexion sans spécifier la base de données
    const tempConfig = { ...DB_CONFIG };
    delete tempConfig.database;
    
    connection = await mysql.createConnection(tempConfig);
    
    // Créer la base de données si elle n'existe pas
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${DB_CONFIG.database};`);
    
    // Utiliser la base de données
    await connection.query(`USE ${DB_CONFIG.database};`);
    
    // Lire et exécuter le fichier schema-fixed.sql
    if (fs.existsSync(SCHEMA_SQL_PATH)) {
      const schemaSql = fs.readFileSync(SCHEMA_SQL_PATH, 'utf8');
      
      // Diviser le script en commandes individuelles
      // On sépare sur le point-virgule, mais on doit gérer les délimiteurs pour les procédures
      const commands = [];
      let currentCommand = '';
      let inProcedure = false;
      let delimiter = ';';

      // Diviser le script SQL en commandes
      const lines = schemaSql.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();

        // Ignorer les commentaires
        if (trimmedLine.startsWith('--')) continue;

        // Gérer les changements de délimiteurs
        if (trimmedLine.startsWith('DELIMITER ')) {
          if (currentCommand.trim()) {
            commands.push(currentCommand);
            currentCommand = '';
          }
          delimiter = trimmedLine.split(' ')[1];
          inProcedure = delimiter !== ';';
          continue;
        }

        // Ajouter la ligne à la commande en cours
        currentCommand += line + '\n';

        // Vérifier si la commande est terminée
        if (trimmedLine.endsWith(delimiter)) {
          if (!inProcedure || (inProcedure && trimmedLine === delimiter)) {
            // Fin de commande
            commands.push(currentCommand.trim());
            currentCommand = '';
            
            // Si on sort d'une procédure, réinitialiser le délimiteur
            if (inProcedure && trimmedLine === delimiter) {
              delimiter = ';';
              inProcedure = false;
            }
          }
        }
      }

      // Ajouter la dernière commande si elle existe
      if (currentCommand.trim()) {
        commands.push(currentCommand.trim());
      }
      
      // Exécuter chaque commande
      for (const command of commands) {
        if (!command) continue;
        
        try {
          await connection.query(command);
        } catch (err) {
          // Ignorer les erreurs liées aux objets existants
          if (!err.message.includes('already exists')) {
            console.warn(`⚠️ Avertissement lors de l'exécution de la commande SQL:`, err.message);
          }
        }
      }
      
      console.log('✅ Schéma de base de données créé avec succès.');
    } else {
      console.error('❌ Fichier schema-fixed.sql introuvable!');
      throw new Error('Fichier schema-fixed.sql introuvable!');
    }
  } catch (error) {
    console.error('❌ Erreur lors de la création du schéma:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Fonction pour importer les données depuis les fichiers TypeScript
 */
async function importDataFromTypeScript() {
  console.log('2. Importation des données depuis TypeScript...');
  
  try {
    // Vérifier si les fichiers existent
    const dataDefPath = path.resolve(__dirname, './dataDefinitions.ts');
    const dataGenPath = path.resolve(__dirname, './dataGenerators.ts');
    
    if (!fs.existsSync(dataDefPath) || !fs.existsSync(dataGenPath)) {
      console.warn('⚠️ Fichiers dataDefinitions.ts ou dataGenerators.ts introuvables:');
      console.warn(`   Chemin vérifié pour dataDefinitions.ts: ${dataDefPath}`);
      console.warn(`   Chemin vérifié pour dataGenerators.ts: ${dataGenPath}`);
      console.warn('   Utilisation de données par défaut.');
      
      // Retourner des données minimales par défaut
      return {
        ENTREPRISES: [
          { nom: 'Entreprise par défaut', secteur: 'Technologie' },
          { nom: 'Autre entreprise', secteur: 'Finance' }
        ],
        TYPES_APPLICATIONS: [
          { nom: 'Application Web', statut: 'Run', type: 'Build', hebergement: 'Cloud', architecture: 'MVC' },
          { nom: 'CRM', statut: 'Run', type: 'Buy', hebergement: 'Cloud', architecture: 'Multitenant SAAS' }
        ],
        ROLES: ['Développeur', 'Architecte', 'Chef de Projet'],
        THEMATIQUES: [
          { id: 1, nom: 'Culture & Collaboration', description: 'Évaluation de la culture collaborative', questions: 5 },
          { id: 2, nom: 'Opérations & CI/CD', description: 'Évaluation des pratiques opérationnelles', questions: 5 }
        ],
        QUESTIONS: [],
        GRILLE_INTERPRETATION: []
      };
    }
    
    // Créer un fichier JavaScript temporaire qui importera les définitions TypeScript
    console.log('  > Création d un module temporaire pour importer les données...');
    
    const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'data-import-'));
    const tempFile = path.join(tmpDir, 'import-data.js');
    
    fs.writeFileSync(tempFile, `
      // Module temporaire pour importer les données TypeScript
      try {
        // Importation manuelle des données depuis les fichiers TypeScript
        // Note: Ceci suppose que ce sont des modules CommonJS ou que le transpileur TypeScript est configuré correctement
        const dataDefinitions = require('${dataDefPath.replace(/\\/g, '\\\\')}');
        
        // Exporter les données pour que le script principal puisse les utiliser
        module.exports = {
          ENTREPRISES: dataDefinitions.ENTREPRISES || [],
          TYPES_APPLICATIONS: dataDefinitions.TYPES_APPLICATIONS || [],
          ROLES: dataDefinitions.ROLES || [],
          PROFIL_MATURITE_ENTREPRISE: dataDefinitions.PROFIL_MATURITE_ENTREPRISE || {},
          THEMATIQUES: dataDefinitions.THEMATIQUES || [],
          QUESTIONS: dataDefinitions.QUESTIONS || [],
          GRILLE_INTERPRETATION: dataDefinitions.GRILLE_INTERPRETATION || [],
          CONFIG: dataDefinitions.CONFIG || {}
        };
      } catch (error) {
        console.error('Erreur lors de l\'importation des définitions:', error);
        
        // En cas d'erreur, exporter des données vides
        module.exports = {
          ENTREPRISES: [],
          TYPES_APPLICATIONS: [],
          ROLES: [],
          PROFIL_MATURITE_ENTREPRISE: {},
          THEMATIQUES: [],
          QUESTIONS: [],
          GRILLE_INTERPRETATION: [],
          CONFIG: {}
        };
      }
    `);
    
    // Essai 1: Utiliser require() directement (si ts-node est configuré globalement)
    try {
      console.log('  > Tentative d\'importation directe...');
      const data = require(tempFile);
      
      if (data.ENTREPRISES && data.ENTREPRISES.length > 0) {
        console.log('✅ Données importées avec succès par importation directe.');
        
        // Nettoyer les fichiers temporaires
        fs.unlinkSync(tempFile);
        fs.rmdirSync(tmpDir);
        
        return data;
      }
    } catch (requireError) {
      console.warn(`  ⚠️ Importation directe échouée: ${requireError.message}`);
    }
    
    // Essai 2: Utiliser ts-node en ligne de commande
    try {
      console.log('  > Tentative d\'importation via ts-node...');
      
      // Créer un fichier d'exportation qui sera exécuté par ts-node
      const exportFile = path.join(tmpDir, 'export-data.js');
      fs.writeFileSync(exportFile, `
        const fs = require('fs');
        const path = require('path');
        const dataDefinitions = require('${dataDefPath.replace(/\\/g, '\\\\')}');
        
        // Écrire les données dans un fichier JSON
        const outputFile = path.join('${tmpDir.replace(/\\/g, '\\\\')}', 'data-output.json');
        
        fs.writeFileSync(outputFile, JSON.stringify({
          ENTREPRISES: dataDefinitions.ENTREPRISES || [],
          TYPES_APPLICATIONS: dataDefinitions.TYPES_APPLICATIONS || [],
          ROLES: dataDefinitions.ROLES || [],
          PROFIL_MATURITE_ENTREPRISE: dataDefinitions.PROFIL_MATURITE_ENTREPRISE || {},
          THEMATIQUES: dataDefinitions.THEMATIQUES || [],
          QUESTIONS: dataDefinitions.QUESTIONS || [],
          GRILLE_INTERPRETATION: dataDefinitions.GRILLE_INTERPRETATION || [],
          CONFIG: dataDefinitions.CONFIG || {}
        }, null, 2));
        
        console.log('Données exportées avec succès dans: ' + outputFile);
      `);
      
      // Exécuter le fichier avec ts-node
      execSync(`npx ts-node "${exportFile}"`, { stdio: 'inherit' });
      
      // Vérifier si le fichier de sortie a été créé
      const outputFile = path.join(tmpDir, 'data-output.json');
      if (fs.existsSync(outputFile)) {
        // Lire les données exportées
        const data = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
        
        console.log('✅ Données importées avec succès via ts-node.');
        
        // Nettoyer les fichiers temporaires
        fs.unlinkSync(tempFile);
        fs.unlinkSync(exportFile);
        fs.unlinkSync(outputFile);
        fs.rmdirSync(tmpDir);
        
        return data;
      } else {
        throw new Error('Le fichier de sortie n\'a pas été créé par ts-node');
      }
    } catch (tsNodeError) {
      console.warn(`  ⚠️ Importation via ts-node échouée: ${tsNodeError.message}`);
    }
    
    // Essai 3: Utiliser des données par défaut si toutes les méthodes échouent
    console.warn('  ⚠️ Toutes les méthodes d\'importation ont échoué. Utilisation des données par défaut.');
    
    // Nettoyer les fichiers temporaires
    try {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      if (fs.existsSync(path.join(tmpDir, 'export-data.js'))) fs.unlinkSync(path.join(tmpDir, 'export-data.js'));
      if (fs.existsSync(path.join(tmpDir, 'data-output.json'))) fs.unlinkSync(path.join(tmpDir, 'data-output.json'));
      fs.rmdirSync(tmpDir);
    } catch (cleanupError) {
      console.warn(`  ⚠️ Erreur lors du nettoyage des fichiers temporaires: ${cleanupError.message}`);
    }
    
    // Retourner des données minimales par défaut
    return {
      ENTREPRISES: [
        { nom: 'Entreprise par défaut', secteur: 'Technologie' },
        { nom: 'Autre entreprise', secteur: 'Finance' }
      ],
      TYPES_APPLICATIONS: [
        { nom: 'Application Web', statut: 'Run', type: 'Build', hebergement: 'Cloud', architecture: 'MVC' },
        { nom: 'CRM', statut: 'Run', type: 'Buy', hebergement: 'Cloud', architecture: 'Multitenant SAAS' }
      ],
      ROLES: ['Développeur', 'Architecte', 'Chef de Projet'],
      THEMATIQUES: [
        { id: 1, nom: 'Culture & Collaboration', description: 'Évaluation de la culture collaborative', questions: 5 },
        { id: 2, nom: 'Opérations & CI/CD', description: 'Évaluation des pratiques opérationnelles', questions: 5 }
      ],
      QUESTIONS: [],
      GRILLE_INTERPRETATION: []
    };
  } catch (error) {
    console.error('❌ Erreur lors de l\'importation des données:', error.message);
    throw error;
  }
}
/**
 * Fonction pour insérer les données de base
 */
async function insertBaseData(data) {
  console.log('3. Insertion des données de base...');
  
  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    
    // Commencer une transaction
    await connection.beginTransaction();
    
    // 1. Insertion des fonctions
    console.log('  > Insertion des fonctions...');
    const functionIds = await insertFonctions(connection, data.FONCTIONS || []);
    
    // 2. Insertion des entreprises
    console.log('  > Insertion des entreprises...');
    const entreprises = await insertEntreprises(connection, data.ENTREPRISES || []);
    
    // 3. Insertion des acteurs pour chaque entreprise
    console.log('  > Insertion des acteurs...');
    const allActeurs = [];
    for (const entreprise of entreprises) {
      const acteurs = await insertActeurs(
        connection, 
        entreprise.id, 
        entreprise.nom, 
        3, // 3 acteurs par entreprise
        data.ROLES || []
      );
      allActeurs.push(...acteurs);
    }
    
    // 4. Insertion des applications pour chaque entreprise
    console.log('  > Insertion des applications...');
    const allApplications = [];
    for (const entreprise of entreprises) {
      const applications = await insertApplications(
        connection,
        entreprise.id,
        data.CONFIG ? data.CONFIG.NUM_APPLICATIONS_PAR_ORG || 3 : 3,
        data.TYPES_APPLICATIONS || []
      );
      allApplications.push(...applications);
    }
    
    // 5. Insertion des thématiques
    console.log('  > Insertion des thématiques...');
    const thematiques = await insertThematiques(connection, data.THEMATIQUES || []);
    
    // 6. Insertion des questionnaires et questions
    console.log('  > Insertion des questionnaires et questions...');
    await insertQuestionnaires(connection, thematiques, data.QUESTIONS || []);
    
    // 7. Insertion des données d'interprétation
    console.log('  > Insertion des données d\'interprétation...');
    await insertGrilleInterpretation(connection, data.GRILLE_INTERPRETATION || []);
    
    // Valider la transaction
    await connection.commit();
    
    console.log('✅ Données de base insérées avec succès.');
  } catch (error) {
    // Annuler la transaction en cas d'erreur
    if (connection) {
      await connection.rollback();
    }
    console.error('❌ Erreur lors de l\'insertion des données de base:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Insertion des entreprises
 */
async function insertEntreprises(connection, entreprises) {
  if (!Array.isArray(entreprises) || entreprises.length === 0) {
    console.warn('⚠️ Aucune entreprise à insérer.');
    return [];
  }
  
  const result = [];
  
  for (const entreprise of entreprises) {
    const id = uuidv4();
    
    await connection.query(
      'INSERT INTO entreprises (id_entreprise, nom_entreprise, secteur) VALUES (?, ?, ?)',
      [id, entreprise.nom, entreprise.secteur]
    );
    
    result.push({
      id,
      nom: entreprise.nom,
      secteur: entreprise.secteur
    });
  }
  
  console.log(`  ✓ ${result.length} entreprises insérées`);
  return result;
}

/**
 * Insertion des acteurs pour une entreprise
 */
async function insertActeurs(connection, entrepriseId, entrepriseNom, count, roles) {
  if (!Array.isArray(roles) || roles.length === 0) {
    console.warn('⚠️ Aucun rôle disponible pour créer des acteurs.');
    return [];
  }
  
  const acteurs = [];
  
  for (let i = 0; i < count; i++) {
    const id = uuidv4();
    const nom = generateName();
    const role = randomElement(roles);
    const anciennete = randomInt(1, 15);
    const email = generateEmail(nom, i, entrepriseNom);
    
    await connection.query(
      'INSERT INTO acteurs (id_acteur, nom_prenom, role, organisation, id_entreprise, anciennete_role, email) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, nom, role, entrepriseNom, entrepriseId, anciennete, email]
    );
    
    acteurs.push({
      id,
      nom,
      role,
      organisation: entrepriseNom,
      entrepriseId,
      anciennete,
      email
    });
  }
  
  return acteurs;
}

/**
 * Insertion des applications pour une entreprise
 */
async function insertApplications(connection, entrepriseId, count, typesApplications) {
  if (!Array.isArray(typesApplications) || typesApplications.length === 0) {
    console.warn('⚠️ Aucun type d\'application disponible.');
    return [];
  }
  
  const applications = [];
  
  // Sélectionner count types d'applications aléatoires
  const selectedTypes = randomUniqueElements(typesApplications, count);
  
  for (const appType of selectedTypes) {
    const id = uuidv4();
    
    // Date de mise en production aléatoire pour les applications en Run
    let dateMiseEnProd = null;
    if (appType.statut === 'Run') {
      const dateDebut = new Date('2020-01-01');
      const dateFin = new Date('2023-12-31');
      dateMiseEnProd = randomDate(dateDebut, dateFin).toISOString().split('T')[0];
    }
    
    await connection.query(
      `INSERT INTO applications 
       (id_application, nom_application, statut, type, hebergement, architecture_logicielle, 
        id_entreprise, date_mise_en_prod, language, editeur, description) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, 
        appType.nom, 
        appType.statut, 
        appType.type, 
        appType.hebergement, 
        appType.architecture, 
        entrepriseId,
        dateMiseEnProd,
        appType.language || null,
        appType.editeur || null,
        `Application ${appType.nom} de l'entreprise`
      ]
    );
    
    applications.push({
      id,
      nom: appType.nom,
      statut: appType.statut,
      type: appType.type,
      hebergement: appType.hebergement,
      architecture: appType.architecture,
      entrepriseId,
      dateMiseEnProd
    });
  }
  
  return applications;
}

/**
 * Insertion des fonctions
 */

async function insertFonctions(connection, fonctions) {
  // [...]
  // Récupérer les fonctions existantes
  const [existingFunctions] = await connection.query('SELECT id_fonction, nom FROM fonctions');
  const existingFunctionNames = existingFunctions.map(f => f.nom);
  
  // Map pour stocker l'ID de chaque fonction
  const functionIds = {};
  let insertedCount = 0;
  let updatedCount = 0;
  
  for (const fonction of fonctions) {
    // Vérification si la fonction existe déjà et traitement approprié
    // [...]
  }
  
  return functionIds;  // Retourne un map nom -> id
}

/**
 * Insertion des thématiques
 */
async function insertThematiques(connection, thematiquesData) {
  if (!Array.isArray(thematiquesData) || thematiquesData.length === 0) {
    console.warn('⚠️ Aucune thématique à insérer.');
    return [];
  }
  
  // Regrouper les thématiques par fonction
  const themesByFunction = {};
  
  for (const theme of thematiquesData) {
    // Déterminer la fonction à laquelle appartient cette thématique
    // Si la thématique n'a pas de fonction spécifiée explicitement, utilisons 'DevSecOps' par défaut
    const functionName = theme.fonction || 'DevSecOps';
    
    if (!themesByFunction[functionName]) {
      themesByFunction[functionName] = [];
    }
    
    themesByFunction[functionName].push(theme);
  }
  
  // Récupérer toutes les fonctions existantes
  const [existingFunctions] = await connection.query('SELECT id_fonction, nom FROM fonctions');
  const existingFunctionNames = existingFunctions.map(f => f.nom);
  
  // Map pour stocker l'ID de chaque fonction
  const functionIds = {};
  
  // Insérer ou récupérer les fonctions
  for (const functionName in themesByFunction) {
    if (existingFunctionNames.includes(functionName)) {
      // Utiliser la fonction existante
      const existingFunction = existingFunctions.find(f => f.nom === functionName);
      functionIds[functionName] = existingFunction.id_fonction;
      console.log(`  > Fonction '${functionName}' trouvée, utilisation de l'ID existant: ${functionIds[functionName]}`);
    } else {
      // Créer une nouvelle fonction
      const id = uuidv4();
      await connection.query(
        'INSERT INTO fonctions (id_fonction, nom, description) VALUES (?, ?, ?)',
        [id, functionName, `Évaluation de la maturité des pratiques ${functionName}`]
      );
      functionIds[functionName] = id;
      console.log(`  > Fonction '${functionName}' créée avec l'ID: ${id}`);
    }
  }
  
  // Maintenant, insérer les thématiques pour chaque fonction
  const thematiques = [];
  let insertedCount = 0;
  let skippedCount = 0;
  
  for (const functionName in themesByFunction) {
    const fonctionId = functionIds[functionName];
    
    // Vérifier les thématiques existantes pour cette fonction
    const [existingThematiques] = await connection.query('SELECT id_thematique, nom FROM thematiques WHERE id_fonction = ?', [fonctionId]);
    const existingThematiqueNames = existingThematiques.map(t => t.nom);
    
    // Insérer les thématiques pour cette fonction
    for (const thematique of themesByFunction[functionName]) {
      // Vérifier si la thématique existe déjà
      if (existingThematiqueNames.includes(thematique.nom)) {
        // Retrouver l'ID existant
        const existingThematique = existingThematiques.find(t => t.nom === thematique.nom);
        thematiques.push({
          id: existingThematique.id_thematique,
          nom: thematique.nom,
          description: thematique.description,
          fonctionId,
          questions: thematique.questions
        });
        skippedCount++;
        continue;
      }
      
      // Insérer la nouvelle thématique
      const id = uuidv4();
      
      try {
        await connection.query(
          'INSERT INTO thematiques (id_thematique, nom, description, id_fonction) VALUES (?, ?, ?, ?)',
          [id, thematique.nom, thematique.description, fonctionId]
        );
        
        thematiques.push({
          id,
          nom: thematique.nom,
          description: thematique.description,
          fonctionId,
          questions: thematique.questions
        });
        
        insertedCount++;
      } catch (error) {
        console.warn(`  ⚠️ Erreur lors de l'insertion de la thématique '${thematique.nom}': ${error.message}`);
        skippedCount++;
      }
    }
  }
  
  console.log(`  ✓ ${insertedCount} thématiques insérées, ${skippedCount} thématiques ignorées (déjà existantes) pour ${Object.keys(themesByFunction).length} fonctions`);
  return thematiques;
}

/**
 * Insertion des questionnaires et questions
 */
async function insertQuestionnaires(connection, thematiques, questionsData) {
  if (!Array.isArray(thematiques) || thematiques.length === 0 || !Array.isArray(questionsData) || questionsData.length === 0) {
    console.warn('⚠️ Données insuffisantes pour créer des questionnaires et questions.');
    return [];
  }
  
  const questionnaires = [];
  
  for (const thematique of thematiques) {
    const id = uuidv4();
    
    // Créer un questionnaire par thématique
    await connection.query(
      'INSERT INTO questionnaires (id_questionnaire, fonction, thematique, description) VALUES (?, ?, ?, ?)',
      [id, 'DevSecOps', thematique.nom, `Questionnaire sur ${thematique.nom}`]
    );
    
    // Filtrer les questions pour cette thématique
    const thematicQuestions = questionsData.filter(q => q.thematique === thematique.nom);
    
    // Insérer les questions
    for (const question of thematicQuestions) {
      const questionId = uuidv4();
      
      await connection.query(
        'INSERT INTO questions (id_question, id_questionnaire, id_thematique, texte, ponderation, ordre) VALUES (?, ?, ?, ?, ?, ?)',
        [questionId, id, thematique.id, question.texte, question.ponderation, question.id]
      );
      
      // Insérer les métadonnées de la question (indicateurs)
      if (question.indicateurs) {
        for (const [key, value] of Object.entries(question.indicateurs)) {
          await connection.query(
            'INSERT INTO question_metadata (id_question, metadata_key, metadata_value) VALUES (?, ?, ?)',
            [questionId, key, value]
          );
        }
      }
    }
    
    questionnaires.push({
      id,
      thematique: thematique.nom,
      thematique_id: thematique.id,
      questions: thematicQuestions.length
    });
  }
  
  console.log(`  ✓ ${questionnaires.length} questionnaires créés avec ${questionsData.length} questions`);
  return questionnaires;
}

/**
 * Insertion des données dans la grille d'interprétation
 */
async function insertGrilleInterpretation(connection, grilleInterpretation) {
  if (!Array.isArray(grilleInterpretation) || grilleInterpretation.length === 0) {
    console.warn('⚠️ Aucune donnée d\'interprétation à insérer.');
    return;
  }
  
  for (const interpretation of grilleInterpretation) {
    try {
      await connection.query(
        `INSERT INTO grille_interpretation 
         (id_grille, fonction, score_min, score_max, niveau, description, recommandations) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          interpretation.fonction,
          interpretation.score_min,
          interpretation.score_max,
          interpretation.niveau,
          interpretation.description,
          interpretation.recommandations
        ]
      );
    } catch (error) {
      console.warn(`  ⚠️ Erreur lors de l'insertion de l'interprétation pour ${interpretation.niveau}: ${error.message}`);
    }
  }
  
  console.log(`  ✓ ${grilleInterpretation.length} interprétations insérées`);
}

/**
 * Génère un nombre entier aléatoire entre min et max inclus
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * Génère une date aléatoire entre deux dates
 */
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Sélectionne un élément aléatoire dans un tableau
 */
function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Sélectionne plusieurs éléments aléatoires uniques dans un tableau
 */
function randomUniqueElements(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

/**
 * Génère un nom et prénom aléatoire
 */
function generateName() {
  const firstNames = ['Jean', 'Marie', 'Pierre', 'Sophie', 'Thomas', 'Julie', 'Nicolas', 'Isabelle', 'David', 'Céline',
    'François', 'Claire', 'Laurent', 'Catherine', 'Philippe', 'Nathalie', 'Michel', 'Anne', 'Éric', 'Christine'];
  
  const lastNames = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau',
    'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier'];
  
  return `${randomElement(firstNames)} ${randomElement(lastNames)}`;
}

/**
 * Génère un email formaté à partir d'un nom et d'un identifiant
 */
function generateEmail(nom, id, entreprise) {
  const sanitizedNom = nom.toLowerCase().replace(/ /g, '.');
  const sanitizedEntreprise = entreprise.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${sanitizedNom}.${id}@${sanitizedEntreprise}.fr`;
}

// Exécuter la fonction principale
setupDatabase().catch(error => {
  console.error('ERREUR FATALE:', error);
  process.exit(1);
});