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
  console.log(`Authenticated with cookie: ${cookieHeader}`);

  const ranges = [
    { from: '2026-07-01', to: '2026-07-25' },
    { from: '2026-06-01', to: '2026-07-25' },
    { from: '2026-01-01', to: '2026-07-25' },
    { from: '2025-01-01', to: '2026-12-31' },
    { from: '2020-01-01', to: '2030-12-31' },
  ];

  for (const r of ranges) {
    const res = await postForm(
      'https://digifast.site/dltstatus/bwa/Pages/waincommingDisplay.php',
      { fromdate: r.from, todate: r.to },
      cookieHeader,
      'https://digifast.site/dltstatus/bwa/Pages/waincomingreplies.php'
    );
    const rows = res.body ? res.body.match(/<tr[\s\S]*?<\/tr>/gi) : null;
    console.log(`Range: ${r.from} to ${r.to} -> Rows found: ${rows ? rows.length : 0}`);
  }
}

run();
