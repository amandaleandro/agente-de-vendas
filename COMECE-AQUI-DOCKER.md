# 🚀 COMECE AQUI - Docker Setup (3 minutos)

> Seu projeto Fezinha foi **100% Dockerizado**. Este é o primeiro arquivo que você deve ler.

---

## ⚡ Super Rápido (3 min)

### 1️⃣ Preparar variáveis

```bash
# Copiar template
cp .env.docker .env.local

# ⚠️ IMPORTANTE: Abra .env.local e edite:
# - DB_PASSWORD → senha forte
# - GEMINI_API_KEY → sua chave do Google
# - PAINEL_API_KEY → execute:
#   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2️⃣ Iniciar

**Windows (PowerShell):**
```powershell
.\docker-quick.ps1 setup
```

**Linux/Mac:**
```bash
make setup
```

### 3️⃣ Pronto! 🎉

```bash
# Ver logs (ctrl+C para sair)
docker-compose logs -f fezinha

# Acessar app
# Abra: http://localhost:3099
```

---

## 📚 Arquivos Importantes

| Arquivo | O que é | Ler? |
|---------|---------|------|
| **DOCKER-README.md** | Quick start completo | ⭐ Depois de make setup |
| **DOCKER-SETUP.md** | Guia COMPLETO (600 linhas) | 📖 Se tiver dúvidas |
| **DOCKER-CHECKLIST.md** | Status de tudo + próximos passos | ✅ Próxima ação |
| **DOCKER-SUMMARY.txt** | Resumo visual formatado | 📊 Visão geral |
| **.env.docker** | Variáveis de ambiente (template) | 🔐 Editar para .env.local |
| **Dockerfile** | Receita da imagem Docker | 👨‍💻 Código |
| **docker-compose.yml** | Orquestração (app + banco) | 👨‍💻 Código |
| **Makefile** (Linux/Mac) | Comandos (`make setup`, etc) | 🛠️ Use para tudo |
| **docker-quick.ps1** (Windows) | Comandos PowerShell | 🛠️ Use para tudo |

---

## 🎯 Próximas Ações

### Hoje (Setup)
1. ✅ Editar `.env.local`
2. ✅ Rodar `make setup` (ou `.\docker-quick.ps1 setup`)
3. ✅ Ver `docker-compose logs -f fezinha`
4. ✅ Testar http://localhost:3099

### Esta semana (Validação)
5. Testar WhatsApp + mensagens
6. Fazer backup: `make backup`
7. Testar restore de backup
8. Configurar backup automático (cron/Task Scheduler)

### Produção (depois)
9. Criar `.env.prod` com valores reais
10. Deploy em servidor

---

## 💻 Comandos Essenciais

### Windows
```powershell
.\docker-quick.ps1 setup      # Iniciar tudo
.\docker-quick.ps1 logs       # Ver logs
.\docker-quick.ps1 shell      # Terminal da app
.\docker-quick.ps1 db-shell   # Terminal PostgreSQL
.\docker-quick.ps1 backup     # Fazer backup
```

### Linux/Mac
```bash
make setup          # Iniciar tudo
make logs           # Ver logs
make shell          # Terminal da app
make db-shell       # Terminal PostgreSQL
make backup         # Fazer backup
```

---

## ❓ FAQ Rápido

**P: Preciso instalar PostgreSQL?**  
R: Não! Roda dentro do Docker.

**P: Posso mudar a porta 3099?**  
R: Sim. Edite `docker-compose.yml` linha 8: `- "3100:3099"`

**P: Como debuggar?**  
R: `make shell` (ou `.\docker-quick.ps1 shell`) e use logs.

**P: Os dados da aplicação são perdidos ao parar?**  
R: Não. Volumes persistem (auth_info_baileys/, logs/, etc).

**P: Posso usar isso em produção?**  
R: Sim! Todas as 3 fases preparam para isso.

---

## ⚠️ Importante

1. **NUNCA commitar .env.local** — `.gitignore` protege
2. **MUDE DB_PASSWORD** — Senha padrão é só para teste
3. **MUDE GEMINI_API_KEY** — Sua chave privada!
4. **Testar backups** — Execute `make backup` regularmente

---

## 📞 Ajuda

| Situação | Solução |
|----------|---------|
| App não inicia | `docker-compose logs fezinha` |
| Banco não conecta | `docker-compose logs postgres` |
| Porta em uso | Mudar em `docker-compose.yml` |
| Precisa fazer restore | Veja **DOCKER-SETUP.md** → Fase 3 |
| Quer saber tudo | Leia **DOCKER-SETUP.md** (600 linhas) |

---

## ✅ Checklist Rápido

- [ ] Copiei .env.docker para .env.local
- [ ] Editei .env.local com minhas chaves
- [ ] Rodei `make setup` (ou `.\docker-quick.ps1 setup`)
- [ ] Verifiquei `docker-compose ps`
- [ ] Vi logs com `docker-compose logs -f`
- [ ] Acessei http://localhost:3099
- [ ] Fiz primeiro backup com `make backup`

---

## 🎓 O Que Você Ganhou

✅ **Isolamento** — Tudo rodando em containers  
✅ **Consistência** — Mesma imagem em dev/prod  
✅ **Facilidade** — 1 comando para rodar tudo  
✅ **Backup** — Automático com cleanup  
✅ **Documentação** — Guias completos  
✅ **Automação** — Make + PowerShell scripts  

---

## 🚀 Começar Agora

**Windows:**
```powershell
# 1. Editar .env.local
# 2. Rodar:
.\docker-quick.ps1 setup

# 3. Ver funcionando:
docker-compose logs -f
```

**Linux/Mac:**
```bash
# 1. Editar .env.local
# 2. Rodar:
make setup

# 3. Ver funcionando:
docker-compose logs -f
```

---

**Pronto?** 👉 Próximo arquivo: [DOCKER-README.md](DOCKER-README.md)

**Quer tudo?** 👉 Leia: [DOCKER-SETUP.md](DOCKER-SETUP.md)

---

*Implementado em: 26/06/2026*  
*Tempo de setup: ~3 minutos*  
*Status: ✅ Pronto para usar*
