// Cliente do iTAG Monitor — chama o backend Rust via Tauri invoke().
// Substitui o rfid-proxy.exe HTTPS sidecar que webapps browser precisavam.

import { invoke } from "@tauri-apps/api/core";

export type ConnectionStatus = {
  ok: boolean;
  host: string;
  message: string | null;
};

export type PollResult = {
  tags: string[];
  raw_preview: string;
};

export type ItagCommand = "iniciar" | "parar" | "limparLeitura";

/**
 * Verifica se o iTAG Monitor está acessível.
 * `host` opcional — default é `http://127.0.0.1:9093`.
 */
export async function pingItag(host?: string): Promise<ConnectionStatus> {
  return invoke<ConnectionStatus>("itag_ping", { host });
}

/**
 * Envia um comando individual pro iTAG Monitor.
 */
export async function sendItagCommand(comando: ItagCommand, host?: string): Promise<void> {
  return invoke("itag_send_command", { comando, host });
}

/**
 * Lê as tags acumuladas no buffer do iTAG Monitor.
 * Retorna EPCs em hex (uppercase) + um preview do corpo bruto pra debug.
 */
export async function pollItagTags(host?: string): Promise<PollResult> {
  return invoke<PollResult>("itag_poll_tags", { host });
}

/**
 * Re-inventário: para → limpa buffer → reinicia. Usado pra detectar
 * tags REMOVIDAS (o iTAG só acumula, não dá diff).
 */
export async function reInventory(host?: string): Promise<void> {
  return invoke("itag_reinventory", { host });
}

export async function startReading(host?: string): Promise<void> {
  return sendItagCommand("iniciar", host);
}

export async function stopReading(host?: string): Promise<void> {
  return sendItagCommand("parar", host);
}

export async function clearBuffer(host?: string): Promise<void> {
  return sendItagCommand("limparLeitura", host);
}
