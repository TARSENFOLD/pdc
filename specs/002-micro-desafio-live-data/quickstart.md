# Quickstart: MicroDesafio Live Pulse e Carrossel Enriquecido

**Branch**: `002-micro-desafio-live-data`

---

## Testar o Live Pulse localmente

### Pré-requisitos
- `npm run dev` a correr (`apps/api` na porta 3001, `apps/web` na porta 5173)
- Não é necessário Redis

### Passos

1. Abrir `http://localhost:5173` em **duas abas**
2. Na **aba 1**: clicar em "Começar o Desafio" → escrever qualquer texto (ex: "quero ser médico") → clica "Continuar"
3. Na **aba 2**: verificar que o indicador `⚡ X pessoas em [área] agora` aparece abaixo do botão "Começar"
4. Aguardar 60 segundos: o indicador deve desaparecer automaticamente quando a sessão expira

### Verificar via curl (sem frontend)

```bash
# Registar actividade numa área
curl -X POST http://localhost:3001/landing/pulse \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test-session-001","area":"MEDICINA"}'

# Deve emitir landing:pulse a todos os sockets conectados
# Verificar nos logs do BFF: "landing:pulse emitido { area: 'MEDICINA', count: 1 }"
```

---

## Testar o Carrossel Enriquecido

1. Garantir que existem instituições no Strapi/catálogo com `regiao` e `tipo` preenchidos
2. Abrir `http://localhost:5173`
3. Scrollar para a secção "Instituições parceiras"
4. Verificar que cada cartão mostra (quando disponível):
   - Logótipo ou inicial do nome
   - Nome da instituição
   - Badge com `tipo` (ex: "Universidade")
   - Texto com `regiao` (ex: "Luanda")
5. Clicar num cartão de uma instituição com `slug` → deve navegar para `/instituicoes/:slug`

---

## Debugging

### Live Pulse não aparece na aba 2
- Verificar no browser console da aba 1 que não há erros no fetch `POST /landing/pulse`
- Verificar que o socket.io conecta: no console da aba 2, `Socket.IO connected? true`
- Verificar logs do BFF: deve aparecer `landing:pulse emitido`

### Socket.IO rejeitando conexão (erro 401)
- Confirmar que a mudança no `socket.service.ts` permite conexões anónimas (sem token)
- O socket.client.ts usa `withCredentials: true` — se o utilizador não tiver cookie, o middleware deve deixar passar com `socket.data.userId = null`

### Carrossel sem regiao/tipo
- Verificar nos dados reais: `GET /catalogo/instituicoes?limit=8` deve retornar `regiao` e `tipo` nos items
- Se os campos vierem `null` ou `undefined`, os elementos simplesmente não renderizam (zero-mock)
