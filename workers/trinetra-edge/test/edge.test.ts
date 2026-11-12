import test from "node:test";
import assert from "node:assert/strict";
import { handleEdgeRequest, type EdgeWorkerEnv } from "../src/index";

function createMockKV() {
  const store = new Map<string, string>();
  return {
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
    async delete(key: string) {
      store.delete(key);
    },
  };
}

function createMockCache() {
  const store = new Map<string, Response>();
  return {
    async match(req: Request | string) {
      const key = typeof req === "string" ? req : req.url;
      const hit = store.get(key);
      return hit ? hit.clone() : undefined;
    },
    async put(req: Request | string, res: Response) {
      const key = typeof req === "string" ? req : req.url;
      store.set(key, res.clone());
    },
    async delete(req: Request | string) {
      const key = typeof req === "string" ? req : req.url;
      return store.delete(key);
    },
  };
}

function createTestEnv(overrides: Partial<EdgeWorkerEnv> = {}): EdgeWorkerEnv {
  return {
    APP_ORIGIN: "https://trinetradigitalsolution.com",
    TRINETRA_EDGE_SECRET: "edge-secret-123",
    AI_MODEL_PRIMARY: "@cf/meta/llama-3.2-3b-instruct",
    AI_MODEL_FAST: "@cf/meta/llama-3.2-3b-instruct",
    MENU_CACHE: createMockKV(),
    RATE_LIMIT_KV: createMockKV(),
    AI: {
      async run(_model: string, input: { messages: Array<{ role: string; content: string }> }) {
        const last = input.messages[input.messages.length - 1]?.content || "";
        return { response: `AI_OK:${last.slice(0, 40)}` };
      },
    },
    ...overrides,
  };
}

test("/ai/bhash-reply rejects unauthorized requests with 401", async () => {
  const env = createTestEnv();
  const req = new Request("https://trinetra-edge.workers.dev/ai/bhash-reply", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "Need menu POS demo" }),
  });

  const res = await handleEdgeRequest(req, env, { cache: createMockCache() });
  assert.equal(res.status, 401);
});

test("/ai/bhash-reply returns drafted reply and summary with valid Bearer token", async () => {
  const env = createTestEnv();
  const req = new Request("https://trinetra-edge.workers.dev/ai/bhash-reply", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer edge-secret-123",
    },
    body: JSON.stringify({
      leadName: "Rahul Sharma",
      message: "Need pricing for Restaurant OS for 2 outlets",
    }),
  });

  const res = await handleEdgeRequest(req, env, { cache: createMockCache() });
  assert.equal(res.status, 200);
  const data = (await res.json()) as { ok: boolean; reply: string };
  assert.equal(data.ok, true);
  assert.ok(data.reply.includes("AI_OK:"));
});

test("/ai/restro-copilot answers using restaurant snapshot", async () => {
  const env = createTestEnv();
  const req = new Request("https://trinetra-edge.workers.dev/ai/restro-copilot", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer edge-secret-123",
    },
    body: JSON.stringify({
      question: "What is low in stock today?",
      snapshot: { todayRevenue: 14500, activeOrders: 6, lowStockItems: ["Paneer", "Butter"] },
    }),
  });

  const res = await handleEdgeRequest(req, env, { cache: createMockCache() });
  assert.equal(res.status, 200);
  const data = (await res.json()) as { ok: boolean; reply: string };
  assert.equal(data.ok, true);
  assert.ok(data.reply.length > 0);
});

test("/ai/website-chat returns AI advisor response", async () => {
  const env = createTestEnv();
  const req = new Request("https://trinetra-edge.workers.dev/ai/website-chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer edge-secret-123",
    },
    body: JSON.stringify({
      message: "Do you support QR ordering?",
    }),
  });

  const res = await handleEdgeRequest(req, env, { cache: createMockCache() });
  assert.equal(res.status, 200);
  const data = (await res.json()) as { ok: boolean; reply: string };
  assert.equal(data.ok, true);
  assert.ok(data.reply.startsWith("AI_OK:"));
});

test("rate limiter blocks repeated POST /api/auth/login with 429 at edge", async () => {
  const env = createTestEnv();
  const cache = createMockCache();
  let originHits = 0;
  const mockFetch = (async () => {
    originHits += 1;
    return new Response(JSON.stringify({ ok: false }), { status: 401 });
  }) as typeof fetch;

  let lastStatus = 200;
  for (let i = 0; i < 16; i += 1) {
    const req = new Request("https://trinetradigitalsolution.com/api/auth/login", {
      method: "POST",
      headers: { "cf-connecting-ip": "1.2.3.4", "content-type": "application/json" },
      body: JSON.stringify({ email: "a@b.com" }),
    });
    const res = await handleEdgeRequest(req, env, { fetchImpl: mockFetch, cache });
    lastStatus = res.status;
  }

  assert.equal(lastStatus, 429);
  assert.equal(originHits, 15);
});

test("GET /api/analytics uses 10s edge micro-cache without hitting origin twice", async () => {
  const env = createTestEnv();
  const cache = createMockCache();
  let originHits = 0;
  const mockFetch = (async () => {
    originHits += 1;
    return new Response(JSON.stringify({ success: true, total: 42 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  const req1 = new Request("https://trinetradigitalsolution.com/api/analytics", {
    headers: { authorization: "Bearer token-a" },
  });
  const res1 = await handleEdgeRequest(req1, env, { fetchImpl: mockFetch, cache });
  assert.equal(res1.status, 200);
  assert.equal(res1.headers.get("x-trinetra-edge-cache"), "MISS");

  const req2 = new Request("https://trinetradigitalsolution.com/api/analytics", {
    headers: { authorization: "Bearer token-a" },
  });
  const res2 = await handleEdgeRequest(req2, env, { fetchImpl: mockFetch, cache });
  assert.equal(res2.status, 200);
  assert.equal(res2.headers.get("x-trinetra-edge-cache"), "HIT");
  assert.equal(originHits, 1);
});

test("realtime restaurant order routes bypass edge cache completely", async () => {
  const env = createTestEnv();
  const cache = createMockCache();
  let originHits = 0;
  const mockFetch = (async () => {
    originHits += 1;
    return new Response(JSON.stringify({ orders: [] }), { status: 200 });
  }) as typeof fetch;

  for (let i = 0; i < 2; i += 1) {
    const req = new Request("https://trinetradigitalsolution.com/api/client/restaurant/orders");
    const res = await handleEdgeRequest(req, env, { fetchImpl: mockFetch, cache });
    assert.equal(res.status, 200);
  }
  assert.equal(originHits, 2);
});

test("webhook pre-validation rejects empty POST body with 400 at edge", async () => {
  const env = createTestEnv();
  let originHits = 0;
  const mockFetch = (async () => {
    originHits += 1;
    return new Response("ok", { status: 200 });
  }) as typeof fetch;

  const req = new Request("https://trinetradigitalsolution.com/api/webhooks/bhash", {
    method: "POST",
    body: "",
  });
  const res = await handleEdgeRequest(req, env, { fetchImpl: mockFetch, cache: createMockCache() });
  assert.equal(res.status, 400);
  assert.equal(originHits, 0);
});
