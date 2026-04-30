# Programas vs Projectos — Definição Canónica

> **Origem:** `/fv/Notes/Progra vs Projeto.txt` (230 linhas)
> **Status:** OURO — regras de negócio não formalizadas noutro lugar
> **Specs relacionadas:** REQ-4-009 (Programas), REQ-4-010/4-011 (Projectos), G4, G5

---

## 1. Programa

### Definição
Unidade organizacional/curricular criada por **Mentores** ou **Instituições**. Agrega conteúdos (cursos, projectos, experiências, simulações) sob um objectivo comum.

### Tipos (ProgramaTipoSchema)

| Tipo | Descrição | Exemplo |
|------|-----------|---------|
| **standard** | Programa curricular clássico com módulos e progressão | "Bootcamp de Engenharia de Software" |
| **shadowapro** | Shadow a Professional — observar profissional na prática | Estudante acompanha engenheiro civil num canteiro de obras |
| **eduvisit** | Visita educativa bidireccional | Instituição A leva alunos a conhecer Instituição B; ou Instituição B abre portas para estudantes externos |

### Regras de Negócio
- **Criador:** Apenas Mentores e Instituições (estudante não cria programas).
- **Acesso:** Inscrição directa (pública/privada) ou por convite.
- **Pago/Gratuito:** Decidido pelo criador (monetização futura).
- **Aprovação:** Conteúdo programático deve ser aprovado por moderador antes de listar.
- **Programa pode conter:** Cursos, Experiências, Simulações, Projectos, misto.
- **Programa pode conter apenas objectivo:** Sem conteúdos modulares (ex: edu-visita é agenda + inscrição).

### Caso Especial: EduVisita

**Dois fluxos:**
1. **Instituição anfitriã** inscreve-se para **receber** visitas de estudantes externos.
2. **Instituição visitante** agenda visita **para os seus alunos** a outra instituição.
3. **Estudante individual** inscreve-se para conhecer uma instituição ou ser "assistente de professor" por um dia.

**Strapi content-type:** `EduVisitaAgendamento` — data, capacidade, instituição anfitriã, inscritos, estado.

---

## 2. Projecto

### Definição
Trabalho publicado por **Estudantes**, **Mentores** ou **Instituições** para visibilidade, validação e colaboração.

### Modos (ProjetoModoSchema)

| Modo | Criador | Descrição |
|------|---------|-----------|
| **exposição** (portfolio) | Estudante/Mentor | Showcase de trabalho realizado — vitrine de competências |
| **colaboração** | Estudante/Mentor | Trabalho em equipa — ACL de acesso ao core |
| **mentoria** | Mentor | Mentor guia estudante(s) num projecto prático |
| **financiamento** (patrocínio) | Estudante/Mentor/Instituição | Procura de investidores/patrocinadores para o projecto |
| **feedbackComunitário** | Qualquer | Publica para receber feedback da comunidade — votos e endorsements |

### Regras de Negócio
- **Criador:** Estudantes, Mentores e Instituições.
- **Acesso ao core:** Controlado por ACL — convite pelo dono + aceitação.
- **Projectos não são pagos** (diferente de Programas).
- **Votos e Endorsements:** Mentores dão "Validação Técnica", estudantes dão "Apoio".
- **Endorsement de mentor de elite** vale mais que 10 certificados genéricos.
- **Projecto como output de Simulação:** Ao terminar uma Simulação, o sistema sugere "Publicar como Projecto?". Garante que 100% dos projectos na plataforma têm contexto técnico.

### Caso Especial: Busca de Parceiro
- Estudante publica projecto no modo "colaboração" com tag "procura parceiro".
- Outros estudantes candidatam-se.
- Dono selecciona e adiciona ao ACL.

---

## 3. Relação Programa ↔ Projecto

```
Programa
 ├── Curso A
 ├── Simulação B
 ├── Experiência C
 └── Projecto D (pode ser requisito de conclusão do Programa)

Projecto (autónomo)
 └── Nasce de uma Simulação, vive no Perfil Vocacional
```

- Um Projecto pode existir **dentro** de um Programa (como entregável).
- Um Projecto pode existir **fora** de qualquer Programa (portfolio individual).

---

## 4. Onde Vivem na UI

| Entidade | Localização | Razão |
|----------|-------------|-------|
| **Programas** | Hub de Exploração (catálogo público) + Dashboard do Mentor/Instituição (gestão) | São o "aperitivo" — atraem utilizadores |
| **Projectos** | Perfil Vocacional (público) + Página dedicada de gestão | São a "prova" — mostram o que o estudante é capaz |

---

## 5. Schemas Existentes no Codebase

Os schemas Zod para `ProgramaTipoSchema`, `ProjetoModoSchema`, `ShadowAProCandidatura` e `EduVisitaAgendamento` já existem em `@pdc/shared`. O gap é:
- Frontend para ShadowAPro e EduVisita.
- Rotas BFF + UI de agendamento.
- ACL de acesso ao core do projecto.
- UI de discriminação por modo de projecto.

---

*Referência: `packages/shared/src/core.ts` (schemas), `docs/a_implementar/G4*.md` e `G5*.md` (specs de implementação).*
