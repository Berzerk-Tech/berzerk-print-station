// Configuração de dispositivos físicos por estação (impressora térmica, leitor RFID).
// Persistido em localStorage por enquanto — futuramente migra pra row em rfid_print_stations
// no Supabase pra config central por estação.
//
// USB autodetect ainda não implementado (próxima sessão) — campos são preenchidos
// manualmente por agora. Quando o autodetect entrar, ele apenas substitui o valor.

export type ThermalPrinter = {
  /** Nome amigável da impressora (ex: "Elgin L42DT - Bobina 01") */
  name: string;
  /** Identificador do dispositivo (vendorId:productId no USB, ou caminho COM/COMx no Windows) */
  deviceId: string;
  /** Modelo conhecido — afeta protocolo (ESC/POS, ZPL, etc) */
  model: "elgin-l42dt" | "generic-escpos" | "zpl" | "unknown";
};

export type RfidReader = {
  name: string;
  /** Host do iTAG Monitor (default localhost:9093). Quando matarmos o proxy HTTPS,
   *  é aqui que apontamos direto. */
  itagHost: string;
  /** Modo de operação atual */
  mode: "via-proxy" | "direct-itag" | "direct-usb";
  /** Host do proxy HTTPS (legado, default 127.0.0.1:3443). Só usado se mode = via-proxy. */
  proxyHost: string;
};

export type DeviceConfig = {
  printer: ThermalPrinter | null;
  reader: RfidReader;
};

const STORAGE_KEY = "berzerk_devices_v1";

const DEFAULT_CONFIG: DeviceConfig = {
  printer: null,
  reader: {
    name: "Leitor RFID local",
    itagHost: "http://localhost:9093",
    mode: "via-proxy",
    proxyHost: "https://127.0.0.1:3443",
  },
};

export function getDeviceConfig(): DeviceConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<DeviceConfig>;
    return {
      printer: parsePrinter(parsed.printer),
      reader: parseReader(parsed.reader),
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function setDeviceConfig(config: DeviceConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* ignore quota errors */
  }
}

export function setPrinter(printer: ThermalPrinter | null): void {
  setDeviceConfig({ ...getDeviceConfig(), printer });
}

export function setReader(reader: RfidReader): void {
  setDeviceConfig({ ...getDeviceConfig(), reader });
}

function parsePrinter(p: unknown): ThermalPrinter | null {
  if (!p || typeof p !== "object") return null;
  const obj = p as Partial<ThermalPrinter>;
  if (!obj.name || !obj.deviceId) return null;
  const model: ThermalPrinter["model"] =
    obj.model === "elgin-l42dt" ||
    obj.model === "generic-escpos" ||
    obj.model === "zpl"
      ? obj.model
      : "unknown";
  return { name: obj.name, deviceId: obj.deviceId, model };
}

function parseReader(r: unknown): RfidReader {
  if (!r || typeof r !== "object") return DEFAULT_CONFIG.reader;
  const obj = r as Partial<RfidReader>;
  const mode: RfidReader["mode"] =
    obj.mode === "direct-itag" || obj.mode === "direct-usb" ? obj.mode : "via-proxy";
  return {
    name: obj.name || DEFAULT_CONFIG.reader.name,
    itagHost: obj.itagHost || DEFAULT_CONFIG.reader.itagHost,
    mode,
    proxyHost: obj.proxyHost || DEFAULT_CONFIG.reader.proxyHost,
  };
}

export const PRINTER_MODELS: Array<{ value: ThermalPrinter["model"]; label: string }> = [
  { value: "elgin-l42dt", label: "Elgin L42DT" },
  { value: "generic-escpos", label: "Genérica ESC/POS" },
  { value: "zpl", label: "Genérica ZPL (Zebra)" },
  { value: "unknown", label: "Desconhecido / outra" },
];

export const READER_MODES: Array<{
  value: RfidReader["mode"];
  label: string;
  description: string;
  available: boolean;
}> = [
  {
    value: "via-proxy",
    label: "Via proxy HTTPS (atual)",
    description: "rfid-proxy.exe rodando na máquina como sidecar HTTPS",
    available: true,
  },
  {
    value: "direct-itag",
    label: "Direto pro iTAG Monitor",
    description: "Tauri chama localhost:9093 sem proxy (próxima versão)",
    available: false,
  },
  {
    value: "direct-usb",
    label: "Direto via USB",
    description: "Sem iTAG Monitor — driver embarcado (fase futura)",
    available: false,
  },
];
