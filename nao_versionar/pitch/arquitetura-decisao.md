# Arquitetura de Decisão — O Músculo Técnico

⚠️ **Este documento é um Manifesto de Visão / Pitch.** Para a fonte de verdade técnica e estado real do projeto, consulte o **[.planning/PROJECT.md](../../.planning/PROJECT.md)** e o **[.planning/STATE.md](../../.planning/STATE.md)**.

## 1. O Pipeline de Dados
Para garantir escala mundial sem o Strapi como "gargalo", o fluxo de dados do PDC segue o padrão **Edge-First**:

1.  **Frontend (PWA):** Captura eventos comportamentais em batch (resiliência a rede instável).
2.  **Telemetry Worker (Cloudflare):** Ingestão de alta performance com validação de Telemetry Token (Ver ADR-005).
3.  **Heuristics Engine (Railway):** Um worker assíncrono processa os cálculos matemáticos e guarda a **Vocational Signature** no PostgreSQL.

---

## 2. O Algoritmo Vocacional
O PDC não usa médias simples. Utilizamos algoritmos de precisão para mapear a "alma técnica" do estudante:

### A. Fluidez Cognitiva ($\phi$)
Mede a consistência entre o raciocínio e a execução. 
- **Fórmula:** $\phi = (Baseline / MeanTime) * (1 - CoeficientOfVariation)$
- **Insight:** Rapidez sem consistência indica instabilidade; consistência lenta indica processamento profundo.

### B. Resiliência ao Erro ($R$)
Mede a reação emocional e técnica à falha.
- **Lógica:** Analisamos o intervalo de tempo e a precisão da ação imediatamente posterior a um erro na Simulação Tipo 2/3.
- **Insight:** Estudantes que mantêm o ritmo após o erro são candidatos de elite para carreiras de alta pressão.

---

## 3. Camadas de Interpretação
O Oráculo opera em três níveis de confiança, garantindo que o sistema nunca falhe na entrega de valor:

1.  **Nível 1 (Factos):** Gráficos brutos de telemetria.
2.  **Nível 2 (Heurísticas):** Diagnósticos objetivos baseados em regras fixas (Motor de Heurísticas).
3.  **Nível 3 (Interpretativo):** Insights narrativos da Tina v2.0 (IA).

---

## 4. Conformidade Apple Store & Mobile
Para garantir a presença nas lojas oficiais, o PDC cumpre:
- **Segurança:** Autenticação via `httpOnly cookies` e TLS obrigatório.
- **Performance:** Imagens e vídeos com compressão adaptativa e cache agressivo.
- **UX:** Padrões de design de 44px para áreas de toque e navegação por polegar (Bottom Sheets).

---
**Engenharia:** Elite | **Rigor:** Matemático
