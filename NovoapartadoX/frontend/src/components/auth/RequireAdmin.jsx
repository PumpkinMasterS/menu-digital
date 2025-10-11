import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';

function RequireAdmin({ children }) {
  const { user } = useAuth()
  const isAdmin = !!user && (user.canAccessAdmin || user.role === 'admin')
  if (!isAdmin) return <div>
    <p>Acesso restrito ao administrador.</p>
    <Link to="/">Voltar</Link>
  </div>
  return children
}

export default RequireAdmin;