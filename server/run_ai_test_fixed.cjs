const { Client } = require('ssh2');

const sshConfig = {
  host: '187.127.170.222',
  port: 22,
  username: 'root',
  password: 'SatwikPal@123Shubham'
};

const commands = `
cat > /var/www/trinetra/server/test_ai_temp.mjs << 'EOF'
import { processWithAI } from './dist/services/openrouter.service.js';

async function test() {
  const ctx = {
    leadId: 'test-123',
    leadName: 'John Doe',
    leadPhone: '+919999999999',
    service: '',
    source: 'whatsapp',
    currentScore: 0,
    conversationSummary: '',
    recentMessages: [
      { role: 'user', content: 'Hi, I need an AI chatbot for my real estate business. My budget is around 10k INR per month.' }
    ],
    totalMessagesCount: 1
  };
  
  console.log("=== EXECUTING AI ===");
  const res = await processWithAI(ctx);
  console.log(JSON.stringify(res, null, 2));
  process.exit(0);
}
test();
EOF
cd /var/www/trinetra/server
node test_ai_temp.mjs
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
