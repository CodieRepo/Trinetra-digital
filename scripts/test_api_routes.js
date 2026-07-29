import http from "http";

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (err) {
          reject(new Error(`Failed to parse JSON from ${url} (Status ${res.statusCode}): ${data.slice(0, 100)}`));
        }
      });
    }).on("error", reject);
  });
}

async function testApiRoutes() {
  console.log("=== TESTING RESTAURANT OS API ENDPOINTS ===");

  const endpoints = [
    "http://localhost:3000/api/client/restaurant/orders?limit=30",
    "http://localhost:3000/api/client/restaurant/tables",
    "http://localhost:3000/api/client/restaurant/menu",
    "http://localhost:3000/api/client/restaurant/staff",
    "http://localhost:3000/api/client/restaurant/sessions",
  ];

  for (const url of endpoints) {
    try {
      const res = await fetchJson(url);
      console.log(`✅ [${res.status}] ${url.split("/restaurant/")[1]} -> Valid JSON payload returned`);
    } catch (err) {
      console.error(`❌ ${url}:`, err.message);
    }
  }
}

testApiRoutes();
