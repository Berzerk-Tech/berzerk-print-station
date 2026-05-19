import { supabase } from "../lib/supabase";
import type { PrintJobItem } from "../lib/itag/printJob";

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
