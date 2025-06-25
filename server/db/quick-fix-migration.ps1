# quick-fix-migration.ps1 - Script rapide pour la migration eu-west-3 (sans caracteres speciaux)

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "dev"
)

$REGION = "eu-west-3"

Write-Host "MIGRATION RAPIDE EU-WEST-3 - Environment: $Environment" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green

# Etape 1: Configuration automatique
Write-Host "`nETAPE 1: Configuration automatique..." -ForegroundColor Cyan

try {
    & ".\auto-config-eu-west-3.ps1" -Environment $Environment
    Write-Host "OK - Configuration automatique completee" -ForegroundColor Green
} catch {
    Write-Host "ERREUR Configuration automatique: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Continuons avec les valeurs par defaut..." -ForegroundColor Yellow
}

# Etape 2: Decouverte RDS
Write-Host "`nETAPE 2: Decouverte des instances RDS..." -ForegroundColor Cyan

try {
    & ".\find-rds-instance.ps1" -Region $REGION
    Write-Host "OK - Decouverte RDS completee" -ForegroundColor Green
} catch {
    Write-Host "ERREUR Decouverte RDS: $($_.Exception.Message)" -ForegroundColor Red
}

# Etape 3: Correction connectivite
Write-Host "`nETAPE 3: Correction de la connectivite..." -ForegroundColor Cyan

try {
    & ".\rds-connectivity-fix.ps1" -Environment $Environment
    Write-Host "OK - Connectivite corrigee" -ForegroundColor Green
} catch {
    Write-Host "ERREUR Connectivite: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Vous devrez peut-etre corriger manuellement les Security Groups" -ForegroundColor Yellow
}

# Etape 4: Migration base de donnees
Write-Host "`nETAPE 4: Migration de la base de donnees..." -ForegroundColor Cyan

$UserChoice = Read-Host "Voulez-vous continuer avec la migration de la base de donnees? (o/n)"
if ($UserChoice -eq "o" -or $UserChoice -eq "O" -or $UserChoice -eq "oui") {
    try {
        & ".\migrate-database-clean.ps1" -Environment $Environment
        Write-Host "OK - Migration de la base completee" -ForegroundColor Green
    } catch {
        Write-Host "ERREUR Migration: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Verifiez les logs ci-dessus pour plus de details" -ForegroundColor Yellow
    }
} else {
    Write-Host "Migration de la base ignoree par l'utilisateur" -ForegroundColor Yellow
}

Write-Host "`nMIGRATION TERMINEE" -ForegroundColor Green
Write-Host "===================" -ForegroundColor Green
Write-Host "Verifiez les resultats ci-dessus pour vous assurer que tout s'est bien passe." -ForegroundColor White