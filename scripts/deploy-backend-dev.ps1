$ErrorActionPreference = "Stop"

Write-Host "Deploiement Infrastructure Maturity Backend - Dev (Windows)" -ForegroundColor Green
Write-Host "===========================================================" -ForegroundColor Green

# Configuration
$ENVIRONMENT = "dev"
$REGION = "eu-west-3"
$STACK_NAME = "MaturityBackend-$ENVIRONMENT"

try {
    # 1. Verifications prealables
    Write-Host ""
    Write-Host "1. Verifications prealables..." -ForegroundColor Yellow

    # Verifier Node.js
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host "Node.js n'est pas installe. Telechargez-le depuis https://nodejs.org/" -ForegroundColor Red
        exit 1
    }
    $nodeVersion = node --version
    Write-Host "Node.js: $nodeVersion" -ForegroundColor Green

    # Verifier npm
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Host "npm n'est pas installe" -ForegroundColor Red
        exit 1
    }
    $npmVersion = npm --version
    Write-Host "npm: $npmVersion" -ForegroundColor Green

    # Verifier AWS CLI
    if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
        Write-Host "AWS CLI n'est pas installe. Installez-le depuis https://aws.amazon.com/cli/" -ForegroundColor Red
        Write-Host "   Ou via chocolatey: choco install awscli" -ForegroundColor Yellow
        exit 1
    }
    $awsVersion = aws --version
    Write-Host "AWS CLI: $awsVersion" -ForegroundColor Green

    # Verifier CDK
    if (-not (Get-Command cdk -ErrorAction SilentlyContinue)) {
        Write-Host "AWS CDK n'est pas installe. Installation..." -ForegroundColor Yellow
        npm install -g aws-cdk@latest
    }
    $cdkVersion = cdk --version
    Write-Host "AWS CDK: $cdkVersion" -ForegroundColor Green

    # Verifier la configuration AWS
    try {
        $identity = aws sts get-caller-identity | ConvertFrom-Json
        $ACCOUNT_ID = $identity.Account
        Write-Host "Compte AWS: $ACCOUNT_ID" -ForegroundColor Green
        Write-Host "Region configuree: $REGION" -ForegroundColor Green
    }
    catch {
        Write-Host "Configuration AWS non valide. Executez: aws configure" -ForegroundColor Red
        exit 1
    }

    # Variables d'environnement
    $env:CDK_DEFAULT_ACCOUNT = $ACCOUNT_ID
    $env:CDK_DEFAULT_REGION = $REGION
    $env:ENVIRONMENT = $ENVIRONMENT

    # 2. Verification du certificat SSL
    Write-Host ""
    Write-Host "2. Verification du certificat SSL..." -ForegroundColor Yellow
    
    $certificateArn = "arn:aws:acm:eu-west-3:637423285771:certificate/cf6a160d-877c-428c-bf0a-8a5f75faabfc"
    
    try {
        $certStatus = aws acm describe-certificate --certificate-arn $certificateArn --region $REGION --query 'Certificate.Status' --output text
        
        if ($certStatus -eq "ISSUED") {
            Write-Host "Certificat SSL valide dans $REGION" -ForegroundColor Green
        } else {
            Write-Host "Certificat SSL non valide: $certStatus" -ForegroundColor Red
            Write-Host "   Verifiez dans la console ACM $REGION" -ForegroundColor Yellow
            exit 1
        }
    }
    catch {
        Write-Host "Erreur lors de la verification du certificat" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        exit 1
    }

    # 3. Navigation vers le dossier infrastructure
    Write-Host ""
    Write-Host "3. Navigation vers le dossier infrastructure..." -ForegroundColor Yellow
    
    $infraPath = Join-Path $PSScriptRoot "..\infrastructure"
    if (-not (Test-Path $infraPath)) {
        Write-Host "Dossier infrastructure non trouve: $infraPath" -ForegroundColor Red
        exit 1
    }
    
    Set-Location $infraPath
    Write-Host "Dans le dossier: $(Get-Location)" -ForegroundColor Green

    # 4. Installation des dependances
    Write-Host ""
    Write-Host "4. Installation des dependances..." -ForegroundColor Yellow
    npm install

    # 5. Build du projet TypeScript
    Write-Host ""
    Write-Host "5. Build du projet TypeScript..." -ForegroundColor Yellow
    npm run build

    # 6. Bootstrap CDK (si necessaire)
    Write-Host ""
    Write-Host "6. Bootstrap CDK..." -ForegroundColor Yellow
    
    try {
        aws cloudformation describe-stacks --stack-name CDKToolkit --region $REGION | Out-Null
        Write-Host "CDK deja bootstrappe" -ForegroundColor Green
    }
    catch {
        Write-Host "Bootstrap CDK requis..." -ForegroundColor Yellow
        cdk bootstrap "aws://$ACCOUNT_ID/$REGION"
    }

    # 7. Synthese du template
    Write-Host ""
    Write-Host "7. Generation du template CloudFormation..." -ForegroundColor Yellow
    cdk synth $STACK_NAME

    # 8. Verification des differences
    Write-Host ""
    Write-Host "8. Verification des differences..." -ForegroundColor Yellow
    try {
        cdk diff $STACK_NAME
    }
    catch {
        Write-Host "Pas de differences ou premiere installation" -ForegroundColor Yellow
    }

    # 9. Confirmation avant deploiement
    Write-Host ""
    Write-Host "Vous allez deployer l'infrastructure suivante:" -ForegroundColor Yellow
    Write-Host "   - Stack: $STACK_NAME" -ForegroundColor White
    Write-Host "   - Region: $REGION" -ForegroundColor White
    Write-Host "   - Compte: $ACCOUNT_ID" -ForegroundColor White
    Write-Host ""
    Write-Host "   Ressources principales qui seront creees:" -ForegroundColor White
    Write-Host "   - VPC avec sous-reseaux public/prive/isole" -ForegroundColor White
    Write-Host "   - Base de donnees RDS MySQL" -ForegroundColor White
    Write-Host "   - Cluster ECS Fargate" -ForegroundColor White
    Write-Host "   - Application Load Balancer" -ForegroundColor White
    Write-Host "   - Repository ECR" -ForegroundColor White
    Write-Host "   - Secrets Manager (DB + JWT)" -ForegroundColor White
    Write-Host "   - CloudWatch Log Groups" -ForegroundColor White
    Write-Host ""
    Write-Host "Cout estime: ~50-80 euros/mois en environnement dev" -ForegroundColor Yellow
    Write-Host ""

    $confirmation = Read-Host "Continuer avec le deploiement ? (y/N)"
    if ($confirmation -ne "y" -and $confirmation -ne "Y") {
        Write-Host "Deploiement annule." -ForegroundColor Yellow
        exit 0
    }

    # 10. Deploiement
    Write-Host ""
    Write-Host "10. Deploiement de l'infrastructure..." -ForegroundColor Yellow
    Write-Host "    (Duree estimee: 15-20 minutes)" -ForegroundColor Yellow

    $startTime = Get-Date

    cdk deploy $STACK_NAME --require-approval never --verbose

    $endTime = Get-Date
    $duration = $endTime - $startTime
    $minutes = [math]::Floor($duration.TotalMinutes)
    $seconds = [math]::Floor($duration.TotalSeconds % 60)

    Write-Host ""
    Write-Host "Deploiement termine en ${minutes}m ${seconds}s!" -ForegroundColor Green

    # 11. Recuperation des outputs
    Write-Host ""
    Write-Host "11. Recuperation des informations de deploiement..." -ForegroundColor Yellow

    $outputs = aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query 'Stacks[0].Outputs' | ConvertFrom-Json

    $apiUrl = ($outputs | Where-Object { $_.OutputKey -eq "ApiUrl" }).OutputValue
    $dbEndpoint = ($outputs | Where-Object { $_.OutputKey -eq "DatabaseEndpoint" }).OutputValue
    $ecrUri = ($outputs | Where-Object { $_.OutputKey -eq "ECRRepositoryURI" }).OutputValue
    $clusterName = ($outputs | Where-Object { $_.OutputKey -eq "ClusterName" }).OutputValue
    $serviceName = ($outputs | Where-Object { $_.OutputKey -eq "ServiceName" }).OutputValue

    # 12. Sauvegarde des informations
    Write-Host ""
    Write-Host "12. Sauvegarde des informations..." -ForegroundColor Yellow

    $deploymentInfo = @{
        deployment = @{
            environment = $ENVIRONMENT
            region = $REGION
            accountId = $ACCOUNT_ID
            stackName = $STACK_NAME
            deploymentTime = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssK")
            duration = "${minutes}m ${seconds}s"
        }
        endpoints = @{
            apiUrl = $apiUrl
            databaseEndpoint = $dbEndpoint
        }
        resources = @{
            ecrRepositoryUri = $ecrUri
            clusterName = $clusterName
            serviceName = $serviceName
        }
        nextSteps = @{
            phase3 = "Build et push de l'image Docker vers ECR"
            commands = @{
                buildDocker = "docker build -t maturity-backend ."
                pushToECR = "Voir le script push-to-ecr.ps1"
                updateService = "aws ecs update-service --cluster $clusterName --service $serviceName --force-new-deployment"
            }
        }
    }

    $deploymentInfo | ConvertTo-Json -Depth 10 | Out-File -FilePath "deployment-info-$ENVIRONMENT.json" -Encoding UTF8

    # 13. Affichage du resume
    Write-Host ""
    Write-Host "DEPLOIEMENT REUSSI!" -ForegroundColor Green
    Write-Host "===================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Informations importantes:" -ForegroundColor Yellow
    Write-Host "   API URL: $apiUrl" -ForegroundColor White
    Write-Host "   Base de donnees: $dbEndpoint" -ForegroundColor White
    Write-Host "   ECR Repository: $ecrUri" -ForegroundColor White
    Write-Host "   Cluster ECS: $clusterName" -ForegroundColor White
    Write-Host "   Service ECS: $serviceName" -ForegroundColor White
    Write-Host ""
    Write-Host "Informations sauvegardees dans: deployment-info-$ENVIRONMENT.json" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Commandes utiles pour monitoring:" -ForegroundColor Yellow
    Write-Host "   - Logs ECS: aws logs tail /ecs/maturity-backend-$ENVIRONMENT --follow" -ForegroundColor White
    Write-Host "   - Etat du service: aws ecs describe-services --cluster $clusterName --services $serviceName" -ForegroundColor White
    Write-Host "   - Taches: aws ecs list-tasks --cluster $clusterName" -ForegroundColor White
    Write-Host ""
    Write-Host "Prochaines etapes (Phase 3):" -ForegroundColor Yellow
    Write-Host "   1. Build de l'image Docker de votre application backend" -ForegroundColor White
    Write-Host "   2. Push de l'image vers le repository ECR" -ForegroundColor White
    Write-Host "   3. Mise a jour du service ECS avec la nouvelle image" -ForegroundColor White
    Write-Host "   4. Migration du schema de base de donnees" -ForegroundColor White
    Write-Host ""
    Write-Host "Phase 2 terminee avec succes!" -ForegroundColor Green

}
catch {
    Write-Host ""
    Write-Host "Erreur durant le deploiement:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Verifiez les logs ci-dessus et relancez le script si necessaire" -ForegroundColor Yellow
    exit 1
}