import { supabase } from "../lib/supabase";
import { parseGrade, type GradeEntry } from "../lib/grade";
import {
  ensureDesignTemplatesLoaded,
  getDesignThumbnail,
  getEansForBatch,
  type EanSource,
} from "./ean13Lookup";
import type { PrintJobItem } from "../lib/itag/iprint";

export type ProductionBatch = {
  id: string;
  batch_code: string;
  design_name: string | null;
  shirt_color: string | null;
  sizes: GradeEntry[];
  total_pieces: number;
  created_at: string;
  thumbnail_url: string | null;
};

export type ResolvedBatch = {
  batch: ProductionBatch;
  eans: Record<string, string>;
  skus: Record<string, string>;
  sources: Record<string, EanSource>;
  missingSizes: string[];
  isPrintable: boolean;
  shopifyTitle: string | null;
  shopifyColor: string | null;
  /**
   * True quando o resolve foi feito com `skipShopifyFallback` e ainda tem
   * tamanhos faltando. UI pode oferecer "Buscar no Shopify" pra resolver
   * sob demanda.
   */
  shopifyFallbackAvailable: boolean;
};

export type PrintedBatchEntry = {
  id: string;
  batch_code: string;
  design_name: string | null;
  total_pieces: number;
  rfid_impresso_at: string;
  thumbnail_url: string | null;
};

/**
 * Lista lotes em recebimento confirmado (não impressos ainda).
 *
 * Fonte da verdade do total/grade: `production_batches.grade`. silk_records
 * são consultados só pra descobrir QUAIS batches estão no estado
 * `recebimento_confirmado`, e pra pegar metadata (batch_code, shirt_color).
 * Thumbnails vêm de `design_templates.images.frente[0]`.
 */
export async function fetchPendingBatches(): Promise<ProductionBatch[]> {
  // 1. silk_records → metadata + descoberta de batch_ids confirmados
  const { data: silks, error: silksErr } = await supabase
    .from("silk_records")
    .select("batch_id, batch_code, shirt_color, created_at")
    .eq("status", "recebimento_confirmado")
    .order("created_at", { ascending: false })
    .limit(3000);
  if (silksErr) throw silksErr;
  if (!silks || silks.length === 0) return [];

  type Meta = {
    batch_code: string | null;
    shirt_color: string | null;
    created_at: string;
  };
  const metaByBatch = new Map<string, Meta>();
  for (const s of silks) {
    if (!s.batch_id) continue;
    const existing = metaByBatch.get(s.batch_id);
    if (!existing) {
      metaByBatch.set(s.batch_id, {
        batch_code: s.batch_code,
        shirt_color: s.shirt_color,
        created_at: s.created_at,
      });
    } else {
      if (!existing.batch_code && s.batch_code) existing.batch_code = s.batch_code;
      if (!existing.shirt_color && s.shirt_color)
        existing.shirt_color = s.shirt_color;
    }
  }

  const batchIds = Array.from(metaByBatch.keys());
  if (batchIds.length === 0) return [];

  // 2. production_batches → grade canônica + design_name + cor via fabric_records
  // 2b. design_templates.images em paralelo
  type Pb = {
    id: string;
    design_name: string | null;
    grade: string | null;
    fabric_records?: { cor: string | null } | null;
  };
  const printable: Pb[] = [];
  const CHUNK = 100;
  const pbPromises: Promise<void>[] = [];
  for (let i = 0; i < batchIds.length; i += CHUNK) {
    const chunk = batchIds.slice(i, i + CHUNK);
    pbPromises.push(
      (async () => {
        const { data: pbs, error: pbErr } = await supabase
          .from("production_batches")
          .select(
            "id, design_name, grade, fabric_records!production_batches_fabric_record_id_fkey(cor)",
          )
          .in("id", chunk)
          .is("rfid_impresso_at", null)
          .is("deleted_at", null);
        if (pbErr) throw pbErr;
        for (const pb of (pbs ?? []) as unknown as Pb[]) printable.push(pb);
      })(),
    );
  }
  await Promise.all([
    Promise.all(pbPromises),
    ensureDesignTemplatesLoaded(),
  ]);

  // 3. Monta ProductionBatch[] usando grade canônica + thumbnail (cache compartilhado)
  const result: ProductionBatch[] = [];
  for (const pb of printable) {
    const meta = metaByBatch.get(pb.id);
    if (!meta) continue;
    const sizes = parseGrade(pb.grade);
    const total_pieces = sizes.reduce((sum, s) => sum + s.quantity, 0);
    if (sizes.length === 0 || total_pieces === 0) continue;
    const fabricColor = pb.fabric_records?.cor ?? null;
    const thumbnail = getDesignThumbnail(pb.design_name);
    result.push({
      id: pb.id,
      batch_code: meta.batch_code ?? `LOTE ${pb.id.slice(0, 8)}`,
      design_name: pb.design_name,
      shirt_color: meta.shirt_color ?? fabricColor,
      sizes,
      total_pieces,
      created_at: meta.created_at,
      thumbnail_url: thumbnail,
    });
  }

  return result.sort(
    (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
  );
}

export async function resolveBatch(
  batch: ProductionBatch,
  opts?: { skipShopifyFallback?: boolean },
): Promise<ResolvedBatch> {
  const sizes = batch.sizes.map((s) => s.size);
  const empty: ResolvedBatch = {
    batch,
    eans: {},
    skus: {},
    sources: {},
    missingSizes: sizes,
    isPrintable: false,
    shopifyTitle: batch.design_name,
    shopifyColor: batch.shirt_color,
    shopifyFallbackAvailable: false,
  };
  if (sizes.length === 0 || !batch.design_name) return empty;
  try {
    const lookup = await getEansForBatch({
      designName: batch.design_name,
      shirtColor: batch.shirt_color,
      sizes,
      skipShopifyFallback: opts?.skipShopifyFallback,
    });
    return {
      batch,
      eans: lookup.eans,
      skus: lookup.skus,
      sources: lookup.sources,
      missingSizes: lookup.missingSizes,
      isPrintable: lookup.missingSizes.length === 0 && sizes.length > 0,
      shopifyTitle: lookup.shopifyProduct?.title ?? batch.design_name,
      shopifyColor: lookup.shopifyProduct?.color ?? batch.shirt_color,
      shopifyFallbackAvailable: lookup.shopifyFallbackAvailable,
    };
  } catch (e) {
    console.warn("[batches] resolveBatch threw for", batch.batch_code, e);
    return empty;
  }
}

export function buildPrintItems(resolved: ResolvedBatch): PrintJobItem[] {
  const titleParts = [
    resolved.shopifyTitle ?? resolved.batch.design_name ?? "",
    resolved.shopifyColor ?? resolved.batch.shirt_color ?? "",
  ].filter(Boolean);
  const baseDesc = titleParts.join(" — ");
  return resolved.batch.sizes
    .filter((g) => resolved.eans[g.size])
    .map((g) => ({
      size: g.size,
      quantity: g.quantity,
      ean13: resolved.eans[g.size],
      sku: resolved.skus[g.size] ?? resolved.eans[g.size],
      description: baseDesc ? `${baseDesc} — ${g.size}` : g.size,
    }));
}

export async function fetchTodayHistory(): Promise<PrintedBatchEntry[]> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const [historyResp] = await Promise.all([
    supabase
      .from("production_batches")
      .select("id, design_name, grade, rfid_impresso_at")
      .not("rfid_impresso_at", "is", null)
      .gte("rfid_impresso_at", startOfDay.toISOString())
      .order("rfid_impresso_at", { ascending: false })
      .limit(50),
    ensureDesignTemplatesLoaded(),
  ]);
  if (historyResp.error) throw historyResp.error;
  const data = historyResp.data ?? [];

  const ids = data.map((b) => b.id as string);
  const codesByBatch = new Map<string, string>();
  if (ids.length > 0) {
    const { data: silks } = await supabase
      .from("silk_records")
      .select("batch_id, batch_code")
      .in("batch_id", ids);
    for (const s of silks ?? []) {
      if (s.batch_id && s.batch_code && !codesByBatch.has(s.batch_id)) {
        codesByBatch.set(s.batch_id, s.batch_code);
      }
    }
  }

  return data.map((b) => {
    const sizes = parseGrade(b.grade);
    const total = sizes.reduce((sum, s) => sum + s.quantity, 0);
    return {
      id: b.id as string,
      batch_code:
        codesByBatch.get(b.id as string) ?? `LOTE ${(b.id as string).slice(0, 8)}`,
      design_name: b.design_name,
      total_pieces: total,
      rfid_impresso_at: b.rfid_impresso_at as string,
      thumbnail_url: getDesignThumbnail(b.design_name),
    };
  });
}
