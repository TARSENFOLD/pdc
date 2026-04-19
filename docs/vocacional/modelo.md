# Modelo Vocacional PDC v2

O PDC transforma dados brutos em decisões educacionais através de algoritmos determinísticos e interpretação por IA.

⚠️ **Autoridade Técnica:** Este documento resume a aplicação prática. Para as fórmulas matemáticas completas, pesos por evento (ex: `simulacao_concluida` vs `simulacao_abandonada`) e níveis de certeza diagnóstica, consulte a **Spec Canónica: [1a81656f — Modelo de Telemetria e Perfil Vocacional](../../.planning/1a81656f-712a-4767-9de9-b0b34113f791-PDC_—_Modelo_de_Telemetria_e_Perfil_Vocacional.md)**.

## Motor de Cálculo (Snapshot W1)

O cálculo do Perfil Vocacional é dinâmico e cumulativo.

### Dimensões de Análise (A alma original)
1. **Aptidão Técnica (40%):** Média ponderada dos scores em simulações e tarefas.
2. **Compatibilidade Psicológica (20%):** Análise de traços via hesitação e persistência.
3. **Motivação Intrínseca (20%):** Volume de exploração voluntária de áreas específicas.
4. **Potencial de Sucesso (20%):** Taxa de conclusão e resiliência pós-erro.

### Algoritmo de Pesos (Exemplo da Spec)
O sistema atribui pontos base por evento de telemetria:
- `simulacao_concluida`: 40 pts × (score/100)
- `simulacao_abandonada`: -5 pts
- `experiencia_visualizada`: 5 pts
- `pergunta_feita_ao_mentor`: 10 pts

## Visão W2: Heurísticas de "Músculo" Comportamental

A evolução para capturar o processo de pensamento bruto:

- **Fluidez Cognitiva ($\phi$):** Velocidade de resposta em relação à dificuldade da questão.
- **Resiliência ao Erro ($R$):** Tempo médio de reação e precisão da ação imediatamente após um erro técnico.
- **Estabilidade de Foco:** Tempo de imersão profunda (Visibility API).
- **Decision Speed:** Tempo entre o primeiro "hover" e o clique final.

## O Relatório Vocacional

O valor final do PDC é o **Relatório de Aptidões**, que não diz apenas "o que gostas", mas apresenta evidência factual:
> "Tens 90% de fluidez na parte prática de Engenharia Civil, mas a tua resiliência cai para 20% quando o erro ocorre em cálculos matemáticos puros. Recomendamos reforço na base X para garantir o sucesso no curso Y."

---
*Baseado na Spec 1a81656f — O "The Algorithm" é a Lei.*
