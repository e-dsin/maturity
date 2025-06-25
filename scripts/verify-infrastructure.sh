#!/bin/bash
# verify-infrastructure.sh - Vérification de l'infrastructure déployée

set -e

ENVIRONMENT="dev"
REGION="eu-west-1"
STACK_NAME="MaturityBackend-${ENVIRONMENT}"

echo "🔍 Vérification de l'infrastructure déployée - ${ENVIRONMENT}"
echo "=================================================="

# Fonction pour vérifier le statut d'un service
check_service() {
    local service_name=$1
    local status=$2
    
    if [ "$status" = "SUCCESS" ] || [ "$status" = "available" ] || [ "$status" = "ACTIVE" ]; then
        echo "✅ $service_name: $status"
        return 0
    else
        echo "❌ $service_name: $status"
        return 1
    fi
}

# 1. Vérification du stack CloudFormation
echo "📋 Vérification du stack CloudFormation..."
STACK_STATUS=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].StackStatus' \
    --output text 2>/dev/null || echo "NOT_FOUND")

check_service "CloudFormation Stack" "$STACK_STATUS"

if [ "$STACK_STATUS" != "CREATE_COMPLETE" ] && [ "$STACK_STATUS" != "UPDATE_COMPLETE" ]; then
    echo "❌ Le stack n'est pas dans un état stable"
    exit 1
fi

# 2. Vérification du VPC
echo ""
echo "🌐 Vérification du VPC..."
VPC_ID=$(aws ec2 describe-vpcs \
    --filters "Name=tag:Name,Values=*BackendVPC*" \
    --region ${REGION} \
    --query 'Vpcs[0].VpcId' \
    --output text 2>/dev/null || echo "None")

if [ "$VPC_ID" != "None" ]; then
    VPC_STATE=$(aws ec2 describe-vpcs \
        --vpc-ids ${VPC_ID} \
        --region ${REGION} \
        --query 'Vpcs[0].State' \
        --output text)
    check_service "VPC (${VPC_ID})" "$VPC_STATE"
else
    echo "❌ VPC non trouvé"
fi

# 3. Vérification de la base de données RDS
echo ""
echo "🗄️ Vérification de la base de données RDS..."
DB_STATUS=$(aws rds describe-db-instances \
    --region ${REGION} \
    --query "DBInstances[?contains(DBInstanceIdentifier, 'maturity') || contains(DBInstanceIdentifier, 'backend')].DBInstanceStatus" \
    --output text 2>/dev/null || echo "None")

if [ "$DB_STATUS" != "None" ] && [ ! -z "$DB_STATUS" ]; then
    check_service "RDS Database" "$DB_STATUS"
    
    # Obtenir l'endpoint de la base
    DB_ENDPOINT=$(aws rds describe-db-instances \
        --region ${REGION} \
        --query "DBInstances[?contains(DBInstanceIdentifier, 'maturity') || contains(DBInstanceIdentifier, 'backend')].Endpoint.Address" \
        --output text)
    echo "   📍 Endpoint: $DB_ENDPOINT"
else
    echo "❌ Base de données RDS non trouvée"
fi

# 4. Vérification du cluster ECS
echo ""
echo "📋 Vérification du cluster ECS..."
CLUSTER_STATUS=$(aws ecs describe-clusters \
    --clusters "maturity-backend-${ENVIRONMENT}" \
    --region ${REGION} \
    --query 'clusters[0].status' \
    --output text 2>/dev/null || echo "None")

if [ "$CLUSTER_STATUS" != "None" ]; then
    check_service "ECS Cluster" "$CLUSTER_STATUS"
    
    # Vérifier les tâches en cours
    RUNNING_TASKS=$(aws ecs list-tasks \
        --cluster "maturity-backend-${ENVIRONMENT}" \
        --region ${REGION} \
        --query 'length(taskArns)' \
        --output text 2>/dev/null || echo "0")
    echo "   📊 Tâches en cours: $RUNNING_TASKS"
else
    echo "❌ Cluster ECS non trouvé"
fi

# 5. Vérification du service ECS
echo ""
echo "🚀 Vérification du service ECS..."
SERVICE_STATUS=$(aws ecs describe-services \
    --cluster "maturity-backend-${ENVIRONMENT}" \
    --services "maturity-backend-${ENVIRONMENT}" \
    --region ${REGION} \
    --query 'services[0].status' \
    --output text 2>/dev/null || echo "None")

if [ "$SERVICE_STATUS" != "None" ]; then
    check_service "ECS Service" "$SERVICE_STATUS"
    
    # Vérifier le nombre de tâches désirées vs en cours
    DESIRED_COUNT=$(aws ecs describe-services \
        --cluster "maturity-backend-${ENVIRONMENT}" \
        --services "maturity-backend-${ENVIRONMENT}" \
        --region ${REGION} \
        --query 'services[0].desiredCount' \
        --output text)
    
    RUNNING_COUNT=$(aws ecs describe-services \
        --cluster "maturity-backend-${ENVIRONMENT}" \
        --services "maturity-backend-${ENVIRONMENT}" \
        --region ${REGION} \
        --query 'services[0].runningCount' \
        --output text)
    
    echo "   📊 Tâches désirées: $DESIRED_COUNT, En cours: $RUNNING_COUNT"
    
    if [ "$DESIRED_COUNT" = "$RUNNING_COUNT" ]; then
        echo "   ✅ Service à l'état stable"
    else
        echo "   ⚠️ Service en cours de stabilisation"
    fi
else
    echo "❌ Service ECS non trouvé"
fi

# 6. Vérification du Load Balancer
echo ""
echo "⚖️ Vérification du Load Balancer..."
ALB_STATE=$(aws elbv2 describe-load-balancers \
    --region ${REGION} \
    --query "LoadBalancers[?contains(LoadBalancerName, 'maturity') || contains(LoadBalancerName, 'Backend')].State.Code" \
    --output text 2>/dev/null || echo "None")

if [ "$ALB_STATE" != "None" ] && [ ! -z "$ALB_STATE" ]; then
    check_service "Application Load Balancer" "$ALB_STATE"
    
    # Obtenir l'URL du load balancer
    ALB_DNS=$(aws elbv2 describe-load-balancers \
        --region ${REGION} \
        --query "LoadBalancers[?contains(LoadBalancerName, 'maturity') || contains(LoadBalancerName, 'Backend')].DNSName" \
        --output text)
    echo "   🌐 DNS: $ALB_DNS"
else
    echo "❌ Load Balancer non trouvé"
fi

# 7. Vérification du repository ECR
echo ""
echo "📦 Vérification du repository ECR..."
ECR_REPOS=$(aws ecr describe-repositories \
    --region ${REGION} \
    --query "repositories[?contains(repositoryName, 'maturity')].repositoryName" \
    --output text 2>/dev/null || echo "None")

if [ "$ECR_REPOS" != "None" ] && [ ! -z "$ECR_REPOS" ]; then
    check_service "ECR Repository" "available"
    echo "   📦 Repository: $ECR_REPOS"
    
    # Vérifier s'il y a des images
    IMAGE_COUNT=$(aws ecr list-images \
        --repository-name $(echo $ECR_REPOS | cut -d' ' -f1) \
        --region ${REGION} \
        --query 'length(imageIds)' \
        --output text 2>/dev/null || echo "0")
    echo "   🖼️ Images disponibles: $IMAGE_COUNT"
else
    echo "❌ Repository ECR non trouvé"
fi

# 8. Vérification des secrets
echo ""
echo "🔐 Vérification des secrets..."
DB_SECRET=$(aws secretsmanager list-secrets \
    --region ${REGION} \
    --query "SecretList[?contains(Name, 'maturity-db')].Name" \
    --output text 2>/dev/null || echo "None")

JWT_SECRET=$(aws secretsmanager list-secrets \
    --region ${REGION} \
    --query "SecretList[?contains(Name, 'maturity-jwt')].Name" \
    --output text 2>/dev/null || echo "None")

if [ "$DB_SECRET" != "None" ]; then
    check_service "Database Secret" "available"
else
    echo "❌ Secret de base de données non trouvé"
fi

if [ "$JWT_SECRET" != "None" ]; then
    check_service "JWT Secret" "available"
else
    echo "❌ Secret JWT non trouvé"
fi

# 9. Test de connectivité de l'API (si disponible)
echo ""
echo "🌐 Test de connectivité de l'API..."

# Récupérer l'URL de l'API depuis les outputs du stack
API_URL=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
    --output text 2>/dev/null || echo "None")

if [ "$API_URL" != "None" ] && [ ! -z "$API_URL" ]; then
    echo "   🔗 URL de l'API: $API_URL"
    
    # Test simple de connectivité (ping)
    if curl -f -s --max-time 10 "${API_URL}/health" > /dev/null 2>&1; then
        echo "   ✅ API accessible (endpoint /health)"
    else
        echo "   ⚠️ API non accessible (normal si aucune image déployée)"
    fi
else
    echo "   ❌ URL de l'API non trouvée dans les outputs"
fi

# 10. Vérification des logs CloudWatch
echo ""
echo "📊 Vérification des logs CloudWatch..."
LOG_GROUP=$(aws logs describe-log-groups \
    --log-group-name-prefix "/ecs/maturity-backend" \
    --region ${REGION} \
    --query 'logGroups[0].logGroupName' \
    --output text 2>/dev/null || echo "None")

if [ "$LOG_GROUP" != "None" ]; then
    check_service "CloudWatch Log Group" "available"
    echo "   📝 Log Group: $LOG_GROUP"
else
    echo "❌ Log Group CloudWatch non trouvé"
fi

# Résumé final
echo ""
echo "=================================================="
echo "📊 RÉSUMÉ DE LA VÉRIFICATION"
echo "=================================================="

if [ "$STACK_STATUS" = "CREATE_COMPLETE" ] || [ "$STACK_STATUS" = "UPDATE_COMPLETE" ]; then
    echo "✅ Infrastructure déployée avec succès"
    echo ""
    echo "🎯 Prochaines étapes:"
    echo "   1. Build et push de l'image Docker vers ECR"
    echo "   2. Mise à jour du service ECS avec la nouvelle image"
    echo "   3. Migration du schéma de base de données"
    echo "   4. Tests de connectivité end-to-end"
    echo ""
    echo "📋 Commandes utiles:"
    echo "   • Logs ECS: aws logs tail $LOG_GROUP --follow"
    echo "   • État du service: aws ecs describe-services --cluster maturity-backend-${ENVIRONMENT} --services maturity-backend-${ENVIRONMENT}"
    echo "   • Tâches: aws ecs list-tasks --cluster maturity-backend-${ENVIRONMENT}"
else
    echo "❌ Infrastructure non déployée correctement"
    echo "   Statut du stack: $STACK_STATUS"
    exit 1
fi