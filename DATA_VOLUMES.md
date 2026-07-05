# 📦 Persistência de Dados - Docker Volumes

## ✅ Problema Resolvido

Os dados agora **persistem permanentemente** mesmo após:
- `docker-compose down`
- Reiniciar o Docker
- Reiniciar o computador
- Atualizar containers

---

## 📁 Estrutura de Pastas

```
agente-de-vendas/
├── data/
│   ├── postgres/              ← Banco de dados PostgreSQL
│   ├── backups/               ← Backups automáticos
│   ├── conhecimento/          ← Base de conhecimento do bot
│   ├── logs/                  ← Logs do sistema
│   └── learning/              ← Dados de aprendizado ML
├── docker-compose.yml
└── ...
```

### O que é Salvo em Cada Pasta

| Pasta | Conteúdo | Tamanho típico |
|-------|----------|---|
| `data/postgres/` | Banco de dados completo (leads, conversas, etc) | 100 MB - 1 GB |
| `data/backups/` | Backups automáticos (ZIP com SQL + JSON) | 50-500 MB |
| `data/conhecimento/` | Base de conhecimento (padrões de respostas) | 10-50 MB |
| `data/logs/` | Logs de operação (rotacionados) | 100 MB |
| `data/learning/` | Dados de treinamento ML | 10-100 MB |

---

## 🚀 Como Funciona

### Tipo de Volume: Bind Mount

```yaml
volumes:
  - ./data/postgres:/var/lib/postgresql/data
    ↑                 ↑
    Máquina local    Dentro do container
```

**Benefício**: Os arquivos estão sempre visíveis no seu computador em `./data/`

### Alternativa: Volume Nomeado (Anterior)

A versão antiga usava:
```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data
```

**Problema**: Dados guardados em local misterioso do Docker Desktop, se limpar Docker → perde dados

---

## 💾 Começar com Docker Limpo

Se quer começar do zero:

```bash
# 1. Parar containers
docker-compose down

# 2. APAGAR os dados antigos (CUIDADO!)
rm -rf data/

# 3. Recriar as pastas vazias
mkdir -p data/{postgres,backups,conhecimento,logs,learning}

# 4. Iniciar (vai criar BD novo e vazio)
docker-compose up -d
```

---

## 🛡️ Backup Manual

Para fazer backup de todos os dados:

```bash
# Backup completo em um ZIP
tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz data/

# Ou no Windows PowerShell:
Compress-Archive -Path data -DestinationPath "backup-$(Get-Date -Format yyyyMMdd-HHmmss).zip"
```

---

## 🔄 Restaurar Dados

Se precisar restaurar:

```bash
# 1. Parar os containers
docker-compose down

# 2. Restaurar os arquivos (exemplo)
tar -xzf backup-20250702-143022.tar.gz

# 3. Reiniciar
docker-compose up -d
```

---

## ✨ Checklist de Configuração

- [x] Volumes são bind mounts (./data/*)
- [x] Pastas criadas automaticamente
- [x] PostgreSQL persiste em ./data/postgres/
- [x] Backups salvos em ./data/backups/
- [x] Logs em ./data/logs/
- [x] .gitignore inclui /data/ (não commita dados)
- [x] Docker restart automático (unless-stopped)

---

## 🔍 Verificar Dados

```bash
# Ver tamanho dos dados
du -sh data/

# Ver estrutura
tree data/

# Ver últimos arquivos
ls -lh data/backups/ | tail -10
```

---

## ⚠️ Notas Importantes

1. **Permissões**: Se Docker rodando como outro usuário, pode ter problemas. Use `chown` se necessário
2. **Espaço em disco**: Monitorar espaço, especialmente dados/postgres/ e data/backups/
3. **Performance**: Bind mounts em SSD são rápidos; em HDD podem ser lentos
4. **Windows WSL2**: Se usar WSL, salvar os dados NO disco do WSL (não em /mnt/c/), é 10x mais rápido

---

**Última atualização**: 2026-07-02  
**Status**: ✅ Dados persistem permanentemente
