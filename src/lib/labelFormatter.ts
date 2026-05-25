/**
 * Formatadores para etiquetas RFID (iTAG iPRINT).
 *
 * CÓPIA FIEL do industrial (`separadordelistas/src/backend/lib/labelFormatter.ts`).
 * O nome impresso na etiqueta DEVE bater 100% com o preview do industrial
 * ("EAN13 / Descrição que será impressa"). Se mexer aqui, sincronize lá.
 *
 * O padrão visual da etiqueta da Berzerk é:
 *   linha 1: descrição → "Oversized - Arnold - P"
 *   linha 2: REF (EAN13) → "REF: 7894921584847"
 *   linha 3: EPC HEX (gerado pela iTAG)
 *
 * Separador: HÍFEN " - " (não em dash). O iPrint é uma app antiga e pode não
 * renderizar o em dash "—" corretamente — hífen garante compatibilidade.
 */

/** Separador entre os campos do nome da etiqueta. Hífen por compat. com iPrint. */
const SEP = " - ";

/**
 * Title Case respeitando acentos e separadores. Cada palavra (separada por
 * espaço ou hífen) tem a primeira letra em maiúscula e o resto em minúscula.
 *
 * Exemplos:
 *   titleCase("oversized")       → "Oversized"
 *   titleCase("DRY TECH")        → "Dry Tech"
 *   titleCase("CF - MASTER")     → "Cf - Master"
 *   titleCase("camiseta básica") → "Camiseta Básica"
 */
export function titleCase(s: string): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((part) => {
      // separadores (espaços/hifens) ficam como estão
      if (/^(\s+|-)$/.test(part)) return part;
      // capitaliza primeira letra unicode
      return part.replace(/^(\p{L})/u, (m) => m.toUpperCase());
    })
    .join("")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Monta a descrição da etiqueta no padrão Berzerk.
 *
 * Fonte do nome (prioridade — regra do Leonardo: "se tem os dois, usa Tiny"):
 *   1. `tinyReference` — lote vinculado ao Tiny. Fonte da verdade, já combinada
 *      (ex: "Oversized - hello kitty").
 *   2. `shopifyReference` — `unified_products.shopify_product_name`. Nome único
 *      canônico do Shopify, usado quando não há Tiny.
 *   3. Fallback final: `{product_name} - {design_name}` (quando nenhuma das
 *      referências resolveu).
 *
 * Em todos os casos o resultado é Title-Cased e o SIZE (UPPER) é anexado.
 *
 * Exemplos:
 *   formatLabelDescription({ tinyReference: "Oversized - hello kitty" }, "G")
 *     → "Oversized - Hello Kitty - G"   (Tiny ganha)
 *
 *   formatLabelDescription({ shopifyReference: "Oversized - Carboctopus" }, "P")
 *     → "Oversized - Carboctopus - P"   (sem Tiny → Shopify)
 *
 *   formatLabelDescription({ product_name: "oversized", design_name: "ARNOLD" }, "P")
 *     → "Oversized - Arnold - P"        (sem referência → produto+estampa)
 */
export function formatLabelDescription(
  lote: {
    tinyReference?: string | null;
    shopifyReference?: string | null;
    product_name?: string | null;
    design_name?: string | null;
  },
  size: string,
): string {
  const parts: string[] = [];
  const ref = lote.tinyReference?.trim() || lote.shopifyReference?.trim() || "";
  if (ref) {
    // Referência combinada (Tiny preferida, senão Shopify) — fonte da verdade.
    parts.push(titleCase(ref));
  } else {
    // Fallback final: produto + estampa.
    if (lote.product_name && lote.product_name.trim()) {
      parts.push(titleCase(lote.product_name));
    }
    if (lote.design_name && lote.design_name.trim()) {
      parts.push(titleCase(lote.design_name));
    }
  }
  if (size && size.trim()) {
    parts.push(size.trim().toUpperCase());
  }
  return parts.join(SEP);
}
