#!/bin/bash
set -e

# Configuration
ENVIRONMENT=${1:-dev}
AWS_REGION=${AWS_REGION:-eu-west-3}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "🚀 Déploiement du backend pour l'environnement: $ENVIRONMENT"

# Variables
ECR_REPO_NAME="maturity-backend-$ENVIRONMENT"
ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME"
IMAGE_TAG="latest"

echo "📦 Build de l'image Docker..."
docker build -t $ECR_REPO_NAME:$IMAGE_TAG .

echo "🔐 Connexion à ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URI

echo "🏷️ Tag de l'image pour ECR..."
docker tag $ECR_REPO_NAME:$IMAGE_TAG $ECR_URI:$IMAGE_TAG

echo "⬆️ Push vers ECR..."
docker push $ECR_URI:$IMAGE_TAG

echo "🏗️ Déploiement de l'infrastructure..."
cd infrastructure
npx cdk deploy MaturityApp-Backend-$ENVIRONMENT --require-approval never

echo "🔄 Force le redéploiement du service ECS..."
aws ecs update-service \
  --cluster maturity-backend-$ENVIRONMENT \
  --service maturity-backend-$ENVIRONMENT \
  --force-new-deployment \
  --region $AWS_REGION

echo "✅ Déploiement terminé!"
echo "🌐 API URL: https://api-$ENVIRONMENT.e-dsin.fr"