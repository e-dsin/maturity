# auto-config-eu-west-3.ps1 - Configuration automatique pour la region eu-west-3

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "dev"
)

$REGION = "eu-west-3"

Write-Host "CONFIGURATION AUTOMATIQUE - REGION: $REGION" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# Fonction pour decouvrir les instances RDS
function Get-RDSConfiguration {
    Write-Host "`nDecouverte des instances RDS dans $REGION..." -ForegroundColor Cyan
    
    try {
        $RDSInstances = aws rds describe-db-instances --region $REGION | ConvertFrom-Json
        
        if ($RDSInstances.DBInstances.Count -eq 0) {
            Write-Host "Aucune instance RDS trouvee dans $REGION" -ForegroundColor Yellow
            return $null
        }
        
        # Chercher une instance qui semble correspondre a notre application
        $TargetInstance = $null
        foreach ($Instance in $RDSInstances.DBInstances) {
            $Name = $Instance.DBInstanceIdentifier.ToLower()
            if ($Name -like "*maturity*" -or $Name -like "*backend*" -or $Name -like "*assessment*") {
                $TargetInstance = $Instance
                break
            }
        }
        
        # Si pas trouve par nom, prendre la premiere instance disponible
        if (-not $TargetInstance) {
            $TargetInstance = $RDSInstances.DBInstances | Where-Object { $_.DBInstanceStatus -eq "available" } | Select-Object -First 1
        }
        
        if ($TargetInstance) {
            Write-Host "Instance RDS trouvee:" -ForegroundColor Green
            Write-Host "  Identifiant: $($TargetInstance.DBInstanceIdentifier)" -ForegroundColor White
            Write-Host "  Endpoint: $($TargetInstance.Endpoint.Address)" -ForegroundColor White
            Write-Host "  Statut: $($TargetInstance.DBInstanceStatus)" -ForegroundColor White
            Write-Host "  Engine: $($TargetInstance.Engine) $($TargetInstance.EngineVersion)" -ForegroundColor White
            
            return @{
                Identifier = $TargetInstance.DBInstanceIdentifier
                Endpoint = $TargetInstance.Endpoint.Address
                Port = $TargetInstance.Endpoint.Port
                Engine = $TargetInstance.Engine
                Status = $TargetInstance.DBInstanceStatus
                SecurityGroups = $TargetInstance.VpcSecurityGroups
                DBName = if($TargetInstance.DBName) { $TargetInstance.DBName } else { "maturity_assessment" }
            }
        } else {
            Write-Host "Aucune instance RDS appropriee trouvee" -ForegroundColor Yellow
            return $null
        }
        
    } catch {
        Write-Host "Erreur lors de la decouverte RDS: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Fonction pour decouvrir les secrets AWS Secrets Manager
function Get-SecretsConfiguration {
    Write-Host "`nDecouverte des secrets dans AWS Secrets Manager..." -ForegroundColor Cyan
    
    try {
        $Secrets = aws secretsmanager list-secrets --region $REGION | ConvertFrom-Json
        
        # Chercher un secret qui semble correspondre a la base
        $TargetSecret = $null
        foreach ($Secret in $Secrets.SecretList) {
            $Name = $Secret.Name.ToLower()
            if ($Name -like "*maturity*" -or $Name -like "*db*" -or $Name -like "*database*" -or $Name -like "*rds*") {
                $TargetSecret = $Secret
                break
            }
        }
        
        if ($TargetSecret) {
            Write-Host "Secret trouve:" -ForegroundColor Green
            Write-Host "  Nom: $($TargetSecret.Name)" -ForegroundColor White
            Write-Host "  ARN: $($TargetSecret.ARN)" -ForegroundColor White
            
            return @{
                Name = $TargetSecret.Name
                ARN = $TargetSecret.ARN
            }
        } else {
            Write-Host "Aucun secret approprié trouvé. Vous devrez le créer manuellement." -ForegroundColor Yellow
            return $null
        }
        
    } catch {
        Write-Host "Erreur lors de la recherche de secrets: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Fonction pour decouvrir les ressources CloudFormation
function Get-CloudFormationStacks {
    Write-Host "`nDecouverte des stacks CloudFormation..." -ForegroundColor Cyan
    
    try {
        $Stacks = aws cloudformation list-stacks --region $REGION --query 'StackSummaries[?StackStatus!=`DELETE_COMPLETE`]' | ConvertFrom-Json
        
        $MaturityStacks = $Stacks | Where-Object { 
            $_.StackName -like "*maturity*" -or $_.StackName -like "*backend*" -or $_.StackName -like "*assessment*" 
        }
        
        if ($MaturityStacks.Count -gt 0) {
            Write-Host "Stacks CloudFormation trouvés:" -ForegroundColor Green
            foreach ($Stack in $MaturityStacks) {
                Write-Host "  - $($Stack.StackName) (Status: $($Stack.StackStatus))" -ForegroundColor White
            }
            return $MaturityStacks
        } else {
            Write-Host "Aucun stack CloudFormation trouve" -ForegroundColor Yellow
            return $null
        }
        
    } catch {
        Write-Host "Erreur lors de la recherche CloudFormation: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Fonction pour mettre a jour les scripts avec les vraies valeurs
function Update-ConfigurationFiles {
    param($RDSConfig, $SecretConfig)
    
    Write-Host "`nMise a jour des fichiers de configuration..." -ForegroundColor Cyan
    
    # Configuration complete
    $Config = @{
        DATABASE_ENDPOINT = $RDSConfig.Endpoint
        DATABASE_SECRET_ARN = if($SecretConfig) { $SecretConfig.ARN } else { "SECRET_ARN_A_DEFINIR" }
        REGION = $REGION
        DATABASE_NAME = $RDSConfig.DBName
        RDS_IDENTIFIER = $RDSConfig.Identifier
    }
    
    # Generer le contenu de configuration
    $ConfigContent = @"
# Configuration pour la region $REGION - Mise a jour automatique
`$Config = @{
    DATABASE_ENDPOINT = "$($Config.DATABASE_ENDPOINT)"
    DATABASE_SECRET_ARN = "$($Config.DATABASE_SECRET_ARN)"
    REGION = "$($Config.REGION)"
    DATABASE_NAME = "$($Config.DATABASE_NAME)"
}
"@

    $RDSConfigContent = @"
# Configuration pour la region $REGION - Mise a jour automatique  
`$Config = @{
    DATABASE_ENDPOINT = "$($Config.DATABASE_ENDPOINT)"
    REGION = "$($Config.REGION)"
    RDS_IDENTIFIER = "$($Config.RDS_IDENTIFIER)"
}
"@

    Write-Host "`nCONFIGURATION GENEREE:" -ForegroundColor Green
    Write-Host "======================" -ForegroundColor Green
    Write-Host $ConfigContent -ForegroundColor White
    
    # Verifier si le certificat SSL existe pour eu-west-3
    $SSLCertPath = "$env:USERPROFILE\maturity-assessment-dasboard\server\eu-west-3-bundle.pem"
    if (-not (Test-Path $SSLCertPath)) {
        Write-Host "`nATTENTION: Certificat SSL pour eu-west-3 manquant!" -ForegroundColor Yellow
        Write-Host "Telechargez-le depuis: https://truststore.pki.rds.amazonaws.com/eu-west-3/eu-west-3-bundle.pem" -ForegroundColor White
        Write-Host "Et placez-le dans: $SSLCertPath" -ForegroundColor White
    } else {
        Write-Host "`nCertificat SSL eu-west-3 trouve: $SSLCertPath" -ForegroundColor Green
    }
    
    return $Config
}

# Fonction pour tester la connectivite avec la nouvelle configuration
function Test-NewConfiguration {
    param($Config)
    
    Write-Host "`nTest de connectivite avec la nouvelle configuration..." -ForegroundColor Cyan
    
    try {
        $TCPClient = New-Object System.Net.Sockets.TcpClient
        $Connect = $TCPClient.BeginConnect($Config.DATABASE_ENDPOINT, 3306, $null, $null)
        $Wait = $Connect.AsyncWaitHandle.WaitOne(10000, $false)
        
        if ($Wait) {
            $TCPClient.EndConnect($Connect)
            $TCPClient.Close()
            Write-Host "Connectivite TCP vers $($Config.DATABASE_ENDPOINT):3306 OK!" -ForegroundColor Green
            return $true
        } else {
            $TCPClient.Close()
            Write-Host "Connectivite TCP vers $($Config.DATABASE_ENDPOINT):3306 echouee (timeout)" -ForegroundColor Red
            return $false
        }
        
    } catch {
        Write-Host "Erreur de connectivite: $($_.Exception.Message)" -ForegroundColor Red
        return $false
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
        Write-Host "AWS CLI non configure. Executez: aws configure" -ForegroundColor Red
        exit 1
    }
    
    # Etape 1: Decouvrir les ressources RDS
    $RDSConfig = Get-RDSConfiguration
    if (-not $RDSConfig) {
        Write-Host "`nAucune instance RDS trouvee dans $REGION" -ForegroundColor Red
        Write-Host "Verifiez que votre infrastructure est bien deployee dans cette region." -ForegroundColor Yellow
        exit 1
    }
    
    # Etape 2: Decouvrir les secrets
    $SecretConfig = Get-SecretsConfiguration
    
    # Etape 3: Decouvrir les stacks CloudFormation
    $CFStacks = Get-CloudFormationStacks
    
    # Etape 4: Generer la configuration
    $FinalConfig = Update-ConfigurationFiles -RDSConfig $RDSConfig -SecretConfig $SecretConfig
    
    # Etape 5: Tester la connectivite
    $ConnectivityOK = Test-NewConfiguration -Config $FinalConfig
    
    # Etape 6: Instructions finales
    Write-Host "`nETAPES SUIVANTES:" -ForegroundColor Yellow
    Write-Host "=================" -ForegroundColor Yellow
    
    if ($ConnectivityOK) {
        Write-Host "1. ✅ Configuration automatique reussie" -ForegroundColor Green
        Write-Host "2. ✅ Connectivite reseau OK" -ForegroundColor Green
        Write-Host "3. 🔄 Mettez a jour vos scripts avec la configuration ci-dessus" -ForegroundColor White
        Write-Host "4. 🔄 Executez: .\migrate-database-clean.ps1 -Environment dev" -ForegroundColor White
    } else {
        Write-Host "1. ✅ Configuration automatique reussie" -ForegroundColor Green
        Write-Host "2. ❌ Probleme de connectivite reseau" -ForegroundColor Red
        Write-Host "3. 🔄 Mettez a jour vos scripts avec la configuration ci-dessus" -ForegroundColor White
        Write-Host "4. 🔄 Executez: .\rds-connectivity-fix.ps1 -Environment dev" -ForegroundColor White
        Write-Host "5. 🔄 Puis: .\migrate-database-clean.ps1 -Environment dev" -ForegroundColor White
    }
    
    Write-Host "`nFICHIERS A METTRE A JOUR:" -ForegroundColor Cyan
    Write-Host "- migrate-database-clean.ps1 (section `$Config)" -ForegroundColor White
    Write-Host "- rds-connectivity-fix.ps1 (section `$Config)" -ForegroundColor White
    Write-Host "- Fichiers de configuration de votre application" -ForegroundColor White
    
    if (-not $SecretConfig) {
        Write-Host "`nATTENTION:" -ForegroundColor Yellow
        Write-Host "Aucun secret AWS Secrets Manager trouve." -ForegroundColor White
        Write-Host "Vous devrez:" -ForegroundColor White
        Write-Host "1. Creer un secret avec les credentials de la base" -ForegroundColor White
        Write-Host "2. Mettre a jour DATABASE_SECRET_ARN dans vos scripts" -ForegroundColor White
    }
    
} catch {
    Write-Host "`nErreur lors de la configuration: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}