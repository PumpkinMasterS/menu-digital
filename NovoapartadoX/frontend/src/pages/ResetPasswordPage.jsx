import { useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import './ResetPasswordPage.css';

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const nav = useNavigate();
  const { userId } = useParams();
  const { user } = useAuth();
  const { t } = useTranslation();

  // Verificar se o usuário tem permissão para resetar a senha
  const canResetPassword = user?.role === 'admin' || user?.id === userId;

  async function handleResetPassword(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    // Validações
    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      setLoading(false);
      return;
    }

    try {
      const targetUserId = userId || user?.id;
      
      await axios.patch(`/api/users/${targetUserId}`, {
        password: newPassword
      });

      setMessage('Senha alterada com sucesso!');
      
      // Redirecionar após 2 segundos
      setTimeout(() => {
        if (user?.role === 'admin') {
          nav('/admin');
        } else {
          nav('/profile');
        }
      }, 2000);

    } catch (e) {
      const errorMessage = e?.response?.data?.error || e?.message || 'Erro ao alterar senha';
      console.error('Erro ao resetar senha:', e?.response?.data || e?.message);
      setError(errorMessage);
    } finally { 
      setLoading(false); 
    }
  }

  if (!canResetPassword && user) {
    return (
      <div className="reset-password-page">
        <div className="reset-container">
          <h1>Acesso Negado</h1>
          <p>Você não tem permissão para resetar esta senha.</p>
          <button 
            className="btn btn-primary" 
            onClick={() => nav('/')}
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password-page">
      <div className="reset-container">
        <h1>{userId ? 'Resetar Senha' : 'Alterar Minha Senha'}</h1>
        
        <form onSubmit={handleResetPassword} className="reset-form">
          <div className="form-group">
            <label>Nova Senha</label>
            <input 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              placeholder="Digite a nova senha" 
              type="password" 
              required 
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label>Confirmar Senha</label>
            <input 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              placeholder="Confirme a nova senha" 
              type="password" 
              required 
              minLength={6}
            />
          </div>

          {message && <div className="success-message">{message}</div>}
          {error && <div className="error-message">{error}</div>}

          <button 
            className="btn btn-primary" 
            disabled={loading}
          >
            {loading ? 'Alterando...' : 'Alterar Senha'}
          </button>
        </form>

        <div className="quick-actions">
          <h3>Ações Rápidas:</h3>
          <button 
            className="btn btn-secondary"
            onClick={() => setNewPassword('model123')}
          >
            Usar "model123"
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => setNewPassword('demo123')}
          >
            Usar "demo123"
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => {
              const randomPass = Math.random().toString(36).slice(-8);
              setNewPassword(randomPass);
              setConfirmPassword(randomPass);
            }}
          >
            Gerar Senha Aleatória
          </button>
        </div>

        <div className="navigation-actions">
          <button 
            className="btn btn-outline" 
            onClick={() => nav(-1)}
          >
            Voltar
          </button>
          <button 
            className="btn btn-outline" 
            onClick={() => nav('/')}
          >
            Início
          </button>
        </div>
      </div>
    </div>
  );
}