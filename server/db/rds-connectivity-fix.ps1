# rds-connectivity-fix.ps1 - Script pour corriger la connectivite RDS

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "dev"
)

# Configuration pour la region eu-west-3
$Config = @{
    DATABASE_ENDPOINT = "TBD_AFTER_DISCOVERY"  # A determiner avec le script de decouverte
    REGION = "eu-west-3"
    RDS_IDENTIFIER = "TBD_AFTER_DISCOVERY"  # A determiner avec le script de decouverte
}

Write-Host "RDS CONNECTIVITY FIX - ENVIRONMENT: $Environment" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Fonction pour obtenir l'IP publique actuelle
function Get-MyPublicIP {
    try {
        Write-Host "`nObtention de votre IP publique..." -ForegroundColor Cyan
        $IP = (Invoke-WebRequest -Uri "https://ifconfig.me/ip" -UseBasicParsing).Content.Trim()
        Write-Host "Votre IP publique: $IP" -ForegroundColor White
        return $IP
    } catch {
        Write-Host "Impossible d'obtenir l'IP publique. Utilisation d'une plage par defaut." -ForegroundColor Yellow
        return "0.0.0.0/0"
    }
}

# Fonction pour trouver les security groups de la base RDS
function Get-RDSSecurityGroups {
    Write-Host "`nRecherche des security groups RDS..." -ForegroundColor Cyan
    
    try {
        $RDSInfo = aws rds describe-db-instances --db-instance-identifier $Config.RDS_IDENTIFIER --region $Config.REGION | ConvertFrom-Json
        
        if ($RDSInfo.DBInstances.Count -gt 0) {
            $SecurityGroups = $RDSInfo.DBInstances[0].VpcSecurityGroups
            Write-Host "Security groups trouves:" -ForegroundColor Green
            
            foreach ($SG in $SecurityGroups) {
                Write-Host "  - $($SG.VpcSecurityGroupId) (Status: $($SG.Status))" -ForegroundColor White
            }
            
            return $SecurityGroups
        } else {
            Write-Host "Instance RDS non trouvee!" -ForegroundColor Red
            return $null
        }
    } catch {
        Write-Host "Erreur lors de la recherche des security groups: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Fonction pour verifier les regles de security group
function Test-SecurityGroupRules {
    param($SecurityGroups, $MyIP)
    
    Write-Host "`nVerification des regles de security group..." -ForegroundColor Cyan
    
    $NeedsUpdate = $false
    $SGToUpdate = @()
    
    foreach ($SG in $SecurityGroups) {
        $SGId = $SG.VpcSecurityGroupId
        Write-Host "`nAnalyse du Security Group: $SGId" -ForegroundColor Yellow
        
        try {
            $SGDetails = aws ec2 describe-security-groups --group-ids $SGId --region $Config.REGION | ConvertFrom-Json
            
            if ($SGDetails.SecurityGroups.Count -gt 0) {
                $InboundRules = $SGDetails.SecurityGroups[0].IpPermissions
                
                $MySQL3306Rule = $InboundRules | Where-Object { 
                    $_.FromPort -eq 3306 -and $_.ToPort -eq 3306 -and $_.IpProtocol -eq "tcp" 
                }
                
                if ($MySQL3306Rule) {
                    Write-Host "  Regle MySQL (port 3306) trouvee" -ForegroundColor Green
                    
                    # Verifier si notre IP est autorisee
                    $MyIPAllowed = $false
                    foreach ($Range in $MySQL3306Rule.IpRanges) {
                        if ($Range.CidrIp -eq "$MyIP/32" -or $Range.CidrIp -eq "0.0.0.0/0") {
                            $MyIPAllowed = $true
                            Write-Host "  Votre IP $MyIP est autorisee" -ForegroundColor Green
                            break
                        }
                    }
                    
                    if (-not $MyIPAllowed) {
                        Write-Host "  Votre IP $MyIP n'est PAS autorisee" -ForegroundColor Red
                        $NeedsUpdate = $true
                        $SGToUpdate += $SGId
                    }
                } else {
                    Write-Host "  AUCUNE regle MySQL (port 3306) trouvee!" -ForegroundColor Red
                    $NeedsUpdate = $true
                    $SGToUpdate += $SGId
                }
            }
        } catch {
            Write-Host "  Erreur lors de l'analyse: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    return @{
        NeedsUpdate = $NeedsUpdate
        SGToUpdate = $SGToUpdate
    }
}

# Fonction pour ajouter les regles de security group
function Add-MySQLSecurityGroupRule {
    param($SGId, $MyIP)
    
    Write-Host "`nAjout de la regle MySQL pour le Security Group: $SGId" -ForegroundColor Cyan
    
    try {
        # Ajouter la regle pour le port 3306
        $Result = aws ec2 authorize-security-group-ingress --group-id $SGId --protocol tcp --port 3306 --cidr "$MyIP/32" --region $Config.REGION 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Regle ajoutee avec succes pour IP: $MyIP" -ForegroundColor Green
            return $true
        } else {
            # Verifier si l'erreur est due a une regle deja existante
            if ($Result -like "*already exists*" -or $Result -like "*Duplicate*") {
                Write-Host "  Regle deja existante (OK)" -ForegroundColor Yellow
                return $true
            } else {
                Write-Host "  Erreur: $Result" -ForegroundColor Red
                return $false
            }
        }
    } catch {
        Write-Host "  Erreur lors de l'ajout: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction pour verifier le statut de la base RDS
function Test-RDSStatus {
    Write-Host "`nVerification du statut de la base RDS..." -ForegroundColor Cyan
    
    try {
        $RDSInfo = aws rds describe-db-instances --db-instance-identifier $Config.RDS_IDENTIFIER --region $Config.REGION | ConvertFrom-Json
        
        if ($RDSInfo.DBInstances.Count -gt 0) {
            $Instance = $RDSInfo.DBInstances[0]
            Write-Host "Statut RDS: $($Instance.DBInstanceStatus)" -ForegroundColor White
            Write-Host "Endpoint: $($Instance.Endpoint.Address)" -ForegroundColor White
            Write-Host "Port: $($Instance.Endpoint.Port)" -ForegroundColor White
            Write-Host "Publicly Accessible: $($Instance.PubliclyAccessible)" -ForegroundColor White
            
            if ($Instance.DBInstanceStatus -eq "available") {
                Write-Host "Base RDS operationnelle" -ForegroundColor Green
                return $true
            } else {
                Write-Host "Base RDS pas encore prete" -ForegroundColor Yellow
                return $false
            }
        } else {
            Write-Host "Instance RDS non trouvee!" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "Erreur lors de la verification: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction pour tester la connectivite finale
function Test-FinalConnectivity {
    param($Endpoint, $Port = 3306)
    
    Write-Host "`nTest de connectivite finale..." -ForegroundColor Cyan
    
    try {
        Write-Host "Test vers $Endpoint port $Port..." -ForegroundColor Yellow
        
        $TCPClient = New-Object System.Net.Sockets.TcpClient
        $Connect = $TCPClient.BeginConnect($Endpoint, $Port, $null, $null)
        $Wait = $Connect.AsyncWaitHandle.WaitOne(15000, $false)
        
        if ($Wait) {
            $TCPClient.EndConnect($Connect)
            $TCPClient.Close()
            Write-Host "CONNEXION REUSSIE!" -ForegroundColor Green
            return $true
        } else {
            $TCPClient.Close()
            Write-Host "Connexion echouee (timeout)" -ForegroundColor Red
            return $false
        }
        
    } catch {
        Write-Host "Erreur de connexion: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction pour afficher les solutions alternatives
function Show-AlternativeSolutions {
    Write-Host "`nSOLUTIONS ALTERNATIVES:" -ForegroundColor Yellow
    Write-Host "================================" -ForegroundColor Yellow
    
    Write-Host "`n1. ACTIVER L'ACCES PUBLIC RDS:" -ForegroundColor Cyan
    Write-Host "aws rds modify-db-instance --db-instance-identifier $($Config.RDS_IDENTIFIER) --publicly-accessible --region $($Config.REGION)" -ForegroundColor Gray
    
    Write-Host "`n2. CREER UN BASTION HOST:" -ForegroundColor Cyan
    Write-Host "- Lancez une instance EC2 dans le meme VPC" -ForegroundColor Gray
    Write-Host "- Utilisez SSH tunneling pour acceder a RDS" -ForegroundColor Gray
    
    Write-Host "`n3. UTILISER AWS SYSTEMS MANAGER:" -ForegroundColor Cyan
    Write-Host "- Session Manager pour tunnel vers RDS" -ForegroundColor Gray
    
    Write-Host "`n4. VPN OU DIRECT CONNECT:" -ForegroundColor Cyan
    Write-Host "- Etablir connexion reseau privee avec AWS" -ForegroundColor Gray
}

# SCRIPT PRINCIPAL
try {
    Write-Host "Demarrage du diagnostic de connectivite RDS..." -ForegroundColor Cyan
    
    # Verifier AWS CLI
    try {
        $Identity = aws sts get-caller-identity | ConvertFrom-Json
        Write-Host "AWS CLI configure - Compte: $($Identity.Account)" -ForegroundColor Green
    } catch {
        Write-Host "AWS CLI non configure. Executez: aws configure" -ForegroundColor Red
        exit 1
    }
    
    # Etape 1: Obtenir notre IP publique
    $MyIP = Get-MyPublicIP
    
    # Etape 2: Verifier le statut RDS
    $RDSReady = Test-RDSStatus
    if (-not $RDSReady) {
        Write-Host "`nLa base RDS n'est pas prete. Attendez qu'elle soit 'available'." -ForegroundColor Yellow
        exit 1
    }
    
    # Etape 3: Trouver les security groups
    $SecurityGroups = Get-RDSSecurityGroups
    if (-not $SecurityGroups) {
        Write-Host "`nImpossible de trouver les security groups RDS." -ForegroundColor Red
        exit 1
    }
    
    # Etape 4: Verifier les regles de security group
    $SGAnalysis = Test-SecurityGroupRules -SecurityGroups $SecurityGroups -MyIP $MyIP
    
    # Etape 5: Corriger les security groups si necessaire
    if ($SGAnalysis.NeedsUpdate) {
        Write-Host "`nCorrection des security groups necessaire..." -ForegroundColor Yellow
        
        $FixSuccess = $true
        foreach ($SGId in $SGAnalysis.SGToUpdate) {
            $Result = Add-MySQLSecurityGroupRule -SGId $SGId -MyIP $MyIP
            if (-not $Result) {
                $FixSuccess = $false
            }
        }
        
        if ($FixSuccess) {
            Write-Host "`nSecurity groups corriges. Attente de 30 secondes..." -ForegroundColor Green
            Start-Sleep -Seconds 30
        } else {
            Write-Host "`nErreur lors de la correction des security groups." -ForegroundColor Red
        }
    } else {
        Write-Host "`nSecurity groups deja correctement configures." -ForegroundColor Green
    }
    
    # Etape 6: Test de connectivite finale
    $ConnectivityOK = Test-FinalConnectivity -Endpoint $Config.DATABASE_ENDPOINT
    
    if ($ConnectivityOK) {
        Write-Host "`nSUCCES! La connectivite RDS est maintenant fonctionnelle!" -ForegroundColor Green
        Write-Host "==============================================================" -ForegroundColor Green
        Write-Host "`nVous pouvez maintenant relancer le script de migration:" -ForegroundColor Cyan
        Write-Host ".\migrate-database-clean.ps1 -Environment dev" -ForegroundColor White
    } else {
        Write-Host "`nLa connectivite RDS n'est toujours pas fonctionnelle." -ForegroundColor Red
        Write-Host "Cela peut indiquer que la base est dans un subnet prive." -ForegroundColor Yellow
        
        Show-AlternativeSolutions
    }
    
} catch {
    Write-Host "`nErreur lors du diagnostic: $($_.Exception.Message)" -ForegroundColor Red
    Show-AlternativeSolutions
    exit 1
}