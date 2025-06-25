# Configuration
$Bucket = "maturity-frontend-dev-637423285771"
$DistributionId = "E4TQ5785XPNPQ"
$Region = "eu-west-3"

# Étape 1 : Nettoyer et rebuild
Write-Host "Nettoyage du dossier build..."
Remove-Item -Path "build" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Exécution de npm run build..."
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors de npm run build" -ForegroundColor Red
    exit 1
}

# Étape 2 : Synchroniser avec S3
Write-Host "Synchronisation des fichiers vers S3 (sauf *.html)..."
aws s3 sync build/ s3://$Bucket/ --delete --region $Region --cache-control "max-age=31536000" --exclude "*.html"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors de la synchronisation S3" -ForegroundColor Red
    exit 1
}

Write-Host "Téléversement de index.html avec Cache-Control no-cache..."
aws s3 cp build/index.html s3://$Bucket/index.html --metadata-directive REPLACE --cache-control "no-cache, no-store, must-revalidate" --region $Region
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors du téléversement de index.html" -ForegroundColor Red
    exit 1
}

# Étape 3 : Créer une invalidation CloudFront
Write-Host "Création de l'invalidation CloudFront..."
$invalidation = aws cloudfront create-invalidation --distribution-id $DistributionId --paths "/*" | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors de la création de l'invalidation" -ForegroundColor Red
    exit 1
}
$invalidationId = $invalidation.Invalidation.Id

# Étape 4 : Attendre la fin de l'invalidation
Write-Host "Attente de la fin de l'invalidation $invalidationId..."
aws cloudfront wait invalidation-completed --distribution-id $DistributionId --id $invalidationId
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors de l'attente de l'invalidation" -ForegroundColor Red
    exit 1
}

Write-Host "Déploiement terminé avec succès !" -ForegroundColor Green