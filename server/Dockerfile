FROM node:18-alpine

# Installer curl pour health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copier package.json et package-lock.json (contexte = racine du projet)
COPY package*.json ./

# Installer les dépendances
RUN if [ -f "package-lock.json" ]; then \
        npm ci --only=production; \
    else \
        npm install --only=production; \
    fi

# Copier le code du serveur
COPY . ./

# Exposer le port
EXPOSE 3000

# Variables d'environnement
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Démarrer l'application
CMD ["node", "server.js"]