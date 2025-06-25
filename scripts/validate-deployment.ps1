# validate-deployment.ps1
$ErrorActionPreference = "Stop"

$ENVIRONMENT = "dev"
$REGION = "eu-west-3"
$STACK_NAME = "MaturityBackend-$ENVIRONMENT"

Write-Host "🔍 Validation de l'infrastructure déployée" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

function Test-ServiceStatus($serviceName, $status, $expected) {
    if ($status -eq $expected) {
        Write-Host "✅ $serviceName : $status" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ $serviceName : $status (attendu: $expected)" -ForegroundColor Red
        return $false
    }
}

try {
    # 1. Stack CloudFormation
    Write-Host ""
    Write-Host "📋 1. Stack CloudFormation..." -ForegroundColor Yellow
    
    $stackStatus = aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query 'Stacks[0].StackStatus' --output text
    
    if ($stackStatus -eq "CREATE_COMPLETE" -or $stackStatus -eq "UPDATE_COMPLETE") {
        Write-Host "✅ Stack CloudFormation: $stackStatus" -ForegroundColor Green
    } else {
        Write-Host "❌ Stack CloudFormation: $stackStatus" -ForegroundColor Red
        exit 1
    }

    # 2. Base de données RDS
    Write-Host ""
    Write-Host "🗄️ 2. Base de données RDS..." -ForegroundColor Yellow
    
    $dbStatus = aws rds describe-db-instances --region $REGION --query "DBInstances[?contains(DBInstanceIdentifier, 'maturity')].DBInstanceStatus" --output text
    
    if ($dbStatus -eq "available") {
        Write-Host "✅ Base de données RDS: $dbStatus" -ForegroundColor Green
    } else {
        Write-Host "❌ Base de données RDS: $dbStatus" -ForegroundColor Red
    }

    # 3. Cluster ECS
    Write-Host ""
    Write-Host "📋 3. Cluster ECS..." -ForegroundColor Yellow
    
    $clusterStatus = aws ecs describe-clusters --clusters "maturity-backend-$ENVIRONMENT" --region $REGION --query 'clusters[0].status' --output text
    
    Test-ServiceStatus "Cluster ECS" $clusterStatus "ACTIVE"

    # 4. Service ECS
    Write-Host ""
    Write-Host "🚀 4. Service ECS..." -ForegroundColor Yellow
    
    $serviceStatus = aws ecs describe-services --cluster "maturity-backend-$ENVIRONMENT" --services "maturity-backend-$ENVIRONMENT" --region $REGION --query 'services[0].status' --output text
    
    if (Test-ServiceStatus "Service ECS" $serviceStatus "ACTIVE") {
        $desiredCount = aws ecs describe-services --cluster "maturity-backend-$ENVIRONMENT" --services "maturity-backend-$ENVIRONMENT" --region $REGION --query 'services[0].desiredCount' --output text
        $runningCount = aws ecs describe-services --cluster "maturity-backend-$ENVIRONMENT" --services "maturity-backend-$ENVIRONMENT" --region $REGION --query 'services[0].runningCount' --output text
        
        Write-Host "   📊 Tâches désirées: $desiredCount, En cours: $runningCount" -ForegroundColor White
    }

    Write-Host ""
    Write-Host "✅ Validation terminée!" -ForegroundColor Green

} catch {
    Write-Host ""
    Write-Host "❌ Erreur durant la validation:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}