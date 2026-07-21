# ADR-003 — JWT em httpOnly Cookies

**Estado:** Aceite  
**Data:** 2025-11-05  
**Contexto:** Fase 1 — Autenticação Segura

---

## Contexto

O PDC precisa de autenticar pedidos entre o frontend React e o BFF Hono. O token de sessão tem de ser transmitido de forma segura em cada pedido.

Estratégias consideradas:

1. **localStorage** — token guardado no browser, enviado manualmente no header
2. **sessionStorage** — idem, mas não persiste entre tabs
3. **Memory (in-memory)** — token em variável React, perdido ao recarregar
4. **httpOnly Cookie** — token gerido pelo browser, enviado automaticamente

---

## Decisão

Usar **JWT em httpOnly cookies** com rotação de refresh tokens.

Dois tokens separados:
- `access_token`: JWT, 15 minutos, httpOnly, Secure, SameSite=Strict
- `refresh_token`: JWT, sessão absoluta de 90 dias, httpOnly, Secure,
  SameSite=Strict e rotação automática conforme ADR-054

**Emenda operacional de produção (2026-07-18):** o frontend e o BFF usam os
subdomínios first-party `usepdc.com` e `api.usepdc.com`. A exceção Railway com
`SameSite=None` terminou. Cookies de autenticação usam `SameSite=Strict`; apenas
o cookie transitório do OAuth usa `SameSite=Lax` para regressar do provider,
mantendo `httpOnly`, `Secure` em produção, TTL de 10 minutos e path `/auth`.

---

## Justificação

**Contra localStorage / sessionStorage:**
- Vulnerável a **XSS** — qualquer script malicioso na página pode ler e exfiltrar o token
- OWASP Top 10: A03 Injection — XSS é vector de ataque real em plataformas com conteúdo gerado por utilizadores (projetos, descrições, mensagens)
- Não é considerado seguro para tokens de sessão em aplicações com dados pessoais

**Contra memory (in-memory):**
- Token perdido ao recarregar a página — UX degradada
- Requer lógica de refresh complexa logo ao arrancar a app
- Ainda vulnerável a XSS via `postMessage` ou prototype pollution

**A favor de httpOnly cookies:**
- **Inacessíveis a JavaScript** — XSS não consegue ler o token
- Enviados automaticamente pelo browser em cada pedido CORS com `credentials: 'include'`
- `SameSite=Strict` protege contra **CSRF** — o cookie só é enviado em pedidos same-site
- `Secure=true` em produção — apenas enviados via HTTPS
- Padrão recomendado pela OWASP para tokens de sessão

---

## Implementação

### BFF (Hono)

```typescript
setCookie(c, 'access_token', accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax',
  maxAge: 15 * 60,      // 15 min
  path: '/',
});
```

### Frontend (React)

```typescript
// Todos os pedidos incluem credentials: 'include'
const response = await fetch(`${BASE_URL}/cursos`, {
  credentials: 'include', // envia cookies automaticamente
});
```

### Rotação de Refresh Token

A cada uso do `refresh_token`:
1. O hash corrente da família é comparado e substituído atomicamente no Redis
2. Novo par de tokens é gerado
3. Cookies actualizados

Se o mesmo refresh token for usado duas vezes, **toda a sessão é invalidada**
(detecção de token theft). A rotação preserva a expiração absoluta de 90 dias.

---

## Consequências

- **Positivo:** Protecção robusta contra XSS (ataque mais comum em SPAs)
- **Positivo:** CSRF mitigado por `SameSite=Strict`
- **Positivo:** UX transparente — frontend não gere tokens explicitamente
- **Negativo:** Requer CORS configurado correctamente com `credentials: 'include'`
- **Negativo:** `SameSite=Strict` impede uso do cookie em redirects OAuth de terceiros — requer ajuste para fluxo Google OAuth (usar `SameSite=Lax` só no cookie temporário OAuth)

---

## Reavaliação

Esta decisão é complementada pelo ADR-054 para duração, rotação atómica e
dispositivos confiáveis.
