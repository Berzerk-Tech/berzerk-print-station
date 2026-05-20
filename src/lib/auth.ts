import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import { supabase } from "./supabase";

const ALLOWED_HD = "berzerk.com.br";

// O server loopback Rust sobe em 127.0.0.1:54321 e captura o redirect do Supabase.
// Custom schemes (berzerk-print://) foram trocados por loopback HTTP porque o Chrome
// 120+ bloqueia silenciosamente custom schemes em redirects sem user gesture imediato.

export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  let loopbackUrl: string;
  try {
    loopbackUrl = await invoke<string>("start_oauth_listener");
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: loopbackUrl,
      skipBrowserRedirect: true,
      queryParams: {
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

export async function handleOAuthCallback(callbackPath: string): Promise<{ error: Error | null }> {
  try {
    // callbackPath é tipo "/oauth-callback?code=...&state=..." (sem origin)
    const parsed = new URL(callbackPath, "http://127.0.0.1:54321");

    const code = parsed.searchParams.get("code");
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      return { error };
    }

    const errParam = parsed.searchParams.get("error");
    if (errParam) {
      const desc = parsed.searchParams.get("error_description") ?? errParam;
      return { error: new Error(desc) };
    }

    return { error: new Error("Callback sem code") };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export function listenForOAuthCallback(handler: (url: string) => void): () => void {
  let unlisten: UnlistenFn | null = null;
  let errUnlisten: UnlistenFn | null = null;
  let stopped = false;

  listen<string>("oauth-callback-url", (event) => {
    handler(event.payload);
  })
    .then((fn) => {
      if (stopped) fn();
      else unlisten = fn;
    })
    .catch(() => {});

  listen<string>("oauth-callback-error", (event) => {
    console.error("[oauth-loopback] erro do server:", event.payload);
  })
    .then((fn) => {
      if (stopped) fn();
      else errUnlisten = fn;
    })
    .catch(() => {});

  return () => {
    stopped = true;
    if (unlisten) unlisten();
    if (errUnlisten) errUnlisten();
  };
}
