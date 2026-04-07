# Wave Audio Animation — Design Spec

**Data:** 2026-04-07  
**Status:** Aprovado

---

## Visão Geral

MicroSaaS brasileiro para geração de vídeos com animações de onda de áudio sincronizadas. Voltado para podcasters e criadores de conteúdo que querem publicar cortes nas redes sociais. O usuário faz upload do áudio, personaliza o estilo visual e exporta um vídeo pronto para postar.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16.2 + TypeScript |
| Auth | NextAuth.js (Google OAuth + email/senha) |
| Banco de dados | Turso (libSQL) + Drizzle ORM |
| Processamento de áudio | Web Audio API (client-side) |
| Rendering | Canvas 2D (client-side) |
| Exportação | ffmpeg.wasm — `@ffmpeg/ffmpeg` + `@ffmpeg/util` |
| Deploy | Vercel |

Todo o pipeline de áudio e vídeo roda no browser do usuário. O servidor Next.js serve apenas a aplicação e as rotas de auth/API.

---

## Funcionalidades do MVP

1. Upload de arquivo de áudio (MP3, WAV, M4A, OGG, até 50MB)
2. Escolha de estilo visual da onda (Barras, Linha, Espelho)
3. Escolha de cor primária e cor de fundo
4. Escolha de proporção do vídeo (16:9, 9:16, 1:1)
5. Preview animado sincronizado com o áudio
6. Exportação em MP4 ou GIF
7. Autenticação (Google OAuth + email/senha)
8. Registro de exportações por usuário (dados coletados, sem página de histórico no MVP)

**Fora do MVP:** planos pagos, limites de uso, processamento no servidor, página de histórico.

---

## Fluxo Principal

```
Upload áudio
  → Web Audio API decodifica e extrai array de amplitudes por frame
  → Canvas 2D renderiza preview em tempo real
  → Usuário ajusta estilo / cor / proporção
  → Clica em exportar
  → ffmpeg.wasm carregado (lazy load ~30MB, apenas na primeira exportação)
  → Frames renderizados offline no Canvas
  → ffmpeg.wasm codifica frames → MP4 (libx264) ou GIF (palettegen)
  → Download gerado no browser
  → POST /api/exports — salva registro no Turso (userId, formato, duração, estilo, proporção)
```

---

## UI: Wizard 3 Passos

A tela `/app` é um wizard linear:

**Passo 1 — Upload**
- Área de drag & drop para o arquivo de áudio
- Validação de formato e tamanho no client
- Barra de progresso de leitura/decodificação

**Passo 2 — Personalização**
- Seletor de estilo: Barras | Linha | Espelho
- Color picker para cor primária e cor de fundo
- Seletor de proporção: 16:9 | 9:16 | 1:1
- Canvas de preview ao vivo com botão Play/Pause

**Passo 3 — Exportação**
- Seletor de formato: MP4 | GIF
- Botão "Exportar" — aciona o ffmpeg.wasm
- Barra de progresso do encoding
- Botão de download ao concluir

---

## Estrutura de Arquivos

```
src/
  app/
    page.tsx                     # Landing page
    app/
      page.tsx                   # Editor (wizard) — rota protegida
      layout.tsx
    api/
      auth/[...nextauth]/        # NextAuth routes
      exports/
        route.ts                 # POST — salva registro de exportação no Turso
  components/
    editor/
      StepUpload.tsx             # Passo 1: drag & drop
      StepCustomize.tsx          # Passo 2: estilo, cor, proporção
      StepExport.tsx             # Passo 3: formato + exportar + download
      WaveformPreview.tsx        # Canvas de preview (usado no passo 2)
    ui/                          # Componentes genéricos (Button, Input, etc.)
  lib/
    audio.ts                     # Web Audio API — decodifica e extrai amplitude data
    renderer.ts                  # Canvas 2D — desenha cada frame da animação
    exporter.ts                  # ffmpeg.wasm — codifica frames em MP4 ou GIF
    db.ts                        # Drizzle + Turso client
  db/
    schema.ts                    # Schema das tabelas
```

---

## Schema do Banco (Drizzle + Turso)

```ts
// users
id: text (primary key, CUID)
email: text (unique, not null)
name: text
passwordHash: text (nullable — ausente para OAuth)
createdAt: integer (timestamp)

// exports
id: text (primary key, CUID)
userId: text (foreign key → users.id)
format: text ('mp4' | 'gif')
duration: integer (segundos)
style: text ('bars' | 'line' | 'mirror')
aspectRatio: text ('16:9' | '9:16' | '1:1')
createdAt: integer (timestamp)
```

---

## Auth (NextAuth.js)

- **Providers:** GoogleProvider + CredentialsProvider (email + bcrypt)
- **Sessão:** JWT (sem adapter de banco no MVP)
- **Proteção de rota:** middleware Next.js redireciona `/app` para login se não autenticado

---

## Estilos de Onda

| Estilo | Descrição |
|---|---|
| Barras (bars) | Barras verticais que crescem de baixo para cima proporcionalmente à amplitude |
| Linha (line) | Linha contínua que oscila verticalmente ao longo do frame |
| Espelho (mirror) | Barras simétricas crescendo para cima e para baixo a partir do centro |

Cada estilo é implementado como uma função em `renderer.ts` com a assinatura `(ctx, amplitudes, frame, options) => void`.

---

## Exportação (ffmpeg.wasm)

- **ffmpeg.wasm** carregado via lazy import somente quando o usuário clica em exportar
- **MP4:** frames PNG → `libx264`, `yuv420p`, `crf 23`, 30fps
- **GIF:** frames PNG → `palettegen` + `paletteuse`, 15fps
- **Frames:** renderizados no Canvas offscreen (`OffscreenCanvas`) em loop síncrono, capturados como PNG via `toBlob`

---

## Tratamento de Erros

| Cenário | Comportamento |
|---|---|
| Formato de arquivo inválido | Mensagem no Passo 1, não avança |
| Arquivo acima de 50MB | Mensagem no Passo 1, não avança |
| ffmpeg.wasm falha no encoding | Mensagem no Passo 3 com botão "Tentar novamente" |
| Turso offline ao salvar log | Export continua, log falha silenciosamente (sem bloquear o usuário) |

---

## Preparação para Monetização (pós-MVP)

A tabela `exports` já coleta os dados necessários para implementar limites por plano futuramente:
- Contagem de exportações por usuário/mês
- Duração total de áudio exportado
- Formatos utilizados

Nenhuma lógica de plano/cobrança está incluída no MVP.
