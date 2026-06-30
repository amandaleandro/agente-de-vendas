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
    
    this.followupsEnviados = new Set();
    this.carregarFollowupsEnviados();
    
    this.gemini = this.geminiKey ? new GoogleGenAI({ apiKey: this.geminiKey }) : null;
  }

  carregarFollowupsEnviados() {
    if (fs.existsSync(this.arquivoFollowups)) {
      try {
        const dados = JSON.parse(fs.readFileSync(this.arquivoFollowups, 'utf8'));
        this.followupsEnviados = new Set(dados);
      } catch (err) {
        console.error('Erro ao ler followups_enviados.json', err);
      }
    }
  }

  salvarFollowup(telefone) {
    this.followupsEnviados.add(telefone);
    try {
      if (!fs.existsSync(this.conhecimentoDir)) {
        fs.mkdirSync(this.conhecimentoDir, { recursive: true });
      }
      fs.writeFileSync(this.arquivoFollowups, JSON.stringify(Array.from(this.followupsEnviados)));
    } catch (err) {
      console.error('Erro ao salvar followups_enviados.json', err);
    }
  }

  async analisarEEnviarFollowups() {
    if (!this.gemini || !fs.existsSync(this.arquivoTreinamento)) return;
    
    console.log('🔄 Iniciando rotina de Follow-up Automático...');
    
    try {
      const linhas = fs.readFileSync(this.arquivoTreinamento, 'utf8').split('\n').filter(l => l.trim());
      
      // Agrupar por contato para pegar o último estado
      const ultimasMensagens = new Map();
      
      linhas.forEach(linha => {
        try {
          const reg = JSON.parse(linha);
          if (!reg.contato) return;
          
          let tel = reg.contato.split('@')[0];
          
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
        } catch(e){}
      });

      const agora = Date.now();
      const UMA_HORA_EM_MS = 60 * 60 * 1000;
      const UM_DIA_EM_MS = 24 * UMA_HORA_EM_MS;

      for (const [tel, ultima] of ultimasMensagens.entries()) {
        if (global.optOutContatos && global.optOutContatos.has(String(tel).replace(/\D/g, ''))) {
          continue;
        }

        // Se a última mensagem foi enviada pelo bot (ou seja, o cliente parou de responder)
        if (ultima.enviada_pelo_bot) {
          const tempoPassado = agora - ultima.timestamp;
          
          // Se já passou 24h e ainda não enviamos follow-up para esse cara
          if (tempoPassado > UM_DIA_EM_MS && !this.followupsEnviados.has(tel)) {
            console.log(`⏰ Lead ${tel} inativo há mais de 24h. Gerando follow-up...`);
            
            // Gerar follow up
            const textoGerado = await this.gerarTextoFollowup(ultima);
            if (textoGerado) {
              try {
                await this.sendFunction(ultima.contato, textoGerado, ultima.sessao);
                this.salvarFollowup(tel);
                console.log(`✅ Follow-up enviado para ${tel}: "${textoGerado}"`);
              } catch(err) {
                console.error(`❌ Erro ao enviar follow-up para ${tel}:`, err.message);
              }
            }
          }
        }
      }
      
      console.log('✅ Rotina de Follow-up concluída.');
    } catch (err) {
      console.error('❌ Erro na rotina de Follow-up:', err.message);
    }
  }

  async gerarTextoFollowup(dadosUltimaMensagem) {
    const prompt = `Você é o assistente de vendas do FechaPro. Você estava conversando com o cliente "${dadosUltimaMensagem.nome}".
A sua última mensagem para ele foi: "${dadosUltimaMensagem.texto}"
Faz mais de 24 horas que ele não responde.

Crie uma ÚNICA mensagem curta (máximo 120 caracteres) e amigável para retomar o contato com ele. Seja natural, parecendo um humano chamando de volta.
Não use aspas na resposta.`;

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
      return `Oi ${dadosUltimaMensagem.nome}, tudo bem? Conseguiu ver minha última mensagem?`;
    }
  }
}

module.exports = FollowupManager;
