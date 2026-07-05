/**
 * CrossWarmupManager
 *
 * Responsavel por gerenciar interacoes entre as sessoes ativas do painel
 * para aquecer ("warm up") as contas de WhatsApp.
 */

const DIALOGOS = {
  manha: [
    [
      "Bom dia! Tudo certo por ai?",
      "Bom dia! Tudo sim, e por ai?",
      "Tudo bem tambem. Ja comecou a correria?",
      "Ja sim, mas hoje parece mais tranquilo.",
      "Boa. Qualquer coisa me chama mais tarde.",
      "Combinado, bom trabalho ai."
    ],
    [
      "Oi, bom dia. Conseguiu resolver aquilo ontem?",
      "Bom dia! Consegui sim, deu certo no fim.",
      "Que bom. Era so pra confirmar mesmo.",
      "Valeu por lembrar. Depois te falo melhor.",
      "Fechado, sem pressa."
    ],
    [
      "Bom dia, tudo bem?",
      "Tudo bem sim. E voce?",
      "Tudo certo. Hoje vou ficar mais no computador.",
      "Beleza. Se precisar de algo me chama.",
      "Pode deixar, obrigado."
    ],
    [
      "Bom dia! Voce viu minha mensagem de ontem?",
      "Vi sim, so nao consegui responder na hora.",
      "Tranquilo. Era so pra saber se ficou tudo certo.",
      "Ficou sim, obrigado.",
      "Boa. Entao seguimos assim."
    ]
  ],
  tarde: [
    [
      "Opa, boa tarde! Como esta o dia por ai?",
      "Boa tarde! Meio puxado, mas andando.",
      "Aqui tambem. Tinha te mandado mensagem so pra alinhar.",
      "Vi agora. Mais tarde consigo olhar com calma.",
      "Tranquilo, quando der voce me chama.",
      "Fechou."
    ],
    [
      "Boa tarde! Voce esta por ai?",
      "Estou sim, fala.",
      "Nada urgente. Queria so confirmar se ficou tudo certo.",
      "Ficou sim. Obrigado por avisar.",
      "Show. Qualquer coisa estou por aqui."
    ],
    [
      "Oi! Tudo certo nessa tarde?",
      "Tudo certo, e contigo?",
      "Tudo bem. O tempo virou ai tambem?",
      "Virou sim, do nada.",
      "Aqui igual. Bom resto de tarde pra voce.",
      "Pra voce tambem."
    ],
    [
      "Opa, consegue ver uma coisa pra mim depois?",
      "Consigo sim. Me manda mais tarde.",
      "Beleza, vou separar aqui.",
      "Fechado. Assim que eu parar eu olho.",
      "Obrigado."
    ]
  ],
  noite: [
    [
      "Boa noite! Tudo bem por ai?",
      "Boa noite! Tudo certo sim.",
      "Passando so pra avisar que amanha te chamo mais cedo.",
      "Beleza, pode chamar.",
      "Combinado. Boa noite.",
      "Boa noite."
    ],
    [
      "Oi, boa noite. Deu tudo certo hoje?",
      "Deu sim, gracas a Deus.",
      "Que bom. Amanha a gente continua entao.",
      "Combinado. Ate amanha.",
      "Ate."
    ],
    [
      "Boa noite! Vi sua mensagem agora.",
      "Sem problema, era coisa simples.",
      "Entendi. Se precisar eu vejo amanha cedo.",
      "Pode ser. Obrigado.",
      "Boa noite."
    ]
  ],
  geral: [
    [
      "E ai, tranquilo?",
      "Opa, tranquilo sim. E voce?",
      "Tudo certo. Passei so pra dar um oi mesmo.",
      "Valeu. Bom te ver por aqui.",
      "Igualmente."
    ],
    [
      "Oi! Consegue falar rapidinho depois?",
      "Consigo sim, daqui a pouco fica melhor.",
      "Fechado. Nao e urgente.",
      "Beleza, te chamo assim que liberar."
    ],
    [
      "Tudo bem por ai?",
      "Tudo certo. E por ai?",
      "Tudo bem tambem. Semana corrida?",
      "Um pouco, mas faz parte.",
      "Verdade. Bom trabalho ai.",
      "Obrigado, pra voce tambem."
    ],
    [
      "Oi, lembrei de voce agora.",
      "Opa, fala.",
      "Depois me passa aquele contato que voce comentou?",
      "Passo sim, vou procurar aqui.",
      "Valeu, sem pressa."
    ],
    [
      "Conseguiu falar com aquele pessoal?",
      "Ainda nao, vou tentar de novo depois.",
      "Entendi. Se precisar me avisa.",
      "Pode deixar, obrigado.",
      "Imagina."
    ],
    [
      "Oi, tudo bem? So confirmando uma coisa.",
      "Tudo bem. Pode falar.",
      "Aquele horario ficou melhor pra voce mesmo?",
      "Ficou sim.",
      "Perfeito, obrigado."
    ]
  ]
};

const SUFIXOS_LEVES = [
  '',
  '',
  ' 👍',
  ' 🙂'
];

function variarMensagem(texto) {
  if (Math.random() < 0.12) {
    return texto.replace(/\bvoce\b/gi, 'vc');
  }
  if (Math.random() < 0.08 && texto.endsWith('.')) {
    return texto.slice(0, -1);
  }
  return `${texto}${SUFIXOS_LEVES[Math.floor(Math.random() * SUFIXOS_LEVES.length)]}`;
}

// Espera entre 4 a 12 segundos para parecer humano digitando
const sleepHumano = () => new Promise(resolve => setTimeout(resolve, 4000 + Math.random() * 8000));

class CrossWarmupManager {
  constructor() {
    this.intervalo = null;
    this.emExecucao = false;
    this.ultimoScript = null;
    this.ultimoScriptPorPar = new Map();
  }

  iniciar(intervaloMinutos = 60) {
    if (this.intervalo) clearInterval(this.intervalo);
    console.log(`\nWarmup Cruzado ativado. Executando a cada ${intervaloMinutos} minutos.\n`);

    this.intervalo = setInterval(() => {
      this.executarSorteio();
    }, intervaloMinutos * 60 * 1000);
  }

  async executarSorteio() {
    if (this.emExecucao) return;
    if (!global.socketsConectados || global.socketsConectados.size < 2) return; // Precisa de pelo menos 2

    // Pegar as sessoes conectadas com papel de maturacao (ou ambos)
    const sessoesAtivas = Array.from(global.socketsConectados.entries()).filter(([sessao, socket]) => {
      if (!socket.user || !socket.user.id) return false;
      if (global.chipRoles && !global.chipRoles.podeMaturar(sessao)) return false;
      return true;
    });
    if (sessoesAtivas.length < 2) {
      if (global.chipRoles && sessoesAtivas.length < global.socketsConectados.size) {
        console.log('Warmup Cruzado: menos de 2 chips com papel de maturação. Pulando rodada.');
      }
      return;
    }

    // Sortear 2 sessoes diferentes
    const s1 = sessoesAtivas[Math.floor(Math.random() * sessoesAtivas.length)];
    let s2;
    do {
      s2 = sessoesAtivas[Math.floor(Math.random() * sessoesAtivas.length)];
    } while (s1[0] === s2[0]);

    const socketA = s1[1];
    const socketB = s2[1];

    const jidA = socketA.user.id.split(':')[0] + '@s.whatsapp.net';
    const jidB = socketB.user.id.split(':')[0] + '@s.whatsapp.net';

    const chavePar = [s1[0], s2[0]].map(String).sort().join(':');
    const script = this.escolherScript(chavePar);

    console.log(`Iniciando interacao de Warmup Cruzado entre ${jidA} e ${jidB}`);

    this.emExecucao = true;
    try {
      for (let i = 0; i < script.length; i++) {
        await sleepHumano();
        const mensagem = variarMensagem(script[i]);

        if (i % 2 === 0) {
          // Socket A envia para Socket B
          await socketA.sendMessage(jidB, { text: mensagem });
        } else {
          // Socket B envia para Socket A
          await socketB.sendMessage(jidA, { text: mensagem });
        }
      }
      console.log(`Warmup Cruzado entre ${jidA} e ${jidB} finalizado com sucesso.`);
    } catch (err) {
      console.log(`Erro no Warmup Cruzado: ${err.message}`);
    } finally {
      this.emExecucao = false;
    }
  }

  escolherScript(chavePar = 'geral') {
    const hora = new Date().getHours();
    let periodo = 'geral';
    if (hora >= 5 && hora < 12) periodo = 'manha';
    if (hora >= 12 && hora < 18) periodo = 'tarde';
    if (hora >= 18 || hora < 5) periodo = 'noite';

    const scripts = [...DIALOGOS[periodo], ...DIALOGOS.geral];
    let indice = Math.floor(Math.random() * scripts.length);
    const ultimoDoPar = this.ultimoScriptPorPar.get(chavePar);
    if (scripts.length > 1 && (indice === this.ultimoScript || indice === ultimoDoPar)) {
      indice = (indice + 1) % scripts.length;
    }
    this.ultimoScript = indice;
    this.ultimoScriptPorPar.set(chavePar, indice);
    return scripts[indice];
  }
}

module.exports = new CrossWarmupManager();
