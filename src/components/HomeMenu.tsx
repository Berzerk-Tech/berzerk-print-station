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
      <header style={topBar}>
        <div style={brand}>
          <span style={wordmark}>BERZERK</span>
          <BerzerkLogo style={logoStyle} />
        </div>
        <div style={actions}>
          <button
            onClick={toggleFullscreen}
            style={iconBtn}
            title={isFullscreen ? "Sair de tela cheia" : "Modo tela cheia"}
            aria-label="Tela cheia"
          >
            {isFullscreen ? <IconShrink style={btnIcon} /> : <IconExpand style={btnIcon} />}
          </button>
          <button
            onClick={toggleTheme}
            style={iconBtn}
            title={theme === "dark" ? "Tema claro" : "Tema escuro"}
            aria-label="Alternar tema"
          >
            {theme === "dark" ? <IconSun style={btnIcon} /> : <IconMoon style={btnIcon} />}
          </button>
          <button
            onClick={() => onEnter("settings")}
            style={iconBtn}
            title="Configurações"
            aria-label="Configurações"
          >
            <IconGear style={btnIcon} />
          </button>
        </div>
      </header>

      <main style={mainCol}>
        <div style={greeting}>
          <p style={hi}>
            Olá, <span style={hiEmail}>{email}</span>
          </p>
          <p style={hiSub}>
            Estação <span style={hiStation}>{stationShortId}</span>
          </p>
        </div>

        <div style={cardsGrid}>
          <ModuleCard
            label="Imprimir RFID"
            description="Browse de lotes confirmados, lookup de EAN13 (local + Shopify), impressão com margem de segurança"
            icon={<IconTag style={moduleIcon} />}
            onClick={() => onEnter("rfid")}
          />
          <ModuleCard
            label="Impressão de NF"
            description="Bipar etiqueta RFID, identificar pedido, imprimir DANFE automática"
            icon={<IconReceipt style={moduleIcon} />}
            onClick={() => onEnter("nf")}
            badge="Em breve"
          />
        </div>
      </main>

      <footer style={footer}>
        <button onClick={() => supabase.auth.signOut()} style={signOutBtn}>
          sair
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
  badge,
}: {
  label: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button onClick={onClick} style={moduleCard}>
      <div style={moduleIconWrap}>{icon}</div>
      <div style={moduleHeader}>
        <span style={moduleLabel}>{label}</span>
        {badge && <span style={moduleBadge}>{badge}</span>}
      </div>
      <p style={moduleDesc}>{description}</p>
    </button>
  );
}

function IconTag(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

function IconReceipt(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
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
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function IconMoon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function IconExpand(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

function IconGear(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconShrink(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="4 14 10 14 10 20" />
      <polyline points="20 10 14 10 14 4" />
      <line x1="14" y1="10" x2="21" y2="3" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

const page: CSSProperties = {
  minHeight: "100vh",
  background: "var(--bg)",
  color: "var(--text)",
  display: "flex",
  flexDirection: "column",
};

const topBar: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  alignItems: "center",
  padding: "32px 40px",
  borderBottom: "1px solid var(--border)",
};

const brand: CSSProperties = {
  gridColumn: "2",
  justifySelf: "center",
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const wordmark: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 36,
  color: "var(--text)",
  letterSpacing: 0.6,
  lineHeight: 1,
};

const logoStyle: CSSProperties = {
  width: 34,
  height: 36,
  color: "var(--text)",
};

const actions: CSSProperties = {
  gridColumn: "3",
  justifySelf: "end",
  display: "flex",
  gap: 8,
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
};

const btnIcon: CSSProperties = {
  width: 16,
  height: 16,
};

const mainCol: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "40px 32px",
  gap: 40,
  maxWidth: 980,
  width: "100%",
  margin: "0 auto",
  boxSizing: "border-box",
};

const greeting: CSSProperties = {
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const hi: CSSProperties = {
  margin: 0,
  fontSize: 17,
  color: "var(--text-secondary)",
  fontWeight: 500,
};

const hiEmail: CSSProperties = {
  color: "var(--text)",
  fontWeight: 600,
};

const hiSub: CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: 0.8,
};

const hiStation: CSSProperties = {
  fontFamily: "var(--font-mono)",
  color: "var(--text-secondary)",
};

const cardsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 16,
  width: "100%",
};

const moduleCard: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: 12,
  padding: 28,
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  cursor: "pointer",
  textAlign: "left",
  color: "var(--text)",
  transition: "background 120ms, border-color 120ms, transform 120ms",
  minHeight: 200,
};

const moduleIconWrap: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 10,
  background: "var(--bg-input)",
  display: "grid",
  placeItems: "center",
  color: "var(--text)",
  marginBottom: 4,
};

const moduleIcon: CSSProperties = {
  width: 22,
  height: 22,
};

const moduleHeader: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const moduleLabel: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 22,
  color: "var(--text)",
  letterSpacing: 0.3,
  lineHeight: 1,
};

const moduleBadge: CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  padding: "3px 8px",
  borderRadius: 999,
  background: "var(--warning-bg)",
  color: "var(--warning-text)",
  border: "1px solid var(--warning-border)",
  textTransform: "uppercase",
  letterSpacing: 1,
};

const moduleDesc: CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: "var(--text-secondary)",
  lineHeight: 1.5,
};

const footer: CSSProperties = {
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
  fontSize: 12,
  padding: "4px 8px",
  textDecoration: "underline",
};
