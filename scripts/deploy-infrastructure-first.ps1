# =============================================================================
# deploy-infrastructure-first.ps1 - Déploiement dans le bon ordre
# =============================================================================

param(
    [string]$Environment = "dev",
    [ValidateSet("infrastructure", "application", "full")]
    [string]$Phase = "full",
    [switch]$SkipTests
)

$ErrorActionPreference = "Stop"
$Region = "eu-west-1"

Write-Host "=== DEPLOIEMENT INFRASTRUCTURE-FIRST - $Environment ===" -ForegroundColor Cyan
Write-Host "Phase: $Phase" -ForegroundColor Yellow

# Fonction pour vérifier les prérequis
function Test-Prerequisites {
    Write-Host "`nVerification des prerequis..." -ForegroundColor Yellow
    
    $Tools = @(
        @{ Name = "AWS CLI"; Command = "aws --version" },
        @{ Name = "Node.js"; Command = "node --version" },
        @{ Name = "Docker"; Command = "docker --version" }
    )
    
    foreach ($Tool in $Tools) {
        try {
            Invoke-Expression $Tool.Command | Out-Null
            Write-Host "  $($Tool.Name): OK" -ForegroundColor Green
        } catch {
            Write-Host "  $($Tool.Name): MANQUANT" -ForegroundColor Red
            throw "$($Tool.Name) requis pour continuer"
        }
    }
    
    # Vérifier l'accès AWS
    try {
        $AccountId = aws sts get-caller-identity --query Account --output text
        Write-Host "  AWS Account: $AccountId" -ForegroundColor Green
        return $AccountId
    } catch {
        Write-Host "  AWS: ERREUR D'ACCES" -ForegroundColor Red
        throw "Configuration AWS requise (aws configure)"
    }
}

# Fonction pour déployer l'infrastructure
function Deploy-Infrastructure {
    param([string]$Environment)
    
    Write-Host "`n=== PHASE 1: DEPLOIEMENT INFRASTRUCTURE ===" -ForegroundColor Cyan
    
    if (-not (Test-Path "infrastructure")) {
        Write-Host "ERREUR: Dossier 'infrastructure' non trouve" -ForegroundColor Red
        Write-Host "Assurez-vous d'etre dans le bon repertoire" -ForegroundColor Yellow
        throw "Structure de projet incorrecte"
    }
    
    try {
        Push-Location infrastructure
        
        Write-Host "Installation des dependances CDK..." -ForegroundColor Yellow
        npm install
        
        Write-Host "Build du projet CDK..." -ForegroundColor Yellow
        npm run build
        
        Write-Host "Deploiement de la stack infrastructure..." -ForegroundColor Yellow
        Write-Host "ATTENTION: Cela peut prendre 10-15 minutes pour creer RDS" -ForegroundColor Yellow
        npm run "deploy:$Environment"
        
        Write-Host "Infrastructure deployee avec succes !" -ForegroundColor Green
        
    } catch {
        Write-Host "ERREUR lors du deploiement infrastructure: $_" -ForegroundColor Red
        throw
    } finally {
        Pop-Location
    }
}

# Fonction pour vérifier que l'infrastructure est prête
function Test-Infrastructure {
    param([string]$Environment)
    
    Write-Host "`nVerification de l'infrastructure deployee..." -ForegroundColor Yellow
    
    # Vérifier RDS
    Write-Host "Verification RDS..." -ForegroundColor Gray
    try {
        $RDSInstances = aws rds describe-db-instances --region $Region --output json | ConvertFrom-Json
        $MaturityDB = $RDSInstances.DBInstances | Where-Object { $_.DBInstanceIdentifier -match "maturity" }
        
        if ($MaturityDB) {
            Write-Host "  RDS trouve: $($MaturityDB.DBInstanceIdentifier)" -ForegroundColor Green
            Write-Host "  Status: $($MaturityDB.DBInstanceStatus)" -ForegroundColor Gray
            Write-Host "  Endpoint: $($MaturityDB.Endpoint.Address)" -ForegroundColor Gray
            
            if ($MaturityDB.DBInstanceStatus -eq "available") {
                Write-Host "  RDS pret !" -ForegroundColor Green
            } else {
                Write-Host "  RDS pas encore pret (status: $($MaturityDB.DBInstanceStatus))" -ForegroundColor Yellow
                return $false
            }
        } else {
            Write-Host "  ERREUR: Aucune instance RDS trouvee" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "  ERREUR lors de la verification RDS: $_" -ForegroundColor Red
        return $false
    }
    
    # Vérifier Secrets Manager
    Write-Host "Verification AWS Secrets Manager..." -ForegroundColor Gray
    try {
        $Secrets = aws secretsmanager list-secrets --region $Region --output json | ConvertFrom-Json
        $MaturitySecret = $Secrets.SecretList | Where-Object { $_.Name -match "maturity.*$Environment" }
        
        if ($MaturitySecret) {
            Write-Host "  Secret trouve: $($MaturitySecret.Name)" -ForegroundColor Green
        } else {
            Write-Host "  ATTENTION: Secret non trouve (normal si premiere creation)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ERREUR lors de la verification Secrets: $_" -ForegroundColor Red
    }
    
    # Vérifier ECR
    Write-Host "Verification ECR Repository..." -ForegroundColor Gray
    try {
        $EcrRepo = aws ecr describe-repositories --repository-names "maturity-backend-$Environment" --region $Region 2>$null
        if ($EcrRepo) {
            Write-Host "  ECR Repository pret" -ForegroundColor Green
        } else {
            Write-Host "  ATTENTION: ECR Repository non trouve" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ECR Repository sera cree automatiquement" -ForegroundColor Gray
    }
    
    return $true
}

# Fonction pour récupérer les credentials RDS
function Get-RDSCredentialsAfterDeploy {
    param([string]$Environment)
    
    Write-Host "`n=== RECUPERATION CREDENTIALS RDS ===" -ForegroundColor Cyan
    
    if (Test-Path ".\get-rds-credentials.ps1") {
        Write-Host "Execution du script de recuperation des credentials..." -ForegroundColor Yellow
        try {
            $Credentials = .\get-rds-credentials.ps1 -Environment $Environment -SaveToEnv
            Write-Host "Credentials RDS recuperes et sauvegardes !" -ForegroundColor Green
            return $Credentials
        } catch {
            Write-Host "ERREUR lors de la recuperation des credentials: $_" -ForegroundColor Red
            Write-Host "Vous devrez configurer manuellement le fichier .env" -ForegroundColor Yellow
            return $null
        }
    } else {
        Write-Host "Script get-rds-credentials.ps1 non trouve" -ForegroundColor Yellow
        Write-Host "Recuperation manuelle des credentials..." -ForegroundColor Yellow
        
        # Récupération manuelle basique
        try {
            $SecretName = "maturity-db-$Environment"
            $SecretValue = aws secretsmanager get-secret-value --secret-id $SecretName --region $Region --query SecretString --output text 2>$null
            
            if ($SecretValue) {
                Write-Host "Credentials recuperes depuis AWS Secrets Manager" -ForegroundColor Green
                return ($SecretValue | ConvertFrom-Json)
            }
        } catch {
            Write-Host "Impossible de recuperer automatiquement les credentials" -ForegroundColor Yellow
        }
        
        return $null
    }
}

# Fonction pour déployer l'application
function Deploy-Application {
    param(
        [string]$Environment,
        [string]$AccountId
    )
    
    Write-Host "`n=== PHASE 2: DEPLOIEMENT APPLICATION ===" -ForegroundColor Cyan
    
    $EcrRepo = "maturity-backend-$Environment"
    $EcrUri = "$AccountId.dkr.ecr.$Region.amazonaws.com/$EcrRepo"
    
    try {
        # Créer le repository ECR s'il n'existe pas
        Write-Host "Verification/Creation du repository ECR..." -ForegroundColor Yellow
        $ExistingRepo = aws ecr describe-repositories --repository-names $EcrRepo --region $Region 2>$null
        if (-not $ExistingRepo) {
            Write-Host "Creation du repository ECR..." -ForegroundColor Yellow
            aws ecr create-repository --repository-name $EcrRepo --region $Region | Out-Null
        }
        
        # Login ECR
        Write-Host "Connexion a ECR..." -ForegroundColor Yellow
        $LoginPassword = aws ecr get-login-password --region $Region
        $LoginPassword | docker login --username AWS --password-stdin $EcrUri
        
        # Build Docker
        Write-Host "Construction de l'image Docker..." -ForegroundColor Yellow
        docker build -t $EcrRepo .
        
        # Tag et Push
        Write-Host "Push de l'image vers ECR..." -ForegroundColor Yellow
        $Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
        docker tag "${EcrRepo}:latest" "${EcrUri}:latest"
        docker tag "${EcrRepo}:latest" "${EcrUri}:$Timestamp"
        docker push "${EcrUri}:latest"
        docker push "${EcrUri}:$Timestamp"
        
        Write-Host "Image Docker deployee: $EcrUri" -ForegroundColor Green
        
        # Redéployer la stack pour créer le service ECS
        Write-Host "Mise a jour de la stack pour deployer le service ECS..." -ForegroundColor Yellow
        Push-Location infrastructure
        npm run "deploy:$Environment"
        Pop-Location
        
        Write-Host "Service ECS deploye !" -ForegroundColor Green
        
    } catch {
        Write-Host "ERREUR lors du deploiement application: $_" -ForegroundColor Red
        throw
    }
}

# Fonction pour attendre que le service soit prêt
function Wait-ServiceReady {
    param([string]$Environment)
    
    Write-Host "`nAttente que le service ECS soit pret..." -ForegroundColor Yellow
    
    $MaxWaitMinutes = 10
    $StartTime = Get-Date
    
    do {
        Start-Sleep -Seconds 30
        $ElapsedMinutes = ((Get-Date) - $StartTime).TotalMinutes
        
        Write-Host "Verification du service ECS... ($([math]::Round($ElapsedMinutes, 1))/$MaxWaitMinutes min)" -ForegroundColor Gray
        
        try {
            $ServiceInfo = aws ecs describe-services --cluster "maturity-backend-$Environment" --services "maturity-backend-$Environment" --region $Region --output json 2>$null
            
            if ($ServiceInfo) {
                $Service = ($ServiceInfo | ConvertFrom-Json).services[0]
                Write-Host "  Status: $($Service.status) | Running: $($Service.runningCount)/$($Service.desiredCount)" -ForegroundColor Gray
                
                if ($Service.status -eq "ACTIVE" -and $Service.runningCount -gt 0) {
                    Write-Host "Service ECS pret !" -ForegroundColor Green
                    return $true
                }
            }
        } catch {
            Write-Host "  Service pas encore cree..." -ForegroundColor Gray
        }
        
    } while ($ElapsedMinutes -lt $MaxWaitMinutes)
    
    Write-Host "Timeout atteint - le service peut encore etre en cours de demarrage" -ForegroundColor Yellow
    return $false
}

# Fonction pour tester l'API
function Test-API {
    param([string]$Environment)
    
    Write-Host "`nTest de l'API deployee..." -ForegroundColor Yellow
    $ApiUrl = "https://api-$Environment.dev-maturity.e-dsin.fr"
    
    $MaxRetries = 5
    for ($i = 1; $i -le $MaxRetries; $i++) {
        try {
            Write-Host "Tentative $i/$MaxRetries : $ApiUrl/health" -ForegroundColor Gray
            $Response = Invoke-RestMethod -Uri "$ApiUrl/health" -Method GET -TimeoutSec 10
            Write-Host "API accessible ! Status: $($Response.status)" -ForegroundColor Green
            return $true
        } catch {
            if ($i -lt $MaxRetries) {
                Write-Host "  Echec, retry dans 30 secondes..." -ForegroundColor Yellow
                Start-Sleep -Seconds 30
            }
        }
    }
    
    Write-Host "API pas encore accessible - verifiez manuellement dans quelques minutes" -ForegroundColor Yellow
    return $false
}

# =============================================================================
# SCRIPT PRINCIPAL
# =============================================================================

try {
    # Vérification des prérequis
    $AccountId = Test-Prerequisites
    
    # Phase 1 : Infrastructure
    if ($Phase -eq "infrastructure" -or $Phase -eq "full") {
        Deploy-Infrastructure -Environment $Environment
        
        Write-Host "`nAttente que l'infrastructure soit completement prete..." -ForegroundColor Yellow
        Start-Sleep -Seconds 60  # Laisser le temps à RDS de se stabiliser
        
        $InfraReady = Test-Infrastructure -Environment $Environment
        if (-not $InfraReady) {
            Write-Host "Infrastructure pas completement prete - vous devrez peut-etre attendre" -ForegroundColor Yellow
        }
        
        # Récupérer les credentials RDS
        $RDSCredentials = Get-RDSCredentialsAfterDeploy -Environment $Environment
    }
    
    # Phase 2 : Application
    if ($Phase -eq "application" -or $Phase -eq "full") {
        # Si on fait juste l'application, vérifier que l'infrastructure existe
        if ($Phase -eq "application") {
            $InfraReady = Test-Infrastructure -Environment $Environment
            if (-not $InfraReady) {
                throw "Infrastructure non prete - executez d'abord la phase 'infrastructure'"
            }
        }
        
        Deploy-Application -Environment $Environment -AccountId $AccountId
        
        $ServiceReady = Wait-ServiceReady -Environment $Environment
        
        if (-not $SkipTests) {
            $ApiWorking = Test-API -Environment $Environment
        }
    }
    
    # Résumé final
    Write-Host "`n=== DEPLOIEMENT TERMINE ===" -ForegroundColor Green
    Write-Host "Environment: $Environment" -ForegroundColor Cyan
    Write-Host "Phase deployee: $Phase" -ForegroundColor Cyan
    
    if ($Phase -eq "full" -or $Phase -eq "application") {
        Write-Host "`nURLs importantes:" -ForegroundColor Yellow
        Write-Host "  API: https://api-$Environment.dev-maturity.e-dsin.fr" -ForegroundColor White
        Write-Host "  Health: https://api-$Environment.dev-maturity.e-dsin.fr/health" -ForegroundColor White
        Write-Host "  DB Health: https://api-$Environment.dev-maturity.e-dsin.fr/api/health/database" -ForegroundColor White
        
        Write-Host "`nProchaines etapes:" -ForegroundColor Yellow
        Write-Host "1. Testez l'API manuellement avec les URLs ci-dessus" -ForegroundColor White
        Write-Host "2. Executez: .\test-deployment.ps1 -Environment $Environment" -ForegroundColor White
        Write-Host "3. Configurez votre frontend avec l'URL API" -ForegroundColor White
    }
    
    if ($Phase -eq "infrastructure") {
        Write-Host "`nProchaines etapes:" -ForegroundColor Yellow
        Write-Host "1. Attendez que RDS soit completement pret (5-10 minutes)" -ForegroundColor White
        Write-Host "2. Executez: .\deploy-infrastructure-first.ps1 -Environment $Environment -Phase application" -ForegroundColor White
    }
    
} catch {
    Write-Host "`n=== ECHEC DU DEPLOIEMENT ===" -ForegroundColor Red
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
    
    Write-Host "`nActions de depannage:" -ForegroundColor Yellow
    Write-Host "1. Verifiez les logs AWS CloudFormation" -ForegroundColor Gray
    Write-Host "2. Verifiez votre configuration AWS (aws configure list)" -ForegroundColor Gray
    Write-Host "3. Verifiez que vous avez les permissions AWS necessaires" -ForegroundColor Gray
    
    exit 1
}