# Testes de Carga PDC v2 (k6)

Este diretório contém a suíte de testes de carga para o **PDC v2**, utilizando o [k6](https://k6.io/).

## 🚀 Instalação do k6

### macOS (Homebrew)
```bash
brew install k6
```

### Linux (Ubuntu/Debian)
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/bin/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Docker
```bash
docker pull grafana/k6
```

## 🏃 Como executar os testes

Por defeito, os testes apontam para `http://localhost:3001`. Podes alterar o alvo usando a variável de ambiente `BASE_URL`.

### Executar localmente (Development)
```bash
k6 run tests/k6/auth-flow.js
```

### Executar contra Staging
```bash
BASE_URL=https://api-staging.usepdc.com k6 run tests/k6/feed-load.js
```

### Com Docker
```bash
# Executa o auth-flow por defeito
npm run docker:load /scripts/auth-flow.js

# Executa qualquer outro script
npm run docker:load /scripts/telemetry-parallel.js
```

## 📊 Scripts Disponíveis

| Script | Foco | Configuração | Target (p95) |
| :--- | :--- | :--- | :--- |
| `auth-flow.js` | Login, Me, Refresh | Ramp 0 -> 200 VUs | < 500ms |
| `feed-load.js` | Feed, Scroll, Tabs | 100 VUs sustained | < 500ms |
| `catalogo-browse.js` | Navegação pública | 200 VUs sustained | < 300ms |
| `full-journey.js` | Registo -> Curso -> Telemetria | 50 VUs sustained | < 800ms |
| `discussions-load.js` | Fóruns, Threads, Replies | 50 VUs sustained | < 600ms |
| `telemetry-parallel.js` | Batches de 50 eventos (T9) | 50 VUs sustained | < 1000ms |
| `spike-test.js` | Resiliência a picos | Ramp 0 -> 500 VUs (30s) | N/A |
| `stress-test.js` | Breaking Point | Ramp 0 -> 500 VUs | N/A |
| `soak-test.js` | Estabilidade / Leaks | 50 VUs (30 min) | < 1000ms |

## 📈 Interpretando os Resultados

Ao final de cada execução, o k6 exibe um sumário:

- **`http_req_duration`**: Tempo total da requisição. Focar em `p(95)` (percentil 95).
- **`http_req_failed`**: Taxa de erro. Deve ser `< 1%`.
- **`iterations`**: Total de jornadas completadas.
- **`vus`**: Número de utilizadores virtuais ativos.

### Falha nos Thresholds
Se um script falhar um threshold (ex: p95 > 500ms), o k6 sairá com um código de erro (exit code não-zero), o que é ideal para integração em pipelines de CI.

## ⚠️ Avisos de Segurança
- **NUNCA** executes estes testes contra o ambiente de Produção.
- Os scripts de autenticação criam utilizadores de teste. Limpa a base de dados de staging periodicamente se necessário.
- Monitoriza os custos/recursos da infraestrutura (Railway/AWS) durante o `stress-test.js`.
