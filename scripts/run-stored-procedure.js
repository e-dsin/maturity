// scripts/run-stored-procedures.js
// Script pour exécuter les procédures stockées et générer les données d'analyse
const mysql = require('mysql2/promise');
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
 * Fonction principale
 */
async function runStoredProcedures() {
  console.log('===================================================');
  console.log('Exécution des procédures stockées...');
  console.log('===================================================');
  
  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    
    // 1. Création de formulaires et réponses aléatoires
    console.log('1. Création de formulaires et réponses...');
    await createFormulairesEtReponses(connection);
    
    // 2. Calcul des scores de maturité
    console.log('2. Calcul des scores de maturité pour toutes les applications...');
    await calculateMaturityScores(connection);
    
    // 3. Calcul des scores par entreprise
    console.log('3. Calcul des scores par entreprise...');
    await calculateEnterpriseScores(connection);
    
    console.log('===================================================');
    console.log('Procédures stockées exécutées avec succès!');
    console.log('===================================================');
    
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de l\'exécution des procédures stockées:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Création de formulaires et réponses aléatoires
 */
async function createFormulairesEtReponses(connection) {
  // 1. Récupérer toutes les applications
  const [applications] = await connection.query('SELECT id_application, id_entreprise FROM applications');
  
  if (applications.length === 0) {
    console.warn('⚠️ Aucune application trouvée. Impossible de créer des formulaires.');
    return;
  }
  
  // 2. Récupérer tous les acteurs
  const [acteurs] = await connection.query('SELECT id_acteur, id_entreprise FROM acteurs');
  
  if (acteurs.length === 0) {
    console.warn('⚠️ Aucun acteur trouvé. Impossible de créer des formulaires.');
    return;
  }
  
  // 3. Récupérer tous les questionnaires
  const [questionnaires] = await connection.query('SELECT id_questionnaire, thematique FROM questionnaires');
  
  if (questionnaires.length === 0) {
    console.warn('⚠️ Aucun questionnaire trouvé. Impossible de créer des formulaires.');
    return;
  }
  
  // 4. Pour chaque application, créer 1 à 3 formulaires
  for (const application of applications) {
    // Récupérer les acteurs de la même entreprise
    const entrepriseActeurs = acteurs.filter(a => a.id_entreprise === application.id_entreprise);
    
    if (entrepriseActeurs.length === 0) continue;
    
    // Nombre de formulaires à créer pour cette application (1-3)
    const formCount = Math.floor(Math.random() * 3) + 1;
    
    // Sélectionner des questionnaires aléatoires
    const selectedQuestionnaires = [];
    for (let i = 0; i < formCount && i < questionnaires.length; i++) {
      const randomIndex = Math.floor(Math.random() * questionnaires.length);
      selectedQuestionnaires.push(questionnaires[randomIndex]);
    }
    
    // Créer les formulaires
    for (const questionnaire of selectedQuestionnaires) {
      // Sélectionner un acteur aléatoire
      const acteur = entrepriseActeurs[Math.floor(Math.random() * entrepriseActeurs.length)];
      
      // Créer le formulaire
      const [formResult] = await connection.query(
        `INSERT INTO formulaires 
         (id_formulaire, id_acteur, id_application, id_questionnaire, date_creation, date_modification, statut) 
         VALUES (UUID(), ?, ?, ?, NOW(), NOW(), 'Validé')`,
        [acteur.id_acteur, application.id_application, questionnaire.id_questionnaire]
      );
      
      // Si le formulaire a été créé avec succès
      if (formResult.affectedRows > 0) {
        // Récupérer l'ID du formulaire créé
        const [formId] = await connection.query(
          'SELECT id_formulaire FROM formulaires WHERE id_acteur = ? AND id_application = ? AND id_questionnaire = ? ORDER BY date_creation DESC LIMIT 1',
          [acteur.id_acteur, application.id_application, questionnaire.id_questionnaire]
        );
        
        if (formId.length > 0) {
          // Récupérer les questions du questionnaire
          const [questions] = await connection.query(
            'SELECT id_question, texte FROM questions WHERE id_questionnaire = ?',
            [questionnaire.id_questionnaire]
          );
          
          // Créer des réponses pour chaque question
          for (const question of questions) {
            // Score aléatoire entre 1 et 5
            const score = Math.floor(Math.random() * 5) + 1;
            
            // Valeur basée sur le score
            let valeur = 'Non';
            if (score >= 4) {
              valeur = 'Oui';
            } else if (score >= 2) {
              valeur = 'Partiellement';
            }
            
            // Créer la réponse
            await connection.query(
              `INSERT INTO reponses 
               (id_reponse, id_formulaire, id_question, valeur_reponse, score, commentaire) 
               VALUES (UUID(), ?, ?, ?, ?, ?)`,
              [
                formId[0].id_formulaire,
                question.id_question,
                valeur,
                score,
                `Commentaire pour la question: ${question.texte}`
              ]
            );
          }
        }
      }
    }
  }
  
  console.log(`  ✓ Formulaires et réponses créés avec succès`);
}

/**
 * Calcul des scores de maturité pour toutes les applications
 */
async function calculateMaturityScores(connection) {
  // Récupérer toutes les applications
  const [applications] = await connection.query('SELECT id_application FROM applications');
  
  if (applications.length === 0) {
    console.warn('⚠️ Aucune application trouvée. Impossible de calculer les scores.');
    return;
  }
  
  for (const application of applications) {
    try {
      // Appel de la procédure stockée pour calculer les scores
      await connection.query('CALL calculer_scores_maturite(?)', [application.id_application]);
      console.log(`    ✓ Scores calculés pour l'application ${application.id_application}`);
    } catch (error) {
      console.warn(`    ⚠️ Erreur lors du calcul des scores pour l'application ${application.id_application}: ${error.message}`);
    }
  }
  
  console.log(`  ✓ Scores de maturité calculés pour ${applications.length} applications`);
}

/**
 * Calcul des scores par entreprise
 */
async function calculateEnterpriseScores(connection) {
  // Récupérer toutes les entreprises
  const [entreprises] = await connection.query('SELECT id_entreprise FROM entreprises');
  
  if (entreprises.length === 0) {
    console.warn('⚠️ Aucune entreprise trouvée. Impossible de calculer les scores.');
    return;
  }
  
  for (const entreprise of entreprises) {
    try {
      // Appel de la procédure stockée pour calculer les scores
      await connection.query('CALL calculer_scores_entreprise(?)', [entreprise.id_entreprise]);
      console.log(`    ✓ Scores calculés pour l'entreprise ${entreprise.id_entreprise}`);
    } catch (error) {
      console.warn(`    ⚠️ Erreur lors du calcul des scores pour l'entreprise ${entreprise.id_entreprise}: ${error.message}`);
      
      // Si la procédure n'existe pas, créer les scores manuellement
      if (error.message.includes("PROCEDURE") && error.message.includes("does not exist")) {
        console.log(`    ⚠️ Procédure calculer_scores_entreprise non trouvée. Calcul manuel des scores...`);
        await calculateManuallyEnterpriseScores(connection, entreprise.id_entreprise);
      }
    }
  }
  
  console.log(`  ✓ Scores calculés pour ${entreprises.length} entreprises`);
}

/**
 * Calcul manuel des scores par entreprise si la procédure stockée n'existe pas
 */
async function calculateManuallyEnterpriseScores(connection, entrepriseId) {
  try {
    // Calculer le score global de l'entreprise (moyenne des scores de ses applications)
    const [scoreResult] = await connection.query(`
      SELECT AVG(ma.score_global) as score_global
      FROM applications a
      JOIN maturity_analyses ma ON a.id_application = ma.id_application
      WHERE a.id_entreprise = ?
      AND ma.id_analyse IN (
          SELECT MAX(id_analyse) 
          FROM maturity_analyses 
          WHERE id_application = a.id_application
      )
    `, [entrepriseId]);
    
    if (scoreResult.length > 0 && scoreResult[0].score_global !== null) {
      // Insérer dans l'historique des scores par entreprise
      await connection.query(`
        INSERT INTO historique_scores_entreprises 
        (id_historique, id_entreprise, score_global, date_mesure) 
        VALUES (UUID(), ?, ?, CURDATE())
      `, [entrepriseId, scoreResult[0].score_global]);
      
      console.log(`    ✓ Score calculé manuellement pour l'entreprise ${entrepriseId}: ${scoreResult[0].score_global.toFixed(2)}`);
    } else {
      console.warn(`    ⚠️ Aucun score trouvé pour l'entreprise ${entrepriseId}`);
    }
  } catch (error) {
    console.error(`    ❌ Erreur lors du calcul manuel des scores pour l'entreprise ${entrepriseId}:`, error.message);
  }
}

// Exécuter la fonction principale
runStoredProcedures().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});