@'
param(
    [string]$Environment = "dev",
    [ValidateSet("logs", "status", "errors", "restart")]
    [string]$Action = "logs"
)

$ErrorActionPreference = "Stop"

switch ($Action) {
    "logs" {
        Write-Host "📋 Affichage des logs en temps réel..." -ForegroundColor Cyan
        aws logs tail "/ecs/maturity-backend-$Environment" --follow --region eu-west-1
    }
    
    "status" {
        Write-Host "📊 === STATUS DU DÉPLOIEMENT ===" -ForegroundColor Cyan
        
        # Service ECS
        Write-Host "`n🐳 Service ECS:" -ForegroundColor Yellow
        aws ecs describe-services --cluster "maturity-backend-$Environment" --services "maturity-backend-$Environment" --region eu-west-1 --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount,TaskDefinition:taskDefinition}' --output table
        
        # Tasks
        Write-Host "`n📋 Tasks actives:" -ForegroundColor Yellow
        aws ecs list-tasks --cluster "maturity-backend-$Environment" --service-name "maturity-backend-$Environment" --region eu-west-1 --query 'taskArns' --output table
        
        # RDS
        Write-Host "`n🗄️ Base de données RDS:" -ForegroundColor Yellow
        aws rds describe-db-instances --query 'DBInstances[?contains(DBInstanceIdentifier,`maturity`)].{Instance:DBInstanceIdentifier,Status:DBInstanceStatus,Engine:Engine,Version:EngineVersion}' --output table
        
        # Load Balancer
        Write-Host "`n⚖️ Load Balancer:" -ForegroundColor Yellow
        aws elbv2 describe-load-balancers --query 'LoadBalancers[?contains(LoadBalancerName,`maturity`)].{Name:LoadBalancerName,DNS:DNSName,State:State.Code}' --output table
    }
    
    "errors" {
        Write-Host "❌ Recherche d'erreurs dans les logs..." -ForegroundColor Yellow
        $OneHourAgo = [DateTimeOffset]::UtcNow.AddHours(-1).ToUnixTimeMilliseconds()
        aws logs filter-log-events --log-group-name "/ecs/maturity-backend-$Environment" --filter-pattern "ERROR" --start-time $OneHourAgo --region eu-west-1
    }
    
    "restart" {
        Write-Host "🔄 Redémarrage du service..." -ForegroundColor Yellow
        aws ecs update-service --cluster "maturity-backend-$Environment" --service "maturity-backend-$Environment" --force-new-deployment --region eu-west-1
        
        Write-Host "⏳ Attente de la stabilisation..." -ForegroundColor Yellow
        aws ecs wait services-stable --cluster "maturity-backend-$Environment" --services "maturity-backend-$Environment" --region eu-west-1
        
        Write-Host "✅ Service redémarré" -ForegroundColor Green
    }
}
'@ | Out-File -FilePath "monitor.ps1" -Encoding UTF8