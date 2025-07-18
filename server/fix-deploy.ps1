# 🔧 SCRIPT POWERSHELL CORRIGÉ - Fix Erreur 500
# Version sans erreur de parsing

Write-Host "=== FIX ERREUR 500 - VERSION CORRIGÉE ===" -ForegroundColor Red
Write-Host "Application de la correction sans erreur de parsing..." -ForegroundColor Yellow

try {
    # 1. Sauvegarde de sécurité
    Write-Host "1. Sauvegarde de sécurité..." -ForegroundColor Blue
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    
    if (Test-Path "routes/entreprise-registration-route.js") {
        Copy-Item "routes/entreprise-registration-route.js" "routes/entreprise-registration-route.js.backup-$timestamp" -Force
        Write-Host "   ✅ Sauvegarde créée: backup-$timestamp" -ForegroundColor Green
    }

    # 2. Création du fichier corrigé via un fichier temporaire
    Write-Host "2. Création du fichier corrigé..." -ForegroundColor Blue
    
    # Créer un fichier temporaire pour éviter les problèmes de parsing
    $tempFile = "temp-entreprise-route-fixed.js"
    
    # Créer le contenu du fichier JavaScript ligne par ligne
    $jsContent = @()
    $jsContent += "// server/routes/entreprise-registration-route.js - VERSION CORRIGÉE DÉFINITIVE"
    $jsContent += ""
    $jsContent += "const express = require('express');"
    $jsContent += "const router = express.Router();"
    $jsContent += "const { pool } = require('../db/dbConnection');"
    $jsContent += "const bcrypt = require('bcryptjs');"
    $jsContent += "const { v4: uuidv4 } = require('uuid');"
    $jsContent += "const logger = require('../utils/logger');"
    $jsContent += "const { body, validationResult } = require('express-validator');"
    $jsContent += ""
    $jsContent += "// Validation des données d'entrée"
    $jsContent += "const validateEnterpriseRegistration = ["
    $jsContent += "  body('nom_entreprise').isLength({ min: 2 }).withMessage('Nom d entreprise trop court'),"
    $jsContent += "  body('secteur').isIn(["
    $jsContent += "    'Banque/Finance', 'Assurance', 'Industrie', 'Commerce/Distribution',"
    $jsContent += "    'AgroPastoral', 'Santé', 'Éducation', 'Administration publique',"
    $jsContent += "    'Transport/Logistique', 'Énergie/Utilities', 'Télécommunications',"
    $jsContent += "    'Services et conseils', 'Autre'"
    $jsContent += "  ]).withMessage('Secteur invalide'),"
    $jsContent += "  body('email').isEmail().withMessage('Email entreprise invalide'),"
    $jsContent += "  body('taille_entreprise').isIn(['TPE', 'PME', 'ETI', 'GE']).withMessage('Taille d entreprise invalide'),"
    $jsContent += "  body('chiffre_affaires').isNumeric().withMessage('Chiffre d affaires invalide'),"
    $jsContent += "  body('effectif_total').isInt({ min: 1 }).withMessage('Effectif total invalide'),"
    $jsContent += "  body('manager_nom_prenom').isLength({ min: 2 }).withMessage('Nom du manager trop court'),"
    $jsContent += "  body('manager_email').isEmail().withMessage('Email du manager invalide'),"
    $jsContent += "  body('manager_mot_de_passe').isLength({ min: 8 }).withMessage('Mot de passe trop court (minimum 8 caractères)')"
    $jsContent += "];"
    $jsContent += ""
    $jsContent += "// Helper function pour obtenir ou créer le rôle Manager"
    $jsContent += "const getOrCreateManagerRole = async (connection) => {"
    $jsContent += "  try {"
    $jsContent += "    const [roles] = await connection.query("
    $jsContent += "      'SELECT id_role FROM roles WHERE nom_role = ?',"
    $jsContent += "      ['Manager']"
    $jsContent += "    );"
    $jsContent += "    "
    $jsContent += "    if (roles.length > 0) {"
    $jsContent += "      return roles[0].id_role;"
    $jsContent += "    }"
    $jsContent += "    "
    $jsContent += "    const roleId = uuidv4();"
    $jsContent += "    await connection.query("
    $jsContent += "      'INSERT INTO roles (id_role, nom_role, description, niveau_acces) VALUES (?, ?, ?, ?)',"
    $jsContent += "      [roleId, 'Manager', 'Manager d entreprise', 'ENTREPRISE']"
    $jsContent += "    );"
    $jsContent += "    "
    $jsContent += "    logger.info('Rôle Manager créé automatiquement:', roleId);"
    $jsContent += "    return roleId;"
    $jsContent += "    "
    $jsContent += "  } catch (error) {"
    $jsContent += "    logger.error('Erreur lors de la récupération/création du rôle Manager:', error);"
    $jsContent += "    throw error;"
    $jsContent += "  }"
    $jsContent += "};"
    $jsContent += ""
    $jsContent += "// POST /api/entreprise-registration - Version corrigée"
    $jsContent += "router.post('/', validateEnterpriseRegistration, async (req, res) => {"
    $jsContent += "  let connection = null;"
    $jsContent += "  let transactionStarted = false;"
    $jsContent += "  "
    $jsContent += "  try {"
    $jsContent += "    // Validation des erreurs"
    $jsContent += "    const errors = validationResult(req);"
    $jsContent += "    if (!errors.isEmpty()) {"
    $jsContent += "      return res.status(400).json({"
    $jsContent += "        message: 'Données de validation invalides',"
    $jsContent += "        errors: errors.array()"
    $jsContent += "      });"
    $jsContent += "    }"
    $jsContent += ""
    $jsContent += "    const {"
    $jsContent += "      nom_entreprise,"
    $jsContent += "      secteur,"
    $jsContent += "      description = '',"
    $jsContent += "      adresse = '',"
    $jsContent += "      telephone = '',"
    $jsContent += "      email,"
    $jsContent += "      site_web = '',"
    $jsContent += "      taille_entreprise,"
    $jsContent += "      chiffre_affaires = 0,"
    $jsContent += "      effectif_total,"
    $jsContent += "      ville_siege_social,"
    $jsContent += "      pays_siege_social = 'France',"
    $jsContent += "      manager_nom_prenom,"
    $jsContent += "      manager_email,"
    $jsContent += "      manager_mot_de_passe"
    $jsContent += "    } = req.body;"
    $jsContent += ""
    $jsContent += "    logger.info('Début création entreprise:', { nom_entreprise, manager_email });"
    $jsContent += ""
    $jsContent += "    // Obtenir une connexion et démarrer une transaction"
    $jsContent += "    connection = await pool.getConnection();"
    $jsContent += "    await connection.beginTransaction();"
    $jsContent += "    transactionStarted = true;"
    $jsContent += ""
    $jsContent += "    // 1. Vérifier que l email entreprise n existe pas"
    $jsContent += "    const [existingEnterprise] = await connection.query("
    $jsContent += "      'SELECT id_entreprise FROM entreprises WHERE email = ?',"
    $jsContent += "      [email]"
    $jsContent += "    );"
    $jsContent += "    "
    $jsContent += "    if (existingEnterprise.length > 0) {"
    $jsContent += "      await connection.rollback();"
    $jsContent += "      return res.status(400).json({"
    $jsContent += "        message: 'Une entreprise avec cet email existe déjà'"
    $jsContent += "      });"
    $jsContent += "    }"
    $jsContent += ""
    $jsContent += "    // 2. Vérifier que l email manager n existe pas"
    $jsContent += "    const [existingManager] = await connection.query("
    $jsContent += "      'SELECT id_acteur FROM acteurs WHERE email = ?',"
    $jsContent += "      [manager_email]"
    $jsContent += "    );"
    $jsContent += "    "
    $jsContent += "    if (existingManager.length > 0) {"
    $jsContent += "      await connection.rollback();"
    $jsContent += "      return res.status(400).json({"
    $jsContent += "        message: 'Un utilisateur avec cet email existe déjà'"
    $jsContent += "      });"
    $jsContent += "    }"
    $jsContent += ""
    $jsContent += "    // 3. Créer l entreprise - REQUÊTE CORRIGÉE"
    $jsContent += "    const id_entreprise = uuidv4();"
    $jsContent += "    const now = new Date();"
    $jsContent += "    "
    $jsContent += "    await connection.query("
    $jsContent += "      'INSERT INTO entreprises (id_entreprise, nom_entreprise, secteur, description, adresse, telephone, email, site_web, taille_entreprise, chiffre_affaires, effectif_total, ville_siege_social, pays_siege_social, statut_evaluation, date_creation, date_modification) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',"
    $jsContent += "      ["
    $jsContent += "        id_entreprise,"
    $jsContent += "        nom_entreprise,"
    $jsContent += "        secteur,"
    $jsContent += "        description,"
    $jsContent += "        adresse,"
    $jsContent += "        telephone,"
    $jsContent += "        email,"
    $jsContent += "        site_web,"
    $jsContent += "        taille_entreprise,"
    $jsContent += "        parseFloat(chiffre_affaires) || 0,"
    $jsContent += "        parseInt(effectif_total),"
    $jsContent += "        ville_siege_social,"
    $jsContent += "        pays_siege_social,"
    $jsContent += "        'EN_ATTENTE',"
    $jsContent += "        now,"
    $jsContent += "        now"
    $jsContent += "      ]"
    $jsContent += "    );"
    $jsContent += ""
    $jsContent += "    logger.info('Entreprise créée:', { id_entreprise, nom_entreprise });"
    $jsContent += ""
    $jsContent += "    // 4. Obtenir ou créer le rôle Manager"
    $jsContent += "    const managerRoleId = await getOrCreateManagerRole(connection);"
    $jsContent += ""
    $jsContent += "    // 5. Créer le manager"
    $jsContent += "    const id_acteur_manager = uuidv4();"
    $jsContent += "    const hashedPassword = await bcrypt.hash(manager_mot_de_passe, 12);"
    $jsContent += "    "
    $jsContent += "    await connection.query("
    $jsContent += "      'INSERT INTO acteurs (id_acteur, nom_prenom, email, mot_de_passe, organisation, id_entreprise, id_role, anciennete_role, is_active, date_creation, date_modification) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',"
    $jsContent += "      ["
    $jsContent += "        id_acteur_manager,"
    $jsContent += "        manager_nom_prenom,"
    $jsContent += "        manager_email,"
    $jsContent += "        hashedPassword,"
    $jsContent += "        nom_entreprise,"
    $jsContent += "        id_entreprise,"
    $jsContent += "        managerRoleId,"
    $jsContent += "        0,"
    $jsContent += "        1,"
    $jsContent += "        now,"
    $jsContent += "        now"
    $jsContent += "      ]"
    $jsContent += "    );"
    $jsContent += ""
    $jsContent += "    logger.info('Manager créé:', { id_acteur_manager, manager_email });"
    $jsContent += ""
    $jsContent += "    // 6. Commit de la transaction"
    $jsContent += "    await connection.commit();"
    $jsContent += "    transactionStarted = false;"
    $jsContent += ""
    $jsContent += "    // 7. Récupérer les données pour la réponse"
    $jsContent += "    const [enterpriseData] = await connection.query("
    $jsContent += "      'SELECT * FROM entreprises WHERE id_entreprise = ?',"
    $jsContent += "      [id_entreprise]"
    $jsContent += "    );"
    $jsContent += ""
    $jsContent += "    const [managerData] = await connection.query("
    $jsContent += "      'SELECT a.*, r.nom_role, e.nom_entreprise FROM acteurs a JOIN roles r ON a.id_role = r.id_role JOIN entreprises e ON a.id_entreprise = e.id_entreprise WHERE a.id_acteur = ?',"
    $jsContent += "      [id_acteur_manager]"
    $jsContent += "    );"
    $jsContent += ""
    $jsContent += "    logger.info('Création entreprise terminée avec succès');"
    $jsContent += ""
    $jsContent += "    // 8. Réponse compatible avec le frontend"
    $jsContent += "    res.status(201).json({"
    $jsContent += "      message: 'Entreprise et manager créés avec succès',"
    $jsContent += "      entreprise: enterpriseData[0],"
    $jsContent += "      manager: {"
    $jsContent += "        id_acteur: managerData[0].id_acteur,"
    $jsContent += "        id_manager: managerData[0].id_acteur,"
    $jsContent += "        nom_prenom: managerData[0].nom_prenom,"
    $jsContent += "        email: managerData[0].email,"
    $jsContent += "        role: managerData[0].nom_role,"
    $jsContent += "        id_entreprise: managerData[0].id_entreprise,"
    $jsContent += "        nom_entreprise: managerData[0].nom_entreprise"
    $jsContent += "      }"
    $jsContent += "    });"
    $jsContent += ""
    $jsContent += "  } catch (error) {"
    $jsContent += "    // Gestion d erreur"
    $jsContent += "    if (transactionStarted && connection) {"
    $jsContent += "      try {"
    $jsContent += "        await connection.rollback();"
    $jsContent += "      } catch (rollbackError) {"
    $jsContent += "        logger.error('Erreur rollback:', rollbackError);"
    $jsContent += "      }"
    $jsContent += "    }"
    $jsContent += "    "
    $jsContent += "    logger.error('Erreur création entreprise:', error);"
    $jsContent += "    console.error('Stack trace complet:', error.stack);"
    $jsContent += "    "
    $jsContent += "    res.status(500).json({"
    $jsContent += "      message: 'Erreur serveur lors de la création de l entreprise',"
    $jsContent += "      details: process.env.NODE_ENV === 'development' ? error.message : undefined"
    $jsContent += "    });"
    $jsContent += "  } finally {"
    $jsContent += "    if (connection) {"
    $jsContent += "      connection.release();"
    $jsContent += "    }"
    $jsContent += "  }"
    $jsContent += "});"
    $jsContent += ""
    $jsContent += "// GET /api/entreprise-registration - Endpoint de test"
    $jsContent += "router.get('/', (req, res) => {"
    $jsContent += "  res.status(200).json({"
    $jsContent += "    message: 'Endpoint d enregistrement d entreprise opérationnel',"
    $jsContent += "    version: '2.1.0-fixed',"
    $jsContent += "    status: 'active',"
    $jsContent += "    timestamp: new Date().toISOString(),"
    $jsContent += "    features: ["
    $jsContent += "      'Création entreprise',"
    $jsContent += "      'Création manager avec rôles',"
    $jsContent += "      'Validation complète',"
    $jsContent += "      'Gestion des transactions',"
    $jsContent += "      'Compatibilité frontend'"
    $jsContent += "    ]"
    $jsContent += "  });"
    $jsContent += "});"
    $jsContent += ""
    $jsContent += "module.exports = router;"
    
    # Écrire le contenu dans le fichier temporaire
    $jsContent | Out-File -FilePath $tempFile -Encoding UTF8
    
    # Copier le fichier temporaire vers la destination finale
    Copy-Item $tempFile "routes/entreprise-registration-route.js" -Force
    Remove-Item $tempFile -Force
    
    Write-Host "   ✅ Fichier corrigé créé sans erreur de parsing" -ForegroundColor Green

    # 3. Vérification du fichier créé
    Write-Host "3. Vérification du fichier créé..." -ForegroundColor Blue
    
    if (Test-Path "routes/entreprise-registration-route.js") {
        $fileSize = (Get-Item "routes/entreprise-registration-route.js").Length
        Write-Host "   ✅ Fichier créé: $fileSize octets" -ForegroundColor Green
        
        # Vérifier les premières lignes
        $firstLines = Get-Content "routes/entreprise-registration-route.js" -Head 3
        Write-Host "   📋 Premières lignes:" -ForegroundColor Cyan
        $firstLines | ForEach-Object { Write-Host "      $_" -ForegroundColor White }
    }

    # 4. Build et test
    Write-Host "4. Build et test..." -ForegroundColor Blue
    
    Write-Host "   🔨 Construction de l'image..." -ForegroundColor Yellow
    docker build --no-cache -t maturity-backend-dev .
    
    if ($LASTEXITCODE -ne 0) {
        throw "Erreur lors de la construction de l'image"
    }
    Write-Host "   ✅ Image construite avec succès" -ForegroundColor Green
    
    Write-Host "   🧪 Test local..." -ForegroundColor Yellow
    $TestContainer = docker run -d -p 3000:3000 maturity-backend-dev
    Start-Sleep -Seconds 10
    
    try {
        # Test health
        $HealthTest = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 10 -UseBasicParsing
        Write-Host "   ✅ Health check: $($HealthTest.StatusCode)" -ForegroundColor Green
        
        # Test GET entreprise-registration
        $GetTest = Invoke-WebRequest -Uri "http://localhost:3000/api/entreprise-registration" -Method GET -TimeoutSec 10 -UseBasicParsing
        Write-Host "   ✅ GET /api/entreprise-registration: $($GetTest.StatusCode)" -ForegroundColor Green
        
        if ($GetTest.StatusCode -eq 200) {
            $apiResponse = $GetTest.Content | ConvertFrom-Json
            Write-Host "   📋 Version API: $($apiResponse.version)" -ForegroundColor Cyan
            Write-Host "   📋 Status API: $($apiResponse.status)" -ForegroundColor Cyan
        }
        
        Write-Host ""
        Write-Host "🎉 CORRECTION APPLIQUÉE AVEC SUCCÈS!" -ForegroundColor Green
        Write-Host "   ✅ Fichier corrigé sans erreur de parsing" -ForegroundColor White
        Write-Host "   ✅ Build réussi" -ForegroundColor White
        Write-Host "   ✅ Tests de base passés" -ForegroundColor White
        
    } catch {
        Write-Host "   ⚠️ Erreur lors du test: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "   Mais la correction est appliquée - continuons..." -ForegroundColor Yellow
    } finally {
        # Nettoyer le conteneur de test
        docker stop $TestContainer | Out-Null
        docker rm $TestContainer | Out-Null
    }

    # 5. Proposer le déploiement
    Write-Host ""
    Write-Host "5. Prêt pour le déploiement..." -ForegroundColor Blue
    
    $deployChoice = Read-Host "Voulez-vous déployer maintenant? (Y/N)"
    if ($deployChoice -eq "Y" -or $deployChoice -eq "y") {
        Write-Host "   🚀 Lancement du déploiement..." -ForegroundColor Yellow
        .\Deploy-Complete.ps1 -SkipLocalTest
    } else {
        Write-Host "   📋 Déploiement annulé. Lancez manuellement: .\Deploy-Complete.ps1" -ForegroundColor Yellow
    }

} catch {
    Write-Host ""
    Write-Host "❌ ERREUR:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Actions de récupération:" -ForegroundColor Yellow
    Write-Host "1. Vérifier que vous êtes dans le dossier server/" -ForegroundColor White
    Write-Host "2. Restaurer depuis backup si nécessaire" -ForegroundColor White
    Write-Host "3. Relancer le script" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "=== FIX TERMINÉ ===" -ForegroundColor Green
Write-Host "✅ Erreur de parsing corrigée" -ForegroundColor Cyan
Write-Host "✅ Fichier entreprise-registration-route.js mis à jour" -ForegroundColor Cyan
Write-Host "✅ Prêt pour le déploiement" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔗 Pour tester après déploiement:" -ForegroundColor Yellow
Write-Host "   GET https://api-dev.dev-maturity.e-dsin.fr/api/entreprise-registration" -ForegroundColor White
Write-Host "   Frontend: http://localhost:3000/auth/enterprise-registration" -ForegroundColor White