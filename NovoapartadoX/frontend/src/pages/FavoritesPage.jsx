import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function FavoritesPage() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/favorites', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Ajustar para a nova estrutura de resposta do backend
        setFavorites(data.favorites || []);
      } else {
        throw new Error('Erro ao carregar favoritos');
      }
    } catch (err) {
      setError(err.message);
      console.error('Erro ao buscar favoritos:', err);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (listingId) => {
    try {
      const response = await fetch(`/api/favorites/${listingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setFavorites(favorites.filter(fav => fav._id !== listingId));
      } else {
        throw new Error('Erro ao remover favorito');
      }
    } catch (err) {
      setError(err.message);
      console.error('Erro ao remover favorito:', err);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-message">
          <p>❌ {error}</p>
          <button className="btn btn-primary" onClick={fetchFavorites}>
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>❤️ Meus Favoritos</h1>
        <p>Gerencie seus acompanhantes favoritos</p>
      </div>

      {favorites.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🤍</div>
          <h3>Nenhum favorito ainda</h3>
          <p>Adicione acompanhantes aos seus favoritos clicando no coração ❤️</p>
          <NavLink to="/lisboa" className="btn btn-primary">
            Explorar Acompanhantes
          </NavLink>
        </div>
      ) : (
        <>
          <div className="results-count">
            <p>{favorites.length} favorito{favorites.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="listings-grid">
            {favorites.map((favorite, index) => (
              <div key={index} className="listing-card">
                <div className="listing-image">
                  <img 
                    src={favorite?.photos?.[0]?.url || favorite?.image || '/placeholder-image.jpg'} 
                    alt={favorite?.name}
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjNmMyIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZm9udC1zaXplPSIyMCI+SW1hZ2VuPC90ZXh0Pjwvc3ZnPg==';
                    }}
                  />
                  <button 
                    className="favorite-btn favorited"
                    onClick={() => removeFavorite(favorite._id)}
                    title="Remover dos favoritos"
                  >
                    ❤️
                  </button>
                </div>
                
                <div className="listing-content">
                  <h3>{favorite?.name || 'Nome não disponível'}</h3>
                  <p className="listing-city">{favorite?.city || 'Cidade não disponível'}</p>
                  
                  <div className="listing-details">
                    <span className="listing-age">{favorite?.age || 'N/A'} anos</span>
                  </div>

                  <div className="listing-actions">
                    <NavLink 
                      to={`/listing/${favorite._id}`}
                      className="btn btn-primary btn-sm"
                    >
                      Ver Detalhes
                    </NavLink>
                    <button 
                      className="btn btn-outline btn-sm"
                      onClick={() => removeFavorite(favorite._id)}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}