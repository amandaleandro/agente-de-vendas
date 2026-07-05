/**
 * 📱 Validador de Números WhatsApp
 * Verifica se números têm formato válido antes de tentar enviar
 */

class WhatsAppValidator {
  /**
   * Remove caracteres especiais e retorna apenas dígitos
   */
  static limparNumero(numero) {
    if (!numero) return '';
    return String(numero).replace(/\D/g, '');
  }

  /**
   * Verifica se o número tem tamanho válido (10-15 dígitos)
   * Maioria dos números WhatsApp têm 10-15 dígitos
   */
  static temTamanhoValido(numero) {
    const limpo = this.limparNumero(numero);
    return limpo.length >= 10 && limpo.length <= 15;
  }

  /**
   * Valida formato básico do número
   */
  static ehFormatoValido(numero) {
    if (!numero) return false;

    const limpo = this.limparNumero(numero);

    // Deve ter apenas dígitos após limpeza
    if (!/^\d+$/.test(limpo)) return false;

    // Deve estar entre 10-15 dígitos
    if (!this.temTamanhoValido(limpo)) return false;

    // Não pode ter padrões inválidos (todos iguais, sequências)
    if (/^(\d)\1{6,}$/.test(limpo)) return false; // Muitos dígitos iguais (ex: 1111111111)

    return true;
  }

  /**
   * Valida número completo (formato + campo)
   */
  static validarNumero(numero) {
    return {
      valido: this.ehFormatoValido(numero),
      erro: this.obterErro(numero),
      numero_limpo: this.limparNumero(numero)
    };
  }

  /**
   * Retorna mensagem de erro
   */
  static obterErro(numero) {
    if (!numero || String(numero).trim() === '') {
      return 'Número vazio ou nulo';
    }

    const limpo = this.limparNumero(numero);

    if (limpo === '') {
      return 'Número não contém dígitos';
    }

    if (limpo.length < 10) {
      return `Número muito curto (${limpo.length} dígitos). Mínimo: 10`;
    }

    if (limpo.length > 15) {
      return `Número muito longo (${limpo.length} dígitos). Máximo: 15`;
    }

    if (/^(\d)\1{6,}$/.test(limpo)) {
      return 'Número contém padrão repetitivo inválido';
    }

    return 'Formato inválido';
  }

  /**
   * Filtra lista de números removendo inválidos
   * Retorna { validos, invalidos }
   */
  static filtrarNumeros(numeros) {
    const validos = [];
    const invalidos = [];

    for (const numero of numeros) {
      const validacao = this.validarNumero(numero);
      if (validacao.valido) {
        validos.push({
          original: numero,
          limpo: validacao.numero_limpo
        });
      } else {
        invalidos.push({
          original: numero,
          erro: validacao.erro
        });
      }
    }

    return { validos, invalidos };
  }

  /**
   * Prepara número para usar em JID
   * No WhatsApp, o formato é: "numero@s.whatsapp.net"
   */
  static gerarJID(numero) {
    const limpo = this.limparNumero(numero);
    if (!this.ehFormatoValido(numero)) {
      return null;
    }
    return `${limpo}@s.whatsapp.net`;
  }
}

module.exports = WhatsAppValidator;
