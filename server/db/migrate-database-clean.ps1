# migrate-database-clean.ps1 - Script de migration de la base de donnees (VERSION PROPRE)

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "dev"
)

# Configuration pour la region eu-west-3
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
        Write-Host "Utilisateur: $($Credentials.username)" -ForegroundColor White
        return $Credentials
        
    } catch {
        Write-Host "Erreur lors de la recuperation des credentials: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Fonction pour tester la connectivite reseau
function Test-NetworkConnectivity {
    Write-Host "`nTest de connectivite reseau..." -ForegroundColor Cyan
    
    try {
        Write-Host "Resolution DNS de $($Config.DATABASE_ENDPOINT)..." -ForegroundColor Yellow
        $DnsResult = Resolve-DnsName -Name $Config.DATABASE_ENDPOINT -ErrorAction Stop
        $ResolvedIP = $DnsResult.IPAddress
        Write-Host "DNS resolu: $ResolvedIP" -ForegroundColor Green
        
        Write-Host "Test de connectivite TCP vers $ResolvedIP port 3306..." -ForegroundColor Yellow
        $TCPClient = New-Object System.Net.Sockets.TcpClient
        $Connect = $TCPClient.BeginConnect($ResolvedIP, 3306, $null, $null)
        $Wait = $Connect.AsyncWaitHandle.WaitOne(10000, $false)
        
        if ($Wait) {
            $TCPClient.EndConnect($Connect)
            $TCPClient.Close()
            Write-Host "Port 3306 accessible!" -ForegroundColor Green
            return $true
        } else {
            $TCPClient.Close()
            Write-Host "Port 3306 non accessible (timeout de 10 secondes)" -ForegroundColor Red
            return $false
        }
        
    } catch {
        Write-Host "Erreur de connectivite reseau: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction pour tester la connexion a la base avec retry
function Test-DatabaseConnection {
    param($Credentials, $MaxRetries = 3)
    
    Write-Host "`nTest de connexion a la base (avec $MaxRetries tentatives)..." -ForegroundColor Cyan
    
    for ($i = 1; $i -le $MaxRetries; $i++) {
        $ConfigFile = $null
        try {
            Write-Host "Tentative $i/$MaxRetries..." -ForegroundColor Yellow
            
            # Creer un fichier de configuration temporaire
            $TempDir = [System.IO.Path]::GetTempPath()
            $TempFile = [System.IO.Path]::GetRandomFileName()
            $ConfigFile = Join-Path $TempDir "$TempFile.cnf"
            
            $PemPath = "$env:USERPROFILE\maturity-assessment-dasboard\server\eu-west-3-bundle.pem"
            $MySQLConfig = "[client]`nhost=$($Config.DATABASE_ENDPOINT)`nport=3306`nuser=$($Credentials.username)`npassword=$($Credentials.password)`nssl-ca=$PemPath`nssl-verify-server-cert"
            
            [System.IO.File]::WriteAllText($ConfigFile, $MySQLConfig, [System.Text.Encoding]::ASCII)
            
            # Valider le fichier
            $ConfigContent = Get-Content $ConfigFile -Raw
            if (-not $ConfigContent.StartsWith("[client]")) {
                throw "Le fichier de configuration ne commence pas par [client]"
            }
            
            # Tester la connexion
            $TestQuery = "SELECT 1 as connection_test, NOW() as current_time"
            $TestResult = & "C:\Program Files\MariaDB 11.7\bin\mysql.exe" --defaults-file="$ConfigFile" --connect-timeout=10 --protocol=tcp -e "$TestQuery" 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Connexion reussie!" -ForegroundColor Green
                Write-Host "Resultat du test:" -ForegroundColor White
                Write-Host $TestResult -ForegroundColor Gray
                return $true
            } else {
                Write-Host "Tentative $i echouee: $TestResult" -ForegroundColor Red
                
                if ($i -lt $MaxRetries) {
                    Write-Host "Attente de 15 secondes avant la prochaine tentative..." -ForegroundColor Yellow
                    Start-Sleep -Seconds 15
                }
            }
            
        } catch {
            Write-Host "Erreur lors de la tentative $i : $($_.Exception.Message)" -ForegroundColor Red
            
            if ($i -lt $MaxRetries) {
                Write-Host "Attente de 15 secondes avant la prochaine tentative..." -ForegroundColor Yellow
                Start-Sleep -Seconds 15
            }
        } finally {
            if ($ConfigFile -and (Test-Path $ConfigFile)) {
                Remove-Item $ConfigFile -Force -ErrorAction SilentlyContinue
            }
        }
    }
    
    return $false
}

# Fonction pour creer la base de donnees
function Initialize-Database {
    param($Credentials)
    
    Write-Host "`nInitialisation de la base de donnees..." -ForegroundColor Cyan
    
    $ConfigFile = $null
    try {
        $TempDir = [System.IO.Path]::GetTempPath()
        $TempFile = [System.IO.Path]::GetRandomFileName()
        $ConfigFile = Join-Path $TempDir "$TempFile.cnf"
        
        $PemPath = "$env:USERPROFILE\maturity-assessment-dasboard\server\eu-west-3-bundle.pem"
        $MySQLConfig = "[client]`nhost=$($Config.DATABASE_ENDPOINT)`nport=3306`nuser=$($Credentials.username)`npassword=$($Credentials.password)`nssl-ca=$PemPath`nssl-verify-server-cert"
        
        [System.IO.File]::WriteAllText($ConfigFile, $MySQLConfig, [System.Text.Encoding]::ASCII)
        
        # Creer la base si elle n'existe pas
        $CreateDBQuery = "CREATE DATABASE IF NOT EXISTS $($Config.DATABASE_NAME) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
        $Result = & "C:\Program Files\MariaDB 11.7\bin\mysql.exe" --defaults-file="$ConfigFile" --connect-timeout=10 -e "$CreateDBQuery" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Base de donnees '$($Config.DATABASE_NAME)' creee/verifiee" -ForegroundColor Green
            
            # Verifier que la base existe
            $ShowDBQuery = "SHOW DATABASES LIKE '$($Config.DATABASE_NAME)'"
            $ShowResult = & "C:\Program Files\MariaDB 11.7\bin\mysql.exe" --defaults-file="$ConfigFile" --connect-timeout=10 -e "$ShowDBQuery" 2>&1
            
            if ($ShowResult -like "*$($Config.DATABASE_NAME)*") {
                Write-Host "Base de donnees confirmee existante" -ForegroundColor Green
                return $true
            } else {
                Write-Host "Base de donnees non trouvee apres creation" -ForegroundColor Red
                return $false
            }
        } else {
            Write-Host "Erreur lors de la creation de la base: $Result" -ForegroundColor Red
            return $false
        }
        
    } catch {
        Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    } finally {
        if ($ConfigFile -and (Test-Path $ConfigFile)) {
            Remove-Item $ConfigFile -Force -ErrorAction SilentlyContinue
        }
    }
}

# Fonction pour executer le schema SQL
function Invoke-SchemaMigration {
    param($Credentials)
    
    Write-Host "`nApplication du schema de base de donnees..." -ForegroundColor Cyan
    
    # Chercher le fichier de schema
    $SchemaFile = "schema-fixed.sql"
    if (-not (Test-Path $SchemaFile)) {
        $PossiblePaths = @(
            ".\schema-fixed.sql",
            ".\server\db\schema-fixed.sql",
            ".\db\schema-fixed.sql",
            "..\schema-fixed.sql"
        )
        
        $SchemaFile = $null
        foreach ($Path in $PossiblePaths) {
            if (Test-Path $Path) {
                $SchemaFile = $Path
                break
            }
        }
        
        if (-not $SchemaFile) {
            Write-Host "Fichier schema-fixed.sql non trouve dans les emplacements suivants:" -ForegroundColor Red
            $PossiblePaths | ForEach-Object { Write-Host "   - $_" -ForegroundColor Gray }
            return $false
        }
    }
    
    Write-Host "Fichier de schema trouve: $SchemaFile" -ForegroundColor Green
    
    $ConfigFile = $null
    try {
        $TempDir = [System.IO.Path]::GetTempPath()
        $TempFile = [System.IO.Path]::GetRandomFileName()
        $ConfigFile = Join-Path $TempDir "$TempFile.cnf"
        
        $PemPath = "$env:USERPROFILE\maturity-assessment-dasboard\server\eu-west-3-bundle.pem"
        $MySQLConfig = "[client]`nhost=$($Config.DATABASE_ENDPOINT)`nport=3306`nuser=$($Credentials.username)`npassword=$($Credentials.password)`ndatabase=$($Config.DATABASE_NAME)`nssl-ca=$PemPath`nssl-verify-server-cert"
        
        [System.IO.File]::WriteAllText($ConfigFile, $MySQLConfig, [System.Text.Encoding]::ASCII)
        
        Write-Host "Execution du schema depuis: $SchemaFile" -ForegroundColor Yellow
        Write-Host "Cela peut prendre quelques minutes..." -ForegroundColor Yellow
        
        # Executer le fichier SQL
        $Result = Get-Content $SchemaFile -Raw | & "C:\Program Files\MariaDB 11.7\bin\mysql.exe" --defaults-file="$ConfigFile" --connect-timeout=30 --max_allowed_packet=1073741824 --verbose 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Schema applique avec succes!" -ForegroundColor Green
            return $true
        } else {
            Write-Host "Erreur lors de l'application du schema:" -ForegroundColor Red
            Write-Host $Result -ForegroundColor Red
            
            if ($Result -like "*Access denied*") {
                Write-Host "L'erreur semble liee aux permissions." -ForegroundColor Yellow
            } elseif ($Result -like "*timeout*" -or $Result -like "*connection*") {
                Write-Host "L'erreur semble liee a la connectivite reseau." -ForegroundColor Yellow
            }
            
            return $false
        }
        
    } catch {
        Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    } finally {
        if ($ConfigFile -and (Test-Path $ConfigFile)) {
            Remove-Item $ConfigFile -Force -ErrorAction SilentlyContinue
        }
    }
}

# Fonction pour verifier les tables creees
function Test-DatabaseSchema {
    param($Credentials)
    
    Write-Host "`nVerification du schema..." -ForegroundColor Cyan
    
    $ConfigFile = $null
    try {
        $TempDir = [System.IO.Path]::GetTempPath()
        $TempFile = [System.IO.Path]::GetRandomFileName()
        $ConfigFile = Join-Path $TempDir "$TempFile.cnf"
        
        $PemPath = "$env:USERPROFILE\maturity-assessment-dasboard\server\eu-west-1-bundle.pem"
        $MySQLConfig = "[client]`nhost=$($Config.DATABASE_ENDPOINT)`nport=3306`nuser=$($Credentials.username)`npassword=$($Credentials.password)`ndatabase=$($Config.DATABASE_NAME)`nssl-ca=$PemPath`nssl-verify-server-cert"
        
        [System.IO.File]::WriteAllText($ConfigFile, $MySQLConfig, [System.Text.Encoding]::ASCII)
        
        # Lister les tables
        $TablesQuery = "SHOW TABLES"
        $Tables = & "C:\Program Files\MariaDB 11.7\bin\mysql.exe" --defaults-file="$ConfigFile" --connect-timeout=10 -e "$TablesQuery" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Tables dans la base de donnees:" -ForegroundColor Green
            $TableLines = $Tables -split "`n"
            $TableCount = 0
            
            $ExpectedTables = @(
                "entreprises", "acteurs", "applications", "fonctions", "thematiques",
                "questionnaires", "questions", "formulaires", "reponses", 
                "maturity_analyses", "thematique_scores", "historique_scores",
                "grille_interpretation", "permissions"
            )
            
            $FoundTables = @()
            
            foreach ($Line in $TableLines) {
                $Line = $Line.Trim()
                if ($Line -and $Line -notmatch "Tables_in_" -and $Line -ne "") {
                    Write-Host "  - $Line" -ForegroundColor White
                    $FoundTables += $Line
                    $TableCount++
                }
            }
            
            Write-Host "`nResume:" -ForegroundColor Cyan
            Write-Host "   Tables creees: $TableCount" -ForegroundColor White
            Write-Host "   Tables attendues: $($ExpectedTables.Count)" -ForegroundColor White
            
            $MissingTables = $ExpectedTables | Where-Object { $_ -notin $FoundTables }
            if ($MissingTables.Count -gt 0) {
                Write-Host "Tables manquantes:" -ForegroundColor Yellow
                $MissingTables | ForEach-Object { Write-Host "   - $_" -ForegroundColor Yellow }
            } else {
                Write-Host "Toutes les tables principales sont presentes!" -ForegroundColor Green
            }
            
            return $true
        } else {
            Write-Host "Erreur lors de la verification: $Tables" -ForegroundColor Red
            return $false
        }
        
    } catch {
        Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    } finally {
        if ($ConfigFile -and (Test-Path $ConfigFile)) {
            Remove-Item $ConfigFile -Force -ErrorAction SilentlyContinue
        }
    }
}

# SCRIPT PRINCIPAL
try {
    Write-Host "Verification des prerequis..." -ForegroundColor Cyan
    
    # Verifier MySQL client
    try {
        $MySQLVersion = & "C:\Program Files\MariaDB 11.7\bin\mysql.exe" --version
        Write-Host "MySQL Client disponible" -ForegroundColor Green
        Write-Host "   Version: $MySQLVersion" -ForegroundColor Gray
    } catch {
        Write-Host "MySQL Client non trouve." -ForegroundColor Red
        Write-Host "Installez MariaDB ou MySQL Client" -ForegroundColor Yellow
        exit 1
    }
    
    # Verifier AWS CLI
    try {
        $AWSVersion = aws --version
        Write-Host "AWS CLI disponible" -ForegroundColor Green
        Write-Host "   Version: $AWSVersion" -ForegroundColor Gray
        
        $Identity = aws sts get-caller-identity | ConvertFrom-Json
        Write-Host "Credentials AWS configures" -ForegroundColor Green
        Write-Host "   Compte: $($Identity.Account)" -ForegroundColor Gray
        Write-Host "   Utilisateur: $($Identity.UserId)" -ForegroundColor Gray
    } catch {
        Write-Host "AWS CLI non trouve ou credentials mal configures" -ForegroundColor Red
        Write-Host "Configurez avec: aws configure" -ForegroundColor Yellow
        exit 1
    }
    
    # Etape 1: Recuperer les credentials
    $Credentials = Get-DatabaseCredentials
    
    # Etape 2: Test de connectivite reseau
    $NetworkOK = Test-NetworkConnectivity
    if (-not $NetworkOK) {
        Write-Host "`nPROBLEME DE CONNECTIVITE RESEAU DETECTE" -ForegroundColor Red
        Write-Host "Votre base RDS n'est pas accessible." -ForegroundColor Yellow
        Write-Host "Executez d'abord le script de correction reseau." -ForegroundColor Yellow
        exit 1
    }
    
    # Etape 3: Tester la connexion a la base
    $ConnectionOK = Test-DatabaseConnection -Credentials $Credentials
    if (-not $ConnectionOK) {
        Write-Host "`nIMPOSSIBLE DE SE CONNECTER A LA BASE DE DONNEES" -ForegroundColor Red
        Write-Host "Verifiez:" -ForegroundColor Yellow
        Write-Host "  1. Les credentials" -ForegroundColor Yellow
        Write-Host "  2. La base de donnees est accessible" -ForegroundColor Yellow
        Write-Host "  3. Les security groups" -ForegroundColor Yellow
        exit 1
    }
    
    # Etape 4: Initialiser la base
    $InitOK = Initialize-Database -Credentials $Credentials
    if (-not $InitOK) {
        Write-Host "`nEchec de l'initialisation de la base" -ForegroundColor Red
        exit 1
    }
    
    # Etape 5: Appliquer le schema
    $SchemaOK = Invoke-SchemaMigration -Credentials $Credentials
    if (-not $SchemaOK) {
        Write-Host "`nEchec de l'application du schema" -ForegroundColor Red
        exit 1
    }
    
    # Etape 6: Verifier le schema
    $VerificationOK = Test-DatabaseSchema -Credentials $Credentials
    if (-not $VerificationOK) {
        Write-Host "`nProbleme lors de la verification du schema" -ForegroundColor Yellow
    }
    
    Write-Host "`nMIGRATION DE BASE DE DONNEES TERMINEE AVEC SUCCES!" -ForegroundColor Green
    Write-Host "=============================================================" -ForegroundColor Green
    
    Write-Host "`nINFORMATIONS DE CONNEXION:" -ForegroundColor Cyan
    Write-Host "   Endpoint: $($Config.DATABASE_ENDPOINT)" -ForegroundColor White
    Write-Host "   Base: $($Config.DATABASE_NAME)" -ForegroundColor White
    Write-Host "   Port: 3306" -ForegroundColor White
    Write-Host "   Utilisateur: $($Credentials.username)" -ForegroundColor White
    
    Write-Host "`nPROCHAINES ETAPES:" -ForegroundColor Yellow
    Write-Host "   1. Infrastructure AWS deployee" -ForegroundColor Green
    Write-Host "   2. Base de donnees migree" -ForegroundColor Green
    Write-Host "   3. Deployer l'application backend" -ForegroundColor Yellow
    Write-Host "   4. Mettre a jour la configuration frontend" -ForegroundColor Yellow
    
} catch {
    Write-Host "`nERREUR LORS DE LA MIGRATION: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nSi le probleme persiste:" -ForegroundColor Yellow
    Write-Host "1. Verifiez la connectivite reseau" -ForegroundColor White
    Write-Host "2. Consultez les logs AWS RDS" -ForegroundColor White
    Write-Host "3. Verifiez les security groups" -ForegroundColor White
    exit 1
}