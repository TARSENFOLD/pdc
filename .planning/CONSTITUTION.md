# PDC v2 — Constituição Inegociável

Este documento define as leis fundamentais de engenharia, ética de dados e estética do Por Dentro do Curso (PDC). Qualquer violação destas regras é um bug de governação.

## 0. Identidade Total (A Lei Pedagógica)
O anonimato é proibido. Todos os dados, telemetria e interações são **identificados e atribuídos** a um Perfil. A ocultação da identidade é uma falha que impede a intervenção personalizada e a avaliação formativa.

## 1. Hierarquia de Acesso (Privacidade via RBAC)
A privacidade é garantida por Controlo de Acesso estrito (RBAC), nunca pela anonimização:
- **Instituições:** Acesso identificado aos estudantes a elas vinculados.
- **Super Admin:** Acesso identificado a todos os estudantes da plataforma.
- **Isolamento:** Dados de um estudante nunca são acessíveis por terceiros, empresas de marketing ou outros estudantes sem consentimento explícito.

## 2. Integridade Técnica (Zero Any)
A tipagem estrita é inegociável. O uso de `any` em novos códigos é proibido. Casos legados devem ser saneados durante a refatoração temática. O `@pdc/shared` é a única fonte de verdade para contratos.

## 3. Rule of 300
Nenhum ficheiro fonte deve ultrapassar **300 linhas**. Ficheiros que excedam este limite devem ser modularizados imediatamente.

## 4. Telemetria Resiliente (Edge-First)
A telemetria é o coração do Oráculo. Perda de dados comportamentais é inaceitável. Outbox + idempotência (UUID + Redis) são obrigatórios. O browser é tratado como ambiente hostil; cálculos críticos são feitos no servidor.

## 5. Doc is Law
Se o código contradiz o markdown (Epics Canónicas), o código é defeituoso. O documento justifica o código, nunca o contrário.

## 6. Estética "Soul & Elite"
- **Herança Invisível:** Sofisticação global com raízes culturais subliminares.
- **Não aos Extremos:** Nunca usar `#000000` (evitar smear OLED) nem `#FFFFFF` puro.
- **Acento:** Terracota Africana `#D2691E` limitado a ≤ 5% da UI.
- **Tipografia:** Inter (UI), Instrument Serif (Autoridade), JetBrains Mono (Dados).
- **Física Apple:** Animações via Motion com springs (`stiffness: 220, damping: 28`).

## 7. Ecosystem Hooks (Lei G15)
Nenhuma escrita de domínio é considerada completa enquanto os hooks ecossistémicos canónicos (Ranking, Feed, Match, Achievement, Behavior, Notify) não correrem com sucesso ou forem marcados para retry no outbox.

---
*Última validação: 21 de Abril de 2026 · Fonte de verdade: Alma Identitária + Epic G15.*