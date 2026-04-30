# Vínculos — Lógica de Negócio e UX

> **Origem:** `/fv/Arquivos/vinculos-logica.md`
> **Status:** OURO — regras de negócio de vínculos não documentadas noutro lugar
> **Specs relacionadas:** REQ-5-005, G10, H1

---

## 1. O que é um Vínculo

Conexão bidireccional entre dois utilizadores no ecossistema PDC. Representa uma relação validada — não é um "follow", é uma credencial de confiança.

---

## 2. Tipos de Vínculos

| Tipo | Entre | Significado |
|------|-------|-------------|
| **Estudante ↔ Mentor** | Aluno segue orientação do mentor | Mentoria activa |
| **Estudante ↔ Instituição** | Aluno vinculado a uma instituição | Retenção / candidatura |
| **Mentor ↔ Instituição** | Mentor credenciado pela instituição | Validação profissional |
| **Estudante ↔ Estudante** | Colegas de jornada | Rede social / colaboração |
| **Patrocinador ↔ Estudante** | Investimento em talento | Bolsa / financiamento |

---

## 3. Estados do Vínculo

```
pendente → aprovado
pendente → recusado
aprovado → removido
```

| Estado | Quem vê | Regras |
|--------|---------|--------|
| **pendente** | Remetente + destinatário | Apenas 1 pedido activo por par. Auto-expire em 30 dias. |
| **aprovado** | Ambos + público (se `visibleOnProfile=true`) | Dados partilhados conforme matriz de privacidade. |
| **recusado** | Nenhum (archive) | Pode re-solicitar após 30 dias. |
| **removido** | Nenhum | Qualquer parte pode remover. |

---

## 4. Regras de Negócio

1. **Bidireccionalidade:** Qualquer parte pode iniciar. Ambos precisam de aceitar.
2. **Visibilidade pública:** Vínculo só aparece no perfil público se `visibleOnProfile=true` E `status=aprovado`.
3. **Dados partilhados:** Nível de acesso a dados depende do tipo de vínculo + role (ver Matriz H1).
4. **Motor de engagement:** Quando instituição visualiza perfil de estudante → notificação FOMO.
5. **Limite de vínculos:** Sem limite hard (mas moderação pode flag spam de pedidos).
6. **Desvínculo:** Unilateral, sem necessidade de aprovação do outro.

---

## 5. Vínculo como Motor de Conversão

O vínculo não é só base de dados — é o **gatilho de engagement**:

- Vínculo estudante↔instituição = primeiro passo para matrícula.
- Vínculo estudante↔mentor = primeiro passo para mentoria premium.
- Vínculo patrocinador↔estudante = primeiro passo para "Talent Bounty".

---

## 6. Schema (Strapi)

```json
{
  "tipo": "estudante_mentor | estudante_instituicao | ...",
  "remetente": { "relation": "perfil" },
  "destinatario": { "relation": "perfil" },
  "status": "pendente | aprovado | recusado | removido",
  "visibleOnProfile": true,
  "dataAprovacao": "ISO timestamp",
  "dataCriacao": "ISO timestamp"
}
```

---

*Referência: `packages/shared/src/core.ts` (VinculoSchema), `docs/a_implementar/G10*.md`, `H1*.md`.*
