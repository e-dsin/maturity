// server/controllers/stats-controller.js
const { pool } = require('../db/dbConnection');

/**
 * Contrôleur pour les statistiques générales
 */
exports.getOverview = async (req, res) => {
    try {
      // Calculer les statistiques depuis la base de données
      const [totalApplicationsResult] = await pool.query('SELECT COUNT(*) as total FROM applications');
      const [totalQuestionnairesResult] = await pool.query('SELECT COUNT(*) as total FROM questionnaires');
      const [totalFormulairesResult] = await pool.query('SELECT COUNT(*) as total FROM formulaires');
      
      // Calculer le taux de complétion (formulaires validés / total des formulaires)
      const [completedFormulairesResult] = await pool.query(
        "SELECT COUNT(*) as total FROM formulaires WHERE statut = 'Validé'"
      );
      
      const totalApplications = totalApplicationsResult[0].total;
      const totalQuestionnaires = totalQuestionnairesResult[0].total;
      const totalFormulaires = totalFormulairesResult[0].total;
      const completedFormulaires = completedFormulairesResult[0].total;
      
      // Calculer le taux de complétion (éviter la division par zéro)
      const completionRate = totalFormulaires > 0 
        ? Math.round((completedFormulaires / totalFormulaires) * 100) 
        : 0;
      
      res.status(200).json({
        totalApplications,
        totalQuestionnaires,
        totalFormulaires,
        completionRate
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      res.status(500).json({ message: 'Erreur serveur lors de la récupération des statistiques' });
    }
  };