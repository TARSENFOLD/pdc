# Contract: POST /landing/pulse

**Endpoint**: `POST /landing/pulse`  
**Auth**: Nenhuma (público — acessível por visitantes anónimos)  
**Module**: `apps/api/src/routes/landing.ts`

---

## Request

```
POST /landing/pulse
Content-Type: application/json
```

**Body** (JSON):

| Campo | Tipo | Obrigatório | Validação |
|-------|------|-------------|-----------|
| `sessionId` | `string` | ✅ | min 1 char, max 64 chars |
| `area` | `string` | ❌ | qualquer string; ignorada se vazia |

**Exemplo**:
```json
{
  "sessionId": "a3f8c2d1-4e5b-6789-abcd-ef0123456789",
  "area": "MEDICINA"
}
```

---

## Response

**200 OK** (sempre — não expõe estado interno):
```json
{ "ok": true }
```

**400 Bad Request** (sessionId ausente ou inválido):
```json
{ "error": "sessionId obrigatório" }
```

---

## Efeito colateral

Chama `pulseService.recordActivity(sessionId, area)` que:
1. Regista a sessão como activa (in-process, TTL 60s)
2. Após debounce de 1s, emite Socket.IO `landing:pulse` para **todos** os clientes conectados

**Evento Socket.IO emitido** (evento `landing:pulse`):
```json
{ "count": 3, "area": "MEDICINA" }
```
ou (quando `area` não foi fornecida):
```json
{ "count": 5 }
```

---

## Notas de segurança

- Rate limiting via middleware global do BFF (já configurado)
- `sessionId` é apenas um identificador opaco — não é validado como UUID; não é persistido
- Não retorna contagem nem estado — resposta mínima para não expor métricas de tráfego via HTTP

---

# Contract: Socket.IO evento `landing:pulse`

**Tipo de contrato**: Socket.IO broadcast event  
**Emitido por**: BFF (`socketService.emitirLandingPulse()`)  
**Recebido por**: Qualquer socket conectado (autenticado ou anónimo)

## Payload

```typescript
interface LandingPulseEvent {
  count: number;   // número de sessões activas na área nos últimos 60s
  area?: string;   // área opcional (ex: "MEDICINA", "TECNOLOGIA")
}
```

## Comportamento no cliente

```typescript
// useMicroDesafio.ts
useEffect(() => {
  return on<LandingPulseEvent>('landing:pulse', (data) => {
    setState((s) => ({
      ...s,
      pulso: { count: data.count, ...(data.area ? { area: data.area } : {}) },
    }));
  });
}, [on]);
```

**Regra zero-mock**: Frontend só renderiza o indicador de pulso quando `pulso.count > 0`.
