# Script diagnostic spécialisé pour les routes ECS
param(
    [string]$Region = "eu-west-1",
    [string]$Service = "maturity-backend-dev"
)

$ErrorActionPreference = "Continue"

Write-Host "=== DIAGNOSTIC ROUTES ECS ===" -ForegroundColor Green
Write-Host "Date: $(Get-Date)" -ForegroundColor Cyan
Write-Host "Region: $Region" -ForegroundColor Cyan
Write-Host "Service: $Service" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Yellow

# 1. Récupérer les logs récents avec focus sur le chargement des routes
Write-Host "1. Logs de démarrage et chargement des routes..." -ForegroundColor Blue

try {
    # Récupérer les logs des 5 dernières minutes
    $LogOutput = aws logs tail "/ecs/$Service" --since 5m --region $Region 2>$null
    
    if ($LogOutput) {
        Write-Host "Logs récents trouvés:" -ForegroundColor Cyan
        
        # Filtrer les logs importants pour le diagnostic
        $ImportantLogs = @()
        $RouteLoadingLogs = @()
        $ErrorLogs = @()
        
        foreach ($Line in $LogOutput) {
            if ($Line -match "Routes chargées|loadedRoutes|safeLoadRoute|Chargement:|Erreur lors du chargement|Routes.*charge") {
                $RouteLoadingLogs += $Line
            }
            elseif ($Line -match "ERROR|Error|ERREUR|Cannot|Failed|Missing|not found") {
                $ErrorLogs += $Line
            }
            elseif ($Line -match "DÉMARRAGE|démarrage|listening|started|Server|PORT") {
                $ImportantLogs += $Line
            }
        }
        
        # Afficher les logs de démarrage
        if ($ImportantLogs.Count -gt 0) {
            Write-Host ""
            Write-Host "--- LOGS DE DEMARRAGE ---" -ForegroundColor Green
            $ImportantLogs | ForEach-Object { Write-Host $_ -ForegroundColor White }
        }
        
        # Afficher les logs de chargement des routes
        if ($RouteLoadingLogs.Count -gt 0) {
            Write-Host ""
            Write-Host "--- LOGS DE CHARGEMENT DES ROUTES ---" -ForegroundColor Yellow
            $RouteLoadingLogs | ForEach-Object { Write-Host $_ -ForegroundColor Cyan }
        } else {
            Write-Host ""
            Write-Host "WARN - Aucun log de chargement de routes trouvé!" -ForegroundColor Red
            Write-Host "Cela suggère que les routes ne se chargent pas du tout." -ForegroundColor Red
        }
        
        # Afficher les erreurs
        if ($ErrorLogs.Count -gt 0) {
            Write-Host ""
            Write-Host "--- ERREURS DETECTEES ---" -ForegroundColor Red
            $ErrorLogs | ForEach-Object { Write-Host $_ -ForegroundColor Red }
        }
        
        # Rechercher des patterns spécifiques
        Write-Host ""
        Write-Host "--- ANALYSE DES PATTERNS ---" -ForegroundColor Blue
        
        $FullLogText = $LogOutput -join " "
        
        # Vérifier si le serveur démarre
        if ($FullLogText -match "listening|started|démarré") {
            Write-Host "OK - Serveur démarre correctement" -ForegroundColor Green
        } else {
            Write-Host "ERROR - Pas de confirmation de démarrage du serveur" -ForegroundColor Red
        }
        
        # Vérifier les routes chargées
        if ($FullLogText -match "Routes chargées.*(\d+)/(\d+)") {
            $LoadedCount = $Matches[1]
            $TotalCount = $Matches[2]
            Write-Host "Routes chargées: $LoadedCount/$TotalCount" -ForegroundColor Cyan
            
            if ($LoadedCount -eq "0") {
                Write-Host "PROBLEME - Aucune route chargée!" -ForegroundColor Red
            } elseif ($LoadedCount -lt $TotalCount) {
                Write-Host "WARN - Certaines routes ne se chargent pas" -ForegroundColor Yellow
            } else {
                Write-Host "OK - Toutes les routes sont chargées" -ForegroundColor Green
            }
        } else {
            Write-Host "INFO - Pattern de routes chargées non trouvé dans les logs" -ForegroundColor Yellow
        }
        
        # Vérifier les erreurs de modules
        if ($FullLogText -match "Cannot find module|Module not found|Error.*require") {
            Write-Host "ERROR - Erreurs de modules détectées!" -ForegroundColor Red
        }
        
        # Vérifier la base de données
        if ($FullLogText -match "DB.*connected|database.*connected|pool.*ready") {
            Write-Host "OK - Base de données connectée" -ForegroundColor Green
        } elseif ($FullLogText -match "DB.*error|database.*error|pool.*error") {
            Write-Host "ERROR - Problème de base de données détecté" -ForegroundColor Red
        } else {
            Write-Host "INFO - Pas de log de connexion DB trouvé" -ForegroundColor Yellow
        }
        
    } else {
        Write-Host "WARN - Aucun log récent trouvé" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "ERROR - Impossible de récupérer les logs: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Tester les endpoints spécifiquement
Write-Host ""
Write-Host "2. Test détaillé des endpoints..." -ForegroundColor Blue

$ApiUrl = "https://api-dev.dev-maturity.e-dsin.fr"
$Endpoints = @(
    @{ Name = "Health Check"; Url = "/health"; Expected = 200 },
    @{ Name = "API Info"; Url = "/"; Expected = 200 },
    @{ Name = "Benchmark Sectors"; Url = "/api/benchmark/sectors"; Expected = 200 },
    @{ Name = "Enterprise Registration"; Url = "/api/entreprise-registration/sectors"; Expected = 200 },
    @{ Name = "Maturity Evaluation Questions"; Url = "/api/maturity-evaluation/questions"; Expected = 200 },
    @{ Name = "Maturity Global Functions"; Url = "/api/maturity-global-functions"; Expected = 200 },
    @{ Name = "API Health"; Url = "/api/health"; Expected = 200 }
)

foreach ($Endpoint in $Endpoints) {
    try {
        $Response = Invoke-WebRequest -Uri "$ApiUrl$($Endpoint.Url)" -TimeoutSec 10 -UseBasicParsing -SkipHttpErrorCheck
        
        if ($Response.StatusCode -eq $Endpoint.Expected) {
            Write-Host "OK - $($Endpoint.Name): $($Response.StatusCode)" -ForegroundColor Green
        } else {
            Write-Host "ERROR - $($Endpoint.Name): $($Response.StatusCode)" -ForegroundColor Red
            
            # Si c'est une 404, analyser le contenu de la réponse
            if ($Response.StatusCode -eq 404) {
                try {
                    $ResponseData = $Response.Content | ConvertFrom-Json
                    if ($ResponseData.message -eq "Route API non trouvée") {
                        Write-Host "  -> Routes non montées dans Express" -ForegroundColor Yellow
                    }
                    if ($ResponseData.availableEndpoints) {
                        Write-Host "  -> Endpoints disponibles listés" -ForegroundColor Cyan
                    }
                } catch {
                    Write-Host "  -> Réponse 404 non-JSON: $($Response.Content.Substring(0, [Math]::Min(100, $Response.Content.Length)))" -ForegroundColor Yellow
                }
            }
        }
    } catch {
        Write-Host "ERROR - $($Endpoint.Name): Connexion échouée" -ForegroundColor Red
    }
}

# 3. Analyser la configuration actuelle
Write-Host ""
Write-Host "3. Analyse de la configuration ECS..." -ForegroundColor Blue

try {
    # Récupérer les détails du service
    $ServiceDetails = aws ecs describe-services --cluster maturity-backend-dev --services $Service --region $Region --output json | ConvertFrom-Json
    $TaskDefArn = $ServiceDetails.services[0].taskDefinition
    
    Write-Host "Task Definition actuelle: $TaskDefArn" -ForegroundColor Cyan
    
    # Récupérer la définition de tâche
    $TaskDef = aws ecs describe-task-definition --task-definition $TaskDefArn --region $Region --output json | ConvertFrom-Json
    $Container = $TaskDef.taskDefinition.containerDefinitions[0]
    
    Write-Host "Image utilisée: $($Container.image)" -ForegroundColor Cyan
    Write-Host "Commande: $($Container.command -join ' ')" -ForegroundColor Cyan
    
    # Variables d'environnement importantes
    Write-Host "Variables d'environnement clés:" -ForegroundColor Cyan
    $Container.environment | Where-Object { $_.name -in @('NODE_ENV', 'PORT', 'DB_HOST', 'DB_SSL_DISABLED') } | ForEach-Object {
        Write-Host "  $($_.name): $($_.value)" -ForegroundColor White
    }
    
} catch {
    Write-Host "WARN - Impossible d'analyser la configuration ECS: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 4. Recommandations basées sur l'analyse
Write-Host ""
Write-Host "=== DIAGNOSTIC ET RECOMMANDATIONS ===" -ForegroundColor Green

Write-Host ""
Write-Host "Basé sur l'analyse, voici les problèmes potentiels:" -ForegroundColor Yellow

Write-Host "1. DEPENDANCES MANQUANTES:" -ForegroundColor Red
Write-Host "   - Les routes utilisent: express-validator, bcryptjs, uuid" -ForegroundColor White
Write-Host "   - Vérifiez que ces packages sont dans package.json" -ForegroundColor White

Write-Host "2. FICHIERS DE SERVICES MANQUANTS:" -ForegroundColor Red
Write-Host "   - ../services/llmService.js (utilisé par benchmark-route)" -ForegroundColor White
Write-Host "   - ../utils/logger.js" -ForegroundColor White
Write-Host "   - ../db/dbConnection.js" -ForegroundColor White

Write-Host "3. STRUCTURE DE PROJET:" -ForegroundColor Red
Write-Host "   - Les routes sont dans ./routes/ mais les dépendances dans ../" -ForegroundColor White
Write-Host "   - Vérifiez l'arborescence du projet dans l'image Docker" -ForegroundColor White

Write-Host ""
Write-Host "Actions recommandées:" -ForegroundColor Green
Write-Host "1. Vérifiez les logs complets: aws logs tail /ecs/$Service --follow --region $Region" -ForegroundColor White
Write-Host "2. Testez l'image localement avec: docker run -it --entrypoint=/bin/sh maturity-backend-dev" -ForegroundColor White
Write-Host "3. Vérifiez la structure: ls -la /app && ls -la /app/routes && ls -la /app/services" -ForegroundColor White
Write-Host "4. Testez le chargement d'une route: node -e \"console.log(require('./routes/benchmark-route.js'))\"" -ForegroundColor White

Write-Host "=================================" -ForegroundColor Yellow