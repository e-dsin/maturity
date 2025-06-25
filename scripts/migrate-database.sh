#!/bin/bash

# Script de migration de base de données
set -e

# Configuration
ENVIRONMENT=${1:-dev}
AWS_REGION="eu-west-1"

echo "🗄️  Migration de base de données - Environnement: $ENVIRONMENT"

# Chargement des variables d'environnement
if [ -f .env.$ENVIRONMENT ]; then
    source .env.$ENVIRONMENT
else
    echo "❌ Fichier .env.$ENVIRONMENT non trouvé"
    echo "💡 Exécutez d'abord: ./deploy-backend.sh $ENVIRONMENT"
    exit 1
fi

# Vérification des variables requises
if [ -z "$DATABASE_SECRET_ARN" ] || [ -z "$DATABASE_ENDPOINT" ]; then
    echo "❌ Variables de base de données non définies"
    exit 1
fi

echo "📍 Endpoint BDD: $DATABASE_ENDPOINT"
echo "🔐 Secret ARN: $DATABASE_SECRET_ARN"

# Récupération des credentials depuis Secrets Manager
echo "🔑 Récupération des credentials..."
DB_CREDENTIALS=$(aws secretsmanager get-secret-value \
    --secret-id $DATABASE_SECRET_ARN \
    --region $AWS_REGION \
    --query SecretString --output text)

DB_USER=$(echo $DB_CREDENTIALS | jq -r .username)
DB_PASSWORD=$(echo $DB_CREDENTIALS | jq -r .password)

if [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
    echo "❌ Impossible de récupérer les credentials"
    exit 1
fi

echo "✅ Credentials récupérés"

# Vérification de la connectivité
echo "🔌 Test de connectivité à la base de données..."
if ! mysql -h $DATABASE_ENDPOINT -u $DB_USER -p$DB_PASSWORD -e "SELECT 1;" 2>/dev/null; then
    echo "❌ Impossible de se connecter à la base de données"
    echo "💡 Vérifiez que vous êtes dans le bon réseau (VPN ou bastion host)"
    exit 1
fi

echo "✅ Connectivité confirmée"

# Répertoire des scripts SQL
SQL_DIR="../server/database"
if [ ! -d "$SQL_DIR" ]; then
    echo "❌ Répertoire $SQL_DIR non trouvé"
    exit 1
fi

# Liste des scripts à exécuter dans l'ordre
SCRIPTS=(
    "schema-fixed.sql"
    "seed-functions.sql"
    "seed-grille-interpretation.sql"
    "seed-sample-data.sql"
)

echo "📝 Exécution des scripts de migration..."

for script in "${SCRIPTS[@]}"; do
    if [ -f "$SQL_DIR/$script" ]; then
        echo "⏳ Exécution de $script..."
        mysql -h $DATABASE_ENDPOINT \
              -u $DB_USER \
              -p$DB_PASSWORD \
              maturity_assessment < "$SQL_DIR/$script"
        echo "✅ $script exécuté avec succès"
    else
        echo "⚠️  Script $script non trouvé, ignoré"
    fi
done

# Vérification de la migration
echo "🔍 Vérification de la migration..."

TABLES=$(mysql -h $DATABASE_ENDPOINT \
               -u $DB_USER \
               -p$DB_PASSWORD \
               -D maturity_assessment \
               -e "SHOW TABLES;" -s -N | wc -l)

echo "📊 Nombre de tables créées: $TABLES"

if [ $TABLES -gt 0 ]; then
    echo "✅ Migration réussie!"
    
    # Affichage des tables créées
    echo ""
    echo "📋 Tables créées:"
    mysql -h $DATABASE_ENDPOINT \
          -u $DB_USER \
          -p$DB_PASSWORD \
          -D maturity_assessment \
          -e "SHOW TABLES;" | column -t
else
    echo "❌ Aucune table trouvée, la migration a échoué"
    exit 1
fi

# Test des données de base
echo ""
echo "🧪 Vérification des données de base..."

FONCTIONS_COUNT=$(mysql -h $DATABASE_ENDPOINT \
                        -u $DB_USER \
                        -p$DB_PASSWORD \
                        -D maturity_assessment \
                        -e "SELECT COUNT(*) FROM fonctions;" -s -N)

GRILLE_COUNT=$(mysql -h $DATABASE_ENDPOINT \
                     -u $DB_USER \
                     -p$DB_PASSWORD \
                     -D maturity_assessment \
                     -e "SELECT COUNT(*) FROM grille_interpretation;" -s -N)

echo "📊 Fonctions: $FONCTIONS_COUNT"
echo "📊 Grille d'interprétation: $GRILLE_COUNT"

echo ""
echo "✅ Migration de base de données terminée avec succès!"
echo ""
echo "📊 Résumé:"
echo "┌─────────────────────────────────────────────────────────────────┐"
echo "│ 🗄️  Database: maturity_assessment"
echo "│ 📍 Endpoint: $DATABASE_ENDPOINT"
echo "│ 📋 Tables: $TABLES"
echo "│ 🔧 Fonctions: $FONCTIONS_COUNT"
echo "│ 📏 Grille: $GRILLE_COUNT"
echo "└─────────────────────────────────────────────────────────────────┘"
echo ""
echo "🎯 Prochaines étapes:"
echo "1. 🧪 Tester l'API: curl $API_URL/health"
echo "2. 🔌 Tester la connectivité BDD: curl $API_URL/api/fonctions"
echo "3. 🌐 Configurer le frontend avec la nouvelle API URL"