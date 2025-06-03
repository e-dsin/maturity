// scripts/check-env.js
require('dotenv').config();
const crypto = require('crypto');

console.log('🔍 Vérification de la configuration d\'environnement...\n');

// Vérifications de base de données
console.log('📊 Configuration de la base de données:');
console.log('   DB_HOST:', process.env.DB_HOST || '❌ Non défini (défaut: localhost)');
console.log('   DB_PORT:', process.env.DB_PORT || '❌ Non défini (défaut: 3306)');
console.log('   DB_USER:', process.env.DB_USER || '❌ Non défini');
console.log('   DB_PASSWORD:', process.env.DB_PASSWORD ? '✅ Défini' : '❌ Non défini');
console.log('   DB_NAME:', process.env.DB_NAME || '❌ Non défini');

console.log('');

// Vérifications JWT
console.log('🔐 Configuration JWT:');
const jwtSecret = process.env.JWT_SECRET;
if (jwtSecret) {
  if (jwtSecret.length >= 32) {
    console.log('   JWT_SECRET: ✅ Défini et sécurisé (' + jwtSecret.length + ' caractères)');
  } else {
    console.log('   JWT_SECRET: ⚠️  Défini mais trop court (' + jwtSecret.length + ' caractères, minimum 32 recommandé)');
  }
} else {
  console.log('   JWT_SECRET: ❌ Non défini');
  console.log('   💡 Générez une clé avec: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
}

console.log('   JWT_EXPIRATION:', process.env.JWT_EXPIRATION || '❌ Non défini (défaut: 24h)');

console.log('');

// Vérifications admin
console.log('👤 Configuration administrateur:');
console.log('   ADMIN_EMAIL:', process.env.ADMIN_EMAIL || '❌ Non défini (défaut: admin@qwanza.fr)');
console.log('   ADMIN_PASSWORD:', process.env.ADMIN_PASSWORD ? '✅ Défini' : '❌ Non défini (défaut: AdminQwanza2025!)');
console.log('   ADMIN_NAME:', process.env.ADMIN_NAME || '❌ Non défini (défaut: Administrateur Système)');

console.log('');

// Vérifications application
console.log('🚀 Configuration application:');
console.log('   NODE_ENV:', process.env.NODE_ENV || '❌ Non défini (défaut: development)');
console.log('   PORT:', process.env.PORT || '❌ Non défini (défaut: 5000)');
console.log('   CLIENT_URL:', process.env.CLIENT_URL || '❌ Non défini (défaut: http://localhost:3000)');

console.log('');

// Générer des valeurs manquantes
console.log('🔧 Valeurs suggérées pour les variables manquantes:');

if (!jwtSecret || jwtSecret.length < 32) {
  const newJwtSecret = crypto.randomBytes(32).toString('hex');
  console.log('JWT_SECRET=' + newJwtSecret);
}

if (!process.env.ADMIN_PASSWORD) {
  console.log('ADMIN_PASSWORD=AdminQwanza2025!');
}

if (!process.env.JWT_EXPIRATION) {
  console.log('JWT_EXPIRATION=24h');
}

if (!process.env.CLIENT_URL) {
  console.log('CLIENT_URL=http://localhost:3000');
}

console.log('');

// Résumé
let criticalIssues = 0;

if (!process.env.DB_USER) criticalIssues++;
if (!process.env.DB_PASSWORD) criticalIssues++;
if (!process.env.DB_NAME) criticalIssues++;
if (!jwtSecret || jwtSecret.length < 32) criticalIssues++;

if (criticalIssues === 0) {
  console.log('✅ Configuration prête pour le déploiement!');
} else {
  console.log(`⚠️  ${criticalIssues} problème(s) critique(s) à corriger avant le déploiement.`);
}

console.log('');
console.log('📋 Prochaines étapes:');
console.log('1. Copiez les valeurs suggérées dans votre fichier .env');
console.log('2. Exécutez: node scripts/setup-local-auth-mariadb.js');
console.log('3. Créez les fichiers d\'authentification');
console.log('4. Démarrez le serveur');