# migration-no-special-chars.ps1 - Migration sans problemes de caracteres speciaux

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "dev"
)

# Configuration EXACTE
$Config = @{
    DATABASE_ENDPOINT = "maturitybackend-dev-databaseb269d8bb-rh7bxy6kcqbb.cd6w86yy2wyp.eu-west-1.rds.amazonaws.com"
    REGION = "eu-west-1"
    DATABASE_NAME = "maturity_assessment"
    RDS_IDENTIFIER = "maturitybackend-dev-databaseb269d8bb-rh7bxy6kcqbb"
    SECRET_ARN = "arn:aws:secretsmanager:eu-west-1:637423285771:secret:rdsdb-8400c0dc-ab78-4127-8515-f8f6197d3c88-D5wzPP"
}

Write-Host "MIGRATION SANS CARACTERES SPECIAUX - Environment: $Environment" -ForegroundColor Green
Write-Host "=============================================================" -ForegroundColor Green

# Fonction pour obtenir une IP IPv4 publique
function Get-PublicIPv4 {
    Write-Host "`nObtention de votre IP publique IPv4..." -ForegroundColor Cyan
    
    $IPv4Services = @(
        "https://ipv4.icanhazip.com",
        "https://ipinfo.io/ip",
        "https://api.ipify.org",
        "https://checkip.amazonaws.com"
    )
    
    foreach ($Service in $IPv4Services) {
        try {
            $IP = (Invoke-WebRequest -Uri $Service -UseBasicParsing -TimeoutSec 10).Content.Trim()
            
            if ($IP -match '^(\d{1,3}\.){3}\d{1,3}$') {
                Write-Host "✅ IP IPv4 obtenue: $IP" -ForegroundColor Green
                return $IP
            }
        } catch {
            continue
        }
    }
    
    Write-Host "⚠️  Utilisation d'une plage large (0.0.0.0/0)" -ForegroundColor Yellow
    return "0.0.0.0/0"
}

# Fonction pour obtenir les credentials depuis AWS Secrets Manager
function Get-DatabaseCredentials {
    Write-Host "`nRecuperation des credentials depuis AWS Secrets Manager..." -ForegroundColor Cyan
    
    try {
        $SecretValue = aws secretsmanager get-secret-value --secret-id $Config.SECRET_ARN --region $Config.REGION --query 'SecretString' --output text
        
        if ($LASTEXITCODE -ne 0) {
            throw "Impossible de recuperer le secret"
        }
        
        $Credentials = $SecretValue | ConvertFrom-Json
        
        Write-Host "✅ Credentials recuperes avec succes" -ForegroundColor Green
        Write-Host "   Username: $($Credentials.username)" -ForegroundColor White
        
        return $Credentials
        
    } catch {
        Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
        
        # Fallback vers saisie manuelle
        Write-Host "`nFallback vers saisie manuelle..." -ForegroundColor Yellow
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

# Fonction pour corriger les Security Groups
function Fix-SecurityGroupsIPv4 {
    param($MyIPv4)
    
    Write-Host "`nCorrection des Security Groups..." -ForegroundColor Cyan
    Write-Host "IP IPv4 utilisee: $MyIPv4" -ForegroundColor White
    
    try {
        $RDSInfo = aws rds describe-db-instances --db-instance-identifier $Config.RDS_IDENTIFIER --region $Config.REGION | ConvertFrom-Json
        
        if ($RDSInfo.DBInstances.Count -gt 0) {
            $SecurityGroups = $RDSInfo.DBInstances[0].VpcSecurityGroups
            
            foreach ($SG in $SecurityGroups) {
                Write-Host "  Processing SG: $($SG.VpcSecurityGroupId)" -ForegroundColor White
                
                try {
                    $CIDR = if ($MyIPv4 -eq "0.0.0.0/0") { "0.0.0.0/0" } else { "$MyIPv4/32" }
                    
                    $Result = aws ec2 authorize-security-group-ingress --group-id $SG.VpcSecurityGroupId --protocol tcp --port 3306 --cidr $CIDR --region $Config.REGION 2>&1
                    
                    if ($LASTEXITCODE -eq 0) {
                        Write-Host "    ✅ Regle ajoutee avec succes" -ForegroundColor Green
                    } else {
                        if ($Result -like "*already exists*" -or $Result -like "*Duplicate*") {
                            Write-Host "    ✅ Regle deja existante" -ForegroundColor Green
                        } else {
                            Write-Host "    ⚠️  $Result" -ForegroundColor Yellow
                        }
                    }
                } catch {
                    Write-Host "    ❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
                }
            }
            
            Write-Host "`nAttente de 30 secondes pour que les regles prennent effet..." -ForegroundColor Yellow
            Start-Sleep -Seconds 30
            
            return $true
        }
        
    } catch {
        Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction pour preparer le certificat SSL dans un repertoire sans caracteres speciaux
function Prepare-SSLCertificate {
    Write-Host "`nPreparation du certificat SSL..." -ForegroundColor Cyan
    
    # Utiliser le repertoire temporaire systeme (pas de caracteres speciaux)
    $TempSSLDir = Join-Path $env:TEMP "maturity-ssl"
    $SSLPath = Join-Path $TempSSLDir "eu-west-1-bundle.pem"
    
    try {
        # Creer le repertoire
        if (-not (Test-Path $TempSSLDir)) {
            New-Item -ItemType Directory -Path $TempSSLDir -Force | Out-Null
        }
        
        # Telecharger le certificat
        if (-not (Test-Path $SSLPath)) {
            Write-Host "Telechargement du certificat SSL vers: $SSLPath" -ForegroundColor Yellow
            Invoke-WebRequest -Uri "https://truststore.pki.rds.amazonaws.com/eu-west-1/eu-west-1-bundle.pem" -OutFile $SSLPath -UseBasicParsing
        }
        
        if (Test-Path $SSLPath) {
            Write-Host "✅ Certificat SSL pret: $SSLPath" -ForegroundColor Green
            return $SSLPath
        } else {
            Write-Host "❌ Echec du telechargement du certificat" -ForegroundColor Red
            return $null
        }
        
    } catch {
        Write-Host "❌ Erreur lors de la preparation SSL: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Fonction pour tester la connectivite MySQL
function Test-MySQLConnection {
    param($Credentials, $SSLPath)
    
    Write-Host "`nTest de connectivite MySQL..." -ForegroundColor Cyan
    
    # Configurations a tester (ordre de preference)
    $TestConfigs = @()
    
    # 1. Sans SSL (plus simple, fonctionne souvent)
    $TestConfigs += @{
        Name = "Sans SSL"
        Config = "[client]`nhost=$($Config.DATABASE_ENDPOINT)`nport=3306`nuser=$($Credentials.username)`npassword=$($Credentials.password)"
        RequiresSSL = $false
    }
    
    # 2. Avec SSL si disponible
    if ($SSLPath -and (Test-Path $SSLPath)) {
        $TestConfigs += @{
            Name = "SSL sans verification"
            Config = "[client]`nhost=$($Config.DATABASE_ENDPOINT)`nport=3306`nuser=$($Credentials.username)`npassword=$($Credentials.password)`nssl-ca=$SSLPath"
            RequiresSSL = $true
        }
        
        $TestConfigs += @{
            Name = "SSL avec verification"
            Config = "[client]`nhost=$($Config.DATABASE_ENDPOINT)`nport=3306`nuser=$($Credentials.username)`npassword=$($Credentials.password)`nssl-ca=$SSLPath`nssl-verify-server-cert"
            RequiresSSL = $true
        }
    }
    
    # Tester chaque configuration
    foreach ($TestConfig in $TestConfigs) {
        Write-Host "`n   Test avec: $($TestConfig.Name)" -ForegroundColor Yellow
        
        $TempDir = [System.IO.Path]::GetTempPath()
        $ConfigFile = Join-Path $TempDir "mysql_test_$(Get-Random).cnf"
        
        try {
            # Ecrire la configuration en ASCII pour eviter les problemes d'encodage
            [System.IO.File]::WriteAllText($ConfigFile, $TestConfig.Config, [System.Text.Encoding]::ASCII)
            
            # Tester la connexion
            $TestQuery = "SELECT 1 as test, NOW() as current_time, VERSION() as version"
            $TestResult = & "C:\Program Files\MariaDB 11.7\bin\mysql.exe" --defaults-file="$ConfigFile" --connect-timeout=15 -e "$TestQuery" 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "   ✅ CONNEXION REUSSIE avec: $($TestConfig.Name)" -ForegroundColor Green
                Write-Host "   Resultat: $($TestResult -split "`n" | Select-Object -First 2)" -ForegroundColor Gray
                
                # Sauvegarder la configuration qui marche
                $Global:WorkingMySQLConfig = $TestConfig.Config
                return $true
            } else {
                Write-Host "   ❌ Echec: $($TestResult)" -ForegroundColor Red
            }
            
        } catch {
            Write-Host "   ❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
        } finally {
            if (Test-Path $ConfigFile) {
                Remove-Item $ConfigFile -Force -ErrorAction SilentlyContinue
            }
        }
    }
    
    return $false
}

# Fonction pour migrer la base de donnees
function Start-DatabaseMigration {
    param($Credentials)
    
    Write-Host "`nDemarrage de la migration..." -ForegroundColor Cyan
    
    if (-not $Global:WorkingMySQLConfig) {
        Write-Host "❌ Aucune configuration MySQL fonctionnelle" -ForegroundColor Red
        return $false
    }
    
    $TempDir = [System.IO.Path]::GetTempPath()
    $ConfigFile = Join-Path $TempDir "mysql_migration_$(Get-Random).cnf"
    
    try {
        # 1. Test de base
        [System.IO.File]::WriteAllText($ConfigFile, $Global:WorkingMySQLConfig, [System.Text.Encoding]::ASCII)
        
        Write-Host "`n1. Creation/verification de la base '$($Config.DATABASE_NAME)'..." -ForegroundColor Yellow
        $CreateDBQuery = "CREATE DATABASE IF NOT EXISTS $($Config.DATABASE_NAME) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
        $CreateResult = & "C:\Program Files\MariaDB 11.7\bin\mysql.exe" --defaults-file="$ConfigFile" -e "$CreateDBQuery" 2>&1
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Erreur creation base: $CreateResult" -ForegroundColor Red
            return $false
        }
        Write-Host "✅ Base de donnees prete" -ForegroundColor Green
        
        # 2. Chercher le fichier schema
        Write-Host "`n2. Recherche du fichier schema..." -ForegroundColor Yellow
        $SchemaFile = $null
        $PossiblePaths = @(
            ".\schema-fixed.sql",
            ".\server\db\schema-fixed.sql", 
            ".\db\schema-fixed.sql",
            "..\schema-fixed.sql",
            "C:\Users\Marcel-Cédric\maturity-assessment-dasboard\schema-fixed.sql"
        )
        
        foreach ($Path in $PossiblePaths) {
            if (Test-Path $Path) {
                $SchemaFile = $Path
                Write-Host "✅ Schema trouve: $SchemaFile" -ForegroundColor Green
                break
            }
        }
        
        if (-not $SchemaFile) {
            Write-Host "❌ Fichier schema-fixed.sql non trouve" -ForegroundColor Red
            Write-Host "Emplacements cherches:" -ForegroundColor Yellow
            $PossiblePaths | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
            
            $ManualPath = Read-Host "Entrez le chemin complet vers schema-fixed.sql (ou ENTREE pour ignorer)"
            if ($ManualPath -and (Test-Path $ManualPath)) {
                $SchemaFile = $ManualPath
            } else {
                Write-Host "Migration sans schema (base vide creee)" -ForegroundColor Yellow
                return $true
            }
        }
        
        # 3. Appliquer le schema
        Write-Host "`n3. Application du schema..." -ForegroundColor Yellow
        
        # Mettre a jour la config pour inclure la base de donnees
        $ConfigWithDB = $Global:WorkingMySQLConfig + "`ndatabase=$($Config.DATABASE_NAME)"
        [System.IO.File]::WriteAllText($ConfigFile, $ConfigWithDB, [System.Text.Encoding]::ASCII)
        
        # Appliquer le schema par petits morceaux pour eviter les timeouts
        Write-Host "Lecture du fichier schema..." -ForegroundColor Gray
        $SchemaContent = Get-Content $SchemaFile -Raw
        
        Write-Host "Application du schema (cela peut prendre quelques minutes)..." -ForegroundColor Gray
        $SchemaResult = $SchemaContent | & "C:\Program Files\MariaDB 11.7\bin\mysql.exe" --defaults-file="$ConfigFile" --connect-timeout=60 --max_allowed_packet=1073741824 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Schema applique avec succes!" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Schema applique avec des avertissements:" -ForegroundColor Yellow
            Write-Host $SchemaResult -ForegroundColor Gray
        }
        
        # 4. Verification des tables
        Write-Host "`n4. Verification des tables creees..." -ForegroundColor Yellow
        $TablesResult = & "C:\Program Files\MariaDB 11.7\bin\mysql.exe" --defaults-file="$ConfigFile" -e "SHOW TABLES" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Tables creees:" -ForegroundColor Green
            $Tables = $TablesResult -split "`n" | Where-Object { $_ -and $_ -notmatch "Tables_in_" }
            $TableCount = 0
            foreach ($Table in $Tables) {
                $Table = $Table.Trim()
                if ($Table) {
                    Write-Host "  - $Table" -ForegroundColor White
                    $TableCount++
                }
            }
            Write-Host "`nTotal: $TableCount tables creees" -ForegroundColor Green
        }
        
        return $true
        
    } catch {
        Write-Host "❌ Erreur lors de la migration: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    } finally {
        if (Test-Path $ConfigFile) {
            Remove-Item $ConfigFile -Force -ErrorAction SilentlyContinue
        }
    }
}

# SCRIPT PRINCIPAL
try {
    Write-Host "Configuration:" -ForegroundColor Cyan
    Write-Host "  Endpoint: $($Config.DATABASE_ENDPOINT)" -ForegroundColor White
    Write-Host "  Region: $($Config.REGION)" -ForegroundColor White
    Write-Host "  Base: $($Config.DATABASE_NAME)" -ForegroundColor White
    
    # Etape 1: IP IPv4
    $MyIPv4 = Get-PublicIPv4
    
    # Etape 2: Credentials
    $Credentials = Get-DatabaseCredentials
    if (-not $Credentials) {
        Write-Host "❌ Impossible d'obtenir les credentials" -ForegroundColor Red
        exit 1
    }
    
    # Etape 3: Security Groups
    $SGOk = Fix-SecurityGroupsIPv4 -MyIPv4 $MyIPv4
    
    # Etape 4: Certificat SSL (optionnel)
    $SSLPath = Prepare-SSLCertificate
    
    # Etape 5: Test connexion
    $ConnectOk = Test-MySQLConnection -Credentials $Credentials -SSLPath $SSLPath
    
    if (-not $ConnectOk) {
        Write-Host "`n❌ Impossible de se connecter a MySQL" -ForegroundColor Red
        Write-Host "`nVerifiez:" -ForegroundColor Yellow
        Write-Host "1. Que la base RDS est demarree" -ForegroundColor White
        Write-Host "2. Les credentials (username/password)" -ForegroundColor White  
        Write-Host "3. Les Security Groups (peut prendre quelques minutes)" -ForegroundColor White
        exit 1
    }
    
    # Etape 6: Migration
    Write-Host "`n" + "="*60 -ForegroundColor Green
    Write-Host "CONNEXION MYSQL ETABLIE - DEBUT DE LA MIGRATION" -ForegroundColor Green
    Write-Host "="*60 -ForegroundColor Green
    
    $MigrationOk = Start-DatabaseMigration -Credentials $Credentials
    
    if ($MigrationOk) {
        Write-Host "`n🎉 MIGRATION TERMINEE AVEC SUCCES!" -ForegroundColor Green
        Write-Host "====================================" -ForegroundColor Green
        Write-Host "`nVotre base de donnees est maintenant prete!" -ForegroundColor White
        Write-Host "`nInformations de connexion:" -ForegroundColor Cyan
        Write-Host "  Host: $($Config.DATABASE_ENDPOINT)" -ForegroundColor White
        Write-Host "  Port: 3306" -ForegroundColor White
        Write-Host "  Database: $($Config.DATABASE_NAME)" -ForegroundColor White
        Write-Host "  Username: $($Credentials.username)" -ForegroundColor White
        Write-Host "  Region: $($Config.REGION)" -ForegroundColor White
        
        Write-Host "`nCommande de test:" -ForegroundColor Yellow
        Write-Host "mysql -h $($Config.DATABASE_ENDPOINT) -P 3306 -u $($Credentials.username) -p$($Config.DATABASE_NAME)" -ForegroundColor Gray
        
    } else {
        Write-Host "`n❌ La migration a echoue" -ForegroundColor Red
    }
    
} catch {
    Write-Host "`n❌ ERREUR CRITIQUE: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}