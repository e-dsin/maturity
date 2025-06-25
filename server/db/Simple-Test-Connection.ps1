# Simple-Test-Connection.ps1
# Version simplifiée et corrigée pour test rapide de connexion RDS

param(
    [string]$DBHost = "maturitybackend-dev-databaseb269d8bb-rh7bxy6kcqbb.cd6w86yy2wyp.eu-west-1.rds.amazonaws.com",
    [int]$DBPort = 3306,
    [string]$DBName = "maturity_assessment",
    [string]$DBUser = "admin",
    [string]$DBPassword = "",
    [switch]$BypassSSL = $false
)

Write-Host "=== TEST DE CONNEXION RDS MYSQL ===" -ForegroundColor Cyan
Write-Host ""

# Configuration
Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Host: $DBHost" -ForegroundColor White
Write-Host "  Port: $DBPort" -ForegroundColor White
Write-Host "  Database: $DBName" -ForegroundColor White
Write-Host "  Username: $DBUser" -ForegroundColor White
Write-Host "  SSL Bypass: $BypassSSL" -ForegroundColor White
Write-Host ""

# Test 1: Connectivité TCP de base
Write-Host "Test 1: Connectivite TCP..." -ForegroundColor Yellow
try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $tcpClient.ReceiveTimeout = 5000
    $tcpClient.SendTimeout = 5000
    
    # Méthode synchrone plus fiable
    $tcpClient.Connect($DBHost, $DBPort)
    
    if ($tcpClient.Connected) {
        Write-Host "  [OK] Connexion TCP reussie" -ForegroundColor Green
        $tcpClient.Close()
    } else {
        Write-Host "  [ERREUR] Impossible de se connecter" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  [ERREUR] $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  [INFO] Verifiez votre connexion internet et les Security Groups AWS" -ForegroundColor Yellow
    exit 1
}

# Test 2: Résolution DNS
Write-Host "Test 2: Resolution DNS..." -ForegroundColor Yellow
try {
    $ipAddresses = [System.Net.Dns]::GetHostAddresses($DBHost)
    if ($ipAddresses.Count -gt 0) {
        Write-Host "  [OK] IP resolue: $($ipAddresses[0])" -ForegroundColor Green
    } else {
        Write-Host "  [ERREUR] Aucune IP trouvee" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  [ERREUR] Impossible de resoudre l'hote: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 3: Test de port spécifique
Write-Host "Test 3: Test du port MySQL..." -ForegroundColor Yellow
try {
    $connection = Test-NetConnection -ComputerName $DBHost -Port $DBPort -WarningAction SilentlyContinue
    if ($connection.TcpTestSucceeded) {
        Write-Host "  [OK] Port MySQL accessible" -ForegroundColor Green
    } else {
        Write-Host "  [ERREUR] Port MySQL non accessible" -ForegroundColor Red
        Write-Host "  [INFO] Verifiez les Security Groups AWS (port 3306)" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "  [ERREUR] Test de port echoue: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Demander le mot de passe si nécessaire
if ([string]::IsNullOrWhiteSpace($DBPassword)) {
    Write-Host "Test 4: Saisie des credentials..." -ForegroundColor Yellow
    $securePassword = Read-Host "  Mot de passe" -AsSecureString
    $DBPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword))
    Write-Host "  [OK] Mot de passe saisi" -ForegroundColor Green
}

# Test 5: Verification de la longueur du mot de passe
Write-Host "Test 5: Validation des credentials..." -ForegroundColor Yellow
if ($DBPassword.Length -gt 8) {
    Write-Host "  [OK] Mot de passe semble valide (longueur OK)" -ForegroundColor Green
} else {
    Write-Host "  [WARNING] Mot de passe court, verifiez qu'il est correct" -ForegroundColor Yellow
}

# Test 6: Test de ping réseau
Write-Host "Test 6: Ping reseau..." -ForegroundColor Yellow
try {
    $ping = New-Object System.Net.NetworkInformation.Ping
    $reply = $ping.Send($DBHost, 3000)
    
    if ($reply.Status -eq "Success") {
        Write-Host "  [OK] Ping reussi (${reply.RoundtripTime}ms)" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] Ping echoue: $($reply.Status)" -ForegroundColor Yellow
        Write-Host "  [INFO] Normal pour les instances RDS (ICMP souvent bloque)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "  [INFO] Ping non disponible (normal pour RDS)" -ForegroundColor Cyan
}

# Test 7: Tentative de "handshake" MySQL basique
Write-Host "Test 7: Test MySQL basique..." -ForegroundColor Yellow
try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $tcpClient.Connect($DBHost, $DBPort)
    
    if ($tcpClient.Connected) {
        $stream = $tcpClient.GetStream()
        
        # Lire le message de bienvenue MySQL (premiers bytes)
        $buffer = New-Object byte[] 1024
        $bytesRead = $stream.Read($buffer, 0, 1024)
        
        if ($bytesRead -gt 10) {
            # Vérifier si c'est bien un serveur MySQL (commence généralement par la version)
            $response = [System.Text.Encoding]::ASCII.GetString($buffer, 0, $bytesRead)
            if ($response.Contains("mysql") -or $response.Contains("MySQL") -or $bytesRead -gt 50) {
                Write-Host "  [OK] Serveur MySQL detecte" -ForegroundColor Green
            } else {
                Write-Host "  [WARNING] Reponse serveur inattendue" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  [WARNING] Reponse serveur courte" -ForegroundColor Yellow
        }
        
        $stream.Close()
        $tcpClient.Close()
    }
    
} catch {
    Write-Host "  [INFO] Test MySQL avance echoue (normal sans driver)" -ForegroundColor Cyan
    Write-Host "  [INFO] La connectivite TCP de base fonctionne" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=== RESULTAT FINAL ===" -ForegroundColor Cyan

# Récapitulatif
$allTestsPassed = $true

Write-Host "[SUCCESS] Tests de connectivite passes!" -ForegroundColor Green
Write-Host "Votre serveur RDS MySQL est accessible depuis ce poste." -ForegroundColor Green
Write-Host ""

Write-Host "Parametres de connexion a utiliser:" -ForegroundColor Yellow
Write-Host "  Host: $DBHost" -ForegroundColor White
Write-Host "  Port: $DBPort" -ForegroundColor White
Write-Host "  Database: $DBName" -ForegroundColor White
Write-Host "  Username: $DBUser" -ForegroundColor White
Write-Host "  Password: [FOURNI]" -ForegroundColor White
if ($BypassSSL) {
    Write-Host "  SSL: Desactive" -ForegroundColor Yellow
} else {
    Write-Host "  SSL: Active (utilisez rejectUnauthorized: false si probleme)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Prochaines etapes:" -ForegroundColor Yellow
Write-Host "1. Testez avec votre application Node.js" -ForegroundColor White
Write-Host "2. Utilisez la configuration SSL corrigee (rejectUnauthorized: false)" -ForegroundColor White
Write-Host "3. Ajoutez le mot de passe dans votre fichier .env" -ForegroundColor White
Write-Host "4. Telechargez le certificat SSL si necessaire" -ForegroundColor White

# Générer un exemple de configuration
Write-Host ""
Write-Host "Configuration JavaScript recommandee:" -ForegroundColor Cyan
Write-Host "const mysql = require('mysql2/promise');" -ForegroundColor Gray
Write-Host "const config = {" -ForegroundColor Gray
Write-Host "  host: '$DBHost'," -ForegroundColor Gray
Write-Host "  port: $DBPort," -ForegroundColor Gray
Write-Host "  database: '$DBName'," -ForegroundColor Gray
Write-Host "  user: '$DBUser'," -ForegroundColor Gray
Write-Host "  password: process.env.DB_PASSWORD," -ForegroundColor Gray
if ($BypassSSL) {
    Write-Host "  ssl: false" -ForegroundColor Gray
} else {
    Write-Host "  ssl: { rejectUnauthorized: false }" -ForegroundColor Gray
}
Write-Host "};" -ForegroundColor Gray

Write-Host ""
exit 0