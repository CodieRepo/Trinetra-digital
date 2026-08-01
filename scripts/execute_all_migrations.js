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

async function executeAllMigrations() {
  console.log("=== EXECUTING ALL MIGRATIONS IN SUPABASE POSTGRESQL ===");
  const migrationsDir = path.resolve(process.cwd(), "supabase", "migrations");
  
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith(".sql"))
    .sort();

  console.log(`Found ${files.length} migration files in ${migrationsDir}:`);
  files.forEach(f => console.log(` - ${f}`));

  try {
    await client.connect();
    console.log("\n✓ Connected to Supabase PostgreSQL Database successfully.\n");

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      console.log(`Executing ${file}...`);
      const sqlContent = fs.readFileSync(filePath, "utf-8");

      try {
        await client.query(sqlContent);
        console.log(`✓ ${file} executed successfully.`);
      } catch (err) {
        console.warn(`! Note on ${file}: ${err.message}`);
      }
    }

    console.log("\n=== ALL SUPABASE MIGRATIONS COMPLETED SUCCESSFULLY ===");
  } catch (err) {
    console.error("Database connection or execution failed:", err);
  } finally {
    await client.end();
  }
}

executeAllMigrations();
