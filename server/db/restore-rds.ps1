# restore-rds-with-env.ps1 - Restauration RDS avec mot de passe .env
param(
    [switch]$Force = $false
)

# Configuration
$CONFIG = @{
    RdsEndpoint = "maturitybackend-dev-databaseb269d8bb-7h9b2e16ryhv.cd6w86yy2wyp.eu-west-1.rds.amazonaws.com"
    CertPath = "eu-west-1-bundle.pem"
    DumpFile = "backup_20250608T084838.sql"
    Database = "maturity_assessment"
    User = "admin"
}

function Write-LogMessage {
    param([string]$Emoji, [string]$Message)
    Write-Host "$Emoji $Message" -ForegroundColor Green
}

function Write-ErrorMessage {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-WarningMessage {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Load-EnvironmentVariables {
    Write-LogMessage "📄" "Chargement du fichier .env..."
    
    if (-Not (Test-Path ".env")) {
        Write-ErrorMessage "Fichier .env non trouvé !"
        Write-Host "💡 Créez un fichier .env avec: DB_PASSWORD=votre_mot_de_passe_rds" -ForegroundColor Cyan
        exit 1
    }
    
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^([^#][^=]*)\s*=\s*(.*)$") {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
    
    Write-LogMessage "✅" "Variables d'environnement chargées"
}

function Test-Requirements {
    Write-LogMessage "📋" "Vérification des prérequis..."
    
    # Vérifier le mot de passe
    $dbPassword = [Environment]::GetEnvironmentVariable("DB_PASSWORD", "Process")
    if (-Not $dbPassword) {
        Write-ErrorMessage "DB_PASSWORD non trouvé dans .env !"
        Write-Host "💡 Ajoutez: DB_PASSWORD=votre_mot_de_passe_rds dans votre fichier .env" -ForegroundColor Cyan
        exit 1
    }
    Write-LogMessage "✅" "Mot de passe RDS trouvé dans .env"
    
    # Vérifier le dump
    if (-Not (Test-Path $CONFIG.DumpFile)) {
        Write-ErrorMessage "Dump non trouvé: $($CONFIG.DumpFile)"
        exit 1
    }
    
    $fileSize = (Get-Item $CONFIG.DumpFile).Length / 1MB
    Write-LogMessage "✅" "Dump trouvé: $($fileSize.ToString('F2')) MB"
    
    # Vérifier le certificat SSL
    if (-Not (Test-Path $CONFIG.CertPath)) {
        Write-ErrorMessage "Certificat SSL non trouvé: $($CONFIG.CertPath)"
        Write-Host "💡 Exécutez d'abord le script de migration pour télécharger le certificat" -ForegroundColor Cyan
        exit 1
    }
    Write-LogMessage "✅" "Certificat SSL présent"
    
    # Vérifier MySQL/MariaDB CLI
    try {
        $null = & mysql --version 2>$null
        Write-LogMessage "✅" "MySQL/MariaDB CLI disponible"
    }
    catch {
        Write-ErrorMessage "MySQL/MariaDB CLI non trouvé !"
        Write-Host "💡 Installez MySQL ou MariaDB client" -ForegroundColor Cyan
        exit 1
    }
}

function New-RdsConfig {
    $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $configFile = ".my_rds_$timestamp.cnf"
    
    Write-LogMessage "🔧" "Création de la configuration RDS..."
    
    $dbPassword = [Environment]::GetEnvironmentVariable("DB_PASSWORD", "Process")
    
    $configContent = @"
[client]
host=$($CONFIG.RdsEndpoint)
port=3306
user=$($CONFIG.User)
password=$dbPassword
ssl-ca=$($CONFIG.CertPath)
ssl
ssl-verify-server-cert=false
default-character-set=utf8mb4
connect_timeout=60
"@

    $configContent | Out-File -FilePath $configFile -Encoding UTF8
    
    # Définir les permissions (équivalent chmod 600)
    $acl = Get-Acl $configFile
    $acl.SetAccessRuleProtection($true, $false)
    $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
        [System.Security.Principal.WindowsIdentity]::GetCurrent().Name,
        "FullControl",
        "Allow"
    )
    $acl.SetAccessRule($accessRule)
    Set-Acl -Path $configFile -AclObject $acl
    
    Write-LogMessage "✅" "Configuration créée: $configFile"
    
    return $configFile
}

function Test-RdsConnection {
    param([string]$ConfigFile)
    
    Write-LogMessage "🔌" "Test de connexion RDS..."
    
    try {
        $result = & mysql --defaults-file=$ConfigFile -e "SELECT 'Connexion réussie' as status, VERSION() as version;" 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-LogMessage "✅" "Connexion RDS réussie"
            
            # Afficher les infos de connexion
            $lines = $result | Where-Object { $_ -match '\S' }
            if ($lines.Count -gt 1) {
                $data = $lines[1] -split '\t'
                if ($data.Count -gt 1) {
                    Write-LogMessage "📊" "Version: $($data[1])"
                }
            }
            return $true
        }
        else {
            throw "Connexion échouée"
        }
    }
    catch {
        Write-ErrorMessage "Échec de connexion RDS"
        Write-Host "💡 Vérifiez:" -ForegroundColor Cyan
        Write-Host "   - Le mot de passe dans .env" -ForegroundColor Cyan
        Write-Host "   - La connectivité réseau" -ForegroundColor Cyan
        Write-Host "   - Les Security Groups AWS" -ForegroundColor Cyan
        return $false
    }
}

function Test-CurrentDatabase {
    param([string]$ConfigFile)
    
    Write-LogMessage "📊" "Vérification de l'état actuel de la base..."
    
    try {
        $query = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$($CONFIG.Database)';"
        $result = & mysql --defaults-file=$ConfigFile $CONFIG.Database -e $query -s -N 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            $tableCount = [int]$result.Trim()
            Write-LogMessage "📈" "Tables actuelles: $tableCount"
            
            if ($tableCount -gt 0) {
                Write-WarningMessage "La base contient déjà $tableCount tables"
                Write-WarningMessage "La restauration va écraser les données existantes"
                
                if (-Not $Force) {
                    $continue = Read-Host "Voulez-vous continuer ? (cela va écraser les données) [y/N]"
                    if ($continue -notmatch "^[Yy]$") {
                        Write-ErrorMessage "Restauration annulée"
                        exit 1
                    }
                }
                else {
                    Write-LogMessage "🔄" "Mode Force activé, poursuite de la restauration..."
                }
            }
            
            return $tableCount
        }
        else {
            Write-WarningMessage "Impossible de vérifier l'état de la base (elle sera créée si nécessaire)"
            return 0
        }
    }
    catch {
        Write-WarningMessage "Impossible de vérifier l'état de la base (elle sera créée si nécessaire)"
        return 0
    }
}

function New-PreparedDump {
    $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $preparedDump = "backup_prepared_$timestamp.sql"
    
    Write-LogMessage "🔧" "Préparation du dump pour RDS..."
    
    $content = Get-Content $CONFIG.DumpFile -Raw -Encoding UTF8
    
    # Corrections pour compatibilité RDS/MariaDB
    $replacements = @(
        @{ From = "utf8mb4_uca1400_ai_ci"; To = "utf8mb4_unicode_ci"; Desc = "collations UCA1400" },
        @{ From = "utf8mb4_0900_ai_ci"; To = "utf8mb4_unicode_ci"; Desc = "collations 0900" },
        @{ From = "utf8mb4_general_ci"; To = "utf8mb4_unicode_ci"; Desc = "collations general" },
        @{ From = "current_timestamp\(\)"; To = "CURRENT_TIMESTAMP"; Desc = "fonctions timestamp" },
        @{ From = ",NO_AUTO_CREATE_USER"; To = ""; Desc = "options NO_AUTO_CREATE_USER (virgule avant)" },
        @{ From = "NO_AUTO_CREATE_USER,"; To = ""; Desc = "options NO_AUTO_CREATE_USER (virgule après)" },
        @{ From = "NO_AUTO_CREATE_USER"; To = ""; Desc = "options NO_AUTO_CREATE_USER (seule)" }
    )
    
    foreach ($replacement in $replacements) {
        if ($replacement.From -match "\\") {
            # Expressions régulières
            $matches = [regex]::Matches($content, $replacement.From).Count
            if ($matches -gt 0) {
                Write-Host "   📝 Correction $($replacement.Desc): $matches occurrence(s)" -ForegroundColor Green
                $content = [regex]::Replace($content, $replacement.From, $replacement.To)
            }
        }
        else {
            # Remplacement simple
            $matches = ([regex]::Matches($content, [regex]::Escape($replacement.From))).Count
            if ($matches -gt 0) {
                Write-Host "   📝 Correction $($replacement.Desc): $matches occurrence(s)" -ForegroundColor Green
                $content = $content.Replace($replacement.From, $replacement.To)
            }
        }
    }
    
    # Nettoyer les virgules doubles
    $content = $content.Replace(",,", ",")
    
    $content | Out-File -FilePath $preparedDump -Encoding UTF8
    Write-LogMessage "✅" "Dump préparé: $preparedDump"
    
    return $preparedDump
}

function Restore-Database {
    param([string]$ConfigFile, [string]$PreparedDump)
    
    Write-LogMessage "🚀" "Début de la restauration..."
    Write-LogMessage "📁" "Source: $($CONFIG.DumpFile)"
    Write-LogMessage "🎯" "Destination: RDS $($CONFIG.Database)"
    Write-LogMessage "⏱️ " "Cela peut prendre quelques minutes..."
    
    $startTime = Get-Date
    
    try {
        # Tentative de restauration normale
        $cmd = "mysql --defaults-file=$ConfigFile $($CONFIG.Database) < $PreparedDump"
        Invoke-Expression $cmd
        
        if ($LASTEXITCODE -eq 0) {
            $duration = [math]::Round(((Get-Date) - $startTime).TotalSeconds)
            Write-LogMessage "✅" "Restauration réussie en ${duration}s"
            return $true
        }
        else {
            throw "Restauration échouée"
        }
    }
    catch {
        Write-WarningMessage "Restauration avec erreurs, tentative avec --force..."
        
        try {
            $cmd = "mysql --defaults-file=$ConfigFile $($CONFIG.Database) --force < $PreparedDump"
            Invoke-Expression $cmd
            
            if ($LASTEXITCODE -eq 0) {
                $duration = [math]::Round(((Get-Date) - $startTime).TotalSeconds)
                Write-LogMessage "✅" "Restauration forcée réussie en ${duration}s"
                return $true
            }
            else {
                throw "Restauration forcée échouée"
            }
        }
        catch {
            Write-ErrorMessage "Échec de la restauration"
            return $false
        }
    }
}

function Test-Restoration {
    param([string]$ConfigFile)
    
    Write-LogMessage "🔍" "Vérification des données restaurées..."
    
    try {
        # Tables créées
        $tablesResult = & mysql --defaults-file=$ConfigFile $CONFIG.Database -e "SHOW TABLES;" -s 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            $tables = $tablesResult | Where-Object { $_ -match '\S' }
            Write-LogMessage "📊" "Tables dans la base: $($tables.Count)"
            foreach ($table in $tables) {
                Write-Host "   ✓ $table" -ForegroundColor Green
            }
            
            Write-Host ""
            
            # Comptage des enregistrements
            Write-LogMessage "📈" "Comptage des enregistrements:"
            $countQuery = @"
SELECT 'entreprises' as table_name, COUNT(*) as count FROM entreprises
UNION ALL SELECT 'acteurs', COUNT(*) FROM acteurs  
UNION ALL SELECT 'applications', COUNT(*) FROM applications
UNION ALL SELECT 'fonctions', COUNT(*) FROM fonctions
UNION ALL SELECT 'thematiques', COUNT(*) FROM thematiques
UNION ALL SELECT 'questionnaires', COUNT(*) FROM questionnaires
UNION ALL SELECT 'questions', COUNT(*) FROM questions
UNION ALL SELECT 'formulaires', COUNT(*) FROM formulaires
UNION ALL SELECT 'reponses', COUNT(*) FROM reponses;
"@
            
            & mysql --defaults-file=$ConfigFile $CONFIG.Database -e $countQuery -t
            
            Write-Host ""
            
            # Exemples d'utilisateurs
            Write-LogMessage "👥" "Exemples d'utilisateurs:"
            $usersQuery = @"
SELECT nom_prenom, email, role, organisation 
FROM acteurs 
ORDER BY date_creation DESC 
LIMIT 5;
"@
            
            & mysql --defaults-file=$ConfigFile $CONFIG.Database -e $usersQuery -t
            
            # Total des enregistrements
            $totalQuery = @"
SELECT 
  (SELECT COUNT(*) FROM acteurs) + 
  (SELECT COUNT(*) FROM entreprises) + 
  (SELECT COUNT(*) FROM applications) + 
  (SELECT COUNT(*) FROM reponses) as total;
"@
            
            $totalResult = & mysql --defaults-file=$ConfigFile $CONFIG.Database -e $totalQuery -s -N 2>$null
            
            if ($LASTEXITCODE -eq 0) {
                Write-LogMessage "📊" "Total des enregistrements importés: $($totalResult.Trim())"
            }
            
            return $true
        }
        else {
            Write-ErrorMessage "Erreur lors de la vérification"
            return $false
        }
    }
    catch {
        Write-ErrorMessage "Erreur lors de la vérification"
        return $false
    }
}

function Remove-TemporaryFiles {
    param([string[]]$Files)
    
    Write-LogMessage "🗑️ " "Nettoyage des fichiers temporaires..."
    foreach ($file in $Files) {
        if (Test-Path $file) {
            Remove-Item $file -Force
            Write-Host "   🗑️ Supprimé: $file" -ForegroundColor Green
        }
    }
}

function Show-FinalInstructions {
    Write-Host ""
    Write-LogMessage "🎉" "=== RESTAURATION TERMINÉE AVEC SUCCÈS ==="
    Write-Host ""
    Write-LogMessage "📋" "Prochaines étapes:"
    Write-Host ""
    Write-Host "1. Testez l'API backend:" -ForegroundColor Cyan
    Write-Host "   curl https://api-dev.dev-maturity.e-dsin.fr/api/health/database" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Testez la connexion au frontend avec un utilisateur existant" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3. Surveillez les logs ECS:" -ForegroundColor Cyan
    Write-Host "   aws logs tail /ecs/maturity-backend-dev --follow --region eu-west-1" -ForegroundColor Gray
    Write-Host ""
    Write-Host "4. Connectez-vous directement à RDS si nécessaire:" -ForegroundColor Cyan
    Write-Host "   mysql -h $($CONFIG.RdsEndpoint) -u $($CONFIG.User) -p --ssl-ca=$($CONFIG.CertPath) $($CONFIG.Database)" -ForegroundColor Gray
    Write-Host ""
    Write-LogMessage "✅" "Migration des données vers RDS réussie !"
}

# Script principal
try {
    Write-LogMessage "🚀" "=== RESTAURATION RDS AVEC PASSWORD .ENV ==="
    Write-Host ""
    
    # 1. Charger les variables d'environnement
    Load-EnvironmentVariables
    
    # 2. Vérifications préalables
    Test-Requirements
    
    # 3. Configuration RDS
    $configFile = New-RdsConfig
    
    # 4. Test de connexion
    if (-Not (Test-RdsConnection -ConfigFile $configFile)) {
        Remove-TemporaryFiles @($configFile)
        exit 1
    }
    
    # 5. Vérifier l'état actuel
    Test-CurrentDatabase -ConfigFile $configFile
    
    # 6. Préparer le dump
    $preparedDump = New-PreparedDump
    
    # 7. Restauration
    $restoreSuccess = Restore-Database -ConfigFile $configFile -PreparedDump $preparedDump
    
    if (-Not $restoreSuccess) {
        Remove-TemporaryFiles @($configFile, $preparedDump)
        exit 1
    }
    
    # 8. Vérification
    Test-Restoration -ConfigFile $configFile
    
    # 9. Nettoyage
    Remove-TemporaryFiles @($configFile, $preparedDump)
    
    # 10. Instructions finales
    Show-FinalInstructions
}
catch {
    Write-ErrorMessage "Erreur lors de la restauration: $($_.Exception.Message)"
    exit 1
}