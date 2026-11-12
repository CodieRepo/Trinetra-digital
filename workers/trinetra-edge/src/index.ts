export interface EdgeKV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface EdgeCache {
  match(request: Request | string): Promise<Response | undefined>;
  put(request: Request | string, response: Response): Promise<void>;
  delete(request: Request | string): Promise<boolean>;
}

export interface WorkersAiBinding {
  run(
    model: string,
    input: {
      messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
      max_tokens?: number;
      temperature?: number;
    }
  ): Promise<{ response?: string } | string>;
}

export interface EdgeWorkerEnv {
  APP_ORIGIN: string;
  TRINETRA_EDGE_SECRET: string;
  AI_MODEL_PRIMARY?: string;
  AI_MODEL_FAST?: string;
  MENU_CACHE?: EdgeKV;
  RATE_LIMIT_KV?: EdgeKV;
  AI?: WorkersAiBinding;
}

export interface EdgeHandleOptions {
  fetchImpl?: typeof fetch;
  cache?: EdgeCache;
}

const DEFAULT_PRIMARY_MODEL = "@cf/meta/llama-3.2-3b-instruct";
const DEFAULT_FAST_MODEL = "@cf/meta/llama-3.2-3b-instruct";
const MAX_WEBHOOK_BYTES = 1_048_576;

function jsonResponse(payload: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

function getBearerToken(request: Request): string {
  const auth = request.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return "";
  return auth.slice(7).trim();
}

function isEdgeAuthorized(request: Request, env: EdgeWorkerEnv): boolean {
  const expected = (env.TRINETRA_EDGE_SECRET || "").trim();
  if (!expected) return false;
  return getBearerToken(request) === expected;
}

async function hashShort(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest).slice(0, 8))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function runWorkersAi(
  env: EdgeWorkerEnv,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 320
): Promise<{ reply: string; model: string }> {
  if (!env.AI) {
    throw new Error("Cloudflare Workers AI binding (AI) is not configured");
  }
  const result = await env.AI.run(model, {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: maxTokens,
    temperature: 0.25,
  });
  const reply = typeof result === "string" ? result : result?.response || "";
  return { reply: reply.trim(), model };
}

async function checkEdgeRateLimit(
  kv: EdgeKV | undefined,
  key: string,
  maxRequests: number,
  windowSeconds = 60
): Promise<{ allowed: boolean; count: number }> {
  if (!kv) return { allowed: true, count: 0 };
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const fullKey = `rl:${key}:${bucket}`;
  const raw = await kv.get(fullKey);
  const current = raw ? Number.parseInt(raw, 10) || 0 : 0;
  if (current >= maxRequests) {
    return { allowed: false, count: current };
  }
  await kv.put(fullKey, String(current + 1), { expirationTtl: windowSeconds * 2 });
  return { allowed: true, count: current + 1 };
}

async function handleAiRoute(pathname: string, request: Request, env: EdgeWorkerEnv): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }
  if (!isEdgeAuthorized(request, env)) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON payload" }, 400);
  }

  const primaryModel = env.AI_MODEL_PRIMARY || DEFAULT_PRIMARY_MODEL;
  const fastModel = env.AI_MODEL_FAST || DEFAULT_FAST_MODEL;

  try {
    if (pathname === "/ai/bhash-reply") {
      const leadName = String(body.leadName || "Customer");
      const message = String(body.message || "").trim();
      const history = Array.isArray(body.history) ? body.history.slice(-5) : [];
      if (!message) {
        return jsonResponse({ ok: false, error: "message is required" }, 400);
      }

      const systemPrompt =
        "You are Trinetra Digital Solution's CRM WhatsApp/BhashSMS copilot. Draft a polite, concise, conversion-focused WhatsApp reply (max 3 short sentences, Hinglish/English natural tone matching the user, zero hallucinated prices). Return only the reply text.";
      const userPrompt = `Lead: ${leadName}\nRecent context: ${JSON.stringify(history)}\nLatest inbound message: ${message}`;
      const out = await runWorkersAi(env, primaryModel, systemPrompt, userPrompt, 240);
      return jsonResponse({ ok: true, ...out });
    }

    if (pathname === "/ai/restro-copilot") {
      const question = String(body.question || "").trim();
      const snapshot = body.snapshot ?? {};
      const restaurantName = String(body.restaurantName || (snapshot as Record<string, unknown>)?.restaurantName || "this restaurant").trim();
      if (!question) {
        return jsonResponse({ ok: false, error: "question is required" }, 400);
      }

      const currency = String((snapshot as Record<string, unknown>)?.currency || "INR");
      const currencySymbol = String((snapshot as Record<string, unknown>)?.currencySymbol || (currency === "INR" ? "₹" : `${currency} `));
      const systemPrompt =
        `You are the private read-only Operations Assistant exclusively for "${restaurantName}". Answer strictly and ONLY from the provided live JSON snapshot for "${restaurantName}" (revenue, orders, tables, low stock). Always format all monetary amounts using "${currencySymbol}" (${currency}) as shown in todayRevenueFormatted—NEVER use "$" unless currency is USD. Clearly distinguish total todayOrdersCount from activeOrders (only open/unserved orders). Never invent numbers, never claim to modify bills/orders, and NEVER mention or disclose anything about Trinetra, platform internals, pricing, or any other restaurant. If asked about anything outside "${restaurantName}"'s live operations, politely refuse and state you only have access to "${restaurantName}"'s live operations.`;
      const userPrompt = `Live Snapshot for ${restaurantName}:\n${JSON.stringify(snapshot)}\n\nStaff Question: ${question}`;
      const out = await runWorkersAi(env, primaryModel, systemPrompt, userPrompt, 320);
      return jsonResponse({ ok: true, ...out });
    }

    if (pathname === "/ai/website-chat") {
      const message = String(body.message || "").trim();
      const knowledgeContext = String(body.knowledgeContext || "");
      if (!message) {
        return jsonResponse({ ok: false, error: "message is required" }, 400);
      }

      const systemPrompt =
        "You are Trinetra Digital Solution's Advisor. Answer concisely about Trinetra Restaurant OS, Trinetra CRM, Web/App engineering, and BhashSMS automation using the provided context. If unsure, invite the user to book a demo or WhatsApp +91 88107 21068.";
      const userPrompt = knowledgeContext
        ? `Context:\n${knowledgeContext}\n\nVisitor Question: ${message}`
        : `Visitor Question: ${message}`;
      const out = await runWorkersAi(env, fastModel, systemPrompt, userPrompt, 280);
      return jsonResponse({ ok: true, ...out });
    }

    if (pathname === "/ai/normalize-bhash-history") {
      const rawText = String(body.rawText || "").trim();
      if (!rawText) {
        return jsonResponse({ ok: false, error: "rawText is required" }, 400);
      }

      const systemPrompt =
        'You are a strict JSON parser for messy WhatsApp/BhashSMS chat logs. Convert the raw input into a JSON array of objects with exact keys: "phone" (10-digit string), "name" (string), "direction" ("inbound" or "outbound"), "message" (clean text), "timestamp" (ISO string or YYYY-MM-DD HH:mm:ss). Return ONLY valid JSON array, no markdown.';
      const userPrompt = `Normalize this chat log:\n${rawText.slice(0, 6000)}`;
      const out = await runWorkersAi(env, fastModel, systemPrompt, userPrompt, 700);
      return jsonResponse({ ok: true, ...out });
    }

    return jsonResponse({ ok: false, error: "Unknown AI route" }, 404);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Workers AI error";
    return jsonResponse({ ok: false, error: message }, 502);
  }
}

async function proxyToOrigin(
  request: Request,
  env: EdgeWorkerEnv,
  fetchImpl: typeof fetch
): Promise<Response> {
  const originBase = (env.APP_ORIGIN || "https://trinetradigitalsolution.com").replace(/\/+$/, "");
  const incomingUrl = new URL(request.url);
  const targetUrl = `${originBase}${incomingUrl.pathname}${incomingUrl.search}`;

  const headers = new Headers(request.headers);
  headers.set("x-trinetra-edge", "1");

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  return fetchImpl(targetUrl, init);
}

export async function handleEdgeRequest(
  request: Request,
  env: EdgeWorkerEnv,
  options: EdgeHandleOptions = {}
): Promise<Response> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const cache = options.cache ?? (typeof caches !== "undefined" ? (caches as unknown as { default: EdgeCache }).default : undefined);
  const url = new URL(request.url);
  const { pathname } = url;

  if (pathname === "/__edge/health") {
    return jsonResponse({
      ok: true,
      service: "trinetra-edge",
      hasAi: Boolean(env.AI),
      hasMenuCache: Boolean(env.MENU_CACHE),
      hasRateLimitKv: Boolean(env.RATE_LIMIT_KV),
    });
  }

  if (pathname === "/__edge/purge-menu" && request.method === "POST") {
    if (!isEdgeAuthorized(request, env)) {
      return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
    }
    const body = (await request.json().catch(() => ({}))) as { restaurantId?: string };
    const restaurantId = String(body.restaurantId || "global");
    const nextVersion = String(Date.now());
    if (env.MENU_CACHE) {
      await env.MENU_CACHE.put(`menu_ver:${restaurantId}`, nextVersion, { expirationTtl: 86400 });
    }
    return jsonResponse({ ok: true, restaurantId, version: nextVersion });
  }

  if (pathname.startsWith("/ai/")) {
    return handleAiRoute(pathname, request, env);
  }

  // Webhook pre-validation at edge before hitting Vercel
  if (pathname.startsWith("/api/webhooks/") || pathname.startsWith("/api/v1/webhooks/")) {
    if (request.method === "POST") {
      const len = Number.parseInt(request.headers.get("content-length") || "0", 10);
      if (len > MAX_WEBHOOK_BYTES) {
        return jsonResponse({ ok: false, error: "Webhook payload too large" }, 413);
      }
      const rawBody = await request.clone().text();
      if (!rawBody.trim()) {
        return jsonResponse({ ok: false, error: "Empty webhook payload" }, 400);
      }
    }
    return proxyToOrigin(request, env, fetchImpl);
  }

  // Distributed Edge Rate Limiting for auth & lead capture endpoints
  const clientIp = request.headers.get("cf-connecting-ip") || "unknown";
  if (
    request.method === "POST" &&
    (pathname === "/api/auth/login" || pathname.startsWith("/api/staff/auth/"))
  ) {
    const rl = await checkEdgeRateLimit(env.RATE_LIMIT_KV, `auth:${clientIp}`, 15, 60);
    if (!rl.allowed) {
      return jsonResponse(
        { ok: false, error: "Too many authentication attempts. Please wait 60 seconds." },
        429,
        { "retry-after": "60" }
      );
    }
  } else if (request.method === "POST" && pathname === "/api/leads") {
    const rl = await checkEdgeRateLimit(env.RATE_LIMIT_KV, `leads:${clientIp}`, 20, 60);
    if (!rl.allowed) {
      return jsonResponse({ ok: false, error: "Rate limit exceeded" }, 429, { "retry-after": "60" });
    }
  }

  // Never cache realtime Restaurant OS, POS, KDS, Waiter, or cron endpoints
  if (
    pathname.startsWith("/api/client/restaurant/orders") ||
    pathname.startsWith("/api/client/restaurant/kitchen") ||
    pathname.startsWith("/api/client/restaurant/sessions") ||
    pathname.startsWith("/api/jobs/") ||
    pathname === "/api/health"
  ) {
    return proxyToOrigin(request, env, fetchImpl);
  }

  // 10s Cache API micro-cache for CRM Analytics (zero KV write burn)
  if (request.method === "GET" && (pathname === "/api/analytics" || pathname === "/api/v1/analytics") && cache) {
    const authFingerprint = await hashShort(
      `${request.headers.get("authorization") || ""}|${request.headers.get("cookie") || ""}`
    );
    const cacheKey = new Request(`${url.origin}${pathname}${url.search}${url.search ? "&" : "?"}_ek=${authFingerprint}`);
    const cached = await cache.match(cacheKey);
    if (cached) {
      const hitHeaders = new Headers(cached.headers);
      hitHeaders.set("x-trinetra-edge-cache", "HIT");
      return new Response(cached.body, { status: cached.status, headers: hitHeaders });
    }
    const originRes = await proxyToOrigin(request, env, fetchImpl);
    if (originRes.status === 200) {
      const toCache = new Response(originRes.clone().body, {
        status: 200,
        headers: {
          "content-type": originRes.headers.get("content-type") || "application/json",
          "cache-control": "public, max-age=10",
        },
      });
      await cache.put(cacheKey, toCache);
    }
    const missHeaders = new Headers(originRes.headers);
    missHeaders.set("x-trinetra-edge-cache", "MISS");
    return new Response(originRes.body, { status: originRes.status, headers: missHeaders });
  }

  // 60s Cache API micro-cache for public QR Menu reads
  if (request.method === "GET" && pathname.startsWith("/api/r/") && cache) {
    const cacheKey = new Request(`${url.origin}${pathname}${url.search}`);
    const cached = await cache.match(cacheKey);
    if (cached) {
      const hitHeaders = new Headers(cached.headers);
      hitHeaders.set("x-trinetra-edge-cache", "HIT");
      return new Response(cached.body, { status: cached.status, headers: hitHeaders });
    }
    const originRes = await proxyToOrigin(request, env, fetchImpl);
    if (originRes.status === 200) {
      const toCache = new Response(originRes.clone().body, {
        status: 200,
        headers: {
          "content-type": originRes.headers.get("content-type") || "application/json",
          "cache-control": "public, max-age=60",
        },
      });
      await cache.put(cacheKey, toCache);
    }
    const missHeaders = new Headers(originRes.headers);
    missHeaders.set("x-trinetra-edge-cache", "MISS");
    return new Response(originRes.body, { status: originRes.status, headers: missHeaders });
  }

  return proxyToOrigin(request, env, fetchImpl);
}

export default {
  async fetch(request: Request, env: EdgeWorkerEnv): Promise<Response> {
    return handleEdgeRequest(request, env);
  },
};
