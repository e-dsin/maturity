# setup-eu-west-3-complete.ps1 - Configuration complete pour la migration vers eu-west-3

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "dev",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipSSLDownload = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipConnectivityFix = $false
)

Write-Host "MIGRATION COMPLETE VERS EU-WEST-3" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor White
Write-Host "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray

# Variables globales
$REGION = "eu-west-3"
$SCRIPTS_DIR = Get-Location

# Fonction pour executer un script et gerer les erreurs
function Invoke-ScriptStep {
    param(
        [string]$StepName,
        [string]$ScriptPath,
        [string[]]$Arguments = @(),
        [bool]$ContinueOnError = $false
    )
    
    Write-Host "`n" + "="*50 -ForegroundColor Cyan
    Write-Host "ETAPE: $StepName" -ForegroundColor Cyan
    Write-Host "="*50 -ForegroundColor Cyan
    
    try {
        if (Test-Path $ScriptPath) {
            Write-Host "Execution de: $ScriptPath" -ForegroundColor Yellow
            
            if ($Arguments.Count -gt 0) {
                & $ScriptPath @Arguments
            } else {
                & $ScriptPath
            }
            
            if ($LASTEXITCODE -eq 0 -or $null -eq $LASTEXITCODE) {
                Write-Host "✅ $StepName - SUCCES" -ForegroundColor Green
                return $true
            } else {
                Write-Host "❌ $StepName - ECHEC (Code: $LASTEXITCODE)" -ForegroundColor Red
                if (-not $ContinueOnError) {
                    throw "Echec de l'etape: $StepName"
                }
                return $false
            }
        } else {
            Write-Host "❌ Script non trouve: $ScriptPath" -ForegroundColor Red
            if (-not $ContinueOnError) {
                throw "Script manquant: $ScriptPath"
            }
            return $false
        }
        
    } catch {
        Write-Host "❌ Erreur lors de $StepName : $($_.Exception.Message)" -ForegroundColor Red
        if (-not $ContinueOnError) {
            throw
        }
        return $false
    }
}

# Fonction pour verifier les prerequisites
function Test-Prerequisites {
    Write-Host "`nVerification des prerequisites..." -ForegroundColor Cyan
    
    $AllOK = $true
    
    # Verifier AWS CLI
    try {
        $AWSVersion = aws --version 2>$null
        Write-Host "✅ AWS CLI: $AWSVersion" -ForegroundColor Green
        
        $Identity = aws sts get-caller-identity | ConvertFrom-Json
        Write-Host "✅ AWS Credentials: Compte $($Identity.Account)" -ForegroundColor Green
    } catch {
        Write-Host "❌ AWS CLI non configure ou non installe" -ForegroundColor Red
        $AllOK = $false
    }
    
    # Verifier MySQL Client
    try {
        $MySQLVersion = & "C:\Program Files\MariaDB 11.7\bin\mysql.exe" --version 2>$null
        Write-Host "✅ MySQL Client: $MySQLVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ MySQL Client non trouve" -ForegroundColor Red
        Write-Host "   Installez MariaDB ou MySQL Client" -ForegroundColor Yellow
        $AllOK = $false
    }
    
    # Verifier PowerShell version
    $PSVersion = $PSVersionTable.PSVersion
    if ($PSVersion.Major -ge 5) {
        Write-Host "✅ PowerShell: $($PSVersion.ToString())" -ForegroundColor Green
    } else {
        Write-Host "❌ PowerShell version trop ancienne: $($PSVersion.ToString())" -ForegroundColor Red
        $AllOK = $false
    }
    
    return $AllOK
}

# Fonction pour afficher le resume final
function Show-FinalSummary {
    param([hashtable]$Results)
    
    Write-Host "`n" + "="*60 -ForegroundColor Green
    Write-Host "RESUME FINAL DE LA MIGRATION EU-WEST-3" -ForegroundColor Green
    Write-Host "="*60 -ForegroundColor Green
    
    $SuccessCount = ($Results.Values | Where-Object { $_ -eq $true }).Count
    $TotalCount = $Results.Count
    
    Write-Host "`nEtapes completees: $SuccessCount/$TotalCount" -ForegroundColor White
    
    foreach ($Step in $Results.Keys) {
        $Status = if ($Results[$Step]) { "✅ SUCCES" } else { "❌ ECHEC" }
        $Color = if ($Results[$Step]) { "Green" } else { "Red" }
        Write-Host "  $Step : $Status" -ForegroundColor $Color
    }
    
    if ($SuccessCount -eq $TotalCount) {
        Write-Host "`n🎉 MIGRATION COMPLETE REUSSIE!" -ForegroundColor Green
        Write-Host "Votre base de donnees est maintenant configuree pour eu-west-3" -ForegroundColor White
    } else {
        Write-Host "`n⚠️  MIGRATION PARTIELLE" -ForegroundColor Yellow
        Write-Host "Certaines etapes ont echoue. Verifiez les erreurs ci-dessus." -ForegroundColor White
    }
    
    Write-Host "`nPROCHAINES ETAPES:" -ForegroundColor Cyan
    Write-Host "1. Verifiez que votre application utilise la region eu-west-3" -ForegroundColor White
    Write-Host "2. Mettez a jour vos variables d'environnement" -ForegroundColor White
    Write-Host "3. Testez la connexion a la base de donnees" -ForegroundColor White
    Write-Host "4. Deployez votre application backend" -ForegroundColor White
}

# SCRIPT PRINCIPAL
try {
    Write-Host "Demarrage de la migration vers la region eu-west-3..." -ForegroundColor Cyan
    Write-Host "Repertoire de travail: $SCRIPTS_DIR" -ForegroundColor Gray
    
    # Verification des prerequisites
    $PrereqOK = Test-Prerequisites
    if (-not $PrereqOK) {
        Write-Host "`n❌ Prerequisites non satisfaits. Arret du script." -ForegroundColor Red
        exit 1
    }
    
    # Initialiser le suivi des resultats
    $Results = @{}
    
    # ETAPE 1: Telechargement du certificat SSL
    if (-not $SkipSSLDownload) {
        $SSLScript = Join-Path $SCRIPTS_DIR "download-ssl-cert-eu-west-3.ps1"
        $Results["Certificat SSL"] = Invoke-ScriptStep -StepName "Telechargement Certificat SSL" -ScriptPath $SSLScript -ContinueOnError $true
    } else {
        Write-Host "`nETAPE: Telechargement Certificat SSL - IGNOREE" -ForegroundColor Yellow
        $Results["Certificat SSL"] = $true
    }
    
    # ETAPE 2: Configuration automatique des ressources
    $ConfigScript = Join-Path $SCRIPTS_DIR "auto-config-eu-west-3.ps1"
    $Results["Configuration Auto"] = Invoke-ScriptStep -StepName "Configuration Automatique" -ScriptPath $ConfigScript -Arguments @("-Environment", $Environment) -ContinueOnError $false
    
    # ETAPE 3: Decouverte des instances RDS (pour information)
    $DiscoveryScript = Join-Path $SCRIPTS_DIR "find-rds-instance.ps1"
    $Results["Decouverte RDS"] = Invoke-ScriptStep -StepName "Decouverte RDS" -ScriptPath $DiscoveryScript -Arguments @("-Region", $REGION) -ContinueOnError $true
    
    # ETAPE 4: Correction de la connectivite (si pas ignoree)
    if (-not $SkipConnectivityFix) {
        $ConnectivityScript = Join-Path $SCRIPTS_DIR "rds-connectivity-fix.ps1"
        $Results["Connectivite"] = Invoke-ScriptStep -StepName "Correction Connectivite" -ScriptPath $ConnectivityScript -Arguments @("-Environment", $Environment) -ContinueOnError $true
    } else {
        Write-Host "`nETAPE: Correction Connectivite - IGNOREE" -ForegroundColor Yellow
        $Results["Connectivite"] = $true
    }
    
    # ETAPE 5: Migration de la base de donnees
    $MigrationScript = Join-Path $SCRIPTS_DIR "migrate-database-clean.ps1"
    $Results["Migration DB"] = Invoke-ScriptStep -StepName "Migration Base de Donnees" -ScriptPath $MigrationScript -Arguments @("-Environment", $Environment) -ContinueOnError $false
    
    # Afficher le resume final
    Show-FinalSummary -Results $Results
    
} catch {
    Write-Host "`n❌ ERREUR CRITIQUE: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nLa migration a ete interrompue." -ForegroundColor Yellow
    Write-Host "Verifiez les erreurs ci-dessus et relancez le script." -ForegroundColor White
    exit 1
}