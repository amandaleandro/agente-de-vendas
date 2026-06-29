# Erros Corrigidos - Fezinha Bot

## ✅ Problemas Resolvidos

### 1. ❌ Health check: banco indisponível
**Causa:** O sistema tentava conectar ao banco PostgreSQL remoto a cada minuto e bloqueava quando não conseguia.

**Solução:**
- Health check agora usa timeout de 2 segundos
- Erros de conexão são tratados como "aviso" ao invés de "erro"
- Sistema continua funcionando normalmente mesmo sem banco
- Leads são salvos localmente em `leads_pendentes.jsonl` durante desconexões
- Logs reduzidos para evitar spam de erro

### 2. ⚠️ Uso de memória alto
**Causa:** Tentativas de reconexão gerando logs excessivos e sem backoff adequado.

**Solução:**
- Backoff exponencial melhorado (2s → 3s → 4.5s → ... → máx 60s)
- Intervalo máximo entre tentativas aumentado de 30s para 60s
- Após 5 tentativas, aguarda 5 minutos antes de tentar novamente
- Logs reduzidos com `logger.debug()` ao invés de `console.log()`

### 3. Erro na prospecção: CSV precisa ter colunas
**Causa:** Mapeamento de colunas muito rígido e sem fallback.

**Solução:**
- Agora aceita múltiplas variações de nomes de coluna:
  - Nome: `empresa`, `nome`, `company`, `business`
  - Telefone: `telefone`, `whatsapp`, `celular`, `phone`, `tel`, `wa`
  - Categoria: `categoria`, `segmento`, `category`, `industry`, `tipo`
  - Endereço: `endereco`, `endereço`, `address`, `city`, `local`
  - Site: `site`, `website`, `url`, `link`
- Mensagem de erro agora mostra quais colunas foram encontradas
- Arquivo de exemplo criado em `listas/exemplo.csv`

### 4. Conexão encerrada (515): Stream Errored
**Causa:** WhatsApp desconectando por reconexões inadequadas.

**Solução:**
- Backoff exponencial reduz stress de reconexão
- Máximo de 5 tentativas antes de aguardar
- Sistema pode operar sem WhatsApp (banco/leads funcionam offline)

---

## 📋 Como Usar Agora

### Preparar o CSV
Crie um arquivo CSV com as colunas mínimas:

```csv
empresa,telefone,categoria,endereco,site
ABC Serviços,85999887766,Serviços,Fortaleza CE,www.abc.com
Salão Maria,85988776655,Beleza,Fortaleza CE,
```

**Colunas necessárias:** 
- ✅ Uma coluna com nome (empresa, nome, company, business)
- ✅ Uma coluna com telefone (telefone, whatsapp, celular, phone, tel, wa)

**Colunas opcionais:**
- categoria, endereco, site

Copie o arquivo para: `listas/lista-atual.csv`

### Uso do Painel
1. Acesse `http://localhost:3099`
2. Clique em "Carregar CSV" e selecione seu arquivo
3. Revise a prévia dos contatos
4. Clique em "Iniciar Prospecção"

### Verificar Status
```bash
# Logs do sistema
curl http://localhost:3099/api/logs

# Status de saúde
curl http://localhost:3099/api/health

# Leads salvos localmente (quando banco está offline)
cat leads_pendentes.jsonl
```

---

## 🔧 Configurações Recomendadas

No arquivo `.env`:

```ini
# Banco de dados (deixe como está se não tiver servidor)
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=sua_senha

# WhatsApp
WHATSAPP_NUMEROS=1
WHATSAPP_1_NOME=Amanda
WHATSAPP_1_ESTILO=acolhedora, direta e espontânea

# Prospecção
PROSPECCAO_ATIVA=false    # true quando pronto
PROSPECCAO_INTERVALO_MS=180000  # 3 minutos entre envios

# IA
GEMINI_API_KEY=sua_chave_aqui
IA_PROVIDER=gemini
```

---

## 📊 Fluxo de Dados Agora

```
CSV → Validação → Fila de Envio
                      ↓
                  WhatsApp
                      ↓
                Resposta do Contato
                      ↓
          Gera Resposta com IA
                      ↓
        Salva Localmente (JSONL)
                      ↓
        Sincroniza ao Banco* (quando disponível)

*Banco é opcional - sistema funciona 100% offline
```

---

## 🚀 Próximos Passos

1. **Gerar chaves de API:**
   ```bash
   # Gemini
   https://aistudio.google.com/app/apikey
   
   # Chave segura para o painel
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

2. **Testar com 1 WhatsApp primeiro**
   - Configure `WHATSAPP_NUMEROS=1`
   - Escaneie o QR Code
   - Envie uma mensagem de teste

3. **Adicionar mais números depois** de confirmar que um funciona

4. **Configurar banco de dados** (PostgreSQL) se quiser persistência durável

---

## 📝 Troubleshooting

| Erro | Solução |
|------|---------|
| `CSV precisa ter colunas...` | Verifique os nomes de colunas - veja a lista aceita acima |
| `Nenhum WhatsApp conectado` | Escaneie o QR Code e aguarde 3-5 segundos |
| `Limite de requisições excedido` | Aguarde 1 minuto e tente novamente |
| `Gemini não gerou a mensagem` | Verifique se `GEMINI_API_KEY` está válida no `.env` |
| `Banco indisponível` | Leads são salvos localmente - banco é sincronizado depois |

---

Tudo pronto para usar! 🎉
