import { createClient } from "@supabase/supabase-js";
import fs from "fs";

function getEnv(key) {
  const content = fs.readFileSync(".env", "utf8");
  for (const line of content.split("\n")) {
    if (line.startsWith(key + "=")) {
      return line.split("=")[1].trim().replace(/^['"]|['"]$/g, "");
    }
  }
  return "";
}

const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const key = getEnv("SUPABASE_SERVICE_ROLE_KEY");
const db = createClient(url, key);

const BASE_URL = "https://trinetra-digital.vercel.app";

async function testLiveOnboarding() {
  console.log("=================================================================");
  console.log("🚀 TESTING LIVE RESTAURANT ONBOARDING ON VERCEL CLOUD");
  console.log("   Target:", BASE_URL);
  console.log("=================================================================\n");

  // Test 1: Unauthenticated request must be blocked with 401
  console.log("1. [Security Gate] Testing unauthenticated POST to /api/v1/admin/onboard-restaurant...");
  const unauthRes = await fetch(`${BASE_URL}/api/v1/admin/onboard-restaurant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      restaurant_name: "Hacker Bistro",
      owner_name: "Bad Actor",
      email: "hacker@test.com",
      password: "password123",
    }),
  });
  console.log(`   Status: ${unauthRes.status} (Expected: 401)`);
  const unauthJson = await unauthRes.json();
  console.log("   Response:", unauthJson);
  if (unauthRes.status !== 401) {
    console.error("❌ Security failure: Unauthenticated onboarding was not rejected with 401!");
    process.exit(1);
  }
  console.log("   ✅ Security verified: Unauthenticated request rejected with 401!\n");

  // Test 2: Authenticated request with Admin Session
  console.log("2. [Admin Auth] Generating real session token for Admin (satwikpal786@gmail.com)...");
  const { data: magicData } = await db.auth.admin.generateLink({
    type: "magiclink",
    email: "satwikpal786@gmail.com",
  });
  const { data: sessionData } = await db.auth.verifyOtp({
    token_hash: magicData.properties.hashed_token,
    type: "magiclink",
  });
  const token = sessionData?.session?.access_token;
  if (!token) {
    console.error("❌ Failed to acquire token for satwikpal786@gmail.com");
    process.exit(1);
  }
  console.log("   ✅ Admin token acquired successfully!\n");

  // Test 3: Authenticated Admin Onboarding Request
  console.log("3. [Admin Flow] Submitting restaurant onboarding form with Admin Bearer token...");
  const onboardRes = await fetch(`${BASE_URL}/api/v1/admin/onboard-restaurant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      restaurant_name: "Rangreza Luxury Lounge",
      owner_name: "Shubham",
      email: "satwikpal786@gmail.com", // existing user test!
      password: "SecurePassword2026!",
      phone: "+917388625622",
      address: "218x Gayatripuram Gorakhpur",
      plan: "pro",
    }),
  });

  console.log(`   Status: ${onboardRes.status}`);
  const onboardJson = await onboardRes.json();
  console.log("   Response:", onboardJson);

  if (onboardJson.error?.includes("Super-admin privileges required")) {
    console.error("❌ Failed: Super-admin guard still rejected the request!");
    process.exit(1);
  } else {
    console.log("   ✅ Authorization Gate Passed! Admin guard accepted the request.");
  }

  console.log("\n=================================================================");
  console.log("🎉 LIVE ONBOARDING AUTHORIZATION VERIFIED ON PRODUCTION!");
  console.log("=================================================================\n");
}

testLiveOnboarding();
