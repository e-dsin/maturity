// server/services/llmService.js
// Service pour les appels réels aux APIs des LLMs

const axios = require('axios');
const logger = require('../utils/logger');

// Configuration des APIs (à mettre dans des variables d'environnement)
const LLM_CONFIG = {
  chatgpt: {
    baseURL: 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4',
    enabled: process.env.CHATGPT_ENABLED === 'true'
  },
  grok: {
    baseURL: 'https://api.x.ai/v1', // URL hypothétique - à ajuster
    apiKey: process.env.GROK_API_KEY,
    model: 'grok-2',
    enabled: process.env.GROK_ENABLED === 'true'
  },
  claude: {
    baseURL: 'https://api.anthropic.com/v1',
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-5-sonnet-20241022',
    enabled: process.env.CLAUDE_ENABLED === 'true'
  }
};

// Fonction générique pour appeler ChatGPT
const callChatGPT = async (prompt) => {
  if (!LLM_CONFIG.chatgpt.enabled || !LLM_CONFIG.chatgpt.apiKey) {
    throw new Error('ChatGPT API not configured');
  }

  try {
    const response = await axios.post(
      `${LLM_CONFIG.chatgpt.baseURL}/chat/completions`,
      {
        model: LLM_CONFIG.chatgpt.model,
        messages: [
          {
            role: "system",
            content: "Tu es un consultant en transformation digitale. Analyse la maturité organisationnelle et fournis des recommandations précises."
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${LLM_CONFIG.chatgpt.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0].message.content;
    return extractScoreAndRecommendation(content, 'ChatGPT');

  } catch (error) {
    logger.error('ChatGPT API error:', error.response?.data || error.message);
    throw error;
  }
};

// Fonction générique pour appeler Grok
const callGrok = async (prompt) => {
  if (!LLM_CONFIG.grok.enabled || !LLM_CONFIG.grok.apiKey) {
    throw new Error('Grok API not configured');
  }

  try {
    // Note: L'API Grok pourrait avoir un format différent
    // À ajuster selon la documentation officielle
    const response = await axios.post(
      `${LLM_CONFIG.grok.baseURL}/chat/completions`,
      {
        model: LLM_CONFIG.grok.model,
        messages: [
          {
            role: "system",
            content: "You are an innovative business transformation advisor. Think disruptively and suggest cutting-edge solutions."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.8
      },
      {
        headers: {
          'Authorization': `Bearer ${LLM_CONFIG.grok.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0].message.content;
    return extractScoreAndRecommendation(content, 'Grok');

  } catch (error) {
    logger.error('Grok API error:', error.response?.data || error.message);
    throw error;
  }
};

// Fonction générique pour appeler Claude
const callClaude = async (prompt) => {
  if (!LLM_CONFIG.claude.enabled || !LLM_CONFIG.claude.apiKey) {
    throw new Error('Claude API not configured');
  }

  try {
    const response = await axios.post(
      `${LLM_CONFIG.claude.baseURL}/messages`,
      {
        model: LLM_CONFIG.claude.model,
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: `Système: Tu es un expert en maturité organisationnelle. Analyse de façon méthodique et propose des améliorations structurées.

${prompt}

Réponds au format suivant:
Score: [X.X]/5
Recommandation: [ta recommandation]
Confiance: [XX]%`
          }
        ]
      },
      {
        headers: {
          'x-api-key': LLM_CONFIG.claude.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        }
      }
    );

    const content = response.data.content[0].text;
    return extractScoreAndRecommendation(content, 'Claude');

  } catch (error) {
    logger.error('Claude API error:', error.response?.data || error.message);
    throw error;
  }
};

// Fonction pour extraire score et recommandation depuis la réponse LLM
const extractScoreAndRecommendation = (content, source) => {
  // Patterns pour extraire le score
  const scoreRegex = /(?:score|rating|note)?\s*:?\s*(\d+\.?\d?)/i;
  const confidenceRegex = /(?:confiance|confidence)\s*:?\s*(\d+)%?/i;
  
  const scoreMatch = content.match(scoreRegex);
  const confidenceMatch = content.match(confidenceRegex);
  
  let score = scoreMatch ? parseFloat(scoreMatch[1]) : 3.5;
  
  // Normaliser le score entre 1 et 5
  if (score > 5) score = score / 2; // Si sur 10, diviser par 2
  if (score < 1) score = 1;
  if (score > 5) score = 5;
  
  let confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 85;
  if (confidence > 100) confidence = 100;
  if (confidence < 50) confidence = 50;

  // Nettoyer la recommandation
  let recommendation = content
    .replace(/(?:score|rating|note)\s*:?\s*\d+\.?\d?/gi, '')
    .replace(/(?:confiance|confidence)\s*:?\s*\d+%?/gi, '')
    .replace(/recommandation\s*:?\s*/gi, '')
    .trim();

  // Si pas de recommandation claire, prendre le contenu complet nettoyé
  if (recommendation.length < 20) {
    recommendation = content.trim();
  }

  return {
    score: parseFloat(score.toFixed(1)),
    recommandation: recommendation,
    niveau_confiance: confidence
  };
};

// Fonction principale pour analyser avec tous les LLMs
const analyzeMaturiteWithLLMs = async (secteur, fonction, thematique, contextScore = null) => {
  const prompt = `
Analyse la maturité de "${thematique}" dans le secteur "${secteur}" pour la fonction "${fonction}".
${contextScore ? `Score actuel observé: ${contextScore}/5` : ''}

Évalue la maturité sur une échelle de 1 à 5:
1 = Initial/Ad hoc
2 = Défini/Documenté  
3 = Mesuré/Standard
4 = Géré/Optimisé
5 = Excellence/Innovation

Fournis:
1. Un score de maturité attendu pour cette thématique dans ce contexte
2. Une recommandation d'amélioration spécifique et actionnable
3. Ton niveau de confiance dans cette évaluation
`;

  const results = {};
  const errors = {};

  // Appeler tous les LLMs en parallèle
  const promises = [
    callChatGPT(prompt).then(result => ({ source: 'ChatGPT', ...result })).catch(err => { errors.ChatGPT = err; return null; }),
    callGrok(prompt).then(result => ({ source: 'Grok', ...result })).catch(err => { errors.Grok = err; return null; }),
    callClaude(prompt).then(result => ({ source: 'Claude', ...result })).catch(err => { errors.Claude = err; return null; })
  ];

  const responses = await Promise.all(promises);
  
  // Filtrer les réponses valides
  const validResponses = responses.filter(r => r !== null);
  
  if (validResponses.length === 0) {
    logger.error('All LLM APIs failed', errors);
    throw new Error('Tous les services LLM sont indisponibles');
  }

  if (validResponses.length < 3) {
    logger.warn(`Only ${validResponses.length}/3 LLM services responded`, errors);
  }

  return validResponses;
};

module.exports = {
  analyzeMaturiteWithLLMs,
  LLM_CONFIG
};