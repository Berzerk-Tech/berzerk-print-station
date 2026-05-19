import type { PrintJobItem } from "./itag/printJob";

export type MarginMode = "none" | "global_percent" | "per_size_fixed";

export type MarginConfig = {
  mode: MarginMode;
  globalPercent: number;
  capEnabled: boolean;
  capValue: number;
  perSizeDefault: number;
};

const CONFIG_KEY = "berzerk_margin_config";
const DEFAULT_CONFIG: MarginConfig = {
  mode: "global_percent",
  globalPercent: 5,
  capEnabled: false,
  capValue: 20,
  perSizeDefault: 5,
};

const MAX_PERCENT = 50;
const MAX_FIXED = 200;

function clampNumber(
  raw: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const n =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? parseFloat(raw)
        : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export function getMarginConfig(): MarginConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const p = JSON.parse(raw) as Partial<MarginConfig>;
    const mode: MarginMode =
      p.mode === "none" ||
      p.mode === "global_percent" ||
      p.mode === "per_size_fixed"
        ? p.mode
        : DEFAULT_CONFIG.mode;
    return {
      mode,
      globalPercent: clampNumber(
        p.globalPercent,
        0,
        MAX_PERCENT,
        DEFAULT_CONFIG.globalPercent,
      ),
      capEnabled: !!p.capEnabled,
      capValue: clampNumber(
        p.capValue,
        0,
        MAX_FIXED,
        DEFAULT_CONFIG.capValue,
      ),
      perSizeDefault: clampNumber(
        p.perSizeDefault,
        0,
        MAX_FIXED,
        DEFAULT_CONFIG.perSizeDefault,
      ),
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function setMarginConfig(config: MarginConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch {
    /* ignore */
  }
}

export type ApplyMarginInput = {
  mode: MarginMode;
  globalPercent: number;
  capEnabled: boolean;
  capValue: number;
  /** Map size → +N unidades. Usado quando mode === 'per_size_fixed'. */
  perSize: Record<string, number>;
};

/**
 * Aplica a margem de segurança nos items. Retorna nova lista com quantities
 * inflados. Não menos que a base original em nenhum caso.
 */
export function applyMargin(
  items: PrintJobItem[],
  input: ApplyMarginInput,
): PrintJobItem[] {
  if (input.mode === "none") return items;
  if (input.mode === "global_percent") {
    const mult = 1 + input.globalPercent / 100;
    return items.map((item) => {
      const ceilQty = Math.ceil(item.quantity * mult);
      let extras = ceilQty - item.quantity;
      if (input.capEnabled) {
        extras = Math.min(extras, Math.max(0, input.capValue));
      }
      return { ...item, quantity: item.quantity + Math.max(0, extras) };
    });
  }
  if (input.mode === "per_size_fixed") {
    return items.map((item) => {
      const extra = Math.max(0, input.perSize[item.size] ?? 0);
      return { ...item, quantity: item.quantity + extra };
    });
  }
  return items;
}

export function totalWithMargin(
  items: PrintJobItem[],
  input: ApplyMarginInput,
): number {
  return applyMargin(items, input).reduce((s, i) => s + i.quantity, 0);
}
