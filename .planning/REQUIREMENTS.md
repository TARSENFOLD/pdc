# PDC v2 — Mapa de Funcionalidades e Requisitos

Este ficheiro é a fonte de verdade para o estado de cada funcionalidade, sincronizado com a **Epic Canónica 02**.

## 1. Núcleo de Decisão Vocacional
| ID | Funcionalidade | Estado | Notas |
| --- | --- | --- | --- |
| N1 | Motor de Heurísticas $\phi$ e $R$ | ✅ | `@pdc/shared/heuristics.ts` |
| N2 | Telemetria Edge-First (L1) | ✅ | Cloudflare Workers + Upstash |
| N3 | Idempotência (UUID + outbox) | ✅ | Resiliência de eventos |
| N4 | Sanity Validator dual-layer | ✅ | Anti-cheat |
| N5 | Score derivado no BFF | ✅ | Substitui hardcode legacy |
| N6 | Perfil Vocacional automático | ✅ | 6 dimensões + 4 tiers |
| N7 | Reputação canónica | ✅ | Cache Redis |
| N8 | Conquistas via Event Bus | ✅ | 12 regras |
| N9 | Relatório Premium | 🟡 | Threaded insights pendentes |

## 2. Conteúdo e Domínios
| ID | Funcionalidade | Estado | Notas |
| --- | --- | --- | --- |
| C1 | Cursos (Hierarquia completa) | ✅ | Curso -> Módulo -> Item |
| C2 | Simulações Tipo 1 (Vídeo) | ✅ | Player funcional |
| C3 | Simulações Tipo 2 (Lab) | ✅ | Score real derivado |
| C4 | Simulações Tipo 3 (Interativo) | ✅ | `Tipo3Player.tsx` |
| C5 | Experiências (Marketing) | ✅ | Sempre gratuitas |
| C6 | Programas (Contentores) | 🟡 | UI de gestão parcial |
| C7 | Projetos (UGC) | ✅ | Camadas de privacidade |
| C8 | Posts e Conquistas | ✅ | Feed social |
| C9 | Quizzes e Tarefas | ✅ | Notas automáticas |
| C10| Certificados | ✅ | `/estudante/certificados` |

## 3. Transversais (Target Polimórfico)
| ID | Funcionalidade | Estado | Notas |
| --- | --- | --- | --- |
| T1 | Like / Curtir | ✅ | Evento `interaction.like` |
| T2 | Bookmark / Guardar | ✅ | Página `/guardados` |
| T3 | Comentar | ✅ | Rate limit 10/min |
| T4 | Avaliar (Rating) | 🟡 | Persistência PostgreSQL |
| T5 | Partilhar | ⏳ | Por integrar |
| T6 | Denunciar (Report) | ✅ | Fila para moderador |
| T7 | Telemetria Global | ✅ | Coração do Oráculo |
| T8 | Vínculos Bilaterais | 🟡 | Schema base ✅ |
| T9 | Notificações Realtime | ✅ | Socket.IO |

## 4. Plataforma
| ID | Funcionalidade | Estado | Notas |
| --- | --- | --- | --- |
| P1 | Auth JWT httpOnly + RBAC | 🟡 | Rotação de tokens pendente |
| P2 | OAuth + OTP (Twilio) | 🟡 | Twilio mockado |
| P3 | 2FA Obrigatório | ✅ | Hardening completo |
| P4 | FeatureRegistry SSOT | ✅ | 7 features + 6 HUBs |
| P5 | Bootstrap 4 camadas | ✅ | Session/Caps/Security/UX |
| P6 | Rate limiting | ✅ | Upstash |
| P9 | Tina (Assistente IA) | 🟡 | Streaming instável |

---
*Legenda: ✅ Implementado | 🟡 Parcial | ⏳ Por implementar | ⏸ Estacionado.*
