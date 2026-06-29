# ⚡ Guia Rápido - Novas Funcionalidades v2.0

Bem-vindo à versão 2.0 com 15 melhorias implementadas! 🚀

---

## 🚀 Iniciar Rápido (2 min)

```bash
# 1. Instale dependências (já feito)
npm install

# 2. Configure .env (já feito)
# (GEMINI_API_KEY, XAI_API_KEY, PAINEL_API_KEY)

# 3. Inicie o servidor
npm start

# 4. Acesse o painel
# http://localhost:3099
```

**Pronto!** Todos os novos recursos funcionam automaticamente.

---

## 📝 1. Verificar Logs

### Ver logs em tempo real:
```bash
tail -f logs/app-2026-06-25.log
```

### Ver erros apenas:
```bash
tail -f logs/errors-2026-06-25.log
```

### Via API:
```bash
# Últimos 100 logs
curl http://localhost:3099/api/logs?linhas=100

# Últimos 50 erros
curl http://localhost:3099/api/logs/erros?linhas=50
```

---

## 🏥 2. Health Check

### Verificar saúde do sistema:
```bash
curl http://localhost:3099/api/health
```

**Resposta esperada:**
```json
{
  "database": "healthy",
  "whatsapp": "healthy (1 conectado)",
  "disk": "healthy",
  "memory": {
    "used": "120MB",
    "total": "256MB",
    "percent": 47
  },
  "uptime": "3600s"
}
```

**Monitora automaticamente a cada 1 minuto**

---

## 💾 3. Backup & Restauração

### Criar backup manual:
```bash
curl -X POST http://localhost:3099/api/backup/criar
```

### Listar backups disponíveis:
```bash
curl http://localhost:3099/api/backup/listar
```

**Resposta:**
```json
{
  "backups": [
    {
      "nome": "backup-2026-06-25T15-30-45-000Z.json",
      "tamanho": 1024,
      "data": "2026-06-25T15:30:45Z"
    }
  ]
}
```

### Restaurar um backup:
```bash
curl -X POST http://localhost:3099/api/backup/restaurar \
  -H "Content-Type: application/json" \
  -d '{"caminho": "backups/backup-2026-06-25T15-30-45-000Z.json"}'
```

**Automático:** A cada 6 horas um backup é criado automaticamente

---

## ⚡ 4. Cache

### Ver estatísticas de cache:
```bash
curl http://localhost:3099/api/cache/stats
```

**Resposta:**
```json
{
  "tamanho": 42,
  "hits": 1250,
  "misses": 340,
  "total": 1590,
  "taxaAcerto": "79%",
  "memoria": 256
}
```

### Limpar cache:
```bash
curl -X POST http://localhost:3099/api/cache/limpar
```

**Automático:** Cache expira após 5 minutos (configurável)

---

## 🚦 5. Rate Limiting

### Ver limite de requisições:
```bash
curl http://localhost:3099/api/ratelimit/stats
```

**Limites padrão:**
- Global: 100 req/min
- `/api/lista`: 10 req/min
- `/api/iniciar`: 5 req/min
- Default: 30 req/min

**Se exceder limite:**
```json
{
  "erro": "Limite de requisições excedido para este endpoint"
  // Status: 429
}
```

---

## 🐳 6. Docker (Produção)

### Build de imagem:
```bash
docker build -t fezinha .
```

### Rodar container:
```bash
docker run -p 3099:3099 \
  -e GEMINI_API_KEY=sua_chave \
  -e DB_HOST=seu_host \
  fezinha
```

### Docker Compose (recomendado):
```bash
# Inicia Fezinha + PostgreSQL
docker-compose up -d

# Ver logs
docker-compose logs -f fezinha

# Parar
docker-compose down
```

**Saúde monitorada automaticamente** ✅

---

## 📊 7. PM2 (Gerenciamento de Processo)

### Instalar PM2:
```bash
npm install -g pm2
```

### Iniciar com PM2:
```bash
pm2 start ecosystem.config.js
```

### Ver status:
```bash
pm2 status
pm2 logs fezinha
```

### Configurar inicialização automática:
```bash
pm2 save
pm2 startup
```

**Reinicia automaticamente se falhar** ✅

---

## ⚙️ 8. Configuração Avançada

### Copiar configurações avançadas:
```bash
# Use se quiser ajustar (opcional)
cp .env.advanced .env.advanced.local
```

### Variáveis principais:
```env
# Debug
DEBUG=false
LOG_LEVEL=info
LOG_RETENTION_DAYS=7

# Cache
CACHE_TTL=300  # 5 minutos
CACHE_MAX_SIZE=50  # MB

# Rate Limiting
RATELIMIT_GLOBAL=100  # req/min
RATELIMIT_API_LISTA=10

# Backup
BACKUP_INTERVAL_HOURS=6
BACKUP_RETENTION_DAYS=30
```

---

## 📈 9. Monitoramento Contínuo

### Arquivo de logs estruturados:
```
logs/
├── app-2026-06-25.log      # Todos os logs
└── errors-2026-06-25.log   # Apenas erros
```

### Exemplo de log:
```json
{
  "timestamp": "2026-06-25T15:30:45.123Z",
  "level": "INFO",
  "message": "WhatsApp conectado",
  "sessao": 1,
  "pid": 12345
}
```

### Limpeza automática:
- Logs: últimos 7 dias
- Backups: últimos 30 dias
- Cache: itens expirados a cada 5 minutos

---

## 🔒 10. Segurança

### Health check privado:
```bash
# Sem autenticação (apenas status público)
curl http://localhost:3099/api/health
```

### Logs e backup com autenticação:
```bash
# Com API key no header
curl -H "x-api-key: SUA_CHAVE" \
  http://localhost:3099/api/logs
```

### Rate limiting por IP:
```
Detecta e limita requisições abusivas
automaticamente
```

---

## 🆘 11. Troubleshooting

### Memória alta?
```bash
# Limpar cache
curl -X POST http://localhost:3099/api/cache/limpar

# Verificar status
curl http://localhost:3099/api/health
```

### Banco indisponível?
```bash
# Sistema usa fallback automático
# Dados salvos localmente e sincronizam
# quando banco volta

# Ver arquivo pendente:
cat leads_pendentes.jsonl
```

### Rate limit excedido?
```bash
# Aguarde 1 minuto para reset automático
# Ou reinicie o servidor
npm start
```

### Logs muito grandes?
```bash
# Limpeza automática a cada 7 dias
# Ou remova manual:
rm logs/app-*.log
```

---

## 📞 12. APIs Completas

### Health & Monitoring
```
GET  /api/health              - Status da app
GET  /api/logs?linhas=100     - Últimos logs
GET  /api/logs/erros?linhas=50 - Últimos erros
```

### Cache
```
GET  /api/cache/stats         - Estatísticas
POST /api/cache/limpar        - Limpar tudo
```

### Backup
```
POST /api/backup/criar        - Backup manual
GET  /api/backup/listar       - Listar backups
POST /api/backup/restaurar    - Restaurar backup
```

### Rate Limit
```
GET  /api/ratelimit/stats     - Estatísticas
```

### Originais (ainda funcionam)
```
GET  /api/status              - Status geral
GET  /api/warmup              - Warmup stats
GET  /api/tank/status         - Tank status
GET  /api/analytics           - Analytics completo
POST /api/lista               - Importar CSV
POST /api/iniciar             - Iniciar prospecção
POST /api/tank/carregar       - Carregar fila
POST /api/tank/gerar          - Gerar mensagens
```

---

## ✨ Resumo das Melhorias

| Recurso | Antes | Depois |
|---------|-------|--------|
| Logs | Console | Arquivo + JSON |
| Monitoring | Manual | Automático |
| Backup | Nenhum | 6/6 horas |
| Cache | Sem limite | Com TTL |
| Rate Limit | Básico | Por endpoint |
| Deploy | Manual | Docker + PM2 |
| Recuperação | Manual | Automática |

---

## 🎯 Checklist de Produção

- [ ] `.env` configurado com chaves válidas
- [ ] Banco de dados conectado
- [ ] WhatsApp escaneado
- [ ] Primeiro backup criado (`/api/backup/criar`)
- [ ] Health check retorna "healthy" (`/api/health`)
- [ ] Logs funcionando (`tail -f logs/app-*.log`)
- [ ] Rate limit configurado (se necessário)
- [ ] Docker testado (se usar)
- [ ] PM2 configurado (se usar)

---

## 🚀 Próximo Passo

**Você está pronto para produção!**

```bash
# Opção 1: Local com Node
npm start

# Opção 2: PM2
pm2 start ecosystem.config.js

# Opção 3: Docker
docker-compose up -d
```

**Monitoramento:**
```bash
# Verificar saúde
curl http://localhost:3099/api/health

# Ver logs
tail -f logs/app-*.log
```

---

**Dúvidas?** Leia:
- `MELHORIAS-IMPLEMENTADAS.md` - Detalhes técnicos
- `SETUP-SEGURANCA.md` - Segurança
- `COMECE-AQUI.md` - Início rápido

**Status**: 🟢 **PRONTO PARA PRODUÇÃO**

