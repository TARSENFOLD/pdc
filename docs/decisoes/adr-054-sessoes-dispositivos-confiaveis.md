# ADR-054 - Sessões persistentes e dispositivos confiáveis

**Data:** 2026-07-18
**Estado:** Aceite
**Caixa:** C - a política documental, a duração implementada e a experiência de login divergiam.
**Relação:** Emenda e substitui as regras de duração, rotação e revogação do
ADR-003; o ADR-003 permanece canónico apenas para transporte em cookies.

## Contexto

O ADR-003 definia refresh tokens de 7 dias, enquanto o runtime emitia cookies
por 400 dias. Mesmo assim, a aplicação perdia a sessão ao reabrir algumas rotas
públicas porque o frontend não tentava renovar o access token expirado. Em
paralelo, P3 exigia OTP em todos os logins, incluindo browsers já verificados,
sem modelar uma credencial de dispositivo revogável.

Manter 400 dias amplia excessivamente a janela de abuso. Exigir OTP em toda
autenticação degrada a experiência sem acrescentar a mesma proteção que um
dispositivo explicitamente verificado, de alta entropia e revogável.

## Decisão

1. O access token continua válido por 15 minutos.
2. Cada sessão recebe um identificador aleatório e expira, de forma absoluta,
   90 dias após a autenticação que a criou. Rotação não prolonga esse limite.
3. O refresh token fica em cookie `httpOnly`, `Secure` em produção,
   `SameSite=Strict` e persistente por no máximo o tempo restante da sessão.
4. A rotação gera primeiro o token sucessor e faz CAS do hash corrente no Redis.
   Um registo de replay contém apenas hashes e permite, por 30 segundos, devolver
   o mesmo refresh token sucessor quando a resposta anterior se perdeu. O valor
   bruto não é persistido: ele é reconstruído deterministicamente a partir do
   token anterior assinado, preservando `sid`, `iat` e `exp` e derivando o `jti`;
   por isso, pedidos concorrentes produzem exatamente o mesmo JWT sucessor.
   Fora dessa janela, reutilização de token já rotacionado invalida a família.
5. Depois de validar OTP, o utilizador pode confiar no browser por 90 dias. A
   credencial é opaca, aleatória, `httpOnly`, `Secure` em produção e
   `SameSite=Strict`, guardada no servidor apenas por hash e vinculada ao
   utilizador. A opção é explícita e começa desmarcada para não confiar
   acidentalmente em dispositivos partilhados.
6. Um login por palavra-passe num browser confiável ainda valida email e senha,
   mas pode dispensar novo OTP. Browsers novos, credenciais expiradas ou
   revogadas continuam obrigados a concluir OTP.
7. Logout encerra a sessão corrente, mas não revoga implicitamente a confiança
   do browser. Uma ação explícita permite esquecer o dispositivo corrente.
8. Password reset e incident response devem revogar sessões e confiança. Antes
   de escrever a nova palavra-passe, o reset adquire um lock por utilizador e
   incrementa atomicamente uma época global de autenticação. Access e refresh
   tokens transportam essa época e deixam de validar imediatamente quando ela
   muda; emissão de novas sessões fica bloqueada durante o reset. A limpeza dos
   índices de sessões e dispositivos ocorre antes da escrita e repete-se depois,
   mas já não é o mecanismo que garante a revogação imediata. Índices novos são
   sorted sets por expiração para eliminar membros stale; durante a transição,
   a revogação percorre também os índices legados baseados em sets. O lock é uma
   lease renovada a cada lote; perda da lease interrompe o reset antes da escrita
   da palavra-passe, e duração/contagens são emitidas em log estruturado.
   A ordem é deliberadamente fail-safe: se a escrita no Strapi falhar depois da
   revogação, o utilizador precisa de voltar a autenticar-se, mas credenciais
   potencialmente comprometidas não são restauradas.
9. O frontend deve recuperar sessão em rotas públicas tentando uma única
   renovação quando `/auth/me` não encontrar access token válido.
10. OAuth state é vinculado ao browser por cookie transitório e consumido uma
    única vez no Redis. Falha do Redis primário permanece fail-closed.
11. Renovações são deduplicadas na aba e coordenadas entre abas com Web Locks.
    Falha operacional de refresh não pode ser convertida em logout ou credencial
    inválida.

## Consequências

- Fechar ou reabrir o browser não encerra uma sessão válida.
- O limite absoluto reduz a exposição face aos 400 dias anteriores.
- OTP deixa de ser repetido em browsers já verificados, sem transformar o
  dispositivo confiável numa credencial suficiente por si só.
- O Redis primário passa a ser dependência obrigatória de sessão, OTP,
  confiança de dispositivo e OAuth state, conforme ADR-053.
- Fluxos concorrentes de refresh são deduplicados no cliente e tolerados no
  servidor durante a janela curta de replay; reutilização tardia invalida a
  família por segurança.
- Uma tentativa de reset que falhe depois da revogação pode terminar sessões
  sem alterar a palavra-passe; o token de reset é libertado para nova tentativa.

## Alternativas rejeitadas

- **Refresh por 400 dias:** janela excessiva e divergente da documentação.
- **Refresh em `localStorage`:** expõe credenciais a XSS.
- **OTP em todos os logins:** não reconhece dispositivos já verificados e cria
  atrito recorrente sem necessidade.
- **Confiar apenas por fingerprint:** instável, invasivo e não revogável.
- **OAuth state apenas assinado:** não vincula a tentativa ao browser e não
  impede replay sem armazenamento one-time.

## Validação

- Testes provam expiração absoluta, persistência do cookie e rotação atómica.
- Dois refreshes com o mesmo token na janela de retry produzem exatamente o
  mesmo sucessor; reutilização posterior revoga a sessão.
- Browser confiável dispensa OTP somente após senha válida e vínculo servidor.
- Revogar o dispositivo força OTP no login seguinte.
- Reset de palavra-passe incrementa a época e bloqueia emissão antes de aceitar
  a nova credencial; limpeza de refresh tokens e browsers confiáveis é verificada.
- Reabrir uma rota pública recupera a sessão através de refresh quando o access
  token expirou.
- OAuth callback rejeita state válido usado noutro browser ou reutilizado.
