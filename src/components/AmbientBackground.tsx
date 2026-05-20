import type { CSSProperties } from "react";

/**
 * Background ambient para todas as telas do app — grade técnica industrial
 * com mascara radial pra fade nas bordas + glow central sutil.
 *
 * Renderize no topo do componente da tela (precisa de container com
 * `position: relative` e `overflow: hidden` em volta).
 */
export function AmbientBackground() {
  return (
    <>
      <div style={grid} aria-hidden="true" />
      <div style={glow} aria-hidden="true" />
    </>
  );
}

const grid: CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundImage:
    "linear-gradient(to right, var(--grid-line) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)",
  backgroundSize: "48px 48px",
  opacity: 1,
  maskImage:
    "radial-gradient(ellipse 80% 60% at 50% 50%, black 20%, transparent 100%)",
  WebkitMaskImage:
    "radial-gradient(ellipse 80% 60% at 50% 50%, black 20%, transparent 100%)",
  pointerEvents: "none",
};

const glow: CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(ellipse 70% 55% at 50% 40%, var(--ambient-glow), transparent 65%)",
  pointerEvents: "none",
};
