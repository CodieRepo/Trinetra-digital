const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function runGit(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", cwd: process.cwd(), maxBuffer: 20 * 1024 * 1024 });
  } catch (err) {
    return err.stdout || "";
  }
}

console.log("=== PART E: WORKING TREE SECRET AUDIT ===");

// 1. Check tracked sensitive files
const trackedFiles = runGit("git ls-files").split("\n").map(f => f.trim()).filter(Boolean);
const trackedSensitive = trackedFiles.filter(f => 
  f.includes(".env") || f.endsWith(".pem") || f.endsWith(".key") || f.endsWith(".p12") || f.endsWith(".crt") ||
  (f.endsWith(".json") && (f.includes("service") || f.includes("cred") || f.includes("key") || f.includes("secret")))
);
console.log("Tracked sensitive files:", trackedSensitive.length ? trackedSensitive : "None found.");

// 2. Check .gitignore rules
console.log("\n.gitignore status:");
for (const file of [".env", ".env.local", ".env.production", ".env.development"]) {
  const check = runGit(`git check-ignore "${file}"`).trim();
  console.log(`  ${file}: ${check ? "Ignored by git (" + check + ")" : "NOT IGNORED!"}`);
}

// 3. Search tracked files in node for secret patterns
console.log("\nScanning tracked files for secrets...");
const secretPatterns = [
  { name: "Supabase Service Role Key", regex: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g },
  { name: "OpenAI API Key", regex: /sk-proj-[A-Za-z0-9_-]+/g },
  { name: "PostgreSQL Connection Password", regex: /postgresql:\/\/[^:]+:([^@]+)@/g },
  { name: "Private Key Block", regex: /-----BEGIN [A-Z ]+ PRIVATE KEY-----/g },
  { name: "Meta / WhatsApp Token", regex: /EAAB[A-Za-z0-9]+/g }
];

const findings = [];
for (const file of trackedFiles) {
  // Skip binary/large files
  if (file.endsWith(".mov") || file.endsWith(".png") || file.endsWith(".jpg") || file.endsWith(".ico") || file.endsWith(".lock")) continue;
  let content = "";
  try {
    content = fs.readFileSync(path.join(process.cwd(), file), "utf8");
  } catch (e) {
    continue;
  }
  for (const { name, regex } of secretPatterns) {
    let match;
    while ((match = regex.exec(content)) !== null) {
      // Check if it's service role vs anon vs placeholder
      const fullMatch = match[0];
      let details = "";
      if (name === "Supabase Service Role Key") {
        if (fullMatch.includes("service_role")) {
          details = "Supabase Service Role JWT";
        } else if (fullMatch.includes("anon")) {
          details = "Supabase Anon JWT";
        } else {
          details = "JWT Token";
        }
      } else if (name === "PostgreSQL Connection Password") {
        const pass = match[1];
        details = `Pass length: ${pass.length}`;
      } else {
        details = fullMatch.slice(0, 10) + "...";
      }
      findings.push({ file, name, details });
    }
  }
}

if (findings.length === 0) {
  console.log("No hardcoded secrets found in tracked files.");
} else {
  console.log(`Found ${findings.length} potential secret references in tracked files:`);
  for (const f of findings) {
    console.log(`  - [${f.name}] in file: ${f.file} (${f.details})`);
  }
}

console.log("\n=== PART F: GIT HISTORY SECRET AUDIT ===");
// Check git log for commits containing service_role, sk-proj, postgresql passwords
const keywords = ["service_role", "sk-proj-", "postgresql://", "TrinetraDB2026", "SUPABASE_SERVICE_ROLE_KEY"];
for (const kw of keywords) {
  const logOut = runGit(`git log -S "${kw}" --oneline`).trim();
  console.log(`\nGit History Commits adding/removing "${kw}":`);
  if (!logOut) {
    console.log("  None found in git history.");
  } else {
    console.log(logOut.split("\n").map(l => "  " + l).join("\n"));
  }
}

console.log("\n=== PART G: GITHUB REMOTE SECURITY ===");
const remotes = runGit("git remote -v").trim();
console.log("Remotes:");
console.log(remotes ? remotes.split("\n").map(r => r.replace(/:[^@]+@/, ":****@")).join("\n") : "No remotes configured.");

const branch = runGit("git branch -vv").trim();
console.log("\nBranch Info:");
console.log(branch.split("\n").map(b => "  " + b).join("\n"));
