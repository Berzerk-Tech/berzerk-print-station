import { supabase } from "../supabase";

export type PrintJobItem = {
  size: string;
  quantity: number;
  ean13: string;
  sku: string;
  description: string;
};

export type PrintJobInput = {
  batchId: string;
  batchCode: string;
  items: PrintJobItem[];
  shirtColor?: string | null;
  designName?: string | null;
  operatorId: string;
  audit: {
    operatorName?: string;
    operatorRole?: string;
  };
};

export type PrintJobSuccess = {
  success: true;
  epcs: string[];
  count: number;
  requestedCount: number;
  partial: boolean;
  requestId: string;
  warning?: string;
};

export type PrintJobFailure = {
  success: false;
  error: string;
  stage?:
    | "validation"
    | "lookup"
    | "idempotency"
    | "iprint_call"
    | "epc_extraction"
    | "persist";
};

export type PrintJobResult = PrintJobSuccess | PrintJobFailure;

export async function printJob(input: PrintJobInput): Promise<PrintJobResult> {
  const { data, error } = await supabase.functions.invoke<PrintJobResult>(
    "itag-print-rfid",
    { body: input },
  );

  if (error) {
    return {
      success: false,
      error: error.message ?? "Erro desconhecido ao chamar itag-print-rfid",
    };
  }
  if (!data) {
    return { success: false, error: "Edge function retornou resposta vazia" };
  }
  return data;
}
