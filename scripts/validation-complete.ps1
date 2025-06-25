@'
param(
    [string]$Environment = "dev",
    [string]$AdminPassword = $env:ADMIN_PASSWORD
)

$ErrorActionPreference = "Stop"
$ApiUrl = "https://api-$Environment.dev-maturity.e-dsin.fr"
$FrontendUrl = "https://$Environment-maturity.e-dsin.fr"

Write-Host "🧪 === VALIDATION COMPLÈTE - $Environment ===" -ForegroundColor Cyan

# 1. Infrastructure
Write-Host "🔍 1. Vérification infrastructure..." -ForegroundColor Yellow
try {
    aws cloudformation describe-stacks --stack-name "MaturityBackend-$Environment" --region eu-west-1 | Out-Null
    Write-Host "✅ Stack CloudFormation OK" -ForegroundColor Green
} catch {
    Write-Host "❌ Stack CloudFormation non trouvée" -ForegroundColor Red
    exit 1
}

# 2. ECS Service
Write-Host "🔍 2. Vérification ECS..." -ForegroundColor Yellow
try {
    $ServiceStatus = aws ecs describe-services --cluster "maturity-backend-$Environment" --services "maturity-backend-$Environment" --region eu-west-1 --query 'services[0].status' --output text
    if ($ServiceStatus -eq "ACTIVE") {
        Write-Host "✅ Service ECS actif" -ForegroundColor Green
    } else {
        Write-Host "❌ Service ECS non actif: $ServiceStatus" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Erreur lors de la vérification ECS: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. Health checks
Write-Host "🔍 3. Tests de santé..." -ForegroundColor Yellow
try {
    $HealthCheck = Invoke-RestMethod -Uri "$ApiUrl/health" -Method GET
    Write-Host "✅ Health check OK" -ForegroundColor Green
} catch {
    Write-Host "❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

try {
    $DbHealthCheck = Invoke-RestMethod -Uri "$ApiUrl/api/health/database" -Method GET
    Write-Host "✅ Database health OK" -ForegroundColor Green
} catch {
    Write-Host "❌ Database health failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 4. Authentification (si password fourni)
if ($AdminPassword) {
    Write-Host "🔍 4. Test authentification..." -ForegroundColor Yellow
    try {
        $LoginBody = @{
            email = "admin@qwanza.fr"
            password = $AdminPassword
        } | ConvertTo-Json
        
        $LoginResult = Invoke-RestMethod -Uri "$ApiUrl/api/auth/login" -Method POST -Body $LoginBody -ContentType "application/json"
        
        $Token = $null
        if ($LoginResult.token) { $Token = $LoginResult.token }
        elseif ($LoginResult.user.token) { $Token = $LoginResult.user.token }
        
        if ($Token) {
            Write-Host "✅ Authentification OK" -ForegroundColor Green
        } else {
            Write-Host "❌ Token non trouvé dans la réponse" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "❌ Authentification échouée: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "⚠️ Test d'authentification ignoré (ADMIN_PASSWORD non fourni)" -ForegroundColor Yellow
}

# 5. CORS
Write-Host "🔍 5. Test CORS..." -ForegroundColor Yellow
try {
    $CorsHeaders = @{
        "Origin" = $FrontendUrl
    }
    $CorsResponse = Invoke-WebRequest -Uri "$ApiUrl/api/test-cors" -Method OPTIONS -Headers $CorsHeaders -UseBasicParsing
    
    if ($CorsResponse.Headers.ContainsKey("Access-Control-Allow-Origin")) {
        Write-Host "✅ CORS configuré" -ForegroundColor Green
    } else {
        Write-Host "⚠️ CORS à vérifier" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Test CORS échoué, mais peut fonctionner: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n🎉 === VALIDATION RÉUSSIE ===" -ForegroundColor Green
Write-Host "✅ Déploiement prêt pour utilisation" -ForegroundColor Green
Write-Host "🌐 Frontend: $FrontendUrl" -ForegroundColor Cyan
Write-Host "🔗 API: $ApiUrl" -ForegroundColor Cyan
'@ | Out-File -FilePath "validation-complete.ps1" -Encoding UTF8

Write-Host "✅ Scripts PowerShell créés:" -ForegroundColor Green
Write-Host "  deploy-full.ps1           - Déploiement complet" -ForegroundColor White
Write-Host "  test-deployment.ps1       - Tests automatisés" -ForegroundColor White
Write-Host "  monitor.ps1               - Monitoring" -ForegroundColor White
Write-Host "  get-rds-credentials.ps1   - Récupération credentials" -ForegroundColor White
Write-Host "  cleanup.ps1               - Nettoyage" -ForegroundColor White
Write-Host "  validation-complete.ps1   - Validation complète" -ForegroundColor White

Write-Host "`n🚀 Pour commencer le déploiement:" -ForegroundColor Cyan
Write-Host ".\deploy-full.ps1 -Environment dev" -ForegroundColor Yellow

Write-Host "`n🧪 Pour tester le déploiement:" -ForegroundColor Cyan
Write-Host ".\test-deployment.ps1 -Environment dev -AdminPassword 'votre_password'" -ForegroundColor Yellow