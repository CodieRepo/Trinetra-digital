const { Client } = require('ssh2');

const sshConfig = {
  host: '187.127.170.222',
  port: 22,
  username: 'root',
  password: 'SatwikPal@123Shubham'
};

const commands = `
cat > /var/www/trinetra/server/fix_env_temp.cjs << 'EOF'
const fs = require('fs');

const envContent = \`
PORT=5000
JWT_SECRET=trinetra_secret_super_secure_123!
DATABASE_PATH=./data/trinetra.db
WHATSAPP_SESSION_PATH=./data/wa-session
FRONTEND_URL=https://trinetradigitalsolution.com
OPENROUTER_API_KEY=your_openrouter_api_key_here
\`;

fs.writeFileSync('/var/www/trinetra/server/.env', envContent.trim());
console.log('✅ Wrote .env to /var/www/trinetra/server/.env');

EOF
node /var/www/trinetra/server/fix_env_temp.cjs
pm2 restart trinetra-crm-backend
sleep 3
pm2 logs trinetra-crm-backend --lines 50 --nostream | grep "AI_STARTUP"
`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(commands, (err, stream) => {
    if (err) throw err;
    let output = '';
    stream.on('close', () => {
      conn.end();
      console.log(output);
    })
    .on('data', (data) => { output += data.toString(); })
    .stderr.on('data', (data) => process.stderr.write(data));
  });
}).connect(sshConfig);
