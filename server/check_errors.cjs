const { Client } = require('ssh2');

const sshConfig = {
  host: '187.127.170.222',
  port: 22,
  username: 'root',
  password: 'SatwikPal@123Shubham'
};

const commands = `
echo "=== GREP MSG ID ==="
grep "3EB0D4DDEBA96562A31DA729770F264C10EE4BAE" /var/www/trinetra/server/logs/out.log /var/www/trinetra/server/logs/err.log

echo "=== GREP ERROR ==="
tail -n 20 /var/www/trinetra/server/logs/err.log
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
