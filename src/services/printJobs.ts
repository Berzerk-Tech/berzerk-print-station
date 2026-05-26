import { supabase } from "../lib/supabase";
import type { PrintJobItem } from "../lib/itag/iprint";

export type RfidPrintJobStatus =
  | "queued"
  | "printing"
  | "done"
  | "failed"
  | "cancelled";

export type RfidPrintJob = {
  id: string;
  batch_id: string;
  batch_code: string;
  items: PrintJobItem[];
  shirt_color: string | null;
  design_name: string | null;
  total_etiquetas: number;
  status: RfidPrintJobStatus;
  station_id: string | null;
  requested_by: string | null;
  printed_by: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  audit_payload: unknown;
};

export type EpcInventoryRow = {
  epc: string;
  batch_id: string;
  batch_code: string;
  size: string;
  ean13: string;
  sku: string | null;
  codigo_inventario_itag: number | null;
  job_id: string | null;
  situacao_atual: number;
  printed_at: string;
  moved_at: string | null;
  moved_to_situacao: number | null;
  moved_by: string | null;
};

export type JobAwaitingMovimentacao = {
  job: RfidPrintJob;
  pendingCount: number;
  totalCount: number;
};

/**
 * Cria um job já em `printing`. Usado quando o operador clica Imprimir
 * direto no card de lote (sem passar por fila do coordenador).
 */
const ACTIVE_COLUMNS =
  "id,batch_id,batch_code,design_name,shirt_color,total_etiquetas,status,station_id,printed_by,created_at,started_at,completed_at,error_message";

/**
 * Lista jobs ainda em movimento (queued, printing, failed). Done jobs ficam
 * no Histórico, cancelled por enquanto não usamos.
 */
export async function fetchActivePrintJobs(): Promise<RfidPrintJob[]> {
  const { data, error } = await supabase
    .from("rfid_print_jobs")
    .select(ACTIVE_COLUMNS)
    .in("status", ["queued", "printing", "failed"])
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as RfidPrintJob[];
}

export async function createPrintJob(params: {
  batchId: string;
  batchCode: string;
  items: PrintJobItem[];
  shirtColor: string | null;
  designName: string | null;
  totalEtiquetas: number;
  operatorId: string;
  operatorEmail: string;
  stationId: string;
}): Promise<string> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("rfid_print_jobs")
    .insert({
      batch_id: params.batchId,
      batch_code: params.batchCode,
      items: params.items,
      shirt_color: params.shirtColor,
      design_name: params.designName,
      total_etiquetas: params.totalEtiquetas,
      status: "printing",
      station_id: params.stationId,
      requested_by: params.operatorId,
      printed_by: params.operatorId,
      started_at: now,
      audit_payload: { operatorEmail: params.operatorEmail },
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function markDone(jobId: string) {
  const { error } = await supabase
    .from("rfid_print_jobs")
    .update({
      status: "done",
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);
  if (error) throw error;
}

export async function cancelPrintJob(jobId: string) {
  const { error } = await supabase
    .from("rfid_print_jobs")
    .update({
      status: "cancelled",
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);
  if (error) throw error;
}

export async function markFailed(jobId: string, errorMessage: string) {
  const { error } = await supabase
    .from("rfid_print_jobs")
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
      error_message: errorMessage,
    })
    .eq("id", jobId);
  if (error) throw error;
}

/**
 * Persiste o mapping EPC → lote depois que a iTAG retornou os EPCs queimados.
 * Distribui os EPCs entre os items na ordem em que foram enviados (a iTAG
 * preserva ordem do payload). Usa `upsert` em `epc` pra ser idempotente —
 * caso a função seja chamada 2x pro mesmo job (retry), não duplica row.
 */
export async function saveEpcInventory(params: {
  jobId: string;
  batchId: string;
  batchCode: string;
  items: PrintJobItem[];
  epcs: string[];
  codigoInventarioItag: number | null;
}): Promise<{ inserted: number; skipped: number }> {
  if (params.epcs.length === 0) return { inserted: 0, skipped: 0 };

  // Expande items pra EPCs individuais respeitando quantidade
  type Row = {
    epc: string;
    batch_id: string;
    batch_code: string;
    size: string;
    ean13: string;
    sku: string | null;
    codigo_inventario_itag: number | null;
    job_id: string;
    situacao_atual: number;
  };
  const rows: Row[] = [];
  let epcIdx = 0;
  for (const item of params.items) {
    for (let k = 0; k < item.quantity && epcIdx < params.epcs.length; k++) {
      rows.push({
        epc: params.epcs[epcIdx++],
        batch_id: params.batchId,
        batch_code: params.batchCode,
        size: item.size,
        ean13: item.ean13,
        sku: item.sku ?? null,
        codigo_inventario_itag: params.codigoInventarioItag,
        job_id: params.jobId,
        situacao_atual: 2, // default — "impresso"; situação real vem do iTAG
      });
    }
  }
  const skipped = params.epcs.length - rows.length;

  if (rows.length === 0) return { inserted: 0, skipped };

  // Upsert por epc (PK). Em conflito mantém a row existente — não sobrescreve
  // job_id/batch_id que possam ter sido populados em outra estação.
  const { error } = await supabase
    .from("rfid_epc_inventory")
    .upsert(rows, { onConflict: "epc", ignoreDuplicates: true });
  if (error) throw error;
  return { inserted: rows.length, skipped };
}

/**
 * Lista EPCs de um job específico. Usado pelo handler de movimentação.
 */
export async function fetchEpcsByJob(jobId: string): Promise<EpcInventoryRow[]> {
  const { data, error } = await supabase
    .from("rfid_epc_inventory")
    .select(
      "epc,batch_id,batch_code,size,ean13,sku,codigo_inventario_itag,job_id,situacao_atual,printed_at,moved_at,moved_to_situacao,moved_by",
    )
    .eq("job_id", jobId);
  if (error) throw error;
  return (data ?? []) as EpcInventoryRow[];
}

/**
 * Rastreio: dado um ou mais EPCs (etiquetas RFID lidas/digitadas), retorna as
 * rows de inventário — o vínculo EPC → lote/SKU/tamanho. Normaliza pra
 * UPPERCASE/trim (o leitor iTAG devolve hex maiúsculo). EPCs sem match não
 * aparecem no resultado.
 */
export async function fetchEpcInventoryByEpcs(
  epcs: string[],
): Promise<EpcInventoryRow[]> {
  const norm = Array.from(
    new Set(epcs.map((e) => e.trim().toUpperCase()).filter(Boolean)),
  );
  if (norm.length === 0) return [];
  const { data, error } = await supabase
    .from("rfid_epc_inventory")
    .select(
      "epc,batch_id,batch_code,size,ean13,sku,codigo_inventario_itag,job_id,situacao_atual,printed_at,moved_at,moved_to_situacao,moved_by",
    )
    .in("epc", norm);
  if (error) throw error;
  return (data ?? []) as EpcInventoryRow[];
}

/**
 * Marca uma lista de EPCs como movimentados localmente. Chamar SÓ depois
 * que o `itag_iprint_movimentar` Rust devolveu OK — senão o estado local
 * fica fora de sincronia com o iTAG.
 */
export async function markMoved(params: {
  epcs: string[];
  situacaoDestino: number;
  operatorId: string;
}): Promise<void> {
  if (params.epcs.length === 0) return;
  const { error } = await supabase
    .from("rfid_epc_inventory")
    .update({
      situacao_atual: params.situacaoDestino,
      moved_at: new Date().toISOString(),
      moved_to_situacao: params.situacaoDestino,
      moved_by: params.operatorId,
    })
    .in("epc", params.epcs);
  if (error) throw error;
}

/**
 * Lista jobs `done` que ainda têm EPCs com moved_at IS NULL. Pra UI mostrar
 * "Aguardando movimentação" — o operador clica e a gente move pro estoque.
 *
 * Implementação simples (não otimizada): busca jobs done recentes, depois pra
 * cada um conta EPCs pendentes. Volume é pequeno (dezenas/dia), aceita-se.
 */
export async function fetchJobsAwaitingMovimentacao(): Promise<
  JobAwaitingMovimentacao[]
> {
  const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  const { data: jobs, error: jobsErr } = await supabase
    .from("rfid_print_jobs")
    .select(ACTIVE_COLUMNS)
    .eq("status", "done")
    .gte("completed_at", since)
    .order("completed_at", { ascending: false })
    .limit(50);
  if (jobsErr) throw jobsErr;
  if (!jobs || jobs.length === 0) return [];

  const out: JobAwaitingMovimentacao[] = [];
  for (const j of jobs as RfidPrintJob[]) {
    const { count: total, error: totalErr } = await supabase
      .from("rfid_epc_inventory")
      .select("epc", { count: "exact", head: true })
      .eq("job_id", j.id);
    if (totalErr) continue;
    const { count: pending, error: pendErr } = await supabase
      .from("rfid_epc_inventory")
      .select("epc", { count: "exact", head: true })
      .eq("job_id", j.id)
      .is("moved_at", null);
    if (pendErr) continue;
    const pendingCount = pending ?? 0;
    const totalCount = total ?? 0;
    if (pendingCount > 0) {
      out.push({ job: j, pendingCount, totalCount });
    }
  }
  return out;
}
