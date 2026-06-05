const { Client } = require('ssh2');

const sshConfig = {
  host: '187.127.170.222',
  port: 22,
  username: 'root',
  password: 'SatwikPal@123Shubham'
};

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH Connection Successful!');
  conn.exec('cat /etc/nginx/sites-enabled/* || cat /etc/nginx/nginx.conf', (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    stream.on('close', () => conn.end())
          .on('data', (data) => process.stdout.write(data))
          .stderr.on('data', (data) => process.stderr.write(data));
  });
}).on('error', (err) => {
  console.error('SSH Error:', err.message);
});
conn.connect(sshConfig);
