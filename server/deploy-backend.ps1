# deploy-backend.ps1 - Script de déploiement de l'application backend

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "dev",
    
    [Parameter(Mandatory=$false)]
    [string]$ImageTag = "latest"
)

# Configuration depuis les outputs de la Phase 2
$Config = @{
    ECR_REPOSITORY = "637423285771.dkr.ecr.eu-west-1.amazonaws.com/maturity-backend-dev"
    API_URL = "https://api-dev.dev-maturity.e-dsin.fr"
    DATABASE_ENDPOINT = "maturitybackend-dev-databaseb269d8bb-rh7bxy6kcqbb.cd6w86yy2wyp.eu-west-1.rds.amazonaws.com"
    DATABASE_SECRET_ARN = "arn:aws:secretsmanager:eu-west-1:637423285771:secret:maturity-db-dev-1QEB1e"
    CLUSTER_NAME = "maturity-backend-dev"
    SERVICE_NAME = "maturity-backend-dev"
    REGION = "eu-west-1"
    ACCOUNT_ID = "637423285771"
}

Write-Host "🚀 DÉPLOIEMENT BACKEND - ENVIRONNEMENT: $Environment" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green

# Fonction pour vérifier les prérequis
function Test-Prerequisites {
    Write-Host "`n🔧 Vérification des prérequis..." -ForegroundColor Cyan
    
    # Vérifier Docker
    try {
        docker --version | Out-Null
        Write-Host "  Docker installé" -ForegroundColor Green
    } catch {
        Write-Host "❌ Docker non installé ou non accessible" -ForegroundColor Red
        exit 1
    }
    
    # Vérifier AWS CLI
    try {
        aws --version | Out-Null
        Write-Host "  AWS CLI installé" -ForegroundColor Green
    } catch {
        Write-Host "❌ AWS CLI non installé" -ForegroundColor Red
        exit 1
    }
    
    # Vérifier la configuration AWS
    try {
        $AccountId = aws sts get-caller-identity --query Account --output text
        if ($AccountId -eq $Config.ACCOUNT_ID) {
            Write-Host "  AWS configuré - Compte: $AccountId" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Compte AWS différent attendu: $($Config.ACCOUNT_ID), actuel: $AccountId" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Configuration AWS invalide" -ForegroundColor Red
        exit 1
    }
    
    # Vérifier que nous sommes dans le bon répertoire
    if (-not (Test-Path "server/server.js")) {
        Write-Host "❌ Fichier server/server.js non trouvé. Exécutez ce script depuis la racine du projet backend." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "  Tous les prérequis sont satisfaits" -ForegroundColor Green
}

# Fonction pour créer le Dockerfile si nécessaire
function New-DockerfileIfNeeded {
    if (-not (Test-Path "Dockerfile")) {
        Write-Host "`n📦 Création du Dockerfile..." -ForegroundColor Cyan
        
        $DockerfileContent = @"
FROM node:18-alpine AS base

RUN apk add --no-cache curl tini mysql-client && rm -rf /var/cache/apk/*
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001

WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production --silent

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=deps /app/node_modules ./node_modules
COPY server/ ./server/
COPY package*.json ./
COPY scripts/ ./scripts/ 2>/dev/null || true
COPY schema-fixed.sql ./schema-fixed.sql 2>/dev/null || true

RUN mkdir -p /app/logs /app/uploads && \
    chown -R nodeuser:nodejs /app && \
    chmod -R 755 /app

USER nodeuser
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server/server.js"]
"@
        
        $DockerfileContent | Out-File -FilePath "Dockerfile" -Encoding UTF8
        Write-Host "  Dockerfile créé" -ForegroundColor Green
    } else {
        Write-Host "  Dockerfile existant trouvé" -ForegroundColor Green
    }
}

# Fonction pour créer .dockerignore si nécessaire
function New-DockerignoreIfNeeded {
    if (-not (Test-Path ".dockerignore")) {
        Write-Host "`n📝 Création du .dockerignore..." -ForegroundColor Cyan
        
        $DockerignoreContent = @"
node_modules
npm-debug.log*
.env
.env.*
.vscode
.idea
*.swp
.DS_Store
Thumbs.db
.git
.gitignore
README.md
docs/
test/
tests/
__tests__/
*.test.js
*.spec.js
coverage/
logs
*.log
infrastructure/
cdk.out/
*.ts
tsconfig.json
.nyc_output
.npm
.eslintcache
"@
        
        $DockerignoreContent | Out-File -FilePath ".dockerignore" -Encoding UTF8
        Write-Host "  .dockerignore cree" -ForegroundColor Green
    }
}

# Fonction pour se connecter à ECR
function Connect-ECR {
    Write-Host "`n🔐 Connexion à ECR..." -ForegroundColor Cyan
    
    $LoginCommand = aws ecr get-login-password --region $Config.REGION
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Impossible d'obtenir le token ECR" -ForegroundColor Red
        exit 1
    }
    
    $LoginCommand | docker login --username AWS --password-stdin $Config.ECR_REPOSITORY
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Connexion ECR réussie" -ForegroundColor Green
    } else {
        Write-Host "❌ Échec de la connexion ECR" -ForegroundColor Red
        exit 1
    }
}

# Fonction pour builder l'image Docker
function Build-DockerImage {
    Write-Host "`n🔨 Build de l'image Docker..." -ForegroundColor Cyan
    
    $ImageName = "maturity-backend"
    $Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    
    Write-Host "Building image: $ImageName" -ForegroundColor Yellow
    docker build -t $ImageName . --no-cache
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Build Docker réussi" -ForegroundColor Green
        
        # Tagger l'image
        docker tag $ImageName`:latest $Config.ECR_REPOSITORY`:latest
        docker tag $ImageName`:latest $Config.ECR_REPOSITORY`:$Timestamp
        docker tag $ImageName`:latest $Config.ECR_REPOSITORY`:$ImageTag
        
        Write-Host "  Images taguées" -ForegroundColor Green
        return $Timestamp
    } else {
        Write-Host "❌ Échec du build Docker" -ForegroundColor Red
        exit 1
    }
}

# Fonction pour pusher l'image vers ECR
function Push-ImageToECR {
    param([string]$Timestamp)
    
    Write-Host "`n📤 Push vers ECR..." -ForegroundColor Cyan
    
    Write-Host "Pushing: latest" -ForegroundColor Yellow
    docker push $Config.ECR_REPOSITORY`:latest
    
    Write-Host "Pushing: $Timestamp" -ForegroundColor Yellow  
    docker push $Config.ECR_REPOSITORY`:$Timestamp
    
    if ($ImageTag -ne "latest") {
        Write-Host "Pushing: $ImageTag" -ForegroundColor Yellow
        docker push $Config.ECR_REPOSITORY`:$ImageTag
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Push vers ECR réussi" -ForegroundColor Green
    } else {
        Write-Host "❌ Échec du push vers ECR" -ForegroundColor Red
        exit 1
    }
}

# Fonction pour mettre à jour le service ECS
function Update-ECSService {
    Write-Host "`n🚀 Mise à jour du service ECS..." -ForegroundColor Cyan
    
    # Forcer un nouveau déploiement
    aws ecs update-service `
        --cluster $Config.CLUSTER_NAME `
        --service $Config.SERVICE_NAME `
        --force-new-deployment `
        --region $Config.REGION `
        --no-cli-pager
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Déploiement initié" -ForegroundColor Green
        
        Write-Host "⏳ Attente de la stabilisation du service..." -ForegroundColor Yellow
        
        # Surveiller le déploiement
        $StartTime = Get-Date
        $Timeout = 600 # 10 minutes
        
        do {
            Start-Sleep -Seconds 30
            
            $ServiceInfo = aws ecs describe-services `
                --cluster $Config.CLUSTER_NAME `
                --services $Config.SERVICE_NAME `
                --region $Config.REGION `
                --query 'services[0]' | ConvertFrom-Json
            
            $Deployments = $ServiceInfo.deployments
            $PrimaryDeployment = $Deployments | Where-Object { $_.status -eq "PRIMARY" }
            
            if ($PrimaryDeployment) {
                $RunningCount = $PrimaryDeployment.runningCount
                $DesiredCount = $PrimaryDeployment.desiredCount
                $Status = $PrimaryDeployment.status
                
                Write-Host "📊 Status: $Status, Running: $RunningCount/$DesiredCount" -ForegroundColor Yellow
                
                if ($RunningCount -eq $DesiredCount -and $Status -eq "PRIMARY") {
                    Write-Host "  Service déployé et stable!" -ForegroundColor Green
                    break
                }
            }
            
            $ElapsedTime = (Get-Date) - $StartTime
            if ($ElapsedTime.TotalSeconds -gt $Timeout) {
                Write-Host "⚠️ Timeout atteint. Le déploiement continue en arrière-plan." -ForegroundColor Yellow
                break
            }
            
        } while ($true)
        
    } else {
        Write-Host "❌ Échec de la mise à jour du service ECS" -ForegroundColor Red
        exit 1
    }
}

# Fonction pour tester l'API
function Test-API {
    Write-Host "`n🌐 Test de l'API..." -ForegroundColor Cyan
    
    $MaxAttempts = 10
    $Attempt = 1
    
    while ($Attempt -le $MaxAttempts) {
        try {
            Write-Host "Tentative $Attempt/$MaxAttempts..." -ForegroundColor Yellow
            
            $Response = Invoke-WebRequest -Uri "$($Config.API_URL)/health" -Method GET -TimeoutSec 10 -UseBasicParsing
            
            if ($Response.StatusCode -eq 200) {
                Write-Host "  API accessible et répond!" -ForegroundColor Green
                Write-Host "📊 Status Code: $($Response.StatusCode)" -ForegroundColor Green
                return $true
            }
        } catch {
            Write-Host "⚠️ API non accessible: $($_.Exception.Message)" -ForegroundColor Yellow
        }
        
        if ($Attempt -lt $MaxAttempts) {
            Start-Sleep -Seconds 30
        }
        $Attempt++
    }
    
    Write-Host "⚠️ API non accessible après $MaxAttempts tentatives" -ForegroundColor Yellow
    Write-Host "💡 Vérifiez les logs: aws logs tail /ecs/maturity-backend-dev --follow --region $($Config.REGION)" -ForegroundColor Cyan
    return $false
}

# Fonction pour afficher les informations de déploiement
function Show-DeploymentInfo {
    Write-Host "`n📊 INFORMATIONS DE DÉPLOIEMENT" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Green
    
    Write-Host "🌐 API URL: $($Config.API_URL)" -ForegroundColor Cyan
    Write-Host "📦 ECR Repository: $($Config.ECR_REPOSITORY)" -ForegroundColor Cyan
    Write-Host "🏗️ ECS Cluster: $($Config.CLUSTER_NAME)" -ForegroundColor Cyan
    Write-Host "🚀 ECS Service: $($Config.SERVICE_NAME)" -ForegroundColor Cyan
    Write-Host "🗄️ Database: $($Config.DATABASE_ENDPOINT)" -ForegroundColor Cyan
    
    Write-Host "`n💡 COMMANDES UTILES:" -ForegroundColor Yellow
    Write-Host "• Logs en temps réel:" -ForegroundColor White
    Write-Host "  aws logs tail /ecs/maturity-backend-dev --follow --region $($Config.REGION)" -ForegroundColor Gray
    
    Write-Host "• État du service:" -ForegroundColor White
    Write-Host "  aws ecs describe-services --cluster $($Config.CLUSTER_NAME) --services $($Config.SERVICE_NAME) --region $($Config.REGION)" -ForegroundColor Gray
    
    Write-Host "• Redéployer:" -ForegroundColor White
    Write-Host "  aws ecs update-service --cluster $($Config.CLUSTER_NAME) --service $($Config.SERVICE_NAME) --force-new-deployment --region $($Config.REGION)" -ForegroundColor Gray
}

# =============================================
# SCRIPT PRINCIPAL
# =============================================

try {
    # Vérification des prérequis
    Test-Prerequisites
    
    # Création des fichiers Docker si nécessaire
    New-DockerfileIfNeeded
    New-DockerignoreIfNeeded
    
    # Connexion à ECR
    Connect-ECR
    
    # Build de l'image Docker
    $Timestamp = Build-DockerImage
    
    # Push vers ECR
    Push-ImageToECR -Timestamp $Timestamp
    
    # Mise à jour du service ECS
    Update-ECSService
    
    # Test de l'API
    $ApiAccessible = Test-API
    
    # Affichage des informations
    Show-DeploymentInfo
    
    Write-Host "`n🎉 DÉPLOIEMENT TERMINÉ AVEC SUCCÈS!" -ForegroundColor Green
    
    if (-not $ApiAccessible) {
        Write-Host "⚠️ L'API n'est pas encore accessible. Cela peut prendre quelques minutes supplémentaires." -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "`n❌ ERREUR LORS DU DÉPLOIEMENT: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}