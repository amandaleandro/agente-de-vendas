# Multi-stage build para otimizar tamanho
FROM node:20-alpine AS builder

WORKDIR /app

# 1. Build do Frontend
COPY frontend ./frontend
WORKDIR /app/frontend
RUN npm ci || npm install
RUN npm run build

# 2. Build do Backend
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --only=production

# ========================================
# Stage final
FROM node:20-alpine

WORKDIR /app

# Instalar ferramentas essenciais
RUN apk add --no-cache curl

# Copiar dependências do backend
COPY --from=builder /app/backend/node_modules ./backend/node_modules

# Copiar código do backend
COPY backend ./backend

# Copiar a versão buildada do frontend
COPY --from=builder /app/frontend/dist ./frontend/dist

# Criar diretórios necessários no backend
RUN mkdir -p backend/logs backend/backups backend/listas backend/conhecimento backend/sessions backend/auth_info_baileys

# Definir usuário não-root
RUN addgroup -g 1001 fezinha && \
    adduser -D -u 1001 -G fezinha fezinha && \
    chown -R fezinha:fezinha /app

USER fezinha
WORKDIR /app/backend

# Expor porta
EXPOSE 3099

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048 --max-http-header-size=16384"
ENV PROSPECCAO_ATIVA=true
ENV PROSPECCAO_AGENDA_ATIVA=true

# Health check (deve vir antes de ENTRYPOINT e CMD)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3099/api/status || exit 1

# Iniciar bot
CMD ["node", "index.js"]
