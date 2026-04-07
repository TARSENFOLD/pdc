# DEV_SKIP_OTP — Bypass de OTP para Desenvolvimento

Este documento explica o funcionamento, a configuração e as medidas de segurança do mecanismo de bypass de OTP (One-Time Password) no ambiente de desenvolvimento do PDC.

## 1. O que é?

O `DEV_SKIP_OTP` é uma funcionalidade do BFF (`apps/api`) que permite aos desenvolvedores autenticarem-se na plataforma sem necessitarem de receber e introduzir códigos de verificação reais (via Email ou SMS). Isto acelera significativamente o ciclo de desenvolvimento e testes de UI.

## 2. Como Activar

1. No ficheiro `apps/api/.env` (local), define:
   ```env
   DEV_SKIP_OTP=true
   ```
2. Reinicia o servidor do BFF.

## 3. Como Funciona

Existem dois caminhos de bypass activos quando `DEV_SKIP_OTP=true`:

### A. Bypass Automático no Login/Registo
Ao submeter as credenciais no `/auth/login` ou `/auth/register`, o sistema detecta o bypass e emite imediatamente os cookies de sessão (`access_token`, `refresh_token`), redirecionando o utilizador para o dashboard sem passar pelo ecrã de OTP.

### B. Código Mestre de Verificação
Se por algum motivo o fluxo de UI levar o utilizador ao ecrã de verificação de OTP (ex: testes manuais do componente), o código `000000` será aceite como válido pelo servidor, independentemente do que tenha sido "enviado".

## 4. Camadas de Protecção (Guard Triplo)

Para evitar que este mecanismo seja activado acidentalmente em produção, o bypass só funciona se **todas** as seguintes condições forem verdadeiras:

1. **Variável Explicita:** `DEV_SKIP_OTP` deve ser exatamente `'true'`.
2. **Ambiente Não-Produção:** `NODE_ENV` deve ser diferente de `'production'`.
3. **Domínio Local:** O `STRAPI_URL` definido no `.env` não pode conter o domínio de produção (`pdc-strapi.railway.app`).

## 5. Logs de Auditoria

Sempre que o bypass é activado, o servidor emite um log de aviso:
```text
WARN: OTP bypassed in dev mode (canSkipOtp=true)
```
Isto serve para manter a visibilidade sobre a segurança do sistema durante o desenvolvimento.

## 6. Checklist Pré-Deploy

⚠️ **NUNCA** incluas `DEV_SKIP_OTP=true` em variáveis de ambiente de produção (Vercel, Railway, etc.).

- [ ] Verificar que `apps/api/.env.example` tem `DEV_SKIP_OTP=false`.
- [ ] Verificar que os segredos da CI/CD não contêm esta variável.
- [ ] Em caso de dúvida, o sistema falhará para o modo seguro (OTP obrigatório) devido ao Guard Triplo.
