---
description: Integrar validação automática de links Markdown e consistência doc↔code no pipeline CI/CD
---

# CI Documentation Validator

## Contexto
O projecto opera sob "Doc is Law" mas não tem validação automática de que:
- Links internos em Markdown apontam para ficheiros reais
- Referências a classes/funções nos ADRs existem no código
- Taxonomias de waves/fases estão consistentes entre documentos

Isto viola o princípio de "compilar o futuro" sugerido nas análises externas.

## Sealed Envelope

```
[SEALED ENVELOPE — PDC v2 INTEGRITY]

Spec Soberana: CONSTITUTION.md (Doc is Law), ADR 007-018
Wave/Contexto: Wave 0 (Meta-Governação)
Caixa Autorizada: B (Código mais maduro que doc — CI não valida docs)

Scope IN (Ficheiros permitidos):
- .github/workflows/ci.yml (ou equivalente)
- scripts/validate-docs.ts (NOVO)
- package.json (root — adicionar script)
- .markdownlint.json (NOVO — config)

Scope OUT (PROIBIDO TOCAR):
- apps/* (Nenhum app muda)
- packages/* (Nenhum package muda)
- Conteúdo dos docs (apenas validação, não edição)

Blacklist Nominal (AP-01 a AP-07): Aplicável na totalidade.

Critério Done:
[ ] markdown-link-check integrado no CI
[ ] Script custom que valida referências doc→code (nomes de ficheiros citados)
[ ] Falha de CI se link quebrado ou referência inexistente
[ ] Não bloqueia builds por falsos positivos (whitelist configurável)
[ ] Documentação de uso no README ou CONTRIBUTING.md
```

## Passos

1. **Instalar ferramentas**
   ```bash
   npm install -D markdown-link-check markdownlint-cli2
   ```

2. **Criar `.markdownlint.json`** na raiz
   - Configurar regras de lint Markdown (line length, heading style, etc.)
   - Desactivar regras que conflitem com o estilo existente dos ADRs

3. **Criar `scripts/validate-docs.ts`**
   - Glob `docs/**/*.md`, `.planning/**/*.md`, `specs/**/*.md`
   - Para cada ficheiro:
     - Extrair links internos (`[text](path)`)
     - Verificar se `path` resolve para ficheiro real
     - Extrair referências a código (e.g., backtick `filename.ts` ou `functionName`)
     - Verificar se existem no codebase via `fs.existsSync` ou glob
   - Output: lista de links/referências quebradas
   - Exit code 1 se houver falhas

4. **Integrar no CI**
   - Adicionar step no workflow:
     ```yaml
     - name: Validate Documentation Links
       run: npx markdown-link-check docs/**/*.md .planning/**/*.md --config .markdown-link-check.json
     - name: Validate Doc-Code References
       run: npx tsx scripts/validate-docs.ts
     ```

5. **Configurar whitelist**
   - Ficheiro `.markdown-link-check.json` com URLs externas ignoradas
   - Lista de referências legacy aceites (para migração gradual)

6. **Validação de taxonomia** (opcional, fase 2)
   - Script que lê `roadmap.md` e verifica que waves referenciadas existem em `STATE.md`
   - Verifica que ADRs citados em docs existem em `docs/adr/`
