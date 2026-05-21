// Configuração da integração com a iTAG iPrint (REST cloud).
//
// Persiste em localStorage por enquanto. Quando virar produção a sério, mover
// `basicPass` pro keyring do OS via tauri-plugin-stronghold (TODO).

const STORAGE_KEY = "berzerk_iprint_config_v1";

export type IprintConfig = {
  baseUrl: string;
  basicUser: string;
  basicPass: string;
  /** Param do path /iprint/gerarRFID/{codigoEmpresa}/{filial}. */
  codigoEmpresa: number;
  /** Idem. */
  filial: number;
  /** Empresa origem do PUT de movimentação. */
  empresaOrigem: number;
  /** Empresa destino do PUT de movimentação. */
  empresaDestino: number;
  /** Situação destino padrão do botão "Movimentar" (ex.: 4 = estoque). */
  situacaoDestino: number;
};

export const DEFAULT_IPRINT_CONFIG: IprintConfig = {
  baseUrl: "http://itag2.itagalert.com.br/itagalert_integracao",
  basicUser: "itag",
  basicPass: "itag",
  codigoEmpresa: 1,
  filial: 1,
  empresaOrigem: 1,
  empresaDestino: 1,
  situacaoDestino: 4,
};

function clampInt(raw: unknown, fallback: number): number {
  const n =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? parseInt(raw, 10)
        : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

export function getIprintConfig(): IprintConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_IPRINT_CONFIG;
    const p = JSON.parse(raw) as Partial<IprintConfig>;
    return {
      baseUrl: typeof p.baseUrl === "string" && p.baseUrl.trim()
        ? p.baseUrl.trim()
        : DEFAULT_IPRINT_CONFIG.baseUrl,
      basicUser: typeof p.basicUser === "string"
        ? p.basicUser
        : DEFAULT_IPRINT_CONFIG.basicUser,
      basicPass: typeof p.basicPass === "string"
        ? p.basicPass
        : DEFAULT_IPRINT_CONFIG.basicPass,
      codigoEmpresa: clampInt(p.codigoEmpresa, DEFAULT_IPRINT_CONFIG.codigoEmpresa),
      filial: clampInt(p.filial, DEFAULT_IPRINT_CONFIG.filial),
      empresaOrigem: clampInt(p.empresaOrigem, DEFAULT_IPRINT_CONFIG.empresaOrigem),
      empresaDestino: clampInt(p.empresaDestino, DEFAULT_IPRINT_CONFIG.empresaDestino),
      situacaoDestino: clampInt(p.situacaoDestino, DEFAULT_IPRINT_CONFIG.situacaoDestino),
    };
  } catch {
    return DEFAULT_IPRINT_CONFIG;
  }
}

export function setIprintConfig(config: IprintConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* ignore */
  }
}

/** Subset enviado pro Rust nas chamadas de iTAG. */
export function toRustConfig(config: IprintConfig) {
  return {
    baseUrl: config.baseUrl,
    basicUser: config.basicUser,
    basicPass: config.basicPass,
  };
}
