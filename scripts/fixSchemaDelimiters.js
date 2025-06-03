// src/scripts/fixSchemaDelimiters.js
/**
 * Script pour corriger les délimiteurs dans le fichier schema.sql
 * Ce script traite les procédures stockées et triggers pour qu'ils fonctionnent avec update-database.ts
 */
const fs = require('fs');
const path = require('path');

// Chemin du fichier schema.sql
const schemaPath = process.argv[2] || path.join(__dirname, '../src/db/schema.sql');
const outputPath = schemaPath.replace('.sql', '-fixed.sql');

// Lire le fichier
console.log(`Lecture du fichier: ${schemaPath}`);
let schemaContent = fs.readFileSync(schemaPath, 'utf8');

// Rechercher les sections de procédures et triggers (entre DELIMITER // et DELIMITER ;)
console.log('Traitement des délimiteurs...');

// 1. Remplacer les DELIMITER // ... DELIMITER ; pour les procédures stockées
let fixedContent = schemaContent.replace(
  /DELIMITER\s*\/\/\s*(CREATE\s+PROCEDURE.*?)\s*END\s*\/\/\s*DELIMITER\s*;/gs,
  (match, procedureBody) => {
    // Remplacer les // par ; dans le corps de la procédure
    return procedureBody.replace(/END\s*\/\//g, 'END;');
  }
);

// 2. Remplacer les DELIMITER // ... DELIMITER ; pour les triggers
fixedContent = fixedContent.replace(
  /DELIMITER\s*\/\/\s*(CREATE\s+TRIGGER.*?)\s*END\s*\/\/\s*DELIMITER\s*;/gs,
  (match, triggerBody) => {
    // Remplacer les // par ; dans le corps du trigger
    return triggerBody.replace(/END\s*\/\//g, 'END;');
  }
);

// 3. Nettoyer tout délimiteur restant
fixedContent = fixedContent.replace(/DELIMITER\s*[\/;].*?$/gm, '');

// 4. S'assurer que toutes les procédures et triggers se terminent par un point-virgule
fixedContent = fixedContent.replace(/END(\s*)(?!;)/g, 'END$1;');

// Écrire le fichier corrigé
console.log(`Écriture du fichier corrigé: ${outputPath}`);
fs.writeFileSync(outputPath, fixedContent);

console.log('Terminé!');
console.log('Utilisez maintenant ce fichier avec update-database.ts:');
console.log(`npx ts-node scripts/update-database.ts --drop --skip-backup --raw-sql --schema=${outputPath}`);