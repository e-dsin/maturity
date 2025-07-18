# Script PowerShell ultra-simple pour déploiement
param(
    [switch]$SkipLocalTest = $false,
    [switch]$CleanECR = $false
)

$ErrorActionPreference = "Stop"

# Variables
$Region = "eu-west-1"
$EcrRegistry = "637423285771.dkr.ecr.eu-west-1.amazonaws.com"
$Repository = "maturity-backend-dev"
$Cluster = "maturity-backend-dev"
$Service = "maturity-backend-dev"
$ApiUrl = "https://api-dev.dev-maturity.e-dsin.fr"
$TestId = "72ab4b93-9ee9-4e20-9c7b-8d50f56dc587"

Write-Host "=== DEPLOIEMENT SIMPLE ===" -ForegroundColor Green
Write-Host "Date: $(Get-Date)" -ForegroundColor Cyan

try {
    # 1. Nettoyage
    Write-Host "1. Nettoyage..." -ForegroundColor Blue
    docker system prune -af
    Write-Host "OK" -ForegroundColor Green

    # 2. Build
    Write-Host "2. Construction..." -ForegroundColor Blue
    docker build --no-cache -t $Repository .
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed"
    }
    Write-Host "OK" -ForegroundColor Green

    # 3. Test local (optionnel)
    if (-not $SkipLocalTest) {
        Write-Host "3. Test local..." -ForegroundColor Blue
        $TestContainer = docker run -d -p 3000:3000 $Repository
        Start-Sleep -Seconds 10
        
        try {
            $health = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 10 -UseBasicParsing
            Write-Host "   Health: $($health.StatusCode)" -ForegroundColor Green
        } catch {
            Write-Host "   Health: FAILED" -ForegroundColor Red
        }
        
        try {
            $api = Invoke-WebRequest -Uri "http://localhost:3000/api/entreprise-registration" -TimeoutSec 10 -UseBasicParsing
            Write-Host "   API: $($api.StatusCode)" -ForegroundColor Green
        } catch {
            Write-Host "   API: FAILED" -ForegroundColor Red
        }
        
        docker stop $TestContainer | Out-Null
        docker rm $TestContainer | Out-Null
        Write-Host "OK" -ForegroundColor Green
    }

    # 4. Nettoyage ECR (optionnel)
    if ($CleanECR) {
        Write-Host "4. Nettoyage ECR..." -ForegroundColor Blue
        try {
            $Images = aws ecr list-images --repository-name $Repository --region $Region --query 'imageIds' --output json | ConvertFrom-Json
            if ($Images -and $Images.Count -gt 0) {
                aws ecr batch-delete-image --repository-name $Repository --region $Region --image-ids $($Images | ConvertTo-Json -Compress) | Out-Null
            }
            Write-Host "OK" -ForegroundColor Green
        } catch {
            Write-Host "SKIP - Error cleaning ECR" -ForegroundColor Yellow
        }
    }

    # 5. Push ECR
    Write-Host "5. Push ECR..." -ForegroundColor Blue
    $UniqueTag = "deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    
    # Login ECR
    $LoginCommand = aws ecr get-login-password --region $Region
    $LoginCommand | docker login --username AWS --password-stdin $EcrRegistry
    
    # Tag and push
    docker tag $Repository $EcrRegistry/${Repository}:$UniqueTag
    docker tag $Repository $EcrRegistry/${Repository}:latest
    docker push $EcrRegistry/${Repository}:$UniqueTag
    docker push $EcrRegistry/${Repository}:latest
    
    Write-Host "OK - Tag: $UniqueTag" -ForegroundColor Green

    # 6. Task Definition
    Write-Host "6. Task Definition..." -ForegroundColor Blue
    $CurrentTaskDef = aws ecs describe-services --cluster $Cluster --services $Service --region $Region --query 'services[0].taskDefinition' --output text
    $TaskDefJson = aws ecs describe-task-definition --task-definition $CurrentTaskDef --region $Region --query 'taskDefinition' --output json | ConvertFrom-Json
    
    # Update image
    $TaskDefJson.containerDefinitions[0].image = "$EcrRegistry/${Repository}:$UniqueTag"
    
    # Remove unwanted fields
    $TaskDefJson.PSObject.Properties.Remove('taskDefinitionArn')
    $TaskDefJson.PSObject.Properties.Remove('revision')
    $TaskDefJson.PSObject.Properties.Remove('status')
    $TaskDefJson.PSObject.Properties.Remove('requiresAttributes')
    $TaskDefJson.PSObject.Properties.Remove('registeredAt')
    $TaskDefJson.PSObject.Properties.Remove('registeredBy')
    $TaskDefJson.PSObject.Properties.Remove('compatibilities')
    
    # Register new task def
    $TempFile = "temp-taskdef.json"
    $TaskDefJson | ConvertTo-Json -Depth 10 | Set-Content -Path $TempFile
    $NewTaskDefArn = aws ecs register-task-definition --cli-input-json "file://$TempFile" --region $Region --query 'taskDefinition.taskDefinitionArn' --output text
    Remove-Item $TempFile
    
    Write-Host "OK - $NewTaskDefArn" -ForegroundColor Green

    # 7. Update ECS Service
    Write-Host "7. Update ECS..." -ForegroundColor Blue
    aws ecs update-service --cluster $Cluster --service $Service --task-definition $NewTaskDefArn --force-new-deployment --region $Region | Out-Null
    Write-Host "OK" -ForegroundColor Green

    # 8. Wait for deployment
    Write-Host "8. Waiting deployment..." -ForegroundColor Blue
    $MaxWait = 300
    $StartTime = Get-Date
    
    do {
        Start-Sleep -Seconds 15
        $ServiceStatus = aws ecs describe-services --cluster $Cluster --services $Service --region $Region --query 'services[0].{Running:runningCount,Desired:desiredCount,Pending:pendingCount}' --output json | ConvertFrom-Json
        $Elapsed = ((Get-Date) - $StartTime).TotalSeconds
        Write-Host "   ${Elapsed}s - R:$($ServiceStatus.Running) D:$($ServiceStatus.Desired) P:$($ServiceStatus.Pending)" -ForegroundColor Cyan
        $IsStable = ($ServiceStatus.Running -eq $ServiceStatus.Desired -and $ServiceStatus.Pending -eq 0)
    } while (-not $IsStable -and $Elapsed -lt $MaxWait)
    
    if ($IsStable) {
        Write-Host "OK - Stable!" -ForegroundColor Green
    } else {
        Write-Host "TIMEOUT - Check manually" -ForegroundColor Yellow
    }

    # 9. Test endpoints
    Write-Host "9. Test deployed endpoints..." -ForegroundColor Blue
    Start-Sleep -Seconds 20
    
    # Test health
    try {
        $deployedHealth = Invoke-WebRequest -Uri "$ApiUrl/health" -TimeoutSec 15 -UseBasicParsing
        Write-Host "   Health: $($deployedHealth.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "   Health: FAILED" -ForegroundColor Red
    }
    
    # Test enterprise registration
    try {
        $deployedReg = Invoke-WebRequest -Uri "$ApiUrl/api/entreprise-registration" -TimeoutSec 15 -UseBasicParsing
        Write-Host "   Enterprise Reg: $($deployedReg.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "   Enterprise Reg: FAILED" -ForegroundColor Red
    }
    
    # Test benchmark
    try {
        $deployedBench = Invoke-WebRequest -Uri "$ApiUrl/api/benchmark/sectors" -TimeoutSec 15 -UseBasicParsing
        Write-Host "   Benchmark: $($deployedBench.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "   Benchmark: FAILED" -ForegroundColor Red
    }
    
    # Test problematic endpoint
    try {
        $deployedScores = Invoke-WebRequest -Uri "$ApiUrl/api/entreprise-global/$TestId/scores-fonctions" -TimeoutSec 15 -UseBasicParsing -SkipHttpErrorCheck
        if ($deployedScores.StatusCode -eq 200) {
            Write-Host "   Function Scores: OK" -ForegroundColor Green
        } elseif ($deployedScores.StatusCode -eq 404) {
            Write-Host "   Function Scores: 404 - ENDPOINT MISSING" -ForegroundColor Red
        } else {
            Write-Host "   Function Scores: $($deployedScores.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   Function Scores: FAILED" -ForegroundColor Red
    }

    Write-Host ""
    Write-Host "=== DEPLOYMENT COMPLETE ===" -ForegroundColor Green
    Write-Host "Tag: $UniqueTag" -ForegroundColor Cyan
    Write-Host "API: $ApiUrl" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Test URLs:" -ForegroundColor Yellow
    Write-Host "  Health: $ApiUrl/health" -ForegroundColor White
    Write-Host "  Registration: $ApiUrl/api/entreprise-registration" -ForegroundColor White
    Write-Host "  Problematic: $ApiUrl/api/entreprise-global/$TestId/scores-fonctions" -ForegroundColor Red

} catch {
    Write-Host ""
    Write-Host "=== ERROR ===" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Check logs: aws logs tail /ecs/$Service --follow --region $Region" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "SUCCESS!" -ForegroundColor Green