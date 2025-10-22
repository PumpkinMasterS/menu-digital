// Quick probe to GET /v1/admin/tables and POST /v1/admin/tables
// Run: node scripts/probe-admin-tables.js
const http = require('http');

function request(method, path, body, headers={}){
  return new Promise((resolve) => {
    const payload = body ? Buffer.from(JSON.stringify(body)) : null;
    const req = http.request({ hostname: 'localhost', port: 3000, path, method, headers: { 'Content-Type': 'application/json', ...(payload? { 'Content-Length': payload.length } : {}), ...headers } }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', (err) => resolve({ error: String(err) }));
    if (payload) req.write(payload);
    req.end();
  });
}

(async () => {
  const r1 = await request('GET', '/v1/admin/tables');
  console.log('GET /v1/admin/tables ->', r1);
  const r2 = await request('POST', '/v1/auth/login', { email: 'admin@menu.com', password: 'admin123' });
  console.log('POST /v1/auth/login ->', r2);
  let token;
  try { token = JSON.parse(r2.body).token; } catch {}
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const r3 = await request('GET', '/v1/admin/tables', undefined, headers);
  console.log('GET /v1/admin/tables (auth) ->', r3);
})();