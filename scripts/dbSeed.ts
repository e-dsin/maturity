// src/scripts/dbSeed.ts
import { Pool, PoolConnection } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { 
  CONFIG, 
  ENTREPRISES, 
  TYPES_APPLICATIONS, 
  THEMATIQUES, 
  QUESTIONS,
  GRILLE_INTERPRETATION,
  PROFIL_MATURITE_ENTREPRISE
} from './dataDefinitions';
import {
  randomElement,
  randomUniqueElements,
  randomDate,
  randomInt,
  generateName,
  generateNoteBasedOnProfile,
  generateCommentaireForNote,
  generateActeursForEntreprise,
  generateEmail,
  generateDescription,
  generateRecommandation,
  getNiveauMaturite
} from './dataGenerators';

/**
 * Fonction principale pour remplir la base de données
 */
export async function seedDatabase(connection: PoolConnection): Promise<void> {
  console.log('Démarrage du chargement des données...');
  
  try {
    // 1. Insertion des entreprises
    console.log('Insertion des entreprises...');
    const entreprisesIds: { [nom: string]: string } = {};
    
    for (const entreprise of ENTREPRISES) {
      const entrepriseId = uuidv4();
      
      await connection.query(
        'INSERT INTO entreprises (id_entreprise, nom_entreprise, secteur) VALUES (?, ?, ?)',
        [entrepriseId, entreprise.nom, entreprise.secteur]
      );
      
      entreprisesIds[entreprise.nom] = entrepriseId;
      console.log(`  Entreprise ajoutée: ${entreprise.nom}`);
    }
    
    // 2. Insérer la grille d'interprétation
    console.log('Insertion de la grille d\'interprétation...');
    for (const grille of GRILLE_INTERPRETATION) {
      const grilleId = uuidv4();
      
      await connection.query(
        `INSERT INTO grille_interpretation 
         (id_grille, fonction, score_min, score_max, niveau, description, recommandations) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          grilleId,
          grille.fonction,
          grille.score_min,
          grille.score_max,
          grille.niveau,
          grille.description,
          grille.recommandations
        ]
      );
    }
    
    // 3. Insertion des thématiques et fonction DevSecOps
    console.log('Insertion des liens entre thématiques et fonctions...');
    for (const thematique of THEMATIQUES) {
      const themesFonctionsId = uuidv4();
      
      await connection.query(
        'INSERT INTO themes_fonctions (id_theme_fonction, thematique, fonction) VALUES (?, ?, ?)',
        [themesFonctionsId, thematique.nom, 'DevSecOps']
      );
    }
    
    // 4. Insertion des acteurs (15-30 par entreprise)
    console.log('Insertion des acteurs...');
    const acteursParEntreprise: { [entrepriseNom: string]: string[] } = {};
    
    for (const entreprise of ENTREPRISES) {
      const entrepriseId = entreprisesIds[entreprise.nom];
      const acteurCount = randomInt(15, 30); // Nombre raisonnable d'acteurs par entreprise
      const acteurs = generateActeursForEntreprise(entrepriseId, entreprise.nom, acteurCount);
      
      acteursParEntreprise[entreprise.nom] = [];
      
      for (const acteur of acteurs) {
        await connection.query(
          `INSERT INTO acteurs 
           (id_acteur, nom_prenom, role, organisation, id_entreprise, anciennete_role, email) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            acteur.id,
            acteur.nom,
            acteur.role,
            acteur.organisation,
            acteur.entrepriseId,
            acteur.anciennete,
            acteur.email
          ]
        );
        
        acteursParEntreprise[entreprise.nom].push(acteur.id);
      }
      
      console.log(`  ${acteurCount} acteurs ajoutés pour ${entreprise.nom}`);
    }
    
    // 5. Insertion des applications (3 par entreprise)
    console.log('Insertion des applications...');
    const applicationsIds: { [entrepriseNom: string]: string[] } = {};
    
    for (const entreprise of ENTREPRISES) {
      const entrepriseId = entreprisesIds[entreprise.nom];
      applicationsIds[entreprise.nom] = [];
      
      // Sélectionner aléatoirement 3 types d'applications pour cette entreprise
      const selectedApps = randomUniqueElements(TYPES_APPLICATIONS, CONFIG.NUM_APPLICATIONS_PAR_ORG);
      
      for (const appInfo of selectedApps) {
        const applicationId = uuidv4();
        const dateMiseEnProd = randomDate(new Date('2020-01-01'), new Date('2024-10-31'));
        
        await connection.query(
          `INSERT INTO applications 
           (id_application, nom_application, statut, type, hebergement, architecture_logicielle, 
            id_entreprise, date_mise_en_prod, editeur, language, description) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            applicationId, 
            `${appInfo.nom} - ${entreprise.nom}`, 
            appInfo.statut, 
            appInfo.type, 
            appInfo.hebergement, 
            appInfo.architecture,
            entrepriseId,
            dateMiseEnProd.toISOString().split('T')[0],
            appInfo.editeur || null,
            appInfo.language || null,
            `Application ${appInfo.nom} pour ${entreprise.nom} dans le secteur ${entreprise.secteur}`
          ]
        );
        
        applicationsIds[entreprise.nom].push(applicationId);
        console.log(`  Application ajoutée: ${appInfo.nom} - ${entreprise.nom}`);
      }
    }
    
    // 6. Insertion du questionnaire DevSecOps
    console.log('Insertion du questionnaire DevSecOps...');
    const questionnaireId = uuidv4();
    
    await connection.query(
      'INSERT INTO questionnaires (id_questionnaire, fonction, thematique, description) VALUES (?, ?, ?, ?)',
      [
        questionnaireId, 
        'DevSecOps', 
        'Évaluation Maturité', 
        'Questionnaire complet d\'évaluation de la maturité DevSecOps'
      ]
    );
    
    // 7. Insertion des questions
    console.log('Insertion des questions...');
    const questionsMap: { [id: number]: string } = {};
    
    for (const question of QUESTIONS) {
      const questionId = uuidv4();
      
      await connection.query(
        'INSERT INTO questions (id_question, id_questionnaire, texte, ponderation, ordre) VALUES (?, ?, ?, ?, ?)',
        [questionId, questionnaireId, question.texte, question.ponderation, question.id]
      );
      
      // Stocker les métadonnées des indicateurs
      await connection.query(
        'INSERT INTO question_metadata (id_question, metadata_key, metadata_value) VALUES (?, ?, ?)',
        [questionId, 'indicateur_niveau1', question.indicateurs.niveau1]
      );
      
      await connection.query(
        'INSERT INTO question_metadata (id_question, metadata_key, metadata_value) VALUES (?, ?, ?)',
        [questionId, 'indicateur_niveau3', question.indicateurs.niveau3]
      );
      
      await connection.query(
        'INSERT INTO question_metadata (id_question, metadata_key, metadata_value) VALUES (?, ?, ?)',
        [questionId, 'indicateur_niveau5', question.indicateurs.niveau5]
      );
      
      questionsMap[question.id] = questionId;
    }
    
    console.log(`  ${QUESTIONS.length} questions ajoutées au questionnaire DevSecOps`);
    
    // 8. Création des formulaires et des réponses (10 par application)
    console.log('Création des formulaires et des réponses...');
    
    // Pour chaque entreprise
    for (const entreprise of ENTREPRISES) {
      const orgMaturityProfile = PROFIL_MATURITE_ENTREPRISE[entreprise.nom as keyof typeof PROFIL_MATURITE_ENTREPRISE];
      const applications = applicationsIds[entreprise.nom];
      const acteurs = acteursParEntreprise[entreprise.nom];
      
      console.log(`  Traitement de l'entreprise: ${entreprise.nom} (${orgMaturityProfile})`);
      
      // Pour chaque application de cette entreprise
      for (const applicationId of applications) {
        console.log(`    Traitement de l'application ID: ${applicationId}`);
        
        // Créer 10 formulaires pour cette application
        for (let formIndex = 0; formIndex < CONFIG.NUM_FORMULAIRES_PAR_APP; formIndex++) {
          // Sélectionner un acteur aléatoire
          const acteurId = randomElement(acteurs);
          
          // Créer le formulaire
          const dateCreation = randomDate(CONFIG.DATE_DEBUT, CONFIG.DATE_FIN);
          const formulaireId = uuidv4();
          
          await connection.query(
            `INSERT INTO formulaires 
             (id_formulaire, id_acteur, id_application, id_questionnaire, date_creation, date_modification, statut) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              formulaireId,
              acteurId,
              applicationId,
              questionnaireId,
              dateCreation,
              dateCreation,
              'Validé'
            ]
          );
          
          // Pour chaque question, générer une réponse
          for (const question of QUESTIONS) {
            const questionId = questionsMap[question.id];
            const reponseId = uuidv4();
            
            // Générer une note adaptée au profil de maturité
            const noteValeur = generateNoteBasedOnProfile(question, orgMaturityProfile);
            const score = noteValeur * question.ponderation;
            
            // Générer un commentaire
            const commentaire = generateCommentaireForNote(noteValeur, question.indicateurs);
            
            await connection.query(
              `INSERT INTO reponses 
               (id_reponse, id_formulaire, id_question, valeur_reponse, score, commentaire) 
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                reponseId,
                formulaireId,
                questionId,
                noteValeur.toString(),
                score,
                commentaire
              ]
            );
          }
          
          console.log(`      Formulaire ${formIndex + 1}/${CONFIG.NUM_FORMULAIRES_PAR_APP} créé avec toutes les réponses`);
        }
        
        // 9. Calcul des scores pour cette application
        console.log(`    Calcul des scores pour l'application ID: ${applicationId}`);
        
        try {
          // Vérifier d'abord si la procédure stockée existe
          const [procCheck] = await connection.query(
            "SELECT COUNT(*) as count FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_NAME = 'calculer_scores_maturite'"
          );
          
          const procExists = (procCheck as any)[0].count > 0;
          
          if (procExists) {
            await connection.query('CALL calculer_scores_maturite(?)', [applicationId]);
            
            // Vérifier que l'analyse a bien été créée
            const [analyseCheck] = await connection.query(
              'SELECT id_analyse, score_global FROM maturity_analyses WHERE id_application = ? ORDER BY date_analyse DESC LIMIT 1',
              [applicationId]
            );
            
            if ((analyseCheck as any[]).length) {
              const analyse = (analyseCheck as any[])[0];
              console.log(`      Analyse créée avec succès, ID: ${analyse.id_analyse}, Score: ${analyse.score_global}`);
            } else {
              console.warn(`      Aucune analyse n'a été créée par la procédure pour l'application ID: ${applicationId}`);
              // Calculer manuellement si besoin
              await calculerScoresMaturiteManuel(connection, applicationId, questionnaireId);
            }
          } else {
            console.warn(`      La procédure 'calculer_scores_maturite' n'existe pas, calcul manuel...`);
            await calculerScoresMaturiteManuel(connection, applicationId, questionnaireId);
          }
        } catch (error) {
          console.error(`      Erreur lors du calcul des scores pour l'application ID: ${applicationId}:`, error);
          console.log(`      Tentative de calcul manuel...`);
          await calculerScoresMaturiteManuel(connection, applicationId, questionnaireId);
        }
      }
    }
    
    // 10. Calcul des scores globaux par entreprise (si la procédure existe)
    console.log('Calcul des scores globaux par entreprise...');
    try {
      for (const entreprise of ENTREPRISES) {
        const entrepriseId = entreprisesIds[entreprise.nom];
        
        // Vérifier si la procédure existe avant de l'appeler
        const [procCheck] = await connection.query(
          "SELECT COUNT(*) as count FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_NAME = 'calculer_scores_entreprise'"
        );
        
        const procExists = (procCheck as any)[0].count > 0;
        
        if (procExists) {
          await connection.query('CALL calculer_scores_entreprise(?)', [entrepriseId]);
          console.log(`  Scores calculés pour l'entreprise: ${entreprise.nom}`);
        } else {
          // Implémenter manuellement le calcul si la procédure n'existe pas
          console.log(`  Calcul manuel pour l'entreprise: ${entreprise.nom}`);
          await calculerScoresEntreprise(connection, entrepriseId);
        }
      }
    } catch (error) {
      console.warn('Erreur lors du calcul des scores par entreprise:', error);
      console.log('Implémentation du calcul manuel des scores par entreprise...');
      
      // Calculer manuellement pour chaque entreprise
      for (const entreprise of ENTREPRISES) {
        const entrepriseId = entreprisesIds[entreprise.nom];
        await calculerScoresEntreprise(connection, entrepriseId);
      }
    }
    
    console.log('Chargement des données terminé avec succès !');
  } catch (error) {
    console.error('Erreur lors du chargement des données:', error);
    throw error;
  }
}

/**
 * Fonction pour calculer manuellement les scores de maturité d'une application
 * (Au cas où la procédure stockée échouerait)
 */
async function calculerScoresMaturiteManuel(
    connection: PoolConnection, 
    applicationId: string,
    questionnaireId: string
  ): Promise<void> {
    try {
      console.log(`      Calcul manuel des scores pour l'application ID: ${applicationId}`);
      
      // 1. Récupérer tous les formulaires validés pour cette application
      const [formulaires] = await connection.query(
        `SELECT id_formulaire 
         FROM formulaires 
         WHERE id_application = ? AND id_questionnaire = ? AND statut = 'Validé'`,
        [applicationId, questionnaireId]
      );
      
      if (!(formulaires as any[]).length) {
        console.log(`      Aucun formulaire validé trouvé pour l'application ID: ${applicationId}`);
        return;
      }
      
      // 2. Récupérer les réponses et calculer les scores par thématique
      const thematiquesScores: Map<string, { scoreSum: number, count: number }> = new Map();
      
      // Pour chaque formulaire
      for (const form of (formulaires as any[])) {
        // Récupérer les réponses avec les informations de thématique
        const [reponses] = await connection.query(
          `SELECT r.id_reponse, r.id_question, r.valeur_reponse, r.score, q.texte, q.ponderation,
                  (SELECT tf.thematique FROM themes_fonctions tf 
                   JOIN questionnaires qn ON tf.fonction = qn.fonction
                   WHERE qn.id_questionnaire = ?) AS thematique
           FROM reponses r
           JOIN questions q ON r.id_question = q.id_question
           WHERE r.id_formulaire = ?`,
          [questionnaireId, form.id_formulaire]
        );
        
        // Agréger les scores par thématique
        for (const reponse of (reponses as any[])) {
          const thematique = reponse.thematique;
          if (!thematique) continue;
          
          // Convertir la valeur de réponse en score
          const scoreValue = parseFloat(reponse.score);
          if (isNaN(scoreValue)) continue;
          
          // Ajouter à la map des thématiques
          if (!thematiquesScores.has(thematique)) {
            thematiquesScores.set(thematique, { scoreSum: 0, count: 0 });
          }
          
          const themeScore = thematiquesScores.get(thematique)!;
          themeScore.scoreSum += scoreValue;
          themeScore.count += 1;
        }
      }
      
      // Si aucune thématique n'a de score, sortir
      if (thematiquesScores.size === 0) {
        console.log(`      Aucun score par thématique n'a pu être calculé pour l'application ID: ${applicationId}`);
        return;
      }
      
      // 3. Calculer les moyennes par thématique et le score global
      // Créer une nouvelle analyse
      const analyseId = uuidv4();
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      
      // Insérer d'abord l'analyse avec un score NULL
      await connection.query(
        `INSERT INTO maturity_analyses (id_analyse, id_application, date_analyse, score_global)
         VALUES (?, ?, ?, NULL)`,
        [analyseId, applicationId, now]
      );
      
      // Préparer les données pour un meilleur débogage
      console.log(`      Nombre de thématiques trouvées: ${thematiquesScores.size}`);
      
      // Calculer les scores par thématique et collecter pour le score global
      const thematiquesData = [];
      
      // Utiliser for...of sur le tableau converti pour pouvoir utiliser await correctement
      const thematiquesEntries = Array.from(thematiquesScores.entries());
      
      for (const [thematique, { scoreSum, count }] of thematiquesEntries) {
        const scoreThematique = count > 0 ? scoreSum / count : 0;
        
        // Stocker pour le calcul du score global
        thematiquesData.push({
          thematique,
          score: scoreThematique,
          count
        });
        
        // Insérer dans thematique_scores
        const scoreId = uuidv4();
        await connection.query(
          `INSERT INTO thematique_scores (id_score, id_analyse, thematique, score, nombre_reponses)
           VALUES (?, ?, ?, ?, ?)`,
          [scoreId, analyseId, thematique, scoreThematique, count]
        );
        
        // Ajouter à l'historique
        const historiqueId = uuidv4();
        const today = new Date().toISOString().split('T')[0];
        
        await connection.query(
          `INSERT INTO historique_scores (id_historique, id_application, thematique, score, date_mesure)
           VALUES (?, ?, ?, ?, ?)`,
          [historiqueId, applicationId, thematique, scoreThematique, today]
        );
        
        console.log(`        Thématique: ${thematique}, Score: ${scoreThematique.toFixed(2)} (${count} réponses)`);
      }
      
      // Maintenant calculer le score global correctement après que toutes les thématiques aient été traitées
      let scoreGlobalSum = 0;
      let validThematiqueCount = 0;
      
      for (const themeData of thematiquesData) {
        if (!isNaN(themeData.score) && isFinite(themeData.score)) {
          scoreGlobalSum += themeData.score;
          validThematiqueCount++;
        }
      }
      
      // Calculer et mettre à jour le score global
      const scoreGlobal = validThematiqueCount > 0 ? scoreGlobalSum / validThematiqueCount : 0;
      
      console.log(`      Somme des scores thématiques: ${scoreGlobalSum.toFixed(2)}, Nombre de thématiques valides: ${validThematiqueCount}`);
      
      // Mettre à jour le score global dans la base de données
      await connection.query(
        `UPDATE maturity_analyses SET score_global = ? WHERE id_analyse = ?`,
        [scoreGlobal, analyseId]
      );
      
      console.log(`      Score global calculé manuellement: ${scoreGlobal.toFixed(2)}`);
    } catch (error) {
      console.error(`      Erreur lors du calcul manuel des scores pour l'application ID: ${applicationId}:`, error);
    }
  }
    
async function calculerScoresEntreprise(connection: PoolConnection, entrepriseId: string): Promise<void> {
  try {
    // 1. Récupérer la liste des applications de l'entreprise
    const [applications] = await connection.query(
      'SELECT id_application FROM applications WHERE id_entreprise = ?',
      [entrepriseId]
    );
    
    if (!(applications as any[]).length) {
      console.log(`  Aucune application trouvée pour l'entreprise ID: ${entrepriseId}`);
      return;
    }
    
    // 2. Récupérer les dernières analyses de chaque application
    const applicationsIds = (applications as any[]).map(app => app.id_application);
    const analyses: { id_analyse: string, id_application: string, score_global: number }[] = [];
    
    for (const appId of applicationsIds) {
      const [lastAnalyseResult] = await connection.query(
        `SELECT id_analyse, id_application, score_global 
         FROM maturity_analyses 
         WHERE id_application = ? 
         ORDER BY date_analyse DESC LIMIT 1`,
        [appId]
      );
      
      if ((lastAnalyseResult as any[]).length) {
        const analyse = (lastAnalyseResult as any[])[0];
        
        // Débogage pour voir les valeurs récupérées
        console.log(`    Application ${appId}: Score global = ${analyse.score_global}`);
        
        analyses.push(analyse);
      }
    }
    
    if (!analyses.length) {
      console.log(`  Aucune analyse trouvée pour les applications de l'entreprise ID: ${entrepriseId}`);
      return;
    }
    
    // 3. Calculer le score global de l'entreprise
    let scoreSum = 0;
    let validScoresCount = 0;
    
    for (const analyse of analyses) {
      // Convertir en nombre et vérifier que c'est une valeur valide
      const scoreValue = parseFloat(analyse.score_global as any);
      
      if (!isNaN(scoreValue) && isFinite(scoreValue)) {
        scoreSum += scoreValue;
        validScoresCount++;
        console.log(`    Score valide: ${scoreValue}`);
      } else {
        console.warn(`    Score invalide ignoré: ${analyse.score_global}`);
      }
    }
    
    let scoreGlobal = validScoresCount > 0 ? scoreSum / validScoresCount : 0;
    
    // S'assurer que scoreGlobal est un nombre valide
    if (isNaN(scoreGlobal) || !isFinite(scoreGlobal)) {
      console.warn(`  Score global invalide pour l'entreprise ID: ${entrepriseId}, définit à 0`);
      scoreGlobal = 0;
    }
    
    console.log(`  Somme des scores: ${scoreSum}, Nombre d'analyses valides: ${validScoresCount}`);
    
    // 4. Enregistrer l'historique
    const historiqueId = uuidv4();
    const today = new Date().toISOString().split('T')[0];
    
    await connection.query(
      `INSERT INTO historique_scores_entreprises 
       (id_historique, id_entreprise, score_global, date_mesure) 
       VALUES (?, ?, ?, ?)`,
      [historiqueId, entrepriseId, scoreGlobal, today]
    );
    
    console.log(`  Score global de l'entreprise ID: ${entrepriseId} calculé: ${scoreGlobal.toFixed(2)}`);
  } catch (error) {
    console.error(`Erreur lors du calcul manuel des scores pour l'entreprise ID: ${entrepriseId}:`, error);
  }
}