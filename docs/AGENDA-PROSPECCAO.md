# 📅 Agenda de Prospecção - Múltiplas Planilhas por Hora

Sistema automático para executar várias planilhas CSV (uma por hora) sem precisar reiniciar manualmente.

---

## 🎯 O Problema Resolvido

**Antes:**
- ❌ Tinha que adicionar uma planilha por vez
- ❌ Tinha que esperar manualmente
- ❌ Tinha que reiniciar para próxima planilha
- ❌ Perdia controle com muitas planilhas

**Agora:**
- ✅ Coloca todas as 15 planilhas de uma vez
- ✅ Bot executa uma por hora automaticamente
- ✅ Sem precisar fazer nada
- ✅ Rastreia progresso de tudo

---

## 🚀 Como Usar

### 1. **Preparar as Planilhas**

Coloque seus 15 CSVs em `backend/listas/`:

```
backend/listas/
├── segunda-01.csv      (20 contatos)
├── segunda-02.csv      (20 contatos)
├── segunda-03.csv      (20 contatos)
├── terça-01.csv        (20 contatos)
├── terça-02.csv        (20 contatos)
├── terça-03.csv        (20 contatos)
├── quarta-01.csv       (20 contatos)
├── quarta-02.csv       (20 contatos)
├── quarta-03.csv       (20 contatos)
├── quinta-01.csv       (20 contatos)
├── quinta-02.csv       (20 contatos)
├── quinta-03.csv       (20 contatos)
├── sexta-01.csv        (20 contatos)
├── sexta-02.csv        (20 contatos)
└── sexta-03.csv        (20 contatos)
```

**Formato do CSV:**
```csv
telefone,nome,empresa,categoria
5585988123456,João Silva,Tech,empresário
5585988234567,Maria Santos,XYZ,profissional
5585988345678,Pedro Costa,ABC,gerente
```

### 2. **Configurar .env**

```env
# Ativar modo agenda
PROSPECCAO_AGENDA_ATIVA=true

# Intervalo entre contatos
PROSPECCAO_INTERVALO_MS=180000    # 3 minutos

# Ativar envio real
PROSPECCAO_ATIVA=true              # false para prévia, true para enviar
```

### 3. **Iniciar o Bot**

```bash
./start.sh  # Linux/Mac
start.bat   # Windows
```

Saída esperada:
```
📊 Planilhas encontradas: 15
  📄 segunda-01.csv - 20 contatos
  📄 segunda-02.csv - 20 contatos
  ... (13 mais)

✅ Fila criada com 15 planilhas
📊 Total de contatos: 300

✅ Prospecção agendada iniciada (verifica a cada 30 segundos)

🚀 EXECUTANDO PLANILHA: segunda-01.csv
📞 Contatos: 20
✅ João Silva (1/5)
✅ Maria Santos (2/5)
...
✅ PLANILHA CONCLUÍDA: segunda-01.csv
📊 20 enviados, 0 erros
⏰ Próxima planilha em 1 hora(s): 16:30
```

---

## 📊 Como Funciona

### Timeline de Execução

```
⏰ 15:00 - Inicia
🚀 15:01 - Começa segunda-01.csv (20 contatos)
✅ 15:10 - Concluída segunda-01.csv
⏳ 15:10 - Aguarda 1 hora

⏰ 16:10 - Próxima hora
🚀 16:11 - Começa segunda-02.csv (20 contatos)
✅ 16:20 - Concluída segunda-02.csv
⏳ 16:20 - Aguarda 1 hora

⏰ 17:10 - Próxima hora
🚀 17:11 - Começa segunda-03.csv (20 contatos)
✅ 17:20 - Concluída segunda-03.csv
⏳ 17:20 - Aguarda 1 hora
...

⏰ 29:10 - 15 horas depois
✅ TUDO CONCLUÍDO!
📊 15 planilhas × 20 contatos = 300 contatos
```

### Características

✅ **Uma planilha por hora** - Respeita aquecimento (warmup)  
✅ **Automático** - Não precisa fazer nada  
✅ **Persistido** - Se reiniciar, continua de onde parou  
✅ **Rastreado** - Sabe qual planilha está rodando  
✅ **Relatórios** - Gera relatório de tudo  

---

## 📋 Gerenciar Agenda

### Ver Status Atual

```javascript
// No código ou endpoint:
prospeccaoAgenda.obterStatus()

// Retorna:
{
  "planilha_atual": "segunda-01.csv",
  "proxima_execucao": "16:30:00",
  "pendentes": {
    "quantidade": 14,
    "planilhas": ["segunda-02.csv", "segunda-03.csv", ...]
  },
  "concluidas": {
    "quantidade": 1,
    "planilhas": [
      {
        "nome": "segunda-01.csv",
        "status": "concluída",
        "contatos_totais": 20,
        "contatos_enviados": 20,
        "erros": 0
      }
    ]
  },
  "progresso": {
    "total_fila": 15,
    "completado": 1,
    "percentual": "6.7%"
  }
}
```

### Gerar Relatório Completo

```javascript
prospeccaoAgenda.exportarRelatorio()

// Cria: backend/relatorio_agenda.json
```

Exemplo:
```json
{
  "data_geracao": "2026-06-29T17:30:00.000Z",
  "resumo": {
    "total_planilhas": 15,
    "concluidas": 2,
    "pendentes": 13,
    "total_contatos": 300,
    "total_enviados": 40,
    "total_erros": 0
  },
  "planilhas": [
    {
      "nome": "segunda-01.csv",
      "status": "concluída",
      "inicio": "2026-06-29T15:01:00.000Z",
      "fim": "2026-06-29T15:10:00.000Z",
      "contatos_totais": 20,
      "contatos_enviados": 20,
      "erros": 0
    },
    {
      "nome": "segunda-02.csv",
      "status": "concluída",
      "inicio": "2026-06-29T16:11:00.000Z",
      "fim": "2026-06-29T16:20:00.000Z",
      "contatos_totais": 20,
      "contatos_enviados": 20,
      "erros": 0
    }
    // ... mais planilhas
  ]
}
```

---

## 🔄 Fluxo Completo

```
1. Prepara planilhas em backend/listas/
2. Configura .env com PROSPECCAO_AGENDA_ATIVA=true
3. Inicia bot: ./start.sh
4. Bot detecta todas as planilhas
5. Bot cria fila com 15 planilhas
6. Executa primeira planilha
7. Aguarda 1 hora
8. Executa segunda planilha
9. ... e assim por diante
10. Após 15 horas, todas concluídas
11. Salva relatório em relatorio_agenda.json
```

---

## ⚡ Intervalo Entre Planilhas

O intervalo padrão é **1 hora** (3600000ms). Para mudar:

```env
# Mudar intervalo para 30 minutos
PROSPECCAO_INTERVALO_ENTRE_PLANILHAS=1800000

# Mudar para 2 horas
PROSPECCAO_INTERVALO_ENTRE_PLANILHAS=7200000
```

⚠️ **Importante:** Não diminua muito! O warmup do WhatsApp precisa de tempo para resetar.

---

## 🛑 Pausar/Reiniciar Agenda

### Pausar uma planilha

```bash
# Não há comando direto, mas você pode:
# 1. Parar o bot (Ctrl+C)
# 2. Deixar tempo passar
# 3. Reiniciar bot

# Bot vai detectar onde parou e continuar
```

### Limpar agenda e começar do zero

```javascript
// Cuidado! Vai permitir reenvio
prospeccaoAgenda.limparAgenda()

// Depois:
prospeccaoAgenda.criarFila()
```

---

## 🐛 Troubleshooting

### "Não detecta as planilhas"

```bash
# Verificar se estão em backend/listas/
ls backend/listas/

# Verificar se são .csv
# Se são .xls ou .xlsx, converter para CSV
```

### "Não começa a próxima planilha"

```bash
# Verificar se WhatsApp está conectado
# Verificar se warmup não está no limite
# Verificar logs de erro
```

### "Precisa de mais tempo por planilha"

```env
# Aumentar intervalo entre contatos
PROSPECCAO_INTERVALO_MS=300000    # 5 minutos em vez de 3

# Isso aumenta tempo de execução de cada planilha
```

### "Quer adicionar mais planilhas depois"

```bash
# Adicione novos CSVs em backend/listas/
# Na próxima hora, bot vai detectar e adicionar à fila
```

---

## 📈 Estimativas de Tempo

Para 15 planilhas com 20 contatos cada:

| Intervalo | Tempo Total |
|-----------|------------|
| 1 min | ~3 min/planilha × 15 = 45 min total |
| 3 min | ~10 min/planilha × 15 = 150 min (2.5h) |
| 5 min | ~20 min/planilha × 15 = 300 min (5h) |

**Com intervalo de 1 hora entre planilhas:**
- Tempo total = 14 horas (15 planilhas - 1) + tempo de execução
- Se 10 min por planilha: 14h + 2.5h = **~16.5 horas**

---

## 💡 Dicas Profissionais

1. **Use nomes descritivos:**
   ```
   segunda-manha.csv
   segunda-tarde.csv
   terça-executivos.csv
   terça-pmes.csv
   ```

2. **Organize por dia/hora:**
   ```
   dia-01-08h.csv
   dia-01-10h.csv
   dia-02-08h.csv
   ```

3. **Monitore progresso:**
   ```
   # Acessar relatório periodicamente
   cat backend/relatorio_agenda.json | jq '.resumo'
   ```

4. **Combine com warmup:**
   - Aumentar intervalo = mais seguro
   - Diminuir intervalo = mais rápido, mais risco

---

## 🎯 Próximos Passos

1. ✅ Preparar 15 CSVs em `backend/listas/`
2. ✅ Configurar `.env` com `PROSPECCAO_AGENDA_ATIVA=true`
3. ✅ Iniciar bot com `./start.sh`
4. ✅ Ver logs de execução
5. ✅ Conferir relatório em `relatorio_agenda.json`

---

**Sistema de agenda automática pronto para produção! 🚀**
