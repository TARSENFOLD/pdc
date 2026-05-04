# Modelo Vocacional PDC v2 — Definição Soberana (B7)

O PDC v2 transforma a telemetria comportamental densa em decisões de carreira precisas através de um motor de heurísticas determinístico e independente de IA.

---

## 🏗️ O Cérebro Matemático (Heurísticas Canónicas)

O sistema mede o "músculo comportamental" do estudante através de 4 heurísticas soberanas calculadas a partir da telemetria bruta.

| Métrica | Símbolo | O que mede | Baseline / Range |
|---------|---------|------------|-------------------|
| **Fluidez Cognitiva** | $\phi$ | Constância e ritmo de decisão. | 2000ms / 0–10 |
| **Resiliência ao Erro** | $R$ | Velocidade de recuperação após uma falha técnica. | Tempo Médio / 0–10 |
| **Estabilidade de Foco** | — | Micro-interrupções de atenção (Tab focus/lost). | % Imersão / 0–10 |
| **Hesitação** | — | Tempo + entropia de movimento antes do clique. | Densidade / 0–10 |

> **Fontes Vivas:** 
> - [Heurísticas (Interpretação)](../../packages/shared/src/heuristics.ts)
> - [Cálculo de Performance](../../packages/shared/src/heuristics-calculator.ts)
> - [Visão do Produto (§3)](../../specs/IMPORTANTE/01_%E2%80%94_Vis%C3%A3o_do_Produto_%28Can%C3%B3nica%29.md)

---

## 🏛️ Dimensões do Perfil Vocacional

O Perfil Vocacional é composto por 4 dimensões de análise, agregadas para gerar o **Score Global**:

1.  **Aptidão Técnica (40%)**: Performance bruta nas simulações práticas.
2.  **Compatibilidade Psicológica (20%)**: Traços derivados via heurísticas (ex: resiliência).
3.  **Motivação Intrínseca (20%)**: Volume e profundidade de exploração voluntária.
4.  **Potencial de Sucesso (20%)**: Taxa de conclusão e aderência a trilhas complexas.

---

## 🌍 As 15 Áreas Vocacionais Canónicas (SSOT)

O sistema classifica o talento em 15 domínios fundamentais para o desenvolvimento de Angola:

1. `SAUDE` | 2. `ENGENHARIA` | 3. `TECNOLOGIA` | 4. `DIREITO` | 5. `GESTAO` | 6. `EDUCACAO` | 7. `ARTES` | 8. `CIENCIAS_AGRARIAS` | 9. `CIENCIAS_SOCIAIS` | 10. `COMUNICACAO` | 11. `CIENCIAS_NATURAIS` | 12. `ARQUITETURA` | 13. `TURISMO_HOTELARIA` | 14. `DESPORTO` | 15. `OUTRA`.

---

## 🏆 Tiers de Mérito e Prestígio

O Perfil Vocacional evolui em **4 Tiers** baseados no Score Global e consistência temporal:

- 🥉 **BRONZE**: Iniciante. Dados em fase de calibração.
- 🥈 **PRATA**: Intermédio. Padrões de interesse começam a estabilizar.
- 🥇 **OURO**: Avançado. Alta fidelidade preditiva de sucesso no curso.
- 💎 **DIAMANTE**: Elite. Talento validado com evidência estatística superior.

---

## 🔐 Privacidade e Governação (RBAC)

O Perfil Vocacional é a peça de informação mais sensível do sistema.

- **Privacidade por Defeito**: O Perfil Vocacional é **estritamente privado**.
- **Visibilidade**: Apenas o próprio Estudante (no Dashboard) e Mentores/Instituições com **vínculo aprovado** podem aceder aos dados detalhados.
- **Isolamento Público**: Endpoints públicos de perfil (ex: `/perfis/:slug`) **nunca** incluem dados vocacionais ou scores de heurísticas.

---
*Doc is Law — Última auditoria: 21 de Abril de 2026.*
