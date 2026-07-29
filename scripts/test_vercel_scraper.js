import https from "https";
import fs from "fs";
import path from "path";

function postForm(urlStr, formData, cookieStr = "", refererUrl = "") {
  return new Promise((resolve) => {
    const url = new URL(urlStr);
    const postData = new URLSearchParams(formData).toString();

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postData),
        "Cookie": cookieStr,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": refererUrl || "https://digifast.site/dltstatus/bwa/Pages/login.php",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      const cookies = res.headers["set-cookie"];
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => resolve({ statusCode: res.statusCode, headers: res.headers, cookies, body: data }));
    });

    req.on("error", (e) => resolve({ error: e.message }));
    req.write(postData);
    req.end();
  });
}

function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function testScraper() {
  // Load .env credentials
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf8");
    envConfig.split("\n").forEach((line) => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        process.env[match[1].trim()] = match[2].trim();
      }
    });
  }

  const username = process.env.BHASHSMS_USER || "Trinetra";
  const password = process.env.BHASHSMS_PASS;

  console.log(`📡 Starting Bhash login test for user: ${username}...`);
  
  const loginRes = await postForm(
    "https://digifast.site/dltstatus/bwa/Pages/loginHandle.php",
    { username, password },
    "",
    "https://digifast.site/dltstatus/bwa/Pages/login.php"
  );

  const cookieHeader = loginRes.cookies ? loginRes.cookies.map(c => c.split(";")[0]).join("; ") : "";
  console.log(`🔐 Login status: ${loginRes.statusCode}, Cookie: ${cookieHeader}`);

  if (!cookieHeader) {
    console.error("❌ Login failed!");
    return;
  }

  const today = new Date();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const fromdate = formatDate(ninetyDaysAgo);
  const todate = formatDate(today);

  console.log(`📡 Fetching incoming replies Display from ${fromdate} to ${todate}...`);
  const reportRes = await postForm(
    "https://digifast.site/dltstatus/bwa/Pages/waincommingDisplay.php",
    { fromdate, todate },
    cookieHeader,
    "https://digifast.site/dltstatus/bwa/Pages/waincomingreplies.php"
  );

  console.log(`📥 Report status: ${reportRes.statusCode}, body length: ${reportRes.body?.length || 0}`);
  
  const rows = reportRes.body?.match(/<tr[\s\S]*?<\/tr>/gi);
  console.log(`📊 Total raw rows parsed: ${rows ? rows.length : 0}`);

  if (rows && rows.length > 1) {
    console.log("Printing last 10 rows parsed (the newest messages):");
    const startIndex = Math.max(1, rows.length - 10);
    for (let i = startIndex; i < rows.length; i++) {
      const rowHtml = rows[i];
      const cols = rowHtml.match(/<td[\s\S]*?<\/td>/gi);
      if (cols) {
        const cleanCols = cols.map(c => c.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
        console.log(`Row ${i}: Phone: ${cleanCols[0]}, Name: ${cleanCols[1]}, Message: ${cleanCols[2]}, Date: ${cleanCols[3]}`);
      }
    }
  }
}

testScraper();
