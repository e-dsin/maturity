# download-ssl-cert-eu-west-3.ps1 - Telechargement du certificat SSL pour eu-west-3

Write-Host "TELECHARGEMENT CERTIFICAT SSL EU-WEST-3" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green

# Configuration
$SSLUrl = "https://truststore.pki.rds.amazonaws.com/eu-west-3/eu-west-3-bundle.pem"
$TargetDir = "$env:USERPROFILE\maturity-assessment-dasboard\server"
$TargetFile = "$TargetDir\eu-west-3-bundle.pem"

Write-Host "`nTelechargement du certificat SSL pour la region eu-west-3..." -ForegroundColor Cyan
Write-Host "Source: $SSLUrl" -ForegroundColor Gray
Write-Host "Destination: $TargetFile" -ForegroundColor Gray

try {
    # Creer le repertoire si necessaire
    if (-not (Test-Path $TargetDir)) {
        Write-Host "`nCreation du repertoire: $TargetDir" -ForegroundColor Yellow
        New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
    }
    
    # Telecharger le certificat
    Write-Host "`nTelechargement en cours..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $SSLUrl -OutFile $TargetFile -UseBasicParsing
    
    # Verifier que le fichier a ete telecharge
    if (Test-Path $TargetFile) {
        $FileSize = (Get-Item $TargetFile).Length
        Write-Host "Certificat telecharge avec succes!" -ForegroundColor Green
        Write-Host "Taille du fichier: $FileSize bytes" -ForegroundColor White
        Write-Host "Emplacement: $TargetFile" -ForegroundColor White
        
        # Verifier le contenu du fichier
        $Content = Get-Content $TargetFile -Raw
        if ($Content -like "*BEGIN CERTIFICATE*") {
            Write-Host "Format du certificat valide (PEM)" -ForegroundColor Green
        } else {
            Write-Host "ATTENTION: Le fichier ne semble pas etre un certificat PEM valide" -ForegroundColor Yellow
        }
        
    } else {
        Write-Host "ERREUR: Le fichier n'a pas ete cree" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "`nCERTIFICAT SSL PRET POUR EU-WEST-3!" -ForegroundColor Green
    Write-Host "Vous pouvez maintenant executer vos scripts de migration." -ForegroundColor White
    
} catch {
    Write-Host "`nERREUR lors du telechargement: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nSolutions alternatives:" -ForegroundColor Yellow
    Write-Host "1. Telechargez manuellement depuis: $SSLUrl" -ForegroundColor White
    Write-Host "2. Placez le fichier dans: $TargetFile" -ForegroundColor White
    Write-Host "3. Ou utilisez curl:" -ForegroundColor White
    Write-Host "   curl -o `"$TargetFile`" $SSLUrl" -ForegroundColor Gray
    exit 1
}