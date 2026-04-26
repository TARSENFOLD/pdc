# API — Autenticação (`/auth`)

Todos os endpoints de autenticação usam cookies `httpOnly` para transportar tokens JWT de sessão. O sistema isola factos de telemetria usando um token secundário assinado por RS256.

## Base URL
```
/auth
```

---

## 🏛️ Os 7 Perfis Canónicos (RBAC)
O PDC v2 utiliza um modelo de autoridade baseado em roles soberanas:

| Role | Slug | Descrição |
|------|------|-----------|
| **Estudante** | `estudante` | Utilizador principal (antigo `aluno`). Procura orientação vocacional. |
| **Mentor** | `mentor` | Profissional ou académico que guia os estudantes. |
| **Instituição** | `instituicao` | Entidade de ensino que publica cursos e experiências. |
| **Comité Científico** | `comite_cientifico` | Responsável pela validação metodológica das simulações. |
| **Moderador** | `moderador` | Gere conflitos e denúncias na camada social. |
| **Super Admin** | `super_admin` | Acesso total à infraestrutura e governação. |
| **Patrocinador** | `patrocinador` | Entidade B2B que financia bolsas ou áreas específicas. |

---

## 🔐 Gestão de Tokens (Dual-Layer)

O sistema utiliza dois tipos de tokens para garantir a integridade dos dados:

### 1. User Session (HS256)
- **Onde:** Cookie `access_token` e `refresh_token` (`httpOnly`, `Secure`, `SameSite: Strict`).
- **Uso:** Autenticação em endpoints REST/BFF.
- **Expiração:** 15 min (Access) / 7 dias (Refresh).

### 2. Telemetry Token (RS256 - Soberano)
- **Onde:** Header `Authorization: Bearer <token>` em pedidos para a Edge.
- **Uso:** Apenas para escrita de factos de telemetria na L1.
- **Autoridade:** Assinado pelo BFF com chave privada; validado pela Edge via JWKS público.
- **Obtenção:** Disponível via endpoint `/bootstrap` após login.

---

## POST /auth/register
Regista um novo utilizador.

```json
{
  "email": "estudante@exemplo.ao",
  "password": "senha_segura_123",
  "nome": "Maria Silva",
  "role": "estudante"
}
```

---

## POST /auth/login
Autentica um utilizador. Emite cookies de sessão.

---

## GET /bootstrap (4 Camadas)
Endpoint vital para a inicialização da PWA. Retorna o estado completo da aplicação num único pedido.

### Resposta 200
```json
{
  "session": {
    "isAuthenticated": true,
    "user": {
      "id": "usr_abc123",
      "email": "estudante@exemplo.ao",
      "role": "estudante",
      "perfilId": "perf_xyz"
    }
  },
  "capabilities": {
    "features": { "MICRO_DESAFIO": true, "DASHBOARD_BENTO": true },
    "roles": ["estudante", "mentor", "instituicao", "moderador", "comite_cientifico", "super_admin", "patrocinador"]
  },
  "security": {
    "telemetryToken": "eyJhbGciOiJSUzI1NiIs..."
  },
  "ux": {
    "theme": "claro"
  }
}
```

---

## Novos Fluxos de Autoridade
- **OAuth Google/LinkedIn:** `/auth/oauth/google`
- **OTP Gateway:** `/auth/otp/request` (Twilio mockado em Dev)
- **2FA Hardening:** `/auth/2fa/verify`

---
*Doc is Law — Sincronizado com spec:IMPORTANTE/03 e ADR-018.*
