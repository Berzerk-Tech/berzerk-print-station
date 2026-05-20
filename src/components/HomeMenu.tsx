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
      <div style={ambientGrid} aria-hidden="true" />

      <header style={topBar}>
        <div style={topLeft}>
          <BerzerkLogo style={topLogo} />
          <div style={topBrand}>
            <span style={topWordmark}>BERZERK</span>
            <span style={topDivider} />
            <span style={topProduct}>Print Station</span>
          </div>
        </div>
        <div style={topRight}>
          <StatusPill dot label={`Estação ${stationShortId}`} />
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
        <div style={heroBlock}>
          <p style={heroKicker}>― Operador autenticado ―</p>
          <h1 style={heroEmail}>{email}</h1>
        </div>

        <div style={moduleHeading}>
          <span style={moduleHeadingLine} />
          <span style={moduleHeadingText}>Módulos</span>
          <span style={moduleHeadingLine} />
        </div>

        <div style={cardsGrid}>
          <ModuleCard
            number="01"
            label="Imprimir RFID"
            description="Browse de lotes confirmados, lookup de EAN13 (local + Shopify), impressão com margem de segurança"
            icon={<IconTag style={moduleIcon} />}
            onClick={() => onEnter("rfid")}
            status="pronto"
          />
          <ModuleCard
            number="02"
            label="Impressão de NF"
            description="Bipar etiqueta RFID, identificar pedido, imprimir DANFE automática"
            icon={<IconReceipt style={moduleIcon} />}
            onClick={() => onEnter("nf")}
            status="em-breve"
            disabled
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

function StatusPill({ label, dot }: { label: string; dot?: boolean }) {
  return (
    <span style={statusPill}>
      {dot && <span style={statusDot} />}
      <span style={statusLabel}>{label}</span>
    </span>
  );
}

function ModuleCard({
  number,
  label,
  description,
  icon,
  onClick,
  status,
  disabled,
}: {
  number: string;
  label: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
  status: "pronto" | "em-breve" | "offline";
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{ ...moduleCard, ...(disabled ? moduleCardDisabled : {}) }}
      className={disabled ? "" : "berzerk-module-card"}
      disabled={disabled}
    >
      <div style={moduleTopRow}>
        <span style={moduleNumber}>{number}</span>
        <ModuleStatusBadge status={status} />
      </div>
      <div style={moduleIconWrap}>{icon}</div>
      <h3 style={moduleLabel}>{label}</h3>
      <p style={moduleDesc}>{description}</p>
      <div style={moduleFooter}>
        <span style={moduleCta} className="berzerk-cta">
          {status === "em-breve" ? "Indisponível" : "Abrir módulo"}
        </span>
        {!disabled && (
          <span style={moduleArrow} className="berzerk-arrow" aria-hidden="true">→</span>
        )}
      </div>
    </button>
  );
}

function ModuleStatusBadge({ status }: { status: "pronto" | "em-breve" | "offline" }) {
  const styles =
    status === "pronto"
      ? { bg: "var(--success-bg)", text: "var(--success-text)", border: "var(--success-border)", dot: "var(--success-dot)", label: "Operacional" }
      : status === "offline"
        ? { bg: "var(--danger-bg)", text: "var(--danger-text)", border: "var(--danger-border)", dot: "currentColor", label: "Offline" }
        : { bg: "var(--warning-bg)", text: "var(--warning-text)", border: "var(--warning-border)", dot: "var(--warning-dot)", label: "Em breve" };

  return (
    <span style={{ ...badge, background: styles.bg, color: styles.text, borderColor: styles.border }}>
      <span style={{ ...badgeDot, background: styles.dot }} />
      {styles.label}
    </span>
  );
}

// Hover/style injection
if (typeof document !== "undefined" && !document.getElementById("berzerk-home-keyframes")) {
  const style = document.createElement("style");
  style.id = "berzerk-home-keyframes";
  style.textContent = `
    .berzerk-module-card {
      position: relative;
    }
    .berzerk-module-card:hover {
      background: var(--bg-card-hover) !important;
      border-color: var(--border-strong) !important;
      transform: translateY(-3px);
    }
    .berzerk-module-card:hover .berzerk-arrow {
      opacity: 1 !important;
      transform: translateX(4px);
    }
    .berzerk-module-card:hover .berzerk-cta {
      color: var(--text) !important;
    }
    .berzerk-module-card:active {
      transform: translateY(-1px);
    }
    .berzerk-icon-btn:hover {
      background: var(--bg-card-hover) !important;
      color: var(--text) !important;
      border-color: var(--border-strong) !important;
    }
    .berzerk-text-btn:hover {
      color: var(--text) !important;
    }
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
};

const ambientGrid: CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundImage:
    "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
  backgroundSize: "48px 48px",
  opacity: 0.18,
  maskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 100%)",
  WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 100%)",
  pointerEvents: "none",
};

const topBar: CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "20px 40px",
  borderBottom: "1px solid var(--border)",
  gap: 16,
};

const topLeft: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
};

const topLogo: CSSProperties = {
  width: 28,
  height: 30,
  color: "var(--text)",
};

const topBrand: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 10,
};

const topWordmark: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 22,
  letterSpacing: 1,
  color: "var(--text)",
  lineHeight: 1,
};

const topDivider: CSSProperties = {
  width: 1,
  height: 14,
  background: "var(--border-strong)",
  alignSelf: "center",
};

const topProduct: CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 3,
  color: "var(--text-secondary)",
  fontWeight: 500,
};

const topRight: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const statusPill: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 12px",
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 999,
  marginRight: 8,
};

const statusDot: CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: "50%",
  background: "var(--success-dot)",
  boxShadow: "0 0 0 3px var(--success-bg)",
};

const statusLabel: CSSProperties = {
  fontSize: 11,
  fontFamily: "var(--font-mono)",
  color: "var(--text-secondary)",
  letterSpacing: 0.4,
};

const iconBtn: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 36,
  height: 36,
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text-secondary)",
  cursor: "pointer",
  transition: "background 120ms, color 120ms, border-color 120ms",
};

const btnIcon: CSSProperties = { width: 16, height: 16 };

const mainCol: CSSProperties = {
  position: "relative",
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "48px 32px",
  gap: 48,
  maxWidth: 1100,
  width: "100%",
  margin: "0 auto",
  boxSizing: "border-box",
};

const heroBlock: CSSProperties = {
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const heroKicker: CSSProperties = {
  margin: 0,
  fontSize: 11,
  letterSpacing: 4,
  textTransform: "uppercase",
  color: "var(--text-muted)",
  fontWeight: 600,
};

const heroEmail: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 18,
  color: "var(--text)",
  fontWeight: 500,
  letterSpacing: 0.3,
};

const moduleHeading: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  width: "100%",
  maxWidth: 1100,
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
  alignItems: "flex-start",
  gap: 14,
  padding: 26,
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  cursor: "pointer",
  textAlign: "left",
  color: "var(--text)",
  transition: "background 160ms, border-color 160ms, transform 160ms",
  minHeight: 240,
  fontFamily: "inherit",
};

const moduleCardDisabled: CSSProperties = {
  cursor: "not-allowed",
  opacity: 0.55,
};

const moduleTopRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
};

const moduleNumber: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--text-muted)",
  fontWeight: 600,
  letterSpacing: 1.5,
};

const badge: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 9,
  fontWeight: 700,
  padding: "3px 9px",
  borderRadius: 999,
  border: "1px solid",
  textTransform: "uppercase",
  letterSpacing: 1.2,
};

const badgeDot: CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: "50%",
};

const moduleIconWrap: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 10,
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
  display: "grid",
  placeItems: "center",
  color: "var(--text)",
  marginTop: 4,
};

const moduleIcon: CSSProperties = {
  width: 22,
  height: 22,
};

const moduleLabel: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-display)",
  fontSize: 30,
  color: "var(--text)",
  letterSpacing: 0.5,
  lineHeight: 1,
};

const moduleDesc: CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: "var(--text-secondary)",
  lineHeight: 1.55,
  flex: 1,
};

const moduleFooter: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  paddingTop: 12,
  borderTop: "1px solid var(--border)",
  marginTop: "auto",
};

const moduleCta: CSSProperties = {
  fontSize: 11,
  letterSpacing: 1.5,
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
  padding: "20px 32px",
  borderTop: "1px solid var(--border)",
};

const signOutBtn: CSSProperties = {
  background: "transparent",
  border: 0,
  color: "var(--text-muted)",
  cursor: "pointer",
  fontSize: 11,
  padding: "4px 8px",
  textTransform: "uppercase",
  letterSpacing: 2,
  fontWeight: 600,
  transition: "color 160ms",
};
