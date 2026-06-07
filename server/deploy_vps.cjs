const { Client } = require('ssh2');

const sshConfig = {
  host: '187.127.170.222',
  port: 22,
  username: 'root',
  password: 'SatwikPal@123Shubham',
  readyTimeout: 20000
};

const commands = `
cd /var/www/trinetra
echo "=== CURRENT COMMIT ==="
git rev-parse HEAD
echo "=== PULLING UPDATES ==="
git pull origin main
echo "=== NEW COMMIT ==="
git rev-parse HEAD
echo "=== BUILDING FRONTEND ==="
npm install
npm run build
echo "=== RESTARTING BACKEND ==="
pm2 restart trinetra-crm-backend --update-env
echo "=== PM2 STATUS ==="
pm2 status
echo "=== NGINX STATUS ==="
systemctl status nginx --no-pager
`;

const conn = new Client();
conn.on('ready', () => {
  console.log('Connected to VPS.');
  conn.exec(commands, (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    stream.on('close', (code, signal) => {
      console.log('Deployment script finished with code ' + code);
      conn.end();
    })
    .on('data', (data) => process.stdout.write(data))
    .stderr.on('data', (data) => process.stderr.write(data));
  });
}).on('error', (err) => {
  console.error('SSH connection error:', err);
}).connect(sshConfig);
