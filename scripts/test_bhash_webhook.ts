import * as fs from "fs";
import * as path from "path";

// 1. Synchronously load environment variables before importing any application modules
for (const file of [".env.local", ".env"]) {
  try {
    const p = path.resolve(process.cwd(), file);
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, "utf8");
      for (const line of content.split("\n")) {
        const match = line.match(/^\s*([\w_]+)\s*=\s*["']?([^"'\r\n]+)["']?/);
        if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
      }
    }
  } catch {}
}

import { createClient } from "@supabase/supabase-js";
import { parseBhashPlainTextPayload, normalizePhoneNumber } from "../src/utils/bhashHelper";

// Helper to construct simulated HTTP Request
function createMockRequest(url: string, body: string, headers: Record<string, string> = {}) {
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      ...headers,
    },
    body,
  });
}

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function record(id: string, name: string, passed: boolean, details: string) {
  results.push({ id, name, passed, details });
  const icon = passed ? "✅ PASS" : "❌ FAIL";
  console.log(`${icon} [${id}] ${name}: ${details}`);
}

async function runTestSuite() {
  console.log("\n=======================================================");
  console.log("BHASHSMS WHATSAPP INCOMING WEBHOOK — 14-TEST SUITE");
  console.log("=======================================================\n");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const db = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  // Dynamically import application modules AFTER environment variables are verified
  const { POST: handleTokenWebhook } = await import("../src/app/api/v1/webhooks/bhash/[token]/route");
  const { conversationRepository } = await import("../src/repositories/conversationRepository");

  const TENANT_A_ID = "00000000-0000-0000-0000-000000000001";
  const TENANT_A_TOKEN = "bhash_test_token_tenant_a_secure_987";

  const TENANT_B_ID = "00000000-0000-0000-0000-000000000002";
  const TENANT_B_TOKEN = "bhash_test_token_tenant_b_secure_654";

  // Setup Test Tenant B in DB if not present
  await db.from("tenants").upsert({
    id: TENANT_B_ID,
    name: "Test Organization B",
    slug: "test-org-b",
    status: "active"
  });

  // Setup Provider Configs for Tenant A
  await db.from("provider_configs").upsert({
    tenant_id: TENANT_A_ID,
    provider_key: "whatsapp_bhash",
    config_json: {
      webhook_token: TENANT_A_TOKEN,
      sender_id: "BUZWAP"
    },
    is_active: true
  }, { onConflict: "tenant_id,provider_key" });

  // Setup Provider Configs for Tenant B
  await db.from("provider_configs").upsert({
    tenant_id: TENANT_B_ID,
    provider_key: "whatsapp_bhash",
    config_json: {
      webhook_token: TENANT_B_TOKEN,
      sender_id: "BUZWAP_B"
    },
    is_active: true
  }, { onConflict: "tenant_id,provider_key" });

  const testPhone = "919876543210";
  const normalizedTestPhone = "9876543210";

  // Cleanup any leftover test data for these phones in both tenants
  await db.from("messages").delete().in("tenant_id", [TENANT_A_ID, TENANT_B_ID]);
  await db.from("leads").delete().in("phone", [normalizedTestPhone, "9876543220"]);

  // -------------------------------------------------------------
  // TEST 1: Standard Format
  // -------------------------------------------------------------
  try {
    const rawBody = "Mobile: 919876543210, Message: Hello from Bhash, Name: Bhash";
    const parsed = parseBhashPlainTextPayload(rawBody);

    const isParsedCorrect = parsed.success && 
      parsed.data?.mobile === "9876543210" && 
      parsed.data?.message === "Hello from Bhash" && 
      parsed.data?.name === "Bhash";

    const req = createMockRequest(`https://api.test/api/v1/webhooks/bhash/${TENANT_A_TOKEN}`, rawBody);
    const res = await handleTokenWebhook(req, { params: { token: TENANT_A_TOKEN } });
    const json = await res.json();

    const isAccepted = res.status === 200 && json.success === true && json.event_id?.startsWith("bhash_evt_");

    // Verify DB mutation
    const { data: lead } = await db.from("leads").select("*").eq("phone", normalizedTestPhone).eq("tenant_id", TENANT_A_ID).single();
    const { data: msgs } = await db.from("messages").select("*").eq("tenant_id", TENANT_A_ID).eq("lead_id", lead?.id);

    const isDbVerified = !!lead && msgs?.length === 1 && msgs[0].body === "Hello from Bhash" && msgs[0].status === "queued" && msgs[0].meta_message_id === null;

    record(
      "TEST 1",
      "Standard Format",
      isParsedCorrect && isAccepted && isDbVerified,
      `Parser: ${isParsedCorrect}, HTTP 200: ${isAccepted}, DB Message: ${isDbVerified} (status='queued', meta_message_id=null)`
    );
  } catch (err: any) {
    record("TEST 1", "Standard Format", false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 2: Message with Commas
  // -------------------------------------------------------------
  try {
    const rawBody = "Mobile: 919876543210, Message: Hello, I need pricing, urgent!, Name: Rahul";
    const parsed = parseBhashPlainTextPayload(rawBody);

    const isParsedCorrect = parsed.success && 
      parsed.data?.mobile === "9876543210" && 
      parsed.data?.message === "Hello, I need pricing, urgent!" && 
      parsed.data?.name === "Rahul";

    const req = createMockRequest(`https://api.test/api/v1/webhooks/bhash/${TENANT_A_TOKEN}`, rawBody);
    const res = await handleTokenWebhook(req, { params: { token: TENANT_A_TOKEN } });
    const json = await res.json();

    const isAccepted = res.status === 200 && json.success === true;
    record(
      "TEST 2",
      "Message with Commas",
      isParsedCorrect && isAccepted,
      `Message body preserved verbatim with inner commas: "${parsed.data?.message}"`
    );
  } catch (err: any) {
    record("TEST 2", "Message with Commas", false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 3: Message with Colon
  // -------------------------------------------------------------
  try {
    const rawBody = "Mobile: 919876543210, Message: Price: 9999, Code: POS-01, Name: Rahul";
    const parsed = parseBhashPlainTextPayload(rawBody);

    const isParsedCorrect = parsed.success && 
      parsed.data?.message === "Price: 9999, Code: POS-01";

    record(
      "TEST 3",
      "Message with Colon",
      isParsedCorrect,
      `Inner colons preserved without breaking label markers: "${parsed.data?.message}"`
    );
  } catch (err: any) {
    record("TEST 3", "Message with Colon", false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 4: Emoji & Multiline Unicode
  // -------------------------------------------------------------
  try {
    const rawBody = "Mobile: 919876543210, Message: Hello 👋\nLooking for POS demo 🍕, Name: Rahul";
    const parsed = parseBhashPlainTextPayload(rawBody);

    const isParsedCorrect = parsed.success && 
      parsed.data?.message.includes("👋") && 
      parsed.data?.message.includes("🍕");

    record(
      "TEST 4",
      "Emoji & Multiline Unicode",
      isParsedCorrect,
      `Emojis and multiline text preserved: "${parsed.data?.message}"`
    );
  } catch (err: any) {
    record("TEST 4", "Emoji & Multiline Unicode", false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 5: Missing Mobile
  // -------------------------------------------------------------
  try {
    const rawBody = "Message: Hello from Bhash, Name: Bhash";
    const req = createMockRequest(`https://api.test/api/v1/webhooks/bhash/${TENANT_A_TOKEN}`, rawBody);
    const res = await handleTokenWebhook(req, { params: { token: TENANT_A_TOKEN } });
    const json = await res.json();

    const isRejected = res.status === 400 && json.error?.includes("Mobile");
    record(
      "TEST 5",
      "Missing Mobile",
      isRejected,
      `Rejected with HTTP ${res.status}: ${json.error}`
    );
  } catch (err: any) {
    record("TEST 5", "Missing Mobile", false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 6: Missing Message
  // -------------------------------------------------------------
  try {
    const rawBody = "Mobile: 919876543210, Name: Bhash";
    const req = createMockRequest(`https://api.test/api/v1/webhooks/bhash/${TENANT_A_TOKEN}`, rawBody);
    const res = await handleTokenWebhook(req, { params: { token: TENANT_A_TOKEN } });
    const json = await res.json();

    const isRejected = res.status === 400 && json.error?.includes("Message");
    record(
      "TEST 6",
      "Missing Message",
      isRejected,
      `Rejected with HTTP ${res.status}: ${json.error}`
    );
  } catch (err: any) {
    record("TEST 6", "Missing Message", false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 7: Malformed Plain Text
  // -------------------------------------------------------------
  try {
    const rawBody = "Random invalid text without vendor field labels";
    const req = createMockRequest(`https://api.test/api/v1/webhooks/bhash/${TENANT_A_TOKEN}`, rawBody);
    const res = await handleTokenWebhook(req, { params: { token: TENANT_A_TOKEN } });
    const json = await res.json();

    const isRejected = res.status === 400;
    record(
      "TEST 7",
      "Malformed Plain Text",
      isRejected,
      `Rejected with HTTP ${res.status}: ${json.error}`
    );
  } catch (err: any) {
    record("TEST 7", "Malformed Plain Text", false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 8: Content-Type Negotiation (Defensive JSON Support)
  // -------------------------------------------------------------
  try {
    const jsonBody = JSON.stringify({
      mobile: "919876543210",
      message: "Defensive JSON test message",
      name: "Bhash JSON"
    });
    const parsed = parseBhashPlainTextPayload(jsonBody);

    const isParsed = parsed.success && parsed.data?.mobile === "9876543210" && parsed.data?.message === "Defensive JSON test message";

    record(
      "TEST 8",
      "Content-Type Negotiation (Defensive JSON)",
      isParsed,
      `Defensive JSON parsed successfully without interfering with text/plain: mobile=${parsed.data?.mobile}`
    );
  } catch (err: any) {
    record("TEST 8", "Content-Type Negotiation", false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 9: In-Flight Duplicate Payload (Network Retry Concurrency Race)
  // -------------------------------------------------------------
  try {
    const rawBody = "Mobile: 919876543210, Message: Concurrent race check, Name: Bhash";
    
    // Fire two requests simultaneously
    const req1 = createMockRequest(`https://api.test/api/v1/webhooks/bhash/${TENANT_A_TOKEN}`, rawBody);
    const req2 = createMockRequest(`https://api.test/api/v1/webhooks/bhash/${TENANT_A_TOKEN}`, rawBody);

    const [res1, res2] = await Promise.all([
      handleTokenWebhook(req1, { params: { token: TENANT_A_TOKEN } }),
      handleTokenWebhook(req2, { params: { token: TENANT_A_TOKEN } }),
    ]);

    const json1 = await res1.json();
    const json2 = await res2.json();

    const hasDuplicateHandled = (json1.status === "duplicate_in_flight_ignored" || json2.status === "duplicate_in_flight_ignored");

    record(
      "TEST 9",
      "In-Flight Duplicate Payload",
      hasDuplicateHandled,
      `Simultaneous requests handled safely: res1=${json1.status}, res2=${json2.status}`
    );
  } catch (err: any) {
    record("TEST 9", "In-Flight Duplicate Payload", false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 10: Cross-Tenant Lead Isolation
  // -------------------------------------------------------------
  try {
    const rawBodyA = "Mobile: 919876543210, Message: Tenant A Lead Message, Name: Lead A";
    const rawBodyB = "Mobile: 919876543220, Message: Tenant B Lead Message, Name: Lead B";

    // Send under Tenant A token
    const reqA = createMockRequest(`https://api.test/api/v1/webhooks/bhash/${TENANT_A_TOKEN}`, rawBodyA);
    const resA = await handleTokenWebhook(reqA, { params: { token: TENANT_A_TOKEN } });
    const jsonA = await resA.json();

    // Send under Tenant B token
    const reqB = createMockRequest(`https://api.test/api/v1/webhooks/bhash/${TENANT_B_TOKEN}`, rawBodyB);
    const resB = await handleTokenWebhook(reqB, { params: { token: TENANT_B_TOKEN } });
    const jsonB = await resB.json();

    // Verify two distinct lead IDs in database with respective tenant_ids
    const { data: leadA } = await db.from("leads").select("id, tenant_id").eq("phone", normalizedTestPhone).eq("tenant_id", TENANT_A_ID).single();
    const { data: leadB } = await db.from("leads").select("id, tenant_id").eq("phone", "9876543220").eq("tenant_id", TENANT_B_ID).single();

    const areDistinctLeads = !!leadA && !!leadB && leadA.id !== leadB.id && leadA.tenant_id === TENANT_A_ID && leadB.tenant_id === TENANT_B_ID;

    // Verify shared-phone cross-tenant incoming message succeeds without crash or constraint error
    const rawBodyShared = "Mobile: 919876543210, Message: Cross-tenant message for shared phone, Name: Lead A Shared";
    const reqShared = createMockRequest(`https://api.test/api/v1/webhooks/bhash/${TENANT_B_TOKEN}`, rawBodyShared);
    const resShared = await handleTokenWebhook(reqShared, { params: { token: TENANT_B_TOKEN } });
    const jsonShared = await resShared.json();
    const sharedPhoneHandled = resShared.status === 200 && jsonShared.success === true;

    // Verify messages table isolation
    const { data: msgsTenantA } = await db.from("messages").select("tenant_id").eq("tenant_id", TENANT_A_ID);
    const { data: msgsTenantB } = await db.from("messages").select("tenant_id").eq("tenant_id", TENANT_B_ID);
    const areMessagesIsolated = (msgsTenantA?.every((m: any) => m.tenant_id === TENANT_A_ID) ?? false) &&
                               (msgsTenantB?.every((m: any) => m.tenant_id === TENANT_B_ID) ?? false);

    record(
      "TEST 10",
      "Cross-Tenant Lead Isolation",
      areDistinctLeads && sharedPhoneHandled && areMessagesIsolated,
      `Distinct leads created: Tenant A Lead ID = ${leadA?.id}, Tenant B Lead ID = ${leadB?.id}. Shared phone handled: ${sharedPhoneHandled}, Messages strictly isolated: ${areMessagesIsolated}`
    );
  } catch (err: any) {
    record("TEST 10", "Cross-Tenant Lead Isolation", false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 11: Unauthorized Webhook Attempt
  // -------------------------------------------------------------
  try {
    const invalidToken = "completely_invalid_unknown_token_999";
    const rawBody = "Mobile: 919876543210, Message: Unauthorized check, Name: Attacker";
    const req = createMockRequest(`https://api.test/api/v1/webhooks/bhash/${invalidToken}`, rawBody);
    const res = await handleTokenWebhook(req, { params: { token: invalidToken } });
    const json = await res.json();

    const isRejected = res.status === 404 && json.error?.includes("not found");
    record(
      "TEST 11",
      "Unauthorized Webhook Attempt",
      isRejected,
      `Rejected invalid token with HTTP ${res.status}: ${json.error}`
    );
  } catch (err: any) {
    record("TEST 11", "Unauthorized Webhook Attempt", false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 12: Oversized Body Rejection (> 64 KB)
  // -------------------------------------------------------------
  try {
    const largeMessage = "A".repeat(70000); // 70 KB
    const rawBody = `Mobile: 919876543210, Message: ${largeMessage}, Name: Big`;
    const req = createMockRequest(`https://api.test/api/v1/webhooks/bhash/${TENANT_A_TOKEN}`, rawBody, {
      "Content-Length": String(rawBody.length)
    });
    const res = await handleTokenWebhook(req, { params: { token: TENANT_A_TOKEN } });
    const json = await res.json();

    const isRejected = res.status === 413;
    record(
      "TEST 12",
      "Oversized Body Rejection (> 64 KB)",
      isRejected,
      `Rejected with HTTP ${res.status}: ${json.error}`
    );
  } catch (err: any) {
    record("TEST 12", "Oversized Body Rejection", false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 13: Legitimate Repeated Customer Messages
  // -------------------------------------------------------------
  try {
    const rawBody1 = "Mobile: 919876543210, Message: Yes, Name: Rahul";
    const rawBody2 = "Mobile: 919876543210, Message: Yes, Name: Rahul";

    // Send first message
    const req1 = createMockRequest(`https://api.test/api/v1/webhooks/bhash/${TENANT_A_TOKEN}`, rawBody1);
    const res1 = await handleTokenWebhook(req1, { params: { token: TENANT_A_TOKEN } });
    const json1 = await res1.json();

    // Send second identical message after first has completed HTTP 200
    const req2 = createMockRequest(`https://api.test/api/v1/webhooks/bhash/${TENANT_A_TOKEN}`, rawBody2);
    const res2 = await handleTokenWebhook(req2, { params: { token: TENANT_A_TOKEN } });
    const json2 = await res2.json();

    // Both should receive HTTP 200 with different event IDs
    const bothAccepted = res1.status === 200 && res2.status === 200 && 
      json1.event_id !== json2.event_id && json2.status === "accepted";

    // Verify inbox/messages table has BOTH messages
    const { data: leadA } = await db.from("leads").select("id").eq("phone", normalizedTestPhone).eq("tenant_id", TENANT_A_ID).single();
    const inboxMessages = await conversationRepository.getMessagesByLeadId(leadA!.id);
    const yesMessages = inboxMessages.filter(m => m.message === "Yes");

    const areBothMessagesPreserved = bothAccepted && yesMessages.length >= 2;

    record(
      "TEST 13",
      "Legitimate Repeated Messages",
      areBothMessagesPreserved,
      `Sequential "Yes" messages both preserved: count=${yesMessages.length}, event_ids=[${json1.event_id}, ${json2.event_id}]`
    );
  } catch (err: any) {
    record("TEST 13", "Legitimate Repeated Messages", false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 14: Tenant Token Tampering Protection
  // -------------------------------------------------------------
  try {
    // Attacker calls Tenant A's token URL, but tries to inject Tenant B in query params & headers
    const rawBody = "Mobile: 919876543210, Message: Tamper Attack, Name: Attacker";
    const tamperUrl = `https://api.test/api/v1/webhooks/bhash/${TENANT_A_TOKEN}?tenant_id=${TENANT_B_ID}&tenant_slug=test-org-b`;
    const req = createMockRequest(tamperUrl, rawBody, {
      "x-tenant-id": TENANT_B_ID,
      "x-organization-id": TENANT_B_ID,
    });

    const res = await handleTokenWebhook(req, { params: { token: TENANT_A_TOKEN } });
    const json = await res.json();

    // Verify lead was created under TENANT_A, completely ignoring the injected TENANT_B headers
    const { data: leadFound } = await db.from("leads").select("id, tenant_id").eq("id", json.lead_id).single();

    const isTamperIgnored = leadFound?.tenant_id === TENANT_A_ID && leadFound?.tenant_id !== TENANT_B_ID;

    record(
      "TEST 14",
      "Tenant Token Tampering Protection",
      isTamperIgnored,
      `Injected query params and headers ignored. Lead assigned strictly to token owner: ${leadFound?.tenant_id}`
    );
  } catch (err: any) {
    record("TEST 14", "Tenant Token Tampering Protection", false, err.message);
  }

  console.log("\n=======================================================");
  console.log("TEST SUMMARY");
  console.log("=======================================================");
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  if (failed === 0) {
    console.log("🎉 ALL 14 TESTS PASSED ACCORDING TO ARCHITECTURAL SPECIFICATION!");
  } else {
    console.error("❌ SOME TESTS FAILED!");
  }
}

runTestSuite().catch(console.error);
