# migration-ipv4-fix.ps1 - Migration avec correction IPv4 et utilisation du secret AWS

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

Write-Host "MIGRATION AVEC CORRECTION IPv4 - Environment: $Environment" -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Green

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
            Write-Host "Tentative avec $Service..." -ForegroundColor Yellow
            $IP = (Invoke-WebRequest -Uri $Service -UseBasicParsing -TimeoutSec 10).Content.Trim()
            
            # Verifier que c'est bien une IPv4
            if ($IP -match '^(\d{1,3}\.){3}\d{1,3}$') {
                Write-Host "✅ IP IPv4 obtenue: $IP" -ForegroundColor Green
                return $IP
            }
        } catch {
            Write-Host "   Echec avec $Service" -ForegroundColor Gray
        }
    }
    
    Write-Host "❌ Impossible d'obtenir une IP IPv4. Utilisation d'une plage large." -ForegroundColor Yellow
    return "0.0.0.0/0"  # Utiliser une plage large en dernier recours
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
        Write-Host "   Password: [MASQUE]" -ForegroundColor White
        
        return $Credentials
        
    } catch {
        Write-Host "❌ Erreur lors de la recuperation des credentials: $($_.Exception.Message)" -ForegroundColor Red
        
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

# Fonction pour corriger les Security Groups avec IPv4
function Fix-SecurityGroupsIPv4 {
    param($MyIPv4)
    
    Write-Host "`nCorrection des Security Groups avec IPv4..." -ForegroundColor Cyan
    Write-Host "IP IPv4 utilisee: $MyIPv4" -ForegroundColor White
    
    try {
        # Obtenir les Security Groups de la base RDS
        $RDSInfo = aws rds describe-db-instances --db-instance-identifier $Config.RDS_IDENTIFIER --region $Config.REGION | ConvertFrom-Json
        
        if ($RDSInfo.DBInstances.Count -gt 0) {
            $SecurityGroups = $RDSInfo.DBInstances[0].VpcSecurityGroups
            
            Write-Host "Security Groups trouves:" -ForegroundColor Green
            foreach ($SG in $SecurityGroups) {
                Write-Host "  Processing SG: $($SG.VpcSecurityGroupId)" -ForegroundColor White
                
                try {
                    # Determiner le CIDR a utiliser
                    $CIDR = if ($MyIPv4 -eq "0.0.0.0/0") { "0.0.0.0/0" } else { "$MyIPv4/32" }
                    
                    Write-Host "    Ajout regle MySQL pour CIDR: $CIDR" -ForegroundColor Yellow
                    $Result = aws ec2 authorize-security-group-ingress --group-id $SG.VpcSecurityGroupId --protocol tcp --port 3306 --cidr $CIDR --region $Config.REGION 2>&1
                    
                    if ($LASTEXITCODE -eq 0) {
                        Write-Host "    ✅ Regle ajoutee avec succes" -ForegroundColor Green
                    } else {
                        if ($Result -like "*already exists*" -or $Result -like "*Duplicate*") {
                            Write-Host "    ✅ Regle deja existante" -ForegroundColor Green
                        } else {
                            Write-Host "    ⚠️  Info: $Result" -ForegroundColor Yellow
                        }
                    }
                } catch {
                    Write-Host "    ❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
                }
            }
            
            # Attendre que les regles prennent effet
            Write-Host "`nAttente de 30 secondes pour que les regles prennent effet..." -ForegroundColor Yellow
            Start-Sleep -Seconds 30
            
            return $true
        } else {
            Write-Host "❌ Instance RDS non trouvee!" -ForegroundColor Red
            return $false
        }
        
    } catch {
        Write-Host "❌ Erreur lors de la correction des Security Groups: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction pour tester la connectivite avec plusieurs methodes
function Test-DatabaseConnectivity {
    param($Credentials)
    
    Write-Host "`nTest de connectivite vers la base de donnees..." -ForegroundColor Cyan
    
    # Test 1: Connectivite TCP basique
    Write-Host "`n1. Test TCP basique..." -ForegroundColor Yellow
    try {
        $TCPClient = New-Object System.Net.Sockets.TcpClient
        $Connect = $TCPClient.BeginConnect($Config.DATABASE_ENDPOINT, 3306, $null, $null)
        $Wait = $Connect.AsyncWaitHandle.WaitOne(15000, $false)
        
        if ($Wait) {
            $TCPClient.EndConnect($Connect)
            $TCPClient.Close()
            Write-Host "   ✅ Connectivite TCP reussie" -ForegroundColor Green
        } else {
            $TCPClient.Close()
            Write-Host "   ❌ Connectivite TCP echouee (timeout)" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "   ❌ Erreur TCP: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    
    # Test 2: Connexion MySQL avec plusieurs configurations
    Write-Host "`n2. Test connexion MySQL..." -ForegroundColor Yellow
    
    $SSLPath = "$env:USERPROFILE\maturity-assessment-dasboard\server\eu-west-1-bundle.pem"
    
    # Telecharger le certificat SSL si necessaire
    if (-not (Test-Path $SSLPath)) {
        Write-Host "   Telechargement certificat SSL..." -ForegroundColor Yellow
        try {
            $SSLDir = Split-Path $SSLPath -Parent
            if (-not (Test-Path $SSLDir)) {
                New-Item -ItemType Directory -Path $SSLDir -Force | Out-Null
            }
            Invoke-WebRequest -Uri "https://truststore.pki.rds.amazonaws.com/eu-west-1/eu-west-1-bundle.pem" -OutFile $SSLPath -UseBasicParsing
            Write-Host "   ✅ Certificat SSL telecharge" -ForegroundColor Green
        } catch {
            Write-Host "   ⚠️  Impossible de telecharger le certificat SSL" -ForegroundColor Yellow
            $SSLPath = $null
        }
    }
    
    # Configurations MySQL a tester
    $Configurations = @()
    
    if ($SSLPath -and (Test-Path $SSLPath)) {
        $Configurations += @{
            Name = "SSL avec verification"
            Config = "[client]`nhost=$($Config.DATABASE_ENDPOINT)`nport=3306`nuser=$($Credentials.username)`npassword=$($Credentials.password)`nssl-ca=$SSLPath`nssl-verify-server-cert"
        }
        $Configurations += @{
            Name = "SSL sans verification"
            Config = "[client]`nhost=$($Config.DATABASE_ENDPOINT)`nport=3306`nuser=$($Credentials.username)`npassword=$($Credentials.password)`nssl-ca=$SSLPath"
        }
    }
    
    $Configurations += @{
        Name = "Sans SSL"
        Config = "[client]`nhost=$($Config.DATABASE_ENDPOINT)`nport=3306`nuser=$($Credentials.username)`npassword=$($Credentials.password)"
    }
    
    foreach ($TestConfig in $Configurations) {
        Write-Host "   Test avec: $($TestConfig.Name)" -ForegroundColor Yellow
        
        $TempDir = [System.IO.Path]::GetTempPath()
        $TempFile = [System.IO.Path]::GetRandomFileName()
        $ConfigFile = Join-Path $TempDir "$TempFile.cnf"
        
        try {
            [System.IO.File]::WriteAllText($ConfigFile, $TestConfig.Config, [System.Text.Encoding]::ASCII)
            
            $TestQuery = "SELECT 1 as test, NOW() as current_time"
            $TestResult = & "C:\Program Files\MariaDB 11.7\bin\mysql.exe" --defaults-file="$ConfigFile" --connect-timeout=15 -e "$TestQuery" 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "   ✅ Connexion MySQL reussie avec: $($TestConfig.Name)" -ForegroundColor Green
                Write-Host "   Resultat: $TestResult" -ForegroundColor Gray
                
                # Sauvegarder la configuration qui marche
                $Global:WorkingConfig = $TestConfig.Config
                return $true
            } else {
                Write-Host "   ❌ Echec avec $($TestConfig.Name): $TestResult" -ForegroundColor Red
            }
            
        } catch {
            Write-Host "   ❌ Erreur avec $($TestConfig.Name): $($_.Exception.Message)" -ForegroundColor Red
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
    
    Write-Host "`nDemarrage de la migration de la base de donnees..." -ForegroundColor Cyan
    
    if (-not $Global:WorkingConfig) {
        Write-Host "❌ Aucune configuration MySQL fonctionnelle trouvee" -ForegroundColor Red
        return $false
    }
    
    $TempDir = [System.IO.Path]::GetTempPath()
    $TempFile = [System.IO.Path]::GetRandomFileName()
    $ConfigFile = Join-Path $TempDir "$TempFile.cnf"
    
    try {
        [System.IO.File]::WriteAllText($ConfigFile, $Global:WorkingConfig, [System.Text.Encoding]::ASCII)
        
        # Creer la base de donnees
        Write-Host "Creation de la base '$($Config.DATABASE_NAME)'..." -ForegroundColor Yellow
        $CreateDBQuery = "CREATE DATABASE IF NOT EXISTS $($Config.DATABASE_NAME) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
        $CreateResult = & "C:\Program Files\MariaDB 11.7\bin\mysql.exe" --defaults-file="$ConfigFile" -e "$CreateDBQuery" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Base de donnees creee/verifiee" -ForegroundColor Green
        } else {
            Write-Host "❌ Erreur creation base: $CreateResult" -ForegroundColor Red
            return $false
        }
        
        # Chercher le fichier schema
        $SchemaFile = $null
        $PossiblePaths = @(".\schema-fixed.sql", ".\server\db\schema-fixed.sql", ".\db\schema-fixed.sql", "..\schema-fixed.sql")
        
        foreach ($Path in $PossiblePaths) {
            if (Test-Path $Path) {
                $SchemaFile = $Path
                break
            }
        }
        
        if (-not $SchemaFile) {
            Write-Host "❌ Fichier schema-fixed.sql non trouve" -ForegroundColor Red
            return $false
        }
        
        Write-Host "Application du schema depuis: $SchemaFile" -ForegroundColor Yellow
        
        # Mettre a jour la config avec la base de donnees
        $ConfigWithDB = $Global:WorkingConfig + "`ndatabase=$($Config.DATABASE_NAME)"
        [System.IO.File]::WriteAllText($ConfigFile, $ConfigWithDB, [System.Text.Encoding]::ASCII)
        
        # Appliquer le schema
        $SchemaResult = Get-Content $SchemaFile -Raw | & "C:\Program Files\MariaDB 11.7\bin\mysql.exe" --defaults-file="$ConfigFile" --connect-timeout=60 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Schema applique avec succes!" -ForegroundColor Green
            
            # Verifier les tables
            $TablesResult = & "C:\Program Files\MariaDB 11.7\bin\mysql.exe" --defaults-file="$ConfigFile" -e "SHOW TABLES" 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "`nTables creees:" -ForegroundColor Green
                $TablesResult -split "`n" | Where-Object { $_ -and $_ -notmatch "Tables_in_" } | ForEach-Object {
                    $Table = $_.Trim()
                    if ($Table) { Write-Host "  - $Table" -ForegroundColor White }
                }
            }
            
            return $true
        } else {
            Write-Host "❌ Erreur schema: $SchemaResult" -ForegroundColor Red
            return $false
        }
        
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
    # Etape 1: Obtenir IPv4
    $MyIPv4 = Get-PublicIPv4
    
    # Etape 2: Obtenir les credentials
    $Credentials = Get-DatabaseCredentials
    if (-not $Credentials) {
        Write-Host "❌ Impossible d'obtenir les credentials" -ForegroundColor Red
        exit 1
    }
    
    # Etape 3: Corriger les Security Groups
    $SGOk = Fix-SecurityGroupsIPv4 -MyIPv4 $MyIPv4
    
    # Etape 4: Tester la connectivite
    $ConnectOk = Test-DatabaseConnectivity -Credentials $Credentials
    
    if (-not $ConnectOk) {
        Write-Host "`n❌ La connectivite vers la base de donnees n'est pas etablie" -ForegroundColor Red
        Write-Host "Possible causes:" -ForegroundColor Yellow
        Write-Host "1. Security Groups pas encore mis a jour (attendre 2-3 minutes)" -ForegroundColor White
        Write-Host "2. Base de donnees pas demarree" -ForegroundColor White
        Write-Host "3. Credentials incorrects" -ForegroundColor White
        Write-Host "4. Probleme reseau/firewall local" -ForegroundColor White
        exit 1
    }
    
    # Etape 5: Migration
    $MigrationOk = Start-DatabaseMigration -Credentials $Credentials
    
    if ($MigrationOk) {
        Write-Host "`n🎉 MIGRATION COMPLETE AVEC SUCCES!" -ForegroundColor Green
        Write-Host "======================================" -ForegroundColor Green
        Write-Host "Votre base de donnees est maintenant prete!" -ForegroundColor White
        Write-Host "`nConfiguration de connexion:" -ForegroundColor Cyan
        Write-Host "  Endpoint: $($Config.DATABASE_ENDPOINT)" -ForegroundColor White
        Write-Host "  Base: $($Config.DATABASE_NAME)" -ForegroundColor White
        Write-Host "  Region: $($Config.REGION)" -ForegroundColor White
        Write-Host "  Username: $($Credentials.username)" -ForegroundColor White
    } else {
        Write-Host "`n❌ La migration a echoue" -ForegroundColor Red
    }
    
} catch {
    Write-Host "`n❌ ERREUR CRITIQUE: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}