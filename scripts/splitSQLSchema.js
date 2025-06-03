// scripts/splitSQLSchema.js
/**
 * Script pour diviser le fichier schema.sql en plusieurs fichiers:
 * - schema-tables.sql: Contient les tables, index, et vues
 * - schema-procedures.sql: Contient les procédures stockées
 * - schema-triggers.sql: Contient les triggers
 */
const fs = require('fs');
const path = require('path');

// Chemin du fichier schema.sql
const schemaPath = process.argv[2] || path.join(__dirname, '../src/db/schema.sql');
const baseDir = path.dirname(schemaPath);
const baseName = path.basename(schemaPath, '.sql');

// Chemins des fichiers de sortie
const tablesPath = path.join(baseDir, `${baseName}-tables.sql`);
const procsPath = path.join(baseDir, `${baseName}-procedures.sql`);
const triggersPath = path.join(baseDir, `${baseName}-triggers.sql`);

// Lire le fichier
console.log(`Lecture du fichier: ${schemaPath}`);
let schemaContent = fs.readFileSync(schemaPath, 'utf8');

// Extraire les différentes parties du schéma
console.log('Extraction des composants du schéma...');

// 1. Extraire les procédures stockées
const procedures = [];
const procedureRegex = /DELIMITER\s*\/\/\s*(CREATE\s+PROCEDURE\s+.*?END\s*\/\/)\s*DELIMITER\s*;/gs;
let match;

while ((match = procedureRegex.exec(schemaContent)) !== null) {
  // Nettoyer la procédure et remplacer // par ;
  let cleanProc = match[1].replace(/END\s*\/\//g, 'END;');
  procedures.push(cleanProc);
  
  // Retirer la procédure du schéma original
  schemaContent = schemaContent.replace(match[0], '-- PROCEDURE EXTRACTED');
}

// 2. Extraire les triggers
const triggers = [];
const triggerRegex = /DELIMITER\s*\/\/\s*(CREATE\s+TRIGGER\s+.*?END\s*\/\/)\s*DELIMITER\s*;/gs;

while ((match = triggerRegex.exec(schemaContent)) !== null) {
  // Nettoyer le trigger et remplacer // par ;
  let cleanTrigger = match[1].replace(/END\s*\/\//g, 'END;');
  triggers.push(cleanTrigger);
  
  // Retirer le trigger du schéma original
  schemaContent = schemaContent.replace(match[0], '-- TRIGGER EXTRACTED');
}

// 3. Nettoyer le schéma des tables
let tablesContent = schemaContent.replace(/--\s*(PROCEDURE|TRIGGER)\s*EXTRACTED\s*\n/g, '');

// 4. Écrire les fichiers
console.log(`Écriture des tables dans: ${tablesPath}`);
fs.writeFileSync(tablesPath, tablesContent.trim());

console.log(`Écriture des ${procedures.length} procédures dans: ${procsPath}`);
fs.writeFileSync(procsPath, procedures.join('\n\n'));

console.log(`Écriture des ${triggers.length} triggers dans: ${triggersPath}`);
fs.writeFileSync(triggersPath, triggers.join('\n\n'));

console.log('Terminé!');
console.log('\nExécutez maintenant ces commandes dans cet ordre:');
console.log(`1. npx ts-node scripts/update-database.ts --drop --skip-backup --raw-sql --schema=${tablesPath}`);
console.log('2. Exécutez les procédures et triggers manuellement:');
console.log('   mysql -u <user> -p <database> < ' + procsPath);
console.log('   mysql -u <user> -p <database> < ' + triggersPath);
console.log('\nOu utilisez le script initialize-database.js que je vais créer pour vous:');
console.log('   node scripts/initialize-database.js');