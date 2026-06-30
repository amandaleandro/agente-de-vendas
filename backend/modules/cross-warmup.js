/**
 * 🔄 CrossWarmupManager
 * 
 * Responsável por gerenciar interações entre as sessões ativas do painel
 * para aquecer ("warm up") as contas de WhatsApp de forma orgânica, evitando bloqueios.
 */

const DIALOGOS = [
  [
    "Bom dia! Tudo bem por aí?",
    "Bom dia! Tudo ótimo e por aí?",
    "Tudo certo também, muito trabalho hoje?",
    "Bastante, graças a Deus. E aí, como estão as coisas?",
    "Correria, mas tudo indo bem. Bom trabalho pra vc!",
    "Valeu, pra você também!"
  ],
  [
    "Opa, boa tarde! Como estão as coisas?",
    "Boa tarde! Tudo indo bem. E contigo?",
    "Tudo na paz. Choveu muito por aí hoje?",
    "Nem me fale, o tempo virou do nada.",
    "Aqui também. Mas é isso, qualquer coisa me chama.",
    "Pode deixar, abraço!"
  ],
  [
    "E aí, tranquilo?",
    "Opa, tudo na paz! E contigo?",
    "Tudo certo. Passando só pra dar um alô mesmo.",
    "Legal, obrigado! Um ótimo dia pra você.",
    "Igualmente!"
  ]
];

// Espera entre 4 a 12 segundos para parecer humano digitando
const sleepHumano = () => new Promise(resolve => setTimeout(resolve, 4000 + Math.random() * 8000));

class CrossWarmupManager {
  constructor() {
    this.intervalo = null;
    this.emExecucao = false;
  }

  iniciar(intervaloMinutos = 60) {
    if (this.intervalo) clearInterval(this.intervalo);
    console.log(`\n🔥 Warmup Cruzado ativado. Executando a cada ${intervaloMinutos} minutos.\n`);
    
    this.intervalo = setInterval(() => {
      this.executarSorteio();
    }, intervaloMinutos * 60 * 1000);
  }

  async executarSorteio() {
    if (this.emExecucao) return;
    if (!global.socketsConectados || global.socketsConectados.size < 2) return; // Precisa de pelo menos 2

    // Pegar todas as sessões conectadas
    const sessoesAtivas = Array.from(global.socketsConectados.entries()).filter(([sessao, socket]) => socket.user && socket.user.id);
    if (sessoesAtivas.length < 2) return;

    // Sortear 2 sessões diferentes
    const s1 = sessoesAtivas[Math.floor(Math.random() * sessoesAtivas.length)];
    let s2;
    do {
      s2 = sessoesAtivas[Math.floor(Math.random() * sessoesAtivas.length)];
    } while (s1[0] === s2[0]);

    const socketA = s1[1];
    const socketB = s2[1];

    const jidA = socketA.user.id.split(':')[0] + '@s.whatsapp.net';
    const jidB = socketB.user.id.split(':')[0] + '@s.whatsapp.net';

    // Sortear um script
    const script = DIALOGOS[Math.floor(Math.random() * DIALOGOS.length)];

    console.log(`🤖 Iniciando interação de Warmup Cruzado entre ${jidA} e ${jidB}`);

    this.emExecucao = true;
    try {
      for (let i = 0; i < script.length; i++) {
        await sleepHumano();
        const mensagem = script[i];
        
        if (i % 2 === 0) {
          // Socket A envia para Socket B
          await socketA.sendMessage(jidB, { text: mensagem });
        } else {
          // Socket B envia para Socket A
          await socketB.sendMessage(jidA, { text: mensagem });
        }
      }
      console.log(`✅ Warmup Cruzado entre ${jidA} e ${jidB} finalizado com sucesso.`);
    } catch (err) {
      console.log(`⚠️ Erro no Warmup Cruzado: ${err.message}`);
    } finally {
      this.emExecucao = false;
    }
  }
}

module.exports = new CrossWarmupManager();
