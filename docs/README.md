# Documentação do Projeto de Decisão Educacional v2 (PDC v2)

Este repositório contém a documentação técnica e de utilizador para o Projeto de Decisão Educacional v2.

## Guias de Utilizador

A secção de Guias de Utilizador destina-se a todos os tipos de utilizadores da plataforma PDC v2, detalhando como utilizar as funcionalidades de acordo com o seu papel.

- [Aluno](guia-utilizador/aluno.md)
- [Mentor](guia-utilizador/mentor.md)
- [Instituição](guia-utilizador/instituicao.md)
- [Moderador](guia-utilizador/moderador.md)

## Guias Técnicos

A secção de Guias Técnicos abrange a arquitetura do projeto, instruções de configuração e desenvolvimento, e diretrizes de deployment.

- [Arquitetura do Monorepo](guia-tecnico/arquitectura.md)
- [Configuração Local](guia-tecnico/setup-local.md)
- [Deployment](guia-tecnico/deploy.md)
- [Como Contribuir](guia-tecnico/contribuir.md)

## Documentação da API

Detalhes sobre os endpoints da API e do BFF.

- [API de Autenticação](api/auth.md)
- [API de Simulações](api/simulacoes.md)
- [API de Catálogo Público](api/catalogo.md)

## Decisões de Arquitetura (ADRs)

Registos que documentam decisões de arquitetura significativas.

- [ADR-001: Monorepo com npm workspaces](decisoes/adr-001-monorepo.md)
- [ADR-002: Hono em vez de Express](decisoes/adr-002-hono.md)
- [ADR-003: JWT em httpOnly Cookies](decisoes/adr-003-jwt-cookies.md)
- [ADR-004: Strapi como CMS](decisoes/adr-004-strapi-cms.md)
