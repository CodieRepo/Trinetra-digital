/**
 * Trinetra Restaurant OS — Milestone 3 Remediation Verification Script
 * Applies 0018_m3_architecture_remediation.sql via pg Client, reloads PostgREST schema cache,
 * and performs comprehensive tests across all 11 verification points.
 */

const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*"(.*)"\s*$/);
    if (match) {
      process.env[match[1]] = match[2];
    }
  });
}

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!dbUrl || !supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Database connection URL or Supabase service role key missing.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey || 'dummy');

async function runRemediationVerification() {
  console.log('=========================================================================');
  console.log('Trinetra Restaurant OS — Milestone 3 Architecture Remediation Verification');
  console.log('=========================================================================\n');

  const pgClient = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  let testsPassed = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      testsPassed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
    }
  }

  try {
    await pgClient.connect();
    console.log('1. DATABASE MIGRATION APPLICATION');
    console.log('-------------------------------------------------------------------------');
    const sqlPath = path.join(__dirname, '../supabase/migrations/0018_m3_architecture_remediation.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    await pgClient.query(sqlContent);
    console.log('  ✓ Migration 0018_m3_architecture_remediation.sql executed successfully!');

    await pgClient.query("NOTIFY pgrst, 'reload schema';");
    console.log("  ✓ Sent PostgREST schema cache reload signal.\n");

    // Wait 1 second for schema reload
    await new Promise((r) => setTimeout(r, 1000));

    console.log('2. ROLE CONSTRAINT & CANONICAL SCHEMA VERIFICATION');
    console.log('-------------------------------------------------------------------------');
    
    // Test role constraint by inserting staff with 'owner' and 'manager' roles
    const testTenantRes = await pgClient.query("INSERT INTO public.tenants (name, plan) VALUES ('Verification Tenant', 'pro') RETURNING id;");
    const testTenantId = testTenantRes.rows[0].id;

    await pgClient.query("INSERT INTO public.organizations (id, name) VALUES ($1, 'Verification Tenant') ON CONFLICT (id) DO NOTHING;", [testTenantId]);

    const testRestRes = await pgClient.query(
      "INSERT INTO public.restaurants (tenant_id, organization_id, name) VALUES ($1, $1, 'Verification Branch 1') RETURNING id;",
      [testTenantId]
    );
    const testRestId = testRestRes.rows[0].id;

    const staffRes = await pgClient.query(
      "INSERT INTO public.restaurant_staff (tenant_id, restaurant_id, name, role) VALUES ($1, $2, 'Owner Staff', 'owner') RETURNING role;",
      [testTenantId, testRestId]
    );
    assert(staffRes.rows[0].role === 'owner', "restaurant_staff accepts canonical 'owner' role");

    // Test profile table existence
    const profileRes = await pgClient.query("SELECT * FROM public.restaurant_profiles WHERE restaurant_id = $1;", [testRestId]);
    assert(profileRes.rows.length === 1, "restaurant_profiles row automatically created or exists");

    console.log('\n3. MULTI-BRANCH & IDEMPOTENCY VERIFICATION');
    console.log('-------------------------------------------------------------------------');
    
    // Add second branch to existing tenant
    const branch2Res = await pgClient.query(
      "INSERT INTO public.restaurants (tenant_id, organization_id, name) VALUES ($1, $1, 'Verification Branch 2') RETURNING id;",
      [testTenantId]
    );
    assert(branch2Res.rows[0].id !== null, "Multi-branch enabled: Second restaurant created under same tenant_id");

    // Test unique constraint or duplicate check
    let duplicateFailed = false;
    try {
      await pgClient.query("INSERT INTO public.restaurants (tenant_id, organization_id, name) VALUES ($1, $1, 'Verification Branch 1');", [testTenantId]);
    } catch (e) {
      duplicateFailed = true;
    }
    assert(duplicateFailed, "Database uniqueness / logic blocks duplicate (tenant_id, name) branches");

    console.log('\n4. RPC AUTHORIZATION & SECURITY DEFINER VERIFICATION');
    console.log('-------------------------------------------------------------------------');

    // Call provision_restaurant_rpc via Service Role (Admin)
    const provisionResult = await supabaseAdmin.rpc('provision_restaurant_rpc', {
      p_tenant_name: 'Sanity Test Group',
      p_restaurant_name: 'Sanity Fine Dining',
      p_owner_email: 'owner@sanity.com',
      p_owner_name: 'Sanity Owner'
    });
    
    assert(provisionResult.data && provisionResult.data.success === true, "provision_restaurant_rpc executed successfully via service_role");
    const sanityRestId = provisionResult.data.restaurant_id;

    // Verify owner was created with role = 'owner' and NO PIN hash was created
    const ownerStaffRes = await pgClient.query("SELECT role FROM public.restaurant_staff WHERE id = $1;", [provisionResult.data.owner_staff_id]);
    assert(ownerStaffRes.rows[0].role === 'owner', "Provisioning creates owner with canonical 'owner' role");

    const ownerPinRes = await pgClient.query("SELECT * FROM public.restaurant_staff_pins WHERE staff_id = $1;", [provisionResult.data.owner_staff_id]);
    assert(ownerPinRes.rows.length === 0, "No fake PIN created during provisioning (Owner PIN deferred to wizard)");

    // Call provision_restaurant_rpc via Anon Client (should fail due to auth check)
    const anonProvision = await supabaseAnon.rpc('provision_restaurant_rpc', {
      p_tenant_name: 'Hacker Group',
      p_restaurant_name: 'Hacker Dining',
      p_owner_email: 'hacker@test.com',
      p_owner_name: 'Hacker'
    });
    assert(anonProvision.error !== null, "provision_restaurant_rpc rejects unauthorized non-service_role calls");

    console.log('\n5. READINESS & DEMO SEEDER VERIFICATION');
    console.log('-------------------------------------------------------------------------');

    // Call validate_restaurant_readiness_rpc
    const readinessBefore = await supabaseAdmin.rpc('validate_restaurant_readiness_rpc', { p_restaurant_id: sanityRestId });
    assert(readinessBefore.data.is_ready === false, "validate_restaurant_readiness_rpc correctly reports unready when owner PIN & wizard incomplete");
    assert(readinessBefore.data.checks.has_owner === true, "Readiness check confirms owner staff exists");
    assert(readinessBefore.data.checks.has_owner_pin === false, "Readiness check flags missing owner PIN");
    assert(readinessBefore.data.checks.wizard_completed === false, "Readiness check flags incomplete wizard");

    // Execute seed_demo_restaurant_rpc
    const demoResult = await supabaseAdmin.rpc('seed_demo_restaurant_rpc');
    assert(demoResult.data && demoResult.data.success === true, "seed_demo_restaurant_rpc executed successfully");

    const demoStaff = await pgClient.query("SELECT name, role FROM public.restaurant_staff WHERE restaurant_id = $1 ORDER BY role;", ['a3c3e5f7-36e7-4409-8a25-76e4f7f47213']);
    const demoRoles = demoStaff.rows.map(r => r.role);
    assert(demoRoles.includes('owner') && demoRoles.includes('manager') && demoRoles.includes('cashier') && demoRoles.includes('waiter'), "Demo Seeder seeds all canonical staff roles correctly (owner, manager, cashier, waiter)");

    console.log('\n6. CLEANUP VERIFICATION DATA');
    console.log('-------------------------------------------------------------------------');
    await pgClient.query("DELETE FROM public.tenants WHERE name IN ('Verification Tenant', 'Sanity Test Group');");
    console.log('  ✓ Cleaned up verification test tenant records.');

    console.log('\n=========================================================================');
    console.log(`VERIFICATION COMPLETE: ${testsPassed} / ${totalTests} Checks Passed (${Math.round((testsPassed/totalTests)*100)}%)`);
    console.log('=========================================================================\n');

  } catch (err) {
    console.error('❌ Verification script encountered an error:', err);
  } finally {
    await pgClient.end();
  }
}

runRemediationVerification();
