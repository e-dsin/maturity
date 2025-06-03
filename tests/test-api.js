// tests/test-api.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Charger les variables d'environnement
dotenv.config();

// Configuration basée sur le fichier .env
const API_URL = process.env.VITE_API_URL || 'http://localhost:3000/api';
const AUTH_TOKEN = process.env.AUTH_TOKEN || ''; // Utiliser une variable d'environnement pour le token de test
const PORT = process.env.PORT || 3000;
const TEST_RESULTS_DIR = path.join(__dirname, 'results');

// Créer le répertoire des résultats s'il n'existe pas
if (!fs.existsSync(TEST_RESULTS_DIR)) {
  fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
}

// Client API pour les tests
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Ajouter le token d'authentification si disponible
if (AUTH_TOKEN) {
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${AUTH_TOKEN}`;
}

// Fonction pour sauvegarder les résultats
const saveResult = (endpoint, data) => {
  const filename = path.join(TEST_RESULTS_DIR, `${endpoint.replace(/\//g, '_')}.json`);
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(`Résultat sauvegardé dans: ${filename}`);
};

// Fonction pour tester un endpoint et sauvegarder le résultat
const testEndpoint = async (method, endpoint, data = null) => {
  console.log(`\nTest de ${method.toUpperCase()} ${endpoint}`);
  try {
    let response;
    switch (method.toLowerCase()) {
      case 'get':
        response = await apiClient.get(endpoint);
        break;
      case 'post':
        response = await apiClient.post(endpoint, data);
        break;
      case 'put':
        response = await apiClient.put(endpoint, data);
        break;
      case 'delete':
        response = await apiClient.delete(endpoint);
        break;
      default:
        throw new Error(`Méthode ${method} non supportée`);
    }
    
    console.log(`✅ Statut: ${response.status}`);
    console.log(`📊 Données reçues: ${JSON.stringify(response.data).substring(0, 100)}...`);
    
    // Sauvegarder le résultat
    saveResult(`${method}_${endpoint}`, response.data);
    
    return response.data;
  } catch (error) {
    console.error(`❌ Erreur lors du test de ${method.toUpperCase()} ${endpoint}:`);
    if (error.response) {
      console.error(`   Statut: ${error.response.status}`);
      console.error(`   Message: ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(`   Message: ${error.message}`);
    }
    
    return null;
  }
};

// Tests pour les différentes APIs
const runTests = async () => {
  console.log('🚀 Démarrage des tests API...');
  console.log(`🔌 URL de l'API: ${API_URL}`);
  
  // Test de la route de santé
  await testEndpoint('get', '/health');
  
  // Tests des routes d'application
  const applications = await testEndpoint('get', '/applications');
  
  if (applications && applications.length > 0) {
    const idApplication = applications[0].idApplication;
    await testEndpoint('get', `/applications/${idApplication}`);
    
    // Test des routes d'interprétation
    await testEndpoint('get', `/interpretation/application/${idApplication}`);
  }
  
  // Tests des routes de statistiques
  await testEndpoint('get', '/stats/overview');
  
  // Tests des routes d'acteurs
  await testEndpoint('get', '/acteurs');
  
  // Tests des routes de questionnaires
  const questionnaires = await testEndpoint('get', '/questionnaires');
  
  if (questionnaires && questionnaires.length > 0) {
    const idQuestionnaire = questionnaires[0].idQuestionnaire;
    await testEndpoint('get', `/questionnaires/${idQuestionnaire}/questions`);
  }
  
  // Tests des routes de formulaires
  await testEndpoint('get', '/formulaires/recent');
  
  console.log('\n✅ Tests API terminés !');
};

// Exécuter les tests
runTests().catch(error => {
  console.error('❌ Erreur lors de l\'exécution des tests:', error);
});