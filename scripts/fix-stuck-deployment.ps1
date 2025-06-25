
param(
    [string]$Environment = "dev",
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$Region = "eu-west-1"
$StackName = "MaturityBackend-$Environment"

Write-Host "=== CORRECTION DU DEPLOIEMENT BLOQUE ===" -ForegroundColor Red

# 1. Diagnostic du problème
Write-Host "`n1. DIAGNOSTIC DU PROBLEME" -ForegroundColor Yellow

Write-Host "Verification de l'image Docker dans ECR..." -ForegroundColor Gray
try {
    $Images = aws ecr describe-images --repository-name "maturity-backend-$Environment" --region $Region 2>$null
    if ($Images) {
        $ImageCount = ($Images | ConvertFrom-Json).imageDetails.Count
        Write-Host "Images trouvees dans ECR: $ImageCount" -ForegroundColor Green
        if ($ImageCount -eq 0) {
            Write-Host "❌ PROBLEME IDENTIFIE: Aucune image dans le repository ECR" -ForegroundColor Red
            Write-Host "C'est pourquoi le service ECS ne peut pas demarrer" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ PROBLEME IDENTIFIE: Repository ECR vide ou inexistant" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ PROBLEME IDENTIFIE: Impossible d'acceder au repository ECR" -ForegroundColor Red
}

# 2. Proposer les options
Write-Host "`n2. OPTIONS DE CORRECTION" -ForegroundColor Yellow
Write-Host "Option A: Annuler et redemarrer le deploiement proprement" -ForegroundColor Cyan
Write-Host "Option B: Construire l'image maintenant pour sauver le deploiement actuel" -ForegroundColor Cyan

if (-not $Force) {
    $Choice = Read-Host "Choisissez votre option (A/B)"
} else {
    $Choice = "A"
    Write-Host "Mode Force: Option A selectionnee automatiquement" -ForegroundColor Yellow
}

if ($Choice -eq "A" -or $Choice -eq "a") {
    Write-Host "`n=== OPTION A: REDEMARRAGE PROPRE ===" -ForegroundColor Cyan
    
    # Arrêter CDK s'il tourne encore
    Write-Host "1. Arret des processus CDK en cours..." -ForegroundColor Yellow
    Get-Process | Where-Object { $_.ProcessName -like "*node*" -and $_.CommandLine -like "*cdk*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    
    # Supprimer la stack bloquée
    Write-Host "2. Suppression de la stack bloquee..." -ForegroundColor Yellow
    try {
        aws cloudformation delete-stack --stack-name $StackName --region $Region
        Write-Host "Commande de suppression envoyee" -ForegroundColor Green
        
        Write-Host "3. Attente de la suppression complete..." -ForegroundColor Yellow
        Write-Host "Cela peut prendre 5-10 minutes..." -ForegroundColor Gray
        
        $DeleteStartTime = Get-Date
        do {
            Start-Sleep -Seconds 30
            $ElapsedMinutes = ((Get-Date) - $DeleteStartTime).TotalMinutes
            Write-Host "Suppression en cours... ($([math]::Round($ElapsedMinutes, 1)) min)" -ForegroundColor Gray
            
            $StackStatus = aws cloudformation describe-stacks --stack-name $StackName --region $Region --query 'Stacks[0].StackStatus' --output text 2>$null
            
            if (-not $StackStatus) {
                Write-Host "✅ Stack supprimee avec succes" -ForegroundColor Green
                break
            }
            
            if ($ElapsedMinutes -gt 15) {
                Write-Host "⚠️ Suppression prend plus de temps que prevu..." -ForegroundColor Yellow
                break
            }
            
        } while ($StackStatus)
        
    } catch {
        Write-Host "Erreur lors de la suppression: $_" -ForegroundColor Red
    }
    
    # Déploiement en phases
    Write-Host "`n4. DEPLOIEMENT EN PHASES" -ForegroundColor Cyan
    
    Write-Host "Phase 1: Infrastructure seule (sans service ECS)..." -ForegroundColor Yellow
    Write-Host "Pour eviter le probleme, nous allons d'abord deployer l'infrastructure" -ForegroundColor Gray
    Write-Host "puis construire l'image Docker, puis ajouter le service ECS" -ForegroundColor Gray
    
    Write-Host "`nInstructions pour continuer:" -ForegroundColor Green
    Write-Host "1. Editez infrastructure/lib/backend-stack.ts" -ForegroundColor White
    Write-Host "2. Commentez temporairement la section ApplicationLoadBalancedFargateService" -ForegroundColor White
    Write-Host "3. Executez: cdk deploy MaturityBackend-dev" -ForegroundColor White
    Write-Host "4. Construisez et poussez l'image Docker" -ForegroundColor White
    Write-Host "5. Decommentez la section ApplicationLoadBalancedFargateService" -ForegroundColor White
    Write-Host "6. Re-executez: cdk deploy MaturityBackend-dev" -ForegroundColor White
    
} elseif ($Choice -eq "B" -or $Choice -eq "b") {
    Write-Host "`n=== OPTION B: CONSTRUCTION IMAGE IMMEDIATE ===" -ForegroundColor Cyan
    
    # Construire l'image maintenant
    Write-Host "1. Construction de l'image Docker..." -ForegroundColor Yellow
    
    if (-not (Test-Path "Dockerfile")) {
        Write-Host "❌ Dockerfile non trouve dans le repertoire actuel" -ForegroundColor Red
        Write-Host "Assurez-vous d'etre dans le repertoire racine du projet" -ForegroundColor Yellow
        exit 1
    }
    
    try {
        $AccountId = aws sts get-caller-identity --query Account --output text
        $EcrUri = "$AccountId.dkr.ecr.$Region.amazonaws.com/maturity-backend-$Environment"
        
        Write-Host "2. Connexion a ECR..." -ForegroundColor Yellow
        $LoginPassword = aws ecr get-login-password --region $Region
        $LoginPassword | docker login --username AWS --password-stdin $EcrUri
        
        Write-Host "3. Build de l'image..." -ForegroundColor Yellow
        docker build -t "maturity-backend-$Environment" .
        
        Write-Host "4. Tag et push vers ECR..." -ForegroundColor Yellow
        docker tag "maturity-backend-${Environment}:latest" "${EcrUri}:latest"
        docker push "${EcrUri}:latest"
        
        Write-Host "✅ Image poussee avec succes vers ECR" -ForegroundColor Green
        Write-Host "Le service ECS devrait maintenant pouvoir se stabiliser" -ForegroundColor Green
        Write-Host "Attendez 5-10 minutes pour que le deploiement se termine" -ForegroundColor Yellow
        
    } catch {
        Write-Host "❌ Erreur lors de la construction/push de l'image: $_" -ForegroundColor Red
        Write-Host "Revenez a l'Option A si necessaire" -ForegroundColor Yellow
    }
    
} else {
    Write-Host "Option non valide. Script annule." -ForegroundColor Red
    exit 1
}

Write-Host "`n=== PROCHAINES ETAPES ===" -ForegroundColor Green
Write-Host "Apres correction du probleme:" -ForegroundColor White
Write-Host "1. Surveillez le deploiement avec: aws cloudformation list-stacks --region eu-west-1" -ForegroundColor Gray
Write-Host "2. Une fois termine, testez: .\get-rds-credentials.ps1 -Environment $Environment" -ForegroundColor Gray
Write-Host "3. Puis testez l'API: curl https://api-$Environment.dev-maturity.e-dsin.fr/health" -ForegroundColor Gray