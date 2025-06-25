# fix-secrets-manager.ps1 - Diagnostic et correction AWS Secrets Manager

param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-1"
)

Write-Host "DIAGNOSTIC AWS SECRETS MANAGER - REGION: $Region" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

# Configuration
$RDS_IDENTIFIER = "maturitybackend-dev-databaseb269d8bb-rh7bxy6kcqbb"

# Fonction pour lister tous les secrets
function Get-AllSecrets {
    param($Region)
    
    Write-Host "`nRecherche de tous les secrets dans $Region..." -ForegroundColor Cyan
    
    try {
        $Secrets = aws secretsmanager list-secrets --region $Region | ConvertFrom-Json
        
        if ($Secrets.SecretList.Count -eq 0) {
            Write-Host "Aucun secret trouve dans la region $Region" -ForegroundColor Yellow
            return $null
        }
        
        Write-Host "Secrets trouves:" -ForegroundColor Green
        foreach ($Secret in $Secrets.SecretList) {
            Write-Host "  - Nom: $($Secret.Name)" -ForegroundColor White
            Write-Host "    ARN: $($Secret.ARN)" -ForegroundColor Gray
            Write-Host "    Description: $($Secret.Description)" -ForegroundColor Gray
            Write-Host "    Derniere modification: $($Secret.LastChangedDate)" -ForegroundColor Gray
            Write-Host "    ---" -ForegroundColor Gray
        }
        
        return $Secrets.SecretList
        
    } catch {
        Write-Host "Erreur lors de la recherche des secrets: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Fonction pour tester un secret specifique
function Test-Secret {
    param($SecretArn, $Region)
    
    Write-Host "`nTest du secret: $SecretArn" -ForegroundColor Yellow
    
    try {
        $SecretValue = aws secretsmanager get-secret-value --secret-id $SecretArn --region $Region | ConvertFrom-Json
        $Credentials = $SecretValue.SecretString | ConvertFrom-Json
        
        Write-Host "Secret valide!" -ForegroundColor Green
        Write-Host "  Username: $($Credentials.username)" -ForegroundColor White
        Write-Host "  Password: [MASQUE]" -ForegroundColor White
        
        if ($Credentials.host) {
            Write-Host "  Host: $($Credentials.host)" -ForegroundColor White
        }
        if ($Credentials.port) {
            Write-Host "  Port: $($Credentials.port)" -ForegroundColor White
        }
        
        return $Credentials
        
    } catch {
        Write-Host "Erreur lors du test du secret: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Fonction pour obtenir les credentials RDS directement
function Get-RDSCredentials {
    param($RDSIdentifier, $Region)
    
    Write-Host "`nTentative de recuperation des credentials RDS directement..." -ForegroundColor Cyan
    
    try {
        # Obtenir les informations RDS
        $RDSInfo = aws rds describe-db-instances --db-instance-identifier $RDSIdentifier --region $Region | ConvertFrom-Json
        
        if ($RDSInfo.DBInstances.Count -gt 0) {
            $Instance = $RDSInfo.DBInstances[0]
            Write-Host "Instance RDS trouvee:" -ForegroundColor Green
            Write-Host "  Identifiant: $($Instance.DBInstanceIdentifier)" -ForegroundColor White
            Write-Host "  Endpoint: $($Instance.Endpoint.Address)" -ForegroundColor White
            Write-Host "  Master Username: $($Instance.MasterUsername)" -ForegroundColor White
            
            return @{
                endpoint = $Instance.Endpoint.Address
                port = $Instance.Endpoint.Port
                username = $Instance.MasterUsername
                dbname = if($Instance.DBName) { $Instance.DBName } else { "maturity_assessment" }
            }
        } else {
            Write-Host "Instance RDS non trouvee" -ForegroundColor Red
            return $null
        }
        
    } catch {
        Write-Host "Erreur lors de la recuperation RDS: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Fonction pour creer un nouveau secret
function New-DatabaseSecret {
    param($RDSInfo, $Region)
    
    Write-Host "`nCreation d'un nouveau secret..." -ForegroundColor Cyan
    
    $Username = $RDSInfo.username
    $Password = Read-Host "Entrez le mot de passe pour l'utilisateur $Username" -AsSecureString
    $PlainPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password))
    
    $SecretValue = @{
        username = $Username
        password = $PlainPassword
        host = $RDSInfo.endpoint
        port = $RDSInfo.port
        dbname = $RDSInfo.dbname
    } | ConvertTo-Json
    
    $SecretName = "maturity-assessment-db-credentials"
    
    try {
        $Result = aws secretsmanager create-secret --name $SecretName --description "Credentials for Maturity Assessment Database" --secret-string $SecretValue --region $Region | ConvertFrom-Json
        
        Write-Host "Secret cree avec succes!" -ForegroundColor Green
        Write-Host "  Nom: $($Result.Name)" -ForegroundColor White
        Write-Host "  ARN: $($Result.ARN)" -ForegroundColor White
        
        return $Result.ARN
        
    } catch {
        Write-Host "Erreur lors de la creation du secret: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Fonction pour generer la configuration corrigee
function Generate-FixedConfiguration {
    param($SecretArn, $RDSInfo, $Region)
    
    Write-Host "`nCONFIGURATION CORRIGEE:" -ForegroundColor Green
    Write-Host "=======================" -ForegroundColor Green
    
    $ConfigContent = @"
# Configuration corrigee pour migrate-database-clean.ps1
`$Config = @{
    DATABASE_ENDPOINT = "$($RDSInfo.endpoint)"
    DATABASE_SECRET_ARN = "$SecretArn"
    REGION = "$Region"
    DATABASE_NAME = "$($RDSInfo.dbname)"
}
"@
    
    Write-Host $ConfigContent -ForegroundColor White
    
    # Sauvegarder dans un fichier
    $ConfigFile = "database-config-fixed.txt"
    $ConfigContent | Out-File -FilePath $ConfigFile -Encoding UTF8
    Write-Host "`nConfiguration sauvegardee dans: $ConfigFile" -ForegroundColor Yellow
    
    return $ConfigContent
}

# Fonction pour tester la connexion MySQL avec credentials manuels
function Test-ManualConnection {
    param($RDSInfo, $Region)
    
    Write-Host "`nTest de connexion manuelle..." -ForegroundColor Cyan
    
    $Username = $RDSInfo.username
    $Password = Read-Host "Entrez le mot de passe pour tester la connexion" -AsSecureString
    $PlainPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password))
    
    # Creer un fichier de config temporaire
    $TempDir = [System.IO.Path]::GetTempPath()
    $TempFile = [System.IO.Path]::GetRandomFileName()
    $ConfigFile = Join-Path $TempDir "$TempFile.cnf"
    
    $SSLCertPath = "$env:USERPROFILE\maturity-assessment-dasboard\server\eu-west-1-bundle.pem"
    
    # Verifier le certificat SSL
    if (-not (Test-Path $SSLCertPath)) {
        Write-Host "Telechargement du certificat SSL..." -ForegroundColor Yellow
        try {
            Invoke-WebRequest -Uri "https://truststore.pki.rds.amazonaws.com/eu-west-1/eu-west-1-bundle.pem" -OutFile $SSLCertPath
            Write-Host "Certificat SSL telecharge" -ForegroundColor Green
        } catch {
            Write-Host "Erreur lors du telechargement du certificat: $($_.Exception.Message)" -ForegroundColor Red
            $SSLCertPath = $null
        }
    }
    
    $MySQLConfig = if ($SSLCertPath) {
        "[client]`nhost=$($RDSInfo.endpoint)`nport=$($RDSInfo.port)`nuser=$Username`npassword=$PlainPassword`nssl-ca=$SSLCertPath`nssl-verify-server-cert"
    } else {
        "[client]`nhost=$($RDSInfo.endpoint)`nport=$($RDSInfo.port)`nuser=$Username`npassword=$PlainPassword"
    }
    
    try {
        [System.IO.File]::WriteAllText($ConfigFile, $MySQLConfig, [System.Text.Encoding]::ASCII)
        
        # Tester la connexion
        $TestQuery = "SELECT 1 as test, NOW() as current_time"
        $TestResult = & "C:\Program Files\MariaDB 11.7\bin\mysql.exe" --defaults-file="$ConfigFile" --connect-timeout=10 -e "$TestQuery" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "CONNEXION REUSSIE!" -ForegroundColor Green
            Write-Host "Resultat du test:" -ForegroundColor White
            Write-Host $TestResult -ForegroundColor Gray
            return $true
        } else {
            Write-Host "Connexion echouee: $TestResult" -ForegroundColor Red
            return $false
        }
        
    } catch {
        Write-Host "Erreur lors du test: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    } finally {
        Remove-Item $ConfigFile -Force -ErrorAction SilentlyContinue
    }
}

# SCRIPT PRINCIPAL
try {
    Write-Host "Verification des prerequisites..." -ForegroundColor Cyan
    
    # Verifier AWS CLI
    try {
        $Identity = aws sts get-caller-identity | ConvertFrom-Json
        Write-Host "AWS CLI configure - Compte: $($Identity.Account)" -ForegroundColor Green
    } catch {
        Write-Host "AWS CLI non configure" -ForegroundColor Red
        exit 1
    }
    
    # Etape 1: Lister tous les secrets
    $AllSecrets = Get-AllSecrets -Region $Region
    
    # Etape 2: Chercher un secret pour la base
    $TargetSecret = $null
    if ($AllSecrets) {
        foreach ($Secret in $AllSecrets) {
            $Name = $Secret.Name.ToLower()
            if ($Name -like "*maturity*" -or $Name -like "*db*" -or $Name -like "*database*" -or $Name -like "*rds*") {
                Write-Host "`nSecret potentiel trouve: $($Secret.Name)" -ForegroundColor Yellow
                $TestResult = Test-Secret -SecretArn $Secret.ARN -Region $Region
                if ($TestResult) {
                    $TargetSecret = $Secret
                    break
                }
            }
        }
    }
    
    # Etape 3: Obtenir les infos RDS
    $RDSInfo = Get-RDSCredentials -RDSIdentifier $RDS_IDENTIFIER -Region $Region
    if (-not $RDSInfo) {
        Write-Host "Impossible d'obtenir les informations RDS" -ForegroundColor Red
        exit 1
    }
    
    # Etape 4: Solutions proposees
    Write-Host "`nSOLUTIONS DISPONIBLES:" -ForegroundColor Yellow
    Write-Host "======================" -ForegroundColor Yellow
    
    if ($TargetSecret) {
        Write-Host "`n1. UTILISER LE SECRET EXISTANT (Recommande)" -ForegroundColor Green
        Generate-FixedConfiguration -SecretArn $TargetSecret.ARN -RDSInfo $RDSInfo -Region $Region
    } else {
        Write-Host "`n1. CREER UN NOUVEAU SECRET" -ForegroundColor Cyan
        $Choice = Read-Host "Voulez-vous creer un nouveau secret? (o/n)"
        if ($Choice -eq "o") {
            $NewSecretArn = New-DatabaseSecret -RDSInfo $RDSInfo -Region $Region
            if ($NewSecretArn) {
                Generate-FixedConfiguration -SecretArn $NewSecretArn -RDSInfo $RDSInfo -Region $Region
            }
        }
    }
    
    Write-Host "`n2. TESTER LA CONNEXION MANUELLEMENT" -ForegroundColor Cyan
    $TestChoice = Read-Host "Voulez-vous tester la connexion manuellement? (o/n)"
    if ($TestChoice -eq "o") {
        Test-ManualConnection -RDSInfo $RDSInfo -Region $Region
    }
    
    Write-Host "`nETAPES SUIVANTES:" -ForegroundColor Yellow
    Write-Host "1. Mettez a jour la section `$Config dans migrate-database-clean.ps1" -ForegroundColor White
    Write-Host "2. Ou utilisez la configuration sauvegardee dans database-config-fixed.txt" -ForegroundColor White
    Write-Host "3. Relancez: .\migrate-database-clean.ps1" -ForegroundColor White
    
} catch {
    Write-Host "`nErreur lors du diagnostic: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}