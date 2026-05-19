import type { CSSProperties } from "react";
import { BackButton } from "./BackButton";

type Props = { onBack: () => void };

export function NotaFiscalPlaceholder({ onBack }: Props) {
  return (
    <div style={page}>
      <header style={subHeader}>
        <div style={subHeaderLeft}>
          <BackButton onClick={onBack} />
        </div>
        <h2 style={title}>Impressão de NF</h2>
        <div style={subHeaderRight} />
      </header>
      <main style={body}>
        <div style={card}>
          <div style={badge}>Em breve</div>
          <h3 style={cardTitle}>
            Bipar etiqueta RFID → identificar pedido → imprimir DANFE
          </h3>
          <p style={cardText}>
            Esta tela vai consolidar o fluxo do{" "}
            <code style={code}>/impressao-nf</code> do minhacontaberzerk numa
            estação dedicada. Operador escaneia a tag RFID no pacote e o sistema
            identifica o pedido, busca a DANFE no Tiny ERP e imprime
            automaticamente.
          </p>
          <ul style={list}>
            <li>Conexão com leitor RFID local (via proxy HTTPS)</li>
            <li>Lookup EPC → pedido via Supabase</li>
            <li>Fetch + impressão da DANFE PDF</li>
            <li>Histórico de NFs do dia (igual web)</li>
          </ul>
          <p style={footer}>
            Sem ETA. Stand-by até o fluxo do RFID Print Station estar maduro.
          </p>
        </div>
      </main>
    </div>
  );
}

const page: CSSProperties = {
  minHeight: "100vh",
  background: "var(--bg)",
  color: "var(--text)",
  display: "flex",
  flexDirection: "column",
};

const subHeader: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  alignItems: "center",
  gap: 18,
  padding: "22px 40px",
  borderBottom: "1px solid var(--border)",
};

const subHeaderLeft: CSSProperties = {
  gridColumn: "1",
  justifySelf: "start",
};

const subHeaderRight: CSSProperties = {
  gridColumn: "3",
};

const title: CSSProperties = {
  margin: 0,
  fontSize: 15,
  fontWeight: 600,
  color: "var(--text)",
  letterSpacing: -0.2,
};

const body: CSSProperties = {
  flex: 1,
  padding: "32px",
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
};

const card: CSSProperties = {
  maxWidth: 520,
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 28,
};

const badge: CSSProperties = {
  display: "inline-block",
  background: "var(--warning-bg)",
  color: "var(--warning-text)",
  border: "1px solid var(--warning-border)",
  padding: "3px 9px",
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 1,
  marginBottom: 14,
};

const cardTitle: CSSProperties = {
  margin: 0,
  marginBottom: 12,
  fontSize: 16,
  fontWeight: 600,
  color: "var(--text)",
};

const cardText: CSSProperties = {
  margin: 0,
  marginBottom: 14,
  fontSize: 13,
  color: "var(--text-secondary)",
  lineHeight: 1.6,
};

const code: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  background: "var(--bg-input)",
  padding: "1px 6px",
  borderRadius: 4,
  color: "var(--text)",
};

const list: CSSProperties = {
  margin: 0,
  marginBottom: 16,
  paddingLeft: 18,
  fontSize: 12,
  color: "var(--text-secondary)",
  lineHeight: 1.8,
};

const footer: CSSProperties = {
  margin: 0,
  fontSize: 11,
  color: "var(--text-muted)",
  fontStyle: "italic",
};
