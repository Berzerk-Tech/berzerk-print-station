import { useState, type CSSProperties } from "react";
import { signInWithGoogle } from "../lib/auth";
import { BerzerkLogo } from "./BerzerkLogo";

export function Login() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setError(null);
    setBusy(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    setTimeout(() => setBusy(false), 60000);
  }

  function handleCancel() {
    setBusy(false);
    setError(null);
  }

  return (
    <div style={page}>
      <div style={ambient} aria-hidden="true" />

      <div style={brandStack}>
        <BerzerkLogo style={logoStyle} />
        <h1 style={wordmark}>BERZERK</h1>
        <p style={tagline}>Print Station</p>
      </div>

      <div style={card}>
        <p style={cardKicker}>Acesso restrito</p>
        <p style={cardSub}>
          Apenas contas <code style={domainTag}>@berzerk.com.br</code>
        </p>

        {error && <div style={errorBox}>{error}</div>}

        {!busy ? (
          <button type="button" onClick={handleClick} style={primaryBtn}>
            <GoogleG />
            <span>Entrar com Google</span>
          </button>
        ) : (
          <div style={busyStack}>
            <div style={spinnerWrap}>
              <Spinner />
              <span style={spinnerText}>Abrindo o navegador…</span>
            </div>
            <p style={busyNote}>
              Continue o login no navegador.<br />
              Esta janela voltará automaticamente assim que terminar.
            </p>
            <button type="button" onClick={handleCancel} style={cancelBtn}>
              Cancelar
            </button>
          </div>
        )}
      </div>

      <p style={versionTag}>v0.1.0 · Berzerk Tech</p>
    </div>
  );
}

function Spinner() {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" style={{ animation: "berzerk-spin 0.9s linear infinite" }}>
      <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" />
      <path d="M10 2 a8 8 0 0 1 8 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function GoogleG() {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

// Animações precisam de keyframes globais — injeto inline uma vez.
if (typeof document !== "undefined" && !document.getElementById("berzerk-login-keyframes")) {
  const style = document.createElement("style");
  style.id = "berzerk-login-keyframes";
  style.textContent = `
    @keyframes berzerk-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes berzerk-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes berzerk-pulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 0.9; } }
  `;
  document.head.appendChild(style);
}

const page: CSSProperties = {
  minHeight: "100vh",
  background: "var(--bg)",
  color: "var(--text)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  overflow: "hidden",
  padding: "32px",
  gap: 40,
};

const ambient: CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(80% 50% at 50% 0%, rgba(120, 120, 140, 0.10), transparent 60%), radial-gradient(60% 40% at 50% 100%, rgba(120, 120, 140, 0.06), transparent 70%)",
  pointerEvents: "none",
};

const brandStack: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  animation: "berzerk-fade-in 480ms ease-out",
  position: "relative",
};

const logoStyle: CSSProperties = {
  width: 56,
  height: 60,
  color: "var(--text)",
  marginBottom: 10,
};

const wordmark: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 72,
  margin: 0,
  letterSpacing: 1.5,
  lineHeight: 1,
  color: "var(--text)",
};

const tagline: CSSProperties = {
  margin: 0,
  fontSize: 12,
  letterSpacing: 4,
  textTransform: "uppercase",
  color: "var(--text-muted)",
  fontWeight: 500,
};

const card: CSSProperties = {
  width: 380,
  maxWidth: "100%",
  padding: 32,
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  position: "relative",
  animation: "berzerk-fade-in 600ms ease-out 120ms backwards",
  boxShadow:
    "0 1px 0 rgba(255, 255, 255, 0.04) inset, 0 20px 60px -20px rgba(0, 0, 0, 0.6)",
};

const cardKicker: CSSProperties = {
  margin: 0,
  fontSize: 10,
  letterSpacing: 1.5,
  textTransform: "uppercase",
  color: "var(--text-muted)",
  fontWeight: 700,
};

const cardSub: CSSProperties = {
  margin: 0,
  marginTop: 6,
  marginBottom: 22,
  fontSize: 14,
  color: "var(--text-secondary)",
};

const domainTag: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  background: "var(--bg-input)",
  padding: "1px 6px",
  borderRadius: 4,
  color: "var(--text)",
  border: "1px solid var(--border)",
};

const primaryBtn: CSSProperties = {
  width: "100%",
  padding: "13px 16px",
  fontSize: 14,
  fontWeight: 600,
  border: "1px solid var(--border-strong)",
  borderRadius: 10,
  background: "var(--bg-input)",
  color: "var(--text)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  transition: "background 120ms, border-color 120ms, transform 120ms",
};

const busyStack: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: 14,
  animation: "berzerk-fade-in 200ms ease-out",
};

const spinnerWrap: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  padding: "12px",
  color: "var(--text-secondary)",
};

const spinnerText: CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
};

const busyNote: CSSProperties = {
  margin: 0,
  fontSize: 12,
  textAlign: "center",
  color: "var(--text-muted)",
  lineHeight: 1.55,
};

const cancelBtn: CSSProperties = {
  padding: "10px",
  fontSize: 12,
  fontWeight: 500,
  background: "transparent",
  color: "var(--text-secondary)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  cursor: "pointer",
};

const errorBox: CSSProperties = {
  background: "var(--danger-bg)",
  color: "var(--danger-text)",
  border: "1px solid var(--danger-border)",
  padding: "10px 14px",
  borderRadius: 10,
  fontSize: 12,
  marginBottom: 14,
  lineHeight: 1.5,
};

const versionTag: CSSProperties = {
  position: "absolute",
  bottom: 24,
  fontSize: 11,
  color: "var(--text-faint)",
  letterSpacing: 1,
  margin: 0,
  fontFamily: "var(--font-mono)",
};
