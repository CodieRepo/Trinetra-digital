const { Client } = require('ssh2');

const sshConfig = {
  host: '187.127.170.222',
  port: 22,
  username: 'root',
  password: 'SatwikPal@123Shubham'
};

const commands = `
echo "=== Backups ==="
ls -la /var/www/trinetra/server/whatsapp-session-backups || echo "No backups folder"
for dir in /var/www/trinetra/server/whatsapp-session-backups/*; do
  echo "Backup: $dir"
  if [ -d "$dir" ]; then
    cat "$dir/backup-info.json" || echo "No backup-info.json"
    ls -la "$dir"
  fi
done
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
