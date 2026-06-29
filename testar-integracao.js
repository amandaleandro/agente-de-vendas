#!/usr/bin/env node
// Script para testar a integração da API

const http = require('http');

class TestadorIntegracao {
  constructor(baseUrl = 'http://localhost:3099', apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  fazer_requisicao(url, opcoes = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const headers = opcoes.headers || {};

      const config = {
        hostname: urlObj.hostname,
        port: urlObj.port || 80,
        path: urlObj.pathname + urlObj.search,
        method: opcoes.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      };

      if (this.apiKey) {
        config.headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const req = http.request(config, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: parsed,
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: body,
            });
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  async testarStatus() {
    console.log('\n🔍 Testando status do servidor...');
    try {
      const resultado = await this.fazer_requisicao(
        `${this.baseUrl}/api/status`
      );
      if (resultado.status === 200) {
        console.log('✅ Servidor está online');
        return true;
      } else {
        console.log('❌ Servidor respondeu com erro:', resultado.status);
        return false;
      }
    } catch (err) {
      console.log('❌ Erro ao conectar:', err.message);
      return false;
    }
  }

  async testarAutenticacao() {
    console.log('\n🔒 Testando autenticação...');

    if (!this.apiKey) {
      console.log('⚠️  Nenhuma API key fornecida. Não é possível testar.');
      console.log('   Use: node testar-integracao.js sua-chave-aqui');
      return false;
    }

    try {
      // Tentar com chave inválida
      const testador = new TestadorIntegracao(
        this.baseUrl,
        'chave-invalida-teste'
      );

      const resultado = await testador.fazer_requisicao(
        `${this.baseUrl}/api/integrations/diagnostics/dgp_teste`
      );

      if (resultado.status === 401) {
        console.log('✅ Autenticação está funcionando (rejeita chave inválida)');
        return true;
      } else if (resultado.status === 404) {
        console.log('✅ Endpoint existe e autenticação passou');
        return true;
      } else {
        console.log('⚠️  Resposta inesperada:', resultado.status);
        return true;
      }
    } catch (err) {
      console.log('❌ Erro ao testar autenticação:', err.message);
      return false;
    }
  }

  async testarEndpoint(token) {
    console.log(`\n📝 Testando endpoint com token: ${token}`);

    if (!token) {
      console.log('⚠️  Nenhum token fornecido.');
      console.log('   Endpoint: GET /api/integrations/diagnostics/:token');
      console.log('   Exemplo: GET /api/integrations/diagnostics/dgp_abc123');
      return null;
    }

    try {
      const resultado = await this.fazer_requisicao(
        `${this.baseUrl}/api/integrations/diagnostics/${token}`
      );

      if (resultado.status === 200) {
        console.log('✅ Diagnóstico encontrado!');
        console.log(JSON.stringify(resultado.body, null, 2));
        return resultado.body;
      } else if (resultado.status === 404) {
        console.log('❌ Diagnóstico não encontrado.');
        console.log('   Verifique se o token está correto e o diagnóstico foi salvo.');
        return null;
      } else if (resultado.status === 401) {
        console.log('❌ Não autorizado (401)');
        console.log('   Verifique a API key.');
        return null;
      } else {
        console.log(`❌ Erro ${resultado.status}`);
        console.log(JSON.stringify(resultado.body, null, 2));
        return null;
      }
    } catch (err) {
      console.log('❌ Erro ao chamar endpoint:', err.message);
      return null;
    }
  }

  async testarExtracao() {
    console.log('\n🔎 Testando extração de token...');

    const exemplos = [
      'dgp_a7K92mP4',
      'Olá! Meu código é dgp_abc123xyz',
      'Código do diagnóstico: dgp_x1y2z3w4a5b6c7d8',
      'Sem token aqui',
    ];

    exemplos.forEach((texto) => {
      const match = texto.match(/dgp_[a-zA-Z0-9]+/);
      const token = match ? match[0] : null;
      console.log(`  "${texto.substring(0, 40)}" → ${token || '(nenhum token)'}`);
    });

    return true;
  }

  exibirHelp() {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║     Testador de Integração - FechaPro ↔ Chatbot           ║
╚════════════════════════════════════════════════════════════╝

USO:
  node testar-integracao.js [API_KEY] [TOKEN]

PARÂMETROS:
  API_KEY    - Sua chave de integração (CHATBOT_INTEGRATION_KEY)
  TOKEN      - Token do diagnóstico a testar (dgp_xxx)

EXEMPLOS:
  # Apenas verificar se servidor está online
  node testar-integracao.js

  # Testar autenticação
  node testar-integracao.js sua-chave-de-integracao

  # Testar diagnóstico específico
  node testar-integracao.js sua-chave-de-integracao dgp_a7K92mP4

O QUE SERÁ TESTADO:
  ✓ Servidor está online
  ✓ Autenticação funciona
  ✓ Endpoint /api/integrations/diagnostics/:token
  ✓ Extração de tokens de mensagens
`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const apiKey = args[0] || process.env.FECHAPRO_INTEGRATION_KEY;
  const token = args[1];
  const baseUrl = process.env.FECHAPRO_URL || 'http://localhost:3099';

  const testador = new TestadorIntegracao(baseUrl, apiKey);

  testador.exibirHelp();

  console.log(`
📍 Configuração:
   URL Base: ${baseUrl}
   API Key: ${apiKey ? '✓ Fornecida' : '⚠️  Não fornecida'}
   Token: ${token ? `✓ ${token}` : '⚠️  Não fornecido'}
`);

  // Executar testes
  const servidorOnline = await testador.testarStatus();

  if (!servidorOnline) {
    console.log(
      '\n⚠️  Servidor não está acessível. Certifique-se de que o FechaPro está rodando.'
    );
    console.log(`   npm start ou node index.js`);
    process.exit(1);
  }

  await testador.testarAutenticacao();
  await testador.testarExtracao();

  if (token) {
    const diagnostico = await testador.testarEndpoint(token);
    if (diagnostico) {
      console.log('\n✅ Integração funcionando corretamente!');
    } else {
      console.log(
        '\n⚠️  Não foi possível carregar o diagnóstico. Verifique o token.'
      );
    }
  } else {
    console.log('\n💡 Dica: Forneça um token para testar:');
    console.log('   node testar-integracao.js sua-chave dgp_xxxxx');
  }
}

main().catch(console.error);
