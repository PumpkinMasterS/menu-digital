(async () => {
 try {
  const res = await fetch('http://127.0.0.1:4000/api/auth/login', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({email: 'admin@site.test', password: 'admin123'})
  });
  const text = await res.text();
  console.log(text);
 } catch (e) { console.error('ERR', e.message); }
})();
