const { Client } = require('ssh2');

const sshConfig = {
  host: '187.127.170.222',
  port: 22,
  username: 'root',
  password: 'SatwikPal@123Shubham'
};

const commands = `
cd /var/www/trinetra
git pull origin main
npm install
npm run build
pm2 restart trinetra-crm-backend
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
