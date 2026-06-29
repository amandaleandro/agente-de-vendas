# 🌐 Frontend de Agenda - Upload e Gerenciamento

Interface web para gerenciar múltiplas planilhas de prospecção de forma visual e intuitiva.

---

## 🚀 Como Acessar

Após iniciar o bot:

```
http://localhost:3099/agenda.html
```

---

## 📋 Interface

### 1. **Upload de Planilhas** (Esquerda)

#### Área de Upload (Drag & Drop)
- Clique para selecionar arquivos
- Ou arraste arquivos diretamente
- Suporta upload múltiplo
- Apenas arquivos `.csv` são aceitos

#### Lista de Arquivos Selecionados
```
📄 seg-manha.csv    ❌ Remover
📄 seg-tarde.csv    ❌ Remover
📄 terça-manha.csv  ❌ Remover
```

#### Botões
- **📤 Enviar Arquivos** - Faz upload e cria fila
- **🗑️ Limpar Tudo** - Remove tudo (irrecuperável!)

### 2. **Controles** (Direita)

- **▶️ Iniciar Prospecção** - Começa a execução automática
- **⏸️ Pausar** - Pausa a execução
- **💾 Exportar Relatório** - Baixa relatório em JSON

### 3. **Status da Agenda** (Topo)

Seis boxes de status em tempo real:

```
┌─────────────┐  ┌──────────────┐  ┌─────────────┐
│ Planilhas   │  │ Concluídas   │  │ Pendentes   │
│      15     │  │      2       │  │     13      │
└─────────────┘  └──────────────┘  └─────────────┘

┌─────────────┐  ┌──────────────┐  ┌─────────────┐
│ Contatos    │  │ Enviados     │  │ Erros       │
│     300     │  │      45      │  │      1      │
└─────────────┘  └──────────────┘  └─────────────┘
```

### 4. **Barra de Progresso**

```
Progresso: ════════████░░░░░░░░░░░░░░  13.3%
```

- Visual da conclusão geral
- Atualiza a cada 2 segundos

### 5. **Planilha Atual** (Se executando)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ▶️ seg-manha.csv                   ┃
┃ 📄 Contatos: 20 | ✅ Enviados: 18  ┃
┃ ⏱️ Próxima: 16:30                  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### 6. **Fila de Planilhas** (Embaixo)

```
① seg-manha.csv        ✅ 20/20
② seg-tarde.csv        ⏳ Pendente
③ terça-manha.csv      ⏳ Pendente
④ terça-tarde.csv      ⏳ Pendente
... (11 mais)
```

---

## 📸 Passo a Passo

### Prepare suas 15 planilhas CSV

**Formato esperado:**
```csv
telefone,nome,empresa,categoria
5585988123456,João Silva,Tech,empresário
5585988234567,Maria Santos,XYZ,profissional
5585988345678,Pedro Costa,ABC,gerente
```

### 1. Acesse o frontend

```
http://localhost:3099/agenda.html
```

### 2. Selecione os 15 arquivos

**Opção A - Clique:**
1. Clique na área "Clique ou arraste arquivos"
2. Selecione todos os 15 CSVs (Ctrl+A depois de abrir pasta)
3. Clique "Abrir"

**Opção B - Drag & Drop:**
1. Abra pasta com os 15 CSVs
2. Arraste todos para a área de upload
3. Solte para adicionar

### 3. Revise a lista

```
📄 seg-01.csv     ❌
📄 seg-02.csv     ❌
📄 seg-03.csv     ❌
📄 terça-01.csv   ❌
... (11 mais)
```

Se errou, clique ❌ para remover e adicione novamente.

### 4. Envie os arquivos

Clique **📤 Enviar Arquivos**

Você verá:
```
✅ 15 arquivo(s) enviado(s) com sucesso!
```

### 5. Verifique a fila

Observe a seção "📋 Fila de Planilhas":
```
① seg-01.csv        ⏳ Pendente
② seg-02.csv        ⏳ Pendente
③ seg-03.csv        ⏳ Pendente
... (12 mais)
```

### 6. Inicie a prospecção

Clique **▶️ Iniciar Prospecção**

O bot começará:
1. Executar primeira planilha
2. Mostrar progresso em tempo real
3. Aguardar 1 hora
4. Executar segunda planilha
5. ... e assim por diante

### 7. Acompanhe em tempo real

Status atualiza a cada **2 segundos**:

```
Planilhas:     15  ✓ Concluídas: 1   ⏳ Pendentes: 14
Contatos:     300  ✓ Enviados: 20    ❌ Erros: 0

▶️ Executando: seg-02.csv
   Próxima: 16:30
```

### 8. Exporte o relatório

Quando terminar (ou durante):

1. Clique **💾 Exportar Relatório**
2. Será baixado `relatorio_agenda.json`
3. Abra em editor de texto para análise

---

## 📊 Relatório Exportado

```json
{
  "data_geracao": "2026-06-29T16:30:00.000Z",
  "resumo": {
    "total_planilhas": 15,
    "concluidas": 5,
    "total_contatos": 300,
    "total_enviados": 100,
    "total_erros": 0
  },
  "planilhas": [
    {
      "nome": "seg-manha.csv",
      "status": "concluída",
      "inicio": "2026-06-29T15:01:00.000Z",
      "fim": "2026-06-29T15:10:00.000Z",
      "contatos_totais": 20,
      "contatos_enviados": 20,
      "erros": 0
    },
    // ... mais planilhas
  ]
}
```

---

## 🎯 Recursos

### Real-time Updates
- Status atualiza a cada 2 segundos
- Sem necessidade de refresh manual
- Vê progresso em tempo real

### Visual Progress
- Barra de progresso com percentual
- Cards de status coloridos
- Indicadores visuais de sucesso/erro

### Queue Management
- Vê todas as 15 planilhas na fila
- Sabe qual está executando
- Sabe qual é a próxima

### Error Handling
- Mensagens de sucesso
- Mensagens de erro
- Feedback visual

### Mobile Responsive
- Funciona em desktop
- Funciona em tablet
- Funciona em celular

---

## 🐛 Troubleshooting

### "Não carrega a página"

```
❌ http://localhost:3099/agenda.html não carrega
```

**Solução:**
1. Verificar se bot está rodando: `./start.sh`
2. Verificar porta 3099: `curl http://localhost:3099`
3. Checar logs do bot

### "Upload diz que nenhum arquivo foi enviado"

```
❌ Erro: Nenhum arquivo CSV enviado
```

**Solução:**
1. Verificar se arquivos são .csv (não .xls, .xlsx)
2. Verificar extensão correta
3. Tentar com um arquivo de teste

### "Status não atualiza"

```
Status fica congelado
```

**Solução:**
1. Refresh da página (F5)
2. Verificar console do navegador (F12)
3. Verificar logs do bot

### "Não consegue exportar relatório"

```
❌ Erro ao baixar relatório
```

**Solução:**
1. Permitir pop-ups/downloads do navegador
2. Verificar pasta de downloads
3. Tentar novamente depois

---

## 💡 Dicas Profissionais

### 1. **Nomeie os arquivos descritivamente**

❌ Ruim:
```
dados.csv
lista1.csv
csv2.csv
```

✅ Bom:
```
segunda-manha-10contatos.csv
segunda-tarde-15contatos.csv
terça-10contatos.csv
```

### 2. **Organize por período**

```
listas/
├── seg-08h.csv
├── seg-12h.csv
├── seg-18h.csv
├── terça-08h.csv
├── terça-12h.csv
└── ... (10 mais)
```

### 3. **Valide CSVs antes**

Abra em Excel/Sheets para confirmar:
- ✅ Coluna de telefone
- ✅ Sem telefones em branco
- ✅ Telefones com DDD válido

### 4. **Monitore durante execução**

Mantenha a página aberta para:
- Ver erros em tempo real
- Pausar se necessário
- Acompanhar progresso

### 5. **Guarde o relatório**

Após terminar:
```
relatorio_agenda.json  ← Guarde para análise
```

---

## 🔄 Workflow Completo

```
1. Preparar 15 CSVs
   ↓
2. Acessar http://localhost:3099/agenda.html
   ↓
3. Upload via drag-and-drop dos 15 arquivos
   ↓
4. Revisar fila (deve mostrar 15 planilhas)
   ↓
5. Clicar "Iniciar Prospecção"
   ↓
6. Acompanhar em tempo real
   ↓
7. (Esperar ~15 horas para tudo terminar)
   ↓
8. Exportar relatório ao final
   ↓
9. Analisar resultados
```

---

## 📱 Acessos Úteis

```
Frontend de Agenda:
http://localhost:3099/agenda.html

API de Status:
http://localhost:3099/api/prospeccao/status

API de Relatório:
http://localhost:3099/api/prospeccao/relatorio
```

---

## ✨ Resumo

Com o frontend de agenda você:
- ✅ Upload de múltiplos CSVs de uma vez
- ✅ Visualiza fila de execução
- ✅ Acompanha em tempo real
- ✅ Pausa/retoma quando quiser
- ✅ Exporta relatório profissional
- ✅ Zero estresse de gerenciar manualmente

**Sistema pronto para operação! 🚀**
