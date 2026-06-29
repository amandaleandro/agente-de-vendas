# 🐳 Guia Completo de Dockernização

Documentação das **3 fases** de containerização do Fezinha.

## 📋 Índice

1. [Fase 1: Setup Inicial](#fase-1-setup-inicial)
2. [Fase 2: Variáveis de Ambiente](#fase-2-variáveis-de-ambiente)
3. [Fase 3: Backup Automático](#fase-3-backup-automático)
4. [Comandos Rápidos](#comandos-rápidos)
5. [Troubleshooting](#troubleshooting)

---

## Fase 1: Setup Inicial

### O que foi criado

- **Dockerfile** — Multi-stage build otimizado (Node 20 + Alpine)
- **docker-compose.yml** — Orquestração completa (App + PostgreSQL)
- **.dockerignore** — Otimização de build

### Arquitetura

```
┌─────────────────────────────────────────┐
│         Docker Network Bridge            │
├─────────────────────────────────────────┤
│  fezinha-app:3099       │  fezinha-db   │
│  (Node.js Container)    │  (PostgreSQL) │
└─────────────────────────────────────────┘
       ↓
   Volumes locais
   - auth_info_baileys/
   - sessions/
   - listas/
   - logs/
   - backups/
   - conhecimento/
```

### Requisitos

- Docker >= 20.10
- Docker Compose >= 1.29
- 2GB RAM mínimo
- 3GB espaço em disco

### Primeiros Passos

1. **Copiar variáveis de ambiente:**
   ```bash
   cp .env.docker .env.local
   ```

2. **Editar variáveis sensíveis:**
   ```bash
   # Abra .env.local e configure:
   # - DB_PASSWORD (postgresql)
   # - GEMINI_API_KEY (sua chave do Google)
   # - PAINEL_API_KEY (chave de segurança)
   ```

3. **Gerar chave segura (opcional):**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

4. **Build da imagem:**
   ```bash
   docker-compose build
   ```

5. **Iniciar containers:**
   ```bash
   docker-compose up -d
   ```

6. **Verificar status:**
   ```bash
   docker-compose ps
   ```

### Acessar a Aplicação

- **App (Fezinha):** http://localhost:3099
- **Banco de Dados:** localhost:5432
- **Usuário DB:** postgres
- **Senha DB:** (conforme .env.local)

---

## Fase 2: Variáveis de Ambiente

### Arquivo `.env.docker`

Localização: `.env.docker` (na raiz do projeto)

Este arquivo contém **todas** as variáveis necessárias para rodar Docker.

### Principais Variáveis

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `DB_HOST` | Host do PostgreSQL | `postgres` |
| `DB_PORT` | Porta do PostgreSQL | `5432` |
| `DB_USER` | Usuário do banco | `postgres` |
| `DB_PASSWORD` | Senha (MUDE ISSO!) | `postgres_docker_dev_senha_segura_123` |
| `DB_NAME` | Nome do banco | `agentefecha` |
| `NODE_ENV` | Ambiente | `production` |
| `LOG_LEVEL` | Nível de logs | `info` |
| `GEMINI_API_KEY` | Chave Google GenAI | *(vazio)* |
| `IA_PROVIDER` | IA padrão | `gemini` |
| `PAINEL_API_KEY` | Chave do painel | *(vazio)* |

### Configurar para Produção

1. **Criar `.env.prod`:**
   ```bash
   cp .env.docker .env.prod
   ```

2. **Editar variáveis sensíveis:**
   - `DB_PASSWORD` → senha forte
   - `GEMINI_API_KEY` → sua chave real
   - `PAINEL_API_KEY` → chave criptografada
   - `NODE_ENV` → `production`

3. **Usar no docker-compose:**
   ```bash
   docker-compose --env-file .env.prod up -d
   ```

### Secrets do Docker (Produção Avançada)

Para produção em cluster:

```yaml
# docker-compose.yml
services:
  fezinha:
    environment:
      DB_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

---

## Fase 3: Backup Automático

### Scripts de Backup

#### Script Manual

```bash
# Fazer backup agora
./scripts/backup-db.sh

# Com parâmetros customizados
./scripts/backup-db.sh fezinha-db agentefecha postgres
```

Resultado: `backups/backup_agentefecha_YYYYMMDD_HHMMSS.sql.gz`

#### Cron Job (Linux/Mac)

```bash
# Editar crontab
crontab -e

# Adicionar linha (backup diário às 2 da manhã)
0 2 * * * cd /path/para/agente-de-vendas && ./scripts/backup-db.sh
```

#### Task Scheduler (Windows)

```powershell
# PowerShell (como Admin)
$action = New-ScheduledTaskAction -Execute "docker" `
  -Argument "exec fezinha-db pg_dump -U postgres agentefecha | gzip > backups/backup_$(Get-Date -f yyyyMMdd_HHmmss).sql.gz"

$trigger = New-ScheduledTaskTrigger -Daily -At 2am

Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "FezinhaBackup"
```

### Restaurar Backup

```bash
# Restaurar arquivo
gunzip -c backups/backup_agentefecha_20260626_020000.sql.gz | \
  docker exec -i fezinha-db psql -U postgres -d agentefecha

# Ou usando restauração em background
docker exec -i fezinha-db psql -U postgres agentefecha < backup.sql
```

### Volume Persistente de Backups

Backups são salvos em:
```
./backups/
├── backup_agentefecha_20260626_020000.sql.gz
├── backup_agentefecha_20260625_020000.sql.gz
└── ...
```

**Apenas 7 últimos backups** são mantidos (script limpa automaticamente).

---

## Comandos Rápidos

### Gerenciar Containers

```bash
# Iniciar (background)
docker-compose up -d

# Parar
docker-compose down

# Parar com limpeza (remove volumes)
docker-compose down -v

# Ver logs
docker-compose logs -f fezinha

# Ver logs do banco
docker-compose logs -f postgres

# Acessar shell do app
docker exec -it fezinha-app sh

# Acessar psql do banco
docker exec -it fezinha-db psql -U postgres -d agentefecha
```

### Monitoramento

```bash
# Ver status
docker-compose ps

# Ver uso de recursos
docker stats

# Ver imagens
docker images

# Ver volumes
docker volume ls
```

### Desenvolvimento

```bash
# Build sem cache
docker-compose build --no-cache

# Rebuild e restart
docker-compose up -d --build

# Logs em tempo real
docker-compose logs -f --tail=50
```

### Limpeza

```bash
# Remove containers parados
docker container prune

# Remove imagens não usadas
docker image prune

# Remove volumes não usados
docker volume prune

# Limpeza completa (CUIDADO!)
docker system prune -a
```

---

## Troubleshooting

### Problema: Banco não está respondendo

```bash
# Verificar status
docker-compose ps postgres

# Ver logs
docker-compose logs postgres

# Resetar banco (⚠️ PERDERÁ DADOS)
docker-compose down -v
docker-compose up -d
```

### Problema: App não consegue conectar ao banco

```bash
# Verificar conexão
docker exec fezinha-app wget -O- http://postgres:5432

# Verificar variáveis de ambiente
docker exec fezinha-app env | grep DB_

# Entrar no shell e testar
docker exec -it fezinha-app sh
# Dentro do container:
# node -e "const pg = require('pg'); const pool = new pg.Pool(...); pool.query('SELECT 1')"
```

### Problema: Porta já está em uso

```bash
# Ver qual processo está usando port 3099
lsof -i :3099  # Linux/Mac
netstat -ano | findstr :3099  # Windows

# Mudar porta no docker-compose.yml
# Antes:  - "3099:3099"
# Depois: - "3100:3099"
```

### Problema: Sem espaço em disco

```bash
# Ver uso de Docker
docker system df

# Remover imagens antigas
docker image prune -a

# Remover logs antigos
docker system prune --volumes
```

### Problema: Health check falha

```bash
# Ver detalhes do health check
docker inspect --format='{{json .State.Health}}' fezinha-app

# Aumentar timeout (editar docker-compose.yml)
healthcheck:
  start_period: 30s  # Aumentar de 5s
```

---

## Estrutura Final de Arquivos

```
agente-de-vendas/
├── Dockerfile                 # ✅ Fase 1
├── docker-compose.yml         # ✅ Fase 1
├── .dockerignore             # ✅ Fase 1
├── .env.docker               # ✅ Fase 2
├── .env.local                # Cópia editável (gitignore)
├── scripts/
│   ├── init-db.sql           # ✅ Fase 1 (init)
│   └── backup-db.sh          # ✅ Fase 3
├── backups/                  # Volumes (gitignore)
├── logs/                     # Volumes (gitignore)
├── auth_info_baileys/        # Volumes (gitignore)
└── DOCKER-SETUP.md          # Este arquivo
```

---

## Próximos Passos

- [ ] Copiar `.env.docker` para `.env.local` e editar
- [ ] Rodar `docker-compose build`
- [ ] Rodar `docker-compose up -d`
- [ ] Verificar logs com `docker-compose logs -f fezinha`
- [ ] Acessar http://localhost:3099 e testar
- [ ] Configurar backups automáticos com cron/Task Scheduler
- [ ] Em produção: usar secrets e variáveis de ambiente seguras

---

## Suporte

Para problemas específicos, verifique:

1. **Logs da aplicação:** `docker-compose logs fezinha`
2. **Status do banco:** `docker-compose logs postgres`
3. **Health check:** `docker inspect fezinha-app`
4. **Documentação Docker:** https://docs.docker.com

---

**Última atualização:** 26/06/2026
**Versão:** 1.0.0
