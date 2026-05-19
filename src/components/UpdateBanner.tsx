import { useState, type CSSProperties } from "react";
import type { AvailableUpdate, DownloadProgress } from "../lib/updater";

type Props = {
  update: AvailableUpdate;
  onDismiss: () => void;
};

type Status = "idle" | "downloading" | "installing" | "error";

export function UpdateBanner({ update, onDismiss }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleInstall() {
    setStatus("downloading");
    setError(null);
    try {
      await update.install((p) => {
        setProgress(p);
        if (p.total != null && p.downloaded >= p.total) setStatus("installing");
      });
      // relaunch() é chamado dentro do install — não devíamos chegar aqui
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const pct =
    progress && progress.total
      ? Math.min(100, Math.round((progress.downloaded / progress.total) * 100))
      : null;

  return (
    <div style={banner}>
      <div style={info}>
        <strong style={titleStyle}>
          Atualização disponível: v{update.version}
        </strong>
        <span style={meta}>
          (atual: v{update.currentVersion}
          {update.date ? ` • ${update.date.slice(0, 10)}` : ""})
        </span>
      </div>

      {status === "idle" && (
        <div style={actions}>
          <button type="button" onClick={onDismiss} style={dismissBtn}>
            Mais tarde
          </button>
          <button type="button" onClick={handleInstall} style={installBtn}>
            Atualizar agora
          </button>
        </div>
      )}

      {status === "downloading" && (
        <div style={progressWrap}>
          <div style={progressBarBg}>
            <div
              style={{
                ...progressBarFill,
                width: pct != null ? `${pct}%` : "30%",
                animation: pct == null ? "indeterminate 1.4s linear infinite" : undefined,
              }}
            />
          </div>
          <span style={progressLabel}>
            {pct != null ? `Baixando ${pct}%` : "Baixando…"}
          </span>
        </div>
      )}

      {status === "installing" && (
        <span style={progressLabel}>Instalando e reiniciando…</span>
      )}

      {status === "error" && (
        <div style={errorWrap}>
          <span style={errorLabel}>Falhou: {error}</span>
          <button type="button" onClick={handleInstall} style={retryBtn}>
            Tentar de novo
          </button>
          <button type="button" onClick={onDismiss} style={dismissBtn}>
            Fechar
          </button>
        </div>
      )}
    </div>
  );
}

const banner: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "10px 18px",
  background: "var(--accent)",
  color: "var(--accent-text)",
  fontSize: 13,
  borderBottom: "1px solid var(--border)",
};

const info: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 8,
  flex: 1,
  minWidth: 0,
};

const titleStyle: CSSProperties = { fontWeight: 600 };

const meta: CSSProperties = { fontSize: 11, opacity: 0.85 };

const actions: CSSProperties = { display: "flex", gap: 8 };

const installBtn: CSSProperties = {
  padding: "6px 14px",
  fontSize: 12,
  fontWeight: 600,
  border: 0,
  borderRadius: 6,
  background: "var(--accent-text)",
  color: "var(--accent)",
  cursor: "pointer",
};

const dismissBtn: CSSProperties = {
  padding: "6px 12px",
  fontSize: 12,
  border: "1px solid currentColor",
  borderRadius: 6,
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
  opacity: 0.85,
};

const retryBtn: CSSProperties = { ...installBtn };

const progressWrap: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  minWidth: 220,
};

const progressBarBg: CSSProperties = {
  flex: 1,
  height: 8,
  borderRadius: 999,
  background: "rgba(0, 0, 0, 0.18)",
  overflow: "hidden",
};

const progressBarFill: CSSProperties = {
  height: "100%",
  background: "var(--accent-text)",
  borderRadius: 999,
  transition: "width 200ms ease-out",
};

const progressLabel: CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  whiteSpace: "nowrap",
};

const errorWrap: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const errorLabel: CSSProperties = {
  fontSize: 12,
  opacity: 0.9,
};
