# ADR-058: Upload profissional multipart de vídeo

- Estado: aceite
- Data: 2026-09-07
- Caixa: C
- Substitui parcialmente: ADR-051 (adiamento do multipart)

## Contexto

O limite de 50 MB pertence ao endpoint de upload rápido, não ao Cloudflare R2.
Esse fluxo é adequado para trailers, demonstrações, posts e vídeos curtos, mas
não representa aulas privadas com centenas de megabytes ou vários gigabytes.
Aumentar o limite do mesmo endpoint faria o BFF receber objetos grandes e
obrigaria o utilizador a reiniciar toda a transferência após uma falha tardia.

O domínio já possui a entidade `Video`, providers desacoplados, visibilidade e
estados de processamento. Falta materializar o transporte profissional sem
alterar os consumidores de Curso, Experiência, Post ou Simulação.

## Decisão

1. `Video` continua a ser a única entidade de vídeo referenciada pelos demais
   conteúdos. Nenhum consumidor conhece detalhes do provider.
2. `quick_upload` continua limitado a 50 MB e usa o fluxo atual.
3. `professional_upload` usa Multipart Upload direto entre browser e R2. O BFF
   cria a sessão, autoriza cada parte e conclui ou aborta a sessão; nunca recebe
   o ficheiro completo.
4. A política inicial por papel é:
   - Estudante: apenas upload rápido, até 50 MB;
   - Mentor: upload profissional até 500 MB;
   - Instituição: até 5 GB;
   - Super administrador: até 20 GB.
5. O upload profissional aceita apenas formatos de vídeo permitidos pelo
   ecossistema, usa partes de tamanho compatível com R2/S3 e limita a quantidade
   total de partes.
6. A identidade da sessão multipart fica persistida na metadata do `Video` e é
   validada em todas as operações juntamente com ownership/RBAC.
7. A primeira entrega conclui o objeto como MP4/WebM original e disponibiliza
   playback protegido por URL assinada. Os estados e campos `streamUrl`,
   `processing` e `failed` permanecem preparados para um worker posterior de
   transcodificação HLS, sem alterar o modelo ou as relações existentes.
8. YouTube, Vimeo e Loom continuam providers opcionais; nenhum criador é
   obrigado a possuir conta externa.

## Consequências

- A conclusão passa primeiro por `processing`. Se a resposta do R2 for ambígua ou a escrita final
  no Strapi falhar, uma repetição verifica a existência do objeto e finaliza o mesmo registo sem
  voltar a concluir cegamente um `uploadId` já consumido.
- Os endpoints de conclusão e aborto são idempotentes para vídeos que já chegaram a `ready`.

- Falhas numa parte não obrigam o reenvio do vídeo inteiro.
- O BFF deixa de ser gargalo de memória e largura de banda para aulas longas.
- O limite passa a ser política de produto e pode evoluir sem trocar o R2.
- O bucket precisa de CORS para `PUT` direto e de expor o cabeçalho `ETag` ao
  browser.
- HLS adaptativo continua uma evolução do processamento, não do domínio.

## Done

- Contratos multipart e política por papel em `@pdc/shared`.
- Sessões multipart criadas, autorizadas, concluídas e abortadas no BFF/R2.
- Metadata da sessão persistida no Strapi sem expor credenciais.
- Cliente envia ficheiros grandes por partes, com repetição limitada por parte.
- Testes cobrem RBAC, limites, ownership e conclusão.
- Upload rápido de 50 MB permanece compatível.
