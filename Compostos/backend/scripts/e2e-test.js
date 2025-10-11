// End-to-end test script for auth, health, device token registration, notifications and achievements
// Uses global fetch (Node 18+)

const BASE = process.env.BASE_URL || 'http://localhost:5000/api';

async function http(method, path, { body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} ${res.statusText} ${path}`);
    err.response = { status: res.status, data };
    throw err;
  }
  return data;
}

(async () => {
  try {
    const email = 'test@example.com';
    const password = '123456';
    let token = '';

    // Try login; if fails, register then login
    try {
      const login = await http('POST', '/auth/login', { body: { email, password } });
      token = login?.data?.token || login?.data?.token?.token || login?.data?.token?.accessToken || login?.data?.token;
      console.log('login =>', login);
    } catch (e) {
      console.log('login failed, registering user...', e.response?.data || e.message);
      const reg = await http('POST', '/auth/register', { body: { name: 'Test User', email, password, referralCode: '' } });
      console.log('register =>', reg);
      const login2 = await http('POST', '/auth/login', { body: { email, password } });
      token = login2?.data?.token || login2?.data?.token?.token || login2?.data?.token?.accessToken || login2?.data?.token;
      console.log('login2 =>', login2);
    }

    if (!token) throw new Error('No auth token received');

    const health = await http('GET', '/health');
    console.log('health =>', health);

    const devTok = `fake-fcm-token-${Date.now()}`;
    const regTok = await http('POST', '/notifications/register-device-token', { body: { token: devTok, platform: 'android' }, token });
    console.log('register-device-token =>', regTok);

    const testNotif = await http('POST', '/notifications/test', { body: { type: 'success', title: 'Teste Push', message: 'Olá do servidor!' }, token });
    console.log('notifications/test =>', testNotif);

    const check = await http('POST', '/achievements/check', { body: {}, token });
    console.log('achievements/check =>', check);

    const list = await http('GET', '/notifications', { token });
    console.log('notifications/list =>', list);

    console.log('\nE2E done.');
  } catch (err) {
    console.error('E2E ERROR:', err.response ? err.response.data : err.message);
    process.exitCode = 1;
  }
})();