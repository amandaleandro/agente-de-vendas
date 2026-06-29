# Exemplos de Uso da API de Diagnóstico

## 1. Salvar Diagnóstico (Frontend)

Quando a página `fechapro.com.br/diagnostico` termina, ela deve fazer uma requisição POST:

### JavaScript/Fetch
```javascript
async function salvarDiagnostico(dados) {
  const response = await fetch('https://seu-dominio.com/api/diagnostico/salvar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      diagnostico_id: 'DIA-' + Date.now().toString().slice(-6),
      nome: 'Carlos Silva',
      empresa: 'Carlos Reformas',
      segmento: 'Construção e reforma',
      telefone: '34999999999', // Opcional, mas recomendado
      nota_geral: 38,
      nota_presenca_confianca: 25,
      nota_atendimento: 52,
      nota_apresentacao: 44,
      nota_fechamento: 30,
      principal_gargalo: 'Presença e confiança',
      respostas_brutas: {
        // As 12 respostas do diagnóstico
        pergunta_1: 'resposta 1',
        pergunta_2: 'resposta 2',
        // ... e assim por diante
      }
    })
  });

  const resultado = await response.json();
  if (response.ok) {
    // Sucesso! Mostrar botão "Falar com o FechaPro"
    const whatsappUrl = `https://wa.me/${resultado.telefone}?text=Código: ${resultado.diagnostico_id}`;
    // Redirecionar ou mostrar link
  }
}
```

### jQuery/AJAX
```javascript
$.ajax({
  url: 'https://seu-dominio.com/api/diagnostico/salvar',
  type: 'POST',
  contentType: 'application/json',
  data: JSON.stringify({
    diagnostico_id: 'DIA-' + Math.floor(Math.random() * 1000000),
    nome: $('#nome').val(),
    empresa: $('#empresa').val(),
    segmento: $('#segmento').val(),
    nota_geral: parseInt($('#nota_geral').val()),
    nota_presenca_confianca: parseInt($('#nota_presenca_confianca').val()),
    nota_atendimento: parseInt($('#nota_atendimento').val()),
    nota_apresentacao: parseInt($('#nota_apresentacao').val()),
    nota_fechamento: parseInt($('#nota_fechamento').val()),
    principal_gargalo: $('#principal_gargalo').val(),
    respostas_brutas: { /* respostas */ }
  }),
  success: function(resultado) {
    console.log('Diagnóstico salvo:', resultado.diagnostico_id);
    // Redirecionar para WhatsApp
  },
  error: function(err) {
    console.error('Erro:', err);
  }
});
```

### cURL (para teste)
```bash
curl -X POST http://localhost:3000/api/diagnostico/salvar \
  -H "Content-Type: application/json" \
  -d '{
    "diagnostico_id": "DIA-123456",
    "nome": "Carlos Silva",
    "empresa": "Carlos Reformas",
    "segmento": "Construção",
    "nota_geral": 38,
    "nota_presenca_confianca": 25,
    "nota_atendimento": 52,
    "nota_apresentacao": 44,
    "nota_fechamento": 30,
    "principal_gargalo": "Presença e confiança",
    "respostas_brutas": {}
  }'
```

---

## 2. Resposta da API

### Sucesso (HTTP 200)
```json
{
  "sucesso": true,
  "diagnostico_id": "DIA-123456",
  "categoria": "LEAD_PRESENCA",
  "dor_principal": "NAO_ENCONTRADO_OU_NAO_TRANSMITE_CONFIANCA"
}
```

### Erro (HTTP 400/500)
```json
{
  "erro": "Dados obrigatórios faltando: diagnostico_id, nome, nota_geral"
}
```

---

## 3. Enviar para WhatsApp

Depois de salvar o diagnóstico, redirecionar para WhatsApp:

### Opção 1: Abrir WhatsApp (sem mensagem pré-preenchida)
```javascript
window.location.href = 'https://wa.me/5534999999999';
```

### Opção 2: Abrir WhatsApp com mensagem (no mobile, pode não funcionar)
```javascript
const telefone = '5534999999999';
const mensagem = `Código: ${diagnosticoId}`;
window.location.href = `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
```

### Opção 3: Link do WhatsApp Business (melhor)
```javascript
const telefone = '5534999999999'; // Seu WhatsApp do FechaPro
const mensagem = `Olá! Acabei de fazer meu diagnóstico no FechaPro.\n\nCódigo: ${diagnosticoId}\nQuero entender como corrigir os problemas encontrados.`;
const whatsappUrl = `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
window.location.href = whatsappUrl;
```

---

## 4. Buscar Diagnóstico (Público)

O bot usa isso internamente, mas você pode testar manualmente:

### Fetch
```javascript
async function buscarDiagnostico(diagnosticoId) {
  const response = await fetch(`/api/diagnostico/${diagnosticoId}`);
  const dados = await response.json();
  console.log(dados);
}
```

### cURL
```bash
curl http://localhost:3000/api/diagnostico/DIA-123456
```

### Resposta
```json
{
  "nome": "Carlos",
  "empresa": "Carlos Reformas",
  "segmento": "Construção",
  "nota_geral": 38,
  "nota_presenca_confianca": 25,
  "nota_atendimento": 52,
  "nota_apresentacao": 44,
  "nota_fechamento": 30,
  "principal_gargalo": "Presença e confiança",
  "categoria": "LEAD_PRESENCA",
  "dor_principal": "NAO_ENCONTRADO_OU_NAO_TRANSMITE_CONFIANCA",
  "solucao_prioritaria": "GOOGLE_E_LANDING_PAGE",
  "recomendacoes": [
    "Otimizar perfil no Google Meu Negócio com fotos e descrição clara",
    "Criar página profissional que explique serviços e diferencias",
    "Adicionar provas sociais: avaliações, depoimentos e portfólio",
    "Centralizar contatos: telefone, WhatsApp e email visíveis",
    "Implementar FAQ respondendo principais dúvidas de clientes"
  ],
  "diagnostico_id": "DIA-123456"
}
```

---

## 5. Fluxo Completo de Exemplo (Frontend)

```html
<!DOCTYPE html>
<html>
<head>
  <title>Diagnóstico FechaPro</title>
</head>
<body>
  <form id="diagnostico-form">
    <!-- 12 perguntas aqui -->
    <input type="text" id="nome" placeholder="Seu nome">
    <input type="text" id="empresa" placeholder="Sua empresa">
    <!-- ... mais campos ... -->
    <button type="submit">Enviar Diagnóstico</button>
  </form>

  <script>
    document.getElementById('diagnostico-form').addEventListener('submit', async (e) => {
      e.preventDefault();

      // 1. Coletar dados do formulário
      const dados = {
        diagnostico_id: 'DIA-' + Date.now().toString().slice(-6),
        nome: document.getElementById('nome').value,
        empresa: document.getElementById('empresa').value,
        // ... coletar as 12 respostas ...
        nota_geral: 38,
        nota_presenca_confianca: 25,
        nota_atendimento: 52,
        nota_apresentacao: 44,
        nota_fechamento: 30,
        principal_gargalo: 'Presença e confiança',
      };

      try {
        // 2. Salvar diagnóstico no backend
        const response = await fetch('/api/diagnostico/salvar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados)
        });

        const resultado = await response.json();

        if (!response.ok) {
          alert('Erro: ' + resultado.erro);
          return;
        }

        // 3. Redirecionar para WhatsApp
        const telefoneBot = '5534999999999'; // WhatsApp do FechaPro
        const mensagem = `Olá! Acabei de fazer meu diagnóstico no FechaPro.

Código: ${resultado.diagnostico_id}
Quero entender como corrigir os problemas encontrados.`;

        window.location.href = 
          `https://wa.me/${telefoneBot}?text=${encodeURIComponent(mensagem)}`;

      } catch (err) {
        alert('Erro ao salvar diagnóstico: ' + err.message);
      }
    });
  </script>
</body>
</html>
```

---

## 6. Testes com Postman/Insomnia

### Requisição: Salvar Diagnóstico
```
POST http://localhost:3000/api/diagnostico/salvar
Content-Type: application/json

{
  "diagnostico_id": "DIA-POSTMAN-1",
  "nome": "João Silva",
  "empresa": "Silva Consultoria",
  "segmento": "Consultoria empresarial",
  "telefone": "11999999999",
  "nota_geral": 45,
  "nota_presenca_confianca": 40,
  "nota_atendimento": 50,
  "nota_apresentacao": 45,
  "nota_fechamento": 48,
  "principal_gargalo": "Atendimento",
  "respostas_brutas": {
    "Q1": "Resposta 1",
    "Q2": "Resposta 2"
  }
}
```

### Requisição: Buscar Diagnóstico
```
GET http://localhost:3000/api/diagnostico/DIA-POSTMAN-1
```

---

## 7. Integração com Página Existente

Se você já tem uma página de diagnóstico e quer integrar:

### Passo 1: Coletar as 12 respostas
```javascript
const respostas = {
  presenca_google: 'Sim, mas não otimizado',
  presenca_site: 'Tenho site mas muito antigo',
  // ... 10 mais perguntas ...
};
```

### Passo 2: Calcular notas
```javascript
function calcularNotas(respostas) {
  // Sua lógica de cálculo aqui
  return {
    nota_geral: 38,
    nota_presenca_confianca: 25,
    nota_atendimento: 52,
    nota_apresentacao: 44,
    nota_fechamento: 30,
    principal_gargalo: 'Presença e confiança'
  };
}
```

### Passo 3: Enviar para backend
```javascript
async function finalizarDiagnostico(clienteInfo, respostas) {
  const notas = calcularNotas(respostas);
  
  const dados = {
    diagnostico_id: 'DIA-' + Date.now().toString().slice(-6),
    nome: clienteInfo.nome,
    empresa: clienteInfo.empresa,
    segmento: clienteInfo.segmento,
    ...notas,
    respostas_brutas: respostas
  };

  const response = await fetch('/api/diagnostico/salvar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });

  const resultado = await response.json();
  return resultado.diagnostico_id;
}
```

---

## 8. Possíveis Erros e Soluções

### Erro: "CORS error"
**Solução**: O servidor já permite requisições de qualquer origem no endpoint `/api/diagnostico/salvar`. Se ainda tiver erro, verifique se o frontend está no mesmo domínio ou configure CORS no servidor.

### Erro: "Dados obrigatórios faltando"
**Solução**: Verifique se `diagnostico_id`, `nome` e `nota_geral` foram enviados e têm valores válidos.

### Erro: "Sistema de diagnóstico não inicializado"
**Solução**: O servidor não iniciou corretamente. Verifique se o banco de dados está conectado. Reinicie o servidor.

### Erro: "Limite de requisições excedido"
**Solução**: Você está fazendo muitas requisições rapidamente. Aguarde alguns segundos antes de tentar novamente.

---

## 9. Monitorar Diagnósticos Salvos

### Ver diagnósticos via SQL
```sql
SELECT diagnostico_id, nome, empresa, nota_geral, categoria, criado_em 
FROM diagnosticos 
ORDER BY criado_em DESC 
LIMIT 20;
```

### Ver categorias mais comuns
```sql
SELECT categoria, COUNT(*) as total 
FROM diagnosticos 
GROUP BY categoria 
ORDER BY total DESC;
```

### Ver diagnósticos com baixa nota
```sql
SELECT diagnostico_id, nome, empresa, nota_geral 
FROM diagnosticos 
WHERE nota_geral < 40 
ORDER BY nota_geral ASC;
```

---

## 10. Teste Prático Agora

Acesse o teste interativo:
```
http://localhost:3000/diagnostico-teste.html
```

Este formulário permite testar a API de diagnóstico sem precisar modificar a página web real.
