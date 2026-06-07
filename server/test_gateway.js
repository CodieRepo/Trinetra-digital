const proxyquire = require('proxyquire');
const assert = require('assert');

let shouldCleanSessionTriggers = 0;
let reconnectTriggers = 0;
let alertsSent = [];
let removedPaths = [];

// Mock FS
const fsMock = {
  existsSync: () => true,
  readFileSync: () => JSON.stringify({creds: {}}),
  writeFileSync: () => {},
  mkdirSync: () => {},
  rmSync: (path) => { removedPaths.push(path); },
  copyFileSync: () => {},
  readdirSync: () => []
};

// Mock Baileys
let eventListeners = {};
const makeWASocketMock = () => {
  return {
    ev: {
      on: (event, cb) => { eventListeners[event] = cb; },
      removeAllListeners: () => {},
      process: () => {}
    },
    authState: { creds: {}, keys: {} },
    ws: { close: () => {} },
    end: () => {}
  };
};

const DisconnectReason = {
  loggedOut: 405,
  badSession: 401,
  connectionReplaced: 440,
  connectionClosed: 428,
  connectionLost: 408,
  timedOut: 408,
  restartRequired: 515,
  multideviceMismatch: 411
};

// Mock Notifications
const notificationMock = {
  notifyWhatsAppDisconnect: async (reason) => { alertsSent.push(reason); }
};

// Mock the rest
const gateway = proxyquire('./dist/whatsapp/gateway', {
  'fs': fsMock,
  '@whiskeysockets/baileys': {
    default: makeWASocketMock,
    makeWASocket: makeWASocketMock,
    DisconnectReason,
    useMultiFileAuthState: async () => ({ state: { creds: {}, keys: {} }, saveCreds: () => {} }),
    fetchLatestBaileysVersion: async () => ({ version: [2,2300,1], isLatest: true }),
    makeCacheableSignalKeyStore: () => {}
  },
  '../services/notification.service': notificationMock,
  '../database/connection': { getDb: () => ({ run: async () => {}, get: async () => ({}) }) }
});

async function runTests() {
  console.log("Starting initWhatsApp to bind events...");
  await gateway.initWhatsApp();
  
  const connUpdate = eventListeners['connection.update'];
  if (!connUpdate) throw new Error("connection.update listener not registered");

  // TEST 1: 401 Bad Session (Should retry, not wipe)
  console.log("Testing 401 Bad Session (Attempt 1)...");
  removedPaths = [];
  await connUpdate({
    connection: 'close',
    lastDisconnect: { error: { output: { statusCode: 401 }, message: 'bad session' } }
  });
  assert.strictEqual(removedPaths.length, 0, "401 should NOT wipe session");
  assert.strictEqual(alertsSent.length, 0, "401 attempt 1 should NOT alert admin");
  console.log("✅ 401 Attempt 1 preserves session.");

  // TEST 2: 401 Bad Session (Attempt 3 - should alert)
  console.log("Testing 401 Bad Session (Attempt 3)...");
  await connUpdate({ connection: 'close', lastDisconnect: { error: { output: { statusCode: 401 } } } });
  await connUpdate({ connection: 'close', lastDisconnect: { error: { output: { statusCode: 401 } } } });
  assert.strictEqual(removedPaths.length, 0, "401 should NOT wipe session");
  assert.strictEqual(alertsSent.length, 1, "401 attempt 3 should alert admin");
  console.log("✅ 401 Attempt 3 preserves session and alerts.");

  // TEST 3: 401 Bad Session (Attempt 5 - should quarantine)
  console.log("Testing 401 Bad Session (Attempt 5)...");
  await connUpdate({ connection: 'close', lastDisconnect: { error: { output: { statusCode: 401 } } } });
  await connUpdate({ connection: 'close', lastDisconnect: { error: { output: { statusCode: 401 } } } });
  assert.strictEqual(removedPaths.length, 0, "401 attempt 5 should NOT wipe session (quarantine mode)");
  const status = gateway.getWhatsAppStatus();
  assert.strictEqual(status.status, 'auth_failed', "Status should be auth_failed");
  console.log("✅ 401 Attempt 5 quarantines session.");

  // TEST 4: Open event resets backoff
  console.log("Testing Open event resets backoff...");
  await connUpdate({ connection: 'open' });
  
  // TEST 5: 408 Timeout Infinite Reconnect
  console.log("Testing 408 Timeout Infinite Reconnect...");
  for (let i = 0; i < 5; i++) {
    await connUpdate({ connection: 'close', lastDisconnect: { error: { output: { statusCode: 408 } } } });
  }
  // Check that admin was alerted at attempt 5
  assert.ok(alertsSent.some(msg => msg.includes('Entering infinite recovery loop')), "Admin should be alerted at 408 attempt 5");
  assert.strictEqual(removedPaths.length, 0, "408 should NEVER wipe session");
  console.log("✅ 408 Timeout triggers infinite loop and alerts admin once.");

  // TEST 6: 405 Logged Out
  console.log("Testing 405 Logged Out (Should wipe)...");
  await connUpdate({ connection: 'close', lastDisconnect: { error: { output: { statusCode: 405 } } } });
  assert.strictEqual(removedPaths.length, 1, "405 should wipe session");
  console.log("✅ 405 correctly wipes session.");

  console.log("\n🏆 ALL TESTS PASSED!");
}

runTests().catch(console.error);
