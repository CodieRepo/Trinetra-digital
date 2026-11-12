export interface EdgeAiCallOptions {
  edgeUrl?: string;
  edgeSecret?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export interface EdgeAiCallResult {
  ok: boolean;
  fallback?: boolean;
  reply?: string;
  model?: string;
  error?: string;
}

const DEFAULT_EDGE_URL = "https://trinetra-edge.suryavanshisatwik792.workers.dev";

/**
 * Invokes Cloudflare `trinetra-edge` Workers AI endpoints from Next.js server routes.
 * Gracefully degrades to `{ ok: false, fallback: true }` if credentials are unset or unreachable.
 */
export async function callEdgeAiRoute(
  route: "/ai/bhash-reply" | "/ai/restro-copilot" | "/ai/website-chat",
  payload: Record<string, unknown>,
  options: EdgeAiCallOptions = {}
): Promise<EdgeAiCallResult> {
  const baseUrl = (options.edgeUrl ?? process.env.TRINETRA_EDGE_URL ?? DEFAULT_EDGE_URL)
    .trim()
    .replace(/\/+$/, "");
  const secret = (options.edgeSecret ?? process.env.TRINETRA_EDGE_SECRET ?? "").trim();

  if (!baseUrl || !secret) {
    return {
      ok: false,
      fallback: true,
      error: "TRINETRA_EDGE_URL or TRINETRA_EDGE_SECRET is not configured",
    };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 8000);

  try {
    const response = await fetchImpl(`${baseUrl}${route}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      reply?: string;
      model?: string;
      error?: string;
    };

    if (!response.ok || !data.ok || !data.reply) {
      return {
        ok: false,
        fallback: true,
        error: data.error || `Edge AI returned HTTP ${response.status}`,
      };
    }

    return {
      ok: true,
      reply: data.reply,
      model: data.model,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      fallback: true,
      error: err instanceof Error ? err.message : "Edge AI request failed",
    };
  } finally {
    clearTimeout(timer);
  }
}
