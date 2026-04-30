# Canvas LMS — Benchmark e Padrões a Adoptar

> **Origem:** `/fv/Notes/O que você está querendo fazer é us.txt` (107 linhas)
> **Status:** REFERÊNCIA — estratégia de benchmarking para evolução futura
> **Última revisão:** Abril 2026

---

## 1. A Abordagem

Estudar a arquitectura do Canvas LMS (open-source, usado por 30M+ utilizadores) para **extrair padrões**, não para copiar.

### Princípio
> "Não queremos ser o Canvas. Queremos aprender com 15 anos de erros e acertos de um sistema maduro e aplicar o que faz sentido para o nosso contexto."

---

## 2. O que Extrair do Canvas

### Modularidade
- Canvas usa uma arquitectura de módulos independentes (Assignments, Quizzes, Grades, Discussions).
- **Aplicação no PDC:** Cada feature (Simulações, Cursos, Programas, Projectos) deve ser um módulo isolado com interface definida.

### LTI 1.3 (Learning Tools Interoperability)
- Canvas suporta ferramentas externas via LTI.
- **Aplicação no PDC:** Simulação Tipo 2 (laboratório externo via iframe) usa LTI para integração com ferramentas de terceiros.
- Specs existentes: OIDC, AGS (Assignment and Grade Services), NRPS (Names and Roles), JWKS.

### Gradebook / Avaliação
- Canvas tem sistema sofisticado de notas e rubricas.
- **Aplicação no PDC:** O "Gradebook" do PDC é o Perfil Vocacional — mas baseado em telemetria, não em notas manuais.

### Scalability Patterns
- Canvas usa Rails + PostgreSQL + Redis + Canvas Data (analytics separado).
- **Aplicação no PDC:** Stack análoga (Hono + PostgreSQL/Strapi + Redis + telemetria separada). ADR-005 formaliza a separação.

---

## 3. O que NÃO Copiar

| Canvas Pattern | Razão para não adoptar |
|----------------|----------------------|
| Ruby on Rails monolith | PDC usa Hono BFF + Strapi (mais leve para o contexto) |
| Instructure Canvas Cloud | PDC é Railway + Vercel (mais acessível) |
| Modelo de assinaturas institucionais puro | PDC é B2B + B2C + marketplace (híbrido) |
| UI 2010 (tabelas, formulários pesados) | PDC segue Soul & Elite (design moderno) |

---

## 4. Manter Identidade

O PDC não é um LMS. É uma **infraestrutura de decisão vocacional** que usa padrões de LMS onde fazem sentido:
- **De LMS:** Estrutura de cursos, módulos, progressão, certificados.
- **De Rede Social:** Feed, vínculos, endorsements, gamificação.
- **De Analytics Platform:** Telemetria comportamental, dashboards, heurísticas.
- **Proprietário:** Motor vocacional com φ, R, certeza — ninguém tem isto.

---

*Referência: Repositórios externos listados em PROJECT.md §Context: `canvas-lms`, `the-algorithm`, `langchainjs`, `moodle`.*
