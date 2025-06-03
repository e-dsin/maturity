// scripts/fix-mui-warnings.js - Script pour corriger automatiquement les warnings MUI
const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Fonction pour corriger les fichiers MUI
function fixMUIWarnings() {
  console.log('🔧 === CORRECTION AUTOMATIQUE DES WARNINGS MUI ===\n');

  // Trouver tous les fichiers .tsx dans le projet
  const files = glob.sync('src/**/*.{tsx,ts}', { ignore: 'node_modules/**' });
  
  let totalFiles = 0;
  let modifiedFiles = 0;

  files.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      let modified = content;
      let hasChanges = false;

      // 1. Corriger Grid item xs={...} md={...} vers nouvelle syntaxe
      const gridItemRegex = /<Grid\s+item\s+([^>]*?)>/g;
      modified = modified.replace(gridItemRegex, (match, attributes) => {
        if (attributes.includes('xs=') || attributes.includes('md=') || attributes.includes('lg=') || attributes.includes('xl=')) {
          hasChanges = true;
          // Supprimer 'item' et garder les autres attributs
          const newAttributes = attributes.replace(/\bitem\b\s*/g, '').trim();
          return `<Grid ${newAttributes}>`;
        }
        return match;
      });

      // 2. Corriger ListItem button vers ListItemButton
      const listItemButtonRegex = /<ListItem\s+([^>]*?)button([^>]*?)>/g;
      modified = modified.replace(listItemButtonRegex, (match, beforeButton, afterButton) => {
        hasChanges = true;
        const allAttributes = (beforeButton + afterButton).trim();
        return `<ListItemButton ${allAttributes}>`;
      });

      // 3. Corriger les imports si ListItemButton est utilisé
      if (modified.includes('<ListItemButton') && !modified.includes('ListItemButton')) {
        const importRegex = /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@mui\/material['"]/;
        modified = modified.replace(importRegex, (match, imports) => {
          hasChanges = true;
          const importList = imports.split(',').map(imp => imp.trim());
          if (!importList.includes('ListItemButton')) {
            importList.push('ListItemButton');
          }
          return `import {\n  ${importList.join(',\n  ')}\n} from '@mui/material'`;
        });
      }

      // 4. Corriger les structures DOM invalides (div dans p)
      // Remplacer Box dans Typography par span
      const divInPRegex = /<Typography([^>]*)>\s*<Box([^>]*)>/g;
      modified = modified.replace(divInPRegex, (match, typographyAttrs, boxAttrs) => {
        hasChanges = true;
        return `<Typography${typographyAttrs}>\n  <Box component="span"${boxAttrs}>`;
      });

      // Écrire le fichier modifié si des changements ont été faits
      if (hasChanges) {
        fs.writeFileSync(file, modified);
        modifiedFiles++;
        console.log(`✅ Corrigé: ${file}`);
      }

      totalFiles++;
    } catch (error) {
      console.log(`❌ Erreur avec ${file}:`, error.message);
    }
  });

  console.log(`\n📊 === RÉSULTATS ===`);
  console.log(`📁 Fichiers analysés: ${totalFiles}`);
  console.log(`✅ Fichiers modifiés: ${modifiedFiles}`);
  console.log(`📝 Changements appliqués:`);
  console.log(`   - Suppression des props 'item' inutiles de Grid`);
  console.log(`   - Conversion ListItem button vers ListItemButton`);
  console.log(`   - Correction des imports MUI`);
  console.log(`   - Correction des structures DOM invalides`);

  if (modifiedFiles > 0) {
    console.log(`\n🔄 Redémarrez votre serveur de développement pour voir les changements`);
  } else {
    console.log(`\n✨ Aucune correction nécessaire !`);
  }
}

// Fonction pour installer glob si nécessaire
function ensureGlob() {
  try {
    require('glob');
  } catch (e) {
    console.log('📦 Installation de glob...');
    const { execSync } = require('child_process');
    execSync('npm install glob --save-dev', { stdio: 'inherit' });
    console.log('✅ glob installé');
  }
}

// Version manuelle pour corriger les fichiers spécifiques connus
function fixKnownFiles() {
  console.log('🔧 === CORRECTION MANUELLE DES FICHIERS CONNUS ===\n');

  const knownFiles = [
    'src/pages/dashboard/index.tsx',
    'src/layouts/MainLayout.tsx',
    // Ajoutez d'autres fichiers spécifiques si nécessaire
  ];

  knownFiles.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        let modified = false;

        // Corrections spécifiques pour le dashboard
        if (file.includes('dashboard/index.tsx')) {
          // Remplacer Grid item xs={12} md={4} par Grid xs={12} md={4}
          content = content.replace(/<Grid\s+item\s+xs={(\d+)}\s*>/g, '<Grid xs={$1}>');
          content = content.replace(/<Grid\s+item\s+xs={(\d+)}\s+md={(\d+)}\s*>/g, '<Grid xs={$1} md={$2}>');
          content = content.replace(/<Grid\s+item\s+md={(\d+)}\s*>/g, '<Grid md={$1}>');
          
          // Remplacer ListItem button par ListItemButton
          content = content.replace(/<ListItem\s+button([^>]*)>/g, '<ListItemButton$1>');
          content = content.replace(/<\/ListItem>/g, '</ListItemButton>');
          
          // Ajouter ListItemButton aux imports si pas présent
          if (content.includes('ListItemButton') && !content.includes('import.*ListItemButton')) {
            content = content.replace(
              /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@mui\/material['"]/,
              (match, imports) => {
                if (!imports.includes('ListItemButton')) {
                  return match.replace('}', ', ListItemButton }');
                }
                return match;
              }
            );
          }
          
          modified = true;
        }

        if (modified) {
          fs.writeFileSync(file, content);
          console.log(`✅ Corrigé: ${file}`);
        }
      } catch (error) {
        console.log(`❌ Erreur avec ${file}:`, error.message);
      }
    } else {
      console.log(`⚠️ Fichier non trouvé: ${file}`);
    }
  });
}

// Exécuter le script
if (require.main === module) {
  try {
    ensureGlob();
    fixMUIWarnings();
  } catch (error) {
    console.log('⚠️ Erreur avec glob, utilisation de la correction manuelle...');
    fixKnownFiles();
  }
}

module.exports = { fixMUIWarnings, fixKnownFiles };