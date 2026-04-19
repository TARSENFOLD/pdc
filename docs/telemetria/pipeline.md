# Pipeline de Telemetria PDC v2

O PDC captura o "músculo comportamental" dos utilizadores através de um pipeline resiliente e distribuído.

## Diagrama de Fluxo

```mermaid
sequenceDiagram
    participant U as Utilizador (Browser)
    participant H as useTelemetry Hook
    participant B as BFF (Hono)
    participant R as Redis (Queue)
    participant S as Strapi (Audit/Storage)
    participant E as Conquistas Engine

    U->>H: Acção (Clique, Scroll, Resposta)
    H->>H: Bufferiza e Enriquecer (SessionId, URL)
    
    alt Sincronização Síncrona (Buffer 10)
        H->>B: POST /telemetria/batch
    else Fecho de Aba
        H->>B: Fetch (keepalive: true)
    end

    B->>R: Inserir em Fila (Job)
    B-->>H: 200 OK / 202 Accepted

    loop Job Processor
        R->>S: Criar registo de Telemetria
        S->>E: Trigger de Regras (Triggers)
        E->>S: Desbloquear Conquista (se aplicável)
    end
```

## Resiliência
1. **Offline Fallback**: Se o envio falhar, os eventos são guardados em `localStorage` (max 500) e sincronizados no próximo boot.
2. **Keepalive**: O uso de `fetch` com `keepalive: true` garante que eventos disparados no fecho da aba (como `visibility.lost`) cheguem ao servidor.
3. **Session Stability**: Cada sessão gera um UUID único, permitindo analisar o funil de conversão sem depender de cookies persistentes.
