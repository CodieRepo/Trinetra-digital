import test from "node:test";
import assert from "node:assert/strict";
import { callEdgeAiRoute } from "../../src/services/ai/edgeWorkerClient";

test("callEdgeAiRoute returns fallback status when TRINETRA_EDGE_URL or secret is missing", async () => {
  const res = await callEdgeAiRoute(
    "/ai/bhash-reply",
    { message: "hello" },
    { edgeUrl: "", edgeSecret: "" }
  );
  assert.equal(res.ok, false);
  assert.equal(res.fallback, true);
});

test("callEdgeAiRoute sends Bearer secret and returns AI reply from worker", async () => {
  let seenAuth: string | null = null;
  let seenUrl = "";
  const mockFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    seenUrl = typeof input === "string" ? input : input.toString();
    seenAuth = new Headers(init?.headers).get("authorization");
    return new Response(
      JSON.stringify({ ok: true, reply: "Namaste! Demo link shared.", model: "@cf/meta/llama-3.1-8b-instruct" }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }) as typeof fetch;

  const res = await callEdgeAiRoute(
    "/ai/bhash-reply",
    { leadName: "Amit", message: "Demo chahiye" },
    {
      edgeUrl: "https://trinetra-edge.suryavanshisatwik792.workers.dev/",
      edgeSecret: "secret-abc",
      fetchImpl: mockFetch,
    }
  );

  assert.equal(seenUrl, "https://trinetra-edge.suryavanshisatwik792.workers.dev/ai/bhash-reply");
  assert.equal(seenAuth, "Bearer secret-abc");
  assert.equal(res.ok, true);
  assert.equal(res.reply, "Namaste! Demo link shared.");
});
