import type { CSSProperties, SVGProps } from "react";

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={btn} aria-label="Voltar ao menu">
      <IconArrow style={icon} />
      <span>Menu</span>
    </button>
  );
}

function IconArrow(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

const btn: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "transparent",
  border: 0,
  color: "var(--text-secondary)",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 500,
  padding: "6px 10px 6px 4px",
  borderRadius: 6,
  marginLeft: -4,
};

const icon: CSSProperties = {
  width: 14,
  height: 14,
};
