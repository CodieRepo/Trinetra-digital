module.exports = {
  apps: [
    {
      name: "trinetra-crm-backend",
      script: "dist/index.js",
      cwd: "/var/www/trinetra/server",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      autorestart: true,
      max_memory_restart: "400M",
      node_args: "--max-old-space-size=256",
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
        DATABASE_PATH: "./data/trinetra.db",
        WHATSAPP_SESSION_PATH: "./data/wa-session",
        // These values will be loaded from .env file at runtime
        // Set them in .env on the VPS — do NOT hardcode secrets here
        // OPENROUTER_API_KEY: "set-in-.env-file",
        // JWT_SECRET: "set-in-.env-file",
        // ADMIN_NOTIFY_PHONE: "+919334757759",
        // CALENDLY_URL: "https://calendly.com/trinetra-demo",
      },
      error_file: "logs/err.log",
      out_file: "logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true
    }
  ]
};
