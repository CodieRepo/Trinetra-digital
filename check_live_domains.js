import https from 'https';

function testEndpoint(url) {
  return new Promise((resolve) => {
    console.log(`🌐 Testing GET & POST on ${url}...`);
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`📥 GET ${url} Status: ${res.statusCode}, Body: ${data.trim().slice(0, 100)}`);
        resolve();
      });
    }).on('error', (err) => {
      console.log(`❌ GET ${url} Error: ${err.message}`);
      resolve();
    });
  });
}

async function run() {
  await testEndpoint('https://trinetradigitalsolution.com/api/webhooks/bhash');
  await testEndpoint('https://trinetra-digital.vercel.app/api/webhooks/bhash');
  await testEndpoint('https://trinetradigitalsolution.com/api/v1/webhooks/bhash');
  await testEndpoint('https://trinetra-digital.vercel.app/api/v1/webhooks/bhash');
}

run();
