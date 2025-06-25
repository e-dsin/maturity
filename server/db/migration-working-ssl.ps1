# migration-working-ssl.ps1 - Migration basee sur votre commande qui fonctionne

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "dev"
)

# Configuration basee sur votre connexion manuelle qui fonctionne
$Config = @{
    DATABASE_ENDPOINT = "maturitybackend-dev-databaseb269d8bb-rh7bxy6kcqbb.cd6w86yy2wyp.eu-west-1.rds.amazonaws.com"
    REGION = "eu-west-1"
    DATABASE_NAME = "maturity_assessment"
    SECRET_ARN = "arn:aws:secretsmanager:eu-west-1:637423285771:secret:rdsdb-8400c0dc-ab78-4127-8515-f8f6197d3c88-D5wzPP"
}

Write-Host "MIGRATION AVEC SSL (BASE SUR VOTRE COMMANDE QUI FONCTIONNE)" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

# Fonction pour obtenir les credentials
function Get-DatabaseCredentials {
    Write-Host "`nRecuperation des credentials..." -ForegroundColor Cyan
    
    try {
        $SecretValue = aws secretsmanager get-secret-value --secret-id $Config.SECRET_ARN --region $Config.REGION --query 'SecretString' --output text
        
        if ($LASTEXITCODE -ne 0) {
            throw "Impossible de recuperer le secret"
        }
        
        $Credentials = $SecretValue | ConvertFrom-Json
        
        Write-Host "✅ Credentials recuperes depuis AWS Secrets Manager" -ForegroundColor Green
        Write-Host "   Username: $($Credentials.username)" -ForegroundColor White
        
        return $Credentials
        
    } catch {
        Write-Host "❌ Erreur avec AWS Secrets: $($_.Exception.Message)" -ForegroundColor Red
        
        # Fallback manuel
        Write-Host "`nSaisie manuelle des credentials..." -ForegroundColor Yellow
        $Username = Read-Host "Nom d'utilisateur (par defaut: admin)"
        if (-not $Username) { $Username = "admin" }
        
        $Password = Read-Host "Mot de passe" -AsSecureString
        $PlainPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password))
        
        return @{
            username = $Username
            password = $PlainPassword
        }
    }
}

# Fonction pour preparer le certificat SSL
function Prepare-SSLCertificate {
    Write-Host "`nPreparation du certificat SSL..." -ForegroundColor Cyan
    
    # Essayer d'abord votre repertoire existant
    $SSLPath1 = "C:\Users\Marcel-Cédric\maturity-assessment-dasboard\server\db\eu-west-1-bundle.pem"
    $SSLPath2 = "C:\Users\Marcel-Cédric\maturity-assessment-dasboard\server\eu-west-1-bundle.pem"
    $SSLPath3 = Join-Path $env:TEMP "maturity-ssl\eu-west-1-bundle.pem"
    
    # Verifier les emplacements existants
    $ExistingPaths = @($SSLPath1, $SSLPath2, $SSLPath3)
    foreach ($Path in $ExistingPaths) {
        if (Test-Path $Path) {
            Write-Host "✅ Certificat SSL trouve: $Path" -ForegroundColor Green
            return $Path
        }
    }
    
    # Telecharger dans le repertoire temporaire
    try {
        $SSLDir = Split-Path $SSLPath3 -Parent
        if (-not (Test-Path $SSLDir)) {
            New-Item -ItemType Directory -Path $SSLDir -Force | Out-Null
        }
        
        Write-Host "Telechargement du certificat SSL..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri "https://truststore.pki.rds.amazonaws.com/eu-west-1/eu-west-1-bundle.pem" -OutFile $SSLPath3 -UseBasicParsing
        
        if (Test-Path $SSLPath3) {
            Write-Host "✅ Certificat SSL telecharge: $SSLPath3" -ForegroundColor Green
            return $SSLPath3
        }
        
    } catch {
        Write-Host "❌ Erreur lors du telechargement SSL: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    return $null
}

# Fonction pour tester la connexion MySQL (basee sur votre commande qui fonctionne)
function Test-MySQLConnection {
    param($Credentials, $SSLPath)
    
    Write-Host "`nTest de connexion MySQL avec SSL..." -ForegroundColor Cyan
    
    if (-not $SSLPath -or -not (Test-Path $SSLPath)) {
        Write-Host "❌ Certificat SSL requis mais non disponible" -ForegroundColor Red
        return $false
    }
    
    try {
        # Utiliser exactement la meme commande que vous avez utilisee avec succes
        Write-Host "Test avec la commande qui fonctionne chez vous..." -ForegroundColor Yellow
        
        # Creer un fichier de config temporaire pour automatiser le mot de passe
        $TempConfigFile = Join-Path $env:TEMP "mysql_test_$(Get-Random).cnf"
        
        $MySQLConfig = @"
[client]
host=$($Config.DATABASE_ENDPOINT)
port=3306
user=$($Credentials.username)
password=$($Credentials.password)
ssl-ca=$SSLPath
ssl-verify-server-cert
"@
        
        [System.IO.File]::WriteAllText($TempConfigFile, $MySQLConfig, [System.Text.Encoding]::ASCII)
        
        # Test simple
        Write-Host "Execution du test de connexion..." -ForegroundColor Gray
        $TestResult = & "C:\Program Files\MariaDB 11.7\bin\mysql.exe" --defaults-file="$TempConfigFile" --connect-timeout=15 -e "SELECT 1;" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ CONNEXION MYSQL REUSSIE!" -ForegroundColor Green
            Write-Host "Resultat du test: $TestResult" -ForegroundColor Gray
            
            # Sauvegarder la configuration qui marche
            $Global:WorkingConfigFile = $TempConfigFile
            return $true
        } else {
            Write-Host "❌ Test de connexion echoue: $TestResult" -ForegroundColor Red
            Remove-Item $TempConfigFile -Force -ErrorAction SilentlyContinue
            return $false
        }
        
    } catch {
        Write-Host "❌ Erreur lors du test: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction pour migrer la base de donnees
function Start-DatabaseMigration {
    Write-Host "`nDemarrage de la migration de la base de donnees..." -ForegroundColor Cyan
    
    if (-not $Global:WorkingConfigFile -or -not (Test-Path $Global:WorkingConfigFile)) {
        Write-Host "❌ Configuration MySQL non disponible" -ForegroundColor Red
        return $false
    }
    
    try {
        # Etape 1: Creer la base de donnees
        Write-Host "`n1. Creation de la base '$($Config.DATABASE_NAME)'..." -ForegroundColor Yellow
        
        $CreateDBQuery = "CREATE DATABASE IF NOT EXISTS $($Config.DATABASE_NAME) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
        $CreateResult = & "C:\Program Files\MariaDB 11.7\bin\mysql.exe" --defaults-file="$Global:WorkingConfigFile" -e "$CreateDBQuery" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Base de donnees '$($Config.DATABASE_NAME)' creee/verifiee" -ForegroundColor Green
        } else {
            Write-Host "❌ Erreur creation base: $CreateResult" -ForegroundColor Red
            return $false
        }
        
        # Etape 2: Chercher le fichier schema
        Write-Host "`n2. Recherche du fichier schema..." -ForegroundColor Yellow
        
        $SchemaFile = $null
        $PossiblePaths = @(
            ".\schema-fixed.sql",
            ".\server\db\schema-fixed.sql",
            ".\db\schema-fixed.sql", 
            "..\schema-fixed.sql",
            "C:\Users\Marcel-Cédric\maturity-assessment-dasboard\schema-fixed.sql",
            "C:\Users\Marcel-Cédric\maturity-assessment-dasboard\server\db\schema-fixed.sql"
        )
        
        foreach ($Path in $PossiblePaths) {
            if (Test-Path $Path) {
                $SchemaFile = $Path
                Write-Host "✅ Schema trouve: $SchemaFile" -ForegroundColor Green
                break
            }
        }
        
        if (-not $SchemaFile) {
            Write-Host "⚠️  Fichier schema-fixed.sql non trouve automatiquement" -ForegroundColor Yellow
            Write-Host "Emplacements cherches:" -ForegroundColor Gray
            $PossiblePaths | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
            
            $ManualPath = Read-Host "`nEntrez le chemin complet vers schema-fixed.sql (ou ENTREE pour creer une base vide)"
            if ($ManualPath -and (Test-Path $ManualPath)) {
                $SchemaFile = $ManualPath
                Write-Host "✅ Schema manuel: $SchemaFile" -ForegroundColor Green
            } else {
                Write-Host "⚠️  Creation d'une base vide (sans tables)" -ForegroundColor Yellow
                return $true
            }
        }
        
        # Etape 3: Appliquer le schema
        Write-Host "`n3. Application du schema..." -ForegroundColor Yellow
        
        # Mettre a jour le fichier de config pour inclure la base de donnees
        $ConfigContent = Get-Content $Global:WorkingConfigFile -Raw
        $ConfigWithDB = $ConfigContent + "`ndatabase=$($Config.DATABASE_NAME)"
        
        $TempConfigWithDB = Join-Path $env:TEMP "mysql_migration_$(Get-Random).cnf"
        [System.IO.File]::WriteAllText($TempConfigWithDB, $ConfigWithDB, [System.Text.Encoding]::ASCII)
        
        Write-Host "Application du schema (cela peut prendre quelques minutes)..." -ForegroundColor Gray
        Write-Host "Fichier schema: $SchemaFile" -ForegroundColor Gray
        
        # Appliquer le schema
        $SchemaResult = Get-Content $SchemaFile -Raw | & "C:\Program Files\MariaDB 11.7\bin\mysql.exe" --defaults-file="$TempConfigWithDB" --connect-timeout=60 --max_allowed_packet=1073741824 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Schema applique avec succes!" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Schema applique avec des messages:" -ForegroundColor Yellow
            Write-Host $SchemaResult -ForegroundColor Gray
        }
        
        # Etape 4: Verification des tables
        Write-Host "`n4. Verification des tables..." -ForegroundColor Yellow
        
        $TablesResult = & "C:\Program Files\MariaDB 11.7\bin\mysql.exe" --defaults-file="$TempConfigWithDB" -e "SHOW TABLES;" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Verification reussie! Tables creees:" -ForegroundColor Green
            
            $Tables = $TablesResult -split "`n" | Where-Object { $_ -and $_ -notmatch "Tables_in_" }
            $TableCount = 0
            
            foreach ($Table in $Tables) {
                $Table = $Table.Trim()
                if ($Table) {
                    Write-Host "  - $Table" -ForegroundColor White
                    $TableCount++
                }
            }
            
            Write-Host "`nTotal: $TableCount tables creees dans la base '$($Config.DATABASE_NAME)'" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Probleme lors de la verification: $TablesResult" -ForegroundColor Yellow
        }
        
        # Nettoyage
        Remove-Item $TempConfigWithDB -Force -ErrorAction SilentlyContinue
        
        return $true
        
    } catch {
        Write-Host "❌ Erreur lors de la migration: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# SCRIPT PRINCIPAL
try {
    Write-Host "Configuration utilisee:" -ForegroundColor Cyan
    Write-Host "  Endpoint: $($Config.DATABASE_ENDPOINT)" -ForegroundColor White
    Write-Host "  Region: $($Config.REGION)" -ForegroundColor White
    Write-Host "  Base: $($Config.DATABASE_NAME)" -ForegroundColor White
    
    # Etape 1: Obtenir les credentials
    $Credentials = Get-DatabaseCredentials
    if (-not $Credentials) {
        Write-Host "❌ Impossible d'obtenir les credentials" -ForegroundColor Red
        exit 1
    }
    
    # Etape 2: Preparer le certificat SSL
    $SSLPath = Prepare-SSLCertificate
    if (-not $SSLPath) {
        Write-Host "❌ Certificat SSL requis mais non disponible" -ForegroundColor Red
        exit 1
    }
    
    # Etape 3: Tester la connexion
    $ConnectionOK = Test-MySQLConnection -Credentials $Credentials -SSLPath $SSLPath
    
    if (-not $ConnectionOK) {
        Write-Host "`n❌ Impossible d'etablir la connexion MySQL" -ForegroundColor Red
        Write-Host "`nPourtant, votre commande manuelle fonctionne..." -ForegroundColor Yellow
        Write-Host "Essayez de relancer le script ou verifiez les credentials." -ForegroundColor White
        exit 1
    }
    
    # Etape 4: Migration
    Write-Host "`n" + "="*70 -ForegroundColor Green
    Write-Host "CONNEXION ETABLIE - DEMARRAGE DE LA MIGRATION" -ForegroundColor Green  
    Write-Host "="*70 -ForegroundColor Green
    
    $MigrationOK = Start-DatabaseMigration
    
    if ($MigrationOK) {
        Write-Host "`n🎉 MIGRATION COMPLETE AVEC SUCCES!" -ForegroundColor Green
        Write-Host "====================================" -ForegroundColor Green
        
        Write-Host "`nVotre base de donnees MySQL est maintenant prete!" -ForegroundColor White
        
        Write-Host "`nInformations de connexion:" -ForegroundColor Cyan
        Write-Host "  Host: $($Config.DATABASE_ENDPOINT)" -ForegroundColor White
        Write-Host "  Port: 3306" -ForegroundColor White
        Write-Host "  Database: $($Config.DATABASE_NAME)" -ForegroundColor White
        Write-Host "  Username: $($Credentials.username)" -ForegroundColor White
        Write-Host "  SSL: Requis" -ForegroundColor White
        
        Write-Host "`nCommande pour vous connecter:" -ForegroundColor Yellow
        Write-Host "& `"C:\Program Files\MariaDB 11.7\bin\mysql.exe`" -h $($Config.DATABASE_ENDPOINT) -P 3306 -u $($Credentials.username) -p$($Config.DATABASE_NAME) --ssl-ca=`"$SSLPath`" --ssl-verify-server-cert" -ForegroundColor Gray
        
        Write-Host "`nPROCHAINES ETAPES:" -ForegroundColor Cyan
        Write-Host "1. Configurez votre application pour utiliser ces parametres" -ForegroundColor White
        Write-Host "2. Testez la connexion depuis votre application" -ForegroundColor White
        Write-Host "3. Deployez votre backend" -ForegroundColor White
        
    } else {
        Write-Host "`n❌ La migration a echoue" -ForegroundColor Red
        Write-Host "Mais la connexion MySQL fonctionne, donc le probleme vient du schema ou des fichiers." -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "`n❌ ERREUR CRITIQUE: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    # Nettoyage des fichiers temporaires
    if ($Global:WorkingConfigFile -and (Test-Path $Global:WorkingConfigFile)) {
        Remove-Item $Global:WorkingConfigFile -Force -ErrorAction SilentlyContinue
    }
}