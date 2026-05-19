import type { CSSProperties } from "react";
import { BackButton } from "./BackButton";
import { UpdateChecker } from "./UpdateChecker";
import { getStationId } from "../lib/station";

type Props = { onBack: () => void };

export function SettingsPlaceholder({ onBack }: Props) {
  const stationId = getStationId();
  return (
    <div style={page}>
      <header style={subHeader}>
        <div style={subHeaderLeft}>
          <BackButton onClick={onBack} />
        </div>
        <h2 style={title}>Configurações</h2>
        <div style={subHeaderRight} />
      </header>
      <main style={body}>
        <div style={section}>
          <UpdateChecker />
        </div>
        <div style={card}>
          <div style={badge}>Em breve</div>
          <h3 style={cardTitle}>Configuração de dispositivos e estação</h3>
          <p style={cardText}>
            Aqui vai ficar tudo que precisa ser ajustado por estação ou por
            ambiente. Por enquanto a maioria dessas configs mora em arquivo
            ou variável de ambiente — vamos trazer pra UI conforme o app
            amadurece.
          </p>
          <ul style={list}>
            <li>Impressora RFID (porta USB / IP / status)</li>
            <li>Leitor RFID local (host do proxy HTTPS)</li>
            <li>iTAG cloud endpoint + credenciais (read-only)</li>
            <li>Margem de segurança default (atalho pro modo / valor padrão)</li>
            <li>Estação: ID atual + opção de regenerar (cuidado: muda histórico)</li>
            <li>Tema e fullscreen no boot (auto-aplicar)</li>
            <li>Log de atividade (últimas N ações pra debug)</li>
          </ul>
          <div style={infoLine}>
            <span style={infoLabel}>Estação atual:</span>
            <code style={code}>{stationId}</code>
          </div>
          <p style={footerText}>
            Sem ETA. Volta aqui quando o fluxo principal de impressão estiver maduro.
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
  flexDirection: "column",
  alignItems: "center",
};

const section: CSSProperties = {
  width: "100%",
  maxWidth: 560,
};

const card: CSSProperties = {
  maxWidth: 560,
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

const list: CSSProperties = {
  margin: 0,
  marginBottom: 16,
  paddingLeft: 18,
  fontSize: 12,
  color: "var(--text-secondary)",
  lineHeight: 1.8,
};

const infoLine: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 12px",
  background: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  marginBottom: 14,
  fontSize: 12,
};

const infoLabel: CSSProperties = {
  color: "var(--text-muted)",
  textTransform: "uppercase",
  fontSize: 10,
  letterSpacing: 0.7,
  fontWeight: 600,
};

const code: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--text)",
  background: "var(--bg-input)",
  padding: "2px 8px",
  borderRadius: 4,
};

const footerText: CSSProperties = {
  margin: 0,
  fontSize: 11,
  color: "var(--text-muted)",
  fontStyle: "italic",
};
