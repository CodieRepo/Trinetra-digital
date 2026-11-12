import test from "node:test";
import assert from "node:assert/strict";
import { CloudflareWorkersAiProvider } from "../../src/services/ai/cloudflare";
import { getAIProvider } from "../../src/services/ai";

test("CloudflareWorkersAiProvider generates structured summary from Workers AI binding", async () => {
  const mockAi = {
    async run(_model: string, _input: unknown) {
      return {
        response: JSON.stringify({
          summary: "Customer wants pricing for Restaurant POS.",
          score: 88,
          intent: "QUOTATION_REQUIRED",
        }),
      };
    },
  };

  const provider = new CloudflareWorkersAiProvider(mockAi);
  const res = await provider.generateLeadSummary("Hi, need POS pricing for my cafe");
  assert.equal(res.score, 88);
  assert.equal(res.intent, "QUOTATION_REQUIRED");
  assert.match(res.summary, /Restaurant POS/);
});

test("getAIProvider('cloudflare') returns CloudflareWorkersAiProvider", () => {
  const provider = getAIProvider("cloudflare");
  assert.ok(provider instanceof CloudflareWorkersAiProvider);
});
