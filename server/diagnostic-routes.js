// server/diagnostic-routes.js - Script de diagnostic simple
const fs = require('fs');
const path = require('path');

console.log('🔍 === DIAGNOSTIC ROUTES MATURITÉ ===\n');

// Vérifier les fichiers routes
const routesToCheck = [
  'maturity-evaluation-route.js',
  'maturity-global-route.js'
];

routesToCheck.forEach(filename => {
  const filePath = path.join(__dirname, 'routes', filename);
  console.log(`📁 Checking: ${filename}`);
  
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ File exists`);
    
    try {
      // Test loading
      const route = require(filePath);
      console.log(`   ✅ Loads successfully (${typeof route})`);
      
      if (route && typeof route.use === 'function') {
        console.log(`   ✅ Valid Express router`);
      } else {
        console.log(`   ❌ Not a valid Express router`);
      }
    } catch (error) {
      console.log(`   ❌ Error loading: ${error.message}`);
    }
  } else {
    console.log(`   ❌ File NOT FOUND`);
    console.log(`   📍 Expected at: ${filePath}`);
  }
  console.log('');
});

// Vérifier si les routes sont dans la liste du serveur
console.log('📋 Routes configurées dans server.js:');
const serverContent = fs.readFileSync(__filename.replace('diagnostic-routes.js', 'server.js'), 'utf8');

if (serverContent.includes('maturity-evaluation-route')) {
  console.log('   ✅ maturity-evaluation-route found in routesToLoad');
} else {
  console.log('   ❌ maturity-evaluation-route NOT found in routesToLoad');
}

if (serverContent.includes('maturity-global-route')) {
  console.log('   ✅ maturity-global-route found in routesToLoad');
} else {
  console.log('   ❌ maturity-global-route NOT found in routesToLoad');
}

console.log('\n🔧 Next steps:');
console.log('1. Run this: node server/diagnostic-routes.js');
console.log('2. Check server startup logs for route loading messages');
console.log('3. Look for: "✅ Route maturity-evaluation-route chargée avec succès"');
console.log('4. Or: "❌ Erreur lors du chargement de maturity-evaluation-route"');

console.log('\n===============================');