import { useEffect, useState, type CSSProperties } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { checkForUpdate, type AvailableUpdate, type DownloadProgress } from "../lib/updater";

type CheckState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "uptodate" }
  | { kind: "error"; message: string }
  | { kind: "available"; update: AvailableUpdate }
  | { kind: "downloading"; update: AvailableUpdate; progress: DownloadProgress | null }
  | { kind: "installing" };

export function UpdateChecker() {
  const [currentVersion, setCurrentVersion] = useState<string>("");
  const [state, setState] = useState<CheckState>({ kind: "idle" });

  useEffect(() => {
    getVersion().then(setCurrentVersion).catch(() => setCurrentVersion("?"));
  }, []);

  async function handleCheck() {
    setState({ kind: "checking" });
    try {
      const update = await checkForUpdate();
      setState(update ? { kind: "available", update } : { kind: "uptodate" });
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }

  async function handleInstall(update: AvailableUpdate) {
    setState({ kind: "downloading", update, progress: null });
    try {
      await update.install((progress) => {
        setState((prev) => {
          if (prev.kind === "downloading") {
            if (progress.total != null && progress.downloaded >= progress.total) {
              return { kind: "installing" };
            }
            return { ...prev, progress };
          }
          return prev;
        });
      });
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }

  const buttonsAvailable =
    state.kind === "idle" || state.kind === "uptodate" || state.kind === "error";

  return (
    <div style={card}>
      <div style={topRow}>
        <div style={versionBlock}>
          <span style={versionLabel}>Versão instalada</span>
          <code style={versionValue}>v{currentVersion || "…"}</code>
        </div>
        {buttonsAvailable && (
          <button type="button" style={primaryBtn} className="berzerk-update-btn" onClick={handleCheck}>
            <RefreshIcon />
            Verificar
          </button>
        )}
        {state.kind === "checking" && (
          <div style={inlineSpinner}>
            <Spinner />
            <span style={inlineSpinnerText}>Verificando…</span>
          </div>
        )}
      </div>

      {state.kind === "uptodate" && (
        <Notice tone="success">
          <CheckIcon />
          <span>Você está na versão mais recente.</span>
        </Notice>
      )}

      {state.kind === "error" && (
        <Notice tone="danger">
          <AlertIcon />
          <span>Falhou — {state.message}</span>
        </Notice>
      )}

      {state.kind === "available" && (
        <div style={availableBox}>
          <div style={availableHead}>
            <span style={availableKicker}>― Atualização disponível ―</span>
            <h4 style={availableVersion}>v{state.update.version}</h4>
            {state.update.body && <p style={releaseNotes}>{state.update.body}</p>}
          </div>
          <button
            type="button"
            style={installBtn}
            className="berzerk-update-install"
            onClick={() => handleInstall(state.update)}
          >
            Atualizar agora →
          </button>
        </div>
      )}

      {state.kind === "downloading" && (
        <div style={progressBox}>
          <ProgressBar progress={state.progress} />
          <span style={progressLabel}>
            {state.progress?.total != null
              ? `${Math.round((state.progress.downloaded / state.progress.total) * 100)}% — ${formatBytes(state.progress.downloaded)} / ${formatBytes(state.progress.total)}`
              : "Baixando…"}
          </span>
        </div>
      )}

      {state.kind === "installing" && (
        <Notice tone="info">
          <Spinner />
          <span>Instalando e reiniciando…</span>
        </Notice>
      )}
    </div>
  );
}

function ProgressBar({ progress }: { progress: DownloadProgress | null }) {
  const pct =
    progress && progress.total
      ? Math.min(100, Math.round((progress.downloaded / progress.total) * 100))
      : null;
  return (
    <div style={barBg}>
      <div style={{ ...barFill, width: pct != null ? `${pct}%` : "30%" }} />
    </div>
  );
}

function Notice({ tone, children }: { tone: "success" | "danger" | "info"; children: React.ReactNode }) {
  const palette =
    tone === "success"
      ? { bg: "var(--success-bg)", text: "var(--success-text)", border: "var(--success-border)" }
      : tone === "danger"
        ? { bg: "var(--danger-bg)", text: "var(--danger-text)", border: "var(--danger-border)" }
        : { bg: "var(--info-bg)", text: "var(--info-text)", border: "var(--info-border)" };

  return (
    <div
      style={{
        marginTop: 16,
        padding: "10px 14px",
        background: palette.bg,
        color: palette.text,
        border: `1px solid ${palette.border}`,
        borderRadius: 10,
        fontSize: 12,
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <svg width={14} height={14} viewBox="0 0 20 20" style={{ animation: "berzerk-spin 0.9s linear infinite", flexShrink: 0 }}>
      <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" />
      <path d="M10 2 a8 8 0 0 1 8 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

if (typeof document !== "undefined" && !document.getElementById("berzerk-update-styles")) {
  const style = document.createElement("style");
  style.id = "berzerk-update-styles";
  style.textContent = `
    .berzerk-update-btn:hover {
      background: var(--bg-card-hover) !important;
      border-color: var(--border-strong) !important;
      color: var(--text) !important;
    }
    .berzerk-update-install:hover {
      background: var(--accent-hover) !important;
    }
  `;
  document.head.appendChild(style);
}

const card: CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 20,
};

const topRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
};

const versionBlock: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const versionLabel: CSSProperties = {
  fontSize: 10,
  letterSpacing: 2,
  textTransform: "uppercase",
  color: "var(--text-muted)",
  fontWeight: 700,
};

const versionValue: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 16,
  color: "var(--text)",
  fontWeight: 500,
};

const primaryBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "9px 14px",
  fontSize: 12,
  fontWeight: 600,
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--bg-input)",
  color: "var(--text-secondary)",
  cursor: "pointer",
  transition: "background 120ms, border-color 120ms, color 120ms",
};

const inlineSpinner: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  color: "var(--text-secondary)",
};

const inlineSpinnerText: CSSProperties = {
  fontSize: 12,
};

const availableBox: CSSProperties = {
  marginTop: 18,
  padding: 18,
  background: "var(--bg-input)",
  border: "1px solid var(--border-strong)",
  borderRadius: 10,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 18,
  flexWrap: "wrap",
};

const availableHead: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  flex: 1,
  minWidth: 200,
};

const availableKicker: CSSProperties = {
  fontSize: 10,
  letterSpacing: 2.5,
  textTransform: "uppercase",
  color: "var(--text-muted)",
  fontWeight: 700,
};

const availableVersion: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-display)",
  fontSize: 28,
  color: "var(--text)",
  letterSpacing: 0.4,
  lineHeight: 1,
};

const releaseNotes: CSSProperties = {
  margin: 0,
  marginTop: 8,
  fontSize: 12,
  color: "var(--text-secondary)",
  lineHeight: 1.55,
  whiteSpace: "pre-wrap",
};

const installBtn: CSSProperties = {
  padding: "10px 16px",
  fontSize: 12,
  fontWeight: 700,
  border: 0,
  borderRadius: 8,
  background: "var(--accent)",
  color: "var(--accent-text)",
  cursor: "pointer",
  textTransform: "uppercase",
  letterSpacing: 1,
  transition: "background 120ms",
};

const progressBox: CSSProperties = {
  marginTop: 16,
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const barBg: CSSProperties = {
  flex: 1,
  height: 8,
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
  borderRadius: 999,
  overflow: "hidden",
};

const barFill: CSSProperties = {
  height: "100%",
  background: "var(--text)",
  transition: "width 200ms ease-out",
};

const progressLabel: CSSProperties = {
  fontSize: 11,
  fontFamily: "var(--font-mono)",
  color: "var(--text-secondary)",
  whiteSpace: "nowrap",
};
