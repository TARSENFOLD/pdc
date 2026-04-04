# API — Simulações e Telemetria

## Autenticação

Todos os endpoints requerem cookie `access_token` válido (JWT httpOnly).

---

## Simulações (`/simulacoes`)

### GET /simulacoes

Lista simulações disponíveis com paginação e filtros.

**Query Parameters**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `page` | number | Página (padrão: 1) |
| `pageSize` | number | Items por página (máx. 100) |
| `search` | string | Filtro por título (case-insensitive) |
| `tipo` | 1 \| 2 \| 3 | Tipo de simulação |

**Resposta 200**

```json
{
  "data": [
    {
      "id": "sim_abc",
      "titulo": "Triagem Médica em Urgência",
      "descricao": "Simulação de triagem hospitalar nível básico.",
      "tipo": 2,
      "duracao": 45,
      "capaUrl": "https://cdn.pdc.ao/simulacoes/triagem.jpg"
    }
  ],
  "meta": {
    "pagination": { "page": 1, "pageSize": 12, "total": 48, "pageCount": 4 }
  }
}
```

---

### GET /simulacoes/me/tentativas

Lista todas as tentativas do utilizador autenticado, ordenadas por data descendente.

**Resposta 200**

```json
{
  "data": [
    {
      "id": "tent_xyz",
      "simulacaoId": "sim_abc",
      "score": 82,
      "estado": "concluida",
      "criadoEm": "2026-03-15T14:22:00Z"
    }
  ]
}
```

---

### GET /simulacoes/:id

Detalhe de uma simulação, incluindo questões e metadata.

**Resposta 200**

```json
{
  "id": "sim_abc",
  "titulo": "Triagem Médica em Urgência",
  "tipo": 2,
  "duracao": 45,
  "questoes": [
    { "id": "q1", "enunciado": "...", "tipo": "escolha_multipla", "opcoes": ["A", "B", "C"] }
  ]
}
```

**Erros**

| Status | Condição |
|--------|---------|
| `404 Not Found` | Simulação não encontrada |

---

### POST /simulacoes/:id/iniciar

Inicia uma nova tentativa. Cria um registo no Strapi com estado `em_curso`.

**Request Body**

```json
{ "simulacaoId": "sim_abc" }
```

**Resposta 201**

```json
{
  "tentativaId": "tent_xyz",
  "simulacaoId": "sim_abc",
  "estado": "em_curso",
  "iniciadaEm": "2026-04-04T10:00:00Z"
}
```

---

### PUT /simulacoes/:id/tentativas/:tentativaId/concluir

Conclui uma tentativa e calcula o score final.

**Request Body**

```json
{
  "score": 82,
  "metadata": {
    "respostas": { "q1": "A", "q2": "C" },
    "tempoPorQuestao": { "q1": 45, "q2": 30 }
  }
}
```

**Resposta 200**

```json
{
  "tentativaId": "tent_xyz",
  "score": 82,
  "estado": "concluida",
  "concluidaEm": "2026-04-04T10:45:00Z"
}
```

---

## Telemetria (`/telemetria`)

O sistema de telemetria usa **idempotência por `eventId`** — eventos duplicados são silenciosamente ignorados.

### POST /telemetria

Regista um evento de comportamento do utilizador.

**Request Body**

```json
{
  "eventId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "tipo": "questao_respondida",
  "payload": {
    "simulacaoId": "sim_abc",
    "questaoId": "q1",
    "resposta": "A",
    "tempoDecorrido": 45
  },
  "timestamp": "2026-04-04T10:15:30Z"
}
```

| Campo | Tipo | Regras |
|-------|------|--------|
| `eventId` | string (UUID v4) | Único por evento — garante idempotência |
| `tipo` | string | Identificador do tipo de evento |
| `payload` | object | Dados específicos do evento (schema livre) |
| `timestamp` | string (ISO 8601) | Data/hora do evento no cliente |

**Resposta 200 — novo evento**

```json
{ "ok": true }
```

**Resposta 200 — evento duplicado (idempotência)**

```json
{ "ok": true, "duplicado": true }
```

### Tipos de evento registados

| `tipo` | Quando ocorre |
|--------|--------------|
| `simulacao_iniciada` | Utilizador clica "Começar" |
| `questao_respondida` | Cada resposta numa simulação |
| `simulacao_concluida` | Simulação terminada com score |
| `item_curso_concluido` | Item de curso marcado como concluído |
| `perfil_vocacional_gerado` | Perfil calculado após simulações suficientes |
| `pagina_visitada` | Navegação entre secções principais |
