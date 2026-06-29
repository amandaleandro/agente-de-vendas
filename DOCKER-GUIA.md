# 🐳 Guia Docker - Fezinha Bot

## ✅ Benefícios de Usar Docker

- **Isola o bot** - Roda em container separado
- **Limita memória** - Máximo 4GB (controlado)
- **Reinicia automático** - Se cair, volta sozinho
- **Roda 24/7** - Sem terminal aberto
- **Fácil deploy** - Leva para qualquer servidor

---

## 🚀 Como Rodar com Docker

### Pré-requisitos
```bash
# Instalar Docker Desktop (Windows)
# https://www.docker.com/products/docker-desktop
```

### 1. Preparar .env.docker
```bash
# Copiar .env para .env.docker
cp .env .env.docker
```

### 2. Iniciar com Docker
```bash
# Rodar o bot em Docker
docker-compose up -d

# Ver logs em tempo real
docker-compose logs -f fezinha

# Parar o bot
docker-compose down
```

### 3. Monitorar
```bash
# Ver status dos containers
docker-compose ps

# Ver uso de memória
docker stats fezinha-app

# Acessar painel
# http://localhost:3099
```

---

## 📊 Configurações de Memória

**No docker-compose.yml:**

```yaml
deploy:
  resources:
    limits:
      memory: 4G        # Máximo permitido
    reservations:
      memory: 3G        # Reserva garantida
```

**Node.js:**
```
NODE_OPTIONS=--max-old-space-size=3072  # 3GB para heap
```

---

## 🔄 Restart Automático

Se o bot cair por qualquer motivo:
```yaml
restart: unless-stopped  # Reinicia automaticamente
```

---

## 📁 Volumes Persistentes

- `./auth_info_baileys` → Autenticação WhatsApp
- `./listas` → Contatos para prospecção
- `./prospeccao_resultados.jsonl` → Histórico de envios
- `./logs` → Logs do bot

---

## 💡 Comparação: Docker vs. Local

| Aspecto | Local | Docker |
|---------|-------|--------|
| Memória | ⚠️ Variável | ✅ Controlada (4GB) |
| Reinicio | ❌ Manual | ✅ Automático |
| Terminal | ✅ Necessário | ❌ Não precisa |
| Logs | 📂 Arquivo | 📊 Centralizado |
| Deploy | 🚚 Complexo | ✅ Simples |

---

## 🎯 Recomendação

**Para produção:** Use Docker + docker-compose  
**Para desenvolvimento:** Use `npm start` local

---

## 📞 Contatos Prospectados

O histórico fica em: `prospeccao_resultados.jsonl`

O bot não vai repetir mensagens para quem já recebeu! ✅
