export interface ValidationResult {
  valida: boolean;
  motivo?: string;
}

export function validarMensagem(texto: string): ValidationResult {
  // 1. Tamanho máximo
  if (texto.length > 500) {
    return { valida: false, motivo: 'Mensagem demasiado longa (máx 500 chars).' };
  }

  // 2. Sem PII (email/telefone)
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phoneRegex = /\+?[0-9]{9,15}/;
  if (emailRegex.test(texto) || phoneRegex.test(texto)) {
    return { valida: false, motivo: 'Por favor, não partilhes dados pessoais como email ou telefone.' };
  }

  // 3. Sem padrões de jailbreak
  const jailbreakPatterns = [
    /ignore previous/i,
    /act as/i,
    /pretend you are/i,
    /you are now/i,
    /forget all/i,
  ];

  if (jailbreakPatterns.some(p => p.test(texto))) {
    return { valida: false, motivo: 'Instrução inválida detectada.' };
  }

  return { valida: true };
}
