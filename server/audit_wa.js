const { Client } = require('ssh2');

const sshConfig = {
  host: '187.127.170.222',
  port: 22,
  username: 'root',
  password: 'SatwikPal@123Shubham'
};

const commands = `
echo "=== wa-session directory ==="
ls -la /var/www/trinetra/server/data/wa-session/

echo "=== creds.json size and start ==="
wc -c /var/www/trinetra/server/data/wa-session/creds.json || echo "creds.json missing"
head -c 200 /var/www/trinetra/server/data/wa-session/creds.json || echo ""
echo ""

echo "=== error logs ==="
grep "Connection closed" /root/.pm2/logs/trinetra-crm-backend-out.log | tail -n 10
grep "qr_required" /root/.pm2/logs/trinetra-crm-backend-out.log | tail -n 10
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
