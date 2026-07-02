/**
 * Integração com CRMs
 * - Pipedrive: sincroniza leads → deals
 * - HubSpot: contactos + deals
 */

const axios = require('axios');
const logger = console;

class CRMIntegration {
  constructor() {
    this.pipedrive = {
      apiKey: process.env.PIPEDRIVE_API_KEY || null,
      enabled: !!process.env.PIPEDRIVE_API_KEY,
      baseUrl: 'https://api.pipedrive.com/v1'
    };

    this.hubspot = {
      apiKey: process.env.HUBSPOT_API_KEY || null,
      enabled: !!process.env.HUBSPOT_API_KEY,
      baseUrl: 'https://api.hubapi.com'
    };

    this.historico = [];
  }

  async sincronizarComPipedrive(lead) {
    if (!this.pipedrive.enabled) {
      return { sucesso: false, motivo: 'Pipedrive não configurado' };
    }

    try {
      logger.log(`📤 Sincronizando lead com Pipedrive: ${lead.telefone}`);

      // 1. Criar contacto
      const contacto = await this.criarContactoPipedrive(lead);

      if (!contacto.sucesso) {
        throw new Error(`Erro ao criar contacto: ${contacto.erro}`);
      }

      // 2. Criar deal
      const deal = await this.criarDealPipedrive(contacto.id, lead);

      if (!deal.sucesso) {
        throw new Error(`Erro ao criar deal: ${deal.erro}`);
      }

      const resultado = {
        sucesso: true,
        crm: 'pipedrive',
        contacto_id: contacto.id,
        deal_id: deal.id,
        timestamp: new Date()
      };

      this.historico.unshift(resultado);
      logger.log(`✅ Lead sincronizado com Pipedrive: deal ${deal.id}`);
      return resultado;
    } catch (erro) {
      logger.error(`❌ Erro ao sincronizar com Pipedrive: ${erro.message}`);
      return { sucesso: false, erro: erro.message };
    }
  }

  async criarContactoPipedrive(lead) {
    try {
      const response = await axios.post(
        `${this.pipedrive.baseUrl}/persons`,
        {
          name: lead.nome || 'Sem nome',
          phone: [{ value: lead.telefone, primary: true }],
          email: [{ value: lead.email || '', primary: true }],
          custom_fields: {
            empresa: lead.empresa || '',
            origem: 'FechaPro Bot',
            status_qualificacao: lead.qualificacao || 'novo'
          }
        },
        {
          params: { api_token: this.pipedrive.apiKey }
        }
      );

      if (response.data.success) {
        return { sucesso: true, id: response.data.data.id };
      } else {
        return { sucesso: false, erro: response.data.error };
      }
    } catch (erro) {
      return { sucesso: false, erro: erro.message };
    }
  }

  async criarDealPipedrive(contactoId, lead) {
    try {
      const response = await axios.post(
        `${this.pipedrive.baseUrl}/deals`,
        {
          title: `Oportunidade - ${lead.nome || lead.telefone}`,
          person_id: contactoId,
          stage_id: 1, // Estágio inicial
          value: lead.valor_estimado || 0,
          currency: 'BRL',
          status: 'open',
          custom_fields: {
            tipo_produto: lead.produto || '',
            data_primeiro_contato: new Date().toISOString(),
            canal_origem: 'WhatsApp Bot'
          }
        },
        {
          params: { api_token: this.pipedrive.apiKey }
        }
      );

      if (response.data.success) {
        return { sucesso: true, id: response.data.data.id };
      } else {
        return { sucesso: false, erro: response.data.error };
      }
    } catch (erro) {
      return { sucesso: false, erro: erro.message };
    }
  }

  async sincronizarComHubSpot(lead) {
    if (!this.hubspot.enabled) {
      return { sucesso: false, motivo: 'HubSpot não configurado' };
    }

    try {
      logger.log(`📤 Sincronizando lead com HubSpot: ${lead.telefone}`);

      // 1. Criar ou atualizar contacto
      const contacto = await this.criarContactoHubSpot(lead);

      if (!contacto.sucesso) {
        throw new Error(`Erro ao criar contacto: ${contacto.erro}`);
      }

      // 2. Criar deal
      const deal = await this.criarDealHubSpot(contacto.id, lead);

      if (!deal.sucesso) {
        throw new Error(`Erro ao criar deal: ${deal.erro}`);
      }

      const resultado = {
        sucesso: true,
        crm: 'hubspot',
        contacto_id: contacto.id,
        deal_id: deal.id,
        timestamp: new Date()
      };

      this.historico.unshift(resultado);
      logger.log(`✅ Lead sincronizado com HubSpot: deal ${deal.id}`);
      return resultado;
    } catch (erro) {
      logger.error(`❌ Erro ao sincronizar com HubSpot: ${erro.message}`);
      return { sucesso: false, erro: erro.message };
    }
  }

  async criarContactoHubSpot(lead) {
    try {
      const response = await axios.post(
        `${this.hubspot.baseUrl}/crm/v3/objects/contacts`,
        {
          properties: {
            firstname: lead.nome ? lead.nome.split(' ')[0] : 'N/A',
            lastname: lead.nome ? lead.nome.split(' ').slice(1).join(' ') : '',
            phone: lead.telefone,
            email: lead.email || `${lead.telefone}@whatsapp.local`,
            company: lead.empresa || '',
            lifecyclestage: 'subscriber',
            hs_lead_status: 'NEW'
          }
        },
        {
          headers: {
            Authorization: `Bearer ${this.hubspot.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return { sucesso: true, id: response.data.id };
    } catch (erro) {
      if (erro.response?.status === 409) {
        // Contacto já existe
        return { sucesso: true, id: 'existing' };
      }
      return { sucesso: false, erro: erro.message };
    }
  }

  async criarDealHubSpot(contactoId, lead) {
    try {
      const response = await axios.post(
        `${this.hubspot.baseUrl}/crm/v3/objects/deals`,
        {
          properties: {
            dealname: `Oportunidade - ${lead.nome || lead.telefone}`,
            dealstage: 'qualificationinprogress',
            amount: lead.valor_estimado || 0,
            closedate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            dealtype: 'newbusiness',
            description: `Lead capturado via FechaPro WhatsApp Bot\nProduto: ${lead.produto || 'N/A'}`
          },
          associations: [
            {
              id: contactoId,
              types: [{ associationType: 'contact_to_deal' }]
            }
          ]
        },
        {
          headers: {
            Authorization: `Bearer ${this.hubspot.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return { sucesso: true, id: response.data.id };
    } catch (erro) {
      return { sucesso: false, erro: erro.message };
    }
  }

  async sincronizarLead(lead, crms = ['pipedrive', 'hubspot']) {
    const resultados = {};

    if (crms.includes('pipedrive') && this.pipedrive.enabled) {
      resultados.pipedrive = await this.sincronizarComPipedrive(lead);
    }

    if (crms.includes('hubspot') && this.hubspot.enabled) {
      resultados.hubspot = await this.sincronizarComHubSpot(lead);
    }

    if (Object.keys(resultados).length === 0) {
      return {
        sucesso: false,
        erro: 'Nenhum CRM configurado',
        resultados
      };
    }

    return {
      sucesso: Object.values(resultados).some(r => r.sucesso),
      resultados
    };
  }

  obterStatus() {
    return {
      pipedrive: {
        configurado: this.pipedrive.enabled,
        status: this.pipedrive.enabled ? 'conectado' : 'não configurado'
      },
      hubspot: {
        configurado: this.hubspot.enabled,
        status: this.hubspot.enabled ? 'conectado' : 'não configurado'
      },
      ultima_sincronizacao: this.historico[0]?.timestamp || null,
      total_sincronizacoes: this.historico.length
    };
  }

  obterHistorico(limite = 50) {
    return this.historico.slice(0, limite);
  }

  configurarPipedrive(apiKey) {
    this.pipedrive.apiKey = apiKey;
    this.pipedrive.enabled = !!apiKey;
    logger.log(apiKey ? '✅ Pipedrive configurado' : '❌ Pipedrive desconfigurado');
    return this.obterStatus();
  }

  configurarHubSpot(apiKey) {
    this.hubspot.apiKey = apiKey;
    this.hubspot.enabled = !!apiKey;
    logger.log(apiKey ? '✅ HubSpot configurado' : '❌ HubSpot desconfigurado');
    return this.obterStatus();
  }

  testarConexao(crm) {
    if (crm === 'pipedrive') {
      return this.pipedrive.enabled ? { ok: true, crm: 'pipedrive' } : { ok: false, erro: 'Não configurado' };
    }
    if (crm === 'hubspot') {
      return this.hubspot.enabled ? { ok: true, crm: 'hubspot' } : { ok: false, erro: 'Não configurado' };
    }
    return { ok: false, erro: 'CRM inválido' };
  }
}

module.exports = new CRMIntegration();
