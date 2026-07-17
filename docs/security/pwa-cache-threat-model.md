# PWA cache threat model

## Decision

Authenticated and personal API responses are network-only. The service worker must never write `/api/*` responses to Cache Storage. Public API caching may only be introduced later through an explicit endpoint allowlist and a reviewed server-side `Cache-Control: public` contract.

## Assets and data matrix

| Resource | Strategy | Storage | Logout/delete purge |
| --- | --- | --- | --- |
| `/api/*` | Network only with `cache: no-store` | None | Legacy `pdc-api-*` caches removed |
| Hashed `/assets/*` | Cache first | `pdc-assets-*` | No; immutable public build assets |
| Fonts and manifest | Stale while revalidate | `pdc-static-*` | No; public assets |
| HTML navigation | Network, then offline page | `offline.html` only | No user data stored |
| Images/icons | Cache first | `pdc-static-*` | Public same-origin assets only |
| Offline telemetry | Background sync | `pdc-offline` IndexedDB | Yes; database/store cleared |
| Push subscription | Network/browser push service | Browser registration | Yes; subscription removed |

## Primary abuse case

1. User A signs in on a shared device and opens a personal API-backed screen.
2. User A signs out.
3. User B signs in or the device goes offline.
4. A global API cache returns User A's response to User B.

The controls are: no API Cache Storage writes, deletion of legacy API caches, purge of offline telemetry, push unsubscribe, and React Query memory clearing during logout.

## Verification

- Unit tests assert that only private legacy cache namespaces are deleted and that IndexedDB, workers, and push subscriptions are purged.
- Browser/E2E test: sign in as A, exercise personal endpoints, sign out, sign in as B, force offline mode, and assert that no response or rendered content from A is available.
- DevTools check: after authenticated journeys, Cache Storage contains no `pdc-api-*` cache and no request under `/api/`.

## Constraints

Offline authenticated workflows are deliberately unavailable until they have a per-user encrypted store, expiry, migration, and deterministic purge design. The offline screen must not claim that unsaved progress is stored.
