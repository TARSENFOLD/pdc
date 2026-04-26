# SISTEMA MESTRE FINAL — PDC v2 (Patamar Mundial)

## 1. O Manifesto da Autoridade
O PDC v2 não é um software; é um **Oráculo de Capital Humano**. A nossa essência reside na transformação de comportamento bruto em evidência de mérito. Construímos para Angola com padrões de elite global.

---

## 2. Arquitetura Soberana (Híbrida)

### L1: A Camada de Factos (Edge Telemetry - ADR-005)
- **Onde:** Cloudflare Workers (apps/edge).
- **Volume:** 90% das requests (Telemetria, Landing Pulse, Catálogos Públicos).
- **Músculo:** Batching resiliente (IndexDB) + Telemetry Token (HMAC).

### L2: O Cérebro Matemático (Heurísticas)
- **Onde:** @pdc/shared + BFF (Railway).
- **Função:** Cálculo de $\phi$ (Fluidez) e $R$ (Resiliência). Independente de IA.
- **Integridade:** Tabela `behavior_patterns` agregada.

### L3: O Verniz de Inteligência (Tina v2.0)
- **Onde:** Hono BFF (Railway).
- **Integração:** Assistente completa (deep-chat) + Interpretação lateral em relatórios.
- **Soberania:** Fallback para heurísticas se a API falhar.

### L4: O Core de Negócio (Sovereign Auth)
- **Onde:** Railway (Node 24).
- **Auth:** JWT httpOnly cookies + RBAC (6 roles). **Rejeitado Clerk.**
- **Realtime:** Socket.IO para mensagens e notificações.

---

## 3. Identidade Visual "Soul & Elite"

- **Base Canónica:** Tema Claro (#F8F9FA) com tipografia Inter + Instrument Serif.
- **Acento de Identidade:** Terracota (#D2691E) $\le$ 5% e institucional #004AAD.
- **Visual:** Bento Grids para Dashboards, Glassmorphism para IA e HUD para Simulações.
- **Rigor Mobile:** Áreas de toque de 44px e PWA-First.

---

## 4. O Mapa de Execução (5 Waves)

### Wave 1: O Gênese (Restauração + ADR-005)
- [ ] Restaurar v2 Canónica e tickets M0-M7.
- [ ] Implementar Ingestor Edge (Cloudflare) para Telemetria.
- [ ] Seed Narrativo Monumental (9k eventos).
- [ ] Limpeza de "Fantasmas" (links 404 para Skeletons).

### Wave 2: O Motor Vocacional (Cérebro)
- [ ] Expor Heuristics Engine no Relatório.
- [ ] LTI 1.3 Grade Passback automático.
- [ ] Simulação Tipo 2 com HUD HUD e tracking real.

### Wave 3: A Comunidade de Mérito (Prestígio)
- [ ] Feed Completo (Geral/Vocacional/Institucional/Trending).
- [ ] Mensagens Realtime e Vínculos Bilaterais.
- [ ] Página de Reputação Bento Grid.

### Wave 4: Redesign & Privacidade
- [ ] Aplicação total da identidade (Claro Base / Escuro Opção).
- [ ] Separação Rígida Perfil Público vs Dashboard Privado.

---

## 5. Regras de Ouro (Constituição v2.2)
1. **SSOT:** Contratos nascem no `@pdc/shared`.
2. **File Limit:** 300 linhas máximo (REQ-NF-007 atualizado).
3. **Zero Any:** Tipagem estrita é inegociável.
4. **Workers-Clean:** Código do BFF sem APIs Node-exclusivas para futura portabilidade total.

---
**Data:** 17 de Abril de 2026 | **Autoridade:** Engenheiro Parceiro (Gemini CLI)
