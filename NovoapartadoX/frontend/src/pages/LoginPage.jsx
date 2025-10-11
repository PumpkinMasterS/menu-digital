import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import './LoginPage.css'; // Importar o novo CSS

export default function LoginPage() {
  const [email, setEmail] = useState('admin@site.test');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      
      const { accessToken, refreshToken } = res.data;
      login(accessToken, refreshToken);
      
      nav('/reservada');
    } catch (e) {
      const errorMessage = e?.response?.data?.error || e?.message || t('auth.loginError');
      console.error('Erro de login:', e?.response?.data || e?.message);
      alert(errorMessage);
    } finally { 
      setLoading(false); 
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <h1>{t('auth.login')}</h1>
        <form onSubmit={submit} className="login-form">
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder={t('auth.email')} type="email" required />
          <input value={password} onChange={e=>setPassword(e.target.value)} placeholder={t('auth.password')} type="password" required />
          <button className="btn btn-primary" disabled={loading}>{loading? t('common.loading') : t('auth.login')}</button>
        </form>
      </div>
    </div>
  );
}