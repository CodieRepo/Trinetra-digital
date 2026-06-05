import { parseNaturalDateTime } from './date-parser';

// Force reference date: 2026-06-05T13:35:24+05:30 (Friday)
const refDate = new Date('2026-06-05T13:35:24+05:30');

const testCases = [
  { input: 'kal 2 baje', expectedDate: '2026-06-06', expectedTime: '14:00' },
  { input: 'tomorrow afternoon', expectedDate: '2026-06-06', expectedTime: '14:00' },
  { input: 'tomorrow 2 pm', expectedDate: '2026-06-06', expectedTime: '14:00' },
  { input: 'next monday 11 am', expectedDate: '2026-06-08', expectedTime: '11:00' },
  { input: 'evening 6 baje', expectedDate: null, expectedTime: '18:00' },
  { input: 'parso morning', expectedDate: '2026-06-07', expectedTime: '10:00' },
];

let failed = false;
console.log('🧪 Starting Date-Time Parser Tests...\n');

for (const tc of testCases) {
  const result = parseNaturalDateTime(tc.input, refDate);
  const dateMatches = result.date === tc.expectedDate;
  const timeMatches = result.time === tc.expectedTime;
  
  if (dateMatches && timeMatches) {
    console.log(`✅ [PASS] "${tc.input}" -> Date: ${result.date}, Time: ${result.time}`);
  } else {
    console.error(`❌ [FAIL] "${tc.input}" -> Expected: { Date: ${tc.expectedDate}, Time: ${tc.expectedTime} }, Got: { Date: ${result.date}, Time: ${result.time} }`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
} else {
  console.log('\n🎉 All test cases passed successfully!');
}
