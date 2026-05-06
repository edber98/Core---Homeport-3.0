# syntax=docker/dockerfile:1
# ──────────────────────────────────────────────────────────────────
# Kinn backend — image multi-stage (dev + prod) incluant la sandbox
# d'exécution de code (bwrap + Python + Node + LibreOffice + Chromium).
# ──────────────────────────────────────────────────────────────────
FROM node:24.6.0-alpine AS dependencies

WORKDIR /app

# Dépendances système pour la sandbox + skills bundle :
#   bubblewrap + util-linux  → isolation userns + prlimit pour execute_code
#   python3 + py3-pip        → runtime Python pour skills (docx edit, xlsx, pdf, ...)
#   libreoffice + poppler    → conversion docx/pptx → PDF + pdf2image
#   chromium + fonts         → Playwright / puppeteer (web_fetch rendered, export PDF)
#   build-base + *-dev       → compilation lxml, Pillow, matplotlib (nécessaire sur Alpine)
RUN apk add --no-cache \
      bubblewrap util-linux \
      python3 py3-pip \
      ca-certificates curl \
      build-base python3-dev libffi-dev openssl-dev \
      libxml2-dev libxslt-dev jpeg-dev zlib-dev freetype-dev \
      nss freetype harfbuzz ttf-freefont font-noto-emoji \
      chromium \
      libreoffice \
      poppler-utils

# ── Python : packages les plus utilisés par les skills et generate_document
# Installés dans le SAME interpréteur que celui utilisé par la sandbox
# (AI_SANDBOX_PYTHON=python3). `install_package` déposera les libs dynamiques
# dans /data/sandbox-pkgs/python (volume) et l'import les trouvera via PYTHONPATH.
RUN pip3 install --no-cache-dir --break-system-packages \
      python-docx python-pptx openpyxl pandas python-dateutil \
      requests beautifulsoup4 lxml Pillow pypdf readability-lxml \
      matplotlib seaborn numpy \
      reportlab 'qrcode[pil]' pdfplumber markdown \
      xlrd xlwt \
      defusedxml pdf2image \
 && rm -rf /var/cache/apk/* /root/.cache/pip

# ── Node : packages globaux utilisés par les skills et tools
# `docx` (Anthropic SKILL.md pour création de documents Word) + autres.
# Ces libs sont aussi dans API/package.json mais on les installe en global
# pour que execute_code (mode node) puisse les require via NODE_PATH.
RUN npm install -g --omit=dev \
      docx pptxgenjs \
      date-fns csv-parse xlsx mammoth cheerio turndown undici \
      @mozilla/readability archiver jsdom marked \
 && npm cache clean --force

# Chromium déjà installé via apk → évite le téléchargement Playwright
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/lib/chromium \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Env sandbox — valeurs par défaut surchargeables via docker-compose
ENV AI_SANDBOX_BACKEND=auto \
    AI_SANDBOX_PYTHON=/usr/bin/python3 \
    AI_SANDBOX_NODE=/usr/bin/node \
    AI_SANDBOX_NPM=/usr/bin/npm \
    AI_SANDBOX_PY_SITE_PACKAGES=/data/sandbox-pkgs/python \
    AI_SANDBOX_NODE_MODULES=/data/sandbox-pkgs/node \
    SKILLS_BUNDLE_DIR=/app/skills-bundle \
    AI_STREAM_TIMEOUT_MS=240000

# package.json d'abord pour cacher npm install derrière un layer
COPY API/package*.json ./
RUN npm install --unsafe-perm && npm cache clean --force

# Puis le code + les skills (copié séparément pour cache plus efficace)
COPY API/ ./

# Pré-crée les dossiers shared site-packages (volumes montés en override)
RUN mkdir -p /data/sandbox-pkgs/python /data/sandbox-pkgs/node

# ────────────────────────────────────────
FROM dependencies AS development
COPY --chown=node:node scripts/install-docker.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/install-docker.sh
EXPOSE 5055
ENTRYPOINT ["install-docker.sh"]
CMD ["npm", "run", "dev"]

# ────────────────────────────────────────
FROM dependencies AS production
ENV NODE_ENV=production
COPY --chown=node:node scripts/install-docker.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/install-docker.sh
EXPOSE 5055
ENTRYPOINT ["install-docker.sh"]
CMD ["npm", "start"]
