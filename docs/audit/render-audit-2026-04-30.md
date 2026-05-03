# Auditoria de Renderização — Shell e Páginas

Data: 2026-04-30
Base URL: http://localhost:5173

Resumo: 69 rotas auditadas · OK 69 · Erro sistémico 0 · 404 0 · Blank 0 · Crash 0
> Nota: "OK" = página renderizou HTML com sucesso. Erros HTTP na coluna "Erro" (401, 502, 500) indicam falhas de API/auth em recursos secundários — não impedem a renderização da página.

| Status | Role | Rota | Heading | Botões | Links | Cards | Itens catálogo | Erro |
|---|---|---|---|---:|---:|---:|---:|---|
 ok | public | / | Try a profession before you choose. | 5 | 47 | 73 | 0 | Failed to load resource: the server responded with a status of 401 (Unauthorized) 
 ok | public | /login | Login. | 3 | 2 | 4 | 0 | Failed to load resource: the server responded with a status of 401 (Unauthorized) 
 ok | public | /forgot-password | Recuperar acesso | 2 | 1 | 2 | 0 | Failed to load resource: the server responded with a status of 401 (Unauthorized) 
 ok | public | /criar-conta | How do you want to use PDC? | 1 | 4 | 10 | 0 | Failed to load resource: the server responded with a status of 401 (Unauthorized) 
 ok | public | /criar-conta/estudante | O teu futuro começa com evidência | 2 | 3 | 7 | 0 | Failed to load resource: the server responded with a status of 401 (Unauthorized) 
 ok | public | /criar-conta/mentor | Inspira a próxima geração | 2 | 3 | 8 | 0 | Failed to load resource: the server responded with a status of 401 (Unauthorized) 
 ok | public | /criar-conta/instituicao | Conecta-te com quem importa | 2 | 3 | 10 | 0 | Failed to load resource: the server responded with a status of 401 (Unauthorized) 
 ok | public | /explorar | Explorar | 22 | 15 | 52 | 0 | Failed to load resource: the server responded with a status of 401 (Unauthorized) 
 ok | public | /cursos | Cursos | 8 | 12 | 56 | 12 | Failed to load resource: the server responded with a status of 401 (Unauthorized) 
 ok | public | /simulacoes | Simulações | 6 | 12 | 42 | 12 | Failed to load resource: the server responded with a status of 401 (Unauthorized) 
 ok | public | /mentores | Mentores | 17 | 12 | 53 | 12 | Failed to load resource: the server responded with a status of 401 (Unauthorized) 
 ok | public | /programas | Programas de Acesso | 6 | 0 | 6 | 0 | Failed to load resource: the server responded with a status of 401 (Unauthorized) 
 ok | public | /instituicoes | Instituições Parceiras | 6 | 12 | 42 | 12 | Failed to load resource: the server responded with a status of 401 (Unauthorized) 
 ok | public | /experiencias | Viver a Realidade. | 2 | 2 | 5 | 0 | Failed to load resource: the server responded with a status of 401 (Unauthorized) 
 ok | public | /termos | Termos de Serviço | 1 | 0 | 0 | 0 | Failed to load resource: the server responded with a status of 401 (Unauthorized) 
 ok | public | /privacidade | Política de Privacidade | 1 | 0 | 0 | 0 | Failed to load resource: the server responded with a status of 401 (Unauthorized) 
 ok | aluno | /app/home | Hello, Aluno | 10 | 16 | 8 | 0 | - 
 ok | aluno | /app/dashboard/estudante | Your Dashboard, Aluno. | 13 | 21 | 15 | 0 | - 
 ok | aluno | /app/feed | A Comunidade de Mérito | 11 | 12 | 9 | 0 | Failed to load resource: the server responded with a status of 502 (Bad Gateway) 
 ok | aluno | /app/cursos | Módulos de Aptidão. | 16 | 12 | 13 | 0 | Failed to load resource: the server responded with a status of 502 (Bad Gateway) 
 ok | aluno | /app/simulacoes | Vitrinas Vivas. | 15 | 12 | 12 | 0 | Failed to load resource: the server responded with a status of 502 (Bad Gateway) 
 ok | aluno | /app/experiencias | Viver a Realidade. | 11 | 14 | 9 | 0 | Failed to load resource: the server responded with a status of 502 (Bad Gateway) 
 ok | aluno | /app/programas | Programas de Acesso | 15 | 12 | 10 | 0 | Failed to load resource: the server responded with a status of 502 (Bad Gateway) 
 ok | aluno | /app/explorar | Explorar | 31 | 27 | 56 | 0 | - 
 ok | aluno | /app/perfil | Aluno Teste | 14 | 13 | 17 | 0 | - 
 ok | aluno | /app/configuracoes | Configurações | 17 | 12 | 11 | 0 | - 
 ok | aluno | /app/mentorias | Mentorias | 11 | 12 | 5 | 0 | Failed to load resource: the server responded with a status of 404 (Not Found) 
 ok | aluno | /app/conquistas | As tuas Conquistas. | 10 | 12 | 6 | 0 | Failed to load resource: the server responded with a status of 502 (Bad Gateway) 
 ok | aluno | /app/meus-cursos | Os Meus Cursos | 10 | 13 | 5 | 0 | Failed to load resource: the server responded with a status of 502 (Bad Gateway) 
 ok | aluno | /app/guardados | A Minha Selecção | 11 | 13 | 8 | 0 | Failed to load resource: the server responded with a status of 500 (Internal Server Error) 
 ok | aluno | /app/certificados | Os Meus Certificados | 12 | 13 | 10 | 0 | - 
 ok | aluno | /app/ranking | Elite do Mérito | 10 | 12 | 5 | 0 | - 
 ok | aluno | /app/reputacao | - | 10 | 12 | 5 | 0 | Failed to load resource: the server responded with a status of 404 (Not Found) 
 ok | aluno | /app/vinculos | A Minha Rede | 13 | 13 | 10 | 0 | - 
 ok | aluno | /app/mensagens | As Minhas Conversas | 10 | 13 | 7 | 0 | Failed to load resource: the server responded with a status of 502 (Bad Gateway) 
 ok | aluno | /app/perfil-vocacional | REPUTAÇÃO AINDA NÃO DISPONÍVEL | 11 | 13 | 6 | 0 | Failed to load resource: the server responded with a status of 502 (Bad Gateway) / Failed to load resource: the server responded with a status of 404 (Not Found) 
 ok | mentor | /app/dashboard/mentor | Gestão de Talentos. | 9 | 13 | 17 | 0 | Failed to load resource: the server responded with a status of 502 (Bad Gateway) 
 ok | mentor | /app/mentor/cursos | Os Meus Cursos | 8 | 8 | 7 | 0 | Failed to load resource: the server responded with a status of 502 (Bad Gateway) 
 ok | mentor | /app/mentor/cursos/criar | Sovereign Course Builder | 16 | 8 | 21 | 0 | - 
 ok | mentor | /app/mentor/simulacoes | As Minhas Simulações | 8 | 8 | 7 | 0 | Failed to load resource: the server responded with a status of 502 (Bad Gateway) 
 ok | mentor | /app/mentor/simulacoes/criar | Novo Laboratório de Simulação | 14 | 8 | 16 | 0 | - 
 ok | mentor | /app/mentor/upload | Upload de Conteúdo | 8 | 6 | 8 | 0 | - 
 ok | mentor | /app/mentor/estudantes/inscritos | Estudantes Inscritos | 8 | 6 | 5 | 0 | Failed to load resource: the server responded with a status of 404 (Not Found) 
 ok | mentor | /app/mentor/mentorados | Os Meus Mentorados | 8 | 6 | 5 | 0 | Failed to load resource: the server responded with a status of 404 (Not Found) 
 ok | mentor | /app/mentor/analytics | Métricas de Mentor | 8 | 6 | 8 | 0 | Failed to load resource: the server responded with a status of 404 (Not Found) 
 ok | instituicao | /app/dashboard/instituicao | Instituicao Teste. | 9 | 14 | 16 | 0 | Failed to load resource: the server responded with a status of 502 (Bad Gateway) 
 ok | instituicao | /app/instituicao/experiencias | - | 8 | 6 | 4 | 0 | Failed to load resource: the server responded with a status of 502 (Bad Gateway) 
 ok | instituicao | /app/instituicao/criar-experiencia | Gerador de Experiência Premium | 17 | 8 | 18 | 0 | - 
 ok | instituicao | /app/instituicao/programas | Os Meus Programas. | 13 | 6 | 12 | 0 | Failed to load resource: the server responded with a status of 502 (Bad Gateway) 
 ok | instituicao | /app/instituicao/criar-programa | Arquitetura de Programa de Acesso | 14 | 8 | 18 | 0 | - 
 ok | instituicao | /app/instituicao/estudantes-vinculados | Estudantes Vinculados | 8 | 6 | 5 | 0 | Failed to load resource: the server responded with a status of 502 (Bad Gateway) 
 ok | instituicao | /app/instituicao/propostas | - | 8 | 6 | 4 | 0 | Failed to load resource: the server responded with a status of 404 (Not Found) / Failed to load resource: the server responded with a status of 502 (Bad Gateway) 
 ok | instituicao | /app/instituicao/relatorios | Oráculo de Retenção | 9 | 6 | 15 | 0 | Failed to load resource: the server responded with a status of 502 (Bad Gateway) 
 ok | instituicao | /app/instituicao/branding | Branding e Identidade | 9 | 6 | 12 | 0 | - 
 ok | moderador | /app/dashboard/moderador | Controlo de Qualidade. | 8 | 11 | 12 | 0 | Failed to load resource: the server responded with a status of 502 (Bad Gateway) 
 ok | moderador | /app/moderacao/denuncias | Moderação de Denúncias | 8 | 6 | 7 | 0 | Failed to load resource: the server responded with a status of 502 (Bad Gateway) 
 ok | moderador | /app/moderacao/aprovacoes | Fila de Aprovacao | 11 | 6 | 4 | 0 | Failed to load resource: the server responded with a status of 500 (Internal Server Error) 
 ok | moderador | /app/moderador/utilizadores | Gestao de Utilizadores | 8 | 6 | 5 | 0 | Failed to load resource: the server responded with a status of 403 (Forbidden) 
 ok | comite_cientifico | /app/dashboard/comite | Comité Científico | 8 | 8 | 7 | 0 | Failed to load resource: the server responded with a status of 500 (Internal Server Error) 
 ok | comite_cientifico | /app/comite/validacao | Validação Científica | 10 | 6 | 7 | 0 | Failed to load resource: the server responded with a status of 500 (Internal Server Error) 
 ok | super_admin | /app/dashboard/admin | Controlo Total. | 8 | 12 | 17 | 0 | Failed to load resource: the server responded with a status of 502 (Bad Gateway) 
 ok | super_admin | /app/admin/utilizadores | Gestão de Utilizadores | 8 | 6 | 5 | 0 | Failed to load resource: the server responded with a status of 502 (Bad Gateway) 
 ok | super_admin | /app/admin/stats | Estatísticas Gerais | 8 | 6 | 8 | 0 | Failed to load resource: the server responded with a status of 502 (Bad Gateway) 
 ok | super_admin | /app/admin/audit | Registos de Auditoria | 8 | 6 | 5 | 0 | - 
 ok | super_admin | /app/admin/lti | Plataformas LTI 1.3 | 10 | 6 | 8 | 0 | Failed to load resource: the server responded with a status of 404 (Not Found) 
 ok | super_admin | /app/admin/feed-weights | Pesos do Feed | 10 | 6 | 8 | 0 | - 
 ok | super_admin | /app/admin/telemetria | Telemetria | 10 | 6 | 23 | 0 | - 
 ok | super_admin | /app/admin/relatorios | Relatórios | 8 | 6 | 7 | 0 | Failed to load resource: the server responded with a status of 502 (Bad Gateway) 
 ok | super_admin | /app/admin/feature-flags | Feature Flags | 16 | 6 | 20 | 0 | - 
