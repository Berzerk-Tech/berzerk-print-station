// Mock do iTAG Monitor pra dev (Linux/macOS — onde o iTAG Monitor Windows
// não roda). Imita o protocolo HTTP plano de http://127.0.0.1:9093 que o
// `src-tauri/src/itag_client.rs` consome:
//
//   GET /ItagRFIDMonitor/RetornaTag                            → JSON array de EPCs
//   GET /ItagRFIDMonitor/CarregaComando?comando=iniciar        → start scan
//   GET /ItagRFIDMonitor/CarregaComando?comando=parar          → stop scan
//   GET /ItagRFIDMonitor/CarregaComando?comando=limparLeitura  → clear buffer
//
// Rodar: `bun run tools/itag-mock/server.ts`
//
// Env vars:
//   ITAG_MOCK_PORT   — porta (default 9093)
//   ITAG_MOCK_EPCS   — CSV de EPCs hex que aparecem quando "iniciar" roda
//                     (default: 3 EPCs de exemplo)

const PORT = Number(process.env.ITAG_MOCK_PORT ?? 9093);
const SEED_EPCS = (process.env.ITAG_MOCK_EPCS ?? "E2000017221101441890ABCD,E2000017221101441890BCDE,E2000017221101441890CDEF")
  .split(",")
  .map((s) => s.trim().toUpperCase())
  .filter((s) => s.length > 0 && /^[0-9A-F]+$/.test(s));

let scanning = false;
let buffer = new Set<string>();

function handleCommand(comando: string): string {
  switch (comando) {
    case "iniciar":
      scanning = true;
      // Real iTAG demora alguns ms até começar a enxergar tags;
      // a gente popula o buffer no proximo tick pra simular isso.
      setTimeout(() => {
        if (scanning) for (const e of SEED_EPCS) buffer.add(e);
      }, 200);
      return "iniciado";
    case "parar":
      scanning = false;
      return "parado";
    case "limparLeitura":
      buffer.clear();
      return "limpo";
    default:
      return `comando desconhecido: ${comando}`;
  }
}

const server = Bun.serve({
  port: PORT,
  hostname: "127.0.0.1",
  fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === "GET" && path === "/ItagRFIDMonitor/RetornaTag") {
      // O cliente Rust aceita JSON array, JSON {tags:[...]}, ou texto plano.
      // JSON array é o que o iTAG real costuma falar.
      return new Response(JSON.stringify([...buffer]), {
        headers: { "content-type": "application/json" },
      });
    }

    if (req.method === "GET" && path === "/ItagRFIDMonitor/CarregaComando") {
      const comando = url.searchParams.get("comando") ?? "";
      const result = handleCommand(comando);
      return new Response(result, { headers: { "content-type": "text/plain" } });
    }

    // Root / qualquer outra rota: 200 OK pra não confundir health checks
    if (path === "/" || path === "") {
      return new Response("iTAG mock — OK", {
        headers: { "content-type": "text/plain" },
      });
    }

    return new Response("not found", { status: 404 });
  },
});

console.log(`iTAG mock escutando em http://${server.hostname}:${server.port}`);
console.log(`Seed EPCs (aparecem após "iniciar"):`, SEED_EPCS);
console.log(`Estado inicial: scanning=false, buffer vazio.`);
