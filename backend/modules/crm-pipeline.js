const fs = require('fs');
const path = require('path');
const chatStore = require('./chat-store');
const qualityCenter = require('./quality-center');

const DATA_FILE = path.join(__dirname, '..', 'data', 'crm-pipeline.json');
const ESTAGIOS = ['novo', 'respondeu', 'qualificado', 'proposta', 'ganho', 'perdido'];
const MOTIVOS_PERDA = [
  { key: 'preco', label: 'Preço alto' },
  { key: 'sem_resposta', label: 'Sem resposta' },
  { key: 'concorrente', label: 'Foi para concorrente' },
  { key: 'sem_verba', label: 'Sem verba/orçamento' },
  { key: 'fora_perfil', label: 'Fora do perfil ideal' },
  { key: 'timing_errado', label: 'Timing errado' },
  { key: 'nao_informado', label: 'Não informado' },
  { key: 'outro', label: 'Outro' }
];

function chaveDe(sessao, jid) {
  return `${sessao}:${jid}`;
}

function telefoneFromJid(jid) {
  return String(jid || '').split('@')[0].replace(/\D/g, '');
}

class CRMPipeline {
  constructor() {
    this.overrides = new Map();
    this.carregar();
  }

  carregar() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const dados = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        Object.entries(dados).forEach(([key, val]) => this.overrides.set(key, val));
      }
    } catch (err) {
      console.error('Erro ao carregar pipeline CRM:', err.message);
    }
  }

  salvar() {
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(Object.fromEntries(this.overrides), null, 2));
    } catch (err) {
      console.error('Erro ao salvar pipeline CRM:', err.message);
    }
  }

  definirEstagio(sessao, jid, estagio, motivoPerda = null) {
    if (!ESTAGIOS.includes(estagio)) throw new Error(`Estagio invalido. Use um de: ${ESTAGIOS.join(', ')}`);

    const key = chaveDe(sessao, jid);
    const atual = this.overrides.get(key) || {};

    let motivoFinal = null;
    if (estagio === 'perdido') {
      const candidato = motivoPerda || atual.motivoPerda || 'nao_informado';
      if (!MOTIVOS_PERDA.some(m => m.key === candidato)) {
        throw new Error(`Motivo de perda invalido. Use um de: ${MOTIVOS_PERDA.map(m => m.key).join(', ')}`);
      }
      motivoFinal = candidato;
    }

    const registro = {
      ...atual,
      estagio,
      motivoPerda: motivoFinal,
      atualizadoEm: new Date().toISOString()
    };
    this.overrides.set(key, registro);
    this.salvar();
    return registro;
  }

  definirValor(sessao, jid, valor) {
    const key = chaveDe(sessao, jid);
    const atual = this.overrides.get(key) || {};
    const registro = { ...atual, valorEstimado: Number(valor) || 0, atualizadoEm: new Date().toISOString() };
    this.overrides.set(key, registro);
    this.salvar();
    return registro;
  }

  definirOrigem(sessao, jid, origem) {
    const key = chaveDe(sessao, jid);
    const atual = this.overrides.get(key) || {};
    const registro = { ...atual, origem: String(origem || '').trim() || 'prospeccao_whatsapp', atualizadoEm: new Date().toISOString() };
    this.overrides.set(key, registro);
    this.salvar();
    return registro;
  }

  // Deriva o estagio quando ainda nao houve movimentacao manual (ganho/perdido sempre sao manuais).
  estagioAutomatico(conversa, qcItem) {
    const mensagens = conversa.messages || [];
    const temResposta = mensagens.some(msg => !msg.fromMe);
    if (!temResposta) return 'novo';

    const analise = qcItem?.analise || {};
    const texto = String(qcItem?.lastMessage || conversa.lastMessage || '').toLowerCase();
    const falouProposta = Boolean(analise.valor) || /proposta|contrato|fechar negocio|comprar|assinar|orcamento fechado/.test(texto);
    if (falouProposta) return 'proposta';

    const qualificado = Boolean(analise.problema) || (qcItem?.score || 0) >= 55;
    if (qualificado) return 'qualificado';

    return 'respondeu';
  }

  funil() {
    const conversas = chatStore.getAllConversations();
    const qc = qualityCenter.dashboard();
    const qcMap = new Map(qc.oportunidades.map(item => [chaveDe(item.sessao, item.jid), item]));

    const leads = conversas.map(conversa => {
      const key = chaveDe(conversa.sessao, conversa.jid);
      const override = this.overrides.get(key) || {};
      const qcItem = qcMap.get(key);
      const estagio = override.estagio || this.estagioAutomatico(conversa, qcItem);

      return {
        sessao: conversa.sessao,
        jid: conversa.jid,
        telefone: telefoneFromJid(conversa.jid),
        nome: conversa.name,
        estagio,
        motivoPerda: override.motivoPerda || null,
        valorEstimado: override.valorEstimado || 0,
        origem: override.origem || 'prospeccao_whatsapp',
        score: qcItem?.score || 0,
        proximaAcao: qcItem?.proximaAcao || 'Aguardar resposta',
        lastMessage: qcItem?.lastMessage || conversa.lastMessage || '',
        lastTime: conversa.lastTime,
        movidoManualmente: Boolean(override.estagio)
      };
    }).sort((a, b) => b.lastTime - a.lastTime);

    const estagios = {};
    ESTAGIOS.forEach(estagio => { estagios[estagio] = []; });
    leads.forEach(lead => estagios[lead.estagio].push(lead));

    const abertos = leads.filter(lead => lead.estagio !== 'ganho' && lead.estagio !== 'perdido');
    const ganhos = estagios.ganho;
    const fechados = ganhos.length + estagios.perdido.length;

    return {
      resumo: {
        total: leads.length,
        porEstagio: Object.fromEntries(ESTAGIOS.map(estagio => [estagio, estagios[estagio].length])),
        valorTotalAberto: abertos.reduce((soma, lead) => soma + (lead.valorEstimado || 0), 0),
        valorGanho: ganhos.reduce((soma, lead) => soma + (lead.valorEstimado || 0), 0),
        taxaConversao: fechados > 0 ? Number(((ganhos.length / fechados) * 100).toFixed(1)) : 0
      },
      estagios,
      motivosPerda: MOTIVOS_PERDA
    };
  }

  detalhe(sessao, jid) {
    const conversa = chatStore.getAllConversations()
      .find(item => Number(item.sessao) === Number(sessao) && item.jid === jid);
    if (!conversa) throw new Error('Conversa nao encontrada');

    const override = this.overrides.get(chaveDe(sessao, jid)) || {};
    return {
      sessao: conversa.sessao,
      jid: conversa.jid,
      telefone: telefoneFromJid(conversa.jid),
      nome: conversa.name,
      estagio: override.estagio || this.estagioAutomatico(conversa, null),
      motivoPerda: override.motivoPerda || null,
      valorEstimado: override.valorEstimado || 0,
      origem: override.origem || 'prospeccao_whatsapp',
      historico: conversa.messages || []
    };
  }
}

module.exports = new CRMPipeline();
module.exports.ESTAGIOS = ESTAGIOS;
module.exports.MOTIVOS_PERDA = MOTIVOS_PERDA;
