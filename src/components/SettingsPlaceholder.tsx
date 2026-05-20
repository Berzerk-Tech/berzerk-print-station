import type { CSSProperties } from "react";
import { BackButton } from "./BackButton";
import { UpdateChecker } from "./UpdateChecker";
import { AmbientBackground } from "./AmbientBackground";
import { getStationId } from "../lib/station";

type Props = { onBack: () => void };

export function SettingsPlaceholder({ onBack }: Props) {
  const stationId = getStationId();

  return (
    <div style={page}>
      <AmbientBackground />

      <header style={subHeader}>
        <div style={subHeaderLeft}>
          <BackButton onClick={onBack} />
        </div>
        <h2 style={title}>Configurações</h2>
        <div style={subHeaderRight} />
      </header>

      <main style={body}>
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

        <div style={section}>
          <SectionHeader kicker="Roadmap" label="Configurações futuras" />
          <div style={roadmapCard}>
            <p style={roadmapIntro}>
              Por enquanto a maioria dessas configs vive em arquivo/env. Conforme o fluxo
              principal amadurece, vão migrar pra esta tela:
            </p>
            <ul style={roadmapList}>
              <RoadmapItem text="Impressora RFID — porta USB / IP / status" />
              <RoadmapItem text="Leitor RFID local — host do proxy HTTPS" />
              <RoadmapItem text="iTAG cloud endpoint + credenciais (read-only)" />
              <RoadmapItem text="Margem de segurança default (atalho pro modo / valor padrão)" />
              <RoadmapItem text="Estação — opção de regenerar ID (cuidado: muda histórico)" />
              <RoadmapItem text="Tema e fullscreen no boot (auto-aplicar)" />
              <RoadmapItem text="Log de atividade — últimas N ações pra debug" />
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

function SectionHeader({ kicker, label }: { kicker: string; label: string }) {
  return (
    <div style={sectionHeader}>
      <span style={sectionKicker}>― {kicker} ―</span>
      <h3 style={sectionLabel}>{label}</h3>
    </div>
  );
}

function RoadmapItem({ text }: { text: string }) {
  return (
    <li style={roadmapItem}>
      <span style={roadmapBullet} />
      <span>{text}</span>
    </li>
  );
}

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
  fontFamily: "var(--font-display)",
  fontSize: 24,
  fontWeight: 400,
  color: "var(--text)",
  letterSpacing: 0.5,
};

const body: CSSProperties = {
  position: "relative",
  flex: 1,
  padding: "40px 32px 64px",
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

const roadmapCard: CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 24,
};

const roadmapIntro: CSSProperties = {
  margin: 0,
  marginBottom: 16,
  fontSize: 13,
  color: "var(--text-secondary)",
  lineHeight: 1.55,
};

const roadmapList: CSSProperties = {
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const roadmapItem: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  fontSize: 12,
  color: "var(--text-secondary)",
  lineHeight: 1.6,
};

const roadmapBullet: CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: "var(--text-faint)",
  flexShrink: 0,
};
