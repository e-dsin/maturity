# migrate-eu-west-1.ps1 - Migration vers l'infrastructure existante
param([string]$Environment = "dev")

# Configuration pour eu-west-1
$Config = @{
    DATABASE_ENDPOINT = "maturitybackend-dev-databaseb269d8bb-rh7bxy6kcqbb.cd6w86yy2wyp.eu-west-1.rds.amazonaws.com"
    DATABASE_SECRET_ARN = "arn:aws:secretsmanager:eu-west-1:637423285771:secret:maturity-db-dev-1QEB1e"
    REGION = "eu-west-1" 
    DATABASE_NAME = "maturity_assessment"
}

Write-Host "MIGRATION VERS EU-WEST-1 - Environment: $Environment" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Test de connectivite
try {
    Write-Host "Test de connectivite vers $($Config.DATABASE_ENDPOINT)..." -ForegroundColor Cyan
    $TCPClient = New-Object System.Net.Sockets.TcpClient
    $Connect = $TCPClient.BeginConnect("$EU_WEST_1_ENDPOINT", 3306, $null, $null)
    $Wait = $Connect.AsyncWaitHandle.WaitOne(10000, $false)
    
    if ($Wait) {
        $TCPClient.EndConnect($Connect)
        $TCPClient.Close()
        Write-Host "Connectivite OK!" -ForegroundColor Green
        
        Write-Host "
ETAPES SUIVANTES:" -ForegroundColor Yellow
        Write-Host "1. Mettez a jour vos scripts avec la configuration ci-dessus" -ForegroundColor White
        Write-Host "2. Telechargez le certificat SSL eu-west-1:" -ForegroundColor White
        Write-Host "   Invoke-WebRequest -Uri 'https://truststore.pki.rds.amazonaws.com/eu-west-1/eu-west-1-bundle.pem' -OutFile '$env:USERPROFILE\maturity-assessment-dasboard\server\eu-west-1-bundle.pem'" -ForegroundColor Gray
        Write-Host "3. Executez: .\migrate-database-clean.ps1" -ForegroundColor White
        
    } else {
        $TCPClient.Close()
        Write-Host "Probleme de connectivite. Verification des Security Groups necessaire." -ForegroundColor Red
    }
} catch {
    Write-Host "Erreur de connectivite: $($_.Exception.Message)" -ForegroundColor Red
}
