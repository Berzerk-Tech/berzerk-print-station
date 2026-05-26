import { supabase } from "../lib/supabase";
import { parseGrade, type GradeEntry } from "../lib/grade";
import {
  ensureDesignTemplatesLoaded,
  getDesignThumbnail,
  getEansForBatch,
  type EanSource,
} from "./ean13Lookup";
import type { PrintJobItem } from "../lib/itag/iprint";
import { formatLabelDescription } from "../lib/labelFormatter";

export type ProductionBatch = {
  id: string;
  batch_code: string;
  design_name: string | null;
  /** Tipo/modelo do produto (ex: "Oversized"). Vem de silk_records. Parte do
   *  nome Shopify (fallback) impresso na etiqueta. */
  product_name: string | null;
  /** Referência Tiny do lote (ex: "Oversized - hello kitty"). Quando presente,
   *  é a FONTE DA VERDADE do nome impresso (ver labelFormatter). null = lote
   *  não vinculado ao Tiny → cai no nome Shopify. */
  tiny_reference: string | null;
  shirt_color: string | null;
  sizes: GradeEntry[];
  total_pieces: number;
  created_at: string;
  thumbnail_url: string | null;
  /** True só quando o recebimento está confirmado (recebimento_confirmado).
   *  Único estado em que o lote pode ser impresso — antes disso a grade ainda é
   *  a planejada do corte, não a contada. */
  canPrint: boolean;
  /** Status de recebimento do lote (o mais avançado entre as linhas de
   *  silk_records). Rótulo amigável via RECEIPT_STATUS_LABEL. */
  receiptStatus: string;
};

/** Prioridade do ciclo de recebimento (maior = mais avançado). Desconhecido = 0. */
const RECEIPT_STATUS_PRIORITY: Record<string, number> = {
  aguardando_retirada: 1,
  enviado_recebimento: 2,
  aguardando_autorizacao: 3,
  recebimento_confirmado: 4,
};

function receiptPriority(status: string | null | undefined): number {
  return (status && RECEIPT_STATUS_PRIORITY[status]) || 0;
}

/** Rótulos amigáveis dos status de recebimento (UI). */
export const RECEIPT_STATUS_LABEL: Record<string, string> = {
  recebimento_confirmado: "Confirmado",
  aguardando_retirada: "Aguardando retirada",
  enviado_recebimento: "Enviado p/ recebimento",
  aguardando_autorizacao: "Aguardando autorização",
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
  /** Referência Shopify (`unified_products.shopify_product_name`). Nome único
   *  combinado, fonte do nome impresso quando não há Tiny. Ver labelFormatter. */
  shopifyReference: string | null;
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
 * Lista lotes prontos pra aparecer na Produção (não impressos ainda).
 *
 * Aparecem: (a) lotes `recebimento_confirmado` (printáveis, comportamento
 * histórico), ou (b) lotes em estágio inicial de recebimento
 * (`aguardando_retirada`/`enviado_recebimento`/`aguardando_autorizacao`) que já
 * tenham volumes contados na coleta (Σ `volumes_count` > 0) — esses aparecem
 * TRAVADOS (`canPrint: false`), porque a grade só vira a contada na confirmação.
 *
 * Fonte da verdade do total/grade: `production_batches.grade`. silk_records dão
 * o status, os volumes e a metadata (batch_code, shirt_color, product_name).
 * Thumbnails vêm de `design_templates.images.frente[0]`.
 */
export async function fetchPendingBatches(): Promise<ProductionBatch[]> {
  // 1. silk_records → metadata + status/volumes + descoberta de batch_ids
  const { data: silks, error: silksErr } = await supabase
    .from("silk_records")
    .select(
      "batch_id, batch_code, shirt_color, product_name, created_at, status, volumes_count",
    )
    .in("status", [
      "recebimento_confirmado",
      "aguardando_retirada",
      "enviado_recebimento",
      "aguardando_autorizacao",
    ])
    .order("created_at", { ascending: false })
    .limit(3000);
  if (silksErr) throw silksErr;
  if (!silks || silks.length === 0) return [];

  type Meta = {
    batch_code: string | null;
    shirt_color: string | null;
    product_name: string | null;
    created_at: string;
    // status mais avançado entre as linhas do lote (silks de um lote andam
    // juntos, mas durante transições podem divergir — pegamos o max).
    statusPriority: number;
    receiptStatus: string;
    volumesSum: number;
  };
  const metaByBatch = new Map<string, Meta>();
  for (const s of silks) {
    if (!s.batch_id) continue;
    const vol = s.volumes_count ?? 0;
    const existing = metaByBatch.get(s.batch_id);
    if (!existing) {
      metaByBatch.set(s.batch_id, {
        batch_code: s.batch_code,
        shirt_color: s.shirt_color,
        product_name: s.product_name,
        created_at: s.created_at,
        statusPriority: receiptPriority(s.status),
        receiptStatus: s.status ?? "",
        volumesSum: vol,
      });
    } else {
      if (!existing.batch_code && s.batch_code) existing.batch_code = s.batch_code;
      if (!existing.shirt_color && s.shirt_color)
        existing.shirt_color = s.shirt_color;
      if (!existing.product_name && s.product_name)
        existing.product_name = s.product_name;
      existing.volumesSum += vol;
      const p = receiptPriority(s.status);
      if (p > existing.statusPriority) {
        existing.statusPriority = p;
        existing.receiptStatus = s.status ?? existing.receiptStatus;
      }
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
    const isConfirmed = meta.statusPriority === 4; // recebimento_confirmado
    // Filtro de volumes vale SÓ pro estágio inicial; confirmados nunca são
    // barrados por volume (preserva o comportamento histórico).
    if (!isConfirmed && meta.volumesSum <= 0) continue;
    const sizes = parseGrade(pb.grade);
    const total_pieces = sizes.reduce((sum, s) => sum + s.quantity, 0);
    if (sizes.length === 0 || total_pieces === 0) continue;
    const fabricColor = pb.fabric_records?.cor ?? null;
    const thumbnail = getDesignThumbnail(pb.design_name);
    result.push({
      id: pb.id,
      batch_code: meta.batch_code ?? `LOTE ${pb.id.slice(0, 8)}`,
      design_name: pb.design_name,
      product_name: meta.product_name,
      // TODO(tiny): ligar quando o industrial publicar a coluna da Referência
      // Tiny. Trocar por `meta.tiny_reference` (e adicionar ao select/Meta do
      // silk_records). Enquanto null, etiqueta usa o nome Shopify.
      tiny_reference: null,
      shirt_color: meta.shirt_color ?? fabricColor,
      sizes,
      total_pieces,
      created_at: meta.created_at,
      thumbnail_url: thumbnail,
      canPrint: isConfirmed,
      receiptStatus: meta.receiptStatus,
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
    shopifyReference: null,
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
      shopifyReference: lookup.shopifyReference,
      shopifyFallbackAvailable: lookup.shopifyFallbackAvailable,
    };
  } catch (e) {
    console.warn("[batches] resolveBatch threw for", batch.batch_code, e);
    return empty;
  }
}

export function buildPrintItems(resolved: ResolvedBatch): PrintJobItem[] {
  // Nome impresso = padrão Berzerk/Tiny replicado do industrial:
  //   "{product_name} — {design_name} — {SIZE}" (Title Case, size UPPER).
  // NÃO usar shopifyTitle/cor aqui — tem que bater 100% com o preview do
  // industrial. Ver src/lib/labelFormatter.ts.
  const lote = {
    tinyReference: resolved.batch.tiny_reference,
    shopifyReference: resolved.shopifyReference,
    product_name: resolved.batch.product_name,
    design_name: resolved.batch.design_name ?? "",
  };
  return resolved.batch.sizes
    .filter((g) => resolved.eans[g.size])
    .map((g) => ({
      size: g.size,
      quantity: g.quantity,
      ean13: resolved.eans[g.size],
      sku: resolved.skus[g.size] ?? resolved.eans[g.size],
      description: formatLabelDescription(lote, g.size),
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
