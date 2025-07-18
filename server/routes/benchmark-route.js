// server/routes/benchmark-route.js - VERSION CORRIGÉE SELON SCHÉMA
const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// Import du service LLM pour les appels réels
const { analyzeMaturiteWithLLMs } = require('../services/llmService');

// Cache des benchmarks avec durée de vie configurable
const benchmarkCache = new Map();
const CACHE_DURATION = (process.env.BENCHMARK_CACHE_HOURS || 24) * 60 * 60 * 1000;
const BENCHMARK_MODE = process.env.BENCHMARK_MODE || 'simulation';

// Simulateur d'appels LLM (version fallback)
const simulateLLMCall = async (prompt, llmSource, contextScore = null, motivationContext = null) => {
  await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
  
  const baseScore = contextScore ? 
    Math.max(1, Math.min(5, contextScore + (Math.random() - 0.5) * 0.8)) : 
    2.5 + Math.random() * 2;
  
  const confidence = 75 + Math.random() * 20;
  
  const recommendations = {
    'ChatGPT': [
      motivationContext?.objectif ? 
        `Pour atteindre votre objectif "${motivationContext.objectif}", optimisez les processus existants` :
        "Optimiser les processus existants en automatisant les tâches répétitives",
      "Mettre en place des indicateurs de performance clairs et mesurables",
      "Améliorer la collaboration inter-équipes par des outils collaboratifs",
      "Développer une approche data-driven pour la prise de décision",
      "Investir dans la formation continue des équipes"
    ],
    'Grok': [
      motivationContext?.but ? 
        `En ligne avec votre but "${motivationContext.but}", adoptez une approche agile` :
        "Adopter une approche agile et disruptive",
      "Exploiter l'intelligence artificielle et les technologies émergentes",
      "Créer des écosystèmes innovants avec des partenaires externes",
      "Développer une culture d'expérimentation rapide",
      "Implémenter des solutions scalables basées sur le cloud"
    ],
    'Claude': [
      motivationContext?.motivation ? 
        `Compte tenu de votre motivation "${motivationContext.motivation}", structurez l'amélioration` :
        "Structurer progressivement l'amélioration par une approche méthodique",
      "Consolider les fondations organisationnelles",
      "Privilégier la qualité et la cohérence dans l'implémentation",
      "Développer des standards et bonnes pratiques documentées",
      "Assurer une conduite du changement participative"
    ]
  };
  
  const randomRec = recommendations[llmSource][Math.floor(Math.random() * recommendations[llmSource].length)];
  
  return {
    source: llmSource,
    score: parseFloat(baseScore.toFixed(1)),
    recommandation: randomRec,
    confidence: parseFloat(confidence.toFixed(1)),
    motivation_prise_en_compte: !!motivationContext
  };
};

// Fonction pour récupérer les motivations d'une entreprise - CORRIGÉE
const getEnterpriseMotivations = async (id_entreprise) => {
  try {
    // Récupérer la vision depuis la table entreprises
    const [entreprise] = await pool.query(`
      SELECT vision_transformation_numerique 
      FROM entreprises 
      WHERE id_entreprise = ?
    `, [id_entreprise]);
    
    // Récupérer les motivations par fonction depuis entreprise_motivations
    const [motivations] = await pool.query(`
      SELECT em.*, fmg.nom as fonction_nom
      FROM entreprise_motivations em
      JOIN fonctions_maturite_globale fmg ON em.code_fonction = fmg.code_fonction
      WHERE em.id_entreprise = ?
      ORDER BY fmg.ordre_affichage
    `, [id_entreprise]);
    
    const motivationsByFunction = {};
    for (const mot of motivations) {
      motivationsByFunction[mot.code_fonction] = {
        motivation: mot.motivation,
        but: mot.but,
        objectif: mot.objectif,
        mesure: mot.mesure,
        fonction_nom: mot.fonction_nom
      };
    }
    
    return {
      vision: entreprise[0]?.vision_transformation_numerique || '',
      motivations: motivationsByFunction
    };
    
  } catch (error) {
    logger.error('Erreur récupération motivations:', error);
    return { vision: '', motivations: {} };
  }
};

// Récupérer les données de benchmark depuis la base - CORRIGÉE
const getBenchmarkDataFromDB = async (secteur, fonction, thematiques) => {
  const connection = await pool.getConnection();
  
  try {
    // Récupérer le nombre d'entreprises du secteur
    const [entreprisesSecteur] = await connection.query(`
      SELECT COUNT(DISTINCT e.id_entreprise) as total
      FROM entreprises e
      WHERE e.secteur = ? OR e.secteur IS NULL
    `, [secteur]);
    
    // Récupérer les scores moyens par fonction depuis evaluations_maturite_globale
    // Mapping des fonctions aux colonnes de score
    const functionScoreMapping = {
      'Cybersécurité': 'score_cybersecurite',
      'Maturité digitale': 'score_maturite_digitale', 
      'Gouvernance des données': 'score_gouvernance_donnees',
      'DevSecOps': 'score_devsecops',
      'Innovation numérique': 'score_innovation_numerique'
    };
    
    const scoreColumn = functionScoreMapping[fonction] || 'score_global';
    
    const [scoresData] = await connection.query(`
      SELECT 
        ? as thematique,
        AVG(ev.${scoreColumn}) as score_moyen,
        STDDEV(ev.${scoreColumn}) as ecart_type,
        COUNT(DISTINCT ev.id_evaluation) as nombre_evaluations
      FROM evaluations_maturite_globale ev
      JOIN entreprises e ON ev.id_entreprise = e.id_entreprise
      WHERE (e.secteur = ? OR e.secteur IS NULL)
      AND ev.statut = 'TERMINE'
      AND ev.${scoreColumn} IS NOT NULL
      GROUP BY ?
      HAVING COUNT(ev.${scoreColumn}) >= 1
    `, [fonction, secteur, fonction]);

    logger.debug(`Found benchmark data for ${scoresData.length} function evaluations`);
    
    return {
      entreprises: entreprisesSecteur,
      scores: scoresData
    };

  } finally {
    connection.release();
  }
};

// POST /api/benchmark/analyze - Endpoint principal avec support des motivations
router.post('/analyze', async (req, res) => {
  try {
    const { secteur, fonction, thematiques, id_entreprise } = req.body;
    
    if (!secteur || !fonction || !Array.isArray(thematiques) || thematiques.length === 0) {
      return res.status(400).json({ 
        message: 'Paramètres manquants: secteur, fonction et thematiques sont requis' 
      });
    }

    logger.info(`Benchmark analysis requested for: ${secteur}/${fonction} with ${thematiques.length} thematiques`);

    const cacheKey = `benchmark_${secteur}_${fonction}_${thematiques.sort().join('|')}_${id_entreprise || 'generic'}_${BENCHMARK_MODE}`;
    
    const cachedResult = await getBenchmarkFromCache(cacheKey);
    if (cachedResult) {
      logger.info(`Returning cached benchmark for: ${cacheKey}`);
      return res.json(cachedResult);
    }

    let motivationData = { vision: '', motivations: {} };
    if (id_entreprise) {
      motivationData = await getEnterpriseMotivations(id_entreprise);
    }

    const { entreprises, scores } = await getBenchmarkDataFromDB(secteur, fonction, thematiques);
    
    const thematiquesBenchmark = await Promise.all(
      thematiques.map(async (thematique) => {
        try {
          const realScore = scores.find(s => s.thematique === fonction); // Adapté au nouveau modèle
          const baseScore = realScore ? realScore.score_moyen : 3.0;
          const ecartType = realScore ? (realScore.ecart_type || 0.5) : 0.5;
          
          const recommandationsLLM = await getLLMRecommendations(
            secteur, 
            fonction, 
            thematique, 
            baseScore,
            id_entreprise
          );

          const scoreMoyen = recommandationsLLM.reduce((sum, rec) => sum + rec.score, 0) / recommandationsLLM.length;

          return {
            nom: thematique,
            score_moyen: parseFloat(scoreMoyen.toFixed(2)),
            ecart_type: parseFloat(ecartType.toFixed(2)),
            recommandations_llm: recommandationsLLM,
            donnees_reelles: {
              score_base: realScore ? realScore.score_moyen : null,
              nombre_evaluations: realScore ? realScore.nombre_evaluations : 0
            },
            contexte_motivation: !!id_entreprise
          };
        } catch (error) {
          logger.error(`Erreur analyse thématique ${thematique}:`, error);
          return {
            nom: thematique,
            score_moyen: 3.0,
            ecart_type: 0.5,
            recommandations_llm: [],
            donnees_reelles: { score_base: null, nombre_evaluations: 0 },
            contexte_motivation: false,
            erreur: true
          };
        }
      })
    );

    const benchmarkResult = {
      secteur,
      fonction,
      thematiques: thematiquesBenchmark,
      metadata: {
        nombre_entreprises_secteur: entreprises[0]?.total || 0,
        date_analyse: new Date().toISOString(),
        mode: BENCHMARK_MODE,
        contexte_entreprise: !!id_entreprise
      },
      motivation_context: id_entreprise ? {
        vision: motivationData.vision,
        motivation_fonction: motivationData.motivations[fonction.toLowerCase().replace(/\s+/g, '_')] || null
      } : null
    };

    await saveBenchmarkToCache(cacheKey, benchmarkResult);
    res.json(benchmarkResult);

  } catch (error) {
    logger.error('Erreur lors de l\'analyse benchmark:', error);
    res.status(500).json({ 
      message: 'Erreur lors de l\'analyse benchmark',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/benchmark/motivations/:id_entreprise - Récupérer les motivations d'une entreprise
router.get('/motivations/:id_entreprise', async (req, res) => {
  try {
    const { id_entreprise } = req.params;
    const motivationData = await getEnterpriseMotivations(id_entreprise);
    res.json(motivationData);
  } catch (error) {
    logger.error('Erreur récupération motivations:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des motivations' 
    });
  }
});

// GET /api/benchmark/sectors - Récupérer les secteurs disponibles - CORRIGÉE
router.get('/sectors', async (req, res) => {
  try {
    const [secteurs] = await pool.query(`
      SELECT DISTINCT secteur, COUNT(*) as nombre_entreprises
      FROM entreprises
      WHERE secteur IS NOT NULL AND secteur != ''
      GROUP BY secteur
      ORDER BY secteur
    `);

    res.json({
      secteurs: secteurs.map(s => ({
        nom: s.secteur,
        entreprises: s.nombre_entreprises
      })),
      total: secteurs.length
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des secteurs:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des secteurs' 
    });
  }
});

// GET /api/benchmark/fonctions - Récupérer les fonctions disponibles - CORRIGÉE
router.get('/fonctions', async (req, res) => {
  try {
    const [fonctions] = await pool.query(`
      SELECT nom as fonction, description, code_fonction
      FROM fonctions_maturite_globale
      WHERE actif = 1
      ORDER BY ordre_affichage
    `);

    res.json({
      fonctions: fonctions.map(f => ({
        nom: f.fonction,
        code: f.code_fonction,
        description: f.description
      })),
      total: fonctions.length
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des fonctions:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des fonctions' 
    });
  }
});

// GET /api/benchmark/stats - Statistiques du benchmark - CORRIGÉE
router.get('/stats', async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(DISTINCT e.id_entreprise) as nombre_entreprises,
        COUNT(DISTINCT e.secteur) as nombre_secteurs,
        COUNT(DISTINCT ev.id_evaluation) as nombre_evaluations,
        AVG(ev.score_global) as score_moyen_global
      FROM entreprises e
      LEFT JOIN evaluations_maturite_globale ev ON e.id_entreprise = ev.id_entreprise 
        AND ev.statut = 'TERMINE'
    `);

    const [cacheStats] = await pool.query(`
      SELECT 
        COUNT(*) as entries_cache,
        MIN(created_at) as plus_ancien,
        MAX(created_at) as plus_recent
      FROM benchmark_cache
      WHERE expires_at > NOW()
    `);

    res.json({
      benchmark: {
        entreprises: stats[0].nombre_entreprises || 0,
        secteurs: stats[0].nombre_secteurs || 0,
        evaluations: stats[0].nombre_evaluations || 0,
        score_moyen: parseFloat(stats[0].score_moyen_global || 0).toFixed(2)
      },
      cache: {
        entries_actives: cacheStats[0].entries_cache || 0,
        entries_memoire: benchmarkCache.size,
        plus_ancien: cacheStats[0].plus_ancien,
        plus_recent: cacheStats[0].plus_recent
      },
      mode: BENCHMARK_MODE,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des stats:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des statistiques' 
    });
  }
});

// Fonctions utilitaires pour le cache et LLM (identiques)
const getLLMRecommendations = async (secteur, fonction, thematique, baseScore, id_entreprise = null) => {
  const llmSources = ['ChatGPT', 'Grok', 'Claude'];
  
  let motivationContext = null;
  if (id_entreprise) {
    const { motivations } = await getEnterpriseMotivations(id_entreprise);
    const fonctionMapping = {
      'Cybersécurité': 'cybersecurite',
      'Maturité digitale': 'maturite_digitale',
      'Gouvernance des données': 'gouvernance_donnees',
      'DevSecOps': 'devsecops',
      'Innovation numérique': 'innovation_numerique'
    };
    const codeFonction = fonctionMapping[fonction] || fonction.toLowerCase().replace(/\s+/g, '_');
    motivationContext = motivations[codeFonction];
  }
  
  if (BENCHMARK_MODE === 'real') {
    try {
      let prompt = `Analyse de maturité pour:\n- Secteur: ${secteur}\n- Fonction: ${fonction}\n- Thématique: ${thematique}\n- Score actuel: ${baseScore}/5\n`;
      
      if (motivationContext) {
        prompt += `\nContexte de motivation de l'entreprise:\n`;
        if (motivationContext.motivation) prompt += `- Motivation: ${motivationContext.motivation}\n`;
        if (motivationContext.but) prompt += `- But: ${motivationContext.but}\n`;
        if (motivationContext.objectif) prompt += `- Objectif: ${motivationContext.objectif}\n`;
        if (motivationContext.mesure) prompt += `- Mesure: ${motivationContext.mesure}\n`;
        prompt += `\nAdaptez vos recommandations en tenant compte de ce contexte spécifique.`;
      }
      
      const results = await analyzeMaturiteWithLLMs(prompt);
      return results.analyses || [];
    } catch (error) {
      logger.warn('Erreur appel LLM réel, fallback vers simulation:', error.message);
    }
  }
  
  const recommendations = await Promise.all(
    llmSources.map(source => simulateLLMCall(
      `Analyse ${thematique} pour ${fonction} dans ${secteur}`,
      source,
      baseScore,
      motivationContext
    ))
  );
  
  return recommendations;
};

const saveBenchmarkToCache = async (cacheKey, benchmarkData) => {
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      INSERT INTO benchmark_cache (cache_key, data, created_at, expires_at)
      VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? HOUR))
      ON DUPLICATE KEY UPDATE 
        data = VALUES(data),
        created_at = NOW(),
        expires_at = DATE_ADD(NOW(), INTERVAL ? HOUR)
    `, [cacheKey, JSON.stringify(benchmarkData), 
        process.env.BENCHMARK_CACHE_HOURS || 24,
        process.env.BENCHMARK_CACHE_HOURS || 24]);

    benchmarkCache.set(cacheKey, {
      data: benchmarkData,
      timestamp: Date.now()
    });

    logger.debug(`Benchmark saved to cache: ${cacheKey}`);
  } catch (error) {
    logger.warn('Failed to save benchmark to database cache, using memory only', error);
    benchmarkCache.set(cacheKey, {
      data: benchmarkData,
      timestamp: Date.now()
    });
  } finally {
    connection.release();
  }
};

const getBenchmarkFromCache = async (cacheKey) => {
  const memoryCache = benchmarkCache.get(cacheKey);
  if (memoryCache && (Date.now() - memoryCache.timestamp) < CACHE_DURATION) {
    logger.debug(`Benchmark retrieved from memory cache: ${cacheKey}`);
    return memoryCache.data;
  }

  try {
    const [cached] = await pool.query(`
      SELECT data FROM benchmark_cache 
      WHERE cache_key = ? AND expires_at > NOW()
    `, [cacheKey]);

    if (cached.length > 0) {
      const data = JSON.parse(cached[0].data);
      benchmarkCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      logger.debug(`Benchmark retrieved from database cache: ${cacheKey}`);
      return data;
    }
  } catch (error) {
    logger.warn('Failed to retrieve from database cache', error);
  }

  return null;
};

// DELETE /api/benchmark/cache - Vider le cache
router.delete('/cache', async (req, res) => {
  try {
    benchmarkCache.clear();
    await pool.query('DELETE FROM benchmark_cache WHERE 1=1');
    logger.info('Cache benchmark vidé avec succès');
    res.json({
      message: 'Cache vidé avec succès',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Erreur lors de la suppression du cache:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la suppression du cache' 
    });
  }
});

module.exports = router;