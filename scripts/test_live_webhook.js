import https from "https";

function sendLivePayload() {
  const payload = "Mobile: 917388625622, Message: Test Live Webhook Interceptor, Name: Satwik Pal Test";

  const options = {
    hostname: "trinetra-digital.vercel.app",
    port: 443,
    path: "/api/webhooks/whatsapp",
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      "Content-Length": Buffer.byteLength(payload),
    },
  };

  console.log("🚀 Sending live Bhash plain-text webhook payload to Vercel production...");
  console.log(`Payload: "${payload}"`);

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        console.log(`📥 Response Status: ${res.statusCode}`);
        console.log(`📥 Response Body: ${data}`);
        resolve({ status: res.statusCode, body: data });
      });
    });

    req.on("error", (e) => {
      console.error("❌ HTTPS Request Error:", e);
      resolve({ error: e.message });
    });

    req.write(payload);
    req.end();
  });
}

sendLivePayload();
