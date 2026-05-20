import type { CSSProperties } from "react";

type Variant = "centered" | "flat";

type Props = {
  /**
   * - `centered` (default): grade com oval de foco + glow central. Bom pra
   *   telas com conteúdo centralizado (Login, Home).
   * - `flat`: grade uniforme com fade leve nas bordas, sem glow central.
   *   Bom pra listas que rolam (BatchBrowser, Settings) — evita o
   *   "spotlight" óbvio que aparece quando o conteúdo é curto.
   */
  variant?: Variant;
};

/**
 * Background ambient para todas as telas — grade técnica industrial sutil.
 * Renderize no topo do componente da tela (precisa de container com
 * `position: relative` e `overflow: hidden` em volta).
 */
export function AmbientBackground({ variant = "centered" }: Props) {
  if (variant === "flat") {
    return (
      <>
        <div style={flatGrid} aria-hidden="true" />
      </>
    );
  }

  return (
    <>
      <div style={centeredGrid} aria-hidden="true" />
      <div style={centeredGlow} aria-hidden="true" />
    </>
  );
}

const gridImage =
  "linear-gradient(to right, var(--grid-line) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)";

// Variante centered: oval focada no centro, glow leve
const centeredGrid: CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundImage: gridImage,
  backgroundSize: "48px 48px",
  maskImage:
    "radial-gradient(ellipse 90% 80% at 50% 45%, black 30%, transparent 100%)",
  WebkitMaskImage:
    "radial-gradient(ellipse 90% 80% at 50% 45%, black 30%, transparent 100%)",
  pointerEvents: "none",
};

const centeredGlow: CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(ellipse 70% 55% at 50% 40%, var(--ambient-glow), transparent 65%)",
  pointerEvents: "none",
};

// Variante flat: grid uniforme cobrindo todo o espaço, sem fade vertical
// (o fade cortava o grid de maneira inconsistente em telas curtas)
const flatGrid: CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundImage: gridImage,
  backgroundSize: "48px 48px",
  pointerEvents: "none",
};
