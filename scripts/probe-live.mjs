async function probeLive() {
  const tests = [
    { name: "Public Landing / Website", url: "https://trinetra-digital.vercel.app/", method: "GET" },
    { name: "Restaurant OS Provisioning Portal", url: "https://trinetra-digital.vercel.app/restaurant-os/provisioning", method: "GET" },
    { name: "Restaurant Onboarding Wizard", url: "https://trinetra-digital.vercel.app/restaurant-os/provisioning/wizard", method: "GET" },
    { name: "Core Health API", url: "https://trinetra-digital.vercel.app/api/health", method: "GET" },
    { name: "CRM Leads (Auth Gate Check)", url: "https://trinetra-digital.vercel.app/api/v1/leads", method: "GET" },
    { name: "Restaurant Settings (Auth Gate Check)", url: "https://trinetra-digital.vercel.app/api/client/restaurant/settings", method: "GET" },
    { name: "Bhash SMS Sync Cron (Security Secret Check)", url: "https://trinetra-digital.vercel.app/api/v1/bhash/sync", method: "POST" },
    { name: "Jobs Run Cron (Security Secret Check)", url: "https://trinetra-digital.vercel.app/api/jobs/run", method: "POST" },
    { name: "Public Diner QR Table Route (Invalid Token 404/Redirect Check)", url: "https://trinetra-digital.vercel.app/api/r/test-token-audit/orders", method: "POST", body: {} },
  ];

  console.log("=================================================================");
  console.log("🌐 LIVE CLOUD PRODUCTION AUDIT (https://trinetra-digital.vercel.app)");
  console.log("=================================================================\n");

  for (const t of tests) {
    const start = Date.now();
    try {
      const res = await fetch(t.url, {
        method: t.method,
        headers: { "Content-Type": "application/json" },
        body: t.body ? JSON.stringify(t.body) : undefined,
      });
      const latency = Date.now() - start;
      const contentType = res.headers.get("content-type") || "";
      let preview = "";
      if (contentType.includes("json")) {
        const json = await res.json().catch(() => ({}));
        preview = JSON.stringify(json).slice(0, 100);
      } else {
        const text = await res.text().catch(() => "");
        preview = text.slice(0, 80).replace(/\s+/g, " ");
      }
      console.log(`[HTTP ${res.status}] ${latency}ms | ${t.name}`);
      console.log(`         URL: ${t.url}`);
      console.log(`         Resp: ${preview}...`);
      console.log("");
    } catch (err) {
      console.error(`❌ [ERROR] ${t.name}:`, err.message);
    }
  }
}

probeLive();
