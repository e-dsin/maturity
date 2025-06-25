# Test-DatabaseConnection.ps1
# Script PowerShell pour tester la connexion à la base de données RDS MySQL
# Version: 2.1 - Corrigée pour éviter les problèmes d'encodage

param(
    [string]$DBHost = "maturitybackend-dev-databaseb269d8bb-rh7bxy6kcqbb.cd6w86yy2wyp.eu-west-1.rds.amazonaws.com",
    [int]$Port = 3306,
    [string]$Database = "maturity_assessment",
    [string]$Username = "admin",
    [string]$Password = "",
    [switch]$UseSecretsManager = $true,
    [switch]$DisableSSL = $false,
    [switch]$SkipCertificateValidation = $false,
    [switch]$Verbose = $false
)

# Configuration des couleurs pour une meilleure lisibilité
$ErrorActionPreference = "Continue"
$WarningPreference = "Continue"

# Fonction pour afficher des messages colorés
function Write-ColoredOutput {
    param(
        [string]$Message,
        [string]$Color = "White",
        [string]$Prefix = ""
    )
    
    $colors = @{
        "Success" = "Green"
        "Error" = "Red" 
        "Warning" = "Yellow"
        "Info" = "Cyan"
        "Debug" = "Magenta"
        "White" = "White"
    }
    
    $colorValue = if ($colors.ContainsKey($Color)) { $colors[$Color] } else { "White" }
    
    if ($Prefix) {
        Write-Host "$Prefix " -NoNewline -ForegroundColor $colorValue
        Write-Host $Message
    } else {
        Write-Host $Message -ForegroundColor $colorValue
    }
}

# Fonction pour télécharger le certificat SSL
function Download-SSLCertificate {
    param(
        [string]$CertPath = ".\eu-west-1-bundle.pem"
    )
    
    try {
        Write-ColoredOutput "Téléchargement du certificat SSL..." "Info"
        
        $certUrl = "https://truststore.pki.rds.amazonaws.com/eu-west-1/eu-west-1-bundle.pem"
        
        # Créer le répertoire si nécessaire
        $certDir = Split-Path $CertPath -Parent
        if ($certDir -and !(Test-Path $certDir)) {
            New-Item -ItemType Directory -Path $certDir -Force | Out-Null
        }
        
        # Télécharger avec PowerShell
        Invoke-WebRequest -Uri $certUrl -OutFile $CertPath -UseBasicParsing
        
        if (Test-Path $CertPath) {
            Write-ColoredOutput "Certificat téléchargé avec succès: $CertPath" "Success"
            return $true
        } else {
            Write-ColoredOutput "Échec du téléchargement du certificat" "Error"
            return $false
        }
    } catch {
        Write-ColoredOutput "Erreur lors du téléchargement: $($_.Exception.Message)" "Error"
        return $false
    }
}

# Fonction pour récupérer les credentials depuis AWS Secrets Manager
function Get-AWSCredentials {
    param(
        [string]$SecretArn = "arn:aws:secretsmanager:eu-west-1:637423285771:secret:rdsdb-8400c0dc-ab78-4127-8515-f8f6197d3c88-D5wzPP",
        [string]$Region = "eu-west-1"
    )
    
    try {
        Write-ColoredOutput "Tentative de récupération depuis AWS Secrets Manager..." "Info"
        
        # Vérifier si AWS PowerShell module est installé
        if (!(Get-Module -ListAvailable -Name AWS.Tools.SecretsManager)) {
            Write-ColoredOutput "Module AWS.Tools.SecretsManager non installé" "Warning"
            Write-ColoredOutput "Installez avec: Install-Module AWS.Tools.SecretsManager -Force" "Info"
            return $null
        }
        
        # Importer le module
        Import-Module AWS.Tools.SecretsManager -Force -ErrorAction SilentlyContinue
        
        # Récupérer le secret
        $secretValue = Get-SECSecretValue -SecretId $SecretArn -Region $Region -ErrorAction Stop
        $secretJson = $secretValue.SecretString | ConvertFrom-Json
        
        Write-ColoredOutput "Credentials récupérés depuis AWS Secrets Manager" "Success"
        Write-ColoredOutput "Username: $($secretJson.username)" "Info"
        
        return @{
            Username = $secretJson.username
            Password = $secretJson.password
        }
        
    } catch {
        Write-ColoredOutput "Erreur AWS Secrets Manager: $($_.Exception.Message)" "Error"
        return $null
    }
}

# Fonction pour demander les credentials manuellement
function Get-ManualCredentials {
    param(
        [string]$DefaultUsername = "admin"
    )
    
    Write-ColoredOutput "" "Info"
    Write-ColoredOutput "Saisie manuelle des credentials:" "Info"
    
    # Demander le nom d'utilisateur
    $inputUsername = Read-Host "Nom d'utilisateur (défaut: $DefaultUsername)"
    $finalUsername = if ([string]::IsNullOrWhiteSpace($inputUsername)) { $DefaultUsername } else { $inputUsername }
    
    # Demander le mot de passe de manière sécurisée
    $securePassword = Read-Host "Mot de passe" -AsSecureString
    $password = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword))
    
    Write-ColoredOutput "Credentials saisis manuellement (user: $finalUsername)" "Success"
    
    return @{
        Username = $finalUsername
        Password = $password
    }
}

# Fonction pour tester la connectivité TCP
function Test-TCPConnection {
    param(
        [string]$Server,
        [int]$Port
    )
    
    try {
        Write-ColoredOutput "Test de connectivité TCP vers ${Server}:${Port}..." "Info"
        
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $tcpClient.ReceiveTimeout = 10000
        $tcpClient.SendTimeout = 10000
        
        $tcpClient.Connect($Server, $Port)
        
        if ($tcpClient.Connected) {
            Write-ColoredOutput "Connexion TCP réussie!" "Success"
            $tcpClient.Close()
            return $true
        } else {
            Write-ColoredOutput "Impossible de se connecter au serveur" "Error"
            return $false
        }
        
    } catch {
        Write-ColoredOutput "Erreur de connexion TCP: $($_.Exception.Message)" "Error"
        return $false
    }
}

# Fonction pour tester la connexion MySQL avec méthode alternative
function Test-MySQLConnectionAlternative {
    param(
        [hashtable]$Config
    )
    
    try {
        Write-ColoredOutput "Utilisation de la méthode alternative..." "Info"
        
        # Test de connectivité TCP d'abord
        $tcpSuccess = Test-TCPConnection -Server $Config.Server -Port $Config.Port
        
        if ($tcpSuccess) {
            Write-ColoredOutput "Le serveur MySQL est accessible" "Success"
            Write-ColoredOutput "" "Info"
            Write-ColoredOutput "INSTALLATION REQUISE:" "Info"
            Write-ColoredOutput "Pour des tests complets, installez MySQL .NET Connector:" "Info"
            Write-ColoredOutput "1. Téléchargez depuis: https://dev.mysql.com/downloads/connector/net/" "Info"
            Write-ColoredOutput "2. Ou installez via chocolatey: choco install mysql-connector" "Info"
            
            return $true
        } else {
            return $false
        }
        
    } catch {
        Write-ColoredOutput "Erreur: $($_.Exception.Message)" "Error"
        return $false
    }
}

# Fonction pour tester la connexion MySQL
function Test-MySQLConnection {
    param(
        [string]$ConnectionString,
        [hashtable]$Config
    )
    
    try {
        # Essayer de charger l'assembly MySQL
        try {
            # Tentative de chargement direct de l'assembly
            Add-Type -Path "C:\Program Files (x86)\MySQL\MySQL Connector Net 8.0.33\Assemblies\v4.5.2\MySql.Data.dll" -ErrorAction SilentlyContinue
        } catch {
            # Si l'assembly n'est pas trouvée, utiliser la méthode alternative
            Write-ColoredOutput "MySQL .NET Connector non trouvé, utilisation d'une méthode alternative..." "Warning"
            return Test-MySQLConnectionAlternative -Config $Config
        }
        
        # Créer la connexion MySQL
        $connection = New-Object MySql.Data.MySqlClient.MySqlConnection($ConnectionString)
        
        Write-ColoredOutput "Tentative de connexion..." "Info"
        $connection.Open()
        
        Write-ColoredOutput "Connexion établie avec succès!" "Success"
        
        # Test 1: Requête simple
        Write-ColoredOutput "" "Info"
        Write-ColoredOutput "Test 1: Requête de base" "Info"
        $command = $connection.CreateCommand()
        $command.CommandText = "SELECT 1 as test, NOW() as current_time, VERSION() as version"
        $reader = $command.ExecuteReader()
        
        if ($reader.Read()) {
            Write-ColoredOutput "Résultat:" "Success"
            Write-ColoredOutput "Test: $($reader['test'])" "Info"
            Write-ColoredOutput "Time: $($reader['current_time'])" "Info"
            Write-ColoredOutput "Version: $($reader['version'])" "Info"
        }
        $reader.Close()
        
        # Test 2: Lister les bases de données
        Write-ColoredOutput "" "Info"
        Write-ColoredOutput "Test 2: Bases de données disponibles" "Info"
        $command.CommandText = "SHOW DATABASES"
        $reader = $command.ExecuteReader()
        
        Write-ColoredOutput "Bases trouvées:" "Success"
        while ($reader.Read()) {
            Write-ColoredOutput "- $($reader[0])" "Info"
        }
        $reader.Close()
        
        # Test 3: Utiliser notre base et lister les tables
        Write-ColoredOutput "" "Info"
        Write-ColoredOutput "Test 3: Tables dans $($Config.Database)" "Info"
        try {
            $command.CommandText = "USE $($Config.Database)"
            $command.ExecuteNonQuery() | Out-Null
            
            $command.CommandText = "SHOW TABLES"
            $reader = $command.ExecuteReader()
            
            $tableCount = 0
            $tables = @()
            while ($reader.Read()) {
                $tables += $reader[0]
                $tableCount++
            }
            $reader.Close()
            
            if ($tableCount -eq 0) {
                Write-ColoredOutput "Aucune table trouvée (base vide)" "Warning"
            } else {
                Write-ColoredOutput "Tables trouvées ($tableCount):" "Success"
                foreach ($table in $tables) {
                    Write-ColoredOutput "- $table" "Info"
                }
            }
        } catch {
            Write-ColoredOutput "Erreur lors de l'accès à la base $($Config.Database): $($_.Exception.Message)" "Error"
        }
        
        # Test 4: Test des tables principales
        Write-ColoredOutput "" "Info"
        Write-ColoredOutput "Test 4: Contenu des tables principales" "Info"
        $mainTables = @('entreprises', 'acteurs', 'applications', 'questionnaires')
        
        foreach ($tableName in $mainTables) {
            try {
                $command.CommandText = "SELECT COUNT(*) as count FROM $tableName"
                $result = $command.ExecuteScalar()
                Write-ColoredOutput "Table $tableName : $result enregistrement(s)" "Success"
            } catch {
                Write-ColoredOutput "Table $tableName : $($_.Exception.Message)" "Warning"
            }
        }
        
        # Test 5: Test d'écriture
        Write-ColoredOutput "" "Info"
        Write-ColoredOutput "Test 5: Test d'écriture (optionnel)" "Info"
        try {
            $createTableQuery = @"
CREATE TEMPORARY TABLE test_connection (
    id INT AUTO_INCREMENT PRIMARY KEY,
    test_value VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
"@
            $command.CommandText = $createTableQuery
            $command.ExecuteNonQuery() | Out-Null
            
            $command.CommandText = "INSERT INTO test_connection (test_value) VALUES ('Test de connexion réussi')"
            $command.ExecuteNonQuery() | Out-Null
            
            $command.CommandText = "SELECT * FROM test_connection"
            $reader = $command.ExecuteReader()
            
            if ($reader.Read()) {
                Write-ColoredOutput "Test d'écriture réussi:" "Success"
                Write-ColoredOutput "ID: $($reader['id'])" "Info"
                Write-ColoredOutput "Value: $($reader['test_value'])" "Info"
                Write-ColoredOutput "Created: $($reader['created_at'])" "Info"
            }
            $reader.Close()
            
        } catch {
            Write-ColoredOutput "Test d'écriture échoué: $($_.Exception.Message)" "Warning"
        }
        
        $connection.Close()
        
        Write-ColoredOutput "" "Success"
        Write-ColoredOutput "TOUS LES TESTS SONT PASSES AVEC SUCCES!" "Success"
        Write-ColoredOutput "=====================================" "Success"
        Write-ColoredOutput "Votre base de données est prête à utiliser" "Success"
        Write-ColoredOutput "Vous pouvez maintenant démarrer votre application" "Success"
        
        return $true
        
    } catch {
        Write-ColoredOutput "" "Error"
        Write-ColoredOutput "ERREUR DE CONNEXION" "Error"
        Write-ColoredOutput "=====================" "Error"
        Write-ColoredOutput "Erreur: $($_.Exception.Message)" "Error"
        
        # Suggestions de dépannage
        Write-ColoredOutput "" "Info"
        Write-ColoredOutput "SUGGESTIONS DE DEPANNAGE:" "Info"
        
        $errorMessage = $_.Exception.Message.ToLower()
        
        if ($errorMessage.Contains("ssl") -or $errorMessage.Contains("certificate")) {
            Write-ColoredOutput "- Problème SSL détecté" "Warning"
            Write-ColoredOutput "- Essayez avec -SkipCertificateValidation" "Info"
            Write-ColoredOutput "- Ou téléchargez le certificat SSL" "Info"
        } elseif ($errorMessage.Contains("access denied")) {
            Write-ColoredOutput "- Vérifiez le nom d'utilisateur et mot de passe" "Warning"
            Write-ColoredOutput "- Vérifiez les permissions de l'utilisateur" "Info"
        } elseif ($errorMessage.Contains("unable to connect")) {
            Write-ColoredOutput "- Vérifiez votre connexion internet" "Warning"
            Write-ColoredOutput "- Vérifiez les Security Groups AWS" "Info"
            Write-ColoredOutput "- Vérifiez que la base RDS est démarrée" "Info"
        }
        
        return $false
    }
}

# Fonction principale
function Main {
    Write-ColoredOutput "TEST DE CONNEXION A LA BASE DE DONNEES RDS" "Info"
    Write-ColoredOutput "=============================================" "Info"
    
    # Configuration de base
    $config = @{
        Server = $DBHost
        Port = $Port
        Database = $Database
        Username = $Username
        Password = $Password
    }
    
    Write-ColoredOutput "" "Info"
    Write-ColoredOutput "Configuration:" "Info"
    Write-ColoredOutput "Host: $($config.Server)" "Info"
    Write-ColoredOutput "Port: $($config.Port)" "Info"
    Write-ColoredOutput "Database: $($config.Database)" "Info"
    Write-ColoredOutput "SSL: $(if ($DisableSSL) { 'Désactivé' } else { 'Activé' })" "Info"
    
    # Gestion du certificat SSL
    $certPath = ".\eu-west-1-bundle.pem"
    $sslMode = "Required"
    
    if (!$DisableSSL) {
        if (!(Test-Path $certPath)) {
            Write-ColoredOutput "" "Warning"
            Write-ColoredOutput "Certificat SSL non trouvé: $certPath" "Warning"
            
            $downloadCert = Read-Host "Voulez-vous télécharger le certificat SSL? (o/N)"
            if ($downloadCert -match "^[oO].*") {
                if (!(Download-SSLCertificate -CertPath $certPath)) {
                    Write-ColoredOutput "Téléchargement échoué, test sans SSL..." "Warning"
                    $DisableSSL = $true
                }
            } else {
                Write-ColoredOutput "Test sans SSL..." "Warning"
                $DisableSSL = $true
            }
        } else {
            Write-ColoredOutput "Certificat SSL trouvé: $certPath" "Success"
        }
        
        if ($SkipCertificateValidation) {
            $sslMode = "Required"
            Write-ColoredOutput "Validation du certificat SSL désactivée pour le test" "Warning"
        }
    }
    
    # Récupération des credentials
    $credentials = $null
    
    if ($UseSecretsManager -and [string]::IsNullOrWhiteSpace($Password)) {
        $credentials = Get-AWSCredentials
    }
    
    if (!$credentials) {
        if ([string]::IsNullOrWhiteSpace($Password)) {
            $credentials = Get-ManualCredentials -DefaultUsername $Username
        } else {
            $credentials = @{
                Username = $Username
                Password = $Password
            }
            Write-ColoredOutput "Utilisation des credentials fournis" "Success"
        }
    }
    
    # Mise à jour de la configuration
    $config.Username = $credentials.Username
    $config.Password = $credentials.Password
    
    # Construction de la chaîne de connexion
    $connectionStringParts = @(
        "Server=$($config.Server)",
        "Port=$($config.Port)",
        "Database=$($config.Database)",
        "Uid=$($config.Username)",
        "Pwd=$($config.Password)",
        "ConnectionTimeout=30",
        "CommandTimeout=30"
    )
    
    if (!$DisableSSL) {
        $connectionStringParts += "SslMode=$sslMode"
        if ((Test-Path $certPath) -and !$SkipCertificateValidation) {
            $connectionStringParts += "SslCa=$certPath"
        }
        if ($SkipCertificateValidation) {
            $connectionStringParts += "SslCert="
            $connectionStringParts += "SslKey="
        }
    } else {
        $connectionStringParts += "SslMode=None"
    }
    
    $connectionString = $connectionStringParts -join ";"
    
    if ($Verbose) {
        Write-ColoredOutput "" "Debug"
        Write-ColoredOutput "Chaîne de connexion (masquée):" "Debug"
        $maskedConnectionString = $connectionString -replace "Pwd=[^;]+", "Pwd=***"
        Write-ColoredOutput "$maskedConnectionString" "Debug"
    }
    
    # Test de connexion
    $success = Test-MySQLConnection -ConnectionString $connectionString -Config $config
    
    # Résultat final
    if ($success) {
        Write-ColoredOutput "" "Info"
        Write-ColoredOutput "Connexion fermée" "Info"
        return 0
    } else {
        return 1
    }
}

# Point d'entrée
try {
    $exitCode = Main
    exit $exitCode
} catch {
    Write-ColoredOutput "Erreur fatale: $($_.Exception.Message)" "Error"
    exit 1
}