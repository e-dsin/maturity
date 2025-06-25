
param(
    [string]$Environment = "dev",
    [switch]$SkipCredentialsCheck,
    [switch]$ForceRebuild
)

$ErrorActionPreference = "Stop"
$Region = "eu-west-1"
$EcrRepo = "maturity-backend-$Environment"

Write-Host "🚀 === DÉPLOIEMENT COMPLET - $Environment ===" -ForegroundColor Cyan

# Fonction pour récupérer les credentials RDS (intégrée)
function Get-RDSCredentialsIntegrated {
    param([string]$Environment)
    
    $SecretName = "maturity-db-$Environment"
    
    Write-Host "`n🔐 Récupération des credentials RDS..." -ForegroundColor Yellow
    
    # Tentative de récupération depuis AWS Secrets Manager
    try {
        $SecretValue = aws secretsmanager get-secret-value --secret-id $SecretName --region $Region --query SecretString --output text 2>$null
        
        if ($SecretValue -and $SecretValue -ne "None" -and $SecretValue -ne "") {
            $SecretData = $SecretValue | ConvertFrom-Json
            Write-Host "✅ Credentials récupérés depuis AWS Secrets Manager" -ForegroundColor Green
            return $SecretData
        }
    } catch {
        Write-Host "⚠️ AWS Secrets Manager non accessible" -ForegroundColor Yellow
    }
    
    # Fallback : vérifier le fichier .env
    if (Test-Path ".env") {
        Write-Host "🔍 Vérification du fichier .env existant..." -ForegroundColor Yellow
        
        $EnvContent = Get-Content ".env" -Raw
        if ($EnvContent -match "DB_PASSWORD=(.+)" -and $EnvContent -match "DB_HOST=(.+)") {
            Write-Host "✅ Configuration trouvée dans .env" -ForegroundColor Green
            
            $DBHost = if ($EnvContent -match "DB_HOST=(.+)") { $Matches[1].Trim() } else { $null }
            $DBUser = if ($EnvContent -match "DB_USER=(.+)") { $Matches[1].Trim() } else { $null }
            $DBPassword = if ($EnvContent -match "DB_PASSWORD=(.+)") { $Matches[1].Trim() } else { $null }
            $DBPort = if ($EnvContent -match "DB_PORT=(.+)") { $Matches[1].Trim() } else { "3306" }
            $DBName = if ($EnvContent -match "DB_NAME=(.+)") { $Matches[1].Trim() } else { "maturity_assessment" }
            
            if ($DBHost -and $DBUser -and $DBPassword) {
                return @{
                    host = $DBHost
                    username = $DBUser
                    password = $DBPassword
                    port = $DBPort
                    database = $DBName
                    source = "env_file"
                }
            }
        }
    }
    
    # Si aucune configuration trouvée, demander à l'utilisateur
    Write-Host "⚠️ Aucune configuration RDS trouvée." -ForegroundColor Yellow
    Write-Host "Exécutez d'abord: .\get-rds-credentials.ps1 -Environment $Environment -SaveToEnv" -ForegroundColor Cyan
    $RunCredentials = Read-Host "Exécuter la récupération des credentials maintenant ? (o/N)"
    
    if ($RunCredentials -eq "o" -or $RunCredentials -eq "O" -or $RunCredentials -eq "oui") {
        # Exécuter le script de récupération des credentials
        if (Test-Path ".\get-rds-credentials.ps1") {
            $Credentials = .\get-rds-credentials.ps1 -Environment $Environment -SaveToEnv
            return $Credentials
        } else {
            Write-Host "❌ Script get-rds-credentials.ps1 non trouvé" -ForegroundColor Red
            throw "Configuration RDS requise"
        }
    } else {
        throw "Configuration RDS requise pour continuer"
    }
}

# Fonction pour vérifier les prérequis
function Test-Prerequisites {
    Write-Host "📋 Vérification des prérequis..." -ForegroundColor Yellow
    
    $Prerequisites = @(
        @{ Name = "AWS CLI"; Command = "aws --version" },
        @{ Name = "Docker"; Command = "docker --version" },
        @{ Name = "Node.js"; Command = "node --version" }
    )
    
    foreach ($Prereq in $Prerequisites) {
        try {
            Invoke-Expression $Prereq.Command | Out-Null
            Write-Host "✅ $($Prereq.Name) OK" -ForegroundColor Green
        } catch {
            Write-Host "❌ $($Prereq.Name) requis" -ForegroundColor Red
            throw "$($Prereq.Name) non trouvé"
        }
    }
}

# Fonction pour vérifier l'accès AWS
function Test-AWSAccess {
    try {
        $AccountId = (aws sts get-caller-identity --query Account --output text)
        $EcrUri = "$AccountId.dkr.ecr.$Region.amazonaws.com/$EcrRepo"
        
        Write-Host "📊 Configuration AWS:" -ForegroundColor Cyan
        Write-Host "  Environment: $Environment" -ForegroundColor White
        Write-Host "  Region: $Region" -ForegroundColor White
        Write-Host "  Account ID: $AccountId" -ForegroundColor White
        Write-Host "  ECR URI: $EcrUri" -ForegroundColor White
        
        return @{
            AccountId = $AccountId
            EcrUri = $EcrUri
        }
    } catch {
        Write-Host "❌ Impossible de récupérer l'Account ID AWS" -ForegroundColor Red
        Write-Host "Vérifiez votre configuration : aws configure" -ForegroundColor Yellow
        throw "Accès AWS requis"
    }
}

# Fonction pour construire et pousser l'image Docker
function Build-AndPushDockerImage {
    param(
        [string]$EcrRepo,
        [string]$EcrUri
    )
    
    Write-Host "`n🐳 === CONSTRUCTION DOCKER ===" -ForegroundColor Cyan
    
    try {
        # Se connecter à ECR
        Write-Host "🔐 Connexion à ECR..." -ForegroundColor Yellow
        $LoginCommand = aws ecr get-login-password --region $Region
        $LoginCommand | docker login --username AWS --password-stdin $EcrUri
        
        # Construire l'image
        Write-Host "🔨 Construction de l'image..." -ForegroundColor Yellow
        docker build -t $EcrRepo .
        
        # Tagger et pousser
        Write-Host "📤 Push de l'image..." -ForegroundColor Yellow
        $Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
        
        docker tag "${EcrRepo}:latest" "${EcrUri}:latest"
        docker tag "${EcrRepo}:latest" "${EcrUri}:$Timestamp"
        
        docker push "${EcrUri}:latest"
        docker push "${EcrUri}:$Timestamp"
        
        Write-Host "✅ Image Docker poussée avec succès" -ForegroundColor Green
        return $Timestamp
    } catch {
        Write-Host "❌ Erreur lors de la construction/push Docker: $_" -ForegroundColor Red
        throw
    }
}

# Fonction pour déployer l'infrastructure
function Deploy-Infrastructure {
    param([string]$Environment)
    
    Write-Host "`n🏗️ === DÉPLOIEMENT INFRASTRUCTURE ===" -ForegroundColor Cyan
    
    try {
        if (-not (Test-Path "infrastructure")) {
            Write-Host "❌ Dossier 'infrastructure' non trouvé" -ForegroundColor Red
            throw "Structure de projet incorrecte"
        }
        
        Push-Location infrastructure
        
        Write-Host "📦 Installation des dépendances..." -ForegroundColor Yellow
        npm install
        
        Write-Host "🔨 Build du projet CDK..." -ForegroundColor Yellow
        npm run build
        
        Write-Host "🚀 Déploiement de la stack..." -ForegroundColor Yellow
        npm run "deploy:$Environment"
        
        Write-Host "✅ Infrastructure déployée avec succès" -ForegroundColor Green
    } catch {
        Write-Host "❌ Erreur lors du déploiement infrastructure: $_" -ForegroundColor Red
        throw
    } finally {
        Pop-Location
    }
}

# Fonction pour attendre la stabilisation du service
function Wait-ServiceStable {
    param([string]$Environment)
    
    Write-Host "`n⏳ === ATTENTE STABILISATION ===" -ForegroundColor Cyan
    
    try {
        Write-Host "⏱️ Attente de la stabilisation du service ECS..." -ForegroundColor Yellow
        
        # Timeout de 10 minutes
        $TimeoutMinutes = 10
        $StartTime = Get-Date
        
        do {
            Start-Sleep -Seconds 30
            $ElapsedMinutes = ((Get-Date) - $StartTime).TotalMinutes
            
            Write-Host "⏱️ Vérification du statut... ($([math]::Round($ElapsedMinutes, 1))/$TimeoutMinutes min)" -ForegroundColor Gray
            
            # Vérifier le statut du service
            $ServiceStatusJson = aws ecs describe-services --cluster "maturity-backend-$Environment" --services "maturity-backend-$Environment" --region $Region --output json 2>$null
            
            if ($ServiceStatusJson) {
                $ServiceInfo = $ServiceStatusJson | ConvertFrom-Json
                if ($ServiceInfo.services -and $ServiceInfo.services.Count -gt 0) {
                    $Service = $ServiceInfo.services[0]
                    Write-Host "📊 Service: $($Service.status) | Running: $($Service.runningCount) | Desired: $($Service.desiredCount)" -ForegroundColor Gray
                    
                    if ($Service.status -eq "ACTIVE" -and $Service.runningCount -eq $Service.desiredCount -and $Service.runningCount -gt 0) {
                        Write-Host "✅ Service ECS stabilisé" -ForegroundColor Green
                        return $true
                    }
                }
            }
            
        } while ($ElapsedMinutes -lt $TimeoutMinutes)
        
        Write-Host "⚠️ Timeout atteint. Service peut encore être en cours de déploiement." -ForegroundColor Yellow
        return $false
        
    } catch {
        Write-Host "⚠️ Erreur lors de l'attente: $($_.Exception.Message)" -ForegroundColor Yellow
        return $false
    }
}

# Fonction de test rapide post-déploiement
function Test-Deployment {
    param([string]$Environment)
    
    Write-Host "`n🧪 === TEST RAPIDE POST-DÉPLOIEMENT ===" -ForegroundColor Cyan
    $ApiUrl = "https://api-$Environment.dev-maturity.e-dsin.fr"
    
    # Test de connectivité DNS
    Write-Host "🔍 Test DNS..." -ForegroundColor Yellow
    try {
        $DNSResult = Resolve-DnsName "api-$Environment.dev-maturity.e-dsin.fr" -ErrorAction SilentlyContinue
        if ($DNSResult) {
            Write-Host "✅ DNS résolu" -ForegroundColor Green
        } else {
            Write-Host "⚠️ DNS non résolu (peut prendre quelques minutes)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️ Test DNS échoué" -ForegroundColor Yellow
    }
    
    # Test de l'endpoint de santé
    Write-Host "🔍 Test endpoint santé..." -ForegroundColor Yellow
    $MaxRetries = 5
    $RetryCount = 0
    
    do {
        try {
            $HealthResult = Invoke-RestMethod -Uri "$ApiUrl/health" -Method GET -TimeoutSec 10
            Write-Host "✅ API accessible et fonctionnelle" -ForegroundColor Green
            Write-Host "📊 Status: $($HealthResult.status)" -ForegroundColor Gray
            return $true
        } catch {
            $RetryCount++
            if ($RetryCount -lt $MaxRetries) {
                Write-Host "⏳ Tentative $RetryCount/$MaxRetries échouée, retry dans 30s..." -ForegroundColor Yellow
                Start-Sleep -Seconds 30
            }
        }
    } while ($RetryCount -lt $MaxRetries)
    
    Write-Host "⚠️ API pas encore accessible. Vérifiez manuellement dans quelques minutes." -ForegroundColor Yellow
    return $false
}

# =============================================================================
# SCRIPT PRINCIPAL
# =============================================================================

try {
    # 1. Vérifier les prérequis
    Test-Prerequisites
    
    # 2. Vérifier l'accès AWS
    $AWSInfo = Test-AWSAccess
    
    # 3. Récupérer et vérifier les credentials RDS (si pas skippé)
    if (-not $SkipCredentialsCheck) {
        try {
            $RDSCredentials = Get-RDSCredentialsIntegrated -Environment $Environment
            Write-Host "✅ Credentials RDS configurés" -ForegroundColor Green
        } catch {
            Write-Host "❌ Erreur credentials RDS: $_" -ForegroundColor Red
            Write-Host "💡 Vous pouvez utiliser -SkipCredentialsCheck pour ignorer cette étape" -ForegroundColor Yellow
            throw
        }
    } else {
        Write-Host "⏭️ Vérification des credentials RDS ignorée" -ForegroundColor Yellow
    }
    
    # 4. Construire et pousser l'image Docker
    $ImageTag = Build-AndPushDockerImage -EcrRepo $EcrRepo -EcrUri $AWSInfo.EcrUri
    
    # 5. Déployer l'infrastructure
    Deploy-Infrastructure -Environment $Environment
    
    # 6. Attendre la stabilisation
    $IsStable = Wait-ServiceStable -Environment $Environment
    
    # 7. Test rapide
    $TestResult = Test-Deployment -Environment $Environment
    
    # 8. Résumé final
    Write-Host "`n🎉 === DÉPLOIEMENT TERMINÉ ===" -ForegroundColor Green
    Write-Host "📊 Résumé:" -ForegroundColor Cyan
    Write-Host "  Environment: $Environment" -ForegroundColor White
    Write-Host "  Image Tag: $ImageTag" -ForegroundColor White
    Write-Host "  Service Stable: $(if($IsStable) { '✅ Oui' } else { '⚠️ En cours' })" -ForegroundColor White
    Write-Host "  API Test: $(if($TestResult) { '✅ Succès' } else { '⚠️ En attente' })" -ForegroundColor White
    
    Write-Host "`n🔗 URLs importantes:" -ForegroundColor Cyan
    Write-Host "  API: https://api-$Environment.dev-maturity.e-dsin.fr" -ForegroundColor Yellow
    Write-Host "  Health: https://api-$Environment.dev-maturity.e-dsin.fr/health" -ForegroundColor Yellow
    Write-Host "  DB Health: https://api-$Environment.dev-maturity.e-dsin.fr/api/health/database" -ForegroundColor Yellow
    
    Write-Host "`n🧪 Pour tester complètement:" -ForegroundColor Cyan
    Write-Host ".\test-deployment.ps1 -Environment $Environment -AdminPassword 'votre_password'" -ForegroundColor Yellow
    
    Write-Host "`n📊 Pour monitoring:" -ForegroundColor Cyan
    Write-Host ".\monitor.ps1 -Environment $Environment -Action status" -ForegroundColor Yellow
    Write-Host ".\monitor.ps1 -Environment $Environment -Action logs" -ForegroundColor Yellow
    
} catch {
    Write-Host "`n❌ === ÉCHEC DU DÉPLOIEMENT ===" -ForegroundColor Red
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
    
    Write-Host "`n🔍 Pour diagnostiquer:" -ForegroundColor Yellow
    Write-Host ".\monitor.ps1 -Environment $Environment -Action status" -ForegroundColor Gray
    Write-Host ".\monitor.ps1 -Environment $Environment -Action errors" -ForegroundColor Gray
    
    exit 1
}