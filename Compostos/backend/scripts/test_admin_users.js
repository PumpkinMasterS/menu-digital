const axios = require('axios');

const BASE = process.env.BASE_URL || 'http://localhost:5000/api';

async function run() {
  try {
    console.log('🔐 Login admin...');
    const login = await axios.post(`${BASE}/auth/admin/login`, {
      email: 'admin@example.com',
      password: 'admin123',
    });
    const token = login?.data?.data?.token;
    const admin = login?.data?.data?.admin;
    if (!token) throw new Error('Sem token de admin');
    console.log('✅ Admin:', admin?.email, 'role:', admin?.role);

    console.log('📥 Buscando usuários (/admin/users)...');
    const res = await axios.get(`${BASE}/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = res?.data?.data || res?.data;
    console.log('✅ Status:', res.status);
    console.log('📊 totalUsers:', data?.totalUsers, 'totalPages:', data?.totalPages, 'currentPage:', data?.currentPage);
    console.log('👥 users length:', (data?.users || []).length);
    console.log('users sample:', (data?.users || []).slice(0, 3));

  } catch (err) {
    const status = err.response?.status;
    const body = err.response?.data;
    console.error('❌ Erro na validação /admin/users:', status, body || err.message);
    process.exitCode = 1;
  }
}

run();