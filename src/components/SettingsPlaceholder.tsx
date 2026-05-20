import { useEffect, useState, type CSSProperties } from "react";
import { BackButton } from "./BackButton";
import { UpdateChecker } from "./UpdateChecker";
import { AmbientBackground } from "./AmbientBackground";
import { getStationId } from "../lib/station";
import {
  getDeviceConfig,
  setPrinter,
  setReader,
  PRINTER_MODELS,
  READER_MODES,
  type ThermalPrinter,
  type RfidReader,
} from "../lib/devices";
import { pingItag, type ConnectionStatus } from "../lib/rfid";

type Props = { onBack: () => void };

export function SettingsPlaceholder({ onBack }: Props) {
  const stationId = getStationId();
  const [config, setConfig] = useState(() => getDeviceConfig());

  const refresh = () => setConfig(getDeviceConfig());

  return (
    <div style={page}>
      <AmbientBackground variant="flat" />

      <header style={subHeader}>
        <div style={subHeaderLeft}>
          <BackButton onClick={onBack} />
        </div>
        <h2 style={title}>Configurações</h2>
        <div style={subHeaderRight} />
      </header>

      <main style={body}>
        <div style={section}>
          <SectionHeader kicker="Dispositivos" label="Impressora térmica" />
          <PrinterCard
            printer={config.printer}
            onSave={(p) => { setPrinter(p); refresh(); }}
            onClear={() => { setPrinter(null); refresh(); }}
          />
        </div>

        <div style={section}>
          <SectionHeader kicker="Dispositivos" label="Leitor RFID" />
          <ReaderCard
            reader={config.reader}
            onSave={(r) => { setReader(r); refresh(); }}
          />
        </div>

        <div style={section}>
          <SectionHeader kicker="Sistema" label="Atualizações" />
          <UpdateChecker />
        </div>

        <div style={section}>
          <SectionHeader kicker="Identificação" label="Estação" />
          <div style={infoCard}>
            <div style={infoRow}>
              <span style={infoLabel}>ID completo</span>
              <code style={infoValueMono}>{stationId}</code>
            </div>
            <p style={infoHelp}>
              Identificador único deste PC. Gerado no primeiro boot e persistido localmente.
              Trocar invalida o histórico de impressões desta estação.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

// === Printer Card ===

function PrinterCard({
  printer,
  onSave,
  onClear,
}: {
  printer: ThermalPrinter | null;
  onSave: (p: ThermalPrinter) => void;
  onClear: () => void;
}) {
  const [editing, setEditing] = useState(!printer);
  const [draft, setDraft] = useState<ThermalPrinter>(() =>
    printer ?? { name: "", deviceId: "", model: "unknown" },
  );

  useEffect(() => {
    if (printer) setDraft(printer);
  }, [printer]);

  if (!editing && printer) {
    return (
      <div style={configCard}>
        <div style={configRow}>
          <div style={configMeta}>
            <span style={configLabel}>Modelo</span>
            <code style={configValueMono}>
              {PRINTER_MODELS.find((m) => m.value === printer.model)?.label ?? printer.model}
            </code>
          </div>
          <span style={pillReady}>
            <span style={pillDotReady} /> Configurada
          </span>
        </div>
        <div style={configRow}>
          <div style={configMeta}>
            <span style={configLabel}>Nome</span>
            <span style={configValue}>{printer.name}</span>
          </div>
        </div>
        <div style={configRow}>
          <div style={configMeta}>
            <span style={configLabel}>Identificador</span>
            <code style={configValueMono}>{printer.deviceId}</code>
          </div>
        </div>
        <div style={cardActions}>
          <button type="button" style={btnGhost} className="berzerk-btn-ghost" onClick={() => setEditing(true)}>
            Editar
          </button>
          <button type="button" style={btnDanger} className="berzerk-btn-danger" onClick={onClear}>
            Remover
          </button>
        </div>
      </div>
    );
  }

  const canSave = draft.name.trim() && draft.deviceId.trim();

  return (
    <div style={configCard}>
      {!printer && (
        <p style={emptyHint}>
          Nenhuma impressora configurada. Em breve a detecção via USB será automática —
          por agora preencha manualmente abaixo.
        </p>
      )}

      <Field label="Nome" hint="Ex: Bobina 01 / Esquerda">
        <input
          style={input}
          className="berzerk-input"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="Bobina 01"
        />
      </Field>

      <Field label="Modelo" hint="Define o protocolo (ESC/POS, ZPL, etc)">
        <select
          style={input}
          className="berzerk-input"
          value={draft.model}
          onChange={(e) =>
            setDraft({ ...draft, model: e.target.value as ThermalPrinter["model"] })
          }
        >
          {PRINTER_MODELS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Identificador (porta COM ou USB)" hint="Ex: COM3 ou 0483:5740">
        <input
          style={input}
          className="berzerk-input"
          value={draft.deviceId}
          onChange={(e) => setDraft({ ...draft, deviceId: e.target.value })}
          placeholder="COM3"
        />
      </Field>

      <div style={cardActions}>
        {printer && (
          <button
            type="button"
            style={btnGhost}
            className="berzerk-btn-ghost"
            onClick={() => {
              setDraft(printer);
              setEditing(false);
            }}
          >
            Cancelar
          </button>
        )}
        <button
          type="button"
          style={canSave ? btnPrimary : btnDisabled}
          className={canSave ? "berzerk-btn-primary" : ""}
          disabled={!canSave}
          onClick={() => {
            onSave(draft);
            setEditing(false);
          }}
        >
          Salvar
        </button>
      </div>
    </div>
  );
}

// === Reader Card ===

function ReaderCard({
  reader,
  onSave,
}: {
  reader: RfidReader;
  onSave: (r: RfidReader) => void;
}) {
  const [draft, setDraft] = useState(reader);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionStatus | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(reader);

  // Atualiza o draft quando os defaults externos mudam (Salvar reseta)
  useEffect(() => { setDraft(reader); }, [reader]);

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const status = await pingItag(draft.itagHost);
      setTestResult(status);
    } catch (err) {
      setTestResult({
        ok: false,
        host: draft.itagHost,
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div style={configCard}>
      <Field label="Modo de conexão" hint="Como o app fala com o leitor RFID">
        <div style={radioGroup}>
          {READER_MODES.map((mode) => (
            <label
              key={mode.value}
              style={{
                ...radioOption,
                opacity: mode.available ? 1 : 0.5,
                cursor: mode.available ? "pointer" : "not-allowed",
              }}
            >
              <input
                type="radio"
                name="reader-mode"
                checked={draft.mode === mode.value}
                disabled={!mode.available}
                onChange={() => setDraft({ ...draft, mode: mode.value })}
                style={radio}
              />
              <span style={radioBody}>
                <span style={radioLabel}>{mode.label}</span>
                <span style={radioDesc}>{mode.description}</span>
              </span>
            </label>
          ))}
        </div>
      </Field>

      {draft.mode === "via-proxy" && (
        <Field label="Endereço do proxy HTTPS" hint="rfid-proxy rodando no PC (legado)">
          <input
            style={input}
            className="berzerk-input"
            value={draft.proxyHost}
            onChange={(e) => setDraft({ ...draft, proxyHost: e.target.value })}
          />
        </Field>
      )}

      <Field
        label="Endereço do iTAG Monitor"
        hint="O Print Station fala HTTP direto — sem proxy"
      >
        <div style={inputWithButton}>
          <input
            style={{ ...input, flex: 1 }}
            className="berzerk-input"
            value={draft.itagHost}
            onChange={(e) => setDraft({ ...draft, itagHost: e.target.value })}
          />
          <button
            type="button"
            style={btnGhost}
            className="berzerk-btn-ghost"
            onClick={handleTest}
            disabled={testing}
          >
            {testing ? "Testando…" : "Testar conexão"}
          </button>
        </div>
      </Field>

      {testResult && (
        <div
          style={{
            ...testBox,
            background: testResult.ok ? "var(--success-bg)" : "var(--danger-bg)",
            color: testResult.ok ? "var(--success-text)" : "var(--danger-text)",
            borderColor: testResult.ok ? "var(--success-border)" : "var(--danger-border)",
          }}
        >
          <span style={testIcon}>{testResult.ok ? "●" : "○"}</span>
          <div style={testCopy}>
            <strong style={testTitle}>
              {testResult.ok ? "iTAG Monitor respondeu" : "Não consegui conectar"}
            </strong>
            {testResult.message && (
              <code style={testDetail}>{testResult.message}</code>
            )}
          </div>
        </div>
      )}

      {dirty && (
        <div style={cardActions}>
          <button
            type="button"
            style={btnGhost}
            className="berzerk-btn-ghost"
            onClick={() => setDraft(reader)}
          >
            Descartar
          </button>
          <button
            type="button"
            style={btnPrimary}
            className="berzerk-btn-primary"
            onClick={() => onSave(draft)}
          >
            Salvar alterações
          </button>
        </div>
      )}
    </div>
  );
}

// === Helpers ===

function SectionHeader({ kicker, label }: { kicker: string; label: string }) {
  return (
    <div style={sectionHeader}>
      <span style={sectionKicker}>― {kicker} ―</span>
      <h3 style={sectionLabel}>{label}</h3>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={field}>
      <div style={fieldHead}>
        <span style={fieldLabel}>{label}</span>
        {hint && <span style={fieldHint}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

// === Hover CSS ===

if (typeof document !== "undefined" && !document.getElementById("berzerk-settings-styles")) {
  const style = document.createElement("style");
  style.id = "berzerk-settings-styles";
  style.textContent = `
    .berzerk-input:focus {
      outline: none;
      border-color: var(--border-focus) !important;
    }
    .berzerk-btn-primary:hover { background: var(--accent-hover) !important; }
    .berzerk-btn-ghost:hover {
      background: var(--bg-card-hover) !important;
      border-color: var(--border-strong) !important;
    }
    .berzerk-btn-danger:hover {
      background: var(--danger-bg) !important;
      color: var(--danger-text) !important;
      border-color: var(--danger-border) !important;
    }
  `;
  document.head.appendChild(style);
}

// === Styles ===

const page: CSSProperties = {
  minHeight: "100vh",
  background: "var(--bg)",
  color: "var(--text)",
  display: "flex",
  flexDirection: "column",
  position: "relative",
  overflow: "hidden",
};

const subHeader: CSSProperties = {
  position: "relative",
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  alignItems: "center",
  gap: 18,
  padding: "20px 40px",
  borderBottom: "1px solid var(--border)",
  background: "var(--bg)",
};

const subHeaderLeft: CSSProperties = { gridColumn: "1", justifySelf: "start" };
const subHeaderRight: CSSProperties = { gridColumn: "3" };

const title: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-display)",
  fontSize: 24,
  fontWeight: 400,
  color: "var(--text)",
  letterSpacing: 0.5,
};

const body: CSSProperties = {
  position: "relative",
  flex: 1,
  padding: "40px 32px 80px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 48,
};

const section: CSSProperties = {
  width: "100%",
  maxWidth: 620,
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const sectionHeader: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const sectionKicker: CSSProperties = {
  fontSize: 10,
  letterSpacing: 3,
  textTransform: "uppercase",
  color: "var(--text-muted)",
  fontWeight: 700,
};

const sectionLabel: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-display)",
  fontSize: 22,
  color: "var(--text)",
  letterSpacing: 0.4,
  lineHeight: 1.1,
};

const configCard: CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 22,
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const configRow: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
};

const configMeta: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const configLabel: CSSProperties = {
  fontSize: 10,
  letterSpacing: 2,
  textTransform: "uppercase",
  color: "var(--text-muted)",
  fontWeight: 700,
};

const configValue: CSSProperties = {
  fontSize: 14,
  color: "var(--text)",
};

const configValueMono: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  color: "var(--text)",
};

const pillReady: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "4px 10px",
  background: "var(--success-bg)",
  color: "var(--success-text)",
  border: "1px solid var(--success-border)",
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 1.2,
  alignSelf: "flex-start",
};

const pillDotReady: CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: "var(--success-dot)",
};

const field: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const fieldHead: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 10,
};

const fieldLabel: CSSProperties = {
  fontSize: 11,
  letterSpacing: 1.5,
  textTransform: "uppercase",
  color: "var(--text-muted)",
  fontWeight: 700,
};

const fieldHint: CSSProperties = {
  fontSize: 11,
  color: "var(--text-faint)",
  fontStyle: "italic",
};

const input: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  fontSize: 13,
  fontFamily: "var(--font-mono)",
  background: "var(--bg-input)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  boxSizing: "border-box",
  transition: "border-color 120ms",
};

const inputWithButton: CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "stretch",
};

const testBox: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  padding: "10px 14px",
  border: "1px solid",
  borderRadius: 10,
  fontSize: 12,
};

const testIcon: CSSProperties = {
  fontSize: 16,
  lineHeight: 1,
  marginTop: 1,
};

const testCopy: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  flex: 1,
};

const testTitle: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
};

const testDetail: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  opacity: 0.85,
};

const radioGroup: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const radioOption: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  padding: "10px 12px",
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
  borderRadius: 8,
};

const radio: CSSProperties = {
  marginTop: 3,
  accentColor: "var(--text)",
};

const radioBody: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  flex: 1,
};

const radioLabel: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--text)",
};

const radioDesc: CSSProperties = {
  fontSize: 11,
  color: "var(--text-muted)",
};

const cardActions: CSSProperties = {
  display: "flex",
  gap: 10,
  justifyContent: "flex-end",
};

const btnPrimary: CSSProperties = {
  padding: "9px 16px",
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

const btnDisabled: CSSProperties = {
  ...btnPrimary,
  background: "var(--bg-input)",
  color: "var(--text-muted)",
  cursor: "not-allowed",
};

const btnGhost: CSSProperties = {
  padding: "9px 14px",
  fontSize: 12,
  fontWeight: 600,
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "transparent",
  color: "var(--text-secondary)",
  cursor: "pointer",
  textTransform: "uppercase",
  letterSpacing: 1,
  transition: "background 120ms, color 120ms, border-color 120ms",
};

const btnDanger: CSSProperties = {
  ...btnGhost,
  color: "var(--text-muted)",
};

const emptyHint: CSSProperties = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.55,
  padding: "10px 12px",
  background: "var(--warning-bg)",
  color: "var(--warning-text)",
  border: "1px solid var(--warning-border)",
  borderRadius: 8,
};

const infoCard: CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const infoRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  padding: "10px 14px",
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
  borderRadius: 8,
};

const infoLabel: CSSProperties = {
  fontSize: 10,
  letterSpacing: 2,
  textTransform: "uppercase",
  color: "var(--text-muted)",
  fontWeight: 700,
};

const infoValueMono: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--text)",
};

const infoHelp: CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: "var(--text-secondary)",
  lineHeight: 1.55,
};
