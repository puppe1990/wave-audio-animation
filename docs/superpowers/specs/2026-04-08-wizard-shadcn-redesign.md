# Wizard Redesign com shadcn/ui

**Data:** 2026-04-08  
**Escopo:** Redesign completo do wizard de 3 steps (Upload → Personalizar → Exportar) usando shadcn/ui

---

## Objetivo

Melhorar visual e UX do wizard: componentes mais polidos, navegação mais clara, acessibilidade via primitivos Radix, design system coeso.

---

## Abordagem

**shadcn completo:** instalar shadcn/ui e substituir o máximo de UI genérica por primitivos shadcn. Seletores de wave style, paleta de cores e ratio ficam em Tailwind custom — são UI de domínio sem equivalente shadcn.

---

## Estrutura Geral

O wizard inteiro vive dentro de um **shadcn Card** com 3 seções:

```
Card
├── CardHeader — título + Badge do arquivo selecionado
├── Tabs (shadcn) — 3 TabsTrigger (Upload | Personalizar | Exportar)
│   ├── TabsContent: Upload
│   ├── TabsContent: Personalizar (2 colunas: controles | preview)
│   └── TabsContent: Exportar
└── CardFooter — botão voltar + indicador "Step X de 3"
```

Cada TabsTrigger mostra um indicador de estado:
- Pendente: número com borda zinc
- Ativo: número com borda cyan + underline cyan
- Completo: ícone de check com fundo zinc

---

## Step 1 — Upload

**Layout:** conteúdo centralizado dentro do CardContent.

**Componentes:**
- Área de drag-and-drop: Tailwind custom (mantém animação atual)
- Botão "Escolher arquivo": `Button` variant `outline`
- Mensagem de erro: mantém custom com borda red

**Comportamento:** ao selecionar arquivo, avança para Tab "Personalizar" e exibe Badge do arquivo no CardHeader.

---

## Step 2 — Personalizar

**Layout:** 2 colunas dentro do CardContent.

### Coluna esquerda (controles)

Seções separadas por `Separator`, cada uma com `Label`:

1. **Estilo da onda** — 3 botões custom Tailwind com preview de waveform (bars/line/mirror)
2. **Cor da onda** — swatches custom + input color nativo (Tailwind custom)
3. **Cor de fundo** — swatches custom (Tailwind custom)
4. **Proporção** — 3 botões custom Tailwind com ícone de aspect ratio

### Coluna direita (preview)

- Miniatura da waveform animada com as cores selecionadas
- Label "Preview" usando `Label`
- Texto descritivo: estilo + ratio ativos
- `Button` "Continuar →" (primary, cyan)

---

## Step 3 — Exportar

**Layout:** coluna única dentro do CardContent.

**Componentes:**
- Seletor MP4/GIF: 2 botões custom Tailwind (mantém padrão atual)
- `Progress` (shadcn) — barra de progresso durante exportação
- `Badge` — status do job (Processando / Concluído / Falhou)
- `Button` "Exportar" (primary) / "Baixar MP4" (primary, após completar)
- `Button` "Recomeçar" (ghost)
- Mensagem de erro: mantém custom com borda red

**Estados do export:**
- Idle: botão Exportar habilitado
- Processando: Progress visível, Badge "Processando", botão Exportar desabilitado
- Concluído: Badge "Concluído" (emerald), botão Baixar habilitado
- Falhou: Badge "Falhou" (red), mensagem de erro, botão Exportar re-habilitado

---

## Componentes shadcn a instalar

| Componente | Uso |
|---|---|
| `card` | Container do wizard |
| `tabs` | Navegação entre steps |
| `button` | Todos os botões |
| `badge` | Status do arquivo e do job |
| `progress` | Barra de progresso do export |
| `label` | Labels dos controles |
| `separator` | Divisores entre seções do Personalizar |

---

## Setup shadcn

O projeto usa **Tailwind v4** e **Next.js 16**. shadcn/ui suporta Tailwind v4 via `shadcn@canary` ou versão estável recente. O setup é feito via CLI:

```bash
cd frontend
npx shadcn@latest init
```

Selecionar: estilo `default`, base color `zinc`, CSS variables habilitadas.

Depois instalar componentes:

```bash
npx shadcn@latest add card tabs button badge progress label separator
```

**Importante:** shadcn com Tailwind v4 gera CSS em `app/globals.css` usando `@layer base` com variáveis CSS. Não adiciona `tailwind.config.js` — configuração via CSS. O tema dark é configurado via `.dark` class ou `color-scheme`.

---

## Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `frontend/src/app/app/page.tsx` | Substituir nav custom por `Tabs` + `Card` |
| `frontend/src/components/editor/StepUpload.tsx` | Trocar botão por `Button`, manter drag zone |
| `frontend/src/components/editor/StepCustomize.tsx` | Adicionar `Label`, `Separator`; layout 2 colunas |
| `frontend/src/components/editor/StepExport.tsx` | Trocar progress bar por `Progress`, status por `Badge` |
| `frontend/src/app/globals.css` | shadcn injeta variáveis CSS aqui |
| `frontend/src/components/ui/*` | shadcn gera os componentes aqui |

---

## O que NÃO muda

- Lógica de negócio (upload, polling, download) — sem alterações
- Dark theme zinc/cyan — mantido; shadcn será configurado com zinc como base
- Tipos em `src/types.ts` — sem alterações
- Backend — sem alterações
- Testes existentes — precisarão ser atualizados para os novos seletores de componente

---

## Critérios de sucesso

- Wizard visualmente coeso usando shadcn
- Tabs com estado correto (pending/active/complete) em cada step
- Badge do arquivo visível após upload
- Progress shadcn funcional durante exportação
- Dark theme preservado (zinc/cyan)
- Testes passando após refactor
