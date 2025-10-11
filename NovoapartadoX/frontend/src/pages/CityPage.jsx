import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import './CityPage.css';

export default function CityPage({ defaultCity = 'Lisboa' }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('large'); // 'large' ou 'grid'
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filters, setFilters] = useState({
    city: defaultCity,
    minAge: '',
    maxAge: '',
    eyeColor: '',
    hairColor: '',
    minHeight: '',
    maxHeight: '',
    minWeight: '',
    maxWeight: '',
    sortBy: 'created'
  });

  const nav = useNavigate();

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      city: defaultCity
    }));
  }, [defaultCity]);

  useEffect(() => {
    if (filters.city === 'Lisboa') nav('/lisboa');
    else if (filters.city === 'Porto') nav('/porto');
  }, [filters.city, nav]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Navegação por teclado (setas) no modo large
  useEffect(() => {
    if (viewMode !== 'large') return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        prevModel();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        nextModel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, currentIndex, items.length]);

  // Detectar qual card está visível durante scroll manual
  useEffect(() => {
    if (viewMode !== 'large' || items.length === 0) return;

    const observers = items.map((_, index) => {
      const card = document.getElementById(`large-card-${index}`);
      if (!card) return null;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
              setCurrentIndex(index);
            }
          });
        },
        { threshold: 0.5 }
      );

      observer.observe(card);
      return observer;
    });

    return () => {
      observers.forEach((observer) => observer?.disconnect());
    };
  }, [viewMode, items.length]);

  const createStaticPlaceholders = (count, city) => {
    return Array.from({ length: count }, (_, i) => ({
      _id: `placeholder-${i}`,
      name: `Modelo ${i + 1}`,
      city: city,
      age: 22 + (i % 10),
      verified: i % 2 === 0,
      photos: [{ url: `https://placehold.co/600x800?text=Modelo+${i + 1}` }]
    }));
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const cityForPlaceholder = filters.city || defaultCity;
      const params = {
        ...(filters.city ? { city: filters.city } : {}),
        ...(searchTerm && { search: searchTerm }),
        ...(filters.minAge && { minAge: filters.minAge }),
        ...(filters.maxAge && { maxAge: filters.maxAge }),
        ...(filters.eyeColor && { eyeColor: filters.eyeColor }),
        ...(filters.hairColor && { hairColor: filters.hairColor }),
        ...(filters.minHeight && { minHeight: filters.minHeight }),
        ...(filters.maxHeight && { maxHeight: filters.maxHeight }),
        ...(filters.minWeight && { minWeight: filters.minWeight }),
        ...(filters.maxWeight && { maxWeight: filters.maxWeight }),
        sortBy: filters.sortBy
      };
      
      const res = await axios.get('/api/listings', { params });
      const incoming = res.data?.listings ? res.data.listings : res.data;
      const safeItems = Array.isArray(incoming) && incoming.length > 0 ? incoming : null;
      
      if (safeItems) {
        if (safeItems.length >= 10) {
          setItems(safeItems);
        } else {
          const needed = 10 - safeItems.length;
          const extras = createStaticPlaceholders(needed, cityForPlaceholder);
          setItems([...safeItems, ...extras]);
        }
      } else {
        setItems(createStaticPlaceholders(10, cityForPlaceholder));
      }
    } catch (e) {
      console.error('Erro ao buscar dados:', e);
      const cityForPlaceholder = filters.city || defaultCity;
      setItems(createStaticPlaceholders(10, cityForPlaceholder));
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      city: defaultCity,
      minAge: '',
      maxAge: '',
      eyeColor: '',
      hairColor: '',
      minHeight: '',
      maxHeight: '',
      minWeight: '',
      maxWeight: '',
      sortBy: 'created'
    });
    setSearchTerm('');
  };

  const applyFilters = () => {
    setShowFilters(false);
    fetchData();
  };

  const scrollToCard = (index) => {
    const card = document.getElementById(`large-card-${index}`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrentIndex(index);
    }
  };

  const nextModel = () => {
    const nextIndex = (currentIndex + 1) % items.length;
    scrollToCard(nextIndex);
  };

  const prevModel = () => {
    const prevIndex = (currentIndex - 1 + items.length) % items.length;
    scrollToCard(prevIndex);
  };

  if (loading) {
    return (
      <div className="city-page">
        <div className="city-loading">
          <div className="loading-spinner"></div>
          <p>Carregando modelos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="city-page">
      {/* Header Compacto */}
      <div className="city-page-header">
        <div className="city-header-container">
          <h1 className="city-title">Acompanhantes em {filters.city}</h1>
          <div className="city-actions">
            <button 
              className={`btn btn-sm btn-icon ${viewMode === 'large' ? 'active' : ''}`}
              onClick={() => setViewMode('large')}
              title="Visualização grande"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M3 3h18v18H3V3zm16 16V5H5v14h14z"/>
              </svg>
            </button>
            <button 
              className={`btn btn-sm btn-icon ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Visualização em grid"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M4 11h5V5H4v6zm0 7h5v-6H4v6zm6 0h5v-6h-5v6zm6 0h5v-6h-5v6zm-6-7h5V5h-5v6zm6-6v6h5V5h-5z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content - Cards aparecem imediatamente */}
      <div className="city-content">
        {items.length === 0 ? (
          <div className="city-empty">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
            <h3>Nenhuma modelo encontrada</h3>
            <p>Tente ajustar os filtros</p>
            <button className="btn btn-primary" onClick={clearFilters} style={{marginTop: 'var(--spacing-lg)'}}>
              Limpar Filtros
            </button>
          </div>
        ) : viewMode === 'large' ? (
          /* Visualização Grande - Cards empilhados verticalmente */
          <div className="large-view">
            <div className="large-cards-stack">
              {items.map((model, index) => (
                <div 
                  key={model._id} 
                  id={`large-card-${index}`}
                  className="large-card-wrapper"
                >
                  <Link 
                    to={`/listing/${model._id}`} 
                    className="large-model-card"
                  >
                    <div className="large-card-image">
                      <img 
                        src={model.photos?.[0]?.url || 'https://placehold.co/1200x1600?text=Foto'} 
                        alt={model.name}
                        loading={index > 0 ? 'lazy' : 'eager'}
                      />
                      <div className="large-card-overlay">
                        <h2 className="large-card-name">{model.name}</h2>
                        <div className="large-card-meta">
                          <span className="large-card-city">
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                            </svg>
                            {model.city}
                          </span>
                          {model.age && (
                            <span>{model.age} anos</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
        </div>

            {/* Navegação Horizontal */}
            {items.length > 1 && (
              <div className="large-nav-controls">
                <button className="large-nav-btn prev" onClick={prevModel} title="Anterior">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                  </svg>
                </button>
                <div className="large-card-indicator">
                  {currentIndex + 1} / {items.length}
                </div>
                <button className="large-nav-btn next" onClick={nextModel} title="Próximo">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                  </svg>
        </button>
              </div>
            )}
          </div>
        ) : (
          /* Visualização em Grid */
          <div className="models-grid">
            {items.map((model) => (
              <Link 
                key={model._id} 
                to={`/listing/${model._id}`} 
                className="model-card"
              >
                <div className="model-card-image">
                  <img 
                    src={model.photos?.[0]?.url || 'https://placehold.co/600x800?text=Foto'} 
                    alt={model.name}
                    loading="lazy"
                  />
                </div>
                <div className="model-card-info">
                  <h3 className="model-card-name">{model.name}</h3>
                  <div className="model-card-meta">
                    <span className="model-card-city">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                      </svg>
                      {model.city}
                    </span>
                    {model.age && (
                      <span>
                        {model.age} anos
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Botão Flutuante de Filtros */}
        <button
        className="filters-fab"
        onClick={() => setShowFilters(true)}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
        </svg>
        Filtros
        </button>

      {/* Modal de Filtros */}
      {showFilters && (
        <>
          <div className="filters-modal-overlay" onClick={() => setShowFilters(false)} />
          <div className="filters-modal">
            <div className="filters-modal-header">
              <h3>Filtros e Pesquisa</h3>
              <button className="close-btn" onClick={() => setShowFilters(false)}>×</button>
            </div>

            <div className="filters-modal-body">
              {/* Pesquisa */}
              <div className="filter-section">
                <h4>Pesquisar</h4>
                <input
                  type="text"
                  placeholder="Nome da modelo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Cidade */}
              <div className="filter-section">
                <h4>Cidade</h4>
                <div className="filter-group">
                  <label className="filter-checkbox">
                    <input
                      type="radio"
                      name="city"
                      checked={filters.city === 'Lisboa'}
                      onChange={() => handleFilterChange('city', 'Lisboa')}
                    />
                    Lisboa
                  </label>
                  <label className="filter-checkbox">
                    <input
                      type="radio"
                      name="city"
                      checked={filters.city === 'Porto'}
                      onChange={() => handleFilterChange('city', 'Porto')}
                    />
                    Porto
                  </label>
                </div>
          </div>

              {/* Ordenação */}
              <div className="filter-section">
                <h4>Ordenar Por</h4>
                  <select 
                  value={filters.sortBy} 
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                >
                  <option value="created">Recentes</option>
                  <option value="popularity">Mais Populares</option>
                  <option value="verified">Verificadas</option>
                  <option value="name">Nome (A-Z)</option>
                  </select>
                </div>

                {/* Idade */}
              <div className="filter-section">
                <h4>Idade</h4>
                <div className="filter-range">
                    <input
                      type="number"
                    min="18"
                    placeholder="Mín"
                      value={filters.minAge}
                      onChange={(e) => handleFilterChange('minAge', e.target.value)}
                    />
                  <span>até</span>
                    <input
                      type="number"
                    min="18"
                    placeholder="Máx"
                      value={filters.maxAge}
                      onChange={(e) => handleFilterChange('maxAge', e.target.value)}
                    />
                  </div>
                </div>

              {/* Cor dos Olhos */}
              <div className="filter-section">
                <h4>Cor dos Olhos</h4>
                <select 
                  value={filters.eyeColor} 
                  onChange={(e) => handleFilterChange('eyeColor', e.target.value)}
                >
                  <option value="">Todas</option>
                  <option value="castanhos">Castanhos</option>
                  <option value="verdes">Verdes</option>
                  <option value="azuis">Azuis</option>
                  <option value="pretos">Pretos</option>
                  <option value="mel">Mel</option>
                </select>
                </div>

              {/* Cor do Cabelo */}
              <div className="filter-section">
                <h4>Cor do Cabelo</h4>
                  <select 
                  value={filters.hairColor} 
                  onChange={(e) => handleFilterChange('hairColor', e.target.value)}
                >
                  <option value="">Todas</option>
                  <option value="preto">Preto</option>
                  <option value="castanho">Castanho</option>
                  <option value="loiro">Loiro</option>
                  <option value="ruivo">Ruivo</option>
                  <option value="colorido">Colorido</option>
                  </select>
                </div>

              {/* Altura */}
              <div className="filter-section">
                <h4>Altura</h4>
                <div className="slider-container">
                  <div className="slider-labels">
                    <span>{filters.minHeight || '1.40'}m</span>
                    <span>{filters.maxHeight || '2.00'}m</span>
                  </div>
                  <div className="dual-slider">
                    <input
                      type="range"
                      min="140"
                      max="200"
                      value={filters.minHeight ? parseFloat(filters.minHeight) * 100 : 140}
                      onChange={(e) => {
                        e.preventDefault();
                        handleFilterChange('minHeight', (e.target.value / 100).toFixed(2));
                      }}
                      className="slider-min"
                    />
                    <input
                      type="range"
                      min="140"
                      max="200"
                      value={filters.maxHeight ? parseFloat(filters.maxHeight) * 100 : 200}
                      onChange={(e) => {
                        e.preventDefault();
                        handleFilterChange('maxHeight', (e.target.value / 100).toFixed(2));
                      }}
                      className="slider-max"
                    />
                  </div>
                </div>
              </div>

              {/* Peso */}
              <div className="filter-section">
                <h4>Peso</h4>
                <div className="slider-container">
                  <div className="slider-labels">
                    <span>{filters.minWeight || '40'}kg</span>
                    <span>{filters.maxWeight || '120'}kg</span>
                  </div>
                  <div className="dual-slider">
                    <input
                      type="range"
                      min="40"
                      max="120"
                      value={filters.minWeight || 40}
                      onChange={(e) => {
                        e.preventDefault();
                        handleFilterChange('minWeight', e.target.value);
                      }}
                      className="slider-min"
                    />
                    <input
                      type="range"
                      min="40"
                      max="120"
                      value={filters.maxWeight || 120}
                      onChange={(e) => {
                        e.preventDefault();
                        handleFilterChange('maxWeight', e.target.value);
                      }}
                      className="slider-max"
                    />
                  </div>
              </div>
            </div>
          </div>

            <div className="filter-actions">
              <button className="btn btn-outline" onClick={clearFilters}>
                Limpar
              </button>
              <button className="btn btn-primary" onClick={applyFilters}>
                Aplicar
              </button>
                    </div>
              </div>
            </>
          )}
    </div>
  );
}
