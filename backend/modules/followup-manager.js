const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

class FollowupManager {
  constructor(geminiKey, sendFunction) {
    this.geminiKey = geminiKey;
    this.sendFunction = sendFunction; // async (destinatario, texto, sessao)

    this.conhecimentoDir = path.join(__dirname, '..', 'conhecimento');
    this.arquivoTreinamento = path.join(this.conhecimentoDir, 'mensagens_treinamento.jsonl');
    this.arquivoFollowups = path.join(this.conhecimentoDir, 'followups_enviados.json');

    this.cadencia = this.carregarCadencia();
    this.followupsEnviados = new Map();
    this.carregarFollowupsEnviados();

    this.gemini = this.geminiKey ? new GoogleGenAI({ apiKey: this.geminiKey }) : null;
  }

  carregarCadencia() {
    const padrao = [24, 48, 72, 168];
    const horas = String(process.env.FOLLOWUP_CADENCIA_HORAS || padrao.join(','))
      .split(',')
      .map(valor => Number(valor.trim()))
      .filter(valor => Number.isFinite(valor) && valor > 0)
      .sort((a, b) => a - b);

    return (horas.length ? horas : padrao).map((horasInativo, index) => ({
      etapa: index + 1,
      horasInativo,
      chave: `${horasInativo}h`
    }));
  }

  carregarFollowupsEnviados() {
    if (!fs.existsSync(this.arquivoFollowups)) return;

    try {
      const dados = JSON.parse(fs.readFileSync(this.arquivoFollowups, 'utf8'));

      if (Array.isArray(dados)) {
        // Compatibilidade com o formato antigo: ["telefone"].
        this.followupsEnviados = new Map(
          dados.map(telefone => [String(telefone), { enviados: ['24h'] }])
        );
        return;
      }

      if (dados && typeof dados === 'object') {
        this.followupsEnviados = new Map(Object.entries(dados));
      }
    } catch (err) {
      console.error('Erro ao ler followups_enviados.json', err);
    }
  }

  jaEnviouEtapa(telefone, chaveEtapa) {
    const registro = this.followupsEnviados.get(String(telefone));
    return Array.isArray(registro?.enviados) && registro.enviados.includes(chaveEtapa);
  }

  salvarFollowup(telefone, etapa) {
    const tel = String(telefone);
    const registro = this.followupsEnviados.get(tel) || { enviados: [] };

    if (!Array.isArray(registro.enviados)) registro.enviados = [];
    if (!registro.enviados.includes(etapa.chave)) registro.enviados.push(etapa.chave);

    registro.ultimaEtapa = etapa.chave;
    registro.ultimoEnvioEm = new Date().toISOString();
    this.followupsEnviados.set(tel, registro);

    try {
      if (!fs.existsSync(this.conhecimentoDir)) {
        fs.mkdirSync(this.conhecimentoDir, { recursive: true });
      }

      fs.writeFileSync(
        this.arquivoFollowups,
        JSON.stringify(Object.fromEntries(this.followupsEnviados), null, 2),
        'utf8'
      );
    } catch (err) {
      console.error('Erro ao salvar followups_enviados.json', err);
    }
  }

  async analisarEEnviarFollowups() {
    if (!this.gemini || !fs.existsSync(this.arquivoTreinamento)) return;

    console.log('Iniciando rotina de follow-up automatico...');

    try {
      const linhas = fs.readFileSync(this.arquivoTreinamento, 'utf8')
        .split('\n')
        .filter(linha => linha.trim());

      const ultimasMensagens = new Map();

      linhas.forEach(linha => {
        try {
          const reg = JSON.parse(linha);
          if (!reg.contato) return;

          const tel = reg.contato.split('@')[0];

          if (!ultimasMensagens.has(tel) || reg.timestamp > ultimasMensagens.get(tel).timestamp) {
            ultimasMensagens.set(tel, {
              contato: reg.contato,
              texto: reg.texto,
              enviada_pelo_bot: reg.enviada_pelo_bot,
              sessao: reg.sessao || 1,
              timestamp: reg.timestamp,
              nome: reg.nome || 'Cliente'
            });
          }
        } catch (err) {}
      });

      const agora = Date.now();
      const umaHoraMs = 60 * 60 * 1000;

      for (const [tel, ultima] of ultimasMensagens.entries()) {
        if (global.optOutContatos && global.optOutContatos.has(String(tel).replace(/\D/g, ''))) {
          continue;
        }

        if (!ultima.enviada_pelo_bot) continue;

        const horasPassadas = (agora - ultima.timestamp) / umaHoraMs;
        const etapa = this.cadencia.find(item => (
          horasPassadas >= item.horasInativo && !this.jaEnviouEtapa(tel, item.chave)
        ));

        if (!etapa) continue;

        console.log(`Lead ${tel} inativo ha mais de ${etapa.horasInativo}h. Gerando follow-up etapa ${etapa.etapa}...`);

        const textoGerado = await this.gerarTextoFollowup(ultima, etapa);
        if (!textoGerado) continue;

        try {
          await this.sendFunction(ultima.contato, textoGerado, ultima.sessao);
          this.salvarFollowup(tel, etapa);
          console.log(`Follow-up enviado para ${tel}: "${textoGerado}"`);
        } catch (err) {
          console.error(`Erro ao enviar follow-up para ${tel}:`, err.message);
        }
      }

      console.log('Rotina de follow-up concluida.');
    } catch (err) {
      console.error('Erro na rotina de follow-up:', err.message);
    }
  }

  async gerarTextoFollowup(dadosUltimaMensagem, etapa) {
    const tomPorEtapa = {
      1: 'retomar de forma leve, perguntando se ele conseguiu ver a ultima mensagem',
      2: 'oferecer um resumo rapido e facil de responder',
      3: 'trazer valor ligado a acompanhamento de cliente sem pressionar',
      4: 'fazer uma ultima tentativa educada, abrindo espaco para ele responder depois'
    };

    const orientacao = tomPorEtapa[etapa.etapa] || 'retomar de forma educada e breve';
    const prompt = `Voce e o assistente de vendas do FechaPro. Voce estava conversando com o cliente "${dadosUltimaMensagem.nome}".
A sua ultima mensagem para ele foi: "${dadosUltimaMensagem.texto}"
Faz mais de ${etapa.horasInativo} horas que ele nao responde.
Esta e a etapa ${etapa.etapa} de follow-up. Objetivo: ${orientacao}.

Crie uma UNICA mensagem curta (maximo 120 caracteres) e amigavel para retomar o contato com ele. Seja natural, parecendo um humano chamando de volta.
Nao use aspas na resposta.`;

    try {
      const result = await this.gemini.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ text: prompt }] }
        ]
      });

      return result.response.text().trim();
    } catch (err) {
      console.error('Erro ao gerar mensagem de follow-up com a IA:', err.message);
      const fallback = [
        `Oi ${dadosUltimaMensagem.nome}, tudo bem? Conseguiu ver minha ultima mensagem?`,
        `Oi ${dadosUltimaMensagem.nome}, quer que eu te mande um resumo rapido por aqui?`,
        'Passando rapido: ainda faz sentido falar sobre acompanhar melhor seus clientes?',
        `Sem pressa, ${dadosUltimaMensagem.nome}. Deixo por aqui caso queira retomar depois.`
      ];

      return fallback[Math.min(etapa.etapa - 1, fallback.length - 1)];
    }
  }
}

module.exports = FollowupManager;
