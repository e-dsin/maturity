const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class ScoreService {
  static async calculateAndSaveScore(formulaireId) {
    try {
      // Récupérer les réponses avec pondérations (jointures correctes)
      const [reponses] = await pool.query(`
        SELECT r.valeur_reponse, q.ponderation
        FROM reponses r 
        JOIN questions q ON r.id_question = q.id_question
        JOIN thematiques t ON q.id_thematique = t.id_thematique
        JOIN questionnaire_thematiques qt ON t.id_thematique = qt.id_thematique
        JOIN formulaires f ON qt.id_questionnaire = f.id_questionnaire
        WHERE f.id_formulaire = ? 
          AND r.valeur_reponse IS NOT NULL
      `, [formulaireId]);
      
      // Récupérer TOUTES les questions du questionnaire (jointures correctes)
      const [questions] = await pool.query(`
        SELECT q.ponderation
        FROM formulaires f
        JOIN questionnaire_thematiques qt ON f.id_questionnaire = qt.id_questionnaire
        JOIN thematiques t ON qt.id_thematique = t.id_thematique
        JOIN questions q ON t.id_thematique = q.id_thematique
        WHERE f.id_formulaire = ?
      `, [formulaireId]);
      
      // Calculs (identiques)
      let scoreActuel = 0;
      for (const reponse of reponses) {
        scoreActuel += this.calculateQuestionScore(reponse.valeur_reponse, reponse.ponderation);
      }
      
      let scoreMaximum = 0;
      for (const question of questions) {
        scoreMaximum += this.calculateQuestionScore('5', question.ponderation);
      }
      
      // Sauvegarde (identique)
      const historyId = uuidv4();
      await pool.query(`
        INSERT INTO historique_scores_formulaires 
        (id_historique, id_formulaire, score_actuel, score_maximum, date_mesure)
        VALUES (?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
        score_actuel = VALUES(score_actuel),
        score_maximum = VALUES(score_maximum),
        date_mesure = VALUES(date_mesure)
      `, [historyId, formulaireId, scoreActuel, scoreMaximum]);
      
      return { scoreActuel, scoreMaximum };
    } catch (error) {
      logger.error(`Erreur calcul score formulaire ${formulaireId}:`, error);
      throw error;
    }
  }
}

module.exports = ScoreService;