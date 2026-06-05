const { Client } = require('ssh2');

const conn = new Client();
const commands = `
cd /var/www/trinetra
echo "Pulling latest changes..."
git fetch origin main
git reset --hard origin/main

echo "Building frontend..."
npm install
npm run build

echo "Building backend..."
cd server
npm install
npm run build

echo "Restarting application..."
pm2 restart trinetra-crm-backend --update-env

echo "Deployment complete."
`;

conn.on('ready', () => {
  console.log('Client :: ready');
  conn.exec(commands, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).connect({
  host: '187.127.170.222',
  port: 22,
  username: 'root',
  password: 'SatwikPal@123Shubham'
});
