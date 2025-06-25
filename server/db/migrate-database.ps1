# migrate-database.ps1 - Script de migration de la base de donnees (VERSION CORRIGEE)

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "dev"
)

# Configuration depuis les outputs de la Phase 2
$Config = @{
    DATABASE_ENDPOINT = "maturitybackend-dev-databaseb269d8bb-rh7bxy6kcqbb.cd6w86yy2wyp.eu-west-1.rds.amazonaws.com"
    DATABASE_SECRET_ARN = "arn:aws:secretsmanager:eu-west-1:637423285771:secret:maturity-db-dev-1QEB1e"
    REGION = "eu-west-1"
    DATABASE_NAME = "maturity_assessment"
}

Write-Host "DATABASE MIGRATION - ENVIRONMENT: $Environment" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green

# Fonction pour recuperer les credentials de la base
function Get-DatabaseCredentials {
    Write-Host "`nRecuperation des credentials de la base..." -ForegroundColor Cyan
    
    try {
        $SecretValue = aws secretsmanager get-secret-value --secret-id $Config.DATABASE_SECRET_ARN --region $Config.REGION --query 'SecretString' --output text
        
        if ($LASTEXITCODE -ne 0) {
            throw "Impossible de recuperer le secret"
        }
        
        $Credentials = $SecretValue | ConvertFrom-Json
        
        Write-Host "Credentials recuperes avec succes" -ForegroundColor Green
        return $Credentials
        
    } catch {
        Write-Host "Erreur lors de la recuperation des credentials: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Fonction pour tester la connexion a la base
function Test-DatabaseConnection {
    param($Credentials)
    
    Write-Host "`nTest de connexion a la base..." -ForegroundColor Cyan
    
    try {
        # Utiliser mysql client pour tester la connexion
        $TestQuery = "SELECT 1 as test"
        $TempFile = [System.IO.Path]::GetTempFileName()
        
        # Creer un fichier temporaire avec les credentials
        $MySQLConfig = @"
[client]
host=$($Config.DATABASE_ENDPOINT)
port=3306
user=$($Credentials.username)
password=$($Credentials.password)
"@
        
        $ConfigFile = $TempFile + ".cnf"
        $MySQLConfig | Out-File -FilePath $ConfigFile -Encoding UTF8
        
        # Tester la connexion avec mysql
        $TestResult = mysql --defaults-file="$ConfigFile" -e "$TestQuery" 2>&1
        
        # Nettoyer les fichiers temporaires
        Remove-Item $ConfigFile -Force -ErrorAction SilentlyContinue
        Remove-Item $TempFile -Force -ErrorAction SilentlyContinue
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Connexion a la base reussie" -ForegroundColor Green
            return $true
        } else {
            Write-Host "Echec de connexion: $TestResult" -ForegroundColor Red
            return $false
        }
        
    } catch {
        Write-Host "Erreur de connexion: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction pour creer la base de donnees si elle n'existe pas
function Initialize-Database {
    param($Credentials)
    
    Write-Host "`nInitialisation de la base de donnees..." -ForegroundColor Cyan
    
    $TempFile = [System.IO.Path]::GetTempFileName()
    $ConfigFile = $TempFile + ".cnf"
    
    $MySQLConfig = @"
[client]
host=$($Config.DATABASE_ENDPOINT)
port=3306
user=$($Credentials.username)
password=$($Credentials.password)
"@
    
    $MySQLConfig | Out-File -FilePath $ConfigFile -Encoding UTF8
    
    try {
        # Creer la base si elle n'existe pas
        $CreateDBQuery = "CREATE DATABASE IF NOT EXISTS $($Config.DATABASE_NAME) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
        $Result = mysql --defaults-file="$ConfigFile" -e "$CreateDBQuery" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Base de donnees '$($Config.DATABASE_NAME)' creee/verifiee" -ForegroundColor Green
            return $true
        } else {
            Write-Host "Erreur lors de la creation de la base: $Result" -ForegroundColor Red
            return $false
        }
        
    } catch {
        Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    } finally {
        Remove-Item $ConfigFile -Force -ErrorAction SilentlyContinue
        Remove-Item $TempFile -Force -ErrorAction SilentlyContinue
    }
}

# Fonction pour executer le schema SQL
function Invoke-SchemaMigration {
    param($Credentials)
    
    Write-Host "`nApplication du schema de base de donnees..." -ForegroundColor Cyan
    
    # Verifier que le fichier de schema existe
    if (-not (Test-Path "schema-fixed.sql")) {
        Write-Host "Fichier schema-fixed.sql non trouve dans le repertoire actuel" -ForegroundColor Red
        Write-Host "Assurez-vous d'etre dans le repertoire contenant le fichier de schema" -ForegroundColor Yellow
        return $false
    }
    
    $TempFile = [System.IO.Path]::GetTempFileName()
    $ConfigFile = $TempFile + ".cnf"
    
    $MySQLConfig = @"
[client]
host=$($Config.DATABASE_ENDPOINT)
port=3306
user=$($Credentials.username)
password=$($Credentials.password)
database=$($Config.DATABASE_NAME)
"@
    
    $MySQLConfig | Out-File -FilePath $ConfigFile -Encoding UTF8
    
    try {
        Write-Host "Execution du schema depuis: schema-fixed.sql" -ForegroundColor Yellow
        
        # Executer le fichier SQL
        $Result = mysql --defaults-file="$ConfigFile" -v "schema-fixed.sql" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Schema applique avec succes" -ForegroundColor Green
            return $true
        } else {
            Write-Host "Erreur lors de l'application du schema:" -ForegroundColor Red
            Write-Host $Result -ForegroundColor Red
            return $false
        }
        
    } catch {
        Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    } finally {
        Remove-Item $ConfigFile -Force -ErrorAction SilentlyContinue
        Remove-Item $TempFile -Force -ErrorAction SilentlyContinue
    }
}

# Fonction pour verifier les tables creees
function Test-DatabaseSchema {
    param($Credentials)
    
    Write-Host "`nVerification du schema..." -ForegroundColor Cyan
    
    $TempFile = [System.IO.Path]::GetTempFileName()
    $ConfigFile = $TempFile + ".cnf"
    
    $MySQLConfig = @"
[client]
host=$($Config.DATABASE_ENDPOINT)
port=3306
user=$($Credentials.username)
password=$($Config.DATABASE_NAME)
database=$($Config.DATABASE_NAME)
"@
    
    $MySQLConfig | Out-File -FilePath $ConfigFile -Encoding UTF8
    
    try {
        # Lister les tables
        $TablesQuery = "SHOW TABLES"
        $Tables = mysql --defaults-file="$ConfigFile" -e "$TablesQuery" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Tables creees:" -ForegroundColor Green
            $TableLines = $Tables -split "`n"
            $TableCount = 0
            foreach ($Line in $TableLines) {
                if ($Line -and $Line -notmatch "Tables_in_" -and $Line.Trim() -ne "") {
                    Write-Host "  - $Line" -ForegroundColor White
                    $TableCount++
                }
            }
            
            Write-Host "`n$TableCount tables creees" -ForegroundColor Green
            return $true
        } else {
            Write-Host "Erreur lors de la verification: $Tables" -ForegroundColor Red
            return $false
        }
        
    } catch {
        Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    } finally {
        Remove-Item $ConfigFile -Force -ErrorAction SilentlyContinue
        Remove-Item $TempFile -Force -ErrorAction SilentlyContinue
    }
}

# =============================================
# SCRIPT PRINCIPAL
# =============================================

try {
    Write-Host "Verification des prerequis..." -ForegroundColor Cyan
    
    # Verifier que mysql client est disponible
    try {
        $MySQLVersion = mysql --version 2>&1
        Write-Host "MySQL Client disponible: $MySQLVersion" -ForegroundColor Green
    } catch {
        Write-Host "MySQL Client non trouve. Installez-le avec:" -ForegroundColor Red
        Write-Host "  Windows: winget install Oracle.MySQL ou MySQL Installer" -ForegroundColor Yellow
        Write-Host "  macOS: brew install mysql-client" -ForegroundColor Yellow
        Write-Host "  Linux: sudo apt-get install mysql-client" -ForegroundColor Yellow
        exit 1
    }
    
    # Verifier AWS CLI
    try {
        $AWSVersion = aws --version 2>&1
        Write-Host "AWS CLI disponible: $AWSVersion" -ForegroundColor Green
    } catch {
        Write-Host "AWS CLI non trouve" -ForegroundColor Red
        exit 1
    }
    
    # Recuperer les credentials
    $Credentials = Get-DatabaseCredentials
    
    # Tester la connexion
    $ConnectionOK = Test-DatabaseConnection -Credentials $Credentials
    if (-not $ConnectionOK) {
        Write-Host "Impossible de se connecter a la base de donnees" -ForegroundColor Red
        Write-Host "Verifiez que:" -ForegroundColor Yellow
        Write-Host "  1. La base de donnees est demarree" -ForegroundColor Yellow
        Write-Host "  2. Les security groups permettent l'acces" -ForegroundColor Yellow
        Write-Host "  3. Les credentials sont corrects" -ForegroundColor Yellow
        exit 1
    }
    
    # Initialiser la base
    $InitOK = Initialize-Database -Credentials $Credentials
    if (-not $InitOK) {
        Write-Host "Echec de l'initialisation de la base" -ForegroundColor Red
        exit 1
    }
    
    # Appliquer le schema
    $SchemaOK = Invoke-SchemaMigration -Credentials $Credentials
    if (-not $SchemaOK) {
        Write-Host "Echec de l'application du schema" -ForegroundColor Red
        exit 1
    }
    
    # Verifier le schema
    $VerificationOK = Test-DatabaseSchema -Credentials $Credentials
    if (-not $VerificationOK) {
        Write-Host "Probleme lors de la verification du schema" -ForegroundColor Yellow
    }
    
    Write-Host "`nMIGRATION DE BASE DE DONNEES TERMINEE AVEC SUCCES!" -ForegroundColor Green
    Write-Host "===================================================" -ForegroundColor Green
    
    Write-Host "`nINFORMATIONS DE CONNEXION:" -ForegroundColor Cyan
    Write-Host "Endpoint: $($Config.DATABASE_ENDPOINT)" -ForegroundColor White
    Write-Host "Base: $($Config.DATABASE_NAME)" -ForegroundColor White
    Write-Host "Utilisateur: $($Credentials.username)" -ForegroundColor White
    Write-Host "Mot de passe: [Stocke dans Secrets Manager]" -ForegroundColor White
    
    Write-Host "`nPROCHAINES ETAPES:" -ForegroundColor Yellow
    Write-Host "1. Infrastructure AWS deployee" -ForegroundColor Green
    Write-Host "2. Base de donnees migree" -ForegroundColor Green
    Write-Host "3. Deployer l'application backend" -ForegroundColor Yellow
    Write-Host "4. Mettre a jour le frontend" -ForegroundColor Yellow
    Write-Host "5. Tester la connectivite end-to-end" -ForegroundColor Yellow
    
} catch {
    Write-Host "`nERRRURE LORS DE LA MIGRATION: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}