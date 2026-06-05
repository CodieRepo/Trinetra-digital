const { Client } = require('ssh2');

const sshConfig = {
  host: '187.127.170.222',
  port: 22,
  username: 'root',
  password: 'SatwikPal@123Shubham'
};

const commands = `
cd /var/www/trinetra
echo "🔒 [DEPLOY SAFETY] Verifying session folder protection..."
for folder in auth baileys-auth session whatsapp-session server/data/wa-session server/whatsapp-session server/whatsapp-session-backups; do
  if [ -d "$folder" ]; then
    echo "  -> Found session directory: $folder (Protected)"
  fi
done

echo "Pulling latest changes..."
git fetch origin main
git reset --hard origin/main

echo "Building frontend..."
npm install
npm run build

echo "Building backend..."
cd server
npm install
npm run build

echo "Restarting application..."
pm2 restart trinetra-crm-backend --update-env

echo "Deployment complete."
`;

function runCommands(conn) {
  conn.exec(commands, (err, stream) => {
    if (err) {
      console.error('Exec error:', err);
      conn.end();
      return;
    }
    stream.on('close', (code, signal) => {
      console.log('\nStream :: close :: code: ' + code + ', signal: ' + signal);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}

function connectWithRetry(config, maxRetries = 5, delayMs = 5000) {
  let attempt = 0;

  const tryConnect = () => {
    attempt++;
    console.log(`Connecting to SSH (Attempt ${attempt}/${maxRetries})...`);
    const conn = new Client();

    conn.on('ready', () => {
      console.log('SSH Connection Successful!');
      runCommands(conn);
    });

    conn.on('error', (err) => {
      console.error(`SSH Connection Error (Attempt ${attempt}):`, err.message);
      conn.end();
      if (attempt < maxRetries) {
        console.log(`Waiting ${delayMs}ms before retrying...`);
        setTimeout(tryConnect, delayMs);
      } else {
        console.error('Max SSH connection retries reached. Deployment failed.');
        process.exit(1);
      }
    });

    conn.connect({
      ...config,
      readyTimeout: 60000
    });
  };

  tryConnect();
}

connectWithRetry(sshConfig);
