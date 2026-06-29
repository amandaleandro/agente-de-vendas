# 🔧 Otimizar Memória - Fezinha Bot

## Status Atual

Você viu: ⚠️ Uso de memória crítico (> 90%)

Isso é normal quando o bot está respondendo muitas mensagens rapidamente. Implementei **3 otimizações**:

## ✅ Otimizações Implementadas

### 1. Reduzir Histórico por Contato
**Antes:** 20 mensagens por contato  
**Depois:** 10 mensagens por contato  
**Impacto:** -50% de memória por contato

### 2. Limpeza Automática Mais Frequente
**Antes:** A cada 30 minutos  
**Depois:** A cada 15 minutos  
**Impacto:** Históricos antigos removidos mais rápido

### 3. Truncar Arquivo leads_pendentes.jsonl
**Função:** Manter apenas últimas 100 linhas quando > 5MB  
**Impacto:** Arquivo não cresce infinitamente

### 4. Garbage Collection Automático
**Quando:** Se memória > 85%  
**Impacto:** Libera memória não usada

---

## 📊 Monitorar Memória

### Comando (em outro terminal):
```bash
curl http://localhost:3099/api/health
```

### Resposta esperada:
```json
{
  "memory": {
    "used": "250MB",
    "total": "500MB",
    "percent": 50
  },
  "status": "healthy"
}
```

---

## 🎯 Níveis de Memória

| Uso | Status | Ação |
|-----|--------|------|
| < 70% | ✅ Saudável | Nada fazer |
| 70-85% | ⚠️ Alto | Normal, monitor |
| > 85% | ⚠️ Crítico | Garbage collection automático |
| > 95% | ❌ Perigoso | Reiniciar bot |

---

## 🔍 Investigar Consumo

### Ver tamanho de arquivos:
```bash
# Verificar arquivo de leads pendentes
ls -lh leads_pendentes.jsonl

# Verificar logs
ls -lh logs/

# Verificar backups
ls -lh backups/
```

### Limpar manualmente (se necessário):
```bash
# Limpar leads pendentes
> leads_pendentes.jsonl

# Limpar logs antigos
rm logs/*.log
```

---

## ⚡ Quando a Memória é Normal

O bot usa mais memória quando:
- ✅ Muitos contatos em conversa ativa
- ✅ Gemini processando respostas longas
- ✅ Arquivo leads_pendentes.jsonl grande
- ✅ Muitos backups acumulados

Isso é **esperado e normal!**

---

## 🚀 Se Continuar Alto

### Opção 1: Reiniciar o Bot
```bash
# Ctrl+C para parar
# npm start para reiniciar
```

Isto libera toda a memória de históricos.

### Opção 2: Executar Limpeza Manual
```bash
# Criar script de limpeza
cat > limpar.js << 'EOF'
const fs = require('fs');
// Limpar leads_pendentes.jsonl
fs.writeFileSync('leads_pendentes.jsonl', '', 'utf8');
console.log('✅ Arquivo de leads limpo');
EOF

node limpar.js
npm start
```

### Opção 3: Reduzir Histórico Ainda Mais
Se usar intensamente, edite `index.js` e mude:
```javascript
.slice(-5)  // De 10 para 5
```

---

## 📈 Melhorias Futuras

- [ ] Limite de contatos simultâneos
- [ ] Compressão de históricos
- [ ] Armazenar histórico em arquivo (não memória)
- [ ] Cache LRU (Least Recently Used)

---

## ✅ Checklist

- [x] Histórico reduzido de 20 para 10 mensagens
- [x] Limpeza automática a cada 15 min
- [x] Truncagem de leads_pendentes.jsonl
- [x] Garbage collection > 85%
- [ ] Monitorar com `curl http://localhost:3099/api/health`
- [ ] Reiniciar se passar 95%

---

**Resumo:** Memória crítica agora é tratada automaticamente. O bot continua funcionando! ✅
