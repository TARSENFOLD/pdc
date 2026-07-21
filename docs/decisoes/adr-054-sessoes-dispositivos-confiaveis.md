# ADR-054 - Sessões persistentes e dispositivos confiáveis

**Data:** 2026-07-18
**Estado:** Aceite
**Caixa:** C - a política documental, a duração implementada e a experiência de login divergiam.

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
4. A rotação do refresh token é atómica no Redis. Reutilização ou concorrência
   com um token já rotacionado invalida toda a família da sessão.
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
8. Password reset e incident response devem poder revogar sessões e confiança;
   sessões e dispositivos são indexados por utilizador no Redis e revogados em
   lotes atómicos limitados. O reset reivindica o link atomicamente, revoga ambos
   antes da alteração da palavra-passe, repete a revogação depois da escrita e
   só então elimina o link.
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
- Fluxos concorrentes de refresh devem ser deduplicados no cliente; reutilização
  invalida deliberadamente a família por segurança.

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
- Dois refreshes com o mesmo token não podem produzir duas sessões válidas.
- Browser confiável dispensa OTP somente após senha válida e vínculo servidor.
- Revogar o dispositivo força OTP no login seguinte.
- Reset de palavra-passe revoga todos os refresh tokens e browsers confiáveis
  antes de aceitar a nova credencial.
- Reabrir uma rota pública recupera a sessão através de refresh quando o access
  token expirou.
- OAuth callback rejeita state válido usado noutro browser ou reutilizado.
