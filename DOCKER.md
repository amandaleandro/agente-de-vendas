# 🐳 Guia Docker - FechaPro

Executar FechaPro em Docker é simples! Tudo roda em containers isolados.

---

## 📋 Pré-requisitos

- **Docker** 20.10+
- **Docker Compose** 2.0+
- **Git** (para clonar)

### Instalar Docker

**Windows/Mac**:
- Download [Docker Desktop](https://www.docker.com/products/docker-desktop)

**Linux**:
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

---

## 🚀 Rodar Localmente

### 1. Setup Inicial

```bash
# Clonar/acessar o repositório
cd agente-de-vendas

# Copiar arquivo de configuração
cp .env.example .env

# Editar .env com suas API keys (IMPORTANTE!)
nano .env
# Mínimo necessário:
# - GEMINI_API_KEY (obrigatório)
# - DB_PASSWORD (segurança)
```

### 2. Iniciar os Containers

```bash
# Build + start em modo detached
docker-compose up -d

# Ver logs em tempo real
docker-compose logs -f

# Ver logs específicos
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### 3. Acessar a Aplicação

- **Frontend (React)**: http://localhost
- **Backend (API)**: http://localhost:3099
- **API Docs**: http://localhost:3099/api/health

---

## 🧪 Verificar Saúde

```bash
# Ver status dos containers
docker-compose ps

# Verificar health checks
docker ps --format "table {{.Names}}\t{{.Status}}"

# Logs do banco de dados
docker-compose logs postgres

# Testar API
curl http://localhost:3099/api/whatsapp-status
```

---

## 📊 Ports Padrão

| Serviço | Port | URL |
|---------|------|-----|
| Frontend | 80 | http://localhost |
| Backend API | 3099 | http://localhost:3099 |
| PostgreSQL | 5432 | localhost:5432 |

Customize em `.env`:
```bash
WEB_PORT=3000          # Frontend
API_PORT=3099          # Backend
DB_PORT=5432           # Database
```

---

## 🛑 Parar/Remover

```bash
# Parar containers (mantém dados)
docker-compose stop

# Parar e remover containers
docker-compose down

# Remover TUDO (volumes, networks, etc)
docker-compose down -v
```

---

## 🔧 Troubleshooting

### "Port já está em uso"

```bash
# Mudar port em .env
WEB_PORT=3001
API_PORT=3100

# Ou liberar porta
lsof -i :80
kill -9 <PID>
```

### "Postgres não inicia"

```bash
# Ver logs
docker-compose logs postgres

# Reset do banco
docker-compose down -v
docker-compose up -d
```

### "Frontend mostra erro"

```bash
# Rebuild
docker-compose down
docker-compose up -d --build

# Ver logs
docker-compose logs frontend
```

---

## 🔐 Variáveis de Ambiente Importantes

```bash
# OBRIGATÓRIO
GEMINI_API_KEY=seu_api_key_aqui

# RECOMENDADO (segurança)
DB_PASSWORD=senha_segura_aqui
NODE_ENV=production

# OPCIONAL (integrações)
SLACK_WEBHOOK_URL=seu_webhook
PIPEDRIVE_API_KEY=seu_key
HUBSPOT_API_KEY=seu_key
```

---

## 📦 Build Manual

Se quiser fazer build sem rodar:

```bash
# Build apenas
docker-compose build

# Build sem cache
docker-compose build --no-cache

# Build de um serviço específico
docker-compose build backend
docker-compose build frontend
```

---

## 🌐 Deploy em Produção

### Opção 1: Heroku

```bash
# Instalar CLI
curl https://cli.heroku.com/install.sh | sh

# Login
heroku login

# Criar app
heroku create seu-app-name

# Deploy
git push heroku main
```

### Opção 2: AWS ECS

```bash
# Criar ECR repository
aws ecr create-repository --repository-name fechapro

# Login ECR
aws ecr get-login-password | docker login --username AWS --password-stdin <seu-registry>

# Build e push
docker build -t fechapro-api -f Dockerfile.backend .
docker tag fechapro-api:latest <seu-registry>/fechapro-api:latest
docker push <seu-registry>/fechapro-api:latest
```

### Opção 3: DigitalOcean App Platform

1. Conectar GitHub repo
2. Configure `Dockerfile.backend` e `Dockerfile.frontend`
3. Set environment variables
4. Deploy!

---

## 📊 Monitorar Recursos

```bash
# Ver uso de CPU/Memória
docker stats

# Ver detalhes de um container
docker inspect fechapro-api

# Histórico de logs com timestamp
docker-compose logs --timestamps
```

---

## 🔄 Updates

Para atualizar o código:

```bash
# Pull latest
git pull origin main

# Rebuild containers
docker-compose down
docker-compose up -d --build

# Verificar health
docker-compose ps
```

---

## 📞 Suporte Docker

- `docker ps` - Ver containers rodando
- `docker logs <container>` - Ver logs
- `docker exec <container> <cmd>` - Executar comando dentro
- `docker volume ls` - Listar volumes
- `docker network ls` - Listar networks

---

**Pronto!** 🚀 Seu FechaPro está rodando em Docker!

Acesse: **http://localhost** para a demo interativa  
API: **http://localhost:3099** para testar endpoints
