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

function getWithCookie(urlStr, cookieStr) {
  return new Promise((resolve) => {
    const url = new URL(urlStr);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Cookie': cookieStr,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });

    req.on('error', (e) => resolve({ error: e.message }));
    req.end();
  });
}

async function run() {
  const loginRes = await postForm(
    'https://digifast.site/dltstatus/bwa/Pages/loginHandle.php',
    { username: 'Trinetra', password: 'SatwikPal@123Shubham' }
  );

  const cookieHeader = loginRes.cookies ? loginRes.cookies.map(c => c.split(';')[0]).join('; ') : '';

  console.log("📡 Fetching replieswa.php content...");
  const repRes = await getWithCookie('https://digifast.site/dltstatus/bwa/Pages/replieswa.php', cookieHeader);
  console.log(`Body Length: ${repRes.body.length}`);

  // Find forms or action endpoints inside replieswa.php
  const forms = repRes.body.match(/<form[\s\S]*?<\/form>/gi);
  if (forms) {
    console.log(`Found ${forms.length} forms in replieswa.php:`);
    forms.forEach((f, i) => console.log(`Form ${i+1}:\n`, f));
  } else {
    console.log("No forms in replieswa.php. Printing snippet:");
    console.log(repRes.body.slice(0, 1000));
  }
}

run();
