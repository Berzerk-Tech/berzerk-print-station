import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { ResolvedBatch } from "../services/batches";
import { buildPrintItems } from "../services/batches";
import {
  applyMargin,
  getMarginConfig,
  setMarginConfig,
  type ApplyMarginInput,
  type MarginConfig,
  type MarginMode,
} from "../lib/settings";
import type { PrintJobItem } from "../lib/itag/iprint";

type Props = {
  resolved: ResolvedBatch;
  onCancel: () => void;
  onConfirm: (config: ApplyMarginInput) => void;
};

export function PrintConfirmModal({ resolved, onCancel, onConfirm }: Props) {
  const stored = useMemo<MarginConfig>(() => getMarginConfig(), []);
  const [mode, setMode] = useState<MarginMode>(stored.mode);
  const [globalPercent, setGlobalPercent] = useState<number>(
    stored.globalPercent,
  );
  const [capEnabled, setCapEnabled] = useState<boolean>(stored.capEnabled);
  const [capValue, setCapValue] = useState<number>(stored.capValue);
  const [perSize, setPerSize] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    for (const s of resolved.batch.sizes)
      m[s.size] = stored.perSizeDefault;
    return m;
  });
  const [bulkInput, setBulkInput] = useState<number>(stored.perSizeDefault);

  const baseItems = useMemo<PrintJobItem[]>(
    () => buildPrintItems(resolved),
    [resolved],
  );

  const config: ApplyMarginInput = {
    mode,
    globalPercent,
    capEnabled,
    capValue,
    perSize,
  };
  const marginedItems = useMemo(
    () => applyMargin(baseItems, config),
    [baseItems, mode, globalPercent, capEnabled, capValue, perSize],
  );

  const baseTotal = baseItems.reduce((s, i) => s + i.quantity, 0);
  const marginedTotal = marginedItems.reduce((s, i) => s + i.quantity, 0);
  const extras = marginedTotal - baseTotal;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  function commit() {
    setMarginConfig({
      mode,
      globalPercent,
      capEnabled,
      capValue,
      perSizeDefault: stored.perSizeDefault,
    });
    onConfirm(config);
  }

  function applyBulkToAll() {
    const v = Math.max(0, Math.min(200, Math.floor(bulkInput)));
    const next: Record<string, number> = {};
    for (const s of resolved.batch.sizes) next[s.size] = v;
    setPerSize(next);
  }

  const { batch, shopifyTitle, shopifyColor } = resolved;
  const title = shopifyTitle ?? batch.design_name ?? batch.batch_code;
  const color = shopifyColor ?? batch.shirt_color;

  return (
    <div style={overlay} onClick={onCancel}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <header style={head}>
          <h2 style={headTitle}>Confirmar impressão</h2>
          <button onClick={onCancel} style={closeBtn} aria-label="Fechar">
            ✕
          </button>
        </header>

        <div style={lotInfo}>
          <span style={lotCode}>{batch.batch_code}</span>
          <span style={lotMeta}>
            {title}
            {color && (
              <>
                <span style={dot}>·</span>
                {color}
              </>
            )}
          </span>
        </div>

        <div style={sectionLabelWrap}>
          <span style={sectionLabel}>Margem de segurança</span>
        </div>

        <div style={segmentedToggle}>
          <SegmentButton
            label="Sem margem"
            active={mode === "none"}
            onClick={() => setMode("none")}
          />
          <SegmentButton
            label="% global"
            active={mode === "global_percent"}
            onClick={() => setMode("global_percent")}
          />
          <SegmentButton
            label="Fixo por tamanho"
            active={mode === "per_size_fixed"}
            onClick={() => setMode("per_size_fixed")}
          />
        </div>

        {mode === "global_percent" && (
          <div style={modeControls}>
            <div style={percentRow}>
              <label style={percentLabel}>Margem</label>
              <input
                type="range"
                min={0}
                max={20}
                step={1}
                value={globalPercent}
                onChange={(e) => setGlobalPercent(Number(e.target.value))}
                style={slider}
              />
              <div style={percentValue}>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={globalPercent}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    if (Number.isFinite(n))
                      setGlobalPercent(Math.max(0, Math.min(50, n)));
                  }}
                  style={numInput}
                />
                <span style={unitTag}>%</span>
              </div>
            </div>
            <label style={capRow}>
              <input
                type="checkbox"
                checked={capEnabled}
                onChange={(e) => setCapEnabled(e.target.checked)}
              />
              <span style={capText}>
                Limitar máximo de extras por tamanho a
              </span>
              <input
                type="number"
                min={0}
                max={200}
                value={capValue}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (Number.isFinite(n))
                    setCapValue(Math.max(0, Math.min(200, n)));
                }}
                disabled={!capEnabled}
                style={{
                  ...numInput,
                  opacity: capEnabled ? 1 : 0.5,
                  cursor: capEnabled ? "text" : "not-allowed",
                }}
              />
              <span style={unitTag}>unid.</span>
            </label>
          </div>
        )}

        {mode === "per_size_fixed" && (
          <div style={modeControls}>
            <div style={bulkRow}>
              <span style={bulkLabel}>Aplicar a todos os tamanhos:</span>
              <input
                type="number"
                min={0}
                max={200}
                value={bulkInput}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (Number.isFinite(n))
                    setBulkInput(Math.max(0, Math.min(200, n)));
                }}
                style={numInput}
              />
              <button onClick={applyBulkToAll} style={bulkBtn}>
                Aplicar
              </button>
            </div>
          </div>
        )}

        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Size</th>
                <th style={{ ...th, textAlign: "right" }}>Base</th>
                {mode === "per_size_fixed" && (
                  <th style={{ ...th, textAlign: "right" }}>Extras</th>
                )}
                <th style={{ ...th, textAlign: "right" }}>Imprimir</th>
                {mode !== "per_size_fixed" && (
                  <th style={{ ...th, textAlign: "right" }}>Extras</th>
                )}
              </tr>
            </thead>
            <tbody>
              {baseItems.map((b, i) => {
                const m = marginedItems[i];
                const extra = m.quantity - b.quantity;
                return (
                  <tr key={b.size}>
                    <td style={tdSize}>{b.size}</td>
                    <td style={tdNum}>{b.quantity}</td>
                    {mode === "per_size_fixed" && (
                      <td style={tdInputCell}>
                        <div style={extraInputWrap}>
                          +
                          <input
                            type="number"
                            min={0}
                            max={200}
                            value={perSize[b.size] ?? 0}
                            onChange={(e) => {
                              const n = parseInt(e.target.value, 10);
                              setPerSize({
                                ...perSize,
                                [b.size]: Number.isFinite(n)
                                  ? Math.max(0, Math.min(200, n))
                                  : 0,
                              });
                            }}
                            style={inlineNumInput}
                          />
                        </div>
                      </td>
                    )}
                    <td style={tdNumStrong}>{m.quantity}</td>
                    {mode !== "per_size_fixed" && (
                      <td style={tdExtra}>
                        {extra > 0 ? `+${extra}` : "—"}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td style={tfSize}>Total</td>
                <td style={tfNum}>{baseTotal}</td>
                {mode === "per_size_fixed" && (
                  <td style={tfExtra}>{extras > 0 ? `+${extras}` : "—"}</td>
                )}
                <td style={tfNumStrong}>{marginedTotal}</td>
                {mode !== "per_size_fixed" && (
                  <td style={tfExtra}>{extras > 0 ? `+${extras}` : "—"}</td>
                )}
              </tr>
            </tfoot>
          </table>
        </div>

        <div style={summaryBox}>
          Vai imprimir <strong style={summaryNum}>{marginedTotal}</strong>{" "}
          etiquetas RFID
          {extras > 0 && (
            <span style={summaryExtras}>
              {" "}
              ({baseTotal} base + {extras} margem)
            </span>
          )}
        </div>

        <footer style={foot}>
          <button onClick={onCancel} style={cancelBtn}>
            Cancelar
          </button>
          <button onClick={commit} style={confirmBtn}>
            Confirmar e imprimir
          </button>
        </footer>
      </div>
    </div>
  );
}

function SegmentButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}): ReactNode {
  return (
    <button
      onClick={onClick}
      style={active ? segmentActive : segmentInactive}
    >
      {label}
    </button>
  );
}

const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  display: "grid",
  placeItems: "center",
  zIndex: 100,
  backdropFilter: "blur(2px)",
};

const modal: CSSProperties = {
  width: "min(600px, calc(100vw - 48px))",
  background: "var(--bg-card)",
  border: "1px solid var(--border-strong)",
  borderRadius: 14,
  padding: 24,
  boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
  maxHeight: "calc(100vh - 48px)",
  overflowY: "auto",
};

const head: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 14,
};

const headTitle: CSSProperties = {
  margin: 0,
  fontSize: 16,
  fontWeight: 600,
  color: "var(--text)",
};

const closeBtn: CSSProperties = {
  background: "transparent",
  border: 0,
  color: "var(--text-muted)",
  cursor: "pointer",
  fontSize: 16,
  padding: "4px 8px",
};

const lotInfo: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 12,
  padding: "10px 14px",
  background: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  marginBottom: 16,
};

const lotCode: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 16,
  fontWeight: 700,
  color: "var(--text)",
};

const lotMeta: CSSProperties = {
  fontSize: 13,
  color: "var(--text-secondary)",
};

const dot: CSSProperties = {
  margin: "0 6px",
  color: "var(--text-faint)",
};

const sectionLabelWrap: CSSProperties = {
  marginBottom: 8,
};

const sectionLabel: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.9,
  color: "var(--text-muted)",
};

const segmentedToggle: CSSProperties = {
  display: "flex",
  gap: 4,
  background: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: 4,
  marginBottom: 14,
};

const segmentInactive: CSSProperties = {
  flex: 1,
  background: "transparent",
  border: 0,
  color: "var(--text-secondary)",
  fontSize: 12,
  fontWeight: 500,
  padding: "8px 10px",
  borderRadius: 6,
  cursor: "pointer",
};

const segmentActive: CSSProperties = {
  ...segmentInactive,
  background: "var(--bg-card)",
  color: "var(--text)",
  fontWeight: 600,
  boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
};

const modeControls: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: "12px 14px",
  background: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  marginBottom: 14,
};

const percentRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const percentLabel: CSSProperties = {
  fontSize: 12,
  color: "var(--text-secondary)",
  fontWeight: 500,
  minWidth: 60,
};

const slider: CSSProperties = {
  flex: 1,
  accentColor: "var(--accent)",
};

const percentValue: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "3px 8px",
};

const numInput: CSSProperties = {
  width: 44,
  background: "transparent",
  border: 0,
  color: "var(--text)",
  fontSize: 13,
  fontWeight: 600,
  textAlign: "right",
  outline: "none",
  fontFamily: "var(--font-mono)",
};

const unitTag: CSSProperties = {
  fontSize: 11,
  color: "var(--text-muted)",
};

const capRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12,
  color: "var(--text-secondary)",
  cursor: "pointer",
  flexWrap: "wrap",
};

const capText: CSSProperties = {
  flex: 1,
};

const bulkRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

const bulkLabel: CSSProperties = {
  fontSize: 12,
  color: "var(--text-secondary)",
};

const bulkBtn: CSSProperties = {
  background: "var(--bg-card)",
  color: "var(--text)",
  border: "1px solid var(--border-strong)",
  padding: "5px 12px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 500,
};

const tableWrap: CSSProperties = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  overflow: "hidden",
  marginBottom: 14,
};

const table: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const th: CSSProperties = {
  textAlign: "left",
  padding: "8px 12px",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 0.7,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  borderBottom: "1px solid var(--border)",
  background: "var(--bg-card)",
};

const tdSize: CSSProperties = {
  padding: "7px 12px",
  fontFamily: "var(--font-mono)",
  fontWeight: 600,
  color: "var(--text)",
};

const tdNum: CSSProperties = {
  padding: "7px 12px",
  textAlign: "right",
  fontFamily: "var(--font-mono)",
  color: "var(--text-secondary)",
};

const tdNumStrong: CSSProperties = {
  ...tdNum,
  color: "var(--text)",
  fontWeight: 700,
};

const tdExtra: CSSProperties = {
  ...tdNum,
  color: "var(--success-text)",
  fontSize: 12,
};

const tdInputCell: CSSProperties = {
  padding: "5px 12px",
  textAlign: "right",
};

const extraInputWrap: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
  borderRadius: 5,
  padding: "1px 6px",
  color: "var(--text-secondary)",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
};

const inlineNumInput: CSSProperties = {
  width: 36,
  background: "transparent",
  border: 0,
  color: "var(--text)",
  fontSize: 12,
  fontWeight: 600,
  textAlign: "right",
  outline: "none",
  fontFamily: "var(--font-mono)",
};

const tfSize: CSSProperties = {
  ...tdSize,
  borderTop: "1px solid var(--border)",
  background: "var(--bg-card)",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 0.7,
  color: "var(--text-muted)",
};

const tfNum: CSSProperties = {
  ...tdNum,
  borderTop: "1px solid var(--border)",
  background: "var(--bg-card)",
  fontWeight: 600,
};

const tfNumStrong: CSSProperties = {
  ...tdNumStrong,
  borderTop: "1px solid var(--border)",
  background: "var(--bg-card)",
  fontSize: 14,
  color: "var(--text)",
};

const tfExtra: CSSProperties = {
  ...tdExtra,
  borderTop: "1px solid var(--border)",
  background: "var(--bg-card)",
  fontWeight: 700,
};

const summaryBox: CSSProperties = {
  background: "var(--info-bg)",
  color: "var(--info-text)",
  border: "1px solid var(--info-border)",
  padding: "10px 14px",
  borderRadius: 8,
  fontSize: 13,
  marginBottom: 14,
  textAlign: "center",
};

const summaryNum: CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  margin: "0 4px",
};

const summaryExtras: CSSProperties = {
  fontSize: 12,
  opacity: 0.85,
};

const foot: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
};

const cancelBtn: CSSProperties = {
  background: "transparent",
  color: "var(--text-secondary)",
  border: "1px solid var(--border)",
  padding: "10px 18px",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 500,
};

const confirmBtn: CSSProperties = {
  background: "var(--accent)",
  color: "var(--accent-text)",
  border: 0,
  padding: "10px 18px",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
};
