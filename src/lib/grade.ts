export type GradeEntry = {
  size: string;
  quantity: number;
};

/**
 * Parseia texto de grade tipo "0PP|66P|134M|200G|133GG|63XG|0XXG"
 * em [{size, quantity}]. Ignora entradas com quantidade 0.
 */
export function parseGrade(grade: string | null | undefined): GradeEntry[] {
  if (!grade) return [];
  const parts = grade
    .split(/[|,;\-\s]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const result: GradeEntry[] = [];
  for (const part of parts) {
    const match = part.match(/^(\d+)\s*([A-Za-zÀ-ÿ]+)$/);
    if (!match) continue;
    const qty = parseInt(match[1], 10);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    result.push({ size: match[2].toUpperCase(), quantity: qty });
  }
  return result;
}

/**
 * Agrega lista de items por size somando quantities.
 * Útil quando vem de silk_records (1 row por size, mas pode ter duplicatas).
 */
export function aggregateBySize(
  items: Array<{ size: string; quantity: number }>,
): GradeEntry[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const sz = item.size.toUpperCase();
    map.set(sz, (map.get(sz) ?? 0) + item.quantity);
  }
  return Array.from(map.entries())
    .map(([size, quantity]) => ({ size, quantity }))
    .sort((a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size));
}

const SIZE_ORDER = ["PP", "P", "M", "G", "GG", "XG", "XGG", "XXG", "EXG", "U"];
