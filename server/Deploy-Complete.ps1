# Script PowerShell de deploiement simplifié avec tests d'endpoints
param(
    [string]$Region = "eu-west-1",
    [string]$EcrRegistry = "637423285771.dkr.ecr.eu-west-1.amazonaws.com",
    [string]$Repository = "maturity-backend-dev",
    [string]$Cluster = "maturity-backend-dev",
    [string]$Service = "maturity-backend-dev",
    [switch]$CleanECR = $false,
    [switch]$SkipLocalTest = $false
)

$ErrorActionPreference = "Stop"

Write-Host "=== DEPLOIEMENT MATURITY BACKEND AVEC TESTS ===" -ForegroundColor Green
Write-Host "Date: $(Get-Date)" -ForegroundColor Cyan
Write-Host "Region: $Region" -ForegroundColor Cyan
Write-Host "Repository: $EcrRegistry/$Repository" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Yellow

# ID d'entreprise pour tests (depuis vos logs)
$TestId = "72ab4b93-9ee9-4e20-9c7b-8d50f56dc587"

# Fonction simple pour tester un endpoint
function Test-Endpoint {
    param([string]$Url, [string]$Name)
    
    try {
        $Response = Invoke-WebRequest -Uri $Url -TimeoutSec 10 -UseBasicParsing -SkipHttpErrorCheck
        if ($Response.StatusCode -eq 200) {
            Write-Host "      ✅ $Name : OK ($($Response.StatusCode))" -ForegroundColor Green
            return $true
        } elseif ($Response.StatusCode -eq 404) {
            Write-Host "      ❌ $Name : ENDPOINT MANQUANT (404)" -ForegroundColor Red
            return $false
        } elseif ($Response.StatusCode -eq 401 -or $Response.StatusCode -eq 403) {
            Write-Host "      🔒 $Name : Auth requis ($($Response.StatusCode))" -ForegroundColor Yellow
            return $true
        } else {
            Write-Host "      ⚠️  $Name : Status $($Response.StatusCode)" -ForegroundColor Yellow
            return $false
        }
    } catch {
        Write-Host "      ❌ $Name : ERREUR - $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

try {
    # Etape 1: Nettoyage local
    Write-Host "Etape 1: Nettoyage local..." -ForegroundColor Blue
    docker system prune -af
    Write-Host "OK - Nettoyage termine" -ForegroundColor Green

    # Etape 2: Construction de l'image
    Write-Host "Etape 2: Construction de l'image..." -ForegroundColor Blue
    docker build --no-cache -t $Repository .
    if ($LASTEXITCODE -ne 0) { 
        throw "Erreur lors de la construction" 
    }
    Write-Host "OK - Image construite" -ForegroundColor Green

    # Etape 3: Test local optionnel
    if (-not $SkipLocalTest) {
        Write-Host "Etape 3: Test local..." -ForegroundColor Blue
        
        $TestContainer = docker run -d -p 3000:3000 $Repository
        if ($LASTEXITCODE -ne 0) { 
            throw "Impossible de demarrer le conteneur de test" 
        }
        
        Start-Sleep -Seconds 10
        
        try {
            Write-Host "   Tests endpoints locaux:" -ForegroundColor Cyan
            
            # Tests basiques
            Test-Endpoint "http://localhost:3000/health" "Health Check"
            Test-Endpoint "http://localhost:3000/api/benchmark/sectors" "Benchmark Sectors"
            Test-Endpoint "http://localhost:3000/api/entreprise-registration" "Enterprise Registration"
            
            # Tests problématiques identifiés
            Test-Endpoint "http://localhost:3000/api/entreprise-global/$TestId" "Enterprise Global"
            Test-Endpoint "http://localhost:3000/api/entreprise-global/$TestId/scores-fonctions" "Function Scores (PROBLEMATIC)"
            Test-Endpoint "http://localhost:3000/api/benchmark/motivations/$TestId" "Motivations"
            
        } catch {
            Write-Host "   ⚠️  Tests locaux partiellement échoués: $($_.Exception.Message)" -ForegroundColor Yellow
        } finally {
            docker stop $TestContainer | Out-Null
            docker rm $TestContainer | Out-Null
        }
        
        Write-Host "OK - Tests locaux terminés" -ForegroundColor Green
    }

    # Etape 4: Nettoyage ECR optionnel
    if ($CleanECR) {
        Write-Host "Etape 4: Nettoyage ECR..." -ForegroundColor Blue
        
        try {
            $Images = aws ecr list-images --repository-name $Repository --region $Region --query 'imageIds' --output json | ConvertFrom-Json
            
            if ($Images -and $Images.Count -gt 0) {
                Write-Host "   Suppression de $($Images.Count) images..." -ForegroundColor Yellow
                
                for ($i = 0; $i -lt $Images.Count; $i += 10) {
                    $Batch = $Images[$i..([Math]::Min($i + 9, $Images.Count - 1))]
                    $BatchJson = $Batch | ConvertTo-Json -Compress
                    aws ecr batch-delete-image --repository-name $Repository --region $Region --image-ids $BatchJson | Out-Null
                }
                Write-Host "OK - ECR nettoyé" -ForegroundColor Green
            } else {
                Write-Host "INFO - ECR déjà vide" -ForegroundColor Cyan
            }
        } catch {
            Write-Host "WARN - Erreur nettoyage ECR: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }

    # Etape 5: Push vers ECR
    Write-Host "Etape 5: Push vers ECR..." -ForegroundColor Blue
    
    $UniqueTag = "deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Write-Host "Tag unique: $UniqueTag" -ForegroundColor Cyan
    
    # Connexion ECR
    $LoginCommand = aws ecr get-login-password --region $Region
    $LoginCommand | docker login --username AWS --password-stdin $EcrRegistry
    if ($LASTEXITCODE -ne 0) { 
        throw "Erreur connexion ECR" 
    }
    
    # Tag et push
    docker tag $Repository $EcrRegistry/${Repository}:$UniqueTag
    docker tag $Repository $EcrRegistry/${Repository}:latest
    
    docker push $EcrRegistry/${Repository}:$UniqueTag
    if ($LASTEXITCODE -ne 0) { 
        throw "Erreur push unique" 
    }
    
    docker push $EcrRegistry/${Repository}:latest
    if ($LASTEXITCODE -ne 0) { 
        throw "Erreur push latest" 
    }
    
    Write-Host "OK - Images pushées vers ECR" -ForegroundColor Green

    # Etape 6: Nouvelle task definition
    Write-Host "Etape 6: Création task definition..." -ForegroundColor Blue
    
    $CurrentTaskDef = aws ecs describe-services --cluster $Cluster --services $Service --region $Region --query 'services[0].taskDefinition' --output text
    $TaskDefJson = aws ecs describe-task-definition --task-definition $CurrentTaskDef --region $Region --query 'taskDefinition' --output json | ConvertFrom-Json
    
    # Modifier l'image
    $TaskDefJson.containerDefinitions[0].image = "$EcrRegistry/${Repository}:$UniqueTag"
    
    # Supprimer champs non nécessaires
    $FieldsToRemove = @('taskDefinitionArn', 'revision', 'status', 'requiresAttributes', 'registeredAt', 'registeredBy', 'compatibilities')
    foreach ($Field in $FieldsToRemove) {
        $TaskDefJson.PSObject.Properties.Remove($Field)
    }
    
    # Enregistrer nouvelle task def
    $TempFile = "temp-taskdef.json"
    $TaskDefJson | ConvertTo-Json -Depth 10 | Set-Content -Path $TempFile
    
    $NewTaskDefArn = aws ecs register-task-definition --cli-input-json "file://$TempFile" --region $Region --query 'taskDefinition.taskDefinitionArn' --output text
    Remove-Item $TempFile
    
    if (-not $NewTaskDefArn) { 
        throw "Erreur création task definition" 
    }
    Write-Host "OK - Task definition: $NewTaskDefArn" -ForegroundColor Green

    # Etape 7: Update service ECS
    Write-Host "Etape 7: Mise à jour service ECS..." -ForegroundColor Blue
    
    aws ecs update-service --cluster $Cluster --service $Service --task-definition $NewTaskDefArn --force-new-deployment --region $Region | Out-Null
    if ($LASTEXITCODE -ne 0) { 
        throw "Erreur update service" 
    }
    
    Write-Host "OK - Service ECS mis à jour" -ForegroundColor Green

    # Etape 8: Attente déploiement
    Write-Host "Etape 8: Attente déploiement stable..." -ForegroundColor Blue
    
    $MaxWait = 300
    $StartTime = Get-Date
    $IsStable = $false
    
    do {
        Start-Sleep -Seconds 15
        $ServiceStatus = aws ecs describe-services --cluster $Cluster --services $Service --region $Region --query 'services[0].{Running:runningCount,Desired:desiredCount,Pending:pendingCount}' --output json | ConvertFrom-Json
        
        $Elapsed = ((Get-Date) - $StartTime).TotalSeconds
        Write-Host "   ${Elapsed}s - Running: $($ServiceStatus.Running), Desired: $($ServiceStatus.Desired), Pending: $($ServiceStatus.Pending)" -ForegroundColor Cyan
        
        $IsStable = ($ServiceStatus.Running -eq $ServiceStatus.Desired -and $ServiceStatus.Pending -eq 0)
        
    } while (-not $IsStable -and $Elapsed -lt $MaxWait)
    
    if ($IsStable) {
        Write-Host "OK - Déploiement stable!" -ForegroundColor Green
    } else {
        Write-Host "WARN - Timeout atteint" -ForegroundColor Yellow
    }

    # Etape 9: Tests endpoints déployés
    Write-Host "Etape 9: Tests endpoints déployés..." -ForegroundColor Blue
    
    $ApiUrl = "https://api-dev.dev-maturity.e-dsin.fr"
    Start-Sleep -Seconds 20
    
    Write-Host "   Tests endpoints déployés:" -ForegroundColor Cyan
    
    # Tests basiques
    $HealthOK = Test-Endpoint "$ApiUrl/health" "Health Check"
    $BenchmarkOK = Test-Endpoint "$ApiUrl/api/benchmark/sectors" "Benchmark Sectors"
    $EnterpriseRegOK = Test-Endpoint "$ApiUrl/api/entreprise-registration" "Enterprise Registration"
    
    # Tests problématiques
    $GlobalOK = Test-Endpoint "$ApiUrl/api/entreprise-global/$TestId" "Enterprise Global"
    $ScoresOK = Test-Endpoint "$ApiUrl/api/entreprise-global/$TestId/scores-fonctions" "Function Scores (PROBLEMATIC)"
    $MotivationsOK = Test-Endpoint "$ApiUrl/api/benchmark/motivations/$TestId" "Motivations"
    
    # Autres endpoints critiques
    $EntreprisesOK = Test-Endpoint "$ApiUrl/api/entreprises" "Entreprises List"
    $FonctionsOK = Test-Endpoint "$ApiUrl/api/fonctions" "Functions List"
    $ApplicationsOK = Test-Endpoint "$ApiUrl/api/applications" "Applications List"

    Write-Host ""
    Write-Host "=== RÉSUMÉ DES TESTS ===" -ForegroundColor Yellow
    Write-Host "Endpoints de base:" -ForegroundColor Cyan
    if ($HealthOK) { Write-Host "   ✅ Health Check" -ForegroundColor Green } else { Write-Host "   ❌ Health Check" -ForegroundColor Red }
    if ($BenchmarkOK) { Write-Host "   ✅ Benchmark Sectors" -ForegroundColor Green } else { Write-Host "   ❌ Benchmark Sectors" -ForegroundColor Red }
    if ($EnterpriseRegOK) { Write-Host "   ✅ Enterprise Registration" -ForegroundColor Green } else { Write-Host "   ❌ Enterprise Registration" -ForegroundColor Red }
    
    Write-Host "Endpoints problématiques identifiés:" -ForegroundColor Cyan
    if ($GlobalOK) { Write-Host "   ✅ Enterprise Global Data" -ForegroundColor Green } else { Write-Host "   ❌ Enterprise Global Data" -ForegroundColor Red }
    if ($ScoresOK) { Write-Host "   ✅ Function Scores" -ForegroundColor Green } else { Write-Host "   ❌ Function Scores - NÉCESSITE CORRECTION" -ForegroundColor Red }
    if ($MotivationsOK) { Write-Host "   ✅ Motivations" -ForegroundColor Green } else { Write-Host "   ❌ Motivations" -ForegroundColor Red }

    Write-Host ""
    Write-Host "=== DÉPLOIEMENT TERMINÉ ===" -ForegroundColor Green
    Write-Host "Tag déployé: $UniqueTag" -ForegroundColor Cyan
    Write-Host "Task Definition: $NewTaskDefArn" -ForegroundColor Cyan
    Write-Host "API URL: $ApiUrl" -ForegroundColor Cyan
    
    if (-not $ScoresOK) {
        Write-Host ""
        Write-Host "⚠️  ATTENTION: L'endpoint /scores-fonctions retourne 404" -ForegroundColor Yellow
        Write-Host "Cet endpoint est utilisé par le frontend et doit être corrigé." -ForegroundColor Yellow
        Write-Host "URL problématique: $ApiUrl/api/entreprise-global/$TestId/scores-fonctions" -ForegroundColor Red
    }

} catch {
    Write-Host ""
    Write-Host "=== ERREUR DÉPLOIEMENT ===" -ForegroundColor Red
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Actions recommandées:" -ForegroundColor Yellow
    Write-Host "1. Logs ECS: aws logs tail /ecs/$Service --follow --region $Region" -ForegroundColor White
    Write-Host "2. Relancer avec -CleanECR" -ForegroundColor White
    Write-Host "3. Tester: curl -I $ApiUrl/api/entreprise-global/$TestId/scores-fonctions" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "Deploiement reussi!" -ForegroundColor Green