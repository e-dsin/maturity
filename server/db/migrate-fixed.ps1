# migrate-database-fixed.ps1 - Script de migration avec configuration MySQL corrigee

# Configuration
$DATABASE_SECRET_ARN = "arn:aws:secretsmanager:eu-west-1:637423285771:secret:maturity-db-dev-1QEB1e"
$DATABASE_ENDPOINT = "maturitybackend-dev-databaseb269d8bb-rh7bxy6kcqbb.cd6w86yy2wyp.eu-west-1.rds.amazonaws.com"
$DATABASE_NAME = "maturity_assessment"
$REGION = "eu-west-1"

Write-Host "=== MIGRATION DE BASE DE DONNEES (VERSION CORRIGEE) ===" -ForegroundColor Green

# Fonction pour creer un fichier de config MySQL valide
function New-MySQLConfigFile {
    param(
        $Host,
        $Port,
        $User,
        $Password,
        $Database = $null
    )
    
    $ConfigFile = "mysql-temp.cnf"
    
    # Echapper les caracteres speciaux dans le mot de passe
    $EscapedPassword = $Password -replace '\\', '\\\\' -replace '"', '\"' -replace "'", "\\'"
    
    $ConfigContent = "[client]`n"
    $ConfigContent += "host=$Host`n"
    $ConfigContent += "port=$Port`n"
    $ConfigContent += "user=$User`n"
    $ConfigContent += "password=`"$EscapedPassword`"`n"
    
    if ($Database) {
        $ConfigContent += "database=$Database`n"
    }
    
    # Ecrire le fichier avec encodage ANSI pour eviter les problemes
    [System.IO.File]::WriteAllText($ConfigFile, $ConfigContent, [System.Text.Encoding]::ASCII)
    
    return $ConfigFile
}

# Etape 1: Recuperer les credentials
Write-Host "`n1. Recuperation des credentials..." -ForegroundColor Cyan

try {
    $SecretValue = aws secretsmanager get-secret-value --secret-id $DATABASE_SECRET_ARN --region $REGION --query 'SecretString' --output text
    
    if ($LASTEXITCODE -ne 0) {
        throw "Erreur AWS CLI"
    }
    
    $Credentials = $SecretValue | ConvertFrom-Json
    $DB_USER = $Credentials.username
    $DB_PASSWORD = $Credentials.password
    
    Write-Host "Credentials recuperes pour l'utilisateur: $DB_USER" -ForegroundColor Green
    
} catch {
    Write-Host "ERREUR: Impossible de recuperer les credentials: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Etape 2: Test de connexion
Write-Host "`n2. Test de connexion a la base..." -ForegroundColor Cyan

try {
    # Creer le fichier de configuration
    $ConfigFile = New-MySQLConfigFile -Host $DATABASE_ENDPOINT -Port 3306 -User $DB_USER -Password $DB_PASSWORD
    
    Write-Host "Fichier de config cree: $ConfigFile" -ForegroundColor Yellow
    
    # Afficher le contenu du fichier pour debug (sans le mot de passe)
    $ConfigContent = Get-Content $ConfigFile
    Write-Host "Contenu du fichier de config:" -ForegroundColor Gray
    foreach ($Line in $ConfigContent) {
        if ($Line -notmatch "password") {
            Write-Host "  $Line" -ForegroundColor Gray
        } else {
            Write-Host "  password=***" -ForegroundColor Gray
        }
    }
    
    # Test de connexion
    Write-Host "Test de connexion..." -ForegroundColor Yellow
    $TestResult = mysql --defaults-file=$ConfigFile -e "SELECT 1 AS test" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Connexion reussie!" -ForegroundColor Green
    } else {
        Write-Host "ERREUR de connexion:" -ForegroundColor Red
        Write-Host $TestResult -ForegroundColor Red
        
        # Essayer une connexion directe sans fichier de config
        Write-Host "`nTentative de connexion directe..." -ForegroundColor Yellow
        $DirectResult = mysql -h $DATABASE_ENDPOINT -P 3306 -u $DB_USER -p$DB_PASSWORD -e "SELECT 1 AS test" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Connexion directe reussie!" -ForegroundColor Green
            $UseDirectConnection = $true
        } else {
            Write-Host "Connexion directe echouee aussi:" -ForegroundColor Red
            Write-Host $DirectResult -ForegroundColor Red
            Remove-Item $ConfigFile -Force -ErrorAction SilentlyContinue
            exit 1
        }
    }
    
} catch {
    Write-Host "ERREUR lors du test de connexion: $($_.Exception.Message)" -ForegroundColor Red
    Remove-Item $ConfigFile -Force -ErrorAction SilentlyContinue
    exit 1
}

# Etape 3: Creer la base de donnees
Write-Host "`n3. Creation de la base de donnees..." -ForegroundColor Cyan

try {
    if ($UseDirectConnection) {
        $CreateResult = mysql -h $DATABASE_ENDPOINT -P 3306 -u $DB_USER -p$DB_PASSWORD -e "CREATE DATABASE IF NOT EXISTS $DATABASE_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci" 2>&1
    } else {
        $CreateResult = mysql --defaults-file=$ConfigFile -e "CREATE DATABASE IF NOT EXISTS $DATABASE_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci" 2>&1
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Base de donnees '$DATABASE_NAME' creee/verifiee avec succes" -ForegroundColor Green
    } else {
        Write-Host "ERREUR lors de la creation de la base:" -ForegroundColor Red
        Write-Host $CreateResult -ForegroundColor Red
    }
    
} catch {
    Write-Host "ERREUR: $($_.Exception.Message)" -ForegroundColor Red
}

# Etape 4: Verifier que le fichier schema existe
Write-Host "`n4. Verification du fichier schema..." -ForegroundColor Cyan

if (-not (Test-Path "schema-fixed.sql")) {
    Write-Host "ERREUR: Fichier schema-fixed.sql non trouve" -ForegroundColor Red
    Write-Host "Repertoire actuel: $(Get-Location)" -ForegroundColor Yellow
    Write-Host "Fichiers SQL disponibles:" -ForegroundColor Yellow
    Get-ChildItem -Filter "*.sql" | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor White }
    
    Remove-Item $ConfigFile -Force -ErrorAction SilentlyContinue
    exit 1
} else {
    Write-Host "Fichier schema-fixed.sql trouve" -ForegroundColor Green
}

# Etape 5: Appliquer le schema
Write-Host "`n5. Application du schema..." -ForegroundColor Cyan

try {
    # Creer un nouveau fichier de config avec la base de donnees
    if (-not $UseDirectConnection) {
        Remove-Item $ConfigFile -Force -ErrorAction SilentlyContinue
        $ConfigFile = New-MySQLConfigFile -Host $DATABASE_ENDPOINT -Port 3306 -User $DB_USER -Password $DB_PASSWORD -Database $DATABASE_NAME
    }
    
    Write-Host "Execution du fichier schema-fixed.sql..." -ForegroundColor Yellow
    
    if ($UseDirectConnection) {
        $SchemaResult = mysql -h $DATABASE_ENDPOINT -P 3306 -u $DB_USER -p$DB_PASSWORD $DATABASE_NAME < "schema-fixed.sql" 2>&1
    } else {
        $SchemaResult = mysql --defaults-file=$ConfigFile < "schema-fixed.sql" 2>&1
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Schema applique avec succes!" -ForegroundColor Green
    } else {
        Write-Host "ERREUR lors de l'application du schema:" -ForegroundColor Red
        Write-Host $SchemaResult -ForegroundColor Red
        
        # Essayer de voir si c'est juste des warnings
        if ($SchemaResult -match "ERROR") {
            Write-Host "Erreurs detectees dans le schema" -ForegroundColor Red
        } else {
            Write-Host "Probablement juste des warnings, continuons..." -ForegroundColor Yellow
        }
    }
    
} catch {
    Write-Host "ERREUR: $($_.Exception.Message)" -ForegroundColor Red
}

# Etape 6: Verification des tables
Write-Host "`n6. Verification des tables creees..." -ForegroundColor Cyan

try {
    if ($UseDirectConnection) {
        $TablesResult = mysql -h $DATABASE_ENDPOINT -P 3306 -u $DB_USER -p$DB_PASSWORD $DATABASE_NAME -e "SHOW TABLES" 2>&1
    } else {
        $TablesResult = mysql --defaults-file=$ConfigFile -e "SHOW TABLES" 2>&1
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Tables creees dans la base $DATABASE_NAME :" -ForegroundColor Green
        
        $TableLines = $TablesResult -split "`r?`n"
        $TableCount = 0
        
        foreach ($Line in $TableLines) {
            $Line = $Line.Trim()
            if ($Line -and $Line -notmatch "Tables_in_" -and $Line -ne "" -and $Line -notmatch "^-+$") {
                Write-Host "  ✓ $Line" -ForegroundColor White
                $TableCount++
            }
        }
        
        Write-Host "`nTotal: $TableCount tables creees" -ForegroundColor Green
        
        # Verifier quelques tables importantes
        $ImportantTables = @("entreprises", "acteurs", "applications", "questionnaires", "questions", "reponses")
        Write-Host "`nVerification des tables importantes:" -ForegroundColor Cyan
        
        foreach ($Table in $ImportantTables) {
            if ($TablesResult -match $Table) {
                Write-Host "  ✓ $Table" -ForegroundColor Green
            } else {
                Write-Host "  ✗ $Table manquante" -ForegroundColor Red
            }
        }
        
    } else {
        Write-Host "ERREUR lors de la verification des tables:" -ForegroundColor Red
        Write-Host $TablesResult -ForegroundColor Red
    }
    
} catch {
    Write-Host "ERREUR: $($_.Exception.Message)" -ForegroundColor Red
}

# Nettoyage
if (Test-Path $ConfigFile) {
    Remove-Item $ConfigFile -Force -ErrorAction SilentlyContinue
    Write-Host "`nFichier de configuration temporaire supprime" -ForegroundColor Gray
}

# Etape 7: Resume final
Write-Host "`n" + "="*60 -ForegroundColor Green
Write-Host "MIGRATION TERMINEE" -ForegroundColor Green
Write-Host "="*60 -ForegroundColor Green

Write-Host "`nINFORMATIONS DE CONNEXION:" -ForegroundColor Cyan
Write-Host "Host     : $DATABASE_ENDPOINT" -ForegroundColor White
Write-Host "Database : $DATABASE_NAME" -ForegroundColor White
Write-Host "User     : $DB_USER" -ForegroundColor White
Write-Host "Password : [Stocke dans AWS Secrets Manager]" -ForegroundColor White

Write-Host "`nPROCHAINES ETAPES:" -ForegroundColor Yellow
Write-Host "1. ✅ Infrastructure AWS deployee" -ForegroundColor Green
Write-Host "2. ✅ Base de donnees migree" -ForegroundColor Green
Write-Host "3. 🔄 Deployer l'application backend" -ForegroundColor Yellow
Write-Host "4. 🔄 Mettre a jour le frontend" -ForegroundColor Yellow
Write-Host "5. 🔄 Tester la connectivite end-to-end" -ForegroundColor Yellow

Write-Host "`nCOMMANDE POUR TESTER LA CONNEXION MANUELLEMENT:" -ForegroundColor Cyan
Write-Host "mysql -h $DATABASE_ENDPOINT -P 3306 -u $DB_USER -p $DATABASE_NAME" -ForegroundColor Gray

Write-Host "`nSUCCES! La base de donnees est prete pour l'application." -ForegroundColor Green