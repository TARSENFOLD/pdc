# Contas internas em produção

As contas `super_admin`, `moderador` e `comite_cientifico` usam o login normal da
plataforma. Não existe uma página de autenticação separada.

## Primeiro Super Admin

O seed de desenvolvimento não deve ser executado em produção. Para provisionar a
primeira conta, configure temporariamente estas variáveis no serviço da API:

```text
PDC_INTERNAL_ACCOUNT_EMAIL
PDC_INTERNAL_ACCOUNT_PASSWORD
PDC_INTERNAL_ACCOUNT_NAME
PDC_INTERNAL_ACCOUNT_ROLE=super_admin
PDC_INTERNAL_ACCOUNT_RESET_PASSWORD=false
```

Depois do build da API, execute uma única vez:

```bash
npm run provision:internal-account -w @pdc/api
```

Se o email já existir, a palavra-passe atual é preservada. Para uma reposição
deliberada, defina `PDC_INTERNAL_ACCOUNT_RESET_PASSWORD=true`, execute novamente
e remova todas as variáveis temporárias.

## Moderador e Comité Científico

1. O utilizador cria uma conta normal ou já possui uma conta.
2. O Super Admin entra em `/login`.
3. Acede a `/app/admin/utilizadores`.
4. Usa **Alterar Role** para escolher `moderador` ou `comite_cientifico`.
5. O utilizador termina a sessão anterior e entra novamente em `/login`.

O BFF persiste a função em `perfil.tipo`, que é a fonte canónica usada para
emitir os tokens de sessão e aplicar RBAC.
