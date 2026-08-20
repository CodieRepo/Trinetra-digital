const { execSync } = require('child_process');

const suites = [
  { name: 'H-5B Customer Tracker & Settlement', script: 'scripts/verify_h5b_customer_tracker.cjs' },
  { name: 'H-5A Customer QR & Mobile Menu', script: 'scripts/verify_h5_customer_qr.cjs' },
  { name: 'H-4A/B Kitchen KDS', script: 'scripts/verify_h4_kitchen.cjs' },
  { name: 'H-3A/B Waiter Workflow', script: 'scripts/verify_h3_waiter.cjs' },
  { name: 'H-2B Staff Admin & RBAC', script: 'scripts/verify_h2b_staff_admin.cjs' },
  { name: 'H-2A Foundation Security & Integrity', script: 'scripts/verify_h2a_p0_security_integrity.cjs' },
  { name: 'H-1B Order Context & Attribution', script: 'scripts/verify_h1b_order_context.cjs' },
  { name: 'H-1A Floor Assignment & Isolation', script: 'scripts/verify_h1a_floor_assignment.cjs' },
  { name: 'UI-3A Floor & Tables Workspace', script: 'scripts/verify_ui3_floor_tables.cjs' },
  { name: 'M3.3 Demo Restaurant Showcase', script: 'scripts/verify_m3_3_demo_restaurant.cjs' },
  { name: 'M3.2 Sample Data Scoping', script: 'scripts/verify_m3_2_sample_data.cjs' },
  { name: 'M3.1 Wizard Name Resolution', script: 'scripts/verify_m3_1_wizard_name.cjs' },
  { name: 'UI-2 Restaurant Profile Identity', script: 'scripts/verify_ui2_restaurant_profile.cjs' },
  { name: 'Phase 2 Active Orders Model', script: 'scripts/verify_phase2_active_orders.cjs' },
];

console.log('===============================================================');
console.log('  RUNNING FULL REGRESSION SUITE (H-1A through H-5B)');
console.log('===============================================================\n');

let totalSuites = suites.length;
let passedSuites = 0;
const results = [];

for (const suite of suites) {
  process.stdout.write(`Running ${suite.name} (${suite.script})... `);
  try {
    const out = execSync(`node ${suite.script}`, { encoding: 'utf8', stdio: 'pipe' });
    const passMatch = out.match(/(\d+)\/(\d+)\s+PASS/i) || out.match(/ALL\s+(\d+)\s+TESTS?\s+PASSED/i) || out.match(/PASS.*?(\d+)/i);
    passedSuites++;
    console.log(`✅ PASS`);
    results.push({ name: suite.name, status: 'PASS', details: passMatch ? passMatch[0] : 'All passed' });
  } catch (err) {
    console.log(`❌ FAIL`);
    console.error(err.stdout || err.message);
    results.push({ name: suite.name, status: 'FAIL', details: err.message });
    process.exitCode = 1;
  }
}

console.log('\n===============================================================');
console.log(`  REGRESSION RUN SUMMARY: ${passedSuites}/${totalSuites} SUITES PASSED`);
console.log('===============================================================');
results.forEach(r => console.log(`  ${r.status === 'PASS' ? '✅' : '❌'} ${r.name.padEnd(42)} : ${r.details}`));
