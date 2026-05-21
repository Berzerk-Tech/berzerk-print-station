# RESUME — sessões 2026-05-19 (Windows) + 2026-05-20 (Linux)

Agente que abrir essa sessão amanhã: leia esse documento antes de fazer qualquer coisa. O dono está gostando, estamos no caminho. Não comece a refatorar nem renomear nada por conta própria.

---

## Sessão 2026-05-20 — migração do dev pra Linux

O Leonardo migrou o ambiente de dev pra um laptop **Arch Linux + Hyprland** (a estação Windows continua sendo a máquina de produção da fábrica). Tudo cross-platform por design — Tauri 2 + React + Rust — e a migração saiu sem dor.

### Entregue hoje

**Setup de dev no Linux:**
- Instalado `webkit2gtk-4.1` via pacman (única dep faltante; o resto — `gtk3`, `librsvg`, `libsoup3`, `base-devel`, `bun`, `cargo`, `rustc` — já estava).
- Usuário adicionado ao grupo `uucp` pra acessar `/dev/ttyUSB*` / `/dev/ttyACM*` sem `sudo` (precisa relogin pra valer).
- `.env` recriado no novo PC (mesmas chaves do Windows — `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` do projeto industrial).
- `bun install` rodou em 5.8s; primeira `tauri dev` build levou 3m29s (~430 crates) e abriu janela limpa.

**Mock do iTAG Monitor** (`tools/itag-mock/`):
- Servidor Bun em ~80 linhas que imita o protocolo do iTAG Monitor (Windows-only) em `http://127.0.0.1:9093`.
- 2 endpoints: `GET /ItagRFIDMonitor/RetornaTag` e `GET /ItagRFIDMonitor/CarregaComando?comando=iniciar|parar|limparLeitura`.
- Estado: `scanning: bool` + `Set<string>` de EPCs. Quando "iniciar", popula buffer com EPCs seed (configuráveis via `ITAG_MOCK_EPCS`).
- Rodar em paralelo com `tauri dev`. Settings → Leitor RFID → "Testar conexão" fica verde.
- README em `tools/itag-mock/README.md`.

**CI matrix Windows + Linux** (`.github/workflows/release.yml`):
- `strategy.matrix` com `windows-latest` (bundles `nsis,updater` → `.exe`) e `ubuntu-22.04` (bundles `appimage,updater` → `.AppImage`).
- Step `Install Linux deps` condicional (`libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `librsvg2-dev`, `libsoup-3.0-dev`, `libayatana-appindicator3-dev`, `build-essential`, `file`).
- Mesma chave Ed25519 + mesma senha vazia funcionam pros dois OS — assinatura idêntica.
- `latest.json` é mergeado automaticamente pelo `tauri-action` quando ambos jobs publicam na mesma tag.
- `ubuntu-22.04` ao invés de `24.04` porque a 24.04 derrubou `libsoup2` e quebra `wry`/`webkit2gtk-4.1` em runners GitHub-hosted.
- AppImage **não é release de produção** ainda (chão de fábrica é Windows). Linux serve pra dev/teste do agente e fica disponível pro dia em que precisar.

### Bug diagnosticado (NÃO fixado ainda — pendência crítica #1)

Tela de Produção demora muito pra carregar. **Não é Linux nem proxy** — é a edge function `shopify-analytics` sendo chamada eager pra cada lote no load inicial, vide pendência #1 abaixo.

### Correção no documento

A RESUME.md anterior dizia "BatchBrowser usa rfid-proxy.exe HTTPS local". **Isso era verdade quando a Produção rodava no industrial.lovable.dev (webapp browser, mixed-content)**, mas no Berzerk RFID Tauri o caminho é direto pelo Supabase — não tem proxy em nenhum lugar. Texto corrigido nas seções abaixo.

---

## Estado atual

**Produto:** Berzerk RFID — app desktop Tauri 2 instalado nos PCs do chão de fábrica da Berzerk. Estação industrial completa para etiquetagem de produção e expedição via RFID.

**Última versão publicada:** v0.1.7 (em build/publicada no final da sessão).

**Repo:** https://github.com/Berzerk-Tech/berzerk-rfid (público, redirects de `berzerk-print-station` e `berzerk-loom` continuam ativos).

**Pasta local:** `C:\Users\Leonardo Flores\Documents\Projetos\berzerk-print-station\` (não renomeada de propósito — evitar quebrar paths).

---

## O que foi entregue hoje

### Auth
- Google OAuth restrito a `@berzerk.com.br` via **loopback HTTP em 127.0.0.1:54321** (Chrome 120+ bloqueia custom schemes em redirects, esse foi o substituto). `flowType: 'pkce'` no Supabase obrigatório.
- OAuth Client próprio no Google Cloud projeto `berzerk-shared`.
- Provider Google nativo configurado no Supabase Industrial via "Your own credentials" no Lovable Cloud (não o broker `lovable.dev/cloud-auth-js`).

### Auto-update via GitHub Releases
- Chave privada Ed25519: `~/.berzerk-print-station-keys/tauri-updater.key` (BACKUP ABSOLUTAMENTE NECESSÁRIO).
- Pública embutida em `src-tauri/tauri.conf.json`.
- Workflow `.github/workflows/release.yml` builda em `windows-latest`, assina, publica com `latest.json`.
- **Causa raiz do signing fail** (vivia gerando só `.exe` sem `.sig`): faltava `bundle.createUpdaterArtifacts: true` em `tauri.conf.json` + `TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ""` literal no workflow (Tauri CLI sempre gera chave encriptada mesmo com `--password ""`).

### Cliente iTAG nativo Rust (matar proxy HTTPS)
- `src-tauri/src/itag_client.rs` com comandos: `itag_ping`, `itag_send_command`, `itag_poll_tags`, `itag_reinventory`.
- `src/lib/rfid.ts` wrapper TS via `invoke()`.
- Settings → Leitor RFID tem botão **"Testar conexão"** que faz ping + mostra status colorido.
- **Ainda NÃO está plugado na Expedição** (backend mockado). **Produção não usa o leitor local** — a impressão é via edge function `itag-print-rfid` (server-side, fala com o iTAG cloud). O cliente nativo só vai morar na Expedição.
- O proxy `rfid-proxy.exe` continua existindo no posvenda/industrial (webapps em browser que precisam dele por mixed-content). **Berzerk RFID Tauri NÃO usa o proxy** em nenhum caminho — nem na Produção nem na Expedição.

### USB autodetect
- `src-tauri/src/usb_devices.rs` via crate `serialport` — lista COM ports + USB (CDC-ACM com VID:PID + product + serial).
- `src/lib/usb.ts` wrapper.
- Settings → Impressora térmica mostra dispositivos detectados como cards selecionáveis. Sem mais input manual de COM.
- **NÃO** implementa impressão real ainda — só detecção/seleção do device.

### UI — identidade Berzerk
- Login: hero gigante BERZERK Anton + tagline `─ RFID ─` + botão Google + grid técnica de fundo (`AmbientBackground` variant centered).
- HomeMenu: hero greeting com primeiro nome do operador + StatusStrip com chips de dispositivos + cards módulos ricos com ícone 64px colorido + status pill.
- Settings: section headers `― KICKER ―` + cards de configuração com forms inline + UpdateChecker.
- Expedição: kiosk com 4-step indicator + estado dominante (`PRONTO` / `LENDO` / `IMPRIMINDO` / `EMBALANDO` / `ENVIADO`) em Anton 96px + cor.

### Expedição preview (mock)
- State machine completa com prefetch: durante `packing` (5s timer visual), aceita bipada do próximo EPC e dispara consulta em background. Quando packing termina, vai DIRETO pro próximo pedido (zero latência).
- Dedup por `processedEpcs` Set — ignora releitura do mesmo EPC (mesa relê o pedido que ainda tá em cima dela).
- Botão vermelho "Próximo pedido" adianta o timer (botão físico da mesa não é capturável pelo Windows, então é só visual).

### Renames
- Cargo package: `berzerk-print-station` → `berzerk-rfid`
- Cargo lib: `berzerk_print_station_lib` → `berzerk_rfid_lib`
- Repo: 2 renames (`berzerk-print-station` → `berzerk-loom` → `berzerk-rfid`)
- Module: `Etiquetagem` → `Produção` (pareia com Expedição — duo industrial clássico)

---

## Pendências críticas (próxima sessão)

### 1. Otimizar carregamento inicial da Produção (BatchBrowser)
- **Sintoma:** abrir a tela de Produção demora bastante (6-25s típico, pior em dev por causa do `<React.StrictMode>` que double-invoca o `useEffect`).
- **Causa raiz:** `BatchBrowser.load()` chama `resolveAllWithConcurrency(visible, 4)` que pra cada um dos até 50 lotes roda `getEansForBatch` (em `src/services/ean13Lookup.ts:259`). Esse, por sua vez, quando o `unified_products.overrides.barcodes` não cobre todos os tamanhos do lote, faz fallback pra edge function `shopify-analytics` (`loadShopifyProduct` em `ean13Lookup.ts:178`). Cada call externa do Shopify via edge fn custa ~500ms-2s, multiplicado por N lotes únicos com concorrência 4 → gargalo.
- **NÃO é o rfid-proxy.** O BatchBrowser não chama o proxy em lugar nenhum — caminho é 100% Supabase (postgres + edge functions). Era assim quando rodava no industrial.lovable.dev (webapp), mas em Tauri nativo já é direto.
- **Direções de fix (escolher):**
  - **B)** Pular Shopify fallback no load — só usar `unified_products` locais; lotes faltando viram "Faltando info" com botão "Buscar no Shopify" no card pra o operador disparar quando precisar.
  - **C)** Cachear respostas do `shopify-analytics` em localStorage com TTL (1h por exemplo) — dedupa entre sessões.
  - **A)** Lazy resolve completo — só resolve EAN ao clicar Imprimir; lista inicial mostra só metadata de Supabase. Requer repensar os filtros "prontos/faltando" porque eles dependem de saber se o EAN tá disponível.
- **Aposta:** B+C combinadas. Ganho real, mudança contida em `ean13Lookup.ts` + `batches.ts`.

### 2. Plugar Expedição com lookup real de pedidos
- Hoje retorna mock após 600ms.
- Substituir por:
  - `itag-epc-lookup` edge function (EPC → EAN13)
  - `tiny-track-order` ou `yampi-track-order` edge function (EAN → pedido)
  - Geração + impressão de DANFE (edge function existe no projeto industrial)

### 3. Impressão térmica USB real
- `serialport` lista dispositivos, mas falta:
  - Comando Rust pra abrir porta + enviar bytes (ESC/POS / ZPL conforme modelo)
  - Wrapper `src/lib/printer.ts`
  - Plugar em Produção (após selecionar lote → enviar etiquetas)

### 4. Backup da chave privada do updater
- `~/.berzerk-print-station-keys/tauri-updater.key`
- Sem ela, perda total de capacidade de pushar updates.
- Sugerir 1Password / Bitwarden / pasta cifrada.

### 5. Rotacionar Client Secret do Google OAuth
- O secret atual apareceu nos chats da sessão (comigo + Lovable).
- Plano: Google Cloud → Credentials → OAuth client → Add secret → atualizar no Lovable Cloud → deletar o velho. Tauri ensina isso ("rotate without downtime").

### 6. Bug conhecido: auto-update em DEV MODE falha
- `tauri dev` roda com `--no-default-features` que provavelmente quebra o updater plugin.
- No `.exe` instalado funciona.
- Não bloqueia operação; documentar e seguir.

---

## Comandos úteis

```powershell
# Setup PATH (Bun + Cargo)
$env:PATH = "$env:USERPROFILE\.bun\bin;$env:USERPROFILE\.cargo\bin;$env:PATH"

# Rodar dev
Set-Location "C:\Users\Leonardo Flores\Documents\Projetos\berzerk-print-station"
bun run tauri dev

# Lançar dev em background (Windows precisa Start-Process pra não morrer)
$proc = Start-Process -FilePath "$env:USERPROFILE\.bun\bin\bun.exe" `
  -ArgumentList "run","tauri","dev" `
  -WorkingDirectory "C:\Users\Leonardo Flores\Documents\Projetos\berzerk-print-station" `
  -RedirectStandardOutput ".dev-out.log" `
  -RedirectStandardError ".dev-err.log" `
  -PassThru -WindowStyle Hidden

# Verificar build do GitHub Actions
gh run list --repo Berzerk-Tech/berzerk-rfid --limit 3

# Bumpar versão (mexer em 3 arquivos):
# - src-tauri/tauri.conf.json (version)
# - package.json (version)
# - src-tauri/Cargo.toml (version)
# Depois:
git add -A && git commit -m "vX.Y.Z — ..." && git tag vX.Y.Z && git push --follow-tags

# Forçar fetch latest.json (debugging)
curl -sL https://github.com/Berzerk-Tech/berzerk-rfid/releases/latest/download/latest.json
```

---

## Decisões firmadas (NÃO mudar sem pedir)

- Nome: **Berzerk RFID** (sem sufixo). Logo `BERZERK | RFID`.
- Identidade: industrial brutal — Anton font display em wordmarks gigantes; sans bold em títulos médios; mono em metadados; grade técnica de fundo via `AmbientBackground`.
- Light mode: paleta papel técnico (`#f5f3ee`), tons quentes nos borders.
- Módulos: **Produção** + **Expedição** (não "Etiquetagem" e "Impressão de NF").
- Auto-update silencioso com banner — sem `_no-prompt` mode forçado.

---

## Cuidados (do CLAUDE.md global)

- NÃO mexer em `minhacontaberzerk/` (posvenda — Lovable).
- NÃO modificar `separadordelistas/` (industrial — Lovable; mudanças via prompt no chat do Lovable).
- O proxy `rfid-proxy.exe` continua sendo usado por posvenda + industrial. Não tente "limpar".
- Tauri dev no Windows: usar `Start-Process -PassThru` (memória do agente já tem isso).

---

## Onde mora o quê (referência rápida)

| Coisa | Lugar |
|---|---|
| Repo | github.com/Berzerk-Tech/berzerk-rfid |
| Pasta local | `C:\Users\Leonardo Flores\Documents\Projetos\berzerk-print-station\` |
| Chave Ed25519 privada | `~/.berzerk-print-station-keys/tauri-updater.key` |
| OAuth Client | Google Cloud project `berzerk-shared` |
| Supabase Industrial | `hvnysnfmsndjehjndipc.supabase.co` (Lovable) |
| iTAG Monitor | `http://localhost:9093` |
| rfid-proxy (legado) | `https://127.0.0.1:3443` |
| Loopback OAuth | `http://127.0.0.1:54321/oauth-callback` |
| Updater endpoint | `https://github.com/Berzerk-Tech/berzerk-rfid/releases/latest/download/latest.json` |

---

Bora amanhã — produto tá tomando forma, o dono vibrando. Próxima sessão: plugar leitor RFID real + impressão térmica + Expedição backend real. Manda bala.
