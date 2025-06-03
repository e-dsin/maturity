// src/scripts/resetAndSeedDatabase.ts
import { pool } from '../server/db/dbConnection';
import * as dotenv from 'dotenv';
import { cleanDatabase } from './dbCleanup';
import { seedDatabase } from './dbSeed';

dotenv.config();

/**
 * Fonction principale combinant nettoyage et chargement
 */
async function resetAndSeedDatabase() {
  try {
    console.log('Début du processus de réinitialisation et chargement des données...');
    console.log('Environnement de la base de données:');
    console.log(`- Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`- Database: ${process.env.DB_NAME || 'maturity_assessment'}`);
    
    // Connexion à la base de données
    const connection = await pool.getConnection();
    
    try {
      // Activer le mode transaction
      await connection.beginTransaction();
      
      // 1. Nettoyage de la base de données
      await cleanDatabase(connection);
      
      // 2. Chargement des nouvelles données
      await seedDatabase(connection);
      
      // Validation de la transaction
      await connection.commit();
      console.log('Processus terminé avec succès !');
      
    } catch (error) {
      // En cas d'erreur, annuler la transaction
      await connection.rollback();
      console.error('Erreur lors du processus:', error);
      throw error;
    } finally {
      // Libération de la connexion
      connection.release();
    }
    
  } catch (error) {
    console.error('Erreur de connexion à la base de données:', error);
    throw error;
  }
}

/**
 * Exécution du script
 */
async function main() {
  try {
    const startTime = new Date().getTime();
    await resetAndSeedDatabase();
    const endTime = new Date().getTime();
    
    console.log(`Temps d'exécution: ${(endTime - startTime) / 1000} secondes`);
    process.exit(0);
  } catch (error) {
    console.error('Échec du script:', error);
    process.exit(1);
  }
}

main();