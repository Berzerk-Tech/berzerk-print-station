import { supabase } from "../lib/supabase";
import { isEan13Format } from "../lib/ean13";

export type EanSource = "local" | "shopify";

export type EanLookupResult = {
  eans: Record<string, string>;
  skus: Record<string, string>;
  sources: Record<string, EanSource>;
  missingSizes: string[];
  shopifyProduct: {
    id: string;
    title: string;
    color: string | null;
  } | null;
  unifiedProductId: string | null;
};

export type LookupInput = {
  designName: string | null | undefined;
  shirtColor: string | null | undefined;
  sizes: string[];
};

type ShopifyVariant = {
  option1?: string | null;
  option2?: string | null;
  barcode?: string | null;
  sku?: string | null;
};

type ShopifyProduct = {
  id: string | number;
  title: string;
  variants?: ShopifyVariant[];
};

function normalize(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// ────────────────────────────────────────────────────────────
// Caches — module-level, session-scoped. Cleared via clearLookupCaches().
// Esse cache é o que torna resolveBatch barato quando rodado em paralelo
// pra 50 batches: ao invés de 50 hits em design_templates + ~20 em
// unified_products + ~20 em shopify-analytics, vira 1 + N + N (cada
// produto único é buscado uma vez só).
// ────────────────────────────────────────────────────────────

type DesignTemplateEntry = {
  shopify_product_id: string | null;
  thumbnail: string | null;
};

const designTemplateByName = new Map<string, DesignTemplateEntry>();
let designTemplatesLoaded = false;
let designTemplatesLoading: Promise<void> | null = null;

async function loadDesignTemplates(): Promise<void> {
  if (designTemplatesLoaded) return;
  if (designTemplatesLoading) return designTemplatesLoading;
  designTemplatesLoading = (async () => {
    try {
      const { data, error } = await supabase
        .from("design_templates")
        .select("name, shopify_product_id, images")
        .eq("active", true);
      if (error || !data) {
        designTemplatesLoaded = true;
        return;
      }
      for (const d of data) {
        if (!d.name) continue;
        const lname = String(d.name).toLowerCase();
        const imgs = d.images as { frente?: string[] } | null;
        const thumb = imgs?.frente?.[0] ?? null;
        designTemplateByName.set(lname, {
          shopify_product_id: d.shopify_product_id
            ? String(d.shopify_product_id)
            : null,
          thumbnail: thumb,
        });
      }
      designTemplatesLoaded = true;
    } catch (e) {
      console.warn("[ean13Lookup] loadDesignTemplates failed:", e);
      designTemplatesLoaded = true;
    } finally {
      designTemplatesLoading = null;
    }
  })();
  return designTemplatesLoading;
}

type UnifiedProductEntry = {
  unifiedProductId: string | null;
  barcodes: Record<string, string>;
};

const unifiedByShopify = new Map<string, UnifiedProductEntry>();
const unifiedLoading = new Map<string, Promise<void>>();

async function loadUnifiedProduct(shopifyId: string): Promise<void> {
  if (unifiedByShopify.has(shopifyId)) return;
  if (unifiedLoading.has(shopifyId)) return unifiedLoading.get(shopifyId);
  const p = (async () => {
    try {
      const { data } = await supabase
        .from("unified_products")
        .select("id, overrides")
        .eq("shopify_product_id", shopifyId)
        .limit(1)
        .maybeSingle();
      if (!data) {
        unifiedByShopify.set(shopifyId, {
          unifiedProductId: null,
          barcodes: {},
        });
        return;
      }
      const overrides = (data.overrides ?? {}) as {
        barcodes?: Record<string, string>;
      };
      const raw = overrides.barcodes ?? {};
      const barcodes: Record<string, string> = {};
      for (const [size, ean] of Object.entries(raw)) {
        if (typeof ean === "string" && isEan13Format(ean.trim())) {
          barcodes[size.toUpperCase()] = ean.trim();
        }
      }
      unifiedByShopify.set(shopifyId, {
        unifiedProductId: data.id as string,
        barcodes,
      });
    } catch (e) {
      console.warn("[ean13Lookup] loadUnifiedProduct failed:", e);
      unifiedByShopify.set(shopifyId, {
        unifiedProductId: null,
        barcodes: {},
      });
    } finally {
      unifiedLoading.delete(shopifyId);
    }
  })();
  unifiedLoading.set(shopifyId, p);
  return p;
}

const shopifyByProductId = new Map<string, ShopifyProduct>();
const shopifyLoading = new Map<string, Promise<ShopifyProduct | null>>();

async function tryFetchShopify(
  productId: string,
): Promise<{ ok: true; product: ShopifyProduct | null } | { ok: false }> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "shopify-analytics",
      { body: { action: "product-by-id", productId } },
    );
    if (error) {
      console.warn("[ean13Lookup] shopify-analytics error:", error);
      return { ok: false };
    }
    const product =
      (data as { product?: ShopifyProduct } | null)?.product ?? null;
    return { ok: true, product };
  } catch (e) {
    console.warn("[ean13Lookup] shopify-analytics threw:", e);
    return { ok: false };
  }
}

async function loadShopifyProduct(
  productId: string,
): Promise<ShopifyProduct | null> {
  // Só CACHE sucessos. Falhas (timeout/erro) NÃO ficam no cache — assim a
  // próxima chamada tenta de novo em vez de retornar null preso.
  const cached = shopifyByProductId.get(productId);
  if (cached !== undefined) return cached;
  if (shopifyLoading.has(productId)) return shopifyLoading.get(productId)!;
  const p = (async () => {
    // Até 3 tentativas com backoff (500ms, 1000ms)
    for (let attempt = 0; attempt < 3; attempt++) {
      const r = await tryFetchShopify(productId);
      if (r.ok) {
        if (r.product) shopifyByProductId.set(productId, r.product);
        // Se r.product === null (produto realmente não existe), não cacheamos.
        // Próximas chamadas vão tentar de novo — desperdício pequeno em
        // troca de consistência forte.
        return r.product;
      }
      if (attempt < 2) {
        await new Promise((res) => setTimeout(res, 500 * (attempt + 1)));
      }
    }
    return null;
  })().then((result) => {
    shopifyLoading.delete(productId);
    return result;
  });
  shopifyLoading.set(productId, p);
  return p;
}

/**
 * Limpa todos os caches de catálogo. Chamar quando o operador clicar
 * Atualizar pra forçar refetch dos dados.
 */
export function clearLookupCaches(): void {
  designTemplateByName.clear();
  designTemplatesLoaded = false;
  designTemplatesLoading = null;
  unifiedByShopify.clear();
  unifiedLoading.clear();
  shopifyByProductId.clear();
  shopifyLoading.clear();
}

/**
 * Limpa só o cache do shopify-analytics. Útil quando uma chamada falhou
 * e queremos garantir retry no próximo load sem invalidar design_templates
 * e unified_products (que mudam menos).
 */
export function clearShopifyCache(): void {
  shopifyByProductId.clear();
  shopifyLoading.clear();
}

/**
 * Thumbnail do design (do design_templates.images.frente[0]).
 * Requer loadDesignTemplates() ter sido chamado antes.
 */
export function getDesignThumbnail(
  designName: string | null | undefined,
): string | null {
  if (!designName) return null;
  return (
    designTemplateByName.get(designName.toLowerCase())?.thumbnail ?? null
  );
}

/**
 * Garante que design_templates está carregado no cache. Útil pra batches.ts
 * chamar uma vez antes de pedir thumbnails.
 */
export async function ensureDesignTemplatesLoaded(): Promise<void> {
  await loadDesignTemplates();
}

// ────────────────────────────────────────────────────────────
// Public API — getEansForBatch
// ────────────────────────────────────────────────────────────

export async function getEansForBatch(
  input: LookupInput,
): Promise<EanLookupResult> {
  const empty = (): EanLookupResult => ({
    eans: {},
    skus: {},
    sources: {},
    missingSizes: [...input.sizes],
    shopifyProduct: null,
    unifiedProductId: null,
  });

  try {
    const designName = input.designName?.trim();
    if (!designName || input.sizes.length === 0) return empty();

    // 1. design_templates → shopify_product_id (cached)
    await loadDesignTemplates();
    const tpl = designTemplateByName.get(designName.toLowerCase());
    if (!tpl?.shopify_product_id) return empty();
    const shopifyId = tpl.shopify_product_id;

    // 2. unified_products.overrides.barcodes (cached por shopify_product_id)
    await loadUnifiedProduct(shopifyId);
    const local = unifiedByShopify.get(shopifyId);
    const localBarcodes = local?.barcodes ?? {};
    const unifiedProductId = local?.unifiedProductId ?? null;

    const eans: Record<string, string> = {};
    const skus: Record<string, string> = {};
    const sources: Record<string, EanSource> = {};

    for (const sz of input.sizes) {
      const localEan = localBarcodes[sz.toUpperCase()];
      if (localEan) {
        eans[sz] = localEan;
        skus[sz] = localEan;
        sources[sz] = "local";
      }
    }

    const stillMissing = input.sizes.filter((sz) => !eans[sz]);
    let shopifyProduct: EanLookupResult["shopifyProduct"] = null;

    // 3. Shopify fallback (cached por shopify_product_id)
    if (stillMissing.length > 0) {
      const product = await loadShopifyProduct(shopifyId);
      if (product?.variants?.length) {
        const targetColor = normalize(input.shirtColor);
        const detectedColors = new Set<string>();

        for (const sz of stillMissing) {
          const szNorm = normalize(sz);
          const sameSize = product.variants.filter(
            (v) => normalize(v.option1) === szNorm,
          );
          if (sameSize.length === 0) continue;
          let chosen = sameSize.find(
            (v) => targetColor && normalize(v.option2) === targetColor,
          );
          if (!chosen) chosen = sameSize[0];
          if (chosen.option2) detectedColors.add(chosen.option2);

          // Berzerk: alguns variants têm barcode=null mas sku é EAN13
          const bc = (chosen.barcode ?? "").trim();
          const skuField = (chosen.sku ?? "").trim();
          const ean = isEan13Format(bc)
            ? bc
            : isEan13Format(skuField)
              ? skuField
              : "";
          if (ean) {
            eans[sz] = ean;
            skus[sz] = skuField || ean;
            sources[sz] = "shopify";
          }
        }

        const displayColor =
          [...detectedColors].find((c) => normalize(c) === targetColor) ??
          [...detectedColors][0] ??
          input.shirtColor ??
          null;

        shopifyProduct = {
          id: shopifyId,
          title: product.title,
          color: displayColor,
        };
      } else if (unifiedProductId) {
        shopifyProduct = {
          id: shopifyId,
          title: designName,
          color: input.shirtColor ?? null,
        };
      }
    } else {
      shopifyProduct = {
        id: shopifyId,
        title: designName,
        color: input.shirtColor ?? null,
      };
    }

    return {
      eans,
      skus,
      sources,
      missingSizes: input.sizes.filter((sz) => !eans[sz]),
      shopifyProduct,
      unifiedProductId,
    };
  } catch (e) {
    console.warn("[ean13Lookup] getEansForBatch threw:", e);
    return empty();
  }
}
