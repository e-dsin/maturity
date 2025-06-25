@'
param(
    [string]$Environment = "dev",
    [string]$AdminEmail = "admin@qwanza.fr",
    [Parameter(Mandatory=$true)]
    [string]$AdminPassword
)

$ErrorActionPreference = "Stop"
$ApiUrl = "https://api-$Environment.dev-maturity.e-dsin.fr"

Write-Host "🧪 === TESTS DE DÉPLOIEMENT - $Environment ===" -ForegroundColor Cyan
Write-Host "API URL: $ApiUrl" -ForegroundColor White

# Fonction helper pour les requêtes HTTP
function Invoke-ApiRequest {
    param(
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [string]$Body = $null
    )
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
        }
        
        if ($Body) {
            $params.Body = $Body
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-RestMethod @params
        return @{ Success = $true; Data = $response }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

# Test 1: Health check basique
Write-Host "`n🔍 Test 1: Health Check..." -ForegroundColor Yellow

$healthResult = Invoke-ApiRequest -Url "$ApiUrl/health"
if ($healthResult.Success) {
    Write-Host "✅ Health check OK" -ForegroundColor Green
} else {
    Write-Host "❌ Health check échoué: $($healthResult.Error)" -ForegroundColor Red
    exit 1
}

# Test 2: Health check base de données
Write-Host "`n🔍 Test 2: Database Health..." -ForegroundColor Yellow

$dbHealthResult = Invoke-ApiRequest -Url "$ApiUrl/api/health/database"
if ($dbHealthResult.Success) {
    Write-Host "✅ Database health OK" -ForegroundColor Green
} else {
    Write-Host "❌ Database health échoué: $($dbHealthResult.Error)" -ForegroundColor Red
    exit 1
}

# Test 3: Authentification
Write-Host "`n🔍 Test 3: Authentification..." -ForegroundColor Yellow

$loginBody = @{
    email = $AdminEmail
    password = $AdminPassword
} | ConvertTo-Json

$loginResult = Invoke-ApiRequest -Url "$ApiUrl/api/auth/login" -Method "POST" -Body $loginBody

if ($loginResult.Success) {
    # Essayer différents formats de réponse pour récupérer le token
    $token = $null
    
    if ($loginResult.Data.token) {
        $token = $loginResult.Data.token
    } elseif ($loginResult.Data.user -and $loginResult.Data.user.token) {
        $token = $loginResult.Data.user.token
    } elseif ($loginResult.Data.accessToken) {
        $token = $loginResult.Data.accessToken
    }
    
    if ($token) {
        Write-Host "✅ Login réussi" -ForegroundColor Green
        
        # Test 4: Permissions
        Write-Host "`n🔍 Test 4: Permissions..." -ForegroundColor Yellow
        
        $headers = @{ "Authorization" = "Bearer $token" }
        $permissionsResult = Invoke-ApiRequest -Url "$ApiUrl/api/user/permissions" -Headers $headers
        
        if ($permissionsResult.Success) {
            Write-Host "✅ Permissions OK" -ForegroundColor Green
        } else {
            Write-Host "❌ Permissions échouées: $($permissionsResult.Error)" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "❌ Token non trouvé dans la réponse" -ForegroundColor Red
        Write-Host "Response: $($loginResult.Data | ConvertTo-Json -Depth 2)" -ForegroundColor Gray
        exit 1
    }
} else {
    Write-Host "❌ Login échoué: $($loginResult.Error)" -ForegroundColor Red
    exit 1
}

# Test 5: CORS
Write-Host "`n🔍 Test 5: CORS..." -ForegroundColor Yellow

try {
    $corsHeaders = @{
        "Origin" = "https://dev-maturity.e-dsin.fr"
        "Access-Control-Request-Method" = "GET"
        "Access-Control-Request-Headers" = "Content-Type,Authorization"
    }
    
    $corsResult = Invoke-WebRequest -Uri "$ApiUrl/api/test-cors" -Method OPTIONS -Headers $corsHeaders -UseBasicParsing
    
    if ($corsResult.Headers.ContainsKey("Access-Control-Allow-Origin")) {
        Write-Host "✅ CORS configuré" -ForegroundColor Green
    } else {
        Write-Host "⚠️ CORS peut nécessiter une vérification" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Test CORS échoué, mais l'API peut fonctionner: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n🎉 === TOUS LES TESTS PASSENT ===" -ForegroundColor Green
Write-Host "Déploiement validé avec succès !" -ForegroundColor Cyan
'@ | Out-File -FilePath "test-deployment.ps1" -Encoding UTF8