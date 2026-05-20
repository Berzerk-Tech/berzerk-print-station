import {
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
  type SVGProps,
} from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { supabase } from "../lib/supabase";
import { getStoredTheme, setTheme, type Theme } from "../lib/theme";
import { BerzerkLogo } from "./BerzerkLogo";
import { AmbientBackground } from "./AmbientBackground";

export type Screen = "home" | "rfid" | "nf" | "settings";

type Props = {
  email: string;
  stationShortId: string;
  onEnter: (screen: Screen) => void;
};

export function HomeMenu({ email, stationShortId, onEnter }: Props) {
  const [theme, setThemeLocal] = useState<Theme>(getStoredTheme());
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const fs = await getCurrentWindow().isFullscreen();
        setIsFullscreen(fs);
      } catch {
        /* não-Tauri */
      }
    })();
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeLocal(next);
  };

  const toggleFullscreen = async () => {
    try {
      const win = getCurrentWindow();
      const fs = await win.isFullscreen();
      await win.setFullscreen(!fs);
      setIsFullscreen(!fs);
    } catch {
      /* ignore */
    }
  };

  return (
    <div style={page}>
      <AmbientBackground />

      <header style={topBar}>
        <div style={topLeft}>
          <BerzerkLogo style={topLogo} />
          <div style={topBrand}>
            <span style={topWordmark}>BERZERK</span>
            <span style={topDivider} />
            <span style={topProduct}>Loom</span>
          </div>
        </div>
        <div style={topRight}>
          <span style={topUser}>{email}</span>
          <span style={topPipe} />
          <span style={topStation}>
            <span style={topStationDot} />
            <code style={topStationCode}>{stationShortId}</code>
          </span>
          <span style={topPipe} />
          <button
            onClick={toggleFullscreen}
            style={iconBtn}
            className="berzerk-icon-btn"
            title={isFullscreen ? "Sair de tela cheia" : "Modo tela cheia"}
            aria-label="Tela cheia"
          >
            {isFullscreen ? <IconShrink style={btnIcon} /> : <IconExpand style={btnIcon} />}
          </button>
          <button
            onClick={toggleTheme}
            style={iconBtn}
            className="berzerk-icon-btn"
            title={theme === "dark" ? "Tema claro" : "Tema escuro"}
            aria-label="Alternar tema"
          >
            {theme === "dark" ? <IconSun style={btnIcon} /> : <IconMoon style={btnIcon} />}
          </button>
          <button
            onClick={() => onEnter("settings")}
            style={iconBtn}
            className="berzerk-icon-btn"
            title="Configurações"
            aria-label="Configurações"
          >
            <IconGear style={btnIcon} />
          </button>
        </div>
      </header>

      <main style={mainCol}>
        <div style={moduleHeading}>
          <span style={moduleHeadingLine} />
          <span style={moduleHeadingText}>Módulos</span>
          <span style={moduleHeadingLine} />
        </div>

        <div style={cardsGrid}>
          <ModuleCard
            label="Etiquetagem"
            description="Aplicar identidade RFID em lotes de produção — lookup de EAN13 (local + Shopify) e impressão com margem de segurança"
            icon={<IconTag style={moduleIcon} />}
            onClick={() => onEnter("rfid")}
            status="ready"
          />
          <ModuleCard
            label="Expedição"
            description="Bipar etiqueta RFID, identificar pedido pronto e imprimir DANFE automática"
            icon={<IconReceipt style={moduleIcon} />}
            onClick={() => onEnter("nf")}
            status="preview"
          />
        </div>
      </main>

      <footer style={footer}>
        <button onClick={() => supabase.auth.signOut()} style={signOutBtn} className="berzerk-text-btn">
          encerrar sessão
        </button>
      </footer>
    </div>
  );
}

function ModuleCard({
  label,
  description,
  icon,
  onClick,
  status,
  disabled,
}: {
  label: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
  status: "ready" | "preview" | "coming-soon" | "offline";
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{ ...moduleCard, ...(disabled ? moduleCardDisabled : {}) }}
      className={disabled ? "" : "berzerk-module-card"}
      disabled={disabled}
    >
      <div style={moduleHead}>
        <div style={moduleIconWrap}>{icon}</div>
        <StatusDot status={status} />
      </div>

      <div style={moduleBody}>
        <h3 style={moduleLabel}>{label}</h3>
        <p style={moduleDesc}>{description}</p>
      </div>

      <div style={moduleFooter}>
        <span style={moduleCta} className="berzerk-cta">
          {disabled ? "Em breve" : "Abrir módulo"}
        </span>
        {!disabled && (
          <span style={moduleArrow} className="berzerk-arrow" aria-hidden="true">→</span>
        )}
      </div>
    </button>
  );
}

function StatusDot({ status }: { status: "ready" | "preview" | "coming-soon" | "offline" }) {
  const tone =
    status === "ready"
      ? { bg: "var(--success-dot)", label: "Operacional" }
      : status === "preview"
        ? { bg: "var(--info-text)", label: "Preview" }
        : status === "offline"
        ? { bg: "var(--danger-text)", label: "Offline" }
        : { bg: "var(--warning-dot)", label: "Em breve" };

  return (
    <span style={statusDotWrap} title={tone.label}>
      <span style={{ ...statusDot, background: tone.bg }} />
    </span>
  );
}

// Hover/style injection
if (typeof document !== "undefined" && !document.getElementById("berzerk-home-keyframes")) {
  const style = document.createElement("style");
  style.id = "berzerk-home-keyframes";
  style.textContent = `
    .berzerk-module-card { position: relative; }
    .berzerk-module-card:hover {
      background: var(--bg-card-hover) !important;
      border-color: var(--border-strong) !important;
      transform: translateY(-2px);
    }
    .berzerk-module-card:hover .berzerk-arrow {
      opacity: 1 !important;
      transform: translateX(4px);
    }
    .berzerk-module-card:hover .berzerk-cta {
      color: var(--text) !important;
    }
    .berzerk-module-card:active { transform: translateY(0); }
    .berzerk-icon-btn:hover {
      background: var(--bg-card-hover) !important;
      color: var(--text) !important;
      border-color: var(--border-strong) !important;
    }
    .berzerk-text-btn:hover { color: var(--text) !important; }
  `;
  document.head.appendChild(style);
}

// === ICONS ===

function IconTag(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

function IconReceipt(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}

function IconSun(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function IconMoon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function IconExpand(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

function IconShrink(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" />
      <line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

function IconGear(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

// === STYLES ===

const page: CSSProperties = {
  minHeight: "100vh",
  background: "var(--bg)",
  color: "var(--text)",
  display: "flex",
  flexDirection: "column",
  position: "relative",
  overflow: "hidden",
};

const topBar: CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "18px 32px",
  borderBottom: "1px solid var(--border)",
  gap: 16,
};

const topLeft: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
};

const topLogo: CSSProperties = {
  width: 26,
  height: 28,
  color: "var(--text)",
};

const topBrand: CSSProperties = {
  display: "flex",
  alignItems: "center", // fix: era "baseline", causava desalinho com Anton
  gap: 12,
};

const topWordmark: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 22,
  letterSpacing: 1,
  color: "var(--text)",
  lineHeight: 1,
  // Visual hack: Anton tem cap-height grande, empurra o baseline. Translate corrige.
  transform: "translateY(1px)",
};

const topDivider: CSSProperties = {
  width: 1,
  height: 16,
  background: "var(--border-strong)",
};

const topProduct: CSSProperties = {
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: 3,
  color: "var(--text-secondary)",
  fontWeight: 600,
};

const topRight: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const topUser: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--text-secondary)",
  letterSpacing: 0.3,
};

const topPipe: CSSProperties = {
  width: 1,
  height: 14,
  background: "var(--border)",
};

const topStation: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
};

const topStationDot: CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: "var(--success-dot)",
  boxShadow: "0 0 0 3px var(--success-bg)",
};

const topStationCode: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--text)",
  letterSpacing: 0.5,
};

const iconBtn: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 32,
  height: 32,
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text-secondary)",
  cursor: "pointer",
  transition: "background 120ms, color 120ms, border-color 120ms",
};

const btnIcon: CSSProperties = { width: 15, height: 15 };

const mainCol: CSSProperties = {
  position: "relative",
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "64px 32px",
  gap: 32,
  maxWidth: 1080,
  width: "100%",
  margin: "0 auto",
  boxSizing: "border-box",
};

const moduleHeading: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  width: "100%",
};

const moduleHeadingLine: CSSProperties = {
  flex: 1,
  height: 1,
  background: "var(--border)",
};

const moduleHeadingText: CSSProperties = {
  fontSize: 10,
  letterSpacing: 4,
  textTransform: "uppercase",
  color: "var(--text-muted)",
  fontWeight: 700,
};

const cardsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 18,
  width: "100%",
};

const moduleCard: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: 22,
  padding: "28px 26px",
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  cursor: "pointer",
  textAlign: "left",
  color: "var(--text)",
  transition: "background 160ms, border-color 160ms, transform 160ms",
  minHeight: 220,
  fontFamily: "inherit",
};

const moduleCardDisabled: CSSProperties = {
  cursor: "not-allowed",
  opacity: 0.5,
};

const moduleHead: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
};

const moduleIconWrap: CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 10,
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
  display: "grid",
  placeItems: "center",
  color: "var(--text)",
};

const moduleIcon: CSSProperties = {
  width: 20,
  height: 20,
};

const statusDotWrap: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: 6,
};

const statusDot: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
};

const moduleBody: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  flex: 1,
};

const moduleLabel: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-sans)",
  fontSize: 18,
  fontWeight: 600,
  color: "var(--text)",
  letterSpacing: -0.2,
  lineHeight: 1.2,
};

const moduleDesc: CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: "var(--text-secondary)",
  lineHeight: 1.55,
};

const moduleFooter: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  paddingTop: 14,
  borderTop: "1px solid var(--border)",
  marginTop: "auto",
};

const moduleCta: CSSProperties = {
  fontSize: 10,
  letterSpacing: 2,
  textTransform: "uppercase",
  color: "var(--text-muted)",
  fontWeight: 700,
  transition: "color 160ms",
};

const moduleArrow: CSSProperties = {
  fontSize: 18,
  color: "var(--text)",
  opacity: 0,
  transition: "opacity 160ms, transform 160ms",
};

const footer: CSSProperties = {
  position: "relative",
  display: "flex",
  justifyContent: "center",
  padding: "18px 32px",
  borderTop: "1px solid var(--border)",
};

const signOutBtn: CSSProperties = {
  background: "transparent",
  border: 0,
  color: "var(--text-muted)",
  cursor: "pointer",
  fontSize: 10,
  padding: "4px 8px",
  textTransform: "uppercase",
  letterSpacing: 2,
  fontWeight: 600,
  transition: "color 160ms",
};
