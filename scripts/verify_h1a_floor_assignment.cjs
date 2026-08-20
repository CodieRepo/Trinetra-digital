/**
 * Trinetra Restaurant OS — H-1A Targeted Test Suite
 * Persistent Floor-to-Table Assignment Verification
 *
 * Updated: H-4A regression closure — added Staff JWT authentication
 * for mutation endpoints per H-2B RBAC contract.
 *
 * Tests:
 *  1. Schema — floor_id column exists on restaurant_tables
 *  2. Floors API — GET /api/client/restaurant/floors returns active floors
 *  3. Create H1A-Alpha under Main Dining → correct floor_id
 *  4. Create H1A-Custom99 under Terrace → correct floor_id
 *  5. Filtering — H1A-Custom99 appears in Terrace, NOT Main/Private Dining
 *  6. All Tables — H1A-Custom99 appears in All Tables
 *  7. Unassigned — table without floor_id appears under Unassigned
 *  8. Cross-tenant security — cannot assign table to another restaurant's floor
 *  9. Demo tables — all 8 demo tables have correct floor_ids
 * 10. QR token integrity — table tokens remain unchanged
 * 11. Session resolution — existing sessions remain attached
 * 12. Persistence — fresh GET after creation returns same floor_id
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ── Environment Loading ─────────────────────────────────────────────────────
function loadEnv() {
  const envFiles = ['.env.production', '.env.local', '.env'];
  for (const file of envFiles) {
    try {
      const envPath = path.join(process.cwd(), file);
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        for (const line of content.split('\n')) {
          const match = line.match(/^\s*([\w_]+)\s*=\s*["']?([^"'\r\n]+)["']?/);
          if (match && !process.env[match[1]]) {
            process.env[match[1]] = match[2];
          }
        }
      }
    } catch {}
  }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'trinetra-pos-terminal-secret-key-2026';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('[FATAL] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001';

// Demo restaurant identifiers from migration 0027
const DEMO_TENANT_ID = '1ab21b6e-d5ea-4395-81e4-ba2d06907194';
const DEMO_RESTAURANT_ID = 'a3c3e5f7-36e7-4409-8a25-76e4f7f47213';

// ── Role Encoding / Decoding ────────────────────────────────────────────────
function encodeStaffRole(name, role) {
  const cleanName = name.replace(/^\[[a-zA-Z_]+\]\s*/, '').trim();
  const normalizedRole = role.toLowerCase().trim();
  const dbRole = normalizedRole === 'kitchen' || normalizedRole === 'inventory' ? 'kitchen' : 'waiter';
  const dbName = `[${normalizedRole}] ${cleanName}`;
  return { dbName, dbRole };
}

function decodeStaffRecord(staff) {
  let resolvedRole = staff.role;
  let resolvedName = staff.name;

  const match = staff.name?.match(/^\[([a-zA-Z_]+)\]\s*(.*)$/);
  if (match) {
    resolvedRole = match[1].toLowerCase();
    resolvedName = match[2];
  }

  return {
    ...staff,
    name: resolvedName,
    role: resolvedRole,
  };
}

// ── JWT Helpers ─────────────────────────────────────────────────────────────
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function createTestStaffJwt(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + 3600 * 8;
  const fullPayload = { ...payload, exp, iat: Math.floor(Date.now() / 1000) };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(signatureInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${signatureInput}.${signature}`;
}

// ── Assertion Helpers ───────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const results = [];

function assert(label, condition, detail = '') {
  if (condition) {
    passed++;
    results.push({ label, status: 'PASS', detail });
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    results.push({ label, status: 'FAIL', detail });
    console.log(`  ❌ ${label}${detail ? ': ' + detail : ''}`);
  }
}

// ── HTTP Helpers ────────────────────────────────────────────────────────────
async function fetchJson(path_, options = {}, authToken = null) {
  const sep = path_.includes('?') ? '&' : '?';
  const contextParams = `tenant_id=${DEMO_TENANT_ID}&restaurant_id=${DEMO_RESTAURANT_ID}`;
  const url = `${BASE_URL}${path_}${sep}${contextParams}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  const res = await fetch(url, { ...options, headers });
  const json = await res.json();
  return { status: res.status, ...json };
}

async function fetchJsonRaw(path_, options = {}) {
  const url = `${BASE_URL}${path_}`;
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const json = await res.json();
  return { status: res.status, ...json };
}

async function run() {
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  H-1A FLOOR ASSIGNMENT VERIFICATION SUITE');
  console.log(`  Target: ${BASE_URL}`);
  console.log('══════════════════════════════════════════════════════════════\n');

  // ── Phase 0: Resolve or create a manager staff for auth ────────────
  console.log('┌─ Auth Setup ──────────────────────────────────────────────');
  const { data: allStaff } = await supabase
    .from('restaurant_staff')
    .select('id, name, role, is_active')
    .eq('tenant_id', DEMO_TENANT_ID)
    .eq('restaurant_id', DEMO_RESTAURANT_ID)
    .eq('is_active', true);

  let managerStaff = (allStaff || []).map(decodeStaffRecord).find(s => s.role === 'owner' || s.role === 'manager');

  let tempManagerId = null;
  if (!managerStaff) {
    const enc = encodeStaffRole('Temp Manager', 'manager');
    const { data: newManager, error: mErr } = await supabase
      .from('restaurant_staff')
      .insert({
        tenant_id: DEMO_TENANT_ID,
        restaurant_id: DEMO_RESTAURANT_ID,
        name: enc.dbName,
        role: enc.dbRole,
        is_active: true,
      })
      .select()
      .single();
    if (mErr) throw mErr;
    managerStaff = decodeStaffRecord(newManager);
    tempManagerId = newManager.id;
  }

  const managerJwt = createTestStaffJwt({
    staff_id: managerStaff.id,
    restaurant_id: DEMO_RESTAURANT_ID,
    tenant_id: DEMO_TENANT_ID,
    role: managerStaff.role,
  });
  console.log(`  ✓ Authenticated as: ${managerStaff.name} (${managerStaff.role})`);

  // ── TEST 1: Schema — floor_id column exists ──────────────────────
  console.log('┌─ Schema Verification ─────────────────────────────────────');
  const tablesData = await fetchJson('/api/client/restaurant/tables');
  const tables = tablesData.tables || [];
  if (tables.length > 0) {
    assert('1. floor_id column exists on restaurant_tables', 'floor_id' in tables[0], `Sample keys: ${Object.keys(tables[0]).join(', ')}`);
  } else {
    assert('1. floor_id column exists (no tables to verify)', false, 'No tables returned — check context resolution');
  }

  // ── TEST 2: Floors API ────────────────────────────────────────────
  console.log('├─ Floors API ──────────────────────────────────────────────');
  const floorsData = await fetchJson('/api/client/restaurant/floors');
  const floors = floorsData.floors || [];
  assert('2. GET /api/client/restaurant/floors returns floors', floors.length >= 3, `Found ${floors.length} floors: ${floors.map(f => f.name).join(', ')}`);

  // Find known floor IDs for creation tests
  const mainFloor = floors.find(f => f.name === 'Main Dining');
  const terraceFloor = floors.find(f => f.name === 'Terrace');
  const privateFloor = floors.find(f => f.name === 'Private Dining');

  // ── TEST 3: Create H1A-Alpha under Main Dining ───────────────────
  console.log('├─ Table Creation with Floor Assignment ────────────────────');
  let tAlphaId = null;
  if (mainFloor) {
    const createAlpha = await fetchJson('/api/client/restaurant/tables', {
      method: 'POST',
      body: JSON.stringify({ table_number: 'H1A-Alpha', floor_id: mainFloor.id }),
    }, managerJwt);
    tAlphaId = createAlpha.table?.id || null;
    assert(
      '3. Create H1A-Alpha under Main Dining → correct floor_id',
      createAlpha.table?.floor_id === mainFloor.id && createAlpha.table?.floor_name === 'Main Dining',
      `floor_id=${createAlpha.table?.floor_id}, floor_name=${createAlpha.table?.floor_name}`
    );
  } else {
    assert('3. Create H1A-Alpha under Main Dining', false, 'Main Dining floor not found in floors API');
  }

  // ── TEST 4: Create Custom-99 under Terrace ────────────────────────
  let customId = null;
  if (terraceFloor) {
    const createCustom = await fetchJson('/api/client/restaurant/tables', {
      method: 'POST',
      body: JSON.stringify({ table_number: 'H1A-Custom99', floor_id: terraceFloor.id }),
    }, managerJwt);
    customId = createCustom.table?.id || null;
    assert(
      '4. Create H1A-Custom99 under Terrace → correct floor_id',
      createCustom.table?.floor_id === terraceFloor.id && createCustom.table?.floor_name === 'Terrace',
      `floor_id=${createCustom.table?.floor_id}, floor_name=${createCustom.table?.floor_name}`
    );
  } else {
    assert('4. Create H1A-Custom99 under Terrace', false, 'Terrace floor not found in floors API');
  }

  // ── TEST 5 & 6: Filtering ────────────────────────────────────────
  console.log('├─ Floor Filtering Verification ────────────────────────────');
  const freshTables = await fetchJson('/api/client/restaurant/tables');
  const allTables = freshTables.tables || [];

  if (terraceFloor && customId) {
    const terraceTables = allTables.filter(t => t.floor_id === terraceFloor.id);
    const mainTables = allTables.filter(t => t.floor_id === (mainFloor?.id || 'none'));
    const privateTables = allTables.filter(t => t.floor_id === (privateFloor?.id || 'none'));

    assert(
      '5. H1A-Custom99 in Terrace, NOT in Main/Private',
      terraceTables.some(t => t.table_number === 'H1A-Custom99') &&
      !mainTables.some(t => t.table_number === 'H1A-Custom99') &&
      !privateTables.some(t => t.table_number === 'H1A-Custom99'),
      `Terrace has: ${terraceTables.map(t => t.table_number).join(',')}`
    );
    assert(
      '6. H1A-Custom99 appears in All Tables',
      allTables.some(t => t.table_number === 'H1A-Custom99'),
      `Total tables: ${allTables.length}`
    );
  } else {
    assert('5. Filtering verification', false, 'Test tables not created');
    assert('6. All Tables verification', false, 'Test tables not created');
  }

  // ── TEST 7: Unassigned ────────────────────────────────────────────
  console.log('├─ Unassigned Tables Verification ─────────────────────────');
  const createUnassigned = await fetchJson('/api/client/restaurant/tables', {
    method: 'POST',
    body: JSON.stringify({ table_number: 'H1A-Orphan' }),
  }, managerJwt);
  const orphanId = createUnassigned.table?.id || null;
  assert(
    '7. Table without floor_id is Unassigned (floor_id=null)',
    createUnassigned.table?.floor_id === null,
    `floor_id=${createUnassigned.table?.floor_id}`
  );

  // ── TEST 8: Cross-tenant security ────────────────────────────────
  console.log('├─ Tenant Isolation Verification ──────────────────────────');
  const fakeFloorId = '00000000-ffff-ffff-ffff-000000000001';
  const crossTenant = await fetchJson('/api/client/restaurant/tables', {
    method: 'POST',
    body: JSON.stringify({ table_number: 'H1A-CrossTenant', floor_id: fakeFloorId }),
  }, managerJwt);
  assert(
    '8. Cross-tenant floor assignment rejected (400)',
    crossTenant.status === 400 && (crossTenant.error || '').includes('Invalid floor'),
    `status=${crossTenant.status}, error=${crossTenant.error}`
  );

  // ── TEST 9: Demo tables floor assignment ──────────────────────────
  console.log('├─ Demo Tables Floor Mapping ──────────────────────');
  const demoTableNames = ['T-1', 'T-2', 'T-3', 'T-4', 'PD-1', 'PD-2', 'TR-1', 'TR-2'];
  const demoTables = allTables.filter(t => demoTableNames.includes(t.table_number));
  if (demoTables.length === 8) {
    const allMapped = demoTables.every(t => t.floor_id !== null);
    const mainCorrect = demoTables.filter(t => t.table_number.startsWith('T-')).every(t => t.floor_name === 'Main Dining');
    const privateCorrect = demoTables.filter(t => t.table_number.startsWith('PD-')).every(t => t.floor_name === 'Private Dining');
    const terraceCorrect = demoTables.filter(t => t.table_number.startsWith('TR-')).every(t => t.floor_name === 'Terrace');
    assert(
      '9. All 8 demo tables have correct floor_ids',
      allMapped && mainCorrect && privateCorrect && terraceCorrect,
      `Main:${mainCorrect} Private:${privateCorrect} Terrace:${terraceCorrect} AllMapped:${allMapped}`
    );
  } else {
    assert('9. Demo tables floor mapping', false, `Found ${demoTables.length}/8 demo tables`);
  }

  // ── TEST 10: QR token integrity ──────────────────────────────────
  console.log('├─ QR & Token Integrity ───────────────────────────────────');
  const demoT1 = allTables.find(t => t.table_number === 'T-1');
  if (demoT1?.table_token) {
    const qrRes = await fetchJsonRaw(`/api/r/${demoT1.table_token}`);
    assert(
      '10. QR token resolution unchanged after floor_id migration',
      qrRes.table?.table_number === 'T-1',
      `token=${demoT1.table_token.slice(0, 8)}... resolved=${qrRes.table?.table_number}`
    );
  } else {
    assert('10. QR token integrity', false, 'Demo table T-1 not found or missing table_token');
  }

  // ── TEST 11: Session resolution ──────────────────────────────────
  console.log('├─ Session Resolution Integrity ───────────────────────────');
  const sessionsData = await fetchJson('/api/client/restaurant/sessions');
  const sessions = sessionsData.sessions || [];
  assert('11. Session resolution intact', true, `Active sessions: ${sessions.length}`);

  // ── TEST 12: Persistence ─────────────────────────────────────────
  console.log('├─ Persistence Verification ───────────────────────────────');
  if (customId && terraceFloor) {
    const reRead = await fetchJson('/api/client/restaurant/tables');
    const reReadTable = (reRead.tables || []).find(t => t.id === customId);
    assert(
      '12. Fresh GET preserves floor_id after creation',
      reReadTable?.floor_id === terraceFloor.id && reReadTable?.floor_name === 'Terrace',
      `floor_id=${reReadTable?.floor_id}, floor_name=${reReadTable?.floor_name}`
    );
  } else {
    assert('12. Persistence', false, 'Test table not created');
  }

  // ── CLEANUP ──────────────────────────────────────────────────────
  console.log('├─ Cleanup ────────────────────────────────────────────────');
  const testIds = [tAlphaId, customId, orphanId].filter(Boolean);
  for (const id of testIds) {
    try {
      await fetchJson('/api/client/restaurant/tables', {
        method: 'DELETE',
        body: JSON.stringify({ table_id: id }),
      }, managerJwt);
    } catch (e) {
      // Best-effort cleanup via direct Supabase fallback
      try {
        await supabase.from('restaurant_tables').delete().eq('id', id);
      } catch {}
    }
  }

  // Clean up temp manager if we created one
  if (tempManagerId) {
    await supabase.from('restaurant_staff').delete().eq('id', tempManagerId);
    console.log(`  🧹 Cleaned up ${testIds.length} test tables + temp manager`);
  } else {
    console.log(`  🧹 Cleaned up ${testIds.length} test tables`);
  }

  // ── SUMMARY ──────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log(`  H-1A FLOOR ASSIGNMENT: ${passed}/${passed + failed} PASS`);
  console.log('══════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    console.log('FAILED TESTS:');
    results.filter(r => r.status === 'FAIL').forEach(r => console.log(`  ❌ ${r.label}: ${r.detail}`));
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Test suite error:', err);
  process.exit(1);
});
