# Guia do Moderador

Os moderadores são responsáveis pela segurança e qualidade do conteúdo na plataforma. Este guia descreve o fluxo de trabalho da fila de denúncias e as ferramentas disponíveis.

## Fila de Denúncias

Acede em: **Dashboard → Denúncias**

### Estados das denúncias

| Estado | Descrição |
|--------|-----------|
| `pendente` | Recebida, ainda não analisada |
| `em_analise` | Um moderador está a tratar — evita duplicação de esforço |
| `resolvida` | Acção tomada — arquivada |

### Ver uma denúncia

Cada denúncia mostra:
- **Conteúdo denunciado** — ligação directa ao item (projeto, comentário, perfil)
- **Motivo** — texto escrito pelo denunciante
- **Denunciante** — identidade visível apenas para moderadores
- **Data** — para priorizar por antiguidade

---

## Acções Disponíveis

Ao resolver uma denúncia, deves escolher uma acção e escrever uma nota interna:

### `remover`
Remove o conteúdo da plataforma. Use quando:
- O conteúdo viola claramente os Termos de Utilização
- Há nudez, discurso de ódio ou informação fraudulenta

### `avisar`
Envia um aviso formal ao utilizador. Use quando:
- É uma primeira infracção menor
- O conteúdo é inadequado mas não requer remoção imediata

### `ignorar`
Marca como resolvida sem acção. Use quando:
- A denúncia é infundada ou de má-fé
- O conteúdo não viola nenhuma política

> **Nota:** Todas as acções são registadas no **Audit Trail** com o teu ID e timestamp — é impossível agir anonimamente.

---

## Suspender um Utilizador

Em casos graves (spam sistemático, fraude, assédio):

1. Vai a **Admin → Utilizadores**
2. Encontra o utilizador pelo nome ou email
3. Clica **Suspender conta**
4. Confirma a acção — o utilizador perde acesso imediatamente

Utilizadores suspensos podem contactar o suporte para contestar a decisão.

---

## Audit Trail

O audit trail regista **todas as acções de moderação**:
- Quem fez a acção (ID do moderador)
- O que foi feito (resolução de denúncia, suspensão, alteração de role)
- Quando (timestamp UTC)
- IP de origem

Acede em: **Admin → Audit Trail** (visível apenas para `super_admin`)

Como moderador, as tuas acções ficam registadas e são revisáveis pelo `super_admin`. Este mecanismo garante responsabilidade e permite auditoria em caso de contestação.

---

## Boas Práticas

- Resolves denúncias por ordem de **antiguidade** — "first in, first out"
- Nunca tomes acções sobre conteúdo **que tu próprio publicaste**
- Em caso de dúvida, muda para `em_analise` e consulta outro moderador ou o `super_admin`
- Todas as notas internas devem ser escritas em linguagem factual, não emocional
- Reporta padrões suspeitos (ex.: utilizador que acumula denúncias) ao `super_admin`
