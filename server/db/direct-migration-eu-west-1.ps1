# direct-migration-eu-west-1.ps1 - Migration directe avec les vraies valeurs

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "dev"
)

# Configuration EXACTE basee sur votre capture d'ecran AWS
$Config = @{
    DATABASE_ENDPOINT = "maturitybackend-dev-databaseb269d8bb-rh7bxy6kcqbb.cd6w86yy2wyp.eu-west-1.rds.amazonaws.com"
    REGION = "eu-west-1"
    DATABASE_NAME = "maturity_assessment"
    RDS_IDENTIFIER = "maturitybackend-dev-databaseb269d8bb-rh7bxy6kcqbb"
}

Write-Host "MIGRATION DIRECTE EU-WEST-1 - Environment: $Environment" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green

Write-Host "`nConfiguration utilisee:" -ForegroundColor Cyan
Write-Host "  Endpoint: $($Config.DATABASE_ENDPOINT)" -ForegroundColor White
Write-Host "  Region: $($Config.REGION)" -ForegroundColor White
Write-Host "  Base: $($Config.DATABASE_NAME)" -ForegroundColor White
Write-Host "  RDS ID: $($Config.RDS_IDENTIFIER)" -ForegroundColor White

# Fonction pour corriger les Security Groups
function Fix-SecurityGroups {
    Write-Host "`nCorrection des Security Groups..." -ForegroundColor Cyan
    
    try {
        # Obtenir votre IP publique (mais en IPv4 cette fois)
        Write-Host "Obtention de votre IP publique IPv4..." -ForegroundColor Yellow
        $MyIP = try {
            (Invoke-WebRequest -Uri "https://ifconfig.me/ip" -UseBasicParsing).Content.Trim()
        } catch {
            (Invoke-WebRequest -Uri "https://ipv4.icanhazip.com" -UseBasicParsing).Content.Trim()
        }
        
        Write-Host "Votre IP publique IPv4: $MyIP" -ForegroundColor White
        
        # Obtenir les Security Groups de la base RDS
        Write-Host "Recherche des Security Groups RDS..." -ForegroundColor Yellow
        $RDSInfo = aws rds describe-db-instances --db-instance-identifier $Config.RDS_IDENTIFIER --region $Config.REGION | ConvertFrom-Json
        
        if ($RDSInfo.DBInstances.Count -gt 0) {
            $SecurityGroups = $RDSInfo.DBInstances[0].VpcSecurityGroups
            
            Write-Host "Security Groups trouves:" -ForegroundColor Green
            foreach ($SG in $SecurityGroups) {
                Write-Host "  - $($SG.VpcSecurityGroupId) (Status: $($SG.Status))" -ForegroundColor White
                
                # Ajouter la regle pour MySQL
                try {
                    Write-Host "    Ajout de la regle MySQL pour IP $MyIP..." -ForegroundColor Yellow
                    $Result = aws ec2 authorize-security-group-ingress --group-id $SG.VpcSecurityGroupId --protocol tcp --port 3306 --cidr "$MyIP/32" --region $Config.REGION 2>&1
                    
                    if ($LASTEXITCODE -eq 0) {
                        Write-Host "    ✅ Regle ajoutee avec succes" -ForegroundColor Green
                    } else {
                        if ($Result -like "*already exists*" -or $Result -like "*Duplicate*") {
                            Write-Host "    ✅ Regle deja existante" -ForegroundColor Green
                        } else {
                            Write-Host "    ⚠️  Erreur: $Result" -ForegroundColor Yellow
                        }
                    }
                } catch {
                    Write-Host "    ❌ Erreur lors de l'ajout: $($_.Exception.Message)" -ForegroundColor Red
                }
            }
        } else {
            Write-Host "Instance RDS non trouvee!" -ForegroundColor Red
            return $false
        }
        
        return $true
        
    } catch {
        Write-Host "Erreur lors de la correction des Security Groups: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction pour tester la connectivite
function Test-NetworkConnectivity {
    Write-Host "`nTest de connectivite reseau..." -ForegroundColor Cyan
    
    try {
        Write-Host "Test vers $($Config.DATABASE_ENDPOINT) port 3306..." -ForegroundColor Yellow
        
        $TCPClient = New-Object System.Net.Sockets.TcpClient
        $Connect = $TCPClient.BeginConnect($Config.DATABASE_ENDPOINT, 3306, $null, $null)
        $Wait = $Connect.AsyncWaitHandle.WaitOne(15000, $false)
        
        if ($Wait) {
            $TCPClient.EndConnect($Connect)
            $TCPClient.Close()
            Write-Host "✅ Connectivite TCP reussie!" -ForegroundColor Green
            return $true
        } else {
            $TCPClient.Close()
            Write-Host "❌ Connectivite TCP echouee (timeout)" -ForegroundColor Red
            return $false
        }
        
    } catch {
        Write-Host "❌ Erreur de connectivite: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction pour telecharger le certificat SSL
function Get-SSLCertificate {
    Write-Host "`nTelechargement du certificat SSL pour eu-west-1..." -ForegroundColor Cyan
    
    $SSLUrl = "https://truststore.pki.rds.amazonaws.com/eu-west-1/eu-west-1-bundle.pem"
    $SSLPath = "$env:USERPROFILE\maturity-assessment-dasboard\server\eu-west-1-bundle.pem"
    
    try {
        # Creer le repertoire si necessaire
        $SSLDir = Split-Path $SSLPath -Parent
        if (-not (Test-Path $SSLDir)) {
            New-Item -ItemType Directory -Path $SSLDir -Force | Out-Null
        }
        
        if (-not (Test-Path $SSLPath)) {
            Write-Host "Telechargement depuis: $SSLUrl" -ForegroundColor Yellow
            Invoke-WebRequest -Uri $SSLUrl -OutFile $SSLPath -UseBasicParsing
            Write-Host "✅ Certificat SSL telecharge: $SSLPath" -ForegroundColor Green
        } else {
            Write-Host "✅ Certificat SSL deja present: $SSLPath" -ForegroundColor Green
        }
        
        return $true
        
    } catch {
        Write-Host "❌ Erreur lors du telechargement SSL: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction pour obtenir les credentials et migrer
function Start-DatabaseMigration {
    Write-Host "`nDemarrage de la migration de la base de donnees..." -ForegroundColor Cyan
    
    # Demander les credentials
    $Username = Read-Host "Nom d'utilisateur de la base RDS (par defaut: admin)"
    if (-not $Username) { $Username = "admin" }
    
    $Password = Read-Host "Mot de passe de la base RDS" -AsSecureString
    $PlainPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password))
    
    # Creer un fichier de config temporaire
    $TempDir = [System.IO.Path]::GetTempPath()
    $TempFile = [System.IO.Path]::GetRandomFileName()
    $ConfigFile = Join-Path $TempDir "$TempFile.cnf"
    
    $SSLPath = "$env:USERPROFILE\maturity-assessment-dasboard\server\eu-west-1-bundle.pem"
    
    $MySQLConfig = if (Test-Path $SSLPath) {
        "[client]`nhost=$($Config.DATABASE_ENDPOINT)`nport=3306`nuser=$Username`npassword=$PlainPassword`nssl-ca=$SSLPath`nssl-verify-server-cert"
    } else {
        "[client]`nhost=$($Config.DATABASE_ENDPOINT)`nport=3306`nuser=$Username`npassword=$PlainPassword"
    }
    
    try {
        [System.IO.File]::WriteAllText($ConfigFile, $MySQLConfig, [System.Text.Encoding]::ASCII)
        
        # Test de connexion
        Write-Host "`nTest de connexion MySQL..." -ForegroundColor Yellow
        $TestQuery = "SELECT 1 as test, NOW() as current_time"
        $TestResult = & "C:\Program Files\MariaDB 11.7\bin\mysql.exe" --defaults-file="$ConfigFile" --connect-timeout=10 -e "$TestQuery" 2>&1
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Connexion MySQL echouee: $TestResult" -ForegroundColor Red
            return $false
        }
        
        Write-Host "✅ Connexion MySQL reussie!" -ForegroundColor Green
        Write-Host "Resultat: $TestResult" -ForegroundColor Gray
        
        # Creer la base de donnees
        Write-Host "`nCreation de la base '$($Config.DATABASE_NAME)'..." -ForegroundColor Yellow
        $CreateDBQuery = "CREATE DATABASE IF NOT EXISTS $($Config.DATABASE_NAME) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
        $CreateResult = & "C:\Program Files\MariaDB 11.7\bin\mysql.exe" --defaults-file="$ConfigFile" -e "$CreateDBQuery" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Base de donnees creee/verifiee" -ForegroundColor Green
        } else {
            Write-Host "❌ Erreur creation base: $CreateResult" -ForegroundColor Red
            return $false
        }
        
        # Appliquer le schema
        $SchemaFile = $null
        $PossiblePaths = @(".\schema-fixed.sql", ".\server\db\schema-fixed.sql", ".\db\schema-fixed.sql", "..\schema-fixed.sql")
        
        foreach ($Path in $PossiblePaths) {
            if (Test-Path $Path) {
                $SchemaFile = $Path
                break
            }
        }
        
        if ($SchemaFile) {
            Write-Host "`nApplication du schema depuis: $SchemaFile" -ForegroundColor Yellow
            
            # Mettre a jour le config pour inclure la base
            $MySQLConfigWithDB = if (Test-Path $SSLPath) {
                "[client]`nhost=$($Config.DATABASE_ENDPOINT)`nport=3306`nuser=$Username`npassword=$PlainPassword`ndatabase=$($Config.DATABASE_NAME)`nssl-ca=$SSLPath`nssl-verify-server-cert"
            } else {
                "[client]`nhost=$($Config.DATABASE_ENDPOINT)`nport=3306`nuser=$Username`npassword=$PlainPassword`ndatabase=$($Config.DATABASE_NAME)"
            }
            
            [System.IO.File]::WriteAllText($ConfigFile, $MySQLConfigWithDB, [System.Text.Encoding]::ASCII)
            
            $SchemaResult = Get-Content $SchemaFile -Raw | & "C:\Program Files\MariaDB 11.7\bin\mysql.exe" --defaults-file="$ConfigFile" --connect-timeout=30 2>&1
            
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
        } else {
            Write-Host "❌ Fichier schema-fixed.sql non trouve" -ForegroundColor Red
            Write-Host "Emplacements cherches:" -ForegroundColor Yellow
            $PossiblePaths | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
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
    Write-Host "Verification des prerequisites..." -ForegroundColor Cyan
    
    # Verifier MySQL Client
    try {
        $MySQLVersion = & "C:\Program Files\MariaDB 11.7\bin\mysql.exe" --version
        Write-Host "✅ MySQL Client: $MySQLVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ MySQL Client non trouve" -ForegroundColor Red
        exit 1
    }
    
    # Verifier AWS CLI
    try {
        $Identity = aws sts get-caller-identity | ConvertFrom-Json
        Write-Host "✅ AWS CLI: Compte $($Identity.Account)" -ForegroundColor Green
    } catch {
        Write-Host "❌ AWS CLI non configure" -ForegroundColor Red
        exit 1
    }
    
    # Etape 1: Telecharger le certificat SSL
    $SSLOk = Get-SSLCertificate
    
    # Etape 2: Corriger les Security Groups
    $SGOk = Fix-SecurityGroups
    
    # Etape 3: Tester la connectivite
    $NetOk = Test-NetworkConnectivity
    
    if (-not $NetOk) {
        Write-Host "`n⚠️  La connectivite reseau n'est pas encore etablie." -ForegroundColor Yellow
        Write-Host "Cela peut prendre quelques minutes pour que les Security Groups prennent effet." -ForegroundColor White
        Write-Host "Relancez ce script dans 2-3 minutes ou continuez quand meme." -ForegroundColor White
        
        $Continue = Read-Host "`nVoulez-vous continuer quand meme? (o/n)"
        if ($Continue -ne "o") {
            Write-Host "Migration annulee. Relancez le script plus tard." -ForegroundColor Yellow
            exit 0
        }
    }
    
    # Etape 4: Migration de la base
    $MigrationChoice = Read-Host "`nVoulez-vous proceder a la migration de la base de donnees? (o/n)"
    if ($MigrationChoice -eq "o") {
        $MigrationOk = Start-DatabaseMigration
        
        if ($MigrationOk) {
            Write-Host "`n🎉 MIGRATION COMPLETE AVEC SUCCES!" -ForegroundColor Green
            Write-Host "======================================" -ForegroundColor Green
            Write-Host "Votre base de donnees est maintenant prete a utiliser." -ForegroundColor White
            Write-Host "`nInformations de connexion:" -ForegroundColor Cyan
            Write-Host "  Endpoint: $($Config.DATABASE_ENDPOINT)" -ForegroundColor White
            Write-Host "  Base: $($Config.DATABASE_NAME)" -ForegroundColor White
            Write-Host "  Region: $($Config.REGION)" -ForegroundColor White
        } else {
            Write-Host "`n❌ La migration a echoue. Verifiez les erreurs ci-dessus." -ForegroundColor Red
        }
    } else {
        Write-Host "`nMigration de la base ignoree." -ForegroundColor Yellow
        Write-Host "Les Security Groups ont ete corriges. Vous pouvez migrer plus tard." -ForegroundColor White
    }
    
} catch {
    Write-Host "`n❌ ERREUR CRITIQUE: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}