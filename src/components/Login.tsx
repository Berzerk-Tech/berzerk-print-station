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
    // o estado "busy" continua até o deep link voltar e a sessão materializar
    // (App.tsx escuta onAuthStateChange e troca de tela sozinho).
  }

  return (
    <div style={page}>
      <div style={card}>
        <div style={brand}>
          <BerzerkLogo style={logoStyle} />
          <span>Berzerk Print Station</span>
        </div>

        <p style={subtitle}>Acesso restrito a contas @berzerk.com.br</p>

        {error && <div style={errorBox}>{error}</div>}

        <button type="button" onClick={handleClick} disabled={busy} style={button}>
          <GoogleG />
          <span>{busy ? "Abrindo o Google…" : "Entrar com Google"}</span>
        </button>

        {busy && (
          <p style={note}>
            Continue o login no navegador. Esta janela voltará automaticamente assim que terminar.
          </p>
        )}
      </div>
    </div>
  );
}

function GoogleG() {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden="true" style={googleIcon}>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

const page: CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  background: "var(--bg)",
  color: "var(--text)",
};

const card: CSSProperties = {
  width: 360,
  padding: 32,
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 14,
};

const brand: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  margin: 0,
  marginBottom: 8,
  fontSize: 17,
  fontWeight: 600,
  color: "var(--text)",
  letterSpacing: -0.2,
};

const logoStyle: CSSProperties = {
  width: 36,
  height: 39,
  color: "var(--text)",
  display: "block",
  flexShrink: 0,
};

const subtitle: CSSProperties = {
  margin: 0,
  marginBottom: 24,
  fontSize: 12,
  color: "var(--text-secondary)",
};

const button: CSSProperties = {
  width: "100%",
  padding: "11px",
  fontSize: 14,
  fontWeight: 600,
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--bg-input)",
  color: "var(--text)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
};

const googleIcon: CSSProperties = { flexShrink: 0 };

const errorBox: CSSProperties = {
  background: "var(--danger-bg)",
  color: "var(--danger-text)",
  border: "1px solid var(--danger-border)",
  padding: "8px 12px",
  borderRadius: 8,
  fontSize: 12,
  marginBottom: 12,
};

const note: CSSProperties = {
  marginTop: 14,
  marginBottom: 0,
  fontSize: 11,
  color: "var(--text-muted)",
  textAlign: "center",
};
