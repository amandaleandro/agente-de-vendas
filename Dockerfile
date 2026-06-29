FROM node:20-alpine

WORKDIR /app

# Instalar dependências do sistema
RUN apk add --no-cache \
    curl \
    git \
    python3 \
    make \
    g++

# Copiar arquivos
COPY backend/package*.json ./backend/
COPY frontend ./frontend/

# Instalar dependências Node
WORKDIR /app/backend
RUN npm ci --omit=dev

# Expor porta
EXPOSE 3099

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048 --max-http-header-size=16384"
ENV PROSPECCAO_ATIVA=true
ENV PROSPECCAO_AGENDA_ATIVA=true

# Iniciar bot
CMD ["node", "index.js"]
