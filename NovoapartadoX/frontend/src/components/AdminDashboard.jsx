import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import './AdminDashboard.css'
import { useNavigate } from 'react-router-dom';

function AdminDashboard() {
  const { token, user } = useAuth()
  const [stats, setStats] = useState(null)
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedModel, setSelectedModel] = useState(null)

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [statsRes, modelsRes] = await Promise.all([
        axios.get('/api/models/stats', { 
          headers: { Authorization: `Bearer ${token}` } 
        }),
        axios.get('/api/models', { 
          headers: { Authorization: `Bearer ${token}` } 
        })
      ])
      
      setStats(statsRes.data)
      setModels(modelsRes.data)
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
      alert('Erro ao carregar dados do dashboard')
    } finally {
      setLoading(false)
    }
  }

  const deleteModel = async (modelId) => {
    if (!confirm('Tem certeza que deseja desativar esta modelo?')) return
    
    try {
      await axios.delete(`/api/models/${modelId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setModels(models.filter(m => m._id !== modelId))
      alert('Modelo desativada com sucesso!')
    } catch (error) {
      console.error('Erro ao desativar modelo:', error)
      alert('Erro ao desativar modelo')
    }
  }

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="admin-dashboard">
        <div className="access-denied">
          <h2>Acesso Restrito</h2>
          <p>Apenas administradores podem acessar esta área.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <div className="dashboard-header-content">
        <h1>Dashboard Administrativo</h1>
        <div className="header-actions">
            <button className="btn btn-outline btn-sm" onClick={fetchDashboardData} disabled={loading}>
              {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
            <Link to="/admin/models/new" className="btn btn-primary btn-sm">
              + Nova Modelo
            </Link>
          </div>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button 
          className={activeTab === 'overview' ? 'tab-active' : 'tab'}
          onClick={() => setActiveTab('overview')}
        >
          Visão Geral
        </button>
        <button 
          className={activeTab === 'models' ? 'tab-active' : 'tab'}
          onClick={() => setActiveTab('models')}
        >
          Gestão de Modelos
        </button>
        <button 
          className={activeTab === 'stats' ? 'tab-active' : 'tab'}
          onClick={() => setActiveTab('stats')}
        >
          Estatísticas Detalhadas
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <OverviewTab stats={stats} models={models} />
        )}
        
        {activeTab === 'models' && (
          <ModelsTab 
            models={models} 
            onDelete={deleteModel}
            onSelect={setSelectedModel}
          />
        )}
        
        {activeTab === 'stats' && (
          <StatsTab stats={stats} />
        )}
      </div>

      {selectedModel && (
        <ModelDetailsModal 
          model={selectedModel}
          onClose={() => setSelectedModel(null)}
        />
      )}
    </div>
  )
}

function OverviewTab({ stats, models }) {
  if (!stats) return <p>Nenhum dado disponível</p>

  return (
    <div className="overview-tab">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3>{stats.totalModels}</h3>
            <p>Total de Modelos</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3>{stats.verifiedModels}</h3>
            <p>Verificadas</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3>{stats.totalPhotos}</h3>
            <p>Total de Fotos</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3>{stats.featuredModels}</h3>
            <p>Destacadas</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3>{stats.totalCalls || 0}</h3>
            <p>Contactos</p>
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h3>Ações Rápidas</h3>
        <div className="actions-grid">
          <Link to="/admin/models/new" className="action-card">
            <div className="action-icon">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
            </div>
            <p>Nova Modelo</p>
          </Link>
          <Link to="/admin/models" className="action-card">
            <div className="action-icon">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
              </svg>
            </div>
            <p>Gestão de Modelos</p>
          </Link>
          <Link to="/gerir-fotos" className="action-card">
            <div className="action-icon">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
              </svg>
            </div>
            <p>Gerir Fotos</p>
          </Link>
          <Link to="/configuracoes" className="action-card">
            <div className="action-icon">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
              </svg>
            </div>
            <p>Configurações</p>
          </Link>
          <Link to="/reservada" className="action-card">
            <div className="action-icon">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
              </svg>
            </div>
            <p>Área Reservada</p>
          </Link>
        </div>
      </div>

      <div className="recent-models">
        <h3>Modelos Recentes</h3>
        <div className="models-list">
          {models.slice(0, 5).map(model => (
            <div key={model._id} className="model-item">
              <img 
                src={model.photos?.[0]?.thumbnail || model.photos?.[0]?.url || 'https://placehold.co/60x60?text=📸'} 
                alt={model.name}
                className="model-avatar"
                onError={(e) => {
                  e.target.src = 'https://placehold.co/60x60?text=📸';
                }}
              />
              <div className="model-info">
                <h4>
                  <Link to={`/admin/models/${model._id}`}>
                    {model.name}
                  </Link>
                </h4>
                <p>{model.category}</p>
              </div>
              <span className={`status ${model.active ? 'active' : 'inactive'}`}>
                {model.active ? 'Ativa' : 'Inativa'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ModelsTab({ models, onDelete, onSelect }) {
  return (
    <div className="models-tab">
      <div className="models-header">
        <h3>Gestão de Modelos ({models.length})</h3>
        <Link to="/admin/models/new" className="btn btn-primary">
          + Nova Modelo
        </Link>
      </div>

      <div className="models-table">
        <table>
          <thead>
            <tr>
              <th>Foto</th>
              <th>Nome</th>
              <th>Categoria</th>
              <th>Fotos</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {models.map(model => (
              <tr key={model._id}>
                <td>
                  <img 
                    src={model.photos?.[0]?.thumbnail || model.photos?.[0]?.url || 'https://placehold.co/40x40?text=📸'} 
                    alt={model.name}
                    className="table-avatar"
                    onError={(e) => {
                      e.target.src = 'https://placehold.co/40x40?text=📸';
                    }}
                  />
                </td>
                <td>
                  <strong>{model.name}</strong>
                  <br />
                  <small>{model.email}</small>
                </td>
                <td>{model.category}</td>
                <td>{model.photos?.length || 0}</td>
                <td>
                  <span className={`status ${model.active ? 'active' : 'inactive'}`}>
                    {model.active ? 'Ativa' : 'Inativa'}
                  </span>
                  {model.verified && <span className="verified">✓</span>}
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="btn btn-sm btn-outline"
                      onClick={() => onSelect(model)}
                    >
                      Ver
                    </button>
                    <Link 
                      to={`/admin/models/${model._id}`}
                      className="btn btn-sm btn-outline"
                    >
                      Dashboard
                    </Link>
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => onDelete(model._id)}
                    >
                      Desativar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatsTab({ stats }) {
  if (!stats) return <p>Nenhuma estatística disponível</p>

  return (
    <div className="stats-tab">
      <h3>Estatísticas Detalhadas</h3>
      
      <div className="category-stats">
        <h4>Distribuição por Categoria</h4>
        <div className="stats-bars">
          {Object.entries(stats.categoryDistribution || {}).map(([category, count]) => (
            <div key={category} className="stat-bar">
              <span className="category-name">{category}</span>
              <div className="bar-container">
                <div 
                  className="bar-fill"
                  style={{ width: `${(count / stats.totalModels) * 100}%` }}
                ></div>
              </div>
              <span className="count">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="engagement-stats">
        <h4>Métricas de Engajamento</h4>
        <div className="engagement-grid">
          <div className="engagement-card">
            <h5>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style={{display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle'}}>
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
              </svg>
              Views Totais
            </h5>
            <p className="big-number">{stats.totalViews || 0}</p>
          </div>
          <div className="engagement-card">
            <h5>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style={{display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle'}}>
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              Likes Totais
            </h5>
            <p className="big-number">{stats.totalLikes || 0}</p>
          </div>
          <div className="engagement-card">
            <h5>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style={{display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle'}}>
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
              </svg>
              Downloads
            </h5>
            <p className="big-number">{stats.totalDownloads || 0}</p>
          </div>
          <div className="engagement-card">
            <h5>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style={{display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle'}}>
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
              </svg>
              Contactos
            </h5>
            <p className="big-number">{stats.totalCalls || 0}</p>
          </div>
          <div className="engagement-card">
            <h5>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style={{display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle'}}>
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
              </svg>
              Taxa de Engajamento
            </h5>
            <p className="big-number">{stats.engagementRate || 0}%</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ModelDetailsModal({ model, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Detalhes da Modelo</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="model-gallery">
            {model.photos?.map((photo, index) => (
              <img 
                key={index}
                src={photo.url}
                alt={`${model.name} ${index + 1}`}
                className="gallery-image"
              />
            ))}
          </div>
          
          <div className="model-info">
            <h3>{model.name}</h3>
            <p><strong>Email:</strong> {model.email}</p>
            <p><strong>Categoria:</strong> {model.category}</p>
            <p><strong>Telefone:</strong> {model.phone}</p>
            <p><strong>Status:</strong> {model.active ? 'Ativa' : 'Inativa'}</p>
            <p><strong>Verificada:</strong> {model.verified ? 'Sim' : 'Não'}</p>
            <p><strong>Fotos:</strong> {model.photos?.length || 0}</p>
            
            {/* Novos campos adicionados */}
            <p><strong>Última vez vista:</strong> Há 4h</p>
            <p><strong>Contacto:</strong> +351 917 119 297</p>
            <p><strong>WhatsApp:</strong> Disponível</p>
            <p><strong>Cidade:</strong> Lisboa</p>
            <p><strong>Nacionalidade:</strong> 🇧🇷</p>
            <p><strong>Olhos:</strong> Castanhos</p>
            <p><strong>Idade:</strong> 23</p>
            <p><strong>Altura:</strong> 1,56 M</p>
            <p><strong>Peso:</strong> 52Kg</p>
          </div>

          {model.socialMedia && (
            <div className="social-media">
              <h4>Redes Sociais</h4>
              <div className="social-links">
                {model.socialMedia.instagram && (
                  <a href={model.socialMedia.instagram} target="_blank" rel="noopener noreferrer">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>
                    </svg>
                    Instagram
                  </a>
                )}
                {model.socialMedia.twitter && (
                  <a href={model.socialMedia.twitter} target="_blank" rel="noopener noreferrer">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M22.46 6c-.85.38-1.78.64-2.75.76 1-.6 1.76-1.55 2.12-2.68-.93.55-1.96.96-3.06 1.18C17.92 4.4 16.84 4 15.68 4c-2.68 0-4.86 2.18-4.86 4.86 0 .38.04.76.13 1.12-4.04-.2-7.62-2.14-10.02-5.08-.42.72-.66 1.56-.66 2.46 0 1.69.86 3.18 2.16 4.05-.8-.03-1.54-.25-2.2-.62v.06c0 2.36 1.68 4.33 3.9 4.77-.41.11-.84.17-1.28.17-.31 0-.62-.03-.92-.08.63 1.95 2.44 3.37 4.6 3.41-1.69 1.32-3.81 2.11-6.12 2.11-.4 0-.79-.02-1.17-.07 2.18 1.4 4.77 2.21 7.55 2.21 9.06 0 14-7.5 14-14v-.64c.96-.69 1.8-1.56 2.46-2.55z"/>
                    </svg>
                    Twitter
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard