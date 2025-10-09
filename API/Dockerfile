
FROM node:24.6.0-alpine AS dependencies
# Mise à jour des paquets et installation des dépendances système nécessaires
WORKDIR /app
COPY API/ ./
# Copie des fichiers package et installation des dépendances Node
COPY API/package*.json ./
RUN npm install --unsafe-perm
# Indique à Puppeteer d'utiliser le Chromium installé et de ne pas télécharger sa version par défaut
# ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
FROM dependencies AS development
COPY --chown=node:node ./API/ ./
# Copie du script à exécuter après le démarrage du container
COPY --chown=node:node scripts/install-docker.sh /usr/local/bin/
# Attribution des droits d'exécution au script
RUN chmod +x /usr/local/bin/install-docker.sh
EXPOSE 5055
ENTRYPOINT [ "install-docker.sh" ]
CMD ["npm", "run", "dev"]
FROM dependencies AS production
COPY --chown=node:node ./API/ ./
# Copie du script à exécuter après le démarrage du container
COPY --chown=node:node scripts/install-docker.sh /usr/local/bin/
# Attribution des droits d'exécution au script
RUN chmod +x /usr/local/bin/install-docker.sh
EXPOSE 5055
ENTRYPOINT [ "install-docker.sh" ]
CMD ["npm", "start"]