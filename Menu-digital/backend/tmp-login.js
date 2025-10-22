const fs = require('fs');
async function login(email, password) {
  const res = await fetch('http://localhost:3000/v1/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  return { ok: res.ok, data };
}
(async () => {
  const attempts = [
    { email: 'whiswher@gmail.com', password: 'admin1234' },
    { email: 'admin@menu.com', password: 'admin123' }
  ];
  for (const a of attempts) {
    const { ok, data } = await login(a.email, a.password);
    if (ok && data?.token) {
      fs.writeFileSync('tmp-token.txt', data.token, 'utf8');
      console.log('JWT_OK for', a.email);
      return;
    } else {
      console.log('JWT_FAIL', a.email, data?.error || data?.message || 'Invalid');
    }
  }
  console.error('LOGIN_ERR all attempts failed');
  process.exit(1);
})();
