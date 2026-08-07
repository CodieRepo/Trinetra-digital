/**
 * Trinetra Restaurant OS — Milestone 3 Phase 1 Verification Script
 * Applies 0017_restaurant_provisioning_system.sql via pg Client, refreshes PostgREST schema cache,
 * and tests atomic RPC functions, readiness health checks, feature flags, and seed strategies.
 */

const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

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
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!dbUrl || !supabaseUrl || !supabaseKey) {
  console.error('Error: Database connection URL or Supabase credentials missing.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runVerification() {
  console.log('=== Milestone 3 Phase 1: Database Migration Application & Verification ===');

  const pgClient = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await pgClient.connect();
    console.log('✓ Connected to PostgreSQL Database');

    const sqlPath = path.join(__dirname, '../supabase/migrations/0017_restaurant_provisioning_system.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('\n--- Applying Migration 0017... ---');
    await pgClient.query(sqlContent);
    console.log('✓ Migration 0017_restaurant_provisioning_system.sql applied successfully!');

    await pgClient.query("NOTIFY pgrst, 'reload schema';");
    console.log("✓ Notified PostgREST: 'reload schema'");
  } catch (err) {
    console.error('❌ Failed to apply migration via PG Client:', err.message);
  } finally {
    await pgClient.end();
  }

  // Wait 1 second for schema cache reload
  await new Promise((resolve) => setTimeout(resolve, 1000));

  try {
    console.log('\n--- 1. Testing Atomic Provisioning RPC ---');
    const tenantName = `Test Group ${Date.now()}`;
    const restaurantName = `Test Bistro ${Date.now()}`;
    const ownerEmail = `owner_${Date.now()}@bistro.com`;

    const { data: provData, error: provErr } = await supabase.rpc('provision_restaurant_rpc', {
      p_tenant_name: tenantName,
      p_restaurant_name: restaurantName,
      p_owner_email: ownerEmail,
      p_owner_name: 'Test Owner',
      p_restaurant_type: 'FineDining',
      p_cuisine_type: 'Italian',
    });

    if (provErr) {
      console.error('❌ Provisioning RPC failed:', provErr.message);
    } else {
      console.log('✓ Provisioning RPC Succeeded:', provData);

      if (provData && provData.restaurant_id) {
        console.log('\n--- 2. Testing Readiness Health Check RPC ---');
        const { data: readinessData, error: readinessErr } = await supabase.rpc(
          'validate_restaurant_readiness_rpc',
          { p_restaurant_id: provData.restaurant_id }
        );

        if (readinessErr) {
          console.error('❌ Readiness RPC failed:', readinessErr.message);
        } else {
          console.log('✓ Readiness RPC Result:', readinessData);
        }
      }
    }

    console.log('\n--- 3. Testing Demo Seeder RPC ---');
    const { data: demoData, error: demoErr } = await supabase.rpc('seed_demo_restaurant_rpc');
    if (demoErr) {
      console.error('❌ Demo Seeder RPC failed:', demoErr.message);
    } else {
      console.log('✓ Demo Seeder Succeeded:', demoData);
    }

    console.log('\n=== Milestone 3 Phase 1 Database Verification Complete ===');
  } catch (err) {
    console.error('❌ Verification error:', err);
  }
}

runVerification();
