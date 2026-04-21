# Manual de Governação e Prosperidade (PDC v2)

> **Missão:** Blindar o Oráculo contra a deriva técnica, a mentira documental e o apodrecimento da alma pedagógica.

## 1. A Supremacia da Verdade (GSD-001)
- **Documentação ≠ Marketing:** O `PROJECT.md` e o `STATE.md` são ferramentas de engenharia, não panfletos. Nunca marques uma fase como "Concluída" apenas para induzir comportamento da IA. A mentira documental gera erros de lint e dívida técnica invisível.
- **Hierarquia de Prova:** Em caso de conflito, a autoridade segue esta ordem:
    1. Specs em `/specs/IMPORTANTE` (O Norte Canónico).
    2. `.planning/roadmap.md` (A Realidade do Progresso).
    3. `@pdc/shared` (A Lei Técnica).

## 2. O Dogma da Identidade Total (GSD-002)
- **Anonimato é Defeito:** No PDC, o anonimato é uma falha pedagógica. Toda a telemetria, clique ou interação deve ser atribuída a um `perfilId`.
- **Privacidade via RBAC:** Protegemos o utilizador através de quem pode *ver* os dados (Hierarquia Institucional), e nunca através da *ocultação* de quem ele é. Se o rasto não é identificável, ele não tem valor pedagógico.

## 3. Disciplina Técnica (Zero Any)
- **O Custo do Any:** Cada `any` injetado é um bit de inteligência que o Oráculo perde. O uso de `any` ou `unsafe-member-access` deve ser tratado como um bug crítico de governação.
- **Soberania do Shared:** Nenhuma interface de dados deve ser declarada localmente se puder residir no `@pdc/shared`. O shared é o SSOT (Single Source of Truth) do ecossistema.

## 4. Estética de Autoridade (Soul & Elite)
- **Fidelidade Visual:** Respeitar a ADR-006. Rejeitar preto puro (#000) e branco puro (#FFF). O Terracota (#D2691E) é o nosso acento de mérito e deve ser usado com parcimónia (≤ 5%).
- **Regra de 300:** Se um ficheiro ultrapassa as 300 linhas, ele está a tornar-se "gordo" e propenso ao caos. Modulariza imediatamente.

## 5. Protocolo de Prosperidade
- **Auditoria CodeRabbit:** Antes de cada merge, executa `cr review` e exige "Zero Drift" documental.
- **Purga Periódica:** Se o `npm run lint` ultrapassar os 10 problemas, para tudo e purga. A sujidade técnica acumula-se de forma exponencial.
- **Resgate de Notas:** Nunca permitas que inteligência de construção fique "presa" em ficheiros `.txt` ou conversas. Move-a imediatamente para uma Spec ou ADR.

---
*Ratificado em 21 de Abril de 2026 · O Guardião da Prosperidade*