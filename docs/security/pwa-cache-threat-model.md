# Matriz de cache e ameaça do PWA

## Decisão

Respostas de API são `NetworkOnly`. O PDC não oferece offline autenticado até existir armazenamento cifrado, expirável e isolado por utilizador com ACK do servidor.

## Matriz

| Recurso | Estratégia | Pode conter dados pessoais | Purge no logout |
| --- | --- | --- | --- |
| `/api/*` | NetworkOnly | Sim | Caches legados `pdc-api-*` são eliminados |
| HTML de navegação | NetworkOnly com `/offline.html` em falha | Não no fallback | Não aplicável |
| `/assets/*` com hash | CacheFirst | Não | Não |
| Fontes, ícones, imagens e manifest | CacheFirst ou StaleWhileRevalidate | Não devem conter dados de sessão | Não |
| Fila de telemetria | IndexedDB/localStorage, entrega idempotente | Pode conter identificadores de sessão e sinais comportamentais | Sim |
| React Query | Memória | Sim | Sim |
| Web Push | Subscrição do browser e token BFF | Associa dispositivo à conta | Sim |

## Ameaças controladas

1. Utilizador A termina sessão num dispositivo partilhado e o utilizador B fica offline: não existe resposta privada em Cache Storage para servir a B.
2. Um service worker antigo deixou `pdc-api-*`: activação e logout eliminam esses caches.
3. Telemetria pendente sobrevive à troca de conta: logout elimina localStorage, sessionStorage e a base `pdc-offline`, e também notifica o service worker.
4. O BFF falha ao remover um token push: a subscrição local é invalidada em `finally`; o endpoint remoto deixa de entregar e pode ser removido pelo tratamento 404/410 existente.

## Limites explícitos

- A página offline não promete progresso guardado.
- Pedidos privados, submissões, conclusões e certificados nunca recebem confirmação offline.
- Qualquer offline autenticado futuro exige ADR, isolamento por utilizador, cifragem, expiração, migração e purge determinístico.
