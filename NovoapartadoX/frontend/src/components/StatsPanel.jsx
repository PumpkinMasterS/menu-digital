import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

export default function StatsPanel({ listingId }) {
  const { token, user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || user?.role !== 'admin') return;
    setLoading(true);
    
    const url = listingId 
      ? `/api/admin/stats-summary?days=7&listingId=${listingId}`
      : '/api/admin/stats-summary?days=7';
    
    axios.get(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setData(res.data))
      .catch(err => setError(err?.response?.data?.error || 'Falha ao carregar estatísticas'))
      .finally(() => setLoading(false));
  }, [token, user, listingId]);

  if (!user || user.role !== 'admin') return null;
  
  const title = listingId ? `Estatísticas do Perfil (7 dias)` : `Estatísticas Gerais (7 dias)`;

  return (
    <div className="stats-panel">
      <h3>{title}</h3>
      {loading && <p>A carregar estatísticas...</p>}
      {error && <p className="error-text">{error}</p>}
      {data && (
        <div className="stats-table-container">
          <table className="stats-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Views</th>
                <th>Cliques</th>
                <th>Chamadas</th>
              </tr>
            </thead>
            <tbody>
              {data.series.map((d) => (
                <tr key={d.date}>
                  <td>{d.date}</td>
                  <td className="number-cell">{d.views}</td>
                  <td className="number-cell">{d.clicks}</td>
                  <td className="number-cell">{d.calls}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}