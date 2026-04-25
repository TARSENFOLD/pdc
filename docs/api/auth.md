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
| **Estudante** | `estudante` | Utilizador principal. Procura orientação vocacional e participa em simulações. |
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
- **Autoridade:** Assinado pelo BFF com chave privada RS256; validado pela Edge via JWKS público.
- **JWKS:** Disponível em `/.well-known/jwks.json`.
- **Obtenção:** Disponível via endpoint `/bootstrap` após login.

---

## POST /auth/register
Regista um novo utilizador. Default role: `estudante`.

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
Autentica um utilizador via credenciais locais. Emite cookies de sessão.
Se o sistema detectar necessidade de MFA, retornará `{ "requiresOtp": true, "canal": "email" }`.

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

### Lógica de População
1. **Session**: Extraída via cookie `access_token`. O BFF injeta a Role e o `perfilId` real vindos do Strapi.
2. **Capabilities**: Resolução híbrida entre o Registry de Features (L2) e overrides específicos da instituição (Strapi).
3. **Security**: Emissão do Telemetry Token (RS256) se o utilizador estiver autenticado.
4. **UX**: Preferências de interface (tema, idioma).

---

## 🌐 Fluxos de OAuth 2.0 (Google & LinkedIn)

O sistema suporta autenticação social via:
- `GET /auth/google`: Redireciona para o consentimento da Google.
- `GET /auth/linkedin`: Redireciona para o consentimento do LinkedIn.

Pós-login bem sucedido, o utilizador é redirecionado para a plataforma principal com cookies de sessão ativos.

---

## 📱 One-Time Password (OTP) & MFA

Utilizado para validação de identidade e 2FA.

### POST /auth/otp/send
Solicita o envio de um código de 6 dígitos.
- **Canais:** `email` ou `sms`.
- **Rate Limit:** Máximo 3 pedidos a cada 10 minutos. O limite é aplicado por **identificador de contacto** (email/telemóvel) e por **endereço IP** para prevenir abuso.
- **Validade:** O código expira após 10 minutos.

```json
{
  "canal": "sms",
  "phone": "+244900000000"
}
```

### POST /auth/otp/verify
Valida o código recebido pelo utilizador.
- **Efeito:** Se válido, completa o desafio de login e emite os tokens finais.
- **Tentativas:** Máximo 5 tentativas falhadas antes de invalidar o código (requer novo envio).
- **Cliente:** Em caso de expiração, o cliente deve tratar o erro `otp_expired` e oferecer reenvio; em caso de bloqueio, tratar `otp_locked` e aguardar novo envio.

```json
{
  "otp": "123456",
  "canal": "sms"
}
```

> [!NOTE]
> Em ambiente de desenvolvimento, o gateway de SMS (Twilio) pode ser mockado seguindo as diretivas de `spec:IMPORTANTE/02`.

---
*Doc is Law — Sincronizado com spec:IMPORTANTE/03 e ADR-018.*
