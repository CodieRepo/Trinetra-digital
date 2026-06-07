const { Client } = require('ssh2');

const sshConfig = {
  host: '187.127.170.222',
  port: 22,
  username: 'root',
  password: 'SatwikPal@123Shubham'
};

const commands = `
echo "=== GIT HASH ==="
cd /var/www/trinetra
git rev-parse HEAD

echo "\n=== PM2 STATUS ==="
pm2 status trinetra-crm-backend | grep "trinetra-crm-backend"

echo "\n=== BUILD TIMESTAMP & FILENAMES ==="
ls -la /var/www/trinetra/dist/assets/AdminCrm*.js

echo "\n=== BUNDLE CONTENT VERIFICATION ==="
echo "- Checking for scrollIntoView (Should be EMPTY):"
grep -n "scrollIntoView" /var/www/trinetra/dist/assets/AdminCrm*.js || echo "None found."

echo "- Checking for chatContainerRef (Should find matches):"
grep -n "chatContainerRef" /var/www/trinetra/dist/assets/AdminCrm*.js || echo "None found."

echo "\n=== NGINX STATUS ==="
systemctl status nginx --no-pager | grep "Active:"
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
