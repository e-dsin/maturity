#!/bin/bash

# Script de déploiement du backend sur AWS
set -e

# Configuration
ENVIRONMENT=${1:-dev}
AWS_REGION="eu-west-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "🚀 Déploiement du backend - Environnement: $ENVIRONMENT"
echo "📍 Région: $AWS_REGION"
echo "🏢 Compte AWS: $AWS_ACCOUNT_ID"

# Vérification des prérequis
echo "🔍 Vérification des prérequis..."

# Vérifier AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI n'est pas installé"
    exit 1
fi

# Vérifier CDK CLI
if ! command -v cdk &> /dev/null; then
    echo "❌ AWS CDK CLI n'est pas installé"
    echo "💡 Installez avec: npm install -g aws-cdk"
    exit 1
fi

# Vérifier Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé"
    exit 1
fi

# Vérifier que Docker fonctionne
if ! docker info &> /dev/null; then
    echo "❌ Docker n'est pas démarré"
    exit 1
fi

echo "✅ Prérequis vérifiés"

# Bootstrap CDK (si nécessaire)
echo "🔧 Bootstrap CDK..."
cdk bootstrap aws://$AWS_ACCOUNT_ID/$AWS_REGION --force

# Installation des dépendances
echo "📦 Installation des dépendances..."
npm install

# Compilation TypeScript
echo "🔨 Compilation TypeScript..."
npm run build

# Synthèse du template CloudFormation
echo "🏗️ Synthèse CDK..."
ENVIRONMENT=$ENVIRONMENT cdk synth

# Diff pour voir les changements
echo "📋 Affichage des changements..."
ENVIRONMENT=$ENVIRONMENT cdk diff || true

# Confirmation avant déploiement
read -p "🤔 Voulez-vous continuer avec le déploiement? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Déploiement annulé"
    exit 1
fi

# Déploiement
echo "🚀 Déploiement de l'infrastructure..."
ENVIRONMENT=$ENVIRONMENT cdk deploy --require-approval never

# Récupération des outputs
echo "📤 Récupération des informations de déploiement..."
STACK_NAME="MaturityBackend-$ENVIRONMENT"

API_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
    --output text \
    --region $AWS_REGION)

ECR_URI=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`ECRRepositoryURI`].OutputValue' \
    --output text \
    --region $AWS_REGION)

DB_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
    --output text \
    --region $AWS_REGION)

DB_SECRET_ARN=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`DatabaseSecretArn`].OutputValue' \
    --output text \
    --region $AWS_REGION)

# Affichage des résultats
echo ""
echo "✅ Déploiement terminé avec succès!"
echo ""
echo "📊 Informations du déploiement:"
echo "┌─────────────────────────────────────────────────────────────────┐"
echo "│ Infrastructure Backend - Environnement: $ENVIRONMENT"
echo "├─────────────────────────────────────────────────────────────────┤"
echo "│ 🌐 API URL: $API_URL"
echo "│ 🐳 ECR Repository: $ECR_URI"
echo "│ 🗄️  Database Endpoint: $DB_ENDPOINT"
echo "│ 🔐 Database Secret ARN: $DB_SECRET_ARN"
echo "└─────────────────────────────────────────────────────────────────┘"
echo ""

# Sauvegarde des variables d'environnement
cat > .env.$ENVIRONMENT << EOF
# Variables d'environnement - $ENVIRONMENT
API_URL=$API_URL
ECR_REPOSITORY_URI=$ECR_URI
DATABASE_ENDPOINT=$DB_ENDPOINT
DATABASE_SECRET_ARN=$DB_SECRET_ARN
AWS_REGION=$AWS_REGION
ENVIRONMENT=$ENVIRONMENT
EOF

echo "💾 Variables sauvegardées dans .env.$ENVIRONMENT"
echo ""
echo "🎯 Prochaines étapes:"
echo "1. ⚙️  Construire et pousser l'image Docker vers ECR"
echo "2. 🗄️  Migrer le schéma de base de données"
echo "3. 🧪 Tester la connectivité de l'API"
echo ""
echo "💡 Utilisez: ./docker-build-push.sh $ENVIRONMENT"