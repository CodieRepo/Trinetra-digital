import https from "https";

function testGETQueryWebhook() {
  const url = "https://trinetra-digital.vercel.app/api/webhooks/bhash?fromphone=919876543210&fromname=BhashGETTest&message=Hello%20from%20bhash%20GET%20live%20telemetry";

  console.log("🚀 Testing Bhash Query parameters webhook using GET request...");
  console.log(`URL: ${url}`);

  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        console.log(`📥 GET Response Status: ${res.statusCode}`);
        console.log(`📥 GET Location Header: ${res.headers.location}`);
        console.log(`📥 GET Response Body: ${data}`);
        resolve({ status: res.statusCode, body: data });
      });
    }).on("error", (e) => {
      console.error("❌ HTTPS GET Error:", e);
      resolve({ error: e.message });
    });
  });
}

testGETQueryWebhook();
