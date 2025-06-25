# choose-migration-strategy.ps1 - Choix de strategie de migration

Write-Host "CHOIX DE STRATEGIE DE MIGRATION" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

# Informations detectees
$EU_WEST_1_RDS = "maturitybackend-dev-databaseb269d8bb-rh7bxy6kcqbb"
$EU_WEST_1_ENDPOINT = "maturitybackend-dev-databaseb269d8bb-rh7bxy6kcqbb.cd6w86yy2wyp.eu-west-1.rds.amazonaws.com"

Write-Host "`nINFRASTRUCTURE DETECTEE:" -ForegroundColor Cyan
Write-Host "Region: eu-west-1" -ForegroundColor White
Write-Host "Instance RDS: $EU_WEST_1_RDS" -ForegroundColor White
Write-Host "Endpoint: $EU_WEST_1_ENDPOINT" -ForegroundColor White
Write-Host "Statut: available" -ForegroundColor Green

Write-Host "`nOPTIONS DISPONIBLES:" -ForegroundColor Yellow
Write-Host "===================" -ForegroundColor Yellow

Write-Host "`n1. UTILISER L'INFRASTRUCTURE EXISTANTE (eu-west-1)" -ForegroundColor Cyan
Write-Host "   ✅ Avantages:" -ForegroundColor Green
Write-Host "      - Infrastructure deja deployee et fonctionnelle" -ForegroundColor White
Write-Host "      - Migration immediate possible" -ForegroundColor White
Write-Host "      - Pas de couts supplementaires" -ForegroundColor White
Write-Host "   ⚠️  Note:" -ForegroundColor Yellow
Write-Host "      - Votre application doit utiliser la region eu-west-1" -ForegroundColor White

Write-Host "`n2. MIGRER VERS EU-WEST-3 (nouvelle infrastructure)" -ForegroundColor Cyan
Write-Host "   ✅ Avantages:" -ForegroundColor Green
Write-Host "      - Infrastructure dans la region souhaitee" -ForegroundColor White
Write-Host "      - Configuration propre" -ForegroundColor White
Write-Host "   ❌ Inconvenients:" -ForegroundColor Red
Write-Host "      - Necessite de deployer toute l'infrastructure" -ForegroundColor White
Write-Host "      - Couts supplementaires" -ForegroundColor White
Write-Host "      - Plus complexe" -ForegroundColor White

Write-Host "`n3. ANALYSER L'INFRASTRUCTURE EXISTANTE" -ForegroundColor Cyan
Write-Host "   - Voir les ressources deployees" -ForegroundColor White
Write-Host "   - Comprendre la configuration actuelle" -ForegroundColor White

$Choice = Read-Host "`nQuel est votre choix? (1/2/3)"

switch ($Choice) {
    "1" {
        Write-Host "`nVous avez choisi d'utiliser l'infrastructure existante (eu-west-1)" -ForegroundColor Green
        Write-Host "=================================================================" -ForegroundColor Green
        
        # Generer la configuration pour eu-west-1
        Write-Host "`nCONFIGURATION POUR EU-WEST-1:" -ForegroundColor Cyan
        
        $ConfigContent = @"
# Configuration pour utiliser l'infrastructure existante en eu-west-1
`$Config = @{
    DATABASE_ENDPOINT = "$EU_WEST_1_ENDPOINT"
    DATABASE_SECRET_ARN = "arn:aws:secretsmanager:eu-west-1:637423285771:secret:maturity-db-dev-1QEB1e"
    REGION = "eu-west-1"
    DATABASE_NAME = "maturity_assessment"
    RDS_IDENTIFIER = "$EU_WEST_1_RDS"
}
"@
        
        Write-Host $ConfigContent -ForegroundColor White
        
        # Creer les scripts mis a jour
        Write-Host "`nCreation des scripts pour eu-west-1..." -ForegroundColor Yellow
        
        # Script de migration pour eu-west-1
        $MigrationScript = @"
# migrate-eu-west-1.ps1 - Migration vers l'infrastructure existante
param([string]`$Environment = "dev")

# Configuration pour eu-west-1
`$Config = @{
    DATABASE_ENDPOINT = "$EU_WEST_1_ENDPOINT"
    DATABASE_SECRET_ARN = "arn:aws:secretsmanager:eu-west-1:637423285771:secret:maturity-db-dev-1QEB1e"
    REGION = "eu-west-1" 
    DATABASE_NAME = "maturity_assessment"
}

Write-Host "MIGRATION VERS EU-WEST-1 - Environment: `$Environment" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Test de connectivite
try {
    Write-Host "Test de connectivite vers `$(`$Config.DATABASE_ENDPOINT)..." -ForegroundColor Cyan
    `$TCPClient = New-Object System.Net.Sockets.TcpClient
    `$Connect = `$TCPClient.BeginConnect("`$EU_WEST_1_ENDPOINT", 3306, `$null, `$null)
    `$Wait = `$Connect.AsyncWaitHandle.WaitOne(10000, `$false)
    
    if (`$Wait) {
        `$TCPClient.EndConnect(`$Connect)
        `$TCPClient.Close()
        Write-Host "Connectivite OK!" -ForegroundColor Green
        
        Write-Host "`nETAPES SUIVANTES:" -ForegroundColor Yellow
        Write-Host "1. Mettez a jour vos scripts avec la configuration ci-dessus" -ForegroundColor White
        Write-Host "2. Telechargez le certificat SSL eu-west-1:" -ForegroundColor White
        Write-Host "   Invoke-WebRequest -Uri 'https://truststore.pki.rds.amazonaws.com/eu-west-1/eu-west-1-bundle.pem' -OutFile '`$env:USERPROFILE\maturity-assessment-dasboard\server\eu-west-1-bundle.pem'" -ForegroundColor Gray
        Write-Host "3. Executez: .\migrate-database-clean.ps1" -ForegroundColor White
        
    } else {
        `$TCPClient.Close()
        Write-Host "Probleme de connectivite. Verification des Security Groups necessaire." -ForegroundColor Red
    }
} catch {
    Write-Host "Erreur de connectivite: `$(`$_.Exception.Message)" -ForegroundColor Red
}
"@
        
        # Sauvegarder le script
        $MigrationScript | Out-File -FilePath "migrate-eu-west-1.ps1" -Encoding UTF8
        Write-Host "Script cree: migrate-eu-west-1.ps1" -ForegroundColor Green
        
        Write-Host "`nPROCHAINES ETAPES:" -ForegroundColor Yellow
        Write-Host "1. Executez: .\migrate-eu-west-1.ps1" -ForegroundColor White
        Write-Host "2. Ou mettez a jour manuellement vos scripts existants" -ForegroundColor White
    }
    
    "2" {
        Write-Host "`nVous avez choisi de migrer vers eu-west-3" -ForegroundColor Green
        Write-Host "=========================================" -ForegroundColor Green
        
        Write-Host "`nPour deployer l'infrastructure en eu-west-3, vous devez:" -ForegroundColor Yellow
        Write-Host "1. Deployer votre stack CloudFormation/CDK en eu-west-3" -ForegroundColor White
        Write-Host "2. Creer une nouvelle instance RDS" -ForegroundColor White
        Write-Host "3. Configurer les security groups" -ForegroundColor White
        Write-Host "4. Migrer les donnees si necessaire" -ForegroundColor White
        
        Write-Host "`nCommandes AWS CLI pour deployer en eu-west-3:" -ForegroundColor Cyan
        Write-Host "# Si vous utilisez CloudFormation:" -ForegroundColor Gray
        Write-Host "aws cloudformation deploy --template-file votre-template.yml --stack-name maturity-backend-eu-west-3 --region eu-west-3 --capabilities CAPABILITY_IAM" -ForegroundColor Gray
        
        Write-Host "`n# Si vous utilisez CDK:" -ForegroundColor Gray
        Write-Host "cdk deploy --region eu-west-3" -ForegroundColor Gray
        
        $CreateRDS = Read-Host "`nVoulez-vous que je cree une instance RDS simple en eu-west-3? (o/n)"
        if ($CreateRDS -eq "o") {
            Write-Host "`nCreation d'une instance RDS en eu-west-3..." -ForegroundColor Yellow
            Write-Host "aws rds create-db-instance --db-instance-identifier maturity-assessment-eu-west-3 --db-instance-class db.t3.micro --engine mysql --engine-version 8.0 --allocated-storage 20 --db-name maturity_assessment --master-username admin --master-user-password 'VotreMotDePasse123!' --publicly-accessible --region eu-west-3" -ForegroundColor Gray
            Write-Host "`nATTENTION: Remplacez 'VotreMotDePasse123!' par un mot de passe securise" -ForegroundColor Red
        }
    }
    
    "3" {
        Write-Host "`nAnalyse de l'infrastructure existante..." -ForegroundColor Green
        Write-Host "=========================================" -ForegroundColor Green
        
        try {
            Write-Host "`nStacks CloudFormation en eu-west-1:" -ForegroundColor Cyan
            aws cloudformation list-stacks --region eu-west-1 --query 'StackSummaries[?StackStatus!=`DELETE_COMPLETE`].[StackName,StackStatus]' --output table
            
            Write-Host "`nSecrets Manager en eu-west-1:" -ForegroundColor Cyan  
            aws secretsmanager list-secrets --region eu-west-1 --query 'SecretList[].Name' --output table
            
            Write-Host "`nAutres instances RDS en eu-west-1:" -ForegroundColor Cyan
            aws rds describe-db-instances --region eu-west-1 --query 'DBInstances[].[DBInstanceIdentifier,DBInstanceStatus,Engine]' --output table
            
        } catch {
            Write-Host "Erreur lors de l'analyse: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        Write-Host "`nPour plus d'informations, executez ce script a nouveau et choisissez l'option 1 ou 2." -ForegroundColor White
    }
    
    default {
        Write-Host "`nChoix invalide. Relancez le script et choisissez 1, 2 ou 3." -ForegroundColor Red
    }
}