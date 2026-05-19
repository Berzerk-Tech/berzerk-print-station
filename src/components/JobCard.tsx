import type { CSSProperties } from "react";
import type { RfidPrintJob, RfidPrintJobStatus } from "../services/printJobs";
import type { PrintJobItem } from "../lib/itag/printJob";

type Props = {
  job: RfidPrintJob;
  onPrint: (job: RfidPrintJob) => void;
};

const STATUS_LABEL: Record<RfidPrintJobStatus, string> = {
  queued: "Pronto",
  printing: "Imprimindo…",
  done: "Concluído",
  failed: "Falhou",
  cancelled: "Cancelado",
};

const STATUS_STYLE: Record<RfidPrintJobStatus, CSSProperties> = {
  queued: { background: "#ecfdf5", color: "#047857" },
  printing: { background: "#eff6ff", color: "#1e40af" },
  done: { background: "#f3f4f6", color: "#374151" },
  failed: { background: "#fef2f2", color: "#991b1b" },
  cancelled: { background: "#f3f4f6", color: "#6b7280" },
};

function aggregateGrade(items: PrintJobItem[]) {
  const map = new Map<string, number>();
  for (const item of items) {
    map.set(item.size, (map.get(item.size) ?? 0) + item.quantity);
  }
  return Array.from(map.entries());
}

export function JobCard({ job, onPrint }: Props) {
  const grade = aggregateGrade(job.items);
  const isQueued = job.status === "queued";
  const isPrinting = job.status === "printing";
  const isFailed = job.status === "failed";
  const canPrint = isQueued || isFailed;

  const buttonLabel = isPrinting
    ? "Imprimindo…"
    : isFailed
    ? "Tentar de novo"
    : `Imprimir ${job.total_etiquetas} etiquetas`;

  return (
    <article style={card}>
      <header style={topRow}>
        <span style={batchCode}>{job.batch_code}</span>
        <span style={{ ...badge, ...STATUS_STYLE[job.status] }}>
          {STATUS_LABEL[job.status]}
        </span>
      </header>

      <p style={subtitle}>
        {job.design_name ?? "Sem desenho"}
        {job.shirt_color && (
          <>
            <span style={dot}>·</span>
            {job.shirt_color}
          </>
        )}
      </p>

      <div style={pillsRow}>
        {grade.map(([size, qty]) => (
          <span key={size} style={pill}>
            <strong style={pillSize}>{size}</strong>
            <span style={pillQty}>·{qty}</span>
          </span>
        ))}
      </div>

      {job.error_message && (
        <div style={errorBox}>{job.error_message}</div>
      )}

      <footer style={footer}>
        <div style={totalCol}>
          <span style={totalNum}>{job.total_etiquetas}</span>
          <span style={totalLabel}>etiquetas</span>
        </div>
        <button
          onClick={() => onPrint(job)}
          disabled={!canPrint}
          style={canPrint ? printBtn : printBtnDisabled}
        >
          {buttonLabel}
        </button>
      </footer>
    </article>
  );
}

const card: CSSProperties = {
  background: "white",
  border: "1px solid #e5e5e5",
  borderRadius: 10,
  padding: 20,
  marginBottom: 12,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const topRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const batchCode: CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: "#111",
  fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace",
  letterSpacing: 0.3,
};

const badge: CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  padding: "3px 10px",
  borderRadius: 999,
};

const subtitle: CSSProperties = {
  margin: 0,
  fontSize: 14,
  color: "#666",
};

const dot: CSSProperties = {
  margin: "0 6px",
  color: "#ccc",
};

const pillsRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
};

const pill: CSSProperties = {
  background: "#f3f4f6",
  borderRadius: 6,
  padding: "4px 10px",
  fontSize: 13,
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
};

const pillSize: CSSProperties = {
  fontWeight: 600,
  color: "#111",
};

const pillQty: CSSProperties = {
  color: "#666",
};

const errorBox: CSSProperties = {
  background: "#fef2f2",
  color: "#991b1b",
  padding: "8px 12px",
  borderRadius: 6,
  fontSize: 13,
};

const footer: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 4,
};

const totalCol: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  lineHeight: 1,
};

const totalNum: CSSProperties = {
  fontSize: 32,
  fontWeight: 700,
  color: "#111",
};

const totalLabel: CSSProperties = {
  fontSize: 11,
  color: "#888",
  marginTop: 4,
  textTransform: "uppercase",
  letterSpacing: 0.5,
};

const printBtn: CSSProperties = {
  padding: "12px 24px",
  fontSize: 15,
  fontWeight: 500,
  border: 0,
  borderRadius: 8,
  background: "#111",
  color: "white",
  cursor: "pointer",
};

const printBtnDisabled: CSSProperties = {
  ...printBtn,
  background: "#e5e5e5",
  color: "#888",
  cursor: "not-allowed",
};
