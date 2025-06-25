$ErrorActionPreference = "Stop"

Write-Host "Configuration de l'environnement de developpement Windows" -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Green

# Fonction pour verifier si Chocolatey est installe
function Test-ChocolateyInstalled {
    try {
        Get-Command choco -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Fonction pour installer un package via Chocolatey
function Install-ChocoPackage($packageName, $displayName) {
    if (Test-ChocolateyInstalled) {
        Write-Host "Installation de $displayName via Chocolatey..." -ForegroundColor Yellow
        choco install $packageName -y
    } else {
        Write-Host "Chocolatey non installe. Installez $displayName manuellement." -ForegroundColor Yellow
    }
}

# 1. Verifier les prerequis
Write-Host ""
Write-Host "1. Verification des prerequis..." -ForegroundColor Yellow

# Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js non installe" -ForegroundColor Red
    Install-ChocoPackage "nodejs" "Node.js"
} else {
    $nodeVersion = node --version
    Write-Host "Node.js: $nodeVersion" -ForegroundColor Green
}

# Git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Git non installe" -ForegroundColor Red
    Install-ChocoPackage "git" "Git"
} else {
    $gitVersion = git --version
    Write-Host "Git: $gitVersion" -ForegroundColor Green
}

# AWS CLI
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Host "AWS CLI non installe" -ForegroundColor Red
    Install-ChocoPackage "awscli" "AWS CLI"
} else {
    $awsVersion = aws --version
    Write-Host "AWS CLI: $awsVersion" -ForegroundColor Green
}

# Docker Desktop
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Docker non installe" -ForegroundColor Red
    Write-Host "   Installez Docker Desktop depuis: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
} else {
    try {
        $dockerVersion = docker --version
        Write-Host "Docker: $dockerVersion" -ForegroundColor Green
    } catch {
        Write-Host "Docker installe mais non demarre" -ForegroundColor Yellow
    }
}

# 2. Installation d'AWS CDK
Write-Host ""
Write-Host "2. Installation d'AWS CDK..." -ForegroundColor Yellow

if (-not (Get-Command cdk -ErrorAction SilentlyContinue)) {
    npm install -g aws-cdk@latest
} else {
    Write-Host "AWS CDK deja installe" -ForegroundColor Green
}

$cdkVersion = cdk --version
Write-Host "AWS CDK: $cdkVersion" -ForegroundColor Green

# 3. Configuration AWS
Write-Host ""
Write-Host "3. Configuration AWS..." -ForegroundColor Yellow

try {
    $identity = aws sts get-caller-identity | ConvertFrom-Json
    Write-Host "AWS configure pour le compte: $($identity.Account)" -ForegroundColor Green
} catch {
    Write-Host "AWS non configure" -ForegroundColor Red
    Write-Host "   Executez: aws configure" -ForegroundColor Yellow
    Write-Host "   Vous aurez besoin de:" -ForegroundColor Yellow
    Write-Host "   - AWS Access Key ID" -ForegroundColor Yellow
    Write-Host "   - AWS Secret Access Key" -ForegroundColor Yellow
    Write-Host "   - Default region: eu-west-3" -ForegroundColor Yellow
    Write-Host "   - Default output format: json" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Configuration terminee!" -ForegroundColor Green
Write-Host ""
Write-Host "Prochaines etapes:" -ForegroundColor Yellow
Write-Host "   1. Si AWS n'est pas configure: aws configure" -ForegroundColor White
Write-Host "   2. Naviguez vers votre projet et executez:" -ForegroundColor White
Write-Host "      .\scripts\deploy-backend-dev.ps1" -ForegroundColor White