# Wave Audio Animation — Guia para Agentes

## Visão Geral do Projeto

Monorepo com **frontend Next.js** e **backend FastAPI** que gera vídeos de animação de waveform a partir de arquivos de áudio.

Fluxo principal: Upload de áudio → Personalização da waveform → Exportação (MP4 ou GIF).

---

## Estrutura do Monorepo

```
wave-audio-animation/
├── frontend/          # Next.js app
│   └── src/
│       ├── app/       # App Router (Next.js)
│       │   ├── app/   # Rota autenticada /app (editor)
│       │   ├── login/
│       │   └── register/
│       ├── components/
│       │   └── editor/  # StepUpload, StepCustomize, StepExport, AppHeaderActions
│       ├── lib/         # utilitários client-side
│       └── types.ts     # tipos compartilhados do frontend
├── backend/           # FastAPI
│   └── app/
│       ├── main.py
│       ├── auth/      # autenticação (router, service, dependencies)
│       ├── db/        # conexão com banco de dados
│       ├── exports/   # geração de vídeo/gif (router)
│       ├── jobs/      # jobs assíncronos de exportação
│       ├── services/  # lógica de negócio
│       ├── uploads/   # recebimento de arquivos
│       └── outputs/   # arquivos exportados
├── docs/
├── dev.sh
├── docker-compose.yml
└── package.json       # scripts raiz do monorepo
```

---

## Frontend

### Stack
- **Next.js** com App Router (`/app` router, não Pages Router)
- **TypeScript** estrito
- **Tailwind CSS** (dark theme; paleta zinc + cyan)
- Sem biblioteca de componentes externa — UI feita à mão

### Convenções
- Componentes em `src/components/`, com testes `.test.tsx` ao lado do arquivo
- Tipos globais em `src/types.ts` — use-os; não duplique
- Rotas protegidas ficam sob `src/app/app/`
- Auth é tratada no layout `src/app/app/layout.tsx` — toda rota sob `/app` exige login
- `AudioData` em `types.ts` está **deprecated** — processamento de áudio é server-side via FastAPI

### Tipos principais
```ts
WaveStyle   = "bars" | "line" | "mirror"
AspectRatio = "16:9" | "9:16" | "1:1"
ExportFormat = "mp4" | "gif"
EditorConfig = { style, primaryColor, backgroundColor, aspectRatio }
```

### Fluxo do Editor (3 passos)
1. **StepUpload** — recebe o arquivo de áudio
2. **StepCustomize** — configura estilo, cores, aspect ratio; preview da waveform
3. **StepExport** — envia para o backend e faz download do resultado

### Next.js — LEIA ANTES DE ESCREVER CÓDIGO
Esta versão pode ter breaking changes em relação ao que você conhece.
Antes de escrever qualquer código Next.js, leia o guia em:
```
node_modules/next/dist/docs/
```
Siga avisos de deprecação.

---

## Backend

### Stack
- **FastAPI** + **Python 3.11+**
- **SQLite** (via `app/db/`) para usuários e jobs
- **uvicorn** como servidor ASGI
- Processamento de áudio server-side (não no browser)

### Rotas principais
- `POST /auth/register` — cadastro
- `POST /auth/token` — login (retorna JWT)
- `POST /exports/` — inicia exportação (requer auth)
- `GET /exports/{id}` — status e download
- `GET /health` — healthcheck

### Convenções
- Rotas em `router.py` por domínio (auth, exports)
- Lógica de negócio em `service.py` / `services/`
- Dependências de auth em `auth/dependencies.py` — use `Depends()` para proteger rotas
- Diretórios `uploads/` e `outputs/` são criados automaticamente no lifespan

---

## Desenvolvimento

```bash
# Tudo junto (raiz do monorepo)
npm run dev

# Separado
npm run dev:front   # http://localhost:3000
npm run dev:back    # http://localhost:8000
```

---

## Testes

- Frontend: Jest + Testing Library — arquivos `.test.tsx` ao lado do componente
- Backend: pytest em `backend/tests/`

---

## Regras para Agentes

1. **Não invente APIs do Next.js** — leia a documentação local antes de usar qualquer hook, função ou convenção de rota
2. **Não use `AudioData` no frontend** — processamento é server-side
3. **Sempre proteja rotas do backend** que exigem login com `Depends(get_current_user)`
4. **Não altere `types.ts`** sem verificar impacto em todos os componentes que o importam
5. **Mantenha o dark theme** — paleta zinc/cyan, sem cores claras no editor
6. **Não crie arquivos desnecessários** — prefira editar os existentes
7. **Testes ficam ao lado do arquivo** que testam (mesmo diretório)
