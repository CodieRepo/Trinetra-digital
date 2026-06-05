const { Client } = require('ssh2');

const sshConfig = {
  host: '187.127.170.222',
  port: 22,
  username: 'root',
  password: 'SatwikPal@123Shubham'
};

const commands = `
  set -e &&
  cd /var/www/trinetra &&
  git pull origin main &&

  echo "=== Building Frontend ===" &&
  npm install &&
  npm run build &&

  echo "=== Building Backend ===" &&
  cd server &&
  npm install &&
  npm run build &&
  cd .. &&

  echo "=== Applying Nginx Config ===" &&
  cp nginx.conf /etc/nginx/sites-available/trinetra &&
  nginx -t &&
  systemctl reload nginx &&

  echo "=== Restarting Backend ===" &&
  pm2 restart trinetra-crm-backend &&

  echo "=== DEPLOYMENT COMPLETE ==="
`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(commands, (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    stream.on('close', () => conn.end())
          .on('data', (data) => process.stdout.write(data))
          .stderr.on('data', (data) => process.stderr.write(data));
  });
}).connect(sshConfig);
