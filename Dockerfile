# Dockerfile
FROM node:22-alpine AS builder

# Installer les dépendances système nécessaires
RUN apk add --no-cache python3 make g++ curl

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances (production seulement)
RUN npm ci --only=production --legacy-peer-deps

# Étape de production
FROM node:22-alpine AS production

# Installer curl pour health checks
RUN apk add --no-cache curl

# L'utilisateur 'node' existe déjà dans l'image node:alpine, on l'utilise directement
USER node

WORKDIR /app

# Copier les dépendances installées
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

# Copier le code source
COPY --chown=node:node server/ ./server/
COPY --chown=node:node package*.json ./

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3000

# Exposer le port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Commande de démarrage
CMD ["node", "server/server.js"]