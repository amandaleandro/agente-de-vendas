# 🚀 Início Rápido - FechaPro com Docker

## ⚡ 30 segundos para começar

### Windows
```bash
# 1. Abra Docker Desktop
# 2. No PowerShell, execute:
cd agente-de-vendas
.\docker-run.bat
# Escolha opção 1 para iniciar
```

### Mac/Linux
```bash
# 1. No terminal, execute:
cd agente-de-vendas
chmod +x docker-run.sh
./docker-run.sh
# Escolha opção 1 para iniciar
```

---

## 📖 O que vai acontecer

1. **Docker vai fazer pull** das imagens (postgres, node, nginx)
2. **Build** dos seus containers (backend, frontend)
3. **Inicia** 3 serviços:
   - PostgreSQL (banco de dados)
   - Backend (API Node.js)
   - Frontend (React + Nginx)

**Espere ~2 minutos** para tudo ficar pronto.

---

## 🎯 Acessar

Após iniciar, acesse:

- **Demo Landing Page**: http://localhost
- **API**: http://localhost:3099
- **Painel Admin**: http://localhost/#/admin (use credenciais do seu DB)

---

## 🔧 Problemas Comuns

### "Docker não está rodando"
→ Abra **Docker Desktop**

### "Port 80 já está em uso"
Edite `.env`:
```bash
WEB_PORT=3000
```

### "Pode demorar pra carregar"
→ Aguarde 1 minuto. Banco de dados leva tempo.

---

## 📞 Comandos Úteis

```bash
# Ver logs
docker-compose logs -f

# Status dos containers
docker-compose ps

# Parar tudo
docker-compose stop

# Remover tudo (cuidado!)
docker-compose down -v
```

---

## 🎓 Próximos Passos

1. ✅ Vendo na local? Ótimo!
2. 📝 Customize `.env` com suas API keys (GEMINI_API_KEY)
3. 🌐 Configure CRM: Vá para http://localhost/#/crm
4. 📊 Veja dashboard: http://localhost/#/analytics-dashboard
5. 🚀 Faça deploy para produção (veja DOCKER.md)

---

**Dúvidas?** Veja `DOCKER.md` para guia completo.
