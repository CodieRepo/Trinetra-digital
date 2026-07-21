import http from 'http';

const user = "Trinetra";
const pass = "SatwikPal@123Shubham";
const sender = "BUZWAP";
const phone = "7388625622";
const text = "consultation_received";

const url = `http://bhashsms.com/api/sendmsgutil.php?user=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}&sender=${encodeURIComponent(sender)}&phone=${phone}&text=${encodeURIComponent(text)}&priority=wa&stype=normal&Params=1`;
const maskedUrl = `http://bhashsms.com/api/sendmsgutil.php?user=${user}&pass=******&sender=${sender}&phone=${phone}&text=${text}&priority=wa&stype=normal&Params=1`;

console.log("\n=================================================================");
console.log("📡 [BhashSMS Live Request Verification]");
console.log(`Target URL: ${maskedUrl}`);
console.log("=================================================================\n");

const startTime = Date.now();

http.get(url, (res) => {
  const statusCode = res.statusCode;
  const statusMessage = res.statusMessage;
  let rawData = '';

  res.on('data', (chunk) => {
    rawData += chunk;
  });

  res.on('end', () => {
    const durationMs = Date.now() - startTime;
    console.log(`📥 HTTP Status Code: ${statusCode} ${statusMessage}`);
    console.log(`⏱️ Roundtrip Duration: ${durationMs}ms`);
    console.log(`📄 Raw Response Body: "${rawData}"`);

    const lower = rawData.toLowerCase();
    const isSuccess = statusCode === 200 &&
      !lower.includes("error") &&
      !lower.includes("fail") &&
      !lower.includes("invalid") &&
      !lower.includes("unauthorized") &&
      !lower.includes("access denied");

    console.log("\n-----------------------------------------------------------------");
    console.log(`🔍 Parsed Status: ${isSuccess ? "SUCCESS ✓" : "FAILED / REJECTED ❌"}`);

    if (!isSuccess) {
      console.log("\n⚠️ Failure Diagnostics:");
      if (lower.includes("user") || lower.includes("pass") || lower.includes("invalid user")) {
        console.log("  -> Reason: Credentials mismatch or username/password rejected by BhashSMS.");
      } else if (lower.includes("sender") || lower.includes("buzwap")) {
        console.log("  -> Reason: Sender ID 'BUZWAP' not registered or unapproved for WhatsApp.");
      } else if (lower.includes("template") || lower.includes("text")) {
        console.log("  -> Reason: Template 'consultation_received' not approved in BhashSMS WABA.");
      } else if (lower.includes("phone") || lower.includes("mobile")) {
        console.log("  -> Reason: Phone number format rejected.");
      } else {
        console.log(`  -> Reason: ${rawData || "API Endpoint error"}`);
      }
    } else {
      console.log("  -> BhashSMS confirmed delivery request!");
    }
    console.log("=================================================================\n");
  });
}).on('error', (e) => {
  console.error(`❌ Network / Connection Error: ${e.message}`);
});
