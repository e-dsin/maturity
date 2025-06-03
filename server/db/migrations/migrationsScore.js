const initialiserHistoriqueEntreprises = async (pool) => {
    console.log('Initialisation de la table historique_scores_entreprises...');
    
    try {
      // Vérifier si la table existe déjà
      const [tables] = await pool.query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'historique_scores_entreprises'
      `);
      
      // Si la table n'existe pas, la créer
      if (tables.length === 0) {
        console.log('Création de la table historique_scores_entreprises...');
        
        await pool.query(`
          CREATE TABLE historique_scores_entreprises (
            id_historique VARCHAR(36) PRIMARY KEY,
            id_entreprise VARCHAR(36) NOT NULL,
            score_global DECIMAL(5,2) NOT NULL,
            date_mesure DATE NOT NULL,
            FOREIGN KEY (id_entreprise) REFERENCES entreprises(id_entreprise),
            INDEX idx_hse_entreprise (id_entreprise),
            INDEX idx_hse_date (date_mesure)
          )
        `);
        
        console.log('Table historique_scores_entreprises créée avec succès.');
      } else {
        console.log('La table historique_scores_entreprises existe déjà.');
      }
      
      // Récupérer toutes les entreprises
      const [entreprises] = await pool.query(`
        SELECT id_entreprise, nom_entreprise
        FROM entreprises
      `);
      
      // Pour chaque entreprise
      for (const entreprise of entreprises) {
        console.log(`Traitement de l'entreprise: ${entreprise.nom_entreprise}`);
        
        // Récupérer toutes les analyses des applications de cette entreprise
        const [analyses] = await pool.query(`
          SELECT ma.id_analyse, ma.id_application, ma.score_global, ma.date_analyse, 
                 a.nom_application
          FROM maturity_analyses ma
          JOIN applications a ON ma.id_application = a.id_application
          WHERE a.id_entreprise = ?
          ORDER BY ma.date_analyse
        `, [entreprise.id_entreprise]);
        
        if (analyses.length === 0) {
          console.log(`Aucune analyse trouvée pour l'entreprise: ${entreprise.nom_entreprise}`);
          continue;
        }
        
        // Regrouper les analyses par date (au jour près)
        const analysesByDate = analyses.reduce((acc, analyse) => {
          const date = new Date(analyse.date_analyse).toISOString().split('T')[0];
          
          if (!acc[date]) {
            acc[date] = [];
          }
          
          acc[date].push(analyse);
          return acc;
        }, {});
        
        // Pour chaque date, calculer le score moyen et ajouter une entrée dans l'historique
        for (const [date, analysesList] of Object.entries(analysesByDate)) {
          // Calculer le score moyen de toutes les analyses à cette date
          const scoreSum = analysesList.reduce((sum, analyse) => {
            return sum + (analyse.score_global || 0);
          }, 0);
          
          const scoreAvg = scoreSum / analysesList.length;
          
          // Vérifier si une entrée existe déjà pour cette entreprise à cette date
          const [existingEntries] = await pool.query(`
            SELECT id_historique
            FROM historique_scores_entreprises
            WHERE id_entreprise = ? AND date_mesure = ?
          `, [entreprise.id_entreprise, date]);
          
          if (existingEntries.length > 0) {
            console.log(`Entrée historique existante pour ${entreprise.nom_entreprise} à la date ${date}`);
            continue;
          }
          
          // Générer un UUID pour l'entrée historique
          const { v4: uuidv4 } = require('uuid');
          const id_historique = uuidv4();
          
          // Ajouter l'entrée dans l'historique
          await pool.query(`
            INSERT INTO historique_scores_entreprises (
              id_historique, id_entreprise, score_global, date_mesure
            ) VALUES (?, ?, ?, ?)
          `, [
            id_historique,
            entreprise.id_entreprise,
            scoreAvg,
            date
          ]);
          
          console.log(`Entrée historique ajoutée pour ${entreprise.nom_entreprise} à la date ${date}: score ${scoreAvg.toFixed(2)}`);
        }
      }
      
      console.log('Initialisation de la table historique_scores_entreprises terminée avec succès.');
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de la table historique_scores_entreprises:', error);
      return false;
    }
  };
  
  module.exports = { initialiserHistoriqueEntreprises };