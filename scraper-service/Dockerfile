FROM node:20-bookworm-slim

# Puppeteer/Chromium system dependencies. The list below matches what
# `puppeteer`'s postinstall expects on Debian Bookworm. The Chromium that
# Puppeteer downloads is used at runtime (we do NOT rely on the bundled
# Windows chrome/win64-... folder from the parent repo).
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc-s1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxkbcommon0 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    wget \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false \
    NODE_ENV=production

WORKDIR /app

# Install ALL deps (including dev) so @types/express, @types/puppeteer and
# typescript are present for the tsc compile step.
COPY package.json ./
RUN npm install --include=dev

COPY tsconfig.json ./
COPY src ./src
RUN npx tsc -p tsconfig.json && \
    npm prune --omit=dev

ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/index.js"]
