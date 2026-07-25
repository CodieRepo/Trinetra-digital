import https from 'https';

function testGet(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`📥 GET ${url} Status: ${res.statusCode}`);
        try {
          const parsed = JSON.parse(data);
          console.log(`✅ Success: ${parsed.success}, Leads Count: ${parsed.leads?.length}`);
          if (parsed.leads && parsed.leads.length > 0) {
            console.log("Top 3 Leads returned to Frontend:");
            parsed.leads.slice(0, 3).forEach(l => console.log(` - ${l.name} (${l.phone}): "${l.last_message}"`));
          }
        } catch (e) {
          console.log("❌ Response text:", data.slice(0, 200));
        }
        resolve();
      });
    }).on('error', err => {
      console.log(`❌ Error: ${err.message}`);
      resolve();
    });
  });
}

async function run() {
  await testGet('https://trinetra-digital.vercel.app/api/v1/leads');
}

run();
