# ADR-054 — PDC Digital Work Experience como tipo de Experiência

**Data:** 2026-07-19  
**Estado:** Aceite  
**Caixa:** C — a expansão empresarial deve preservar a semântica do PDC e evoluir o módulo Experiência sem duplicar catálogos, inscrições ou identidade de produto.

## Contexto

O PDC já possui o módulo **Experiência** como superfície destinada a aproximar o utilizador de uma realidade antes de decidir. O modelo actual foi desenhado para experiências institucionais: sentir como é estudar determinado curso numa instituição, conhecer currículo, campus, mercado, docentes e depoimentos.

A **PDC Digital Work Experience (VWX)** aplica o mesmo princípio de aproximação à realidade, mas ao contexto profissional: conhecer uma profissão e uma organização, receber um briefing, executar tarefas simuladas, produzir evidências, comparar o trabalho com uma resposta-modelo e concluir com reflexão ou credencial.

Embora as duas variantes tenham conteúdos e validações diferentes, partilham a mesma intenção de produto:

> permitir experimentar uma realidade antes de tomar uma decisão importante.

Modelar VWX como Programa resolveria a composição, mas criaria uma separação artificial na descoberta pública: o utilizador encontraria algumas experiências no catálogo de Experiências e outras no catálogo de Programas. Também obrigaria a duplicar linguagem, cartões, favoritos, SEO e navegação para dois objectos que o público entende como experiências.

## Decisão

1. **VWX passa a ser um tipo canónico de Experiência.**

   ```text
   experiencia.tipo = classica | vwx
   ```

2. **A Experiência clássica preserva o modelo actual.** Representa a realidade académica ou institucional de um curso, programa formativo ou percurso numa instituição.

3. **A VWX representa uma experiência profissional digital.** Pode conter apresentação da empresa e profissão, especialistas, briefing, tarefas, checkpoints, projecto final, debrief, autoavaliação, credencial e Opportunity Pathway opcional.

4. **Existe um único catálogo de Experiências.** O catálogo oferece filtros e tabs próprios para:
   - todas;
   - experiências académicas/institucionais;
   - experiências profissionais — VWX.

5. **O builder começa pela escolha do tipo.** Depois da escolha, mostra campos partilhados e secções específicas. O tipo fica bloqueado após a primeira publicação; conversões posteriores exigem operação de migração explícita.

6. **Os contratos usam união discriminada.** Não será criado um schema gigante com dezenas de campos opcionais sem relação.

   ```ts
   ExperienciaPayloadSchema = z.discriminatedUnion('tipo', [
     ExperienciaClassicaPayloadSchema,
     ExperienciaVwxPayloadSchema,
   ]);
   ```

7. **A persistência mantém `experiencia` como aggregate raiz.** Campos complexos e auditáveis da VWX vivem em entidades relacionadas:
   - `experiencia-etapa`;
   - `experiencia-rubrica`;
   - `experiencia-entrega`;
   - `experiencia-progresso-etapa`;
   - `experiencia-coorte` opcional;
   - `experiencia-consentimento-partilha`.

8. **Programas continuam a poder agregar Experiências.** Uma VWX pode existir autonomamente no catálogo ou ser incluída num Programa institucional, numa jornada de sector ou numa iniciativa patrocinada.

9. **A VWX é gratuita para o participante por defeito.** A monetização principal ocorre B2B por patrocínio, produção, licenciamento ou parceria. O acesso pode ser livre, por convite ou por coorte, mas não transforma o participante em comprador nesta fase.

10. **Os workflows editoriais são especializados por tipo.**
    - Clássica: autenticidade institucional, rigor académico, currículo, dados e depoimentos.
    - VWX: legitimidade profissional, segurança, confidencialidade, propriedade intelectual, adequação etária, rubrica e prevenção de trabalho produtivo gratuito.

11. **A empresa vê métricas agregadas por defeito.** Perfil, contacto, entrega, projecto ou resultado individual exigem consentimento explícito, revogável e auditável.

12. **VWX não é estágio, emprego ou promessa de contratação.** O Opportunity Pathway é opcional e separado da conclusão da experiência.

13. **A implementação fica protegida por feature flag** até builder, catálogo, player, progresso, entrega, conclusão e credencial funcionarem E2E.

## Modelo de interface

### Criação

```text
Criar Experiência
├── Escolher tipo
│   ├── Experiência clássica
│   └── PDC Digital Work Experience
├── Identidade partilhada
└── Builder específico
```

### Catálogo

```text
/experiencias
├── Todas
├── Académicas e institucionais
└── Profissionais — VWX
```

Filtros comuns:
- área;
- organização;
- modalidade;
- duração;
- nível;
- idioma;
- disponibilidade.

Filtros clássicos:
- instituição;
- curso;
- nível de ensino;
- campus/localização.

Filtros VWX:
- profissão;
- sector;
- empresa;
- formato;
- competências;
- duração;
- dificuldade;
- certificado;
- Opportunity Pathway.

## Formatos VWX

Formatos nativos da Experiência VWX:
- `sprint` — 30 a 120 minutos;
- `core` — experiência completa, normalmente 6 a 10 horas;
- `challenge` — desafio concentrado.

Uma **Sector Journey** deve, por defeito, ser modelada como Programa que agrega várias VWX ou outras experiências, e não como uma única Experiência excessivamente ampla.

## Invariantes

- O tipo da Experiência é obrigatório e validado no SSOT.
- Registos antigos são migrados para `tipo = classica`.
- O browser não declara conclusão, score ou elegibilidade de credencial.
- A ordem e os pré-requisitos das etapas VWX são validados no BFF.
- Uma etapa publicada não referencia conteúdo inexistente ou não autorizado.
- Entregas mantêm versões e audit trail.
- A organização não vê dados individuais por defeito.
- Menores não entram em fluxos de oportunidade sem regras e consentimentos adequados.
- A VWX funciona sem IA; IA permanece opcional.
- A experiência clássica continua gratuita e sem regressão funcional.

## Consequências positivas

- Preserva um único significado público para “Experiências”.
- Evita catálogos concorrentes e duplicação de descoberta.
- Reutiliza cards, favoritos, SEO, inscrições, telemetria e moderação.
- Mantém Programas disponíveis para composição de jornadas maiores.
- Permite especialização interna sem fragmentar a experiência do utilizador.

## Custos e complexidade

- O aggregate Experiência torna-se polimórfico e exige contratos discriminados.
- Builder, detalhe, validação e analytics passam a variar por tipo.
- A participação actual de Experiência precisa evoluir para progresso real.
- Serão necessárias novas collections para etapas, entregas, rubricas e credenciais.

## Alternativas rejeitadas

- **VWX como subtipo de Programa:** boa reutilização técnica, mas fragmenta catálogo, navegação e semântica pública.
- **VWX como entidade raiz totalmente separada:** duplica catálogo, inscrição, favoritos, SEO, moderação e telemetria.
- **VWX como Curso:** reduz a proposta a LMS e confunde aprendizagem com experiência profissional.
- **VWX apenas como Simulação:** não representa contexto, especialistas, tarefas múltiplas, debrief, projecto e oportunidade.
- **Novo role `empresa` imediato:** a organização canónica já distingue `tipo = empresa`; a UI pode adaptar-se sem migração de RBAC nesta fase.

## Migração e compatibilidade

1. Adicionar `tipo` a Experiência com default/backfill `classica`.
2. Introduzir união discriminada no `@pdc/shared`.
3. Manter endpoints e URLs de Experiência compatíveis.
4. Adicionar filtros por tipo ao catálogo existente.
5. Criar entidades VWX de forma aditiva.
6. Activar `VWX_ENABLED=false` até ao DoD E2E.
7. Manter Programas capazes de referenciar qualquer Experiência publicada.

## Validação da decisão

A decisão estará implementada quando:

- o builder exigir a escolha `classica` ou `vwx`;
- experiências existentes forem lidas como `classica` sem regressão;
- o catálogo único filtrar correctamente os dois tipos;
- uma organização do tipo empresa criar uma VWX em rascunho;
- um participante executar etapas, submeter trabalho e concluir;
- o servidor calcular progresso e elegibilidade;
- uma credencial verificável de VWX for emitida;
- a empresa visualizar analytics agregados e apenas dados individuais consentidos;
- Programas continuarem a agregar Experiências clássicas ou VWX.