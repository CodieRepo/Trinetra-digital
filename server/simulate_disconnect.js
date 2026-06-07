const fs = require('fs');
const path = require('path');
const { DisconnectReason } = require('@whiskeysockets/baileys');

// Mock out notification service
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function() {
  if (arguments[0].includes('notification.service')) {
    return {
      notifyWhatsAppDisconnect: async (reason, isPermanent, status) => {
        console.log(`[MOCK ALERT] WhatsApp Disconnect Alert: ${reason} (Permanent: ${isPermanent}, Status: ${status})`);
      }
    };
  }
  return originalRequire.apply(this, arguments);
};

const gateway = require('./dist/whatsapp/gateway');

const sessionPath = path.resolve(process.cwd(), 'data', 'wa-session');
const credsPath = path.join(sessionPath, 'creds.json');

async function simulate() {
  console.log("=== SETUP ===");
  if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });
  fs.writeFileSync(credsPath, JSON.stringify({ creds: { test: true } }));
  console.log("Credentials file exists:", fs.existsSync(credsPath));
  
  // We need to trigger the connection.update event.
  // The gateway exports the event handler directly or we can mock the socket and pass it to initWhatsApp.
  // But wait, the handler is bound inside initWhatsApp. 
  // Let's just manually trigger what the event handler does.
  // The socket is not easily mockable without a lot of setup because Baileys creates it.
  console.log("To properly test, we should run a unit test style script.");
}
simulate();
