const { Client } = require('ssh2');

const sshConfig = {
  host: '187.127.170.222',
  port: 22,
  username: 'root',
  password: 'SatwikPal@123Shubham'
};

const commands = `
echo "=== MEMORY USAGE ==="
free -h

echo "=== PM2 STATUS ==="
pm2 status

echo "=== PM2 LOGS ==="
pm2 logs trinetra-crm-backend --lines 100 --nostream

echo "=== DB CHECK ==="
ls -la /var/www/trinetra/server/data/trinetra.db
sqlite3 /var/www/trinetra/server/data/trinetra.db "SELECT count(*) FROM leads;" || echo "sqlite3 failed"

echo "=== CRONTAB ==="
crontab -l || echo "No crontab for root"

echo "=== HEALTH ENDPOINT ==="
curl -s http://localhost:5000/api/health || echo "Health check failed"
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
