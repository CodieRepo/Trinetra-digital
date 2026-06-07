const { Client } = require('ssh2');

const sshConfig = {
  host: '187.127.170.222',
  port: 22,
  username: 'root',
  password: 'SatwikPal@123Shubham'
};

const commands = `
node -e "
const d = require('/var/www/trinetra/server/audit_extraction_result.json');
const out = d.map(l => ({
  id: l.id,
  user_messages: l.chats.filter(c => c.direction === 'inbound').map(c => c.body),
  extracted_business_type: l.business_type,
  extracted_service_interest: l.service,
  lead_stage: l.lead_stage,
  ai_score: l.ai_score,
  stored_tags: l.lead_tags
}));
console.log(JSON.stringify(out, null, 2));
"
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
