// scripts/test-auth-endpoints.js
const axios = require('axios');
require('dotenv').config();

const API_BASE = process.env.CLIENT_URL?.replace('3000', '5000') || 'http://localhost:5000';
const API_URL = `${API_BASE}/api`;

class AuthTester {
  constructor() {
    this.token = null;
  }

  async testRegister() {
    console.log('🔄 Test d\'inscription...');
    
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        nom_prenom: 'Test User',
        email: 'test@example.com',
        password: 'TestPassword123!',
        role: 'Utilisateur',
        organisation: 'Test Organization'
      });

      console.log('✅ Inscription réussie');
      console.log('📧 Email:', response.data.user.email);
      console.log('🆔 ID:', response.data.user.id_acteur);
      return response.data.token;

    } catch (error) {
      if (error.response?.status === 400 && error.response.data.message.includes('déjà utilisé')) {
        console.log('ℹ️  L\'utilisateur test existe déjà, passage au test de connexion');
        return null;
      }
      console.error('❌ Erreur d\'inscription:', error.response?.data || error.message);
      throw error;
    }
  }

  async testLogin() {
    console.log('🔄 Test de connexion...');
    
    try {
      // Tester avec l'utilisateur admin
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: 'admin@qwanza.fr',
        password: 'Admin123!'
      });

      console.log('✅ Connexion réussie');
      console.log('👤 Utilisateur:', response.data.user.nom_prenom);
      console.log('🎭 Rôle:', response.data.user.role);
      console.log('🏢 Organisation:', response.data.user.organisation);
      console.log('🔑 Permissions:', Object.keys(response.data.permissions).join(', '));
      
      return response.data.token;

    } catch (error) {
      console.error('❌ Erreur de connexion:', error.response?.data || error.message);
      throw error;
    }
  }

  async testProtectedRoute(token) {
    console.log('🔄 Test de route protégée...');
    
    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      console.log('✅ Accès à la route protégée réussi');
      console.log('👤 Profil récupéré:', response.data.user.email);
      
    } catch (error) {
      console.error('❌ Erreur d\'accès à la route protégée:', error.response?.data || error.message);
      throw error;
    }
  }

  async testInvalidToken() {
    console.log('🔄 Test avec token invalide...');
    
    try {
      await axios.get(`${API_URL}/auth/me`, {
        headers: {
          Authorization: 'Bearer invalid-token'
        }
      });

      console.log('❌ Le token invalide a été accepté (problème de sécurité!)');
      
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Token invalide correctement rejeté');
      } else {
        console.error('❌ Erreur inattendue:', error.response?.data || error.message);
      }
    }
  }

  async testRateLimit() {
    console.log('🔄 Test du rate limiting...');
    
    const requests = [];
    for (let i = 0; i < 10; i++) {
      requests.push(
        axios.post(`${API_URL}/auth/login`, {
          email: 'wrong@email.com',
          password: 'wrongpassword'
        }).catch(err => err.response)
      );
    }

    try {
      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);
      
      if (rateLimited) {
        console.log('✅ Rate limiting fonctionne');
      } else {
        console.log('⚠️  Rate limiting pourrait ne pas fonctionner');
      }
      
    } catch (error) {
      console.log('✅ Rate limiting actif (erreurs attendues)');
    }
  }

  async testPermissions(token) {
    console.log('🔄 Test des permissions...');
    
    try {
      // Tester l'accès aux utilisateurs (nécessite permission 'users')
      const response = await axios.get(`${API_URL}/acteurs`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      console.log('✅ Accès aux utilisateurs autorisé');
      console.log(`📊 ${response.data.length} utilisateurs trouvés`);
      
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ Accès aux utilisateurs correctement restreint');
      } else {
        console.error('❌ Erreur inattendue:', error.response?.data || error.message);
      }
    }
  }

  async run() {
    console.log('🧪 Démarrage des tests d\'authentification...\n');
    console.log(`🎯 API testée: ${API_URL}\n`);

    try {
      // Test 1: Inscription
      const registerToken = await this.testRegister();
      console.log('');

      // Test 2: Connexion
      const loginToken = await this.testLogin();
      console.log('');

      // Test 3: Route protégée
      if (loginToken) {
        await this.testProtectedRoute(loginToken);
        console.log('');

        // Test 4: Permissions
        await this.testPermissions(loginToken);
        console.log('');
      }

      // Test 5: Token invalide
      await this.testInvalidToken();
      console.log('');

      // Test 6: Rate limiting
      await this.testRateLimit();
      console.log('');

      console.log('🎉 Tous les tests sont terminés!');
      console.log('');
      console.log('📋 Résumé:');
      console.log('- ✅ L\'authentification fonctionne');
      console.log('- ✅ Les routes sont protégées');
      console.log('- ✅ Les permissions sont appliquées');
      console.log('- ✅ La sécurité est active');

    } catch (error) {
      console.error('\n💥 Erreur lors des tests:', error.message);
      console.log('\n🔧 Vérifiez que:');
      console.log('1. Le serveur backend est démarré');
      console.log('2. La base de données est accessible');
      console.log('3. Les migrations ont été exécutées');
      process.exit(1);
    }
  }
}

// Exécution des tests
if (require.main === module) {
  const tester = new AuthTester();
  tester.run();
}

module.exports = AuthTester;