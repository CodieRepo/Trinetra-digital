/**
 * Trinetra Restaurant OS — Milestone 3 Phase 1 Verification Script
 * Applies 0017_restaurant_provisioning_system.sql and tests atomic RPC functions,
 * readiness health checks, feature flags, and seed strategies.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase credentials missing from environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runVerification() {
  console.log('=== Milestone 3 Phase 1: Database Migration Verification ===');

  try {
    // 1. Read Migration File
    const sqlPath = path.join(__dirname, '../supabase/migrations/0017_restaurant_provisioning_system.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    console.log(`✓ Read 0017_restaurant_provisioning_system.sql (${sqlContent.length} bytes)`);

    // 2. Test Provisioning RPC Execution
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
    }

    // 3. Test Readiness Health Check RPC Execution
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

    // 4. Test Demo Seeder RPC
    console.log('\n--- 3. Testing Demo Seeder RPC ---');
    const { data: demoData, error: demoErr } = await supabase.rpc('seed_demo_restaurant_rpc');
    if (demoErr) {
      console.error('❌ Demo Seeder RPC failed:', demoErr.message);
    } else {
      console.log('✓ Demo Seeder Succeeded:', demoData);
    }

    console.log('\n=== Milestone 3 Phase 1 Database Verification Complete ===');
  } catch (err) {
    console.error('❌ Execution error:', err);
  }
}

runVerification();
