# API de IA — PDC v2

Endpoints para interação com o Tutor IA, geração de quizzes e indexação de conteúdo (RAG).

## Endpoints

### 1. Chat com Tutor IA
Interage com o tutor, que possui contexto do perfil vocacional, cursos e simulações do aluno.

- **URL:** `/ai/chat`
- **Método:** `POST`
- **Auth:** Requer JWT em cookie `access_token`.
- **Corpo:**
  ```json
  {
    "message": "Olá, como posso melhorar o meu score?",
    "stream": true
  }
  ```
- **Resposta (sem stream):** JSON com a resposta do modelo (DeepSeek ou Ollama).
- **Resposta (com stream):** SSE (Server-Sent Events) com os chunks da resposta.

### 2. Gerar Quiz
Gera automaticamente um quiz de 5 perguntas para um módulo específico.

- **URL:** `/ai/quiz`
- **Método:** `POST`
- **Auth:** Requer JWT em cookie `access_token`.
- **Corpo:**
  ```json
  {
    "cursoId": "ID_DO_CURSO",
    "moduloId": "ID_DO_MODULO"
  }
  ```
- **Resposta:** JSON array de `QuizPergunta`.

### 3. Indexar Conteúdo (RAG)
Sincroniza os cursos e experiências do Strapi com o Redis para busca contextual.

- **URL:** `/ai/indexar`
- **Método:** `POST`
- **Auth:** Requer role `super_admin`.
- **Resposta:**
  ```json
  {
    "status": "ok",
    "message": "Conteúdo indexado para RAG"
  }
  ```

## Configuração .env
- `DEEPSEEK_API_KEY`: Chave da API DeepSeek.
- `DEEPSEEK_BASE_URL`: URL base (default: https://api.deepseek.com).
- `OLLAMA_BASE_URL`: URL para fallback local (default: http://localhost:11434).
