
param(
    [string]$Environment = "dev",
    [switch]$SaveToEnv,
    [switch]$SaveToSecrets,
    [string]$EnvFilePath = ".env"
)

$ErrorActionPreference = "Continue"
$SecretName = "maturity-db-$Environment"
$Region = "eu-west-1"

Write-Host "=== RECUPERATION DES CREDENTIALS RDS - $Environment ===" -ForegroundColor Cyan

# Fonction pour saisie sécurisée du mot de passe
function Get-SecurePassword {
    param([string]$Prompt)
    
    $SecurePassword = Read-Host -Prompt $Prompt -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
    $PlainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
    
    return $PlainPassword
}

# Fonction pour récupérer l'endpoint RDS
function Get-RDSEndpoint {
    param([string]$Environment)
    
    try {
        Write-Host "  Recherche RDS avec pattern maturity..." -ForegroundColor Gray
        $AllInstances = aws rds describe-db-instances --region $Region --output json 2>$null
        
        if ($AllInstances) {
            $InstancesObj = $AllInstances | ConvertFrom-Json
            
            foreach ($Instance in $InstancesObj.DBInstances) {
                if ($Instance.DBInstanceIdentifier -match "maturity") {
                    Write-Host "  Trouve: $($Instance.DBInstanceIdentifier)" -ForegroundColor Gray
                    if ($Instance.Endpoint -and $Instance.Endpoint.Address) {
                        return $Instance.Endpoint.Address
                    }
                }
            }
        }
    } catch {
        Write-Host "Impossible de recuperer automatiquement l'endpoint RDS" -ForegroundColor Yellow
    }
    return $null
}

# Fonction pour sauvegarder dans le fichier .env
function Save-ToEnvFile {
    param(
        [hashtable]$Credentials,
        [string]$FilePath
    )
    
    try {
        $EnvContent = @"
# === Base de donnees RDS - $Environment ===
DB_HOST=$($Credentials.host)
DB_PORT=$($Credentials.port)
DB_NAME=$($Credentials.database)
DB_USER=$($Credentials.username)
DB_PASSWORD=$($Credentials.password)

# === Configuration SSL ===
DB_SSL_REJECT_UNAUTHORIZED=false

# === Configuration serveur ===
NODE_ENV=production
PORT=5000

# === CORS et Frontend ===
FRONTEND_URL=https://$Environment-maturity.e-dsin.fr

# === JWT et securite ===
JWT_SECRET=votre_jwt_secret_super_securise_pour_$Environment
JWT_EXPIRES_IN=24h

# === AWS Configuration ===
AWS_REGION=$Region
"@

        $EnvContent | Out-File -FilePath $FilePath -Encoding UTF8
        Write-Host "Configuration sauvegardee dans $FilePath" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "Erreur lors de la sauvegarde : $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction pour sauvegarder dans AWS Secrets Manager
function Save-ToSecretsManager {
    param(
        [hashtable]$Credentials,
        [string]$SecretName,
        [string]$Region
    )
    
    try {
        $SecretJson = $Credentials | ConvertTo-Json -Compress
        
        # Vérifier si le secret existe déjà
        $ExistingSecret = aws secretsmanager describe-secret --secret-id $SecretName --region $Region 2>$null
        
        if ($ExistingSecret) {
            aws secretsmanager update-secret --secret-id $SecretName --secret-string $SecretJson --region $Region | Out-Null
            Write-Host "Secret mis a jour dans AWS Secrets Manager" -ForegroundColor Green
        } else {
            aws secretsmanager create-secret --name $SecretName --description "Database credentials for Maturity Assessment - $Environment" --secret-string $SecretJson --region $Region | Out-Null
            Write-Host "Nouveau secret cree dans AWS Secrets Manager" -ForegroundColor Green
        }
        return $true
    } catch {
        Write-Host "Erreur lors de la sauvegarde dans Secrets Manager : $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# ===== ETAPE 1: TENTATIVE DE RECUPERATION DEPUIS AWS SECRETS MANAGER =====
Write-Host "`nTentative de recuperation depuis AWS Secrets Manager..." -ForegroundColor Yellow

$SecretValue = $null
$FromSecretsManager = $false

try {
    $SecretValue = aws secretsmanager get-secret-value --secret-id $SecretName --region $Region --query SecretString --output text 2>$null
    
    if ($SecretValue -and $SecretValue -ne "None" -and $SecretValue -ne "") {
        $SecretData = $SecretValue | ConvertFrom-Json
        Write-Host "Credentials recuperes depuis AWS Secrets Manager" -ForegroundColor Green
        $FromSecretsManager = $true
        
        # Afficher les informations récupérées
        Write-Host "`nInformations recuperees :" -ForegroundColor Cyan
        Write-Host "  Username: $($SecretData.username)" -ForegroundColor White
        Write-Host "  Password: $('*' * $SecretData.password.Length)" -ForegroundColor White
        Write-Host "  Host: $(if($SecretData.host) { $SecretData.host } else { 'A determiner' })" -ForegroundColor White
        Write-Host "  Port: $(if($SecretData.port) { $SecretData.port } else { '3306' })" -ForegroundColor White
        Write-Host "  Database: $(if($SecretData.database) { $SecretData.database } else { 'maturity_assessment' })" -ForegroundColor White
    }
} catch {
    Write-Host "AWS Secrets Manager non accessible : $($_.Exception.Message)" -ForegroundColor Yellow
}

# ===== ETAPE 2: FALLBACK SAISIE MANUELLE =====
if (-not $FromSecretsManager) {
    Write-Host "`n=== CONFIGURATION MANUELLE ===" -ForegroundColor Cyan
    Write-Host "AWS Secrets Manager non disponible. Configuration manuelle requise." -ForegroundColor Yellow
    
    # Récupérer l'endpoint RDS automatiquement si possible
    Write-Host "`nRecherche automatique de l'endpoint RDS..." -ForegroundColor Yellow
    $RDSEndpoint = Get-RDSEndpoint -Environment $Environment
    
    if ($RDSEndpoint) {
        Write-Host "Endpoint RDS trouve : $RDSEndpoint" -ForegroundColor Green
        $DefaultHost = $RDSEndpoint
    } else {
        Write-Host "Endpoint RDS non trouve automatiquement" -ForegroundColor Yellow
        $DefaultHost = "maturitybackend-$Environment-database.cd6w86yy2wyp.eu-west-1.rds.amazonaws.com"
        Write-Host "Utilisation de l'endpoint par defaut : $DefaultHost" -ForegroundColor Gray
    }
    
    # Saisie des informations
    Write-Host "`nVeuillez saisir les informations de connexion :" -ForegroundColor Cyan
    
    $Username = Read-Host "Nom d'utilisateur (defaut: admin)"
    if (-not $Username) { 
        $Username = "admin" 
    }
    
    $Password = Get-SecurePassword "Mot de passe RDS"
    
    $DBHost = Read-Host "Host RDS (defaut: $DefaultHost)"
    if (-not $DBHost) { 
        $DBHost = $DefaultHost 
    }
    
    $Port = Read-Host "Port (defaut: 3306)"
    if (-not $Port) { 
        $Port = "3306" 
    }
    
    $Database = Read-Host "Nom de la base (defaut: maturity_assessment)"
    if (-not $Database) { 
        $Database = "maturity_assessment" 
    }
    
    # Créer l'objet credentials
    $SecretData = @{
        username = $Username
        password = $Password
        host = $DBHost
        port = $Port
        database = $Database
        source = "manual_input"
        created_at = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    }
    
    Write-Host "`nConfiguration manuelle terminee" -ForegroundColor Green
}

# ===== ETAPE 3: VALIDATION DE LA CONNEXION =====
Write-Host "`n=== VALIDATION DE LA CONNEXION ===" -ForegroundColor Cyan

# Si l'endpoint n'est pas défini, essayer de le récupérer
if (-not $SecretData.host -or $SecretData.host -eq "A determiner") {
    $RDSEndpoint = Get-RDSEndpoint -Environment $Environment
    if ($RDSEndpoint) {
        $SecretData.host = $RDSEndpoint
        Write-Host "Endpoint RDS mis a jour : $RDSEndpoint" -ForegroundColor Green
    }
}

# Test de connexion basique (ping DNS)
try {
    $PingResult = Test-NetConnection -ComputerName $SecretData.host -Port $SecretData.port -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($PingResult) {
        Write-Host "Connectivite reseau OK vers $($SecretData.host):$($SecretData.port)" -ForegroundColor Green
    } else {
        Write-Host "Probleme de connectivite reseau vers $($SecretData.host):$($SecretData.port)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Impossible de tester la connectivite reseau" -ForegroundColor Yellow
}

# ===== ETAPE 4: AFFICHAGE DE LA CONFIGURATION =====
Write-Host "`n=== CONFIGURATION FINALE ===" -ForegroundColor Cyan
Write-Host "Username: $($SecretData.username)" -ForegroundColor White
Write-Host "Password: $('*' * $SecretData.password.Length) caracteres" -ForegroundColor White
Write-Host "Host: $($SecretData.host)" -ForegroundColor White
Write-Host "Port: $($SecretData.port)" -ForegroundColor White
Write-Host "Database: $($SecretData.database)" -ForegroundColor White
Write-Host "Source: $(if($FromSecretsManager) { 'AWS Secrets Manager' } else { 'Saisie manuelle' })" -ForegroundColor White

# ===== ETAPE 5: CONFIGURATION .ENV =====
Write-Host "`nConfiguration pour .env :" -ForegroundColor Yellow
Write-Host "DB_HOST=$($SecretData.host)" -ForegroundColor Gray
Write-Host "DB_PORT=$($SecretData.port)" -ForegroundColor Gray
Write-Host "DB_NAME=$($SecretData.database)" -ForegroundColor Gray
Write-Host "DB_USER=$($SecretData.username)" -ForegroundColor Gray
Write-Host "DB_PASSWORD=$($SecretData.password)" -ForegroundColor Gray

# ===== ETAPE 6: OPTIONS DE SAUVEGARDE =====
if ($SaveToEnv -or (-not $FromSecretsManager)) {
    Write-Host "`n=== SAUVEGARDE ===" -ForegroundColor Cyan
    
    if (-not $SaveToEnv) {
        $SaveEnvChoice = Read-Host "Sauvegarder dans $EnvFilePath ? (o/N)"
        $SaveToEnv = ($SaveEnvChoice -eq "o" -or $SaveEnvChoice -eq "O" -or $SaveEnvChoice -eq "oui")
    }
    
    if ($SaveToEnv) {
        $SaveResult = Save-ToEnvFile -Credentials $SecretData -FilePath $EnvFilePath
        if ($SaveResult) {
            Write-Host "Fichier .env cree : $EnvFilePath" -ForegroundColor Green
        }
    }
    
    # Option de sauvegarde dans Secrets Manager si saisie manuelle
    if (-not $FromSecretsManager) {
        if (-not $SaveToSecrets) {
            $SaveSecretsChoice = Read-Host "Sauvegarder dans AWS Secrets Manager pour la prochaine fois ? (o/N)"
            $SaveToSecrets = ($SaveSecretsChoice -eq "o" -or $SaveSecretsChoice -eq "O" -or $SaveSecretsChoice -eq "oui")
        }
        
        if ($SaveToSecrets) {
            Write-Host "Sauvegarde dans AWS Secrets Manager..." -ForegroundColor Yellow
            $SaveSecretsResult = Save-ToSecretsManager -Credentials $SecretData -SecretName $SecretName -Region $Region
        }
    }
}

# ===== ETAPE 7: INSTRUCTIONS FINALES =====
Write-Host "`n=== PROCHAINES ETAPES ===" -ForegroundColor Cyan
Write-Host "1. Utilisez ces credentials dans votre application" -ForegroundColor White
Write-Host "2. Testez la connexion avec votre application" -ForegroundColor White
if ($SaveToEnv) {
    Write-Host "3. Le fichier .env a ete cree avec la configuration" -ForegroundColor White
}
Write-Host "4. Executez .\test-deployment.ps1 pour valider le deploiement" -ForegroundColor White

Write-Host "`nTest de connexion MySQL (si mysql client installe) :" -ForegroundColor Yellow
Write-Host "mysql -h $($SecretData.host) -P $($SecretData.port) -u $($SecretData.username) -p$($SecretData.password) $($SecretData.database)" -ForegroundColor Gray

Write-Host "`nConfiguration RDS terminee !" -ForegroundColor Green

# Retourner les credentials pour utilisation par d'autres scripts
return $SecretData