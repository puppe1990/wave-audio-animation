# Migração Monorepo FastAPI + Next.js — Design Spec

**Data:** 2026-04-07  
**Status:** Aprovado

---

## Visão Geral

Migrar o projeto de um Next.js full-stack para um monorepo com duas camadas separadas:

- `frontend/` — Next.js (UI pura, sem lógica de processamento)
- `backend/` — FastAPI (Python) com processamento de áudio/vídeo server-side via ffmpeg real

O processamento de exportação (que hoje roda no browser via ffmpeg.wasm) passa a rodar no servidor. O frontend envia o áudio + config, o backend processa em background e o frontend faz polling para buscar o resultado.

---

## Estrutura do Monorepo

```
wave-audio-animation/
  frontend/
    src/
      app/
      components/
        editor/
          StepUpload.tsx
          StepCustomize.tsx
          StepExport.tsx        # agora faz POST + polling
          WaveformPreview.tsx
      lib/
        api-client.ts           # wrapper fetch para o backend
      types.ts
    package.json
    next.config.ts

  backend/
    app/
      main.py                   # instância FastAPI + rotas montadas
      routers/
        exports.py              # POST /exports, GET /exports/{id}/status, GET /exports/{id}/download
        auth.py                 # POST /auth/register, POST /auth/login, POST /auth/google
      services/
        audio.py                # decodificação de áudio (pydub)
        renderer.py             # geração de frames PNG (Pillow)
        exporter.py             # ffmpeg subprocess → MP4 ou GIF
      models/
        job.py                  # dataclass Job + dict in-memory
        user.py
      db.py                     # Turso/libSQL client (libsql-client)
    requirements.txt
    Dockerfile

  docker-compose.yml
  README.md
```

---

## Auth (FastAPI + JWT próprio)

NextAuth é removido completamente do Next.js.

**Endpoints:**
- `POST /auth/register` — cria usuário, retorna JWT
- `POST /auth/login` — valida credenciais (bcrypt), retorna JWT
- `POST /auth/google` — troca authorization code OAuth Google por JWT interno

**Token:** JWT assinado com secret no backend, validade configurável (ex: 7 dias).  
**Frontend:** armazena JWT em `httpOnly cookie`. Envia em todo request como `Authorization: Bearer <token>`.

---

## Fluxo de Exportação

```
1. Frontend: POST /exports  (multipart: arquivo de áudio + JSON config)
2. Backend: cria job_id (CUID), salva no dict in-memory + banco com status="processing"
3. Backend: dispara BackgroundTask(process_export, job_id, arquivo, config)
4. Backend: retorna imediatamente { job_id, status: "processing" }

5. BackgroundTask:
   a. pydub decodifica o áudio → array de amplitudes por frame
   b. Pillow renderiza cada frame PNG conforme o estilo (bars/line/mirror)
   c. ffmpeg subprocess codifica os frames → MP4 (libx264) ou GIF (palettegen)
   d. arquivo salvo em /tmp/{job_id}.mp4 (ou .gif)
   e. job atualizado: status="done", file_path=...  (in-memory + banco)

6. Frontend: polling GET /exports/{job_id}/status a cada 2s
   Resposta: { status: "processing"|"done"|"error", download_url? }

7. Quando status="done": frontend exibe botão de download
8. Frontend: GET /exports/{job_id}/download → FileResponse
```

---

## Banco de Dados (Turso/libSQL via Python)

Mantém Turso como banco. Acesso via `libsql-client` Python.

```
users
  id           TEXT PRIMARY KEY   (CUID)
  email        TEXT UNIQUE NOT NULL
  name         TEXT
  password_hash TEXT              (NULL para OAuth Google)
  created_at   INTEGER            (timestamp Unix)

exports
  id           TEXT PRIMARY KEY   (job_id, CUID)
  user_id      TEXT               (FK → users.id)
  status       TEXT               ('processing' | 'done' | 'error')
  format       TEXT               ('mp4' | 'gif')
  duration     INTEGER            (segundos)
  style        TEXT               ('bars' | 'line' | 'mirror')
  aspect_ratio TEXT               ('16:9' | '9:16' | '1:1')
  file_path    TEXT               (NULL até concluir)
  created_at   INTEGER            (timestamp Unix)
```

**Jobs in-memory:** dict Python `{ job_id: Job }` espelha o estado durante processamento para polling rápido sem hit no banco a cada 2s. O banco é a fonte de verdade persistente.

---

## O que muda no Frontend

**Remove:**
- `ffmpeg.wasm` e deps `@ffmpeg/ffmpeg`, `@ffmpeg/util`
- `NextAuth` e rotas `/api/auth`, `/api/exports`, `/api/register`
- `src/lib/audio.ts` — processamento de áudio migra para o backend
- `src/lib/exporter.ts` — exportação migra para o backend
- `src/lib/renderer.ts` — renderização de frames migra para o backend
- `src/lib/db.ts`, `src/lib/db-config.ts` — acesso ao banco migra para o backend

**Mantém (adaptado):**
- `StepUpload.tsx` — drag & drop igual, arquivo é enviado no POST /exports
- `StepCustomize.tsx` — preview local via Web Audio API + Canvas (apenas visualização, não exportação)
- `StepExport.tsx` — faz POST /exports, inicia polling, exibe progresso e link de download
- `WaveformPreview.tsx` — mantém Canvas preview client-side

**Adiciona:**
- `src/lib/api-client.ts` — funções tipadas para chamar o backend (register, login, createExport, pollStatus, download)

---

## Tratamento de Erros

| Cenário | Comportamento |
|---|---|
| Formato inválido | Validado no backend no recebimento do upload, retorna 422 |
| Arquivo > 50MB | Rejeitado no backend, retorna 413 |
| ffmpeg falha no servidor | Job status="error", frontend exibe mensagem com botão "Tentar novamente" |
| Backend offline | Frontend exibe erro de conexão no POST /exports |
| Token JWT expirado | Backend retorna 401, frontend redireciona para login |

---

## Dev Local

```bash
# backend
cd backend && uvicorn app.main:app --reload --port 8000

# frontend
cd frontend && npm run dev  # porta 3000

# ou ambos juntos
docker-compose up
```

`NEXT_PUBLIC_API_URL=http://localhost:8000` configurado no `frontend/.env.local`.

---

## Fora do Escopo (pós-MVP)

- Fila persistente (Celery/ARQ) para jobs que sobrevivem a restart do servidor
- Armazenamento de arquivos exportados em S3/R2 (hoje em /tmp)
- WebSocket para progresso em tempo real
- Planos pagos e limites de uso
