# D3 — ADR-018 Estratégia Mobile (PWA + Capacitor + TWA)

## Status

Draft · Documenta D1 + D2.

## Estado actual

Não existe ADR sobre estratégia mobile. Decisão tomada por chat (`chat:` desta sessão) precisa de ratificação formal em ADR.

## Estado canónico

ADR formal em file:docs/decisoes/adr-018-estrategia-mobile.md que ratifique:

1. **PWA é a fundação** (não há app nativa separada com codebase próprio).
2. **iOS via Capacitor** (encapsula PWA, permite App Store).
3. **Android via TWA/Bubblewrap** (encapsula PWA, permite Play Store).
4. **Push notifications nativas** via APNs + FCM (não Web Push).
5. **Trade-offs documentados** (porque não Expo/RN, porque não Flutter).

## Tickets

### D3-T1 — Criar ADR-018 com Contexto, Decisão, Consequências, Reavaliação

Estrutura standard (file:docs/decisoes/adr-001-monorepo.md como template). Citar `spec:D1`, `spec:D2`. Listar alternativas rejeitadas (Expo/RN: custo de manter UI duplicada; Flutter: violar Soul & Elite; nativo puro: custo absurdo).

- **DoD E2E**: ADR é o ponto único de defesa da decisão; futuros devs não voltam a discutir.

### D3-T2 — Adicionar diagrama de pipeline de release

Mermaid: PWA build → Capacitor sync → iOS build (Xcode runner) + Android Bubblewrap → assinatura → upload TestFlight + Internal Track → review → produção.

- **DoD E2E**: dev novo percebe pipeline em <5min.

### D3-T3 — Documentar estratégia de versionamento

SemVer da PWA = versão da app nativa (sem fork). `version` no manifest = `version` no `Info.plist` = `versionName` em Android.

- **DoD E2E**: zero confusão entre versões web/iOS/Android.

## Dependências

- Documenta D1 + D2.
- Coordena com B5 (ADRs).

</TRAYCER_SPEC>