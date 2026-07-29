import https from 'https';

function postForm(urlStr, formData, cookieStr = '', refererUrl = '') {
  return new Promise((resolve) => {
    const url = new URL(urlStr);
    const postData = new URLSearchParams(formData).toString();

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'Cookie': cookieStr,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': refererUrl || 'https://digifast.site/dltstatus/bwa/Pages/login.php',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      const cookies = res.headers['set-cookie'];
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, cookies, body: data }));
    });

    req.on('error', (e) => resolve({ error: e.message }));
    req.write(postData);
    req.end();
  });
}

async function run() {
  const loginRes = await postForm(
    'https://digifast.site/dltstatus/bwa/Pages/loginHandle.php',
    { username: 'Trinetra', password: 'SatwikPal@123Shubham' }
  );

  const cookieHeader = loginRes.cookies ? loginRes.cookies.map(c => c.split(';')[0]).join('; ') : '';

  console.log("📡 Querying replieswaDownload.php...");
  const repRes = await postForm(
    'https://digifast.site/dltstatus/bwa/Pages/replieswaDownload.php',
    { fromdate: '2026-07-01', todate: '2026-07-25' },
    cookieHeader,
    'https://digifast.site/dltstatus/bwa/Pages/replieswa.php'
  );

  console.log(`Status: ${repRes.statusCode}`);
  console.log(`Headers:`, repRes.headers);
  console.log(`Body Length: ${repRes.body?.length || 0}`);
  
  if (repRes.body) {
    console.log("First 1000 characters of replieswaDownload.php:");
    console.log(repRes.body.slice(0, 1000));

    const rows = repRes.body.match(/<tr[\s\S]*?<\/tr>/gi);
    console.log(`Rows Found: ${rows ? rows.length : 0}`);
    if (rows && rows.length > 1) {
      console.log("Row 0:", rows[0]);
      console.log("Row 1:", rows[1]);
      console.log("Row 2:", rows[2]);
    }
  }
}

run();
