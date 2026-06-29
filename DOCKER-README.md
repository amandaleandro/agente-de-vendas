# 🐳 Fezinha Dockerizado - Quick Start

**Versão:** 1.0.0 | **Data:** 26/06/2026

---

## ⚡ Iniciar em 5 Minutos

### Windows (PowerShell)

```powershell
# 1️⃣ Fazer setup inicial
.\docker-quick.ps1 setup

# 2️⃣ Ver logs
.\docker-quick.ps1 logs

# 3️⃣ Acessar app
# http://localhost:3099
```

### Linux/Mac (Make)

```bash
# 1️⃣ Fazer setup inicial
make setup

# 2️⃣ Ver logs
make logs

# 3️⃣ Acessar app
# http://localhost:3099
```

---

## 📦 O que foi criado (Fases 1-3)

### Fase 1: Containers Básicos
- ✅ **Dockerfile** — Multi-stage build otimizado (Node 20 Alpine)
- ✅ **docker-compose.yml** — App (Node) + BD (PostgreSQL) + Redes
- ✅ **docker.ignore** — Otimização de build
- ✅ **scripts/init-db.sql** — Inicialização automática do banco

### Fase 2: Variáveis de Ambiente
- ✅ **.env.docker** — Todas as variáveis necessárias documentadas
- ✅ **Integração com docker-compose** — Carregamento automático

### Fase 3: Backup Automático
- ✅ **scripts/backup-db.sh** — Script de backup com limpeza automática (7 últimos)
- ✅ **backups/** — Diretório persistente
- ✅ **Integração com cron/Task Scheduler** — Documentação incluída

---

## 📋 Arquivos Principais

```
agente-de-vendas/
├── 📦 DOCKER SETUP
│   ├── Dockerfile                 # Build multi-stage
│   ├── docker-compose.yml         # Orquestração (App + DB)
│   ├── .dockerignore             # Otimização
│   ├── .env.docker               # Variáveis (Fase 2)
│   ├── scripts/
│   │   ├── init-db.sql           # Init do banco
│   │   └── backup-db.sh          # Backup auto (Fase 3)
│   ├── Makefile                  # Comandos (Linux/Mac)
│   └── docker-quick.ps1          # Comandos (Windows)
│
├── 📚 DOCUMENTAÇÃO
│   ├── DOCKER-SETUP.md           # Guia COMPLETO (3 fases)
│   ├── DOCKER-README.md          # Este arquivo (quick start)
│   └── README-ORIGINAL.md        # (original do projeto)
│
├── 🔐 SEGURANÇA
│   └── .gitignore                # Proteção de dados sensíveis
│
└── 🐳 VOLUMES (Git-ignored)
    ├── backups/                  # Backups SQL
    ├── logs/                     # Logs da app
    ├── auth_info_baileys/        # Sessões WhatsApp
    ├── sessions/                 # Sessões do app
    ├── listas/                   # Listas de prospecção
    └── conhecimento/             # Base de conhecimento
```

---

## 🚀 Comandos Rápidos

### Windows (PowerShell)

| Comando | Descrição |
|---------|-----------|
| `.\docker-quick.ps1 up` | Iniciar |
| `.\docker-quick.ps1 down` | Parar |
| `.\docker-quick.ps1 logs` | Ver logs (tempo real) |
| `.\docker-quick.ps1 shell` | Acessar shell do app |
| `.\docker-quick.ps1 db-shell` | Acessar psql |
| `.\docker-quick.ps1 backup` | Fazer backup agora |
| `.\docker-quick.ps1 backup-ls` | Listar backups |

### Linux/Mac (Make)

| Comando | Descrição |
|---------|-----------|
| `make up` | Iniciar |
| `make down` | Parar |
| `make logs` | Ver logs (tempo real) |
| `make shell` | Acessar shell do app |
| `make db-shell` | Acessar psql |
| `make backup` | Fazer backup agora |
| `make backup-list` | Listar backups |

---

## 🔐 Variáveis de Ambiente (Fase 2)

O arquivo `.env.docker` contém:

```env
# Banco de Dados
DB_HOST=postgres           # (não mudar - Docker)
DB_PORT=5432             # (não mudar - Docker)
DB_USER=postgres         # (pode mudar)
DB_PASSWORD=***          # ⚠️ MUDE ISTO!
DB_NAME=agentefecha      # (pode mudar)

# IA
GEMINI_API_KEY=***       # ⚠️ COLOQUE SUA CHAVE!
XAI_API_KEY=             # (opcional)

# Segurança
PAINEL_API_KEY=***       # ⚠️ GERE UMA CHAVE!
```

**⚠️ Nunca commitar `.env.local` ou `.env.prod` com dados reais!**

---

## 💾 Backup Automático (Fase 3)

### Fazer backup agora:
```bash
# Windows
.\docker-quick.ps1 backup

# Linux/Mac
make backup
```

### Backup automático (Cron)

**Linux/Mac:**
```bash
# Adicione ao crontab (backup diário às 2am)
0 2 * * * cd /path/to/agente-de-vendas && ./scripts/backup-db.sh
```

**Windows:**
```powershell
# Task Scheduler (Admin)
Register-ScheduledTask -TaskName "FezinhaBackup" `
  -Trigger (New-ScheduledTaskTrigger -Daily -At 2am) `
  -Action (New-ScheduledTaskAction -Execute "docker" `
    -Argument "exec fezinha-db pg_dump -U postgres agentefecha | Out-File backups/backup_$(Get-Date -f yyyyMMdd).sql")
```

---

## 📖 Documentação Completa

Para documentação detalhada com troubleshooting, configuração avançada e mais:

👉 **[DOCKER-SETUP.md](DOCKER-SETUP.md)** ← Leia este arquivo para:
- Arquitetura completa
- Produção com secrets
- Restauração de backups
- Troubleshooting
- Health checks avançados

---

## ✅ Checklist de Setup

- [ ] Copiar `.env.docker` para `.env.local`
- [ ] Editar `.env.local` com suas chaves (GEMINI_API_KEY, DB_PASSWORD, etc)
- [ ] Rodar `docker-compose build`
- [ ] Rodar `docker-compose up -d`
- [ ] Verificar logs: `docker-compose logs -f fezinha`
- [ ] Testar app: http://localhost:3099
- [ ] Fazer primeiro backup: `make backup` ou `.\docker-quick.ps1 backup`
- [ ] Configurar backup automático (cron/Task Scheduler)

---

## 🐛 Problemas Comuns

### Porta 3099 já está em uso
```bash
# Mudar porta (editar docker-compose.yml)
# De:   - "3099:3099"
# Para: - "3100:3099"
```

### Banco não conecta
```bash
# Ver logs do banco
docker-compose logs postgres

# Resetar (⚠️ PERDERÁ DADOS)
docker-compose down -v
docker-compose up -d
```

### Health check falha
```bash
# Aumentar timeout (editar docker-compose.yml)
healthcheck:
  start_period: 30s  # Aumentar de 5s
```

Para mais, veja **[DOCKER-SETUP.md - Troubleshooting](DOCKER-SETUP.md#troubleshooting)**

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────┐
│         Docker Compose Network               │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────────┐    ┌─────────────┐   │
│  │  fezinha-app     │───▶│ fezinha-db  │   │
│  │  (Node 20)       │    │(PostgreSQL) │   │
│  │  Port: 3099      │    │Port: 5432   │   │
│  └──────────────────┘    └─────────────┘   │
│         │                      │             │
│         └──────────────────────┘             │
│         Volumes Persistentes:               │
│         - auth_info_baileys/               │
│         - sessions/                        │
│         - backups/                         │
│         - logs/                            │
│         - conhecimento/                    │
│                                             │
└─────────────────────────────────────────────┘
          ↓
    Seu computador
    localhost:3099
```

---

## 📚 Próximos Passos

1. **Ler DOCKER-SETUP.md** — Guia completo (5 min)
2. **Fazer setup** — `make setup` ou `.\docker-quick.ps1 setup` (2 min)
3. **Testar app** — http://localhost:3099
4. **Configurar backup automático** — Cron ou Task Scheduler
5. **Deploy em produção** — Usar `.env.prod` e secrets

---

## 📞 Suporte

| Problema | Solução |
|----------|---------|
| App não inicia | `docker-compose logs fezinha` |
| Banco indisponível | `docker-compose logs postgres` |
| Port em uso | Mudar porta em `docker-compose.yml` |
| Sem espaço | `docker system prune -a` |
| Precisa de help | Ver `DOCKER-SETUP.md` |

---

**🎉 Pronto! Sua aplicação está Dockerizada em 3 fases!**

- Fase 1: Containers básicos ✅
- Fase 2: Variáveis de ambiente ✅
- Fase 3: Backup automático ✅

Qualquer dúvida, consulte **[DOCKER-SETUP.md](DOCKER-SETUP.md)**
