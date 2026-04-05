# Lógica de Vínculos PDC v2

## O que são

Vínculos são relações bidirecionais confirmadas entre utilizadores.
Inspirados no "Conectar" do LinkedIn, mas adaptados ao ecossistema educacional.
Não são "amizades" nem "seguidores" — são relações funcionais que desbloqueiam interações.

## Tipos de Vínculo (connectionType)

| Tipo | Quem | O que desbloqueia |
|---|---|---|
| student-student | Aluno ↔ Aluno | Mensagens, convites para colaboração em projetos |
| student-mentor | Aluno ↔ Mentor | Mensagens, feedback privado, recomendações, mentorado |
| student-institution | Aluno ↔ Instituição | Mensagens, acesso a experiências exclusivas, propostas, patrocínios |
| mentor-institution | Mentor ↔ Instituição | Mensagens, colaboração em programas |

## Estados

pending → connected (aceite) ou declined (rejeitado)

## Regras de Negócio

- Bilateral: exige aceitação do receptor
- Re-pedido após declined: só após 30 dias
- Mensagens: só entre vínculos connected
- Convites para projetos: só vínculos podem ser convidados directamente
- Mentoria: vínculo student-mentor habilita feedback privado
- Proposta institucional: cria vínculo student-institution com estado pending

## Schema (Strapi)

vinculo: { senderId, receiverId, estado, connectionType, criadoEm, atualizadoEm }

## UI/UX

- Botão "Conectar" em cards/perfis → "Pendente" após clique
- Notificação ao receptor → aceitar ou recusar
- Lista de vínculos no perfil agrupada por tipo
- Sugestões baseadas em cursos, programas, projectos em comum
