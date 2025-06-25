set -e

echo "🚀 Déploiement Infrastructure Maturity Backend - Dev"
echo "=================================================="

# Configuration adaptée à votre structure
ENVIRONMENT="dev"
REGION="eu-west-3"  # Votre région
STACK_NAME="MaturityBackend-${ENVIRONMENT}"

# Export des variables d'environnement
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
export CDK_DEFAULT_REGION=${REGION}
export ENVIRONMENT=${ENVIRONMENT}

echo "✅ Compte AWS: ${CDK_DEFAULT_ACCOUNT}"
echo "✅ Région: ${REGION}"
echo "✅ Environnement: ${ENVIRONMENT}"

# Vérification que le certificat est dans la bonne région
echo ""
echo "🔍 Vérification du certificat SSL dans eu-west-3..."
CERT_STATUS=$(aws acm describe-certificate \
    --certificate-arn "arn:aws:acm:eu-west-3:637423285771:certificate/cf6a160d-877c-428c-bf0a-8a5f75faabfc" \
    --region eu-west-3 \
    --query 'Certificate.Status' \
    --output text 2>/dev/null || echo "NOT_FOUND")

if [[ "$CERT_STATUS" == "ISSUED" ]]; then
    echo "✅ Certificat SSL validé dans eu-west-3"
else
    echo "❌ Certificat SSL non validé ou non trouvé: $CERT_STATUS"
    echo "   Vérifiez dans la console ACM eu-west-3"
    exit 1
fi

# Mise à jour des dépendances
echo ""
echo "📦 Installation des dépendances..."
npm install

# Build
echo ""
echo "🔨 Build du projet..."
npm run build

# Bootstrap CDK si nécessaire
echo ""
echo "🔧 Bootstrap CDK..."
if ! aws cloudformation describe-stacks --stack-name CDKToolkit --region ${REGION} > /dev/null 2>&1; then
    echo "Bootstrap CDK requis..."
    cdk bootstrap aws://${CDK_DEFAULT_ACCOUNT}/${REGION}
else
    echo "✅ CDK déjà bootstrappé"
fi

# Synth pour vérifier
echo ""
echo "📄 Génération du template..."
cdk synth ${STACK_NAME}

# Déploiement
echo ""
echo "🚀 Déploiement..."
cdk deploy ${STACK_NAME} --require-approval never

echo ""
echo "✅ Déploiement terminé!"

# Récupération des outputs
API_URL=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
    --output text 2>/dev/null || echo "N/A")

echo ""
echo "📊 Informations de déploiement:"
echo "   🌐 API URL: ${API_URL}"
echo ""
echo "🎯 Prochaine étape: Phase 3 - Build et push Docker"