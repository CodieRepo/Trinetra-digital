import https from "https";

// Test 1: GET with query string params (BhashSMS confirmed format)
function testGET() {
  return new Promise((resolve) => {
    const url = "https://trinetradigitalsolution.com/api/webhooks/bhash?fromphone=919876543210&fromname=Bhash&message=Hello%20from%20Bhash";
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("TEST 1: GET with query params (BhashSMS format)");
    console.log(`URL: ${url}`);
    
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Body: ${data}`);
        console.log(res.statusCode === 200 ? "✅ PASSED" : "❌ FAILED");
        resolve(res.statusCode);
      });
    }).on("error", (e) => {
      console.error("❌ Error:", e.message);
      resolve(0);
    });
  });
}

// Test 2: POST with query string params
function testPOSTQuery() {
  return new Promise((resolve) => {
    const url = new URL("https://trinetradigitalsolution.com/api/webhooks/bhash?fromphone=917388625622&fromname=TestCustomer&message=I%20want%20a%20quote%20for%20digital%20marketing");
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("TEST 2: POST with query params");
    console.log(`URL: ${url.toString()}`);

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: "POST",
      headers: { "Content-Type": "text/plain" }
    };
    
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Body: ${data}`);
        console.log(res.statusCode === 200 ? "✅ PASSED" : "❌ FAILED");
        resolve(res.statusCode);
      });
    });
    req.on("error", (e) => {
      console.error("❌ Error:", e.message);
      resolve(0);
    });
    req.end();
  });
}

// Test 3: POST with plain text body (alternate Bhash format)
function testPOSTBody() {
  return new Promise((resolve) => {
    const url = new URL("https://trinetradigitalsolution.com/api/webhooks/bhash");
    const body = "Mobile: 917388625622, Message: Please send menu card, Name: RealCustomer";
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("TEST 3: POST with plain text body");
    console.log(`URL: ${url.toString()}`);
    console.log(`Body: ${body}`);

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        "Content-Length": Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Body: ${data}`);
        console.log(res.statusCode === 200 ? "✅ PASSED" : "❌ FAILED");
        resolve(res.statusCode);
      });
    });
    req.on("error", (e) => {
      console.error("❌ Error:", e.message);
      resolve(0);
    });
    req.write(body);
    req.end();
  });
}

async function runAllTests() {
  console.log("🚀 REAL WEBHOOK TESTING — trinetradigitalsolution.com");
  console.log("Testing all 3 payload formats BhashSMS may use\n");
  
  await testGET();
  await testPOSTQuery();
  await testPOSTBody();
  
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🏁 ALL TESTS COMPLETE");
}

runAllTests();
