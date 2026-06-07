const { Client } = require('ssh2');

const sshConfig = {
  host: '187.127.170.222',
  port: 22,
  username: 'root',
  password: 'SatwikPal@123Shubham'
};

const commands = `pm2 logs trinetra-crm-backend --lines 500 --nostream`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(commands, (err, stream) => {
    if (err) throw err;
    let output = '';
    stream.on('close', () => {
      conn.end();
      const lines = output.split('\n');
      console.log('=== RAW MESSAGES.UPSERT EVENTS ===');
      lines.filter(l => l.includes('RAW MESSAGE')).forEach(l => console.log(l));
      console.log('=== ERRORS ===');
      lines.filter(l => l.includes('error') || l.includes('Error') || l.includes('⚠️') || l.includes('🚨')).forEach(l => console.log(l));
    })
    .on('data', (data) => { output += data.toString(); })
    .stderr.on('data', (data) => process.stderr.write(data));
  });
}).connect(sshConfig);
