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
Caixa Autorizada: A (Código viola lei — CI não enforça "Doc is Law"; refactoring necessário)

Scope IN (Ficheiros permitidos):
- .github/workflows/ci.yml (ou equivalente)
- scripts/validate-docs.ts (NOVO)
- package.json (root — adicionar script)
- .markdownlint.json (NOVO — config)
- .markdown-link-check.json (NOVO — whitelist config)

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
[ ] npm run typecheck — verde em todos os workspaces
[ ] npm run lint — sem novos eslint-disable
[ ] npm run test — Vitest verde em todos os workspaces
[ ] npx playwright test --project=chromium — happy paths
[ ] STATE.md actualizado com progresso Wave 0 (Meta-Governação)
[ ] Commit atómico: audit(wave0-meta): integrate CI doc validator
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
     - Extrair referências a código: **apenas backticks com caminhos explícitos** contendo separadores de pasta ou extensão de ficheiro (ex: `src/components/Button.tsx`, `apps/api/src/lib/r2.ts`) — referências genéricas como `functionName` são ignoradas nesta fase
     - Verificar se esses caminhos existem no codebase via `fs.existsSync` ou glob
     - Validação por nome de função/classe — reservada para Fase 2 com convenção de marcação (ex: `@file:path/to/file.ts`)
   - Output: lista de links/referências quebradas
   - Exit code 1 se houver falhas

4. **Integrar no CI**
   - Adicionar step no workflow:
     ```yaml
     - name: Validate Documentation Links
       shell: bash
       run: |
         shopt -s globstar
         npx markdown-link-check docs/**/*.md .planning/**/*.md --config .markdown-link-check.json
     - name: Validate Doc-Code References
       run: npx tsx scripts/validate-docs.ts
     ```

5. **Configurar whitelist**
   - Ficheiro `.markdown-link-check.json` com URLs externas ignoradas
   - Lista de referências legacy aceites (para migração gradual)

6. **Actualizar STATE.md**
   - Registar conclusão da integração CI de validação de docs
   - Marcar progresso Wave 0 (Meta-Governação)
   - Commit atómico: `audit(wave0-meta): integrate CI doc validator`

---

## Fase 2 — Validação de Nomes de Função/Classe via `@file:` Markers

### Contexto

A Fase 1 valida que **ficheiros existem**. A Fase 2 valida que **símbolos exportados existem** no ficheiro referenciado. Isto fecha o ciclo "Doc is Law": se um ADR cita `moveToColdStorage` em `r2.ts`, o CI confirma que o símbolo existe.

### Convenção `@file:` Marker

Nos documentos Markdown, citar símbolos com a sintaxe:

```markdown
<!-- @file:apps/api/src/lib/r2.ts::moveToColdStorage -->
A função `moveToColdStorage` arquiva eventos inválidos em R2.

<!-- @file:packages/shared/src/user.ts::RoleSchema -->
O `RoleSchema` define os 7 roles canónicos.
```

**Regras da convenção:**
- Formato: `<!-- @file:CAMINHO_RELATIVO_À_RAIZ::NOME_DO_SÍMBOLO -->`
- O caminho é relativo à raiz do repositório (sem `./`).
- O símbolo pode ser: nome de função exportada, nome de classe, nome de interface, nome de type alias, nome de variável exportada (`export const`).
- Um marker por linha. Múltiplos markers num mesmo ficheiro são válidos.
- O validator não resolve overloads — basta que o nome apareça numa declaração `export`.

### Extensão de `scripts/validate-docs.ts`

Adicionar ao script existente:

```ts
// Fase 2 — @file: marker validation
const FILE_MARKER_RE = /<!--\s*@file:([^:]+)::(\S+)\s*-->/g;

for (const mdFile of markdownFiles) {
  const content = fs.readFileSync(mdFile, 'utf-8');
  let match: RegExpExecArray | null;
  while ((match = FILE_MARKER_RE.exec(content)) !== null) {
    const [, filePath, symbolName] = match;
    const absPath = path.resolve(repoRoot, filePath);
    if (!fs.existsSync(absPath)) {
      errors.push(`${mdFile}: @file marker references missing file: ${filePath}`);
      continue;
    }
    const source = fs.readFileSync(absPath, 'utf-8');
    // Symbol must appear in an export declaration
    const exportPattern = new RegExp(`export[^;{]*\\b${symbolName}\\b`);
    if (!exportPattern.test(source)) {
      errors.push(`${mdFile}: symbol '${symbolName}' not found as export in ${filePath}`);
    }
  }
}
```

### Critério Done (Fase 2)

```
[ ] Convenção @file: documentada em CONTRIBUTING.md (secção "Doc References")
[ ] validate-docs.ts estendido com Fase 2 (marker parsing + export check)
[ ] CI step actualizado: validação de markers incluída no mesmo job
[ ] ADRs existentes anotados com markers onde citam funções canónicas
[ ] npm run typecheck — verde
[ ] npm run lint — sem novos eslint-disable
[ ] Commit atómico: docs(wave0-meta): ci-doc-validator phase-2 @file markers
```

### Whitelist de Símbolos Excluídos

Alguns símbolos são internos ou gerados; não devem gerar erro:

```json
// .ci-doc-validator.json (novo ficheiro de config)
{
  "phase2": {
    "excludeSymbols": ["default", "handler", "plugin"],
    "excludePaths": ["infra/strapi/src/**"]
  }
}
```
