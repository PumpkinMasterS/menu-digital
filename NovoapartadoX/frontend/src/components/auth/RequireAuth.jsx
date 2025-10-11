import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';

function RequireAuth({ children }) {
  const { token } = useAuth()
  if (!token) return <div>
    <p>Precisa de iniciar sessão.</p>
    <Link to="/login" className="btn btn-primary">Ir para Login</Link>
  </div>
  return children
}

export default RequireAuth;