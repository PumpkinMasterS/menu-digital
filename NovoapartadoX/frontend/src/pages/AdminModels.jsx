import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import './AdminModels.css'

function AdminModelsPage() {
  const { token, user } = useAuth()
  const [models, setModels] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedModel, setSelectedModel] = useState(null)
  const [modelStats, setModelStats] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])

  useEffect(() => {
    if (!user || user.role !== 'admin') return
    fetchModels()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, page])

  const fetchModels = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await axios.get('/api/admin/models', {
        params: { page, limit: 20, search: search || undefined },
        headers
      })
      setModels(res.data?.models || [])
      setTotal(res.data?.total || 0)
      setPages(res.data?.pages || 0)
    } catch (err) {
      console.error('Erro ao carregar modelos:', err)
      setError('Falha ao carregar lista de modelos')
    } finally {
      setLoading(false)
    }
  }

  const openDetails = async (modelId) => {
    try {
      setDetailsLoading(true)
      const [detailsRes, statsRes] = await Promise.all([
        axios.get(`/api/admin/models/${modelId}`, { headers }),
        axios.get(`/api/models/${modelId}/stats`, { params: { days: 7 }, headers })
      ])
      setSelectedModel(detailsRes.data)
      setModelStats(statsRes.data)
    } catch (err) {
      console.error('Erro ao carregar detalhes da modelo:', err)
      alert('Falha ao carregar detalhes da modelo')
    } finally {
      setDetailsLoading(false)
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setPage(1)
    fetchModels()
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="admin-models-page">
        <div className="models-error">
          <h2>Acesso restrito</h2>
          <p>Esta página é apenas para administradores.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-models-page">
      <div className="admin-models-header">
        <div className="admin-models-header-content">
          <div className="models-header-top">
            <h1>Gestão de Modelos</h1>
            <div className="models-header-actions">
              <button className="btn btn-outline btn-sm" onClick={fetchModels} disabled={loading}>
                {loading ? 'Atualizando...' : 'Atualizar'}
              </button>
              <Link to="/admin/models/new" className="btn btn-primary">
                + Nova Modelo
              </Link>
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className="models-search-form">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por nome..."
            />
            <button className="btn btn-secondary" type="submit">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
              Pesquisar
            </button>
          </form>
        </div>
      </div>

      {error && (
        <div className="admin-models-content">
          <div className="models-error">{error}</div>
        </div>
      )}

      <div className="admin-models-content">
        {loading ? (
          <div className="models-loading">
            <div className="loading-spinner"></div>
            <p>Carregando modelos...</p>
          </div>
        ) : models.length === 0 ? (
          <div className="models-list-card">
            <div className="models-empty">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
              <h3>Nenhuma modelo encontrada</h3>
              <p>Adicione a primeira modelo ou ajuste sua pesquisa</p>
              <Link to="/admin/models/new" className="btn btn-primary" style={{marginTop: 'var(--spacing-lg)'}}>
                + Adicionar Modelo
              </Link>
            </div>
          </div>
        ) : (
          <div className="models-list-card">
            <div className="models-list-header">
              <p className="models-count">
                Total: <strong>{total}</strong> modelos
              </p>
            </div>

            <div className="models-table-container">
              <table className="models-table">
                <thead>
                  <tr>
                    <th>Foto</th>
                    <th>Nome</th>
                    <th>Categoria</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((model) => (
                    <tr key={model._id}>
                      <td>
                        <img
                          src={model.photos?.[0]?.thumbnail || model.photos?.[0]?.url || 'https://placehold.co/56x56?text=Foto'}
                          alt={model.name}
                          className="model-table-avatar"
                          onError={(e) => { e.currentTarget.src = 'https://placehold.co/56x56?text=Foto' }}
                        />
                      </td>
                      <td>
                        <div className="model-table-name">
                          <strong>{model.name}</strong>
                          <small>{model.email}</small>
                        </div>
                      </td>
                      <td>{model.category || '-'}</td>
                      <td>
                        <div className="model-table-status">
                          {model.active ? (
                            <span className="badge badge-success">Ativa</span>
                          ) : (
                            <span className="badge badge-error">Inativa</span>
                          )}
                          {model.verified && <span className="badge badge-gold">Verificada</span>}
                        </div>
                      </td>
                      <td>
                        <div className="model-table-actions">
                          <button className="btn btn-sm btn-outline" onClick={() => openDetails(model._id)}>
                            Ver
                          </button>
                          <Link className="btn btn-sm btn-outline" to={`/admin/models/${model._id}`}>
                            Dashboard
                          </Link>
                          <a className="btn btn-sm btn-primary" href={`/r/wa/${model._id}`} target="_blank" rel="noreferrer">
                            WhatsApp
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="models-pagination">
              <div className="pagination-info">
                Página {page} de {pages || 1}
              </div>
              <div className="pagination-controls">
                <button 
                  className="btn btn-outline btn-sm" 
                  disabled={page <= 1} 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                  </svg>
                  Anterior
                </button>
                <button 
                  className="btn btn-outline btn-sm" 
                  disabled={pages && page >= pages} 
                  onClick={() => setPage(p => p + 1)}
                >
                  Próxima
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedModel && (
        <ModelDetailsModal
          model={selectedModel}
          stats={modelStats}
          loading={detailsLoading}
          onClose={() => { setSelectedModel(null); setModelStats(null) }}
        />
      )}
    </div>
  )
}

function ModelDetailsModal({ model, stats, loading, onClose }) {
  return (
    <div className="model-details-modal" onClick={onClose}>
      <div className="modal-details-content" onClick={e => e.stopPropagation()}>
        <div className="modal-details-header">
          <h2>{model.name}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-details-body">
          <div className="modal-model-info">
            <p>
              <strong>Email</strong>
              <span>{model.email}</span>
            </p>
            <p>
              <strong>Telefone</strong>
              <span>{model.phone || 'Sem telefone'}</span>
            </p>
            <p>
              <strong>Categoria</strong>
              <span>{model.category || '-'}</span>
            </p>
            <p>
              <strong>Cidade</strong>
              <span>{model.city || '-'}</span>
            </p>
            <p>
              <strong>Status</strong>
              <span>
                {model.active ? 'Ativa' : 'Inativa'}
                {model.verified && ' • Verificada'}
              </span>
            </p>
          </div>

          <h3 style={{marginBottom: 'var(--spacing-md)'}}>Galeria</h3>
          {model.photos && model.photos.length > 0 ? (
            <div className="modal-photos-grid">
              {model.photos.slice(0, 6).map((photo, idx) => (
                <div key={idx} className="modal-photo">
                  <img src={photo.thumbnail || photo.url} alt={`${model.name} ${idx + 1}`} />
                </div>
              ))}
            </div>
          ) : (
            <p style={{color: 'var(--color-text-muted)'}}>Sem fotos disponíveis</p>
          )}

          <h3 style={{marginTop: 'var(--spacing-xl)', marginBottom: 'var(--spacing-md)'}}>Métricas (7 dias)</h3>
          {loading ? (
            <p>Carregando métricas...</p>
          ) : stats ? (
            <div className="modal-stats-grid">
              <div className="modal-stat">
                <strong>{stats?.totalStats?.profileViews ?? stats?.modelStats?.totalViews ?? 0}</strong>
                <span>Views</span>
              </div>
              <div className="modal-stat">
                <strong>{stats?.totalStats?.profileClicks ?? stats?.modelStats?.totalClicks ?? 0}</strong>
                <span>Clicks</span>
              </div>
              <div className="modal-stat">
                <strong>{stats?.totalStats?.phoneClicks ?? stats?.modelStats?.totalCalls ?? 0}</strong>
                <span>Chamadas</span>
              </div>
            </div>
          ) : (
            <p style={{color: 'var(--color-text-muted)'}}>Sem métricas disponíveis</p>
          )}

          <div className="modal-actions">
            <button className="btn btn-outline" onClick={onClose}>Fechar</button>
            <Link className="btn btn-secondary" to={`/admin/models/${model._id}`}>
              Ir para Dashboard
            </Link>
            <a className="btn btn-primary" href={`/r/wa/${model._id}`} target="_blank" rel="noreferrer">
              Contactar WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminModelsPage
