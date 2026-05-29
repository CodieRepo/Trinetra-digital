module.exports = {
  apps: [
    {
      name: "trinetra-crm-backend",
      script: "dist/server.js",
      cwd: "/var/www/trinetra/server",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      autorestart: true,
      max_memory_restart: "300M",
      node_args: "--max-old-space-size=256",
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
        DATABASE_PATH: "./data/trinetra.db",
        WHATSAPP_SESSION_PATH: "./data/wa-session",
        JWT_SECRET: "YOUR_PRODUCTION_JWT_SECRET_HASH",
        GEMINI_API_KEY: "YOUR_SECURE_GEMINI_API_KEY"
      },
      error_file: "logs/err.log",
      out_file: "logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true
    }
  ]
};
