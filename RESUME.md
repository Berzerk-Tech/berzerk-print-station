# RESUME — sessão 2026-05-19

Agente que abrir essa sessão amanhã: leia esse documento antes de fazer qualquer coisa. O dono está gostando, estamos no caminho. Não comece a refatorar nem renomear nada por conta própria.

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
- **Ainda NÃO está plugado nas telas reais** (Produção/Expedição) — backend mockado.
- O proxy `rfid-proxy.exe` continua existindo no posvenda/industrial (webapps em browser).

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

### 1. Plugar cliente iTAG real na Produção (BatchBrowser)
- Atualmente `BatchBrowser` usa a mesma lógica do posvenda via `rfid-proxy.exe` HTTPS local.
- O cliente iTAG nativo (Rust) está pronto e funcionando, mas ninguém chama ele ainda.
- Tarefa: refatorar para usar `pingItag()`/`pollItagTags()` em vez de fetch direto. Migrar para HTTP plain via Rust em vez do proxy.

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
