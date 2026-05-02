const https = require('https');

const tokensToTest = [
  'test-client-001',
  'test_client_001',
  'client-001',
  'client_001',
];

async function test(token) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'n22tx49p-5099.inc1.devtunnels.ms',
      port: 443,
      path: '/api/cameras',
      method: 'GET',
      headers: {
        'X-Tunnel-Skip-AntiPhishing-Page': 'true',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          token,
          status: res.statusCode,
          body: body
        });
      });
    });

    req.on('error', (e) => resolve({ token, error: e.message }));
    req.end();
  });
}

(async () => {
  console.log('--- STARTING TOKEN PROBE ---');
  for (const t of tokensToTest) {
    const res = await test(t);
    console.log(`Token: ${res.token} | Status: ${res.status} | Body: ${res.body}`);
  }
})();
