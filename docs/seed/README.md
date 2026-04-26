# Seed Narrativo — Por Dentro do Curso (v2)

O Seed Narrativo (`W1-T5`) é a fonte de verdade principal para preencher o ambiente de desenvolvimento com perfis realistas e coesos, permitindo que a UI, a AI (Tina) e o Algoritmo Vocacional reajam de forma previsível e auditável.

## ⚠️ Atenção (Constitution Guard)
De acordo com as leis do projecto, o seed está **bloqueado em ambientes de Produção**. Ele destina-se apenas a ambientes de Development ou Preview (Staging).

## Como Executar

Para correr o Seed Narrativo:

```bash
# Na raiz do monorepo
npm run seed:narrativo -w infra/strapi
```

Ou, entrando no workspace Strapi:
```bash
cd infra/strapi
npm run seed:narrativo
```

## Contas de Teste (Accounts)

O Seed gera 130 contas com a mesma password de conveniência de acesso.

**Password de Teste:** `PdcSeed2026!`

- **Mentores (30):**
  - Emails: `mentor1@pdc.ao` até `mentor30@pdc.ao`
  - Os mentores 1 a 6 são classificados como Elite Globais (Reputação 98%).

- **Estudantes (100):**
  - Emails: `estudante1@pdc.ao` até `estudante100@pdc.ao`
  - Eles representam padrões arquitectónicos pré-definidos herdados das fixtures de telemetria (`O Cirurgião`, `O Hacker Hesitante`, `O Gestor Impulsivo`, etc.).

## Base de Dados Injectada
- **15 Áreas Canónicas** (conforme spec:IMPORTANTE/04)
- **10 Instituições** (Incluindo UAN, ISPTEC e UCAN)
- **100 Padrões Comportamentais (Behavior Patterns)** calculados matematicamente para corresponderem ao perfil mental do seu arquétipo.
