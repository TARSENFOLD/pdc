# API — Autenticação (`/auth`)

Todos os endpoints de autenticação usam cookies `httpOnly` para transportar tokens JWT. O cliente **nunca** acede directamente aos tokens.

## Base URL

```
/auth
```

---

## POST /auth/register

Regista um novo utilizador. Por omissão, o role é `aluno`.

### Rate Limiting

Máximo 5 pedidos por minuto por IP.

### Request Body

```json
{
  "email": "aluno@exemplo.ao",
  "password": "senha_segura_123",
  "nome": "Maria Silva"
}
```

| Campo | Tipo | Obrigatório | Regras |
|-------|------|------------|--------|
| `email` | string | ✅ | formato email válido |
| `password` | string | ✅ | mínimo 8 caracteres |
| `nome` | string | ✅ | 2–100 caracteres |

### Resposta 200

```json
{
  "id": "usr_abc123",
  "email": "aluno@exemplo.ao",
  "nome": "Maria Silva",
  "role": "aluno"
}
```

Cookies definidos:
- `access_token` — JWT, httpOnly, Strict, 15 min
- `refresh_token` — JWT, httpOnly, Strict, 7 dias

### Erros

| Status | Condição |
|--------|---------|
| `400 Bad Request` | Email já registado ou dados inválidos |
| `429 Too Many Requests` | Rate limit excedido |

---

## POST /auth/login

Autentica um utilizador existente.

### Rate Limiting

Máximo 5 pedidos por minuto por IP.

### Request Body

```json
{
  "email": "aluno@exemplo.ao",
  "password": "senha_segura_123"
}
```

### Resposta 200

Idêntica ao `/register`. Cookies actualizados.

### Erros

| Status | Condição |
|--------|---------|
| `401 Unauthorized` | Credenciais inválidas |
| `429 Too Many Requests` | Rate limit excedido |

---

## POST /auth/logout

Termina a sessão: revoga o refresh token e apaga os cookies.

### Autenticação

Requer cookie `access_token` válido.

### Resposta 200

```json
{ "success": true }
```

### Erros

| Status | Condição |
|--------|---------|
| `401 Unauthorized` | Cookie ausente ou token expirado |

---

## POST /auth/refresh

Renova o par de tokens usando o `refresh_token` em cookie. Implementa **rotação de tokens** — o refresh token antigo é imediatamente revogado.

### Rate Limiting

Máximo 5 pedidos por minuto por IP.

### Resposta 200

```json
{ "success": true }
```

Novos cookies `access_token` e `refresh_token` são definidos.

### Erros

| Status | Condição |
|--------|---------|
| `401 Unauthorized` | Refresh token ausente, expirado ou já revogado |

---

## GET /auth/me

Retorna o perfil do utilizador autenticado.

### Autenticação

Requer cookie `access_token` válido.

### Resposta 200

```json
{
  "id": "usr_abc123",
  "email": "aluno@exemplo.ao",
  "nome": "Maria Silva",
  "role": "aluno"
}
```

### Erros

| Status | Condição |
|--------|---------|
| `401 Unauthorized` | Token ausente ou expirado |
| `404 Not Found` | Utilizador não encontrado (token válido mas conta eliminada) |

---

## Notas de Segurança

- Tokens JWT usam algoritmo **HS256** com secret mínimo de 32 caracteres
- `access_token` expira em **15 minutos**
- `refresh_token` expira em **7 dias** com rotação automática
- Cookies têm `SameSite: Strict` — protegem contra CSRF
- Em produção, `Secure: true` — apenas enviados via HTTPS
- O payload do JWT inclui: `{ sub: userId, role, iat, exp }`
