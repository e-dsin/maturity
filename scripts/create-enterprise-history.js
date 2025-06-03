// server/scripts/create-enterprise-history.js
/**
 * Script pour créer la table historique_scores_entreprises et initialiser les données
 * 
 * Ce script vérifie l'existence de la table, la crée si nécessaire,
 * puis génère des données historiques à partir des analyses existantes.
 * 
 * Exécution : node server/scripts/create-enterprise-history.js
 */

const dotenv = require('dotenv');
const { pool } = require('../server/db/dbConnection');
const { initialiserHistoriqueEntreprises } = require('../server/db/migrations/migrationsScore');

// Charger les variables d'environnement
dotenv.config();

async function main() {
  console.log('Démarrage de la migration pour la table historique_scores_entreprises...');
  
  try {
    // Vérifier la connexion à la base de données
    console.log('Vérification de la connexion à la base de données...');
    await pool.query('SELECT 1');
    console.log('Connexion à la base de données réussie.');
    
    // Créer la table et initialiser les données
    const result = await initialiserHistoriqueEntreprises(pool);
    
    if (result) {
      console.log('Migration terminée avec succès.');
    } else {
      console.error('La migration a échoué.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Erreur lors de la migration:', error);
    process.exit(1);
  } finally {
    // Fermer la connexion à la base de données
    console.log('Fermeture de la connexion à la base de données...');
    await pool.end();
    console.log('Connexion à la base de données fermée.');
    process.exit(0);
  }
}

// Exécuter la fonction principale
main();