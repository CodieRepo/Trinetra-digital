import test from "node:test";
import assert from "node:assert/strict";
import { classifyInboundMessage } from "../../src/services/leadClassifierService";

test("classifyInboundMessage classifies website pricing inquiry cleanly without fs runtime reads", () => {
  const result = classifyInboundMessage(
    "Need custom website price and CRM integration",
    "9876543210",
    "6232",
    []
  );

  assert.equal(result.leadTemperature, "hot");
  assert.ok(result.score >= 95);
  assert.ok(typeof result.intent === "string" && result.intent.length > 0);
  assert.match(result.summary, /Customer message indicates/i);
});
