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

  console.log("\n=================================================");
  console.log("LIVE VERIFICATION COMPLETE");
  console.log("=================================================");
}

verifyLive();
