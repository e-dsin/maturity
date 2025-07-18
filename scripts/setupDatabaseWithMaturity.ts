// src/scripts/setupDatabaseWithMaturity.ts
import { execSync } from 'child_process';
import { pool } from '../server/db/dbConnection';
import { cleanDatabase } from './dbCleanup';
import { seedDatabase } from './dbSeed';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Fonction pour exécuter les étapes dans le bon ordre
 */
async function setupDatabaseWithMaturity() {
  try {
    console.log('=== INITIALISATION COMPLÈTE DE LA BASE DE DONNÉES ===');
    console.log('Environnement de la base de données:');
    console.log(`- Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`- Database: ${process.env.DB_NAME || 'maturity_assessment'}`);
    
    // Étape 1 : Initialiser le schéma
    console.log('\n=== ÉTAPE 1 : INITIALISATION DU SCHÉMA ===');
    try {
      execSync('npx ts-node scripts/update-database.ts --drop --skip-backup', {
        stdio: 'inherit'
      });
      console.log('Schéma initialisé avec succès.');
    } catch (error) {
      console.error('ERREUR lors de l\'initialisation du schéma:', error);
      throw new Error('Échec de l\'initialisation du schéma. Processus arrêté.');
    }
    
    // Étape 2 : Charger le modèle complet d'évaluation de maturité
    console.log('\n=== ÉTAPE 2 : CHARGEMENT DU MODÈLE D\'ÉVALUATION DE MATURITÉ ===');
    try {
      execSync('npx ts-node scripts/seedGrilleInterpretation-fixed.ts', {
        stdio: 'inherit'
      });
      console.log('Modèle d\'évaluation de maturité chargé avec succès.');
    } catch (error) {
      console.error('ERREUR lors du chargement du modèle d\'évaluation:', error);
      throw new Error('Échec du chargement des données d\'évaluation. Processus arrêté.');
    }
    
    // Étape 3 : Charger les données de base
    console.log('\n=== ÉTAPE 3 : CHARGEMENT DES DONNÉES DE BASE ===');
    // Plutôt que d'exécuter resetAndSeedDatabase, nous appelons directement
    // les fonctions pour avoir plus de contrôle et éviter la duplication des transactions
    
    // Obtenir une connexion à la base de données
    const connection = await pool.getConnection();
    
    try {
      // Commencer une transaction
      await connection.beginTransaction();
      
      // 3.1 : Appeler directement cleanDatabase (sans nettoyer les tables d'évaluation de maturité)
      console.log('Nettoyage des tables de données de base...');
      
      // Désactiver les contraintes de clés étrangères pour permettre la suppression
      await connection.query('SET FOREIGN_KEY_CHECKS = 0');
      
      // Liste des tables à vider, EN EXCLUANT grille_interpretation, fonctions et thematiques
      const tables = [
        'historique_scores',
        'historique_scores_entreprises',
        'thematique_scores',
        'maturity_analyses',
        'reponses',
        'formulaires',
        'question_metadata',
        'questions',
        'questionnaires',
        'themes_fonctions',
        'permissions',
        'applications',
        'acteurs',
        'entreprises'
      ];
      
      // Vider chaque table
      for (const table of tables) {
        console.log(`  Nettoyage de la table ${table}...`);
        try {
          await connection.query(`TRUNCATE TABLE ${table}`);
        } catch (error) {
          console.warn(`  Erreur lors du nettoyage de la table ${table}:`, error);
          // Continuer malgré l'erreur
        }
      }
      
      // Réactiver les contraintes de clés étrangères
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
      
      console.log('Nettoyage des tables de base terminé avec succès !');
      
      // 3.2 : Appeler seedDatabase pour remplir les données
      console.log('Chargement des données de base...');
      await seedDatabase(connection);
      
      // Valider la transaction
      await connection.commit();
      console.log('Données de base chargées avec succès !');
      
    } catch (error) {
      // En cas d'erreur, annuler la transaction
      await connection.rollback();
      console.error('ERREUR lors du chargement des données de base:', error);
      throw error;
    } finally {
      // Libérer la connexion
      connection.release();
    }
    
    console.log('\n=== INITIALISATION COMPLÈTE TERMINÉE AVEC SUCCÈS ===');
    
  } catch (error) {
    console.error('\nERREUR CRITIQUE lors de l\'initialisation de la base de données:', error);
    process.exit(1);
  }
}

/**
 * Exécution du script
 */
async function main() {
  try {
    const startTime = new Date().getTime();
    await setupDatabaseWithMaturity();
    const endTime = new Date().getTime();
    
    console.log(`\nTemps d'exécution total: ${(endTime - startTime) / 1000} secondes`);
    process.exit(0);
  } catch (error) {
    console.error('\nÉchec du script:', error);
    process.exit(1);
  }
}

main();