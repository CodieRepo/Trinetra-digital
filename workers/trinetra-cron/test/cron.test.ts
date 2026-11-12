import test from "node:test";
import assert from "node:assert/strict";
import { runCronSchedule } from "../src/index";

test("runCronSchedule dispatches */2 outbox job and health check with Bearer secret", async () => {
  const calls: Array<{ url: string; method?: string; auth?: string | null }> = [];
  const mockFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const headers = new Headers(init?.headers);
    calls.push({ url, method: init?.method, auth: headers.get("authorization") });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as typeof fetch;

  const result = await runCronSchedule(
    "*/2 * * * *",
    {
      APP_BASE_URL: "https://trinetradigitalsolution.com/",
      JOB_SECRET_KEY: "test-job-secret",
      SCRAPER_SECRET: "test-scraper-secret",
    },
    mockFetch
  );

  assert.equal(result.ok, true);
  assert.equal(calls.length, 2);
  assert.deepEqual(
    calls.map((c) => c.url),
    [
      "https://trinetradigitalsolution.com/api/jobs/run",
      "https://trinetradigitalsolution.com/api/health",
    ]
  );
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].auth, "Bearer test-job-secret");
});

test("runCronSchedule returns error status without throwing when JOB_SECRET_KEY is missing", async () => {
  const result = await runCronSchedule(
    "*/2 * * * *",
    {
      APP_BASE_URL: "https://trinetradigitalsolution.com",
      JOB_SECRET_KEY: "",
      SCRAPER_SECRET: "test-scraper-secret",
    },
    fetch
  );

  assert.equal(result.ok, false);
  assert.match(result.error || "", /JOB_SECRET_KEY/i);
});

test("runCronSchedule dispatches */10 bhash sync with Bearer auth header", async () => {
  const calls: Array<{ url: string; method?: string; auth?: string | null }> = [];
  const mockFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const headers = new Headers(init?.headers);
    calls.push({ url, method: init?.method, auth: headers.get("authorization") });
    return new Response(JSON.stringify({ synced: 0 }), { status: 200 });
  }) as typeof fetch;

  const result = await runCronSchedule(
    "*/10 * * * *",
    {
      APP_BASE_URL: "https://trinetradigitalsolution.com",
      JOB_SECRET_KEY: "test-job-secret",
      SCRAPER_SECRET: "test-scraper-secret",
    },
    mockFetch
  );

  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://trinetradigitalsolution.com/api/v1/bhash/sync");
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].auth, "Bearer test-scraper-secret");
});
