const https = require("https");

function checkUrl(url) {
  return new Promise((resolve) => {
    console.log(`\n🔍 Verifying Live Endpoint: ${url}`);
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        console.log(`  HTTP Status: ${res.statusCode}`);
        console.log(`  Headers: content-type = ${res.headers["content-type"]}`);
        console.log(`  Body Preview: ${data.slice(0, 180).replace(/\s+/g, " ")}...`);
        resolve({ statusCode: res.statusCode, data });
      });
    }).on("error", (err) => {
      console.error(`  ❌ Error: ${err.message}`);
      resolve({ statusCode: 500, error: err.message });
    });
  });
}

async function verifyLive() {
  console.log("=================================================");
  console.log("POST-DEPLOYMENT LIVE PRODUCTION VERIFICATION");
  console.log("Target: https://trinetra-digital.vercel.app");
  console.log("=================================================");

  // 1. Check Root
  await checkUrl("https://trinetra-digital.vercel.app/");

  // 2. Check Provisioning Page
  await checkUrl("https://trinetra-digital.vercel.app/restaurant-os/provisioning");

  // 3. Check Provisioning Wizard Route
  await checkUrl("https://trinetra-digital.vercel.app/restaurant-os/provisioning/wizard");

  // 4. Check Health API
  await checkUrl("https://trinetra-digital.vercel.app/api/health");

  // 5. Check Provisioning Wizard API fallback
  await checkUrl("https://trinetra-digital.vercel.app/api/restaurant-os/provisioning/wizard");

  // 6. Safe Read-Only Demo Menu Catalog Context
  await checkUrl("https://trinetra-digital.vercel.app/api/client/restaurant/menu?tenantId=1ab21b6e-d5ea-4395-81e4-ba2d06907194&restaurantId=a3c3e5f7-36e7-4409-8a25-76e4f7f47213");

  // 7. Safe Read-Only Demo Tables Context
  await checkUrl("https://trinetra-digital.vercel.app/api/client/restaurant/tables?tenantId=1ab21b6e-d5ea-4395-81e4-ba2d06907194&restaurantId=a3c3e5f7-36e7-4409-8a25-76e4f7f47213");

  console.log("\n=================================================");
  console.log("LIVE VERIFICATION COMPLETE — 100% READ-ONLY");
  console.log("=================================================");
}

verifyLive();
