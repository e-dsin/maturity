# fix-database-access.ps1 - Script simplifie pour corriger l'acces base de donnees

# Configuration
$DATABASE_SECRET_ARN = "arn:aws:secretsmanager:eu-west-1:637423285771:secret:maturity-db-dev-1QEB1e"
$DATABASE_ENDPOINT = "maturitybackend-dev-databaseb269d8bb-rh7bxy6kcqbb.cd6w86yy2wyp.eu-west-1.rds.amazonaws.com"
$DATABASE_NAME = "maturity_assessment"
$REGION = "eu-west-1"
$STACK_NAME = "MaturityBackend-dev"

Write-Host "=== CORRECTION ACCES BASE DE DONNEES ===" -ForegroundColor Green

# Fonction pour obtenir l'IP publique
function Get-PublicIP {
    try {
        $IP = Invoke-RestMethod -Uri "https://ipinfo.io/ip" -TimeoutSec 10
        return $IP.Trim()
    } catch {
        Write-Host "Erreur recuperation IP publique" -ForegroundColor Red
        return $null
    }
}

# Fonction pour trouver le Security Group de la base
function Get-DatabaseSecurityGroup {
    Write-Host "Recherche du Security Group de la base..." -ForegroundColor Cyan
    
    # Methode 1: Par tag CloudFormation
    $SG = aws ec2 describe-security-groups `
        --filters "Name=tag:aws:cloudformation:stack-name,Values=$STACK_NAME" `
        --region $REGION `
        --query 'SecurityGroups[?contains(GroupName, `Database`)].GroupId' `
        --output text
    
    if ($SG -and $SG -ne "None") {
        return $SG
    }
    
    # Methode 2: Par nom contenant "Database"
    $SG = aws ec2 describe-security-groups `
        --filters "Name=group-name,Values=*Database*" `
        --region $REGION `
        --query 'SecurityGroups[0].GroupId' `
        --output text
    
    if ($SG -and $SG -ne "None") {
        return $SG
    }
    
    # Methode 3: Lister tous les SG du stack
    Write-Host "Listing tous les Security Groups du stack:" -ForegroundColor Yellow
    $AllSGs = aws ec2 describe-security-groups `
        --filters "Name=tag:aws:cloudformation:stack-name,Values=$STACK_NAME" `
        --region $REGION `
        --query 'SecurityGroups[].[GroupId,GroupName,Description]' `
        --output table
    
    Write-Host $AllSGs
    
    return $null
}

# Fonction pour ajouter l'acces temporaire
function Add-TemporaryAccess {
    param($SecurityGroupId, $PublicIP)
    
    Write-Host "Ajout de l'acces temporaire..." -ForegroundColor Cyan
    Write-Host "Security Group: $SecurityGroupId" -ForegroundColor White
    Write-Host "IP publique: $PublicIP" -ForegroundColor White
    
    $Result = aws ec2 authorize-security-group-ingress `
        --group-id $SecurityGroupId `
        --protocol tcp `
        --port 3306 `
        --cidr "$PublicIP/32" `
        --region $REGION 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Acces temporaire ajoute avec succes!" -ForegroundColor Green
        return $true
    } else {
        Write-Host "Erreur lors de l'ajout:" -ForegroundColor Red
        Write-Host $Result -ForegroundColor Red
        
        # Verifier si la regle existe deja
        if ($Result -match "already exists") {
            Write-Host "La regle existe deja - c'est bon!" -ForegroundColor Yellow
            return $true
        }
        
        return $false
    }
}

# Fonction pour supprimer l'acces temporaire
function Remove-TemporaryAccess {
    param($SecurityGroupId, $PublicIP)
    
    Write-Host "Suppression de l'acces temporaire..." -ForegroundColor Cyan
    
    $Result = aws ec2 revoke-security-group-ingress `
        --group-id $SecurityGroupId `
        --protocol tcp `
        --port 3306 `
        --cidr "$PublicIP/32" `
        --region $REGION 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Acces temporaire supprime!" -ForegroundColor Green
    } else {
        Write-Host "Erreur lors de la suppression:" -ForegroundColor Yellow
        Write-Host $Result -ForegroundColor Yellow
    }
}

# Fonction pour faire la migration
function Do-DatabaseMigration {
    Write-Host "=== MIGRATION DE LA BASE DE DONNEES ===" -ForegroundColor Green
    
    # Recuperer les credentials
    Write-Host "Recuperation des credentials..." -ForegroundColor Cyan
    $SecretValue = aws secretsmanager get-secret-value `
        --secret-id $DATABASE_SECRET_ARN `
        --region $REGION `
        --query 'SecretString' `
        --output text
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Erreur recuperation credentials" -ForegroundColor Red
        return $false
    }
    
    $Credentials = $SecretValue | ConvertFrom-Json
    $DB_USER = $Credentials.username
    $DB_PASSWORD = $Credentials.password
    
    Write-Host "Utilisateur: $DB_USER" -ForegroundColor Green
    
    # Test de connexion
    Write-Host "Test de connexion..." -ForegroundColor Cyan
    $TestResult = mysql -h $DATABASE_ENDPOINT -P 3306 -u $DB_USER -p$DB_PASSWORD -e "SELECT 1 AS test" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Connexion reussie!" -ForegroundColor Green
    } else {
        Write-Host "Echec de connexion:" -ForegroundColor Red
        Write-Host $TestResult -ForegroundColor Red
        return $false
    }
    
    # Creer la base
    Write-Host "Creation de la base de donnees..." -ForegroundColor Cyan
    $CreateResult = mysql -h $DATABASE_ENDPOINT -P 3306 -u $DB_USER -p$DB_PASSWORD -e "CREATE DATABASE IF NOT EXISTS $DATABASE_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Base de donnees creee/verifiee" -ForegroundColor Green
    } else {
        Write-Host "Erreur creation base:" -ForegroundColor Red
        Write-Host $CreateResult -ForegroundColor Red
    }
    
    # Verifier le fichier schema
    if (-not (Test-Path "schema-fixed.sql")) {
        Write-Host "Fichier schema-fixed.sql non trouve" -ForegroundColor Red
        Write-Host "Repertoire actuel: $(Get-Location)" -ForegroundColor Yellow
        return $false
    }
    
    # Appliquer le schema
    Write-Host "Application du schema..." -ForegroundColor Cyan
    $SchemaResult = mysql -h $DATABASE_ENDPOINT -P 3306 -u $DB_USER -p$DB_PASSWORD $DATABASE_NAME < "schema-fixed.sql" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Schema applique avec succes!" -ForegroundColor Green
    } else {
        Write-Host "Probleme avec le schema (warnings possibles):" -ForegroundColor Yellow
        Write-Host $SchemaResult -ForegroundColor Yellow
    }
    
    # Verifier les tables
    Write-Host "Verification des tables..." -ForegroundColor Cyan
    $Tables = mysql -h $DATABASE_ENDPOINT -P 3306 -u $DB_USER -p$DB_PASSWORD $DATABASE_NAME -e "SHOW TABLES" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Tables creees:" -ForegroundColor Green
        Write-Host $Tables -ForegroundColor White
        return $true
    } else {
        Write-Host "Erreur verification tables:" -ForegroundColor Red
        Write-Host $Tables -ForegroundColor Red
        return $false
    }
}

# ===================================================================
# SCRIPT PRINCIPAL
# ===================================================================

Write-Host "1. Recuperation de votre IP publique..." -ForegroundColor Cyan
$MyPublicIP = Get-PublicIP

if (-not $MyPublicIP) {
    Write-Host "Impossible de recuperer l'IP publique" -ForegroundColor Red
    exit 1
}

Write-Host "Votre IP publique: $MyPublicIP" -ForegroundColor Green

Write-Host "`n2. Recherche du Security Group de la base..." -ForegroundColor Cyan
$DatabaseSG = Get-DatabaseSecurityGroup

if (-not $DatabaseSG) {
    Write-Host "Security Group de la base non trouve automatiquement" -ForegroundColor Red
    Write-Host "Veuillez le trouver manuellement:" -ForegroundColor Yellow
    Write-Host "aws ec2 describe-security-groups --region $REGION --query 'SecurityGroups[].[GroupId,GroupName,Description]' --output table" -ForegroundColor Gray
    exit 1
}

Write-Host "Security Group trouve: $DatabaseSG" -ForegroundColor Green

Write-Host "`n3. Ajout de l'acces temporaire..." -ForegroundColor Cyan
$AccessAdded = Add-TemporaryAccess -SecurityGroupId $DatabaseSG -PublicIP $MyPublicIP

if (-not $AccessAdded) {
    Write-Host "Impossible d'ajouter l'acces temporaire" -ForegroundColor Red
    exit 1
}

Write-Host "`n4. Migration de la base de donnees..." -ForegroundColor Cyan
$MigrationSuccess = Do-DatabaseMigration

Write-Host "`n5. Suppression de l'acces temporaire..." -ForegroundColor Cyan
Remove-TemporaryAccess -SecurityGroupId $DatabaseSG -PublicIP $MyPublicIP

if ($MigrationSuccess) {
    Write-Host "`n=== MIGRATION TERMINEE AVEC SUCCES ===" -ForegroundColor Green
    Write-Host "La base de donnees est prete pour l'application!" -ForegroundColor Green
    Write-Host "`nProchaine etape: Deployer l'application backend" -ForegroundColor Yellow
    Write-Host "Commande: .\deploy-backend.ps1" -ForegroundColor Cyan
} else {
    Write-Host "`n=== PROBLEMES DURANT LA MIGRATION ===" -ForegroundColor Red
    Write-Host "Verifiez les erreurs ci-dessus" -ForegroundColor Yellow
}

Write-Host "`nINFORMATIONS DE CONNEXION:" -ForegroundColor Cyan
Write-Host "Endpoint: $DATABASE_ENDPOINT" -ForegroundColor White
Write-Host "Base: $DATABASE_NAME" -ForegroundColor White
Write-Host "Credentials: Stockes dans AWS Secrets Manager" -ForegroundColor White