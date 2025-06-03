// scripts/generate-jwt-secret.js
const crypto = require('crypto');

console.log('🔐 Génération de clés sécurisées...\n');

// Générer une clé JWT sécurisée
const jwtSecret = crypto.randomBytes(32).toString('hex');
console.log('JWT_SECRET (à copier dans votre .env):');
console.log(`JWT_SECRET=${jwtSecret}`);
console.log('');

// Générer une clé de session sécurisée
const sessionSecret = crypto.randomBytes(32).toString('hex');
console.log('SESSION_SECRET (optionnel, pour les sessions):');
console.log(`SESSION_SECRET=${sessionSecret}`);
console.log('');

// Générer un mot de passe admin sécurisé
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
let adminPassword = '';
for (let i = 0; i < 16; i++) {
    adminPassword += chars.charAt(Math.floor(Math.random() * chars.length));
}

console.log('ADMIN_PASSWORD sécurisé (suggestion):');
console.log(`ADMIN_PASSWORD=${adminPassword}`);
console.log('');

console.log('✅ Copiez ces valeurs dans votre fichier .env');
console.log('⚠️  Gardez ces clés secrètes et ne les partagez jamais!');