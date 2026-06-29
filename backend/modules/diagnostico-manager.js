// Gerenciador de diagnósticos: salva, busca e categoriza resultados
const { randomBytes } = require('crypto');

class DiagnosticoManager {
  constructor(pool) {
    this.pool = pool;
    this.diagnosticos = new Map(); // cache em memória: diagnosticoId -> dados
  }

  gerarPublicToken() {
    return `dgp_${randomBytes(12).toString('hex')}`;
  }

  async inicializarTabela() {
    try {
      // Criar tabela
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS diagnosticos (
          id SERIAL PRIMARY KEY,
          diagnostico_id VARCHAR(50) UNIQUE NOT NULL,
          public_token VARCHAR(50) UNIQUE,
          telefone VARCHAR(20),
          nome VARCHAR(255),
          empresa VARCHAR(255),
          segmento VARCHAR(100),
          nota_geral INT,
          nota_presenca_confianca INT,
          nota_atendimento INT,
          nota_apresentacao INT,
          nota_fechamento INT,
          principal_gargalo VARCHAR(100),
          categoria VARCHAR(50),
          dor_principal VARCHAR(100),
          solucao_prioritaria VARCHAR(100),
          temperatura VARCHAR(20),
          etapa_comercial VARCHAR(50),
          respostas_brutas JSONB,
          recomendacoes JSONB,
          criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Criar índices
      await this.pool.query('CREATE INDEX IF NOT EXISTS idx_diag_telefone ON diagnosticos(telefone)');
      await this.pool.query('CREATE INDEX IF NOT EXISTS idx_diag_categoria ON diagnosticos(categoria)');
      await this.pool.query('CREATE INDEX IF NOT EXISTS idx_diag_criado ON diagnosticos(criado_em)');

      console.log('[Diagnóstico] Tabela inicializada com sucesso');
    } catch (err) {
      if (!err.message.includes('already exists')) {
        console.error('[Diagnóstico] Erro ao criar tabela:', err.message);
      }
    }
  }

  async salvarDiagnostico(diagnostico) {
    const {
      diagnostico_id,
      telefone,
      nome,
      empresa,
      segmento,
      nota_geral,
      nota_presenca_confianca,
      nota_atendimento,
      nota_apresentacao,
      nota_fechamento,
      principal_gargalo,
      respostas_brutas,
    } = diagnostico;

    try {
      // Categorizar automaticamente
      const categorizado = this.categorizarDiagnostico({
        nota_geral,
        nota_presenca_confianca,
        nota_atendimento,
        nota_apresentacao,
        nota_fechamento,
        principal_gargalo,
      });

      const public_token = this.gerarPublicToken();

      const dados = {
        diagnostico_id,
        public_token,
        telefone,
        nome,
        empresa,
        segmento,
        nota_geral,
        nota_presenca_confianca,
        nota_atendimento,
        nota_apresentacao,
        nota_fechamento,
        principal_gargalo,
        categoria: categorizado.categoria,
        dor_principal: categorizado.dor_principal,
        solucao_prioritaria: categorizado.solucao_prioritaria,
        temperatura: this.calcularTemperatura(nota_geral),
        etapa_comercial: 'DIAGNOSTICO',
        respostas_brutas: respostas_brutas || {},
        recomendacoes: categorizado.recomendacoes || [],
      };

      // Tentar inserir ou atualizar
      const resultado = await this.pool.query(
        `INSERT INTO diagnosticos
         (diagnostico_id, public_token, telefone, nome, empresa, segmento, nota_geral,
          nota_presenca_confianca, nota_atendimento, nota_apresentacao,
          nota_fechamento, principal_gargalo, categoria, dor_principal,
          solucao_prioritaria, temperatura, etapa_comercial, respostas_brutas,
          recomendacoes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
         ON CONFLICT (diagnostico_id) DO UPDATE SET
         telefone = $3, nome = $4, empresa = $5, segmento = $6, nota_geral = $7,
         nota_presenca_confianca = $8, nota_atendimento = $9, nota_apresentacao = $10,
         nota_fechamento = $11, principal_gargalo = $12, categoria = $13, dor_principal = $14,
         solucao_prioritaria = $15, temperatura = $16, etapa_comercial = $17,
         respostas_brutas = $18, recomendacoes = $19, atualizado_em = CURRENT_TIMESTAMP`,
        [
          dados.diagnostico_id,
          dados.public_token,
          dados.telefone,
          dados.nome,
          dados.empresa,
          dados.segmento,
          dados.nota_geral,
          dados.nota_presenca_confianca,
          dados.nota_atendimento,
          dados.nota_apresentacao,
          dados.nota_fechamento,
          dados.principal_gargalo,
          dados.categoria,
          dados.dor_principal,
          dados.solucao_prioritaria,
          dados.temperatura,
          dados.etapa_comercial,
          JSON.stringify(dados.respostas_brutas),
          JSON.stringify(dados.recomendacoes),
        ]
      );

      // Cache em memória
      this.diagnosticos.set(diagnostico_id, dados);

      return {
        sucesso: true,
        diagnostico_id,
        public_token,
        categoria: dados.categoria,
        dor_principal: dados.dor_principal,
        solucao_prioritaria: dados.solucao_prioritaria,
      };
    } catch (err) {
      console.error('[Diagnóstico] Erro ao salvar:', err.message);
      throw err;
    }
  }

  async buscarDiagnostico(diagnostico_id) {
    // Verificar cache primeiro
    if (this.diagnosticos.has(diagnostico_id)) {
      return this.diagnosticos.get(diagnostico_id);
    }

    try {
      const resultado = await this.pool.query(
        'SELECT * FROM diagnosticos WHERE diagnostico_id = $1',
        [diagnostico_id]
      );

      if (resultado.rows.length === 0) {
        return null;
      }

      const diagnostico = resultado.rows[0];

      // Parsear JSONB se necessário
      if (typeof diagnostico.respostas_brutas === 'string') {
        diagnostico.respostas_brutas = JSON.parse(diagnostico.respostas_brutas);
      }
      if (typeof diagnostico.recomendacoes === 'string') {
        diagnostico.recomendacoes = JSON.parse(diagnostico.recomendacoes);
      }

      // Colocar no cache
      this.diagnosticos.set(diagnostico_id, diagnostico);

      return diagnostico;
    } catch (err) {
      console.error('[Diagnóstico] Erro ao buscar:', err.message);
      throw err;
    }
  }

  async buscarPorTelefone(telefone) {
    try {
      const resultado = await this.pool.query(
        'SELECT * FROM diagnosticos WHERE telefone = $1 ORDER BY criado_em DESC LIMIT 1',
        [telefone]
      );

      if (resultado.rows.length === 0) {
        return null;
      }

      return resultado.rows[0];
    } catch (err) {
      console.error('[Diagnóstico] Erro ao buscar por telefone:', err.message);
      throw err;
    }
  }

  async buscarPorPublicToken(public_token) {
    try {
      const resultado = await this.pool.query(
        'SELECT * FROM diagnosticos WHERE public_token = $1',
        [public_token]
      );

      if (resultado.rows.length === 0) {
        return null;
      }

      const diagnostico = resultado.rows[0];

      // Parsear JSONB se necessário
      if (typeof diagnostico.respostas_brutas === 'string') {
        diagnostico.respostas_brutas = JSON.parse(diagnostico.respostas_brutas);
      }
      if (typeof diagnostico.recomendacoes === 'string') {
        diagnostico.recomendacoes = JSON.parse(diagnostico.recomendacoes);
      }

      return diagnostico;
    } catch (err) {
      console.error('[Diagnóstico] Erro ao buscar por public token:', err.message);
      throw err;
    }
  }

  categorizarDiagnostico(notas) {
    const {
      nota_geral,
      nota_presenca_confianca,
      nota_atendimento,
      nota_apresentacao,
      nota_fechamento,
      principal_gargalo,
    } = notas;

    let categoria = 'LEAD_INDEFINIDO';
    let dor_principal = 'PROCESSO_DESORGANIZADO';
    let solucao_prioritaria = 'DIAGNOSTICO';
    const recomendacoes = [];

    // Contar quantas notas estão baixas (< 50)
    const notasAltas = [
      nota_presenca_confianca,
      nota_atendimento,
      nota_apresentacao,
      nota_fechamento,
    ].filter(n => n >= 50).length;

    // Se 3 ou mais áreas estão baixas
    if (notasAltas <= 1) {
      categoria = 'LEAD_ESTRUTURA_COMPLETA';
      dor_principal = 'PROCESSO_COMERCIAL_DESORGANIZADO';
      solucao_prioritaria = 'IMPLANTACAO_COMPLETA';
      recomendacoes.push(
        'Organizar presença no Google e criar landing page profissional',
        'Estruturar processo de atendimento e qualificação de clientes',
        'Montar apresentação profissional com portfólio e diferenciais',
        'Implementar acompanhamento automático após propostas',
        'Treinar equipe nos passos comerciais principais'
      );
      return { categoria, dor_principal, solucao_prioritaria, recomendacoes };
    }

    // Se principal_gargalo é identificado, usar ele
    if (principal_gargalo) {
      if (principal_gargalo.toLowerCase().includes('presença') ||
          principal_gargalo.toLowerCase().includes('confiança')) {
        categoria = 'LEAD_PRESENCA';
        dor_principal = 'NAO_ENCONTRADO_OU_NAO_TRANSMITE_CONFIANCA';
        solucao_prioritaria = 'GOOGLE_E_LANDING_PAGE';
        recomendacoes.push(
          'Otimizar perfil no Google Meu Negócio com fotos e descrição clara',
          'Criar página profissional que explique serviços e diferencias',
          'Adicionar provas sociais: avaliações, depoimentos e portfólio',
          'Centralizar contatos: telefone, WhatsApp e email visíveis',
          'Implementar FAQ respondendo principais dúvidas de clientes'
        );
      } else if (principal_gargalo.toLowerCase().includes('atendimento')) {
        categoria = 'LEAD_ATENDIMENTO';
        dor_principal = 'CONVERSA_NAO_AVANCA';
        solucao_prioritaria = 'PROCESSO_DE_ATENDIMENTO';
        recomendacoes.push(
          'Criar roteiro de qualificação com perguntas-chave',
          'Treinar respostas rápidas às objeções mais comuns',
          'Estruturar mensagens que avancem a conversa para proposta',
          'Definir tempo máximo de resposta para cada etapa',
          'Usar templates que automatizam conversas repetitivas'
        );
      } else if (principal_gargalo.toLowerCase().includes('apresentação')) {
        categoria = 'LEAD_APRESENTACAO';
        dor_principal = 'ORCAMENTO_SEM_VALOR_PERCEBIDO';
        solucao_prioritaria = 'PROPOSTA_PROFISSIONAL';
        recomendacoes.push(
          'Substituir orçamento simples por proposta com contexto',
          'Estruturar seções: situação, solução, investimento, prazo',
          'Incluir portfólio visual e depoimentos de clientes similares',
          'Adicionar condições claras: prazos, formas de pagamento, próximos passos',
          'Criar apresentação visual que suporte a conversa de venda'
        );
      } else if (principal_gargalo.toLowerCase().includes('fechamento')) {
        categoria = 'LEAD_FECHAMENTO';
        dor_principal = 'FALTA_DE_ACOMPANHAMENTO';
        solucao_prioritaria = 'FOLLOW_UP_E_FECHAMENTO';
        recomendacoes.push(
          'Implementar acompanhamento automático: quem abriu, quando, quantas vezes',
          'Definir gatilhos de follow-up: 2 dias sem resposta, 5 dias sem aceite',
          'Criar mensagens progressivas que levam ao aceite ou encontro',
          'Montar estrutura de contador de prazo: urgência sem parecer desesperado',
          'Treinar transição entre proposta e contrato e assinatura'
        );
      }
    }

    return { categoria, dor_principal, solucao_prioritaria, recomendacoes };
  }

  calcularTemperatura(nota_geral) {
    if (nota_geral >= 70) return 'QUENTE';
    if (nota_geral >= 50) return 'MORNO';
    return 'FRIO';
  }

  extrairDiagnosticoId(texto) {
    // Padrão: DIA-XXXX ou qualquer código mencionado
    const match = texto.match(/DIA-\d+|DIAG-\d+|[A-Z]{3}-\d+/i);
    return match ? match[0].toUpperCase() : null;
  }

  formatarResultadoParaChat(diagnostico) {
    if (!diagnostico) {
      return null;
    }

    return {
      nome: diagnostico.nome,
      empresa: diagnostico.empresa,
      segmento: diagnostico.segmento,
      nota_geral: diagnostico.nota_geral,
      nota_presenca_confianca: diagnostico.nota_presenca_confianca,
      nota_atendimento: diagnostico.nota_atendimento,
      nota_apresentacao: diagnostico.nota_apresentacao,
      nota_fechamento: diagnostico.nota_fechamento,
      principal_gargalo: diagnostico.principal_gargalo,
      categoria: diagnostico.categoria,
      dor_principal: diagnostico.dor_principal,
      solucao_prioritaria: diagnostico.solucao_prioritaria,
      recomendacoes: diagnostico.recomendacoes || [],
      diagnostico_id: diagnostico.diagnostico_id,
    };
  }
}

module.exports = DiagnosticoManager;
