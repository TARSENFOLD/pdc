/**
 * Motor de Heurísticas do PDC v2
 * Traduz índices matemáticos em diagnósticos objetivos.
 * Independente de IA para garantir credibilidade total.
 */

export type DiagnosticLevel = 'EXCELENTE' | 'ESTAVEL' | 'VULNERAVEL' | 'CRITICO';

export interface HeuristicResult {
  level: DiagnosticLevel;
  insight: string;
  action: string;
  score: number; // 0-10
}

export const analyzeFluidity = (phi: number): HeuristicResult => {
  // phi esperado entre 0 e 1 (baseline baseada em 2s por clique)
  if (phi >= 0.8) return {
    level: 'EXCELENTE',
    insight: 'A tua execução é fluida e instintiva. Demonstras alta confiança nas decisões técnicas.',
    action: 'Explora simulações de nível avançado para testar o teu limite.',
    score: 9.5
  };
  if (phi >= 0.5) return {
    level: 'ESTAVEL',
    insight: 'Ritmo de decisão consistente, embora com pausas para processamento lógico.',
    action: 'Trabalha a repetição para transformar raciocínio em intuição.',
    score: 7.0
  };
  if (phi >= 0.3) return {
    level: 'VULNERAVEL',
    insight: 'Detetámos uma hesitação elevada. O custo cognitivo para esta tarefa é superior à média.',
    action: 'Reforça os conceitos base antes de avançares para a prática.',
    score: 4.5
  };
  return {
    level: 'CRITICO',
    insight: 'Padrão de paralisia analítica ou desconexão com o fluxo de trabalho.',
    action: 'Recomendamos mentoria direta para desbloquear barreiras conceituais.',
    score: 2.0
  };
};

export const analyzeResilience = (r: number): HeuristicResult => {
  // r próximo de 1.0 é o ideal (mantém ritmo após erro)
  // r > 1.5 indica paralisia pós-erro
  // r < 0.5 indica aceleração errática (chute) pós-erro
  if (r >= 0.9 && r <= 1.2) return {
    level: 'EXCELENTE',
    insight: 'Manténs a precisão e o ritmo mesmo após erros. Alta tolerância à frustração.',
    action: 'Perfil ideal para ambientes de alta pressão e inovação.',
    score: 9.8
  };
  if (r > 1.2 && r <= 2.0) return {
    level: 'ESTAVEL',
    insight: 'O erro causa uma breve hesitação, mas recuperas o foco rapidamente.',
    action: 'Continua a praticar cenários adversos para normalizar a falha.',
    score: 7.5
  };
  if (r > 2.0) return {
    level: 'VULNERAVEL',
    insight: 'O erro causa paralisia temporária. Precisas de mais tempo para recuperar o foco.',
    action: 'Pratica simulações de erro controlado para fortalecer a resiliência.',
    score: 4.0
  };
  return {
    level: 'CRITICO',
    insight: 'Padrão de aceleração errática (chute) ou desistência após falhas.',
    action: 'Mentoria necessária para gestão de ansiedade e foco pós-crise.',
    score: 1.5
  };
};

export const analyzeFocus = (stability: number): HeuristicResult => {
  if (stability >= 0.9) return {
    level: 'EXCELENTE',
    insight: 'Foco inabalável. Ignoras distrações externas e manténs imersão total.',
    action: 'Capacidade de deep work validada.',
    score: 10
  };
  if (stability >= 0.7) return {
    level: 'ESTAVEL',
    insight: 'Boa estabilidade de atenção, com raras quebras de contexto.',
    action: 'Mantém o ambiente de estudo livre de notificações.',
    score: 8.0
  };
  return {
    level: 'VULNERAVEL',
    insight: 'Detetámos múltiplas interrupções. O teu fluxo de trabalho é fragmentado.',
    action: 'Experimenta técnicas de foco (ex: Pomodoro) durante as simulações.',
    score: 5.0
  };
};
