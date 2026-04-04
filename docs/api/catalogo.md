# API de Catálogo Público

Endpoints públicos (sem autenticação) para consultar o catálogo da plataforma.

## Base URL

```
GET /catalogo/*
```

---

## Cursos

### Listar cursos

```
GET /catalogo/cursos?area=Tecnologia&nivel=Licenciatura&gratuito=true&page=1&pageSize=12
```

**Query params:** `area`, `nivel`, `gratuito` (boolean), `page`, `pageSize`

**Resposta:** `{ data: CursoPublico[], meta: CatalogoMeta }`

### Detalhe de curso

```
GET /catalogo/cursos/:slug
```

**Resposta:** `{ data: CursoPublico }`

---

## Simulações

### Listar simulações

```
GET /catalogo/simulacoes?area=Saúde&tipo=1&nivel=Secundário&page=1&pageSize=12
```

**Query params:** `area`, `tipo` (1=Vídeo, 2=Laboratório, 3=Interactivo), `nivel`, `page`, `pageSize`

**Resposta:** `{ data: SimulacaoPublica[], meta: CatalogoMeta }`

### Detalhe de simulação

```
GET /catalogo/simulacoes/:slug
```

**Resposta:** `{ data: SimulacaoPublica }`

---

## Mentores

### Listar mentores

```
GET /catalogo/mentores?area=Engenharia&page=1&pageSize=12
```

**Query params:** `area`, `page`, `pageSize`

**Resposta:** `{ data: MentorPublico[], meta: CatalogoMeta }`

### Detalhe de mentor

```
GET /catalogo/mentores/:id
```

**Resposta:** `{ data: MentorPublico }`

---

## Instituições

### Listar instituições

```
GET /catalogo/instituicoes?tipo=Universidade&regiao=Luanda&page=1&pageSize=12
```

**Query params:** `tipo`, `regiao`, `page`, `pageSize`

**Resposta:** `{ data: InstituicaoPublica[], meta: CatalogoMeta }`

### Detalhe de instituição

```
GET /catalogo/instituicoes/:slug
```

**Resposta:** `{ data: InstituicaoPublica }`

---

## Perfis Públicos

```
GET /catalogo/perfil/:id
```

**Resposta:** `{ data: PerfilPublicoBasico }`

---

## Explorar (pesquisa global)

```
GET /catalogo/explorar?q=design&area=Artes&tipo=curso&page=1&pageSize=12
```

**Query params:** `q` (texto livre), `area`, `tipo` (curso|simulacao|experiencia|mentor|instituicao), `page`, `pageSize`

**Resposta:** `{ data: ExplorarResultado[], meta: CatalogoMeta }`

---

## Tipos partilhados

Todos os tipos estão definidos em `packages/shared/src/index.ts`:

- `CursoPublico` — slug, titulo, descricao, capaUrl, area, nivel, idioma, gratuito, totalHoras, autorNome
- `SimulacaoPublica` — id, slug, titulo, descricao, capaUrl, area, tipo (1|2|3), nivel
- `MentorPublico` — id, nome, avatarUrl, bio, areaEspecialidade, disponivel
- `InstituicaoPublica` — id, slug, nome, descricao, logoUrl, tipo, regiao
- `PerfilPublicoBasico` — id, nome, avatarUrl, bio, role
- `ExplorarResultado` — tipo (enum), id, titulo, descricao, capaUrl, area
- `CatalogoMeta` — page, pageSize, total, pageCount
