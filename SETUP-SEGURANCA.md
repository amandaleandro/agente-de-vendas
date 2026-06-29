# 🔒 Guia de Configuração Segura

## ⚠️ ALERTA: Chaves Expostas Detectadas!

Suas chaves de API foram encontradas em repositório/arquivo. **Você DEVE regenerar todas as chaves imediatamente.**

---

## 1️⃣ Gerar Chave de API Segura

Abra o PowerShell e execute:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Copie o resultado e cole no `.env` como `PAINEL_API_KEY`**

---

## 2️⃣ Configurar Gemini (Google AI)

1. Acesse: https://aistudio.google.com/app/apikey
2. Clique em "Create API Key"
3. Copie a chave
4. Cole no `.env` como `GEMINI_API_KEY`

---

## 3️⃣ Configurar xAI (X.AI)

1. Acesse: https://console.x.ai/
2. Crie uma nova chave API
3. Copie a chave
4. Cole no `.env` como `XAI_API_KEY`

---

## 4️⃣ Configurar WhatsApp

### Opção A: 1 Número (Recomendado para começar)

```env
WHATSAPP_NUMEROS=1
WHATSAPP_1_NOME=Seu Nome
WHATSAPP_1_ESTILO=seu estilo de atendimento
```

### Opção B: 2 Números (Depois de testar)

```env
WHATSAPP_NUMEROS=2
WHATSAPP_1_NOME=Amanda
WHATSAPP_1_ESTILO=acolhedora, direta
WHATSAPP_2_NOME=Yzak
WHATSAPP_2_ESTILO=consultivo, descontraído
```

**IMPORTANTE:** Use números de WhatsApp DIFERENTES para cada sessão, senão vai dar erro 440.

---

## 5️⃣ Configurar Banco de Dados

Se está usando PostgreSQL remoto:

```env
DB_HOST=seu_host
DB_USER=seu_usuario
DB_PASSWORD=sua_senha_forte
DB_NAME=seu_banco
DB_PORT=5432
```

**Mude SEMPRE a senha padrão `postgres`**

---

## 6️⃣ Gerar Chave de API para Teste

Depois de gerar a chave segura, use no navegador:

```javascript
sessionStorage.setItem('painel_api_key', 'SUA_CHAVE_AQUI');
```

Ou deixe em branco e use sem autenticação em modo desenvolvimento.

---

## 7️⃣ Testar a Configuração

1. Inicie o servidor:
   ```bash
   npm start
   ```

2. Abra: http://localhost:3099

3. Se pedir API key, cole a chave que gerou

4. Teste importar uma planilha pequena

---

## ✅ Checklist de Segurança

- [ ] Chaves de IA regeneradas
- [ ] Chave de API segura gerada
- [ ] Arquivo `.env` atualizado
- [ ] Arquivo `.env` NÃO é compartilhado ou commitado
- [ ] Senha do banco mudada
- [ ] Usando HTTPS em produção
- [ ] WhatsApp configurado com número(s) correto(s)
- [ ] Testou importação de CSV
- [ ] Testou envio de mensagem

---

## 🛡️ Boas Práticas

1. **Nunca compartilhe seu `.env`** com ninguém
2. **Use `.env.local`** para configurações locais
3. **Em produção**, use variáveis de ambiente do servidor
4. **Rotacione as chaves regularmente** (a cada 3 meses)
5. **Monitore uso das APIs** para detectar abuso

---

## ❌ Erros Comuns

### Erro 440 (Stream conflict)
- **Causa**: Mesmo número de WhatsApp em múltiplas sessões
- **Solução**: Use números diferentes ou apenas 1 sessão

### Erro de autenticação API
- **Causa**: Chave expirada ou inválida
- **Solução**: Regenere a chave no console do provedor

### CSV não importa
- **Causa**: Formato incorreto ou encoding
- **Solução**: Verifique coluna de telefone e encoding UTF-8

---

## 📞 Suporte

Se tiver dúvidas, verifique:
- Logs do servidor
- Console do navegador (F12)
- Variáveis de ambiente
- Conectividade de rede

