import { createContext, useState, useContext, useEffect, useRef } from 'react';
import axios from 'axios';

// Configurar baseURL do axios: em desenvolvimento usar relativo para passar pelo proxy do Vite
const API_BASE_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL ?? '')
axios.defaults.baseURL = API_BASE_URL

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshInFlight = useRef(null); // deduplicar tentativas de refresh

  // Aplicar automaticamente o header Authorization quando o token muda
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete axios.defaults.headers.common['Authorization']
    }
  }, [token])

  // Função para renovar o token automaticamente
  const refreshAccessToken = async () => {
    try {
      const response = await axios.post(`/api/auth/refresh`, {
        refreshToken: refreshToken
      });
      
      const { accessToken, refreshToken: newRefreshToken } = response.data;
      
      localStorage.setItem('token', accessToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      setToken(accessToken);
      setRefreshToken(newRefreshToken);
      
      return accessToken;
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      logout();
      return null;
    }
  };

  // Interceptor para renovar token automaticamente
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const status = error.response?.status;
        const original = error.config || {};

        // Evitar loop: não tentar refresh ao falhar o próprio endpoint de refresh
        const isRefreshEndpoint = typeof original.url === 'string' && original.url.includes('/api/auth/refresh');

        if (status === 401 && refreshToken && !isRefreshEndpoint) {
          try {
            // Deduplicar em caso de múltiplas 401 simultâneas
            if (!refreshInFlight.current) {
              refreshInFlight.current = (async () => {
                try {
                  const newToken = await refreshAccessToken();
                  return newToken;
                } finally {
                  // liberar após conclusão
                  setTimeout(() => { refreshInFlight.current = null; }, 0);
                }
              })();
            }

            const newToken = await refreshInFlight.current;
            if (newToken) {
              original.headers = { ...(original.headers || {}), Authorization: `Bearer ${newToken}` };
              original._retry = true;
              return axios.request(original);
            }
          } catch (e) {
            // Se der erro no refresh, propagar para cair no logout do caller
          }
        }
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, [refreshToken]);

  useEffect(() => {
    if (token) {
      axios.get(`/api/auth/me`)
        .then(r => {
          const data = r.data
          const enrichedUser = data?.user ? { ...data.user, permissions: data.permissions, canAccessAdmin: data.canAccessAdmin } : null
          setUser(enrichedUser)
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          setToken(null);
          setRefreshToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (newToken, newRefreshToken) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('refreshToken', newRefreshToken);
    setToken(newToken);
    setRefreshToken(newRefreshToken);
    // Garantir que o header Authorization seja aplicado imediatamente
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    try {
      const r = await axios.get(`/api/auth/me`, { headers: { Authorization: `Bearer ${newToken}` } })
      const data = r.data
      const enrichedUser = data?.user ? { ...data.user, permissions: data.permissions, canAccessAdmin: data.canAccessAdmin } : null
      setUser(enrichedUser)
    } catch (error) {
      console.error('Falha ao obter dados do usuário após login:', error)
      // Se falhar, garantir limpeza de sessão
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setToken(null);
      setRefreshToken(null);
      setUser(null);
      delete axios.defaults.headers.common['Authorization']
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setToken(null);
    setRefreshToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, refreshToken, user, setUser, login, logout, loading, refreshAccessToken }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);