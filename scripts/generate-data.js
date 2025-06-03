// generate-data.js
// Script pour générer des données de test en utilisant les données de base déjà insérées
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');

// Charger les variables d'environnement
dotenv.config();

// Configuration de la connexion à la base de données
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

/**
 * Fonction principale pour générer les données
 */
async function generateData() {
  console.log('===================================================');
  console.log('Génération des données de test...');
  console.log('===================================================');
  
  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    
    // Commencer une transaction
    await connection.beginTransaction();
    
    // 1. Récupération des données existantes
    console.log('1. Récupération des données existantes...');
    const existingData = await getExistingData(connection);
    
    // 2. Création des formulaires et réponses
    console.log('2. Création des formulaires et réponses...');
    await createFormulairesEtReponses(connection, existingData);
    
    // 3. Calcul des scores de maturité
    console.log('3. Calcul initial des scores de maturité...');
    await calculateInitialMaturityScores(connection, existingData);
    
    // Valider la transaction
    await connection.commit();
    
    console.log('===================================================');
    console.log('Génération des données terminée avec succès!');
    console.log('Pour calculer tous les scores de maturité, utilisez:');
    console.log('node run-stored-procedures.js');
    console.log('===================================================');
    
    process.exit(0);
  } catch (error) {
    // Annuler la transaction en cas d'erreur
    if (connection) {
      await connection.rollback();
    }
    console.error('Erreur lors de la génération des données:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Récupère les données existantes dans la base de données
 */
async function getExistingData(connection) {
  const data = {
    entreprises: [],
    acteurs: [],
    applications: [],
    questionnaires: [],
    thematiques: [],
    questions: []
  };
  
  // Récupérer les entreprises
  const [entreprises] = await connection.query('SELECT * FROM entreprises');
  data.entreprises = entreprises;
  
  // Récupérer les acteurs
  const [acteurs] = await connection.query('SELECT * FROM acteurs');
  data.acteurs = acteurs;
  
  // Récupérer les applications
  const [applications] = await connection.query('SELECT * FROM applications');
  data.applications = applications;
  
  // Récupérer les questionnaires
  const [questionnaires] = await connection.query('SELECT * FROM questionnaires');
  data.questionnaires = questionnaires;
  
  // Récupérer les thématiques
  const [thematiques] = await connection.query('SELECT * FROM thematiques');
  data.thematiques = thematiques;
  
  // Récupérer les questions
  const [questions] = await connection.query('SELECT * FROM questions');
  data.questions = questions;
  
  // Récupérer les métadonnées des questions
  const [questionMetadata] = await connection.query('SELECT * FROM question_metadata');
  data.questionMetadata = questionMetadata;
  
  // Vérifier les données récupérées
  if (data.entreprises.length === 0) console.warn('⚠️ Aucune entreprise trouvée.');
  if (data.acteurs.length === 0) console.warn('⚠️ Aucun acteur trouvé.');
  if (data.applications.length === 0) console.warn('⚠️ Aucune application trouvée.');
  if (data.questionnaires.length === 0) console.warn('⚠️ Aucun questionnaire trouvé.');
  if (data.thematiques.length === 0) console.warn('⚠️ Aucune thématique trouvée.');
  if (data.questions.length === 0) console.warn('⚠️ Aucune question trouvée.');
  
  console.log(`  ✓ Données existantes récupérées : ${data.entreprises.length} entreprises, ${data.applications.length} applications, ${data.questions.length} questions`);
  
  return data;
}

/**
 * Création des formulaires et réponses
 */
async function createFormulairesEtReponses(connection, data) {
  const { entreprises, acteurs, applications, questionnaires, questions } = data;
  
  if (entreprises.length === 0 || acteurs.length === 0 || applications.length === 0 || questionnaires.length === 0 || questions.length === 0) {
    console.warn('⚠️ Données insuffisantes pour créer des formulaires et réponses.');
    return;
  }
  
  // Charger les profils de maturité si disponibles
  let profilsMaturity = {};
  try {
    // Assigner des profils aléatoires pour cette démonstration
    const profils = ['débutant', 'intermédiaire', 'avancé'];
    for (const entreprise of entreprises) {
      profilsMaturity[entreprise.nom_entreprise] = profils[Math.floor(Math.random() * profils.length)];
    }
  } catch (error) {
    console.warn('⚠️ Impossible de charger les profils de maturité:', error.message);
    // Valeurs par défaut
    for (const entreprise of entreprises) {
      profilsMaturity[entreprise.nom_entreprise] = 'intermédiaire';
    }
  }
  
  let formulairesCreated = 0;
  let reponsesCreated = 0;
  
  // Pour chaque application
  for (const application of applications) {
    // Trouver l'entreprise correspondante
    const entreprise = entreprises.find(e => e.id_entreprise === application.id_entreprise);
    if (!entreprise) continue;
    
    // Obtenir le profil de maturité de l'entreprise
    const profilMaturite = profilsMaturity[entreprise.nom_entreprise] || 'intermédiaire';
    
    // Nombre de questionnaires à compléter (entre 1 et tous disponibles)
    const nbQuestionnaires = Math.min(questionnaires.length, Math.floor(Math.random() * questionnaires.length) + 1);
    const selectedQuestionnaires = getRandomElements(questionnaires, nbQuestionnaires);
    
    // Pour chaque questionnaire sélectionné
    for (const questionnaire of selectedQuestionnaires) {
      // Filtrer les acteurs de cette entreprise
      const entrepriseActeurs = acteurs.filter(a => a.id_entreprise === entreprise.id_entreprise);
      if (entrepriseActeurs.length === 0) continue;
      
      // Choisir un acteur aléatoire
      const acteur = entrepriseActeurs[Math.floor(Math.random() * entrepriseActeurs.length)];
      
      // Créer le formulaire
      const formulaireId = uuidv4();
      
      // Date aléatoire dans les 6 derniers mois
      const now = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const formDate = randomDate(sixMonthsAgo, now);
      
      await connection.query(
        `INSERT INTO formulaires 
         (id_formulaire, id_acteur, id_application, id_questionnaire, date_creation, date_modification, statut) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          formulaireId,
          acteur.id_acteur,
          application.id_application,
          questionnaire.id_questionnaire,
          formDate,
          formDate,
          'Validé'
        ]
      );
      
      formulairesCreated++;
      
      // Récupérer les questions du questionnaire
      const questionnaireQuestions = questions.filter(q => q.id_questionnaire === questionnaire.id_questionnaire);
      
      // Créer des réponses pour chaque question avec des scores appropriés selon le profil
      for (const question of questionnaireQuestions) {
        // Score basé sur le profil de maturité
        // débutant: 1-3, intermédiaire: 2-4, avancé: 3-5
        let score;
        if (profilMaturite === 'débutant') {
          score = Math.floor(Math.random() * 3) + 1; // 1-3
        } else if (profilMaturite === 'intermédiaire') {
          score = Math.floor(Math.random() * 3) + 2; // 2-4
        } else { // avancé
          score = Math.floor(Math.random() * 3) + 3; // 3-5
        }
        
        // Valeur de réponse basée sur le score
        let valeur;
        if (score <= 2) {
          valeur = 'Non';
        } else if (score <= 3) {
          valeur = 'Partiellement';
        } else {
          valeur = 'Oui';
        }
        
        // Récupérer les métadonnées de la question pour générer un commentaire pertinent
        const metadata = data.questionMetadata.filter(m => m.id_question === question.id_question);
        let commentaire = `Score: ${score}/5`;
        
        if (metadata.length > 0) {
          const indicateurs = {
            niveau1: metadata.find(m => m.metadata_key === 'niveau1')?.metadata_value || '',
            niveau3: metadata.find(m => m.metadata_key === 'niveau3')?.metadata_value || '',
            niveau5: metadata.find(m => m.metadata_key === 'niveau5')?.metadata_value || ''
          };
          
          // Générer un commentaire basé sur les indicateurs
          if (score <= 2 && indicateurs.niveau1) {
            commentaire += ` - ${indicateurs.niveau1}. Des améliorations sont nécessaires.`;
          } else if (score <= 4 && indicateurs.niveau3) {
            commentaire += ` - ${indicateurs.niveau3}. Progrès encourageants.`;
          } else if (indicateurs.niveau5) {
            commentaire += ` - ${indicateurs.niveau5}. Excellent niveau.`;
          }
        } else {
          // Commentaire par défaut si pas de métadonnées
          commentaire += ` - ${valeur} à la question relative à ${questionnaire.thematique}.`;
        }
        
        // Insérer la réponse
        await connection.query(
          `INSERT INTO reponses 
           (id_reponse, id_formulaire, id_question, valeur_reponse, score, commentaire) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            formulaireId,
            question.id_question,
            valeur,
            score,
            commentaire
          ]
        );
        
        reponsesCreated++;
      }
    }
  }
  
  console.log(`  ✓ ${formulairesCreated} formulaires créés avec ${reponsesCreated} réponses`);
}

/**
 * Calcul des premiers scores de maturité pour quelques applications
 */
async function calculateInitialMaturityScores(connection, data) {
  // Sélectionner quelques applications pour un calcul initial
  const applications = data.applications;
  if (applications.length === 0) {
    console.warn('⚠️ Aucune application trouvée. Impossible de calculer les scores.');
    return;
  }
  
  // Prendre 30% des applications pour un calcul initial
  const nbAppsToCalculate = Math.max(1, Math.floor(applications.length * 0.3));
  const selectedApps = getRandomElements(applications, nbAppsToCalculate);
  
  console.log(`  > Calcul initial des scores pour ${nbAppsToCalculate}/${applications.length} applications...`);
  
  let successCount = 0;
  
  for (const application of selectedApps) {
    try {
      // D'abord, vérifier si des formulaires existent pour cette application
      const [formCount] = await connection.query(
        'SELECT COUNT(*) as count FROM formulaires WHERE id_application = ?',
        [application.id_application]
      );
      
      if (formCount[0].count === 0) {
        console.warn(`    ⚠️ Aucun formulaire trouvé pour l'application ${application.id_application}. Impossible de calculer les scores.`);
        continue;
      }
      
      // Essayer d'appeler la procédure stockée
      try {
        await connection.query('CALL calculer_scores_maturite(?)', [application.id_application]);
        successCount++;
      } catch (error) {
        console.warn(`    ⚠️ Erreur lors de l'appel à la procédure: ${error.message}`);
        
        // Si la procédure n'existe pas, calculer manuellement
        if (error.message.includes("PROCEDURE") && error.message.includes("does not exist")) {
          await calculateManuallyMaturityScore(connection, application.id_application, data);
          successCount++;
        }
      }
    } catch (error) {
      console.error(`    ❌ Erreur lors du calcul pour l'application ${application.id_application}:`, error.message);
    }
  }
  
  console.log(`  ✓ Scores de maturité calculés pour ${successCount}/${nbAppsToCalculate} applications`);
}

/**
 * Calcul manuel des scores de maturité
 */
async function calculateManuallyMaturityScore(connection, applicationId, data) {
  try {
    // Générer un ID unique pour l'analyse
    const analyseId = uuidv4();
    
    // Insérer l'analyse de maturité
    await connection.query(
      'INSERT INTO maturity_analyses (id_analyse, id_application, date_analyse) VALUES (?, ?, NOW())',
      [analyseId, applicationId]
    );
    
    // Récupérer l'entreprise de l'application pour les historiques
    const [appInfo] = await connection.query(
      'SELECT id_entreprise FROM applications WHERE id_application = ?',
      [applicationId]
    );
    
    const entrepriseId = appInfo[0]?.id_entreprise;
    
    // Pour chaque thématique, calculer le score moyen
    for (const thematique of data.thematiques) {
      // Calculer le score moyen des réponses pour cette thématique et cette application
      const [scoreResults] = await connection.query(`
        SELECT AVG(r.score) as score_moyen, COUNT(r.id_reponse) as nombre_reponses
        FROM reponses r
        JOIN formulaires f ON r.id_formulaire = f.id_formulaire
        JOIN questions q ON r.id_question = q.id_question
        WHERE f.id_application = ? AND q.id_thematique = ?
      `, [applicationId, thematique.id_thematique]);
      
      if (scoreResults.length > 0 && scoreResults[0].score_moyen !== null) {
        const score = scoreResults[0].score_moyen;
        const nombreReponses = scoreResults[0].nombre_reponses;
        
        // Insérer le score thématique
        await connection.query(`
          INSERT INTO thematique_scores 
          (id_score, id_analyse, thematique, score, nombre_reponses) 
          VALUES (?, ?, ?, ?, ?)
        `, [uuidv4(), analyseId, thematique.nom, score, nombreReponses]);
        
        // Ajouter à l'historique
        if (entrepriseId) {
          await connection.query(`
            INSERT INTO historique_scores 
            (id_historique, id_application, id_entreprise, thematique, score, date_mesure) 
            VALUES (?, ?, ?, ?, ?, CURDATE())
          `, [uuidv4(), applicationId, entrepriseId, thematique.nom, score]);
        }
      }
    }
    
    // Calculer le score global
    const [scoreGlobal] = await connection.query(
      'SELECT AVG(score) as score_global FROM thematique_scores WHERE id_analyse = ?',
      [analyseId]
    );
    
    if (scoreGlobal.length > 0 && scoreGlobal[0].score_global !== null) {
      // Mettre à jour l'analyse avec le score global
      await connection.query(
        'UPDATE maturity_analyses SET score_global = ? WHERE id_analyse = ?',
        [scoreGlobal[0].score_global, analyseId]
      );
    }
    
    console.log(`    ✓ Scores calculés manuellement pour l'application ${applicationId}`);
  } catch (error) {
    console.error(`    ❌ Erreur lors du calcul manuel des scores pour l'application ${applicationId}:`, error.message);
    throw error;
  }
}

/**
 * Fonctions utilitaires
 */

// Sélectionne un nombre spécifié d'éléments aléatoires d'un tableau
function getRandomElements(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

// Génère une date aléatoire entre deux dates
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Exécuter la fonction principale
generateData().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});