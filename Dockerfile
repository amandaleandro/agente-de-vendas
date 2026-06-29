# Multi-stage build para otimizar tamanho
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar package.json
COPY package.json package-lock.json ./

# Instalar dependências
RUN npm ci --only=production

# ========================================
# Stage final
FROM node:20-alpine

WORKDIR /app

# Instalar ferramentas essenciais
RUN apk add --no-cache curl

# Copiar dependências do builder
COPY --from=builder /app/node_modules ./node_modules

# Copiar código
COPY . .

# Criar diretórios necessários
RUN mkdir -p logs backups listas conhecimento sessions auth_info_baileys

# Definir usuário não-root
RUN addgroup -g 1001 fezinha && \
    adduser -D -u 1001 -G fezinha fezinha && \
    chown -R fezinha:fezinha /app

USER fezinha

# Expor porta
EXPOSE 3099

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV LOG_LEVEL=info

# Health check (deve vir antes de ENTRYPOINT e CMD)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3099/health || exit 1

# Iniciar aplicação (painel web + api server + bot)
CMD ["sh", "-c", "node painel.js & node server-api.js & node index.js"]
