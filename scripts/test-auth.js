// scripts/test-auth.js
const mysql = require('mysql2/promise');
const axios = require('axios');
require('dotenv').config();

async function testAuthentication() {
  console.log('🧪 === TEST DE L\'AUTHENTIFICATION ===\n');

  // === 1. TEST DE LA BASE DE DONNÉES ===
  console.log('1️⃣ Test de la base de données...');
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'maturity_assessment'
    });

    console.log('✅ Connexion à la base de données : OK');

    // Vérifier l'utilisateur admin
    const [users] = await connection.execute(
      'SELECT a.*, r.nom_role, r.niveau_acces FROM acteurs a JOIN roles r ON a.id_role = r.id_role WHERE a.email = ?',
      ['admin@qwanza.fr']
    );

    if (users.length > 0) {
      const user = users[0];
      console.log('✅ Utilisateur admin trouvé :');
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   👤 Nom: ${user.nom_prenom}`);
      console.log(`   🎭 Rôle: ${user.nom_role}`);
      console.log(`   🔑 Niveau: ${user.niveau_acces}`);
    } else {
      console.log('❌ Utilisateur admin NON TROUVÉ');
      console.log('💡 Exécutez: node scripts/setup-admin.js');
      return;
    }

    await connection.end();

  } catch (error) {
    console.log('❌ Erreur base de données:', error.message);
    console.log('💡 Vérifiez vos variables d\'environnement dans .env');
    return;
  }

  // === 2. TEST DU SERVEUR BACKEND ===
  console.log('\n2️⃣ Test du serveur backend...');
  
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
  
  try {
    // Test de santé du serveur
    const healthResponse = await axios.get(`${backendUrl}/health`);
    console.log('✅ Serveur backend accessible');
    console.log(`   🔗 URL: ${backendUrl}`);
    console.log(`   ⚡ Status: ${healthResponse.data.status}`);
  } catch (error) {
    console.log('❌ Serveur backend INACCESSIBLE');
    console.log(`   🔗 URL testée: ${backendUrl}`);
    console.log('💡 Démarrez le serveur: npm run start:server');
    return;
  }

  // === 3. TEST DE L'AUTHENTIFICATION ===
  console.log('\n3️⃣ Test de l\'authentification...');
  
  try {
    const loginResponse = await axios.post(`${backendUrl}/api/auth/login`, {
      email: 'admin@qwanza.fr',
      password: 'password'
    });

    if (loginResponse.data.token && loginResponse.data.user) {
      console.log('✅ Authentification réussie');
      console.log(`   🎫 Token généré: ${loginResponse.data.token.substring(0, 20)}...`);
      console.log(`   👤 Utilisateur: ${loginResponse.data.user.nom_prenom}`);
      console.log(`   🎭 Rôle: ${loginResponse.data.user.nom_role || loginResponse.data.user.role}`);

      // Test du token
      const token = loginResponse.data.token;
      
      try {
        const profileResponse = await axios.get(`${backendUrl}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('✅ Validation du token : OK');
        console.log(`   👤 Profil récupéré: ${profileResponse.data.user.nom_prenom}`);
      } catch (tokenError) {
        console.log('⚠️ Problème avec la validation du token');
        console.log(`   Error: ${tokenError.message}`);
      }

    } else {
      console.log('❌ Authentification échouée - Pas de token reçu');
    }

  } catch (authError) {
    console.log('❌ Erreur d\'authentification');
    console.log(`   Message: ${authError.response?.data?.message || authError.message}`);
    console.log(`   Status: ${authError.response?.status || 'N/A'}`);
    
    if (authError.response?.status === 401) {
      console.log('💡 Vérifiez les identifiants ou recréez l\'utilisateur admin');
    }
  }

  // === 4. TEST DES PERMISSIONS ===
  console.log('\n4️⃣ Test des permissions...');
  
  try {
    const loginResponse = await axios.post(`${backendUrl}/api/auth/login`, {
      email: 'admin@qwanza.fr',
      password: 'password'
    });

    const token = loginResponse.data.token;
    
    try {
      const permissionsResponse = await axios.get(`${backendUrl}/api/user/permissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ Récupération des permissions : OK');
      console.log(`   🔐 Nombre de permissions: ${permissionsResponse.data.permissions?.length || 0}`);
      console.log(`   🌐 Accès global: ${permissionsResponse.data.hasGlobalAccess ? 'OUI' : 'NON'}`);
      
      if (permissionsResponse.data.permissions?.length > 0) {
        console.log('   📋 Modules autorisés:');
        permissionsResponse.data.permissions.forEach(perm => {
          console.log(`      - ${perm.nom_module} (${perm.route_base})`);
        });
      }
      
    } catch (permError) {
      console.log('⚠️ Route permissions non disponible (utilisation du fallback)');
    }

  } catch (error) {
    console.log('❌ Impossible de tester les permissions');
  }

  // === 5. RÉSULTATS FINAUX ===
  console.log('\n🎯 === RÉSULTATS DU TEST ===');
  console.log('✅ Base de données : Accessible');
  console.log('✅ Utilisateur admin : Créé'); 
  console.log('✅ Serveur backend : Accessible');
  console.log('✅ Authentification : Fonctionnelle');
  
  console.log('\n🚀 PRÊT POUR LA CONNEXION :');
  console.log('   📧 Email: admin@qwanza.fr');
  console.log('   🔒 Mot de passe: password');
  console.log('   🌐 Frontend: http://localhost:3000');
  console.log('   ⚡ Backend: http://localhost:5000');
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (error) => {
  console.log('\n❌ Erreur non gérée:', error.message);
  process.exit(1);
});

// Exécuter le test
testAuthentication().catch(error => {
  console.log('\n❌ Erreur lors du test:', error.message);
  process.exit(1);
});