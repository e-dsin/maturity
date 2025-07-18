// test-roles-system-fixed.js - Script de test corrigé avec authentification
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const API_BASE = 'https://api-dev.dev-maturity.e-dsin.fr/api';

// Configuration de test
const TEST_CONFIG = {
  // Données existantes d'Intel
  intel: {
    enterpriseId: '54068273-d1b8-4bac-9648-3177d81d4854',
    managerEmail: 'hd@intel.com',
    managerName: 'Hans Dewin',
    expectedActorId: '1bc442ef-d1ac-4dd7-b4ea-53f4c210f842',
    // Mot de passe pour Hans Dewin (à adapter si différent)
    managerPassword: 'password123' // ⚠️ À remplacer par le vrai mot de passe
  },
  
  // Nouvelle entreprise de test
  testEnterprise: {
    nom_entreprise: 'Test Company Roles',
    secteur: 'Services et conseils',
    email: 'contact@testcompany.com',
    taille_entreprise: 'PME',
    chiffre_affaires: 1000000,
    effectif_total: 50,
    ville_siege_social: 'Paris',
    pays_siege_social: 'France',
    manager_nom_prenom: 'Test Manager',
    manager_email: 'manager@testcompany.com',
    manager_mot_de_passe: 'TestPassword123!'
  }
};

// Tests de validation avec authentification
class RolesSystemValidator {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: []
    };
    this.authToken = null;
  }

  async runTest(testName, testFunction) {
    this.results.total++;
    console.log(`\n🧪 Test: ${testName}`);
    console.log('='.repeat(50));
    
    try {
      await testFunction();
      this.results.passed++;
      console.log(`✅ ${testName} - RÉUSSI`);
    } catch (error) {
      this.results.failed++;
      this.results.errors.push({ test: testName, error: error.message });
      console.log(`❌ ${testName} - ÉCHEC: ${error.message}`);
    }
  }

  // Fonction d'authentification
  async authenticate() {
    try {
      console.log('🔐 Tentative d\'authentification avec Hans Dewin...');
      
      const loginData = {
        email: TEST_CONFIG.intel.managerEmail,
        password: TEST_CONFIG.intel.managerPassword
      };
      
      const response = await axios.post(`${API_BASE}/auth/login`, loginData);
      
      if (response.data && response.data.token) {
        this.authToken = response.data.token;
        console.log('✅ Authentification réussie');
        return true;
      } else {
        console.log('❌ Pas de token dans la réponse d\'authentification');
        return false;
      }
    } catch (error) {
      console.log(`❌ Échec authentification: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      return false;
    }
  }

  // Helper pour les requêtes authentifiées
  getAuthHeaders() {
    return this.authToken ? {
      'Authorization': `Bearer ${this.authToken}`,
      'Content-Type': 'application/json'
    } : {
      'Content-Type': 'application/json'
    };
  }

  // Test 1: Vérifier l'authentification et les informations de Hans Dewin
  async testAuthentificationAndHansDewin() {
    const isAuthenticated = await this.authenticate();
    
    if (!isAuthenticated) {
      throw new Error('Impossible de s\'authentifier. Vérifiez les identifiants dans TEST_CONFIG.');
    }

    // Récupérer les informations de l'utilisateur connecté
    const response = await axios.get(`${API_BASE}/auth/me`, {
      headers: this.getAuthHeaders()
    });
    
    if (response.status !== 200) {
      throw new Error(`Status HTTP inattendu: ${response.status}`);
    }
    
    const user = response.data.user || response.data;
    
    if (user.email !== TEST_CONFIG.intel.managerEmail) {
      throw new Error(`Email incorrect. Attendu: ${TEST_CONFIG.intel.managerEmail}, Reçu: ${user.email}`);
    }
    
    console.log(`✓ Hans Dewin authentifié avec succès`);
    console.log(`✓ Email: ${user.email}`);
    console.log(`✓ Rôle: ${user.nom_role || user.role}`);
    console.log(`✓ Entreprise: ${user.nom_entreprise}`);
    
    // Sauvegarder les informations utilisateur
    this.currentUser = user;
  }

  // Test 2: Vérifier l'accès aux acteurs de l'entreprise Intel
  async testAccessActeursIntel() {
    if (!this.authToken) {
      throw new Error('Authentification requise');
    }

    const response = await axios.get(
      `${API_BASE}/acteurs/entreprise/${TEST_CONFIG.intel.enterpriseId}`,
      { headers: this.getAuthHeaders() }
    );
    
    if (response.status !== 200) {
      throw new Error(`Status HTTP inattendu: ${response.status}`);
    }
    
    const acteurs = response.data;
    
    if (!Array.isArray(acteurs)) {
      throw new Error('Réponse attendue: tableau d\'acteurs');
    }
    
    // Chercher Hans Dewin dans la liste
    const hansDewin = acteurs.find(a => a.email === TEST_CONFIG.intel.managerEmail);
    
    if (!hansDewin) {
      throw new Error('Hans Dewin non trouvé dans les acteurs de l\'entreprise');
    }
    
    console.log(`✓ ${acteurs.length} acteur(s) trouvé(s) pour Intel`);
    console.log(`✓ Hans Dewin trouvé avec le rôle: ${hansDewin.nom_role}`);
    console.log(`✓ ID acteur Hans: ${hansDewin.id_acteur}`);
  }

  // Test 3: Tester la récupération des acteurs par rôle
  async testActeursByRole() {
    if (!this.authToken) {
      throw new Error('Authentification requise');
    }

    const response = await axios.get(
      `${API_BASE}/acteurs/entreprise/${TEST_CONFIG.intel.enterpriseId}/by-role`,
      { headers: this.getAuthHeaders() }
    );
    
    if (response.status !== 200) {
      throw new Error(`Status HTTP inattendu: ${response.status}`);
    }
    
    const data = response.data;
    
    if (!data.acteurs_par_role) {
      throw new Error('Structure de réponse invalide: acteurs_par_role manquant');
    }
    
    const roles = Object.keys(data.acteurs_par_role);
    console.log(`✓ Rôles trouvés: ${roles.join(', ')}`);
    
    // Vérifier si Hans Dewin a un rôle de Manager
    const managers = data.acteurs_par_role.Manager || data.acteurs_par_role.MANAGER || [];
    const hansAsManager = managers.find(a => a.email === TEST_CONFIG.intel.managerEmail);
    
    if (hansAsManager) {
      console.log(`✓ Hans Dewin trouvé comme Manager`);
    } else {
      console.log(`⚠️ Hans Dewin non trouvé comme Manager. Rôles disponibles: ${roles.join(', ')}`);
    }
  }

  // Test 4: Créer une nouvelle entreprise (si la route est mise à jour)
  async testCreateNewEnterprise() {
    try {
      const response = await axios.post(
        `${API_BASE}/enterprise-registration`,
        TEST_CONFIG.testEnterprise,
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      if (response.status !== 201) {
        throw new Error(`Status HTTP inattendu: ${response.status}`);
      }
      
      const data = response.data;
      
      // Vérifier la structure de la réponse
      if (!data.entreprise || !data.manager) {
        throw new Error('Structure de réponse invalide');
      }
      
      // Sauvegarder pour les tests suivants
      this.testEnterpriseId = data.entreprise.id_entreprise;
      this.testManagerId = data.manager.id_manager || data.manager.id_acteur;
      
      console.log(`✓ Entreprise créée: ${data.entreprise.nom_entreprise}`);
      console.log(`✓ Manager créé: ${data.manager.nom_prenom}`);
      console.log(`✓ ID entreprise: ${this.testEnterpriseId}`);
      console.log(`✓ ID manager: ${this.testManagerId}`);
      
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.message?.includes('existe déjà')) {
        console.log('⚠️ Entreprise de test existe déjà, passage au test suivant');
        return; // Ne pas faire échouer le test si l'entreprise existe déjà
      }
      throw error;
    }
  }

  // Test 5: Tester la création d'invitation (route publique)
  async testInvitationCreation() {
    const invitationData = {
      enterpriseId: TEST_CONFIG.intel.enterpriseId,
      actorId: TEST_CONFIG.intel.expectedActorId,
      nom_prenom: TEST_CONFIG.intel.managerName,
      email: TEST_CONFIG.intel.managerEmail,
      fonction: 'Manager',
      role: 'Manager',
      token: `mgr_test_${Date.now()}`,
      id_evaluation: null
    };
    
    const response = await axios.post(
      `${API_BASE}/evaluation-invite/create`,
      invitationData,
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    if (response.status !== 201) {
      throw new Error(`Status HTTP inattendu: ${response.status}`);
    }
    
    const data = response.data;
    
    if (!data.id_invite) {
      throw new Error('id_invite manquant dans la réponse');
    }
    
    console.log(`✓ Invitation créée pour Hans Dewin`);
    console.log(`✓ ID invitation: ${data.id_invite}`);
    console.log(`✓ Token utilisé: ${invitationData.token}`);
  }

  // Test 6: Vérifier les routes disponibles
  async testAvailableRoutes() {
    const routesToTest = [
      { method: 'GET', path: '/auth/roles', auth: false },
      { method: 'GET', path: '/enterprise-registration/sectors', auth: false },
      { method: 'GET', path: '/enterprise-registration/company-sizes', auth: false }
    ];
    
    let successCount = 0;
    
    for (const route of routesToTest) {
      try {
        const headers = route.auth ? this.getAuthHeaders() : { 'Content-Type': 'application/json' };
        const response = await axios.get(`${API_BASE}${route.path}`, { headers });
        
        if (response.status === 200) {
          successCount++;
          console.log(`✓ Route disponible: ${route.method} ${route.path}`);
        }
      } catch (error) {
        console.log(`⚠️ Route non disponible: ${route.method} ${route.path} (${error.response?.status})`);
      }
    }
    
    if (successCount === 0) {
      throw new Error('Aucune route de test disponible');
    }
    
    console.log(`✓ ${successCount}/${routesToTest.length} routes fonctionnelles`);
  }

  // Exécuter tous les tests
  async runAllTests() {
    console.log('🚀 Démarrage des tests du système de rôles unifié (version corrigée)');
    console.log('='.repeat(70));
    
    await this.runTest(
      'Authentification et vérification Hans Dewin',
      () => this.testAuthentificationAndHansDewin()
    );
    
    await this.runTest(
      'Accès aux acteurs de l\'entreprise Intel',
      () => this.testAccessActeursIntel()
    );
    
    await this.runTest(
      'Récupération des acteurs par rôle',
      () => this.testActeursByRole()
    );
    
    await this.runTest(
      'Création nouvelle entreprise',
      () => this.testCreateNewEnterprise()
    );
    
    await this.runTest(
      'Création d\'invitation',
      () => this.testInvitationCreation()
    );
    
    await this.runTest(
      'Vérification des routes disponibles',
      () => this.testAvailableRoutes()
    );
    
    // Résumé final
    console.log('\n' + '='.repeat(70));
    console.log('📊 RÉSUMÉ DES TESTS');
    console.log('='.repeat(70));
    console.log(`Total: ${this.results.total}`);
    console.log(`✅ Réussis: ${this.results.passed}`);
    console.log(`❌ Échoués: ${this.results.failed}`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ ERREURS:');
      this.results.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.test}: ${error.error}`);
      });
    }
    
    const successRate = (this.results.passed / this.results.total) * 100;
    console.log(`\n📈 Taux de réussite: ${successRate.toFixed(1)}%`);
    
    if (successRate >= 80) {
      console.log('\n🎉 La plupart des tests ont réussi ! Le système fonctionne bien.');
    } else if (successRate >= 50) {
      console.log('\n⚠️ Tests partiellement réussis. Quelques ajustements nécessaires.');
    } else {
      console.log('\n❌ Plusieurs tests ont échoué. Vérifications nécessaires.');
    }

    // Recommandations
    console.log('\n💡 RECOMMANDATIONS:');
    
    if (this.results.errors.some(e => e.error.includes('Authentification'))) {
      console.log('🔐 Vérifiez le mot de passe de Hans Dewin dans TEST_CONFIG');
    }
    
    if (this.results.errors.some(e => e.error.includes('404'))) {
      console.log('🔗 Certaines routes peuvent nécessiter une mise à jour');
    }
    
    if (successRate > 50) {
      console.log('✅ Le système de base fonctionne, optimisations possibles');
    }
  }
}

// Exécution des tests
async function main() {
  const validator = new RolesSystemValidator();
  
  try {
    await validator.runAllTests();
  } catch (error) {
    console.error('❌ Erreur fatale:', error);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main().catch(console.error);
}

module.exports = RolesSystemValidator;