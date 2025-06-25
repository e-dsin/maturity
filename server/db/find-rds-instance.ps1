# find-rds-instance.ps1 - Script pour trouver votre instance RDS

param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-3"
)

Write-Host "RECHERCHE INSTANCE RDS - REGION: $Region" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Fonction pour lister toutes les instances RDS
function Get-AllRDSInstances {
    param($Region)
    
    Write-Host "`nRecherche de toutes les instances RDS dans la region $Region..." -ForegroundColor Cyan
    
    try {
        $RDSInstances = aws rds describe-db-instances --region $Region | ConvertFrom-Json
        
        if ($RDSInstances.DBInstances.Count -eq 0) {
            Write-Host "Aucune instance RDS trouvee dans la region $Region" -ForegroundColor Yellow
            return $null
        }
        
        Write-Host "Instance(s) RDS trouvee(s):" -ForegroundColor Green
        Write-Host "============================" -ForegroundColor Green
        
        foreach ($Instance in $RDSInstances.DBInstances) {
            Write-Host "`nIdentifiant: $($Instance.DBInstanceIdentifier)" -ForegroundColor White
            Write-Host "Statut: $($Instance.DBInstanceStatus)" -ForegroundColor $(if($Instance.DBInstanceStatus -eq "available"){"Green"}else{"Yellow"})
            Write-Host "Engine: $($Instance.Engine) $($Instance.EngineVersion)" -ForegroundColor Gray
            Write-Host "Endpoint: $($Instance.Endpoint.Address)" -ForegroundColor Gray
            Write-Host "Port: $($Instance.Endpoint.Port)" -ForegroundColor Gray
            Write-Host "Publicly Accessible: $($Instance.PubliclyAccessible)" -ForegroundColor Gray
            Write-Host "VPC: $($Instance.DBSubnetGroup.VpcId)" -ForegroundColor Gray
            
            # Afficher les Security Groups
            Write-Host "Security Groups:" -ForegroundColor Gray
            foreach ($SG in $Instance.VpcSecurityGroups) {
                Write-Host "  - $($SG.VpcSecurityGroupId) (Status: $($SG.Status))" -ForegroundColor Gray
            }
            
            Write-Host "----" -ForegroundColor Gray
        }
        
        return $RDSInstances.DBInstances
        
    } catch {
        Write-Host "Erreur lors de la recherche: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Fonction pour rechercher dans d'autres regions
function Search-OtherRegions {
    $CommonRegions = @("eu-west-3", "eu-west-1", "us-east-1", "us-west-2", "eu-central-1", "ap-southeast-1")
    
    Write-Host "`nRecherche dans d'autres regions courantes..." -ForegroundColor Cyan
    
    foreach ($TestRegion in $CommonRegions) {
        if ($TestRegion -eq $Region) {
            continue # On a deja teste cette region
        }
        
        Write-Host "`nTest de la region: $TestRegion" -ForegroundColor Yellow
        
        try {
            $RDSInstances = aws rds describe-db-instances --region $TestRegion 2>$null | ConvertFrom-Json
            
            if ($RDSInstances.DBInstances.Count -gt 0) {
                Write-Host "Instance(s) trouvee(s) dans $TestRegion :" -ForegroundColor Green
                
                foreach ($Instance in $RDSInstances.DBInstances) {
                    Write-Host "  - $($Instance.DBInstanceIdentifier) (Status: $($Instance.DBInstanceStatus))" -ForegroundColor White
                    Write-Host "    Endpoint: $($Instance.Endpoint.Address)" -ForegroundColor Gray
                }
            }
        } catch {
            # Ignore les erreurs pour les regions non autorisees
        }
    }
}

# Fonction pour rechercher par tags ou patterns
function Search-ByPattern {
    param($Region, $Pattern = "maturity")
    
    Write-Host "`nRecherche par pattern '$Pattern'..." -ForegroundColor Cyan
    
    try {
        $AllInstances = aws rds describe-db-instances --region $Region | ConvertFrom-Json
        
        $MatchingInstances = $AllInstances.DBInstances | Where-Object { 
            $_.DBInstanceIdentifier -like "*$Pattern*" -or 
            $_.DBName -like "*$Pattern*" -or
            $_.Endpoint.Address -like "*$Pattern*"
        }
        
        if ($MatchingInstances.Count -gt 0) {
            Write-Host "Instances correspondant au pattern '$Pattern':" -ForegroundColor Green
            
            foreach ($Instance in $MatchingInstances) {
                Write-Host "  - $($Instance.DBInstanceIdentifier)" -ForegroundColor White
                Write-Host "    Endpoint: $($Instance.Endpoint.Address)" -ForegroundColor Gray
            }
        } else {
            Write-Host "Aucune instance ne correspond au pattern '$Pattern'" -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host "Erreur lors de la recherche par pattern: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Fonction pour generer la configuration corrigee
function Generate-CorrectConfig {
    param($Instances)
    
    if ($Instances.Count -eq 0) {
        return
    }
    
    Write-Host "`nCONFIGURATION CORRIGEE POUR VOS SCRIPTS:" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    
    foreach ($Instance in $Instances) {
        Write-Host "`n# Pour l'instance: $($Instance.DBInstanceIdentifier)" -ForegroundColor Cyan
        Write-Host "`$Config = @{" -ForegroundColor White
        Write-Host "    DATABASE_ENDPOINT = `"$($Instance.Endpoint.Address)`"" -ForegroundColor White
        Write-Host "    DATABASE_SECRET_ARN = `"arn:aws:secretsmanager:$Region`:YOUR_ACCOUNT:secret:maturity-db-dev-XXXXX`"" -ForegroundColor White
        Write-Host "    REGION = `"$Region`"" -ForegroundColor White
        Write-Host "    DATABASE_NAME = `"$($Instance.DBName)`"" -ForegroundColor White
        Write-Host "    RDS_IDENTIFIER = `"$($Instance.DBInstanceIdentifier)`"" -ForegroundColor White
        Write-Host "}" -ForegroundColor White
        
        Write-Host "`n# Security Groups a verifier:" -ForegroundColor Yellow
        foreach ($SG in $Instance.VpcSecurityGroups) {
            Write-Host "# - $($SG.VpcSecurityGroupId)" -ForegroundColor Gray
        }
    }
}

# SCRIPT PRINCIPAL
try {
    Write-Host "Verification des prerequisites..." -ForegroundColor Cyan
    
    # Verifier AWS CLI
    try {
        $Identity = aws sts get-caller-identity | ConvertFrom-Json
        Write-Host "AWS CLI configure - Compte: $($Identity.Account)" -ForegroundColor Green
        Write-Host "Region par defaut: $Region" -ForegroundColor Gray
    } catch {
        Write-Host "AWS CLI non configure. Executez: aws configure" -ForegroundColor Red
        exit 1
    }
    
    # Etape 1: Rechercher dans la region specifiee
    $Instances = Get-AllRDSInstances -Region $Region
    
    # Etape 2: Si rien trouve, chercher dans d'autres regions
    if (-not $Instances -or $Instances.Count -eq 0) {
        Search-OtherRegions
    }
    
    # Etape 3: Recherche par pattern
    Search-ByPattern -Region $Region -Pattern "maturity"
    Search-ByPattern -Region $Region -Pattern "backend"
    Search-ByPattern -Region $Region -Pattern "dev"
    
    # Etape 4: Generer la configuration si des instances sont trouvees
    if ($Instances -and $Instances.Count -gt 0) {
        Generate-CorrectConfig -Instances $Instances
    }
    
    # Etape 5: Instructions pour la suite
    Write-Host "`nETAPES SUIVANTES:" -ForegroundColor Yellow
    Write-Host "=================" -ForegroundColor Yellow
    
    if ($Instances -and $Instances.Count -gt 0) {
        Write-Host "1. Copiez la configuration corrigee ci-dessus" -ForegroundColor White
        Write-Host "2. Remplacez la section `$Config dans vos scripts:" -ForegroundColor White
        Write-Host "   - migrate-database-clean.ps1" -ForegroundColor Gray
        Write-Host "   - rds-connectivity-fix.ps1" -ForegroundColor Gray
        Write-Host "3. Verifiez le SECRET_ARN dans AWS Secrets Manager" -ForegroundColor White
        Write-Host "4. Relancez le script de correction reseau" -ForegroundColor White
    } else {
        Write-Host "AUCUNE INSTANCE RDS TROUVEE!" -ForegroundColor Red
        Write-Host "`nPossibles causes:" -ForegroundColor Yellow
        Write-Host "1. L'infrastructure n'a pas ete deployee" -ForegroundColor White
        Write-Host "2. L'instance est dans une autre region" -ForegroundColor White
        Write-Host "3. L'instance est en cours de creation" -ForegroundColor White
        Write-Host "4. Probleme de permissions AWS" -ForegroundColor White
        
        Write-Host "`nCommandes pour deboguer:" -ForegroundColor Cyan
        Write-Host "# Lister toutes les regions:" -ForegroundColor Gray
        Write-Host "aws ec2 describe-regions --query 'Regions[].RegionName' --output table" -ForegroundColor Gray
        Write-Host "`n# Verifier CloudFormation stacks:" -ForegroundColor Gray
        Write-Host "aws cloudformation list-stacks --region $Region" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "`nErreur lors de la recherche: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nVerifiez:" -ForegroundColor Yellow
    Write-Host "1. Vos credentials AWS" -ForegroundColor White
    Write-Host "2. Vos permissions RDS" -ForegroundColor White
    Write-Host "3. La region specifiee" -ForegroundColor White
    exit 1
}