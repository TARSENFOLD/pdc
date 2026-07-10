# G8 — Upload de Mídia E2E (R2 Direct + Presigned + CDN Bust + OG Invalidation)

## Status

Draft · Depende de `spec:G15`, `spec:F1` (OG dinâmico).

## Estado actual auditado

- ✅ UI: file:apps/web/src/features/perfil/ProfilePhotoUpload.tsx, `useUpload.ts` hook.
- ✅ BFF: file:apps/api/src/routes/media.ts — **upload directo via BFF** (não presigned). Acceita 10 MB max.
- ✅ R2 service: file:apps/api/src/modules/media/r2.service.ts.
- ❌ **Não usa presigned URLs** — todo bytes passam pelo BFF (escalabilidade limitada).
- ❌ Sem cropper inline com aspect ratios canónicos.
- ❌ Sem callback `media-finalized` para CDN bust.
- ❌ Sem invalidação automática do OG image (`spec:F1`).
- ❌ Eventos `media.uploaded`, `media.processed`, `media.failed` não existem.

## Estado canónico

- Upload directo Browser → R2 via presigned URLs (BFF emite, não recebe bytes).
- Aspect ratios canónicos por tipo: avatar quadrado 1:1, capa 16:9, projeto 4:3, curso capa 16:9, post mídia free.
- CDN cache invalidation via Cloudflare API quando ficheiro substituído.
- OG image regenerado automaticamente para qualquer entidade afectada.

## Tickets

### G8-T1 — Refactor para presigned URLs

- `POST /media/presigned`: BFF gera presigned PUT URL para R2 + retorna `{ uploadUrl, finalKey, publicUrl }`.
- Cliente faz `PUT uploadUrl` directamente para R2.
- `POST /media/finalized`: cliente notifica BFF que upload foi bem-sucedido + tipo de entidade afectada (`{ entityType, entityId, key }`).
- BFF actualiza `mediaUrls` em Strapi + emite evento.
- **DoD E2E**:
  - **UI**: `useUpload.ts` refactor.
  - **Contrato**: `PresignedRequest`, `MediaFinalizedPayload`.
  - **BFF**: 2 rotas + R2 SDK gera URL.
  - **Persistência**: `mediaUrls` actualizado.
  - **Impacto**: emite `media.uploaded` → G15 → CDN bust.

### G8-T2 — Cropper inline com aspect ratios canónicos

- Componente `MediaCropper` Soul & Elite usando `react-image-crop` ou similar.
- Aspect ratios pré-configurados por tipo: `avatar` 1:1, `capa` 3:1, `projeto` 4:3, `curso-capa` 16:9, `post-media` free.
- Preview Soul & Elite com asymmetric border.
- **DoD E2E**:
  - **UI**: cropper Soul & Elite mobile-first com gestures touch.
  - **Contrato**: `CropParams`.
  - **BFF**: opcional server-side resize via Cloudflare Image Resizing.
  - **Persistência**: cropped version em R2.
  - **Impacto**: avatar consistente em todo o ecossistema.

### G8-T3 — CDN Cache invalidation + OG regeneration

- Após `media.uploaded`, BFF dispara: (a) Cloudflare API purge `https://api.cloudflare.com/client/v4/zones/.../purge_cache` para a key R2; (b) regenera OG image via `spec:F1` endpoint para entidade afectada.
- **DoD E2E**:
  - **BFF**: novo módulo file:apps/api/src/modules/media/cdn-cache.service.ts.
  - **Persistência**: timestamp de última regeneração para evitar thundering herd.
  - **Impacto**: utilizador troca avatar → 30s depois aparece em todas as superfícies (perfil, feed, comments) sem cache stale.

### G8-T4 — Video Service + background processing para mídia pesada

- `Video` é entidade própria e referenciável por Curso, Experiência, Post e
  Simulação. O conteúdo guarda `videoId`; URLs soltas permanecem legado.
- Modos canónicos:
  - `external`: YouTube, Vimeo, Loom ou outro provider autorizado.
  - `quick_upload`: upload rápido para R2, limite por endpoint/tipo, ideal para
    posts e demonstrações.
  - `professional_upload`: multipart para R2/provider, processamento assíncrono
    e publicação apenas após `ready`.
- Strapi guarda apenas metadados: provider, visibilidade, duração, thumbnail,
  chave original, streamUrl, legendas, capítulos, status e owner.
- BFF gera URL de playback assinada para `protected/private`; público pode usar
  CDN direta quando a política permitir.

- Vídeos > 10 MB: enfileira processamento em Upstash queue.
- Worker Railway separado faz: thumbnail extraction, transcoding (se necessário), upload de variantes a R2.
- Emite `media.processed` quando concluído ou `media.failed` se erro.
- **DoD E2E**:
  - **UI**: badge "A processar..." enquanto não concluído.
  - **BFF**: queue + worker.
  - **Persistência**: `mediaUrls` ganha variantes (thumbnail, sd, hd).
  - **Impacto**: utilizador continua a usar UI enquanto vídeo é processado em segundo plano.

### G8-T5 — Audit + segurança

- Validar MIME server-side (nunca confiar no cliente).
- Tamanhos máximos por tipo: avatar 2MB, capa 5MB, projeto 10MB, vídeo 50MB.
- Antivirus scan (opcional, ClamAV ou Cloudflare).
- Audit log de cada upload com IP + timestamp + tipo.
- **DoD E2E**:
  - **BFF**: validation server-side.
  - **Persistência**: audit-log.
  - **Impacto**: protecção contra upload de malware.

## Eventos canónicos

- **Emite**: `media.uploaded`, `media.processed`, `media.failed`.
- **Hooks G15**: Ranking (afecta perfil score se for avatar) · Feed (mídia em posts triggers refresh do card) · Achievement (não diretamente) · Notify (autor: "vídeo pronto para publicar").
