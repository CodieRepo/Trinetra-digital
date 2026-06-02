const gateway = require('./dist/whatsapp/gateway');
setTimeout(() => {
  console.log('--- GATEWAY CURRENT LIVE STATUS ---');
  console.log(JSON.stringify(gateway.getWhatsAppStatus(), null, 2));
  process.exit(0);
}, 1000);
