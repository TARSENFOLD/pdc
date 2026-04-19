# Configuração de Branch Protection (GitHub)

As seguintes regras devem ser configuradas manualmente por um administrador do repositório no GitHub para os ramos `main` e `develop`.

## Regras para `main` e `develop`

1. **Require a pull request before merging**: Activado.
    - **Require approvals**: 1 aprovação (mínimo).
    - **Dismiss stale pull request approvals when new commits are pushed**: Activado.
    - **Require review from Code Owners**: Activado.
2. **Require status checks to pass before merging**: Activado.
    - **Require branches to be up to date before merging**: Activado.
    - **Status checks críticos**:
        - `web — lint + typecheck + build`
        - `api — lint + typecheck + build`
        - `shared — lint + typecheck + build`
        - `e2e — Playwright smoke (Chromium)`
3. **Require conversation resolution before merging**: Activado.
4. **Restrict deletions**: Activado.
5. **Block force pushes**: Activado.

## Notas Adicionais

- **A11y (Axe-Core)**: Atualmente o passo de acessibilidade corre com `continue-on-error: true`, permitindo o merge mesmo com avisos. Isto será alterado na Wave 3.
- **Merge Method**: Preferência por **Squash merging** para manter o histórico limpo.
