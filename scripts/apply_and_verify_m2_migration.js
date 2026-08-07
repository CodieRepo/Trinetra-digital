import fs from "fs";
import path from "path";
import pg from "pg";

const { Client } = pg;

// Read .env file manually
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...vals] = trimmed.split("=");
      const val = vals.join("=").replace(/^["']|["']$/g, "");
      process.env[key.trim()] = val;
    }
  });
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Missing DIRECT_URL or DATABASE_URL in .env");
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function applyAndVerifyMilestone2() {
  console.log("=== PHASE 1: APPLYING & VERIFYING MILESTONE 2 AUTH MIGRATION (0016) ===");
  
  try {
    await client.connect();
    console.log("✓ Connected to Supabase PostgreSQL Database successfully.");

    // 1. Read and execute 0016_restaurant_auth_system.sql
    const migrationFile = path.resolve(process.cwd(), "supabase", "migrations", "0016_restaurant_auth_system.sql");
    console.log(`Reading migration file: ${migrationFile}`);
    const sqlContent = fs.readFileSync(migrationFile, "utf-8");

    console.log("Executing migration 0016_restaurant_auth_system.sql...");
    await client.query(sqlContent);
    console.log("✓ Migration 0016 executed successfully.");

    // 2. Verify Table Existence
    console.log("\n--- Verifying Table Existence ---");
    const requiredTables = [
      "restaurant_terminals",
      "restaurant_staff",
      "restaurant_staff_pins",
      "terminal_sessions",
      "auth_audit_logs"
    ];

    for (const table of requiredTables) {
      const res = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        );
      `, [table]);
      const exists = res.rows[0].exists;
      if (exists) {
        console.log(`  ✓ Table 'public.${table}' exists.`);
      } else {
        throw new Error(`X Table 'public.${table}' is missing!`);
      }
    }

    // 3. Verify RLS Enabled on All Tables
    console.log("\n--- Verifying Row Level Security (RLS) ---");
    for (const table of requiredTables) {
      const res = await client.query(`
        SELECT rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = $1;
      `, [table]);
      const rlsEnabled = res.rows[0]?.rowsecurity;
      if (rlsEnabled) {
        console.log(`  ✓ RLS enabled on 'public.${table}'.`);
      } else {
        throw new Error(`X RLS is NOT enabled on 'public.${table}'!`);
      }
    }

    // 4. Verify RPC Functions Exist
    console.log("\n--- Verifying Security Definer RPC Functions ---");
    const requiredRPCs = [
      "pair_terminal_device_rpc",
      "verify_staff_pin_rpc",
      "revoke_terminal_device_rpc",
      "set_staff_pin_rpc"
    ];

    for (const rpc of requiredRPCs) {
      const res = await client.query(`
        SELECT EXISTS (
          SELECT FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = $1
        );
      `, [rpc]);
      const exists = res.rows[0].exists;
      if (exists) {
        console.log(`  ✓ RPC function 'public.${rpc}' exists.`);
      } else {
        throw new Error(`X RPC function 'public.${rpc}' is missing!`);
      }
    }

    // 5. Test RPC Function Integrity & Bcrypt Verification
    console.log("\n--- Running Functional RPC Integrity Test ---");
    
    // Fetch a sample tenant and restaurant (branch)
    const tenantRes = await client.query(`SELECT id FROM public.tenants LIMIT 1;`);
    const tenantId = tenantRes.rows[0]?.id;
    
    const branchRes = await client.query(`SELECT id FROM public.restaurants WHERE tenant_id = $1 LIMIT 1;`, [tenantId]);
    let branchId = branchRes.rows[0]?.id;

    if (!branchId) {
      console.log("Creating test restaurant branch for verification...");
      const newBranch = await client.query(`
        INSERT INTO public.restaurants (tenant_id, name) 
        VALUES ($1, 'Test Verification Branch') 
        RETURNING id;
      `, [tenantId]);
      branchId = newBranch.rows[0].id;
    }

    console.log(`Using Tenant: ${tenantId}, Branch: ${branchId}`);

    // Create test staff member
    const testStaffRes = await client.query(`
      INSERT INTO public.restaurant_staff (tenant_id, restaurant_id, name, role)
      VALUES ($1, $2, 'Verification Staff', 'waiter')
      RETURNING id;
    `, [tenantId, branchId]);
    const testStaffId = testStaffRes.rows[0].id;

    // Set PIN 4321 using set_staff_pin_rpc (Bcrypt test)
    console.log(`Setting Bcrypt PIN '4321' for staff ${testStaffId}...`);
    const setPinRes = await client.query(`
      SELECT public.set_staff_pin_rpc($1, $2, '4321') as result;
    `, [testStaffId, branchId]);
    console.log("  set_staff_pin_rpc result:", setPinRes.rows[0].result);

    // Pair test terminal
    const testTokenHash = `test_hash_${Date.now()}`;
    console.log(`Pairing test terminal with token hash ${testTokenHash}...`);
    const pairRes = await client.query(`
      SELECT public.pair_terminal_device_rpc($1, $2, 'Test Tablet', 'FloorPOS', $3) as result;
    `, [tenantId, branchId, testTokenHash]);
    const testTerminalId = pairRes.rows[0].result.terminal_id;
    console.log("  pair_terminal_device_rpc result:", pairRes.rows[0].result);

    // Test valid PIN verification
    console.log("Verifying correct PIN '4321'...");
    const validPinRes = await client.query(`
      SELECT public.verify_staff_pin_rpc($1, $2, '4321') as result;
    `, [branchId, testTokenHash]);
    console.log("  verify_staff_pin_rpc (Valid PIN) result:", validPinRes.rows[0].result);

    if (!validPinRes.rows[0].result.success) {
      throw new Error("X Valid PIN verification failed!");
    }
    console.log("  ✓ Bcrypt PIN verification matched successfully!");

    // Test invalid PIN verification
    console.log("Verifying incorrect PIN '9999'...");
    const invalidPinRes = await client.query(`
      SELECT public.verify_staff_pin_rpc($1, $2, '9999') as result;
    `, [branchId, testTokenHash]);
    console.log("  verify_staff_pin_rpc (Invalid PIN) result:", invalidPinRes.rows[0].result);

    if (invalidPinRes.rows[0].result.success) {
      throw new Error("X Invalid PIN verification incorrectly succeeded!");
    }
    console.log("  ✓ Incorrect PIN correctly rejected!");

    // Cleanup test verification data
    console.log("\nCleaning up test verification records...");
    await client.query(`DELETE FROM public.restaurant_terminals WHERE id = $1;`, [testTerminalId]);
    await client.query(`DELETE FROM public.restaurant_staff WHERE id = $1;`, [testStaffId]);
    console.log("✓ Cleanup completed cleanly.");

    console.log("\n=========================================================");
    console.log("=== PHASE 1 VERIFICATION PASSED WITH 100% SUCCESS ===");
    console.log("=========================================================\n");

  } catch (err) {
    console.error("\n❌ PHASE 1 VERIFICATION FAILED:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyAndVerifyMilestone2();
