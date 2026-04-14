
FROM node:24.6.0-alpine AS dependencies
# Mise à jour des paquets et installation des dépendances système nécessaires
WORKDIR /app

# --- Sandbox d'exécution de code (bubblewrap + Python runtime) ---
# Note : l'image est Alpine. Équivalents apk des paquets Debian demandés.
#   bubblewrap       → isolation userns pour `execute_code`
#   util-linux       → fournit /usr/bin/prlimit
#   python3 + py-pip → runtime Python + installer
#   ca-certificates  → racines TLS pour requests/urllib
# Les paquets Python lourds (lxml, Pillow, pandas, matplotlib) nécessitent
# des headers C lors du build ; on les installe via --break-system-packages
# pour coller à l'équivalent apt demandé en prod.
RUN apk add --no-cache \
      bubblewrap util-linux \
      python3 py3-pip \
      ca-certificates curl \
      build-base python3-dev libffi-dev openssl-dev \
      libxml2-dev libxslt-dev jpeg-dev zlib-dev freetype-dev \
      # Playwright / headless Chromium runtime deps (Alpine equivalents)
      nss freetype harfbuzz ttf-freefont font-noto-emoji \
      chromium \
 && pip3 install --no-cache-dir --break-system-packages \
      python-docx python-pptx openpyxl pandas python-dateutil \
      requests beautifulsoup4 lxml Pillow pypdf readability-lxml \
      matplotlib seaborn numpy \
 && rm -rf /var/cache/apk/*

# Librairies Node.js pré-installées globalement (utilisables depuis la sandbox
# si on bind-mount /usr/lib/node_modules en lecture seule côté bwrap).
# pptxgenjs est nécessaire pour le skill `pptx-designed`.
RUN npm install -g --omit=dev \
      pptxgenjs \
      date-fns csv-parse xlsx mammoth cheerio turndown undici @mozilla/readability \
      archiver jsdom
# Use the system Chromium installed by apk above (smaller image than playwright-deps)
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/lib/chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

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