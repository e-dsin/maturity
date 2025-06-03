// src/scripts/dbCleanup.ts
import { Pool, PoolConnection } from 'mysql2/promise';

/**
 * Fonction pour nettoyer la base de données
 * Supprime toutes les données existantes des tables principales
 */
export async function cleanDatabase(connection: PoolConnection): Promise<void> {
  console.log('Nettoyage de la base de données...');
  
  // Désactiver les contraintes de clés étrangères pour permettre la suppression
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');
  
  // Liste des tables à vider, dans l'ordre pour éviter les problèmes de clés étrangères
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
    'entreprises',
    'grille_interpretation'
  ];
  
  // Vider chaque table
  for (const table of tables) {
    console.log(`Nettoyage de la table ${table}...`);
    try {
      await connection.query(`TRUNCATE TABLE ${table}`);
    } catch (error) {
      console.warn(`Erreur lors du nettoyage de la table ${table}:`, error);
      // Continuer malgré l'erreur
    }
  }
  
  // Réactiver les contraintes de clés étrangères
  await connection.query('SET FOREIGN_KEY_CHECKS = 1');
  
  console.log('Nettoyage terminé avec succès !');
}