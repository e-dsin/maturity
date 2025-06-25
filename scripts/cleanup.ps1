@'
param(
    [string]$Environment = "dev",
    [switch]$Force
)

$ErrorActionPreference = "Stop"

Write-Host "🗑️ === NETTOYAGE - $Environment ===" -ForegroundColor Cyan
Write-Host "⚠️ Cette opération va supprimer:" -ForegroundColor Yellow
Write-Host "  - Stack CloudFormation" -ForegroundColor Red
Write-Host "  - Base de données RDS" -ForegroundColor Red
Write-Host "  - Images ECR" -ForegroundColor Red
Write-Host "  - Logs CloudWatch" -ForegroundColor Red

if (-not $Force) {
    $Confirm = Read-Host "Êtes-vous sûr ? (oui/non)"
    if ($Confirm -ne "oui") {
        Write-Host "❌ Opération annulée" -ForegroundColor Red
        exit 1
    }
}

try {
    Write-Host "🗑️ Suppression de la stack..." -ForegroundColor Yellow
    Push-Location infrastructure
    npm run "destroy:$Environment"
    Pop-Location
    
    Write-Host "🗑️ Nettoyage des images ECR..." -ForegroundColor Yellow
    try {
        $Images = aws ecr list-images --repository-name "maturity-backend-$Environment" --region eu-west-1 --query 'imageIds[?imageTag!=`latest`]'
        if ($Images -and $Images -ne "[]") {
            $Images | aws ecr batch-delete-image --repository-name "maturity-backend-$Environment" --region eu-west-1 --image-ids file:///dev/stdin
        }
    } catch {
        Write-Host "⚠️ Erreur lors du nettoyage ECR (normal si repository n'existe pas)" -ForegroundColor Yellow
    }
    
    Write-Host "🗑️ Suppression des logs anciens..." -ForegroundColor Yellow
    try {
        aws logs delete-log-group --log-group-name "/ecs/maturity-backend-$Environment" --region eu-west-1
    } catch {
        Write-Host "⚠️ Erreur lors de la suppression des logs (normal si n'existent pas)" -ForegroundColor Yellow
    }
    
    Write-Host "✅ Nettoyage terminé" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors du nettoyage: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
'@ | Out-File -FilePath "cleanup.ps1" -Encoding UTF8