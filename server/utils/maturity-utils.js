// server/utils/maturity-utils.js
const { pool } = require('../db/dbConnection');
const logger = require('./logger');

/**
 * Utilitaires pour la gestion des scores et niveaux de maturité
 */

// Constantes pour les niveaux de maturité
const MATURITY_LEVELS = {
  1: { name: 'Initial', color: '#F44336', min: 0.0, max: 1.0 },
  2: { name: 'Défini', color: '#FF9800', min: 1.01, max: 2.0 },
  3: { name: 'Mesuré', color: '#FFC107', min: 2.01, max: 3.0 },
  4: { name: 'Géré', color: '#4CAF50', min: 3.01, max: 4.0 },
  5: { name: 'Optimisé', color: '#2196F3', min: 4.01, max: 5.0 }
};

/**
 * Calcule le niveau de maturité basé sur un score
 * @param {number} score - Score entre 0 et 5
 * @returns {object} Niveau de maturité avec détails
 */
const calculateMaturityLevel = (score) => {
  if (score === null || score === undefined || isNaN(score)) {
    return {
      level: 0,
      name: 'Non évalué',
      color: '#9E9E9E',
      description: 'Aucune évaluation disponible'
    };
  }
  
  const normalizedScore = Math.max(0, Math.min(5, score));
  
  for (const [level, config] of Object.entries(MATURITY_LEVELS)) {
    if (normalizedScore >= config.min && normalizedScore <= config.max) {
      return {
        level: parseInt(level),
        name: config.name,
        color: config.color,
        score: normalizedScore,
        description: getMaturityDescription(parseInt(level))
      };
    }
  }
  
  // Fallback pour les scores hors limites
  return {
    level: normalizedScore >= 4.5 ? 5 : 1,
    name: normalizedScore >= 4.5 ? 'Optimisé' : 'Initial',
    color: normalizedScore >= 4.5 ? '#2196F3' : '#F44336',
    score: normalizedScore,
    description: getMaturityDescription(normalizedScore >= 4.5 ? 5 : 1)
  };
};

/**
 * Retourne la description détaillée d'un niveau de maturité
 * @param {number} level - Niveau (1-5)
 * @returns {string} Description du niveau
 */
const getMaturityDescription = (level) => {
  const descriptions = {
    1: 'Processus ad-hoc et imprévisibles. Les pratiques ne sont pas formalisées et dépendent des individus.',
    2: 'Processus caractérisés et documentés. Les pratiques sont définies mais leur application n\'est pas systématique.',
    3: 'Processus standardisés et mesurés. Les pratiques sont appliquées de manière cohérente avec un suivi régulier.',
    4: 'Processus contrôlés et prévisibles. Optimisation basée sur les métriques et amélioration continue.',
    5: 'Processus en amélioration continue. Innovation constante et adaptation proactive aux changements.'
  };
  
  return descriptions[level] || 'Description non disponible';
};

/**
 * Calcule les scores par fonction à partir des réponses
 * @param {Array} responses - Tableau des réponses
 * @param {object} connection - Connexion DB (optionnel)
 * @returns {object} Scores par fonction
 */
const calculateFunctionScores = async (responses, connection = null) => {
  const conn = connection || await pool.getConnection();
  const shouldRelease = !connection;
  
  try {
    // Récupérer les informations des questions
    const [questions] = await conn.query(`
      SELECT 
        q.id_question, 
        q.fonction, 
        q.poids, 
        fg.code_fonction, 
        fg.nom as nom_fonction,
        fg.poids as poids_fonction
      FROM questions_maturite_globale q
      LEFT JOIN fonctions_maturite_globale fg ON q.id_fonction_globale = fg.id_fonction
      WHERE q.actif = 1
    `);
    
    const questionMap = {};
    questions.forEach(q => {
      questionMap[q.id_question] = {
        fonction: q.code_fonction || q.fonction,
        nom_fonction: q.nom_fonction || q.fonction,
        poids_question: q.poids || 1.0,
        poids_fonction: q.poids_fonction || 1.0
      };
    });
    
    // Grouper les réponses par fonction
    const functionGroups = {};
    
    responses.forEach(response => {
      const questionInfo = questionMap[response.id_question];
      if (questionInfo) {
        const functionCode = questionInfo.fonction;
        if (!functionGroups[functionCode]) {
          functionGroups[functionCode] = {
            nom: questionInfo.nom_fonction,
            responses: [],
            poids_fonction: questionInfo.poids_fonction
          };
        }
        
        functionGroups[functionCode].responses.push({
          ...response,
          poids: questionInfo.poids_question
        });
      }
    });
    
    // Calculer les scores par fonction
    const functionScores = {};
    let totalWeightedScore = 0;
    let totalWeight = 0;
    
    for (const [functionCode, data] of Object.entries(functionGroups)) {
      const { responses: funcResponses, poids_fonction } = data;
      
      if (funcResponses.length > 0) {
        // Score moyen pondéré pour la fonction
        const weightedSum = funcResponses.reduce((sum, response) => 
          sum + (response.valeur_reponse * response.poids), 0);
        const totalQuestionWeight = funcResponses.reduce((sum, response) => 
          sum + response.poids, 0);
        
        const functionScore = totalQuestionWeight > 0 ? 
          weightedSum / totalQuestionWeight : 0;
        
        functionScores[functionCode] = {
          score: Math.round(functionScore * 100) / 100,
          nom: data.nom,
          niveau: calculateMaturityLevel(functionScore),
          nb_questions: funcResponses.length,
          poids_fonction
        };
        
        // Contribution au score global
        totalWeightedScore += functionScore * poids_fonction;
        totalWeight += poids_fonction;
      } else {
        functionScores[functionCode] = {
          score: 0,
          nom: data.nom,
          niveau: calculateMaturityLevel(0),
          nb_questions: 0,
          poids_fonction
        };
      }
    }
    
    // Score global
    const globalScore = totalWeight > 0 ? 
      Math.round((totalWeightedScore / totalWeight) * 100) / 100 : 0;
    
    return {
      global: {
        score: globalScore,
        niveau: calculateMaturityLevel(globalScore)
      },
      functions: functionScores,
      summary: {
        total_functions: Object.keys(functionScores).length,
        total_responses: responses.length,
        calculation_date: new Date()
      }
    };
    
  } catch (error) {
    logger.error('Erreur lors du calcul des scores:', error);
    throw error;
  } finally {
    if (shouldRelease) {
      conn.release();
    }
  }
};

/**
 * Récupère le niveau détaillé depuis la base de données
 * @param {string} functionCode - Code de la fonction
 * @param {number} score - Score obtenu
 * @param {object} connection - Connexion DB (optionnel)
 * @returns {object|null} Niveau détaillé ou null
 */
const getDetailedLevel = async (functionCode, score, connection = null) => {
  const conn = connection || await pool.getConnection();
  const shouldRelease = !connection;
  
  try {
    const [levels] = await conn.query(`
      SELECT 
        n.*,
        f.nom as nom_fonction,
        f.couleur as couleur_fonction,
        f.icone
      FROM niveaux_maturite_globale n
      JOIN fonctions_maturite_globale f ON n.id_fonction = f.id_fonction
      WHERE f.code_fonction = ? AND f.actif = 1 AND n.actif = 1
        AND ? >= n.score_min AND ? <= n.score_max
      ORDER BY n.ordre_niveau
      LIMIT 1
    `, [functionCode, score, score]);
    
    return levels[0] || null;
    
  } catch (error) {
    logger.error(`Erreur lors de la récupération du niveau pour ${functionCode}:`, error);
    return null;
  } finally {
    if (shouldRelease) {
      conn.release();
    }
  }
};

/**
 * Récupère les recommandations pour un score et une fonction
 * @param {string} functionCode - Code de la fonction
 * @param {number} score - Score obtenu
 * @param {object} connection - Connexion DB (optionnel)
 * @returns {Array} Liste des recommandations
 */
const getRecommendations = async (functionCode, score, connection = null) => {
  const conn = connection || await pool.getConnection();
  const shouldRelease = !connection;
  
  try {
    const [recommendations] = await conn.query(`
      SELECT 
        r.*,
        n.nom_niveau,
        f.nom as nom_fonction
      FROM recommandations_maturite_globale r
      JOIN fonctions_maturite_globale f ON r.id_fonction = f.id_fonction
      LEFT JOIN niveaux_maturite_globale n ON r.id_niveau = n.id_niveau
      WHERE f.code_fonction = ? AND r.actif = 1
        AND (
          (r.score_min IS NULL AND r.score_max IS NULL) OR
          (r.score_min <= ? AND r.score_max >= ?)
        )
      ORDER BY 
        CASE r.priorite 
          WHEN 'CRITIQUE' THEN 1
          WHEN 'HAUTE' THEN 2
          WHEN 'MOYENNE' THEN 3
          WHEN 'FAIBLE' THEN 4
        END,
        r.ordre_affichage,
        r.created_at DESC
      LIMIT 10
    `, [functionCode, score, score]);
    
    return recommendations.map(rec => ({
      ...rec,
      actions_recommandees: typeof rec.actions_recommandees === 'string' ? 
        JSON.parse(rec.actions_recommandees) : rec.actions_recommandees || []
    }));
    
  } catch (error) {
    logger.error(`Erreur lors de la récupération des recommandations pour ${functionCode}:`, error);
    return [];
  } finally {
    if (shouldRelease) {
      conn.release();
    }
  }
};

/**
 * Valide un score de réponse
 * @param {number} score - Score à valider
 * @returns {boolean} True si valide
 */
const validateScore = (score) => {
  return typeof score === 'number' && 
         !isNaN(score) && 
         score >= 1 && 
         score <= 5 && 
         Number.isInteger(score);
};

/**
 * Normalise un score sur une échelle de 0 à 100
 * @param {number} score - Score sur 5
 * @returns {number} Score sur 100
 */
const normalizeScore = (score) => {
  if (!validateScore(score)) return 0;
  return Math.round((score / 5) * 100);
};

/**
 * Convertit un score normalisé (0-100) vers l'échelle 1-5
 * @param {number} normalizedScore - Score sur 100
 * @returns {number} Score sur 5
 */
const denormalizeScore = (normalizedScore) => {
  if (typeof normalizedScore !== 'number' || isNaN(normalizedScore)) return 1;
  const score = Math.max(0, Math.min(100, normalizedScore)) / 20;
  return Math.max(1, Math.min(5, score));
};

/**
 * Génère un rapport d'analyse complet
 * @param {string} evaluationId - ID de l'évaluation
 * @param {object} connection - Connexion DB (optionnel)
 * @returns {object} Rapport complet
 */
const generateAnalysisReport = async (evaluationId, connection = null) => {
  const conn = connection || await pool.getConnection();
  const shouldRelease = !connection;
  
  try {
    // Récupérer l'évaluation
    const [evaluations] = await conn.query(`
      SELECT 
        ev.*,
        e.nom_entreprise,
        a.nom_prenom as nom_acteur
      FROM evaluations_maturite_globale ev
      JOIN entreprises e ON ev.id_entreprise = e.id_entreprise
      JOIN acteurs a ON ev.id_acteur = a.id_acteur
      WHERE ev.id_evaluation = ?
    `, [evaluationId]);
    
    if (evaluations.length === 0) {
      throw new Error('Évaluation non trouvée');
    }
    
    const evaluation = evaluations[0];
    
    // Récupérer les réponses
    const [responses] = await conn.query(`
      SELECT r.*, q.fonction
      FROM reponses_maturite_globale r
      JOIN questions_maturite_globale q ON r.id_question = q.id_question
      WHERE r.id_evaluation = ?
    `, [evaluationId]);
    
    // Calculer les scores
    const scores = await calculateFunctionScores(responses, conn);
    
    // Récupérer les recommandations et niveaux détaillés
    const enhancedFunctions = {};
    
    for (const [functionCode, functionData] of Object.entries(scores.functions)) {
      const recommendations = await getRecommendations(functionCode, functionData.score, conn);
      const detailedLevel = await getDetailedLevel(functionCode, functionData.score, conn);
      
      enhancedFunctions[functionCode] = {
        ...functionData,
        recommendations,
        detailed_level: detailedLevel,
        improvement_potential: calculateImprovementPotential(functionData.score)
      };
    }
    
    return {
      evaluation,
      scores: {
        global: scores.global,
        functions: enhancedFunctions
      },
      summary: {
        ...scores.summary,
        strengths: identifyStrengths(enhancedFunctions),
        weaknesses: identifyWeaknesses(enhancedFunctions),
        priority_actions: getPriorityActions(enhancedFunctions)
      },
      generated_at: new Date()
    };
    
  } catch (error) {
    logger.error('Erreur lors de la génération du rapport:', error);
    throw error;
  } finally {
    if (shouldRelease) {
      conn.release();
    }
  }
};

/**
 * Calcule le potentiel d'amélioration
 * @param {number} score - Score actuel
 * @returns {object} Potentiel d'amélioration
 */
const calculateImprovementPotential = (score) => {
  const maxScore = 5;
  const potential = maxScore - score;
  
  return {
    points_possible: Math.round(potential * 100) / 100,
    percentage: Math.round((potential / maxScore) * 100),
    priority: potential > 2 ? 'HAUTE' : potential > 1 ? 'MOYENNE' : 'FAIBLE'
  };
};

/**
 * Identifie les forces de l'organisation
 * @param {object} functions - Fonctions avec scores
 * @returns {Array} Liste des forces
 */
const identifyStrengths = (functions) => {
  return Object.entries(functions)
    .filter(([code, data]) => data.score >= 3.5)
    .map(([code, data]) => ({
      function_code: code,
      function_name: data.nom,
      score: data.score,
      level: data.niveau.name
    }))
    .sort((a, b) => b.score - a.score);
};

/**
 * Identifie les faiblesses de l'organisation
 * @param {object} functions - Fonctions avec scores
 * @returns {Array} Liste des faiblesses
 */
const identifyWeaknesses = (functions) => {
  return Object.entries(functions)
    .filter(([code, data]) => data.score < 2.5)
    .map(([code, data]) => ({
      function_code: code,
      function_name: data.nom,
      score: data.score,
      level: data.niveau.name,
      improvement_potential: data.improvement_potential
    }))
    .sort((a, b) => a.score - b.score);
};

/**
 * Détermine les actions prioritaires
 * @param {object} functions - Fonctions avec scores
 * @returns {Array} Actions prioritaires
 */
const getPriorityActions = (functions) => {
  const actions = [];
  
  Object.entries(functions).forEach(([code, data]) => {
    if (data.recommendations && data.recommendations.length > 0) {
      const highPriorityRecs = data.recommendations
        .filter(rec => rec.priorite === 'CRITIQUE' || rec.priorite === 'HAUTE')
        .slice(0, 2);
      
      highPriorityRecs.forEach(rec => {
        actions.push({
          function_code: code,
          function_name: data.nom,
          action_title: rec.titre,
          action_description: rec.description,
          priority: rec.priorite,
          type: rec.type_recommandation,
          urgency_score: calculateUrgencyScore(data.score, rec.priorite)
        });
      });
    }
  });
  
  return actions
    .sort((a, b) => b.urgency_score - a.urgency_score)
    .slice(0, 10);
};

/**
 * Calcule le score d'urgence d'une action
 * @param {number} functionScore - Score de la fonction
 * @param {string} priority - Priorité de la recommandation
 * @returns {number} Score d'urgence
 */
const calculateUrgencyScore = (functionScore, priority) => {
  const priorityWeight = {
    'CRITIQUE': 4,
    'HAUTE': 3,
    'MOYENNE': 2,
    'FAIBLE': 1
  };
  
  const scoreImpact = Math.max(0, 5 - functionScore); // Plus le score est bas, plus l'impact est élevé
  return (priorityWeight[priority] || 1) * scoreImpact;
};

module.exports = {
  MATURITY_LEVELS,
  calculateMaturityLevel,
  getMaturityDescription,
  calculateFunctionScores,
  getDetailedLevel,
  getRecommendations,
  validateScore,
  normalizeScore,
  denormalizeScore,
  generateAnalysisReport,
  calculateImprovementPotential,
  identifyStrengths,
  identifyWeaknesses,
  getPriorityActions,
  calculateUrgencyScore
};