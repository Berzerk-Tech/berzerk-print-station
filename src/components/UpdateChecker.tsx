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

  return (
    <div style={card}>
      <div style={row}>
        <div style={meta}>
          <span style={label}>Versão atual</span>
          <code style={version}>v{currentVersion || "…"}</code>
        </div>
        {state.kind === "idle" || state.kind === "uptodate" || state.kind === "error" ? (
          <button type="button" style={button} onClick={handleCheck}>
            Verificar atualizações
          </button>
        ) : null}
        {state.kind === "checking" && <span style={muted}>Verificando…</span>}
      </div>

      {state.kind === "uptodate" && (
        <p style={status}>Você está na versão mais recente.</p>
      )}

      {state.kind === "error" && <p style={statusError}>Falhou: {state.message}</p>}

      {state.kind === "available" && (
        <div style={availableBox}>
          <div>
            <strong>Nova versão disponível: v{state.update.version}</strong>
            {state.update.body && <p style={notes}>{state.update.body}</p>}
          </div>
          <button type="button" style={installBtn} onClick={() => handleInstall(state.update)}>
            Atualizar agora
          </button>
        </div>
      )}

      {state.kind === "downloading" && (
        <div style={progressBox}>
          <ProgressBar progress={state.progress} />
          <span style={muted}>
            {state.progress?.total != null
              ? `${Math.round((state.progress.downloaded / state.progress.total) * 100)}% baixado`
              : "Baixando…"}
          </span>
        </div>
      )}

      {state.kind === "installing" && (
        <p style={status}>Instalando e reiniciando…</p>
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

const card: CSSProperties = {
  maxWidth: 560,
  width: "100%",
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 20,
  marginBottom: 20,
};

const row: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
};

const meta: CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };

const label: CSSProperties = {
  fontSize: 10,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: 0.7,
  fontWeight: 600,
};

const version: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 14,
  color: "var(--text)",
};

const button: CSSProperties = {
  padding: "8px 14px",
  fontSize: 12,
  fontWeight: 600,
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--bg-input)",
  color: "var(--text)",
  cursor: "pointer",
};

const installBtn: CSSProperties = {
  padding: "8px 14px",
  fontSize: 12,
  fontWeight: 600,
  border: 0,
  borderRadius: 8,
  background: "var(--accent)",
  color: "var(--accent-text)",
  cursor: "pointer",
};

const status: CSSProperties = {
  marginTop: 12,
  marginBottom: 0,
  fontSize: 12,
  color: "var(--text-secondary)",
};

const statusError: CSSProperties = {
  ...status,
  color: "var(--danger-text)",
};

const muted: CSSProperties = {
  fontSize: 12,
  color: "var(--text-muted)",
};

const availableBox: CSSProperties = {
  marginTop: 14,
  padding: 14,
  background: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
};

const notes: CSSProperties = {
  margin: 0,
  marginTop: 6,
  fontSize: 11,
  color: "var(--text-secondary)",
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
};

const progressBox: CSSProperties = {
  marginTop: 14,
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const barBg: CSSProperties = {
  flex: 1,
  height: 6,
  background: "var(--bg-input)",
  borderRadius: 999,
  overflow: "hidden",
};

const barFill: CSSProperties = {
  height: "100%",
  background: "var(--accent)",
  transition: "width 200ms ease-out",
};
