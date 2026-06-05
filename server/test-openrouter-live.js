const dotenv = require('dotenv');
dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/chat/completions';

console.log('API Key Length:', OPENROUTER_API_KEY.length);
console.log('First 12 chars:', OPENROUTER_API_KEY.substring(0, 12));
console.log('Last 12 chars:', OPENROUTER_API_KEY.substring(OPENROUTER_API_KEY.length - 12));

async function runTest() {
  console.log('\n🚀 Testing live OpenRouter connectivity...');
  try {
    const headers = {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://trinetradigitalsolution.com',
      'X-Title': 'Trinetra Digital Solution',
      'Content-Type': 'application/json',
    };

    console.log('Headers sent:', {
      ...headers,
      'Authorization': `Bearer ${OPENROUTER_API_KEY.substring(0, 10)}...${OPENROUTER_API_KEY.substring(OPENROUTER_API_KEY.length - 10)}`
    });

    const response = await fetch(OPENROUTER_BASE, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: 'Hi' }
        ],
        max_tokens: 50
      })
    });

    console.log('Response Status:', response.status);
    console.log('Response OK:', response.ok);
    const body = await response.text();
    console.log('Response Body:', body);
  } catch (err) {
    console.error('❌ Error during connectivity test:', err);
  }
}

runTest();
