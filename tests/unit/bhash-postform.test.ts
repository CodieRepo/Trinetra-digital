import test from "node:test";
import assert from "node:assert/strict";
import { postForm } from "../../src/lib/bhash/postForm";

test("postForm sends URL-encoded body, cookies, and extracts Set-Cookie headers cleanly", async () => {
  let seenBody = "";
  let seenCookie: string | null = null;

  const mockFetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    seenBody = String(init?.body || "");
    const h = new Headers(init?.headers);
    seenCookie = h.get("cookie");
    return new Response("OK", {
      status: 302,
      headers: { "set-cookie": "PHPSESSID=abc123; Path=/" },
    });
  }) as typeof fetch;

  const res = await postForm(
    "https://digifast.site/dltstatus/bwa/Pages/loginHandle.php",
    { username: "Trinetra", password: "secret" },
    "FOO=bar",
    "https://digifast.site/login",
    mockFetch
  );

  assert.equal(seenBody, "username=Trinetra&password=secret");
  assert.equal(seenCookie, "FOO=bar");
  assert.equal(res.statusCode, 302);
  assert.ok(Array.isArray(res.cookies) && res.cookies[0].includes("PHPSESSID=abc123"));
  assert.equal(res.body, "OK");
});
