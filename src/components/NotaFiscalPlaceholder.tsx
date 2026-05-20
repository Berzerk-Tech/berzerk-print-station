import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { BackButton } from "./BackButton";
import { AmbientBackground } from "./AmbientBackground";

type Props = { onBack: () => void };

// Estados do fluxo de expedição:
// idle      → esperando uma bipada
// looking   → buscou EPC, aguardando resposta
// found     → pedido identificado, mostrando dados pra confirmar
// printing  → enviando DANFE pra impressora
// error     → algo deu errado, mostrando o que e como tentar de novo
type FlowState =
  | { kind: "idle" }
  | { kind: "looking"; epc: string }
  | { kind: "found"; order: MockOrder }
  | { kind: "printing"; order: MockOrder }
  | { kind: "printed"; order: MockOrder }
  | { kind: "error"; message: string };

type MockOrder = {
  number: string;
  customer: string;
  city: string;
  uf: string;
  itemCount: number;
  total: string;
  channel: string;
};

export function NotaFiscalPlaceholder({ onBack }: Props) {
  const [state, setState] = useState<FlowState>({ kind: "idle" });
  const [scan, setScan] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const recentScans = useRef<Array<{ epc: string; order: string; at: Date }>>([]);

  // Foca input automaticamente quando volta pra idle (pra próxima bipada)
  useEffect(() => {
    if (state.kind === "idle" || state.kind === "printed") {
      inputRef.current?.focus();
    }
  }, [state.kind]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const epc = scan.trim();
    if (!epc) return;
    setScan("");
    setState({ kind: "looking", epc });

    // MOCK: simula lookup. Integração real virá quando matarmos o proxy e
    // o app falar direto com o iTAG Monitor + chamar a edge function tiny-track-order
    // / yampi-track-order pra buscar o pedido pelo EPC.
    setTimeout(() => {
      const mock: MockOrder = {
        number: `BRZ-${10000 + Math.floor(Math.random() * 9000)}`,
        customer: "Cliente Demonstração",
        city: "São Paulo",
        uf: "SP",
        itemCount: 3,
        total: "R$ 287,90",
        channel: "Shopify",
      };
      setState({ kind: "found", order: mock });
    }, 600);
  }

  function handlePrint() {
    if (state.kind !== "found") return;
    const order = state.order;
    setState({ kind: "printing", order });

    setTimeout(() => {
      recentScans.current.unshift({
        epc: "FAKE-EPC",
        order: order.number,
        at: new Date(),
      });
      recentScans.current = recentScans.current.slice(0, 10);
      setState({ kind: "printed", order });
      // Reset depois de 2.5s pra estar pronto pra próxima
      setTimeout(() => setState({ kind: "idle" }), 2500);
    }, 1200);
  }

  function handleCancel() {
    setState({ kind: "idle" });
  }

  return (
    <div style={page}>
      <AmbientBackground variant="flat" />

      <header style={subHeader}>
        <div style={subHeaderLeft}>
          <BackButton onClick={onBack} />
        </div>
        <h2 style={title}>Expedição</h2>
        <div style={subHeaderRight}>
          <span style={badge}>preview</span>
        </div>
      </header>

      <main style={body}>
        <div style={mainCol}>
          <ScanBox
            inputRef={inputRef}
            scan={scan}
            setScan={setScan}
            onSubmit={handleSubmit}
            state={state}
          />

          <div style={resultArea}>
            {state.kind === "idle" && <IdleHint />}
            {state.kind === "looking" && <LookingState epc={state.epc} />}
            {state.kind === "found" && (
              <FoundState order={state.order} onPrint={handlePrint} onCancel={handleCancel} />
            )}
            {state.kind === "printing" && <PrintingState order={state.order} />}
            {state.kind === "printed" && <PrintedState order={state.order} />}
            {state.kind === "error" && <ErrorState message={state.message} />}
          </div>

          <RecentList items={recentScans.current} />
        </div>

        <aside style={sidebar}>
          <SidebarKicker>― Em desenvolvimento ―</SidebarKicker>
          <p style={sidebarText}>
            Esta tela é o esqueleto da Expedição. Atualmente os dados do pedido são
            <strong style={sidebarStrong}> simulados</strong> — qualquer EPC bipado retorna
            um pedido fictício após ~600ms.
          </p>
          <SidebarKicker>O que falta pra ir pra produção</SidebarKicker>
          <ul style={sidebarList}>
            <li>Conexão direta com iTAG Monitor (matar proxy)</li>
            <li>Lookup do EPC nos pedidos abertos via edge function</li>
            <li>Geração e impressão da DANFE de fato</li>
            <li>Persistência das expedições em <code>shipments</code></li>
          </ul>
        </aside>
      </main>
    </div>
  );
}

// === Sub-components ===

function ScanBox({
  inputRef,
  scan,
  setScan,
  onSubmit,
  state,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  scan: string;
  setScan: (s: string) => void;
  onSubmit: (e: FormEvent) => void;
  state: FlowState;
}) {
  const disabled = state.kind === "looking" || state.kind === "printing";
  return (
    <form onSubmit={onSubmit} style={scanForm}>
      <div style={scanRing}>
        <ScanIcon />
      </div>
      <div style={scanCenter}>
        <span style={scanKicker}>― Aguardando bipada ―</span>
        <input
          ref={inputRef}
          autoFocus
          disabled={disabled}
          value={scan}
          onChange={(e) => setScan(e.target.value)}
          placeholder="Bipe a etiqueta RFID ou digite o EPC e tecle Enter"
          style={scanInput}
          className="berzerk-scan-input"
        />
        <span style={scanHint}>
          O cursor deste campo deve estar sempre ativo — quando o leitor RFID bipa,
          o EPC é digitado automaticamente aqui.
        </span>
      </div>
    </form>
  );
}

function IdleHint() {
  return (
    <div style={hintBox}>
      <p style={hintTitle}>Pronto pra próxima bipada</p>
      <p style={hintText}>
        O pedido será identificado automaticamente assim que o leitor capturar o EPC.
      </p>
    </div>
  );
}

function LookingState({ epc }: { epc: string }) {
  return (
    <div style={stateCard}>
      <span style={kicker}>― Buscando pedido ―</span>
      <code style={epcCode}>{epc}</code>
      <p style={hintText}>Consultando lookup de EPC → pedido. Isso leva alguns segundos.</p>
    </div>
  );
}

function FoundState({
  order,
  onPrint,
  onCancel,
}: {
  order: MockOrder;
  onPrint: () => void;
  onCancel: () => void;
}) {
  return (
    <div style={stateCard}>
      <div style={foundHeader}>
        <span style={kicker}>― Pedido identificado ―</span>
        <span style={pillChannel}>{order.channel}</span>
      </div>
      <h3 style={orderNumber}>{order.number}</h3>

      <div style={orderRows}>
        <OrderRow label="Cliente" value={order.customer} />
        <OrderRow label="Destino" value={`${order.city} / ${order.uf}`} />
        <OrderRow label="Itens" value={`${order.itemCount}`} />
        <OrderRow label="Total" value={order.total} />
      </div>

      <div style={actions}>
        <button type="button" onClick={onCancel} style={btnGhost} className="berzerk-btn-ghost">
          Cancelar
        </button>
        <button type="button" onClick={onPrint} style={btnPrimary} className="berzerk-btn-primary">
          Imprimir DANFE →
        </button>
      </div>
    </div>
  );
}

function PrintingState({ order }: { order: MockOrder }) {
  return (
    <div style={stateCard}>
      <span style={kicker}>― Imprimindo ―</span>
      <h3 style={orderNumber}>{order.number}</h3>
      <div style={progressBar}>
        <div style={progressFill} />
      </div>
      <p style={hintText}>Enviando DANFE pra impressora térmica…</p>
    </div>
  );
}

function PrintedState({ order }: { order: MockOrder }) {
  return (
    <div style={stateCardSuccess}>
      <span style={kickerSuccess}>― Despachado ―</span>
      <h3 style={orderNumber}>{order.number}</h3>
      <p style={hintText}>
        DANFE impressa. Aplique no pacote e mova pra área de coleta.
      </p>
      <span style={pillReady}>
        <span style={pillReadyDot} /> Pronto pra próxima
      </span>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div style={stateCardError}>
      <span style={kickerError}>― Falhou ―</span>
      <p style={errorMessage}>{message}</p>
    </div>
  );
}

function RecentList({ items }: { items: Array<{ epc: string; order: string; at: Date }> }) {
  if (items.length === 0) return null;
  return (
    <div style={recentBox}>
      <span style={kicker}>― Despachados nesta sessão ({items.length}) ―</span>
      <ul style={recentList}>
        {items.map((item, i) => (
          <li key={i} style={recentItem}>
            <code style={recentOrder}>{item.order}</code>
            <span style={recentMeta}>
              {item.at.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OrderRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={orderRow}>
      <span style={orderRowLabel}>{label}</span>
      <span style={orderRowValue}>{value}</span>
    </div>
  );
}

function SidebarKicker({ children }: { children: React.ReactNode }) {
  return <span style={sidebarKicker}>{children}</span>;
}

function ScanIcon() {
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="2" height="12" />
      <rect x="7" y="6" width="1" height="12" />
      <rect x="10" y="6" width="3" height="12" />
      <rect x="15" y="6" width="1" height="12" />
      <rect x="18" y="6" width="2" height="12" />
    </svg>
  );
}

// === Hover CSS ===

if (typeof document !== "undefined" && !document.getElementById("berzerk-nf-styles")) {
  const style = document.createElement("style");
  style.id = "berzerk-nf-styles";
  style.textContent = `
    @keyframes berzerk-progress-print {
      0%   { transform: translateX(-100%); width: 30%; }
      50%  { width: 60%; }
      100% { transform: translateX(250%); width: 30%; }
    }
    .berzerk-scan-input:focus {
      outline: none;
      border-color: var(--text) !important;
      background: var(--bg-elevated) !important;
    }
    .berzerk-btn-primary:hover { background: var(--accent-hover) !important; }
    .berzerk-btn-ghost:hover {
      background: var(--bg-card-hover) !important;
      border-color: var(--border-strong) !important;
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
const subHeaderRight: CSSProperties = { gridColumn: "3", justifySelf: "end" };

const title: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-display)",
  fontSize: 24,
  fontWeight: 400,
  color: "var(--text)",
  letterSpacing: 0.5,
};

const badge: CSSProperties = {
  fontSize: 10,
  letterSpacing: 1.5,
  textTransform: "uppercase",
  color: "var(--warning-text)",
  background: "var(--warning-bg)",
  border: "1px solid var(--warning-border)",
  padding: "3px 9px",
  borderRadius: 999,
  fontWeight: 700,
};

const body: CSSProperties = {
  position: "relative",
  flex: 1,
  padding: "32px 40px 64px",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 300px",
  gap: 32,
  maxWidth: 1280,
  width: "100%",
  margin: "0 auto",
  boxSizing: "border-box",
};

const mainCol: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 28,
  minWidth: 0,
};

const scanForm: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 20,
  padding: 24,
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 16,
};

const scanRing: CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: 16,
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
  display: "grid",
  placeItems: "center",
  color: "var(--text)",
  flexShrink: 0,
};

const scanCenter: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const scanKicker: CSSProperties = {
  fontSize: 10,
  letterSpacing: 3,
  textTransform: "uppercase",
  color: "var(--text-muted)",
  fontWeight: 700,
};

const scanInput: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  fontSize: 16,
  fontFamily: "var(--font-mono)",
  background: "var(--bg-input)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  boxSizing: "border-box",
  transition: "border-color 120ms, background 120ms",
};

const scanHint: CSSProperties = {
  fontSize: 11,
  color: "var(--text-faint)",
  fontStyle: "italic",
};

const resultArea: CSSProperties = {
  minHeight: 280,
};

const hintBox: CSSProperties = {
  padding: "32px 24px",
  background: "transparent",
  border: "1px dashed var(--border)",
  borderRadius: 12,
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const hintTitle: CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 600,
  color: "var(--text-secondary)",
};

const hintText: CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: "var(--text-muted)",
  lineHeight: 1.55,
};

const stateCard: CSSProperties = {
  padding: 24,
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const stateCardSuccess: CSSProperties = {
  ...stateCard,
  background: "var(--success-bg)",
  borderColor: "var(--success-border)",
};

const stateCardError: CSSProperties = {
  ...stateCard,
  background: "var(--danger-bg)",
  borderColor: "var(--danger-border)",
};

const kicker: CSSProperties = {
  fontSize: 10,
  letterSpacing: 3,
  textTransform: "uppercase",
  color: "var(--text-muted)",
  fontWeight: 700,
};

const kickerSuccess: CSSProperties = {
  ...kicker,
  color: "var(--success-text)",
};

const kickerError: CSSProperties = {
  ...kicker,
  color: "var(--danger-text)",
};

const foundHeader: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const pillChannel: CSSProperties = {
  fontSize: 10,
  letterSpacing: 1,
  textTransform: "uppercase",
  color: "var(--info-text)",
  background: "var(--info-bg)",
  border: "1px solid var(--info-border)",
  padding: "3px 10px",
  borderRadius: 999,
  fontWeight: 700,
};

const orderNumber: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 24,
  fontWeight: 600,
  color: "var(--text)",
  letterSpacing: 0.5,
};

const epcCode: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 14,
  color: "var(--text)",
  padding: "8px 12px",
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  alignSelf: "flex-start",
};

const orderRows: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
};

const orderRow: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 3,
  padding: "10px 12px",
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
  borderRadius: 8,
};

const orderRowLabel: CSSProperties = {
  fontSize: 10,
  letterSpacing: 1.5,
  textTransform: "uppercase",
  color: "var(--text-muted)",
  fontWeight: 700,
};

const orderRowValue: CSSProperties = {
  fontSize: 14,
  color: "var(--text)",
  fontWeight: 500,
};

const actions: CSSProperties = {
  display: "flex",
  gap: 10,
  justifyContent: "flex-end",
  marginTop: 6,
};

const btnPrimary: CSSProperties = {
  padding: "11px 18px",
  fontSize: 13,
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

const btnGhost: CSSProperties = {
  padding: "11px 16px",
  fontSize: 13,
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

const progressBar: CSSProperties = {
  height: 6,
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
  borderRadius: 999,
  overflow: "hidden",
};

const progressFill: CSSProperties = {
  height: "100%",
  background: "var(--text)",
  animation: "berzerk-progress-print 1.5s ease-in-out infinite",
};

const pillReady: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "4px 10px",
  background: "var(--bg-card)",
  border: "1px solid var(--success-border)",
  color: "var(--success-text)",
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 1.2,
  alignSelf: "flex-start",
};

const pillReadyDot: CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: "var(--success-dot)",
};

const errorMessage: CSSProperties = {
  margin: 0,
  fontSize: 14,
  color: "var(--danger-text)",
  lineHeight: 1.55,
};

const recentBox: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const recentList: CSSProperties = {
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const recentItem: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 12px",
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

const recentOrder: CSSProperties = {
  fontFamily: "var(--font-mono)",
  color: "var(--text)",
};

const recentMeta: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--text-muted)",
};

const sidebar: CSSProperties = {
  padding: 22,
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  alignSelf: "flex-start",
  position: "sticky",
  top: 100,
};

const sidebarKicker: CSSProperties = {
  fontSize: 10,
  letterSpacing: 3,
  textTransform: "uppercase",
  color: "var(--text-muted)",
  fontWeight: 700,
};

const sidebarText: CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: "var(--text-secondary)",
  lineHeight: 1.6,
};

const sidebarStrong: CSSProperties = {
  color: "var(--text)",
};

const sidebarList: CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  fontSize: 12,
  color: "var(--text-secondary)",
  lineHeight: 1.7,
};
