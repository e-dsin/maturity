#!/bin/bash

# Script de déploiement amélioré avec diagnostics
set -e

# Variables
REGION="eu-west-1"
ECR_REGISTRY="637423285771.dkr.ecr.eu-west-1.amazonaws.com"
REPOSITORY="maturity-backend-dev"
CLUSTER="maturity-backend-dev"
SERVICE="maturity-backend-dev"
IMAGE_TAG="latest"

echo "🚀 === DÉPLOIEMENT MATURITY BACKEND ==="
echo "📅 Date: $(date)"
echo "🌐 Région: $REGION"
echo "📦 Repository: $ECR_REGISTRY/$REPOSITORY"
echo "🏗️ Cluster: $CLUSTER"
echo "⚙️  Service: $SERVICE"
echo "================================="

# Étape 1: Nettoyage
echo "🧹 Étape 1: Nettoyage du système Docker..."
docker system prune -af
echo "✅ Nettoyage terminé"

# Étape 2: Vérification des fichiers critiques
echo "📋 Étape 2: Vérification des fichiers critiques..."
if [ ! -f "server.js" ]; then
    echo "❌ ERREUR: server.js non trouvé dans le répertoire courant"
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo "❌ ERREUR: package.json non trouvé"
    exit 1
fi

if [ ! -d "routes" ]; then
    echo "❌ ERREUR: Répertoire routes/ non trouvé"
    exit 1
fi

# Compter les fichiers de routes
ROUTE_COUNT=$(find routes -name "*.js" | wc -l)
echo "📁 Trouvé $ROUTE_COUNT fichiers de routes dans le répertoire routes/"

# Lister les routes principales
echo "📋 Routes principales détectées:"
ls -la routes/ | grep -E "(benchmark|entreprise|questionnaire|application)" || echo "⚠️  Aucune route principale détectée"
echo "✅ Vérification des fichiers terminée"

# Étape 3: Construction de l'image
echo "🏗️ Étape 3: Construction de l'image Docker..."
docker build --no-cache -t $REPOSITORY .
echo "✅ Image construite avec succès"

# Étape 4: Test de l'image localement (optionnel)
echo "🧪 Étape 4: Test rapide de l'image..."
CONTAINER_ID=$(docker run -d -p 3001:3000 $REPOSITORY)
sleep 5

# Test du health check
if docker exec $CONTAINER_ID curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Health check réussi"
else
    echo "⚠️  Health check échoué, mais on continue..."
fi

# Arrêter le conteneur de test
docker stop $CONTAINER_ID
docker rm $CONTAINER_ID
echo "✅ Test terminé"

# Étape 5: Connexion à ECR
echo "🔐 Étape 5: Connexion à ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
echo "✅ Connexion ECR réussie"

# Étape 6: Tag et push de l'image
echo "🏷️ Étape 6: Tag et push de l'image..."
docker tag $REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$REPOSITORY:$IMAGE_TAG
docker tag $REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$REPOSITORY:$(date +%Y%m%d-%H%M%S)

echo "📤 Push de l'image vers ECR..."
docker push $ECR_REGISTRY/$REPOSITORY:$IMAGE_TAG
docker push $ECR_REGISTRY/$REPOSITORY:$(date +%Y%m%d-%H%M%S)
echo "✅ Push terminé"

# Étape 7: Mise à jour du service ECS
echo "🔄 Étape 7: Mise à jour du service ECS..."
aws ecs update-service \
    --cluster $CLUSTER \
    --service $SERVICE \
    --force-new-deployment \
    --region $REGION
echo "✅ Service ECS mis à jour"

# Étape 8: Attendre le déploiement
echo "⏳ Étape 8: Attente du déploiement..."
echo "📊 Surveillance du déploiement (30s)..."
aws ecs wait services-stable \
    --cluster $CLUSTER \
    --services $SERVICE \
    --region $REGION \
    --cli-read-timeout 30 \
    --cli-connect-timeout 30 || echo "⚠️  Timeout atteint, vérifiez manuellement"

# Étape 9: Vérification post-déploiement
echo "🔍 Étape 9: Vérification post-déploiement..."
echo "📋 Statut du service:"
aws ecs describe-services \
    --cluster $CLUSTER \
    --services $SERVICE \
    --region $REGION \
    --query 'services[0].{Status:status,RunningCount:runningCount,DesiredCount:desiredCount,TaskDefinition:taskDefinition}' \
    --output table

echo "📋 Tâches en cours:"
aws ecs list-tasks \
    --cluster $CLUSTER \
    --service-name $SERVICE \
    --region $REGION \
    --query 'taskArns' \
    --output table

echo ""
echo "🎉 === DÉPLOIEMENT TERMINÉ ==="
echo "🌐 URL à tester: https://api-dev.dev-maturity.e-dsin.fr/health"
echo "📋 Routes à vérifier:"
echo "   - https://api-dev.dev-maturity.e-dsin.fr/api/benchmark/sectors"
echo "   - https://api-dev.dev-maturity.e-dsin.fr/api/entreprise-registration"
echo "   - https://api-dev.dev-maturity.e-dsin.fr/api/maturity-evaluation"
echo ""
echo "🔍 Pour diagnostiquer en cas de problème:"
echo "   aws logs tail /ecs/$SERVICE --follow --region $REGION"
echo "================================="