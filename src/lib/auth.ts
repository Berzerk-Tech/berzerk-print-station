import { openUrl } from "@tauri-apps/plugin-opener";
import { onOpenUrl, getCurrent } from "@tauri-apps/plugin-deep-link";
import { supabase } from "./supabase";

const REDIRECT_URL = "berzerk-print://callback";
const ALLOWED_HD = "berzerk.com.br";
const SCHEME_PREFIX = "berzerk-print://";

export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: REDIRECT_URL,
      skipBrowserRedirect: true,
      queryParams: {
        // hd restringe o consent screen ao Google Workspace berzerk.com.br
        hd: ALLOWED_HD,
        prompt: "select_account",
      },
    },
  });
  if (error) return { error };
  if (!data?.url) return { error: new Error("OAuth URL ausente na resposta do Supabase") };
  await openUrl(data.url);
  return { error: null };
}

export async function handleOAuthCallback(url: string): Promise<{ error: Error | null }> {
  try {
    const parsed = new URL(url);

    // PKCE flow (default no Supabase JS v2): ?code=...
    const code = parsed.searchParams.get("code");
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      return { error };
    }

    // Erro vindo do Supabase/Google: ?error=...&error_description=...
    const errParam = parsed.searchParams.get("error");
    if (errParam) {
      const desc = parsed.searchParams.get("error_description") ?? errParam;
      return { error: new Error(desc) };
    }

    // Fallback: implicit flow no hash fragment (#access_token=...&refresh_token=...)
    const hash = parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash;
    if (hash) {
      const params = new URLSearchParams(hash);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        return { error };
      }
    }

    return { error: new Error("Callback sem code nem tokens") };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export function listenForOAuthCallback(handler: (url: string) => void): () => void {
  let unlisten: (() => void) | null = null;
  let stopped = false;

  // Cold start: app aberto via deep link (instância nova) — pega URL inicial
  getCurrent()
    .then((urls) => {
      if (stopped || !urls) return;
      const target = urls.find((u) => u.startsWith(SCHEME_PREFIX));
      if (target) handler(target);
    })
    .catch(() => {});

  // Warm start: app já estava aberto, deep link chega via plugin (re-emitido pelo single-instance)
  onOpenUrl((urls) => {
    const target = urls.find((u) => u.startsWith(SCHEME_PREFIX));
    if (target) handler(target);
  })
    .then((fn) => {
      if (stopped) {
        fn();
      } else {
        unlisten = fn;
      }
    })
    .catch(() => {});

  return () => {
    stopped = true;
    if (unlisten) unlisten();
  };
}
