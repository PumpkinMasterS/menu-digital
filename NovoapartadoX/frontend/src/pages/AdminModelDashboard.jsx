import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import MultiPhotoUploader from '../components/MultiPhotoUploader'
import './AdminModelDashboard.css'

function AdminModelDashboard() {
  const { id } = useParams()
  const { token, user } = useAuth()
  const [model, setModel] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({})
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (!user || user.role !== 'admin') return
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id])

  useEffect(() => {
    if (model) {
      setFormData({
        name: model.name,
        email: model.email,
        phone: model.phone || '',
        category: model.category || '',
        city: model.city || '',
        about: model.bio || '',
        nationality: model.nationality || '',
        eyeColor: model.eyeColor || '',
        age: model.age ?? '',
        height: model.height ?? '',
        weight: model.weight ?? '',
        active: model.active,
        verified: model.verified
      })
    }
  }, [model])

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setFormData({ ...formData, [e.target.name]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...formData }
      if (payload.about !== undefined) {
        payload.bio = payload.about
      }
      if (typeof payload.age === 'string' && payload.age !== '') {
        const n = parseInt(payload.age, 10)
        if (!Number.isNaN(n)) payload.age = n
      }
      if (typeof payload.height === 'string' && payload.height !== '') {
        const h = parseFloat(String(payload.height).replace(',', '.'))
        if (!Number.isNaN(h)) payload.height = h
      }
      if (typeof payload.weight === 'string' && payload.weight !== '') {
        const w = parseFloat(payload.weight)
        if (!Number.isNaN(w)) payload.weight = w
      }

      await axios.put(`/api/models/${id}`, payload, { headers })
      setEditMode(false)
      fetchData()
    } catch (err) {
      setError('Erro ao atualizar perfil: ' + (err.response?.data?.message || err.message))
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('Buscando dados do modelo:', id)
      const [detailsRes, statsRes] = await Promise.all([
        axios.get(`/api/admin/models/${id}`, { headers }),
        axios.get(`/api/models/${id}/stats`, { params: { days: 7 }, headers })
      ])
      console.log('Dados do modelo recebidos:', detailsRes.data)
      console.log('Fotos do modelo:', detailsRes.data.photos)
      setModel(detailsRes.data)
      setStats(statsRes.data)
    } catch (err) {
      console.error('Erro ao carregar dashboard da modelo:', err)
      setError('Falha ao carregar dados do perfil da modelo')
    } finally {
      setLoading(false)
    }
  }

  // Função para construir URL completa da imagem
  const getImageUrl = (photo) => {
    if (!photo) return ''
    // Se a URL já for completa, retorna como está
    if (photo.url && (photo.url.startsWith('http') || photo.url.startsWith('data:'))) {
      return photo.url
    }
    // Caso contrário, constrói a URL completa
    const baseUrl = photo.url || photo.thumbnail || ''
    return baseUrl.startsWith('/') ? `http://localhost:4000${baseUrl}` : baseUrl
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="admin-model-dashboard">
        <div className="model-dashboard-loading">
        <h2>Acesso restrito</h2>
        <p>Esta página é apenas para administradores.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="admin-model-dashboard">
        <div className="model-dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Carregando dados...</p>
        </div>
      </div>
    )
  }

  if (!model) {
    return (
      <div className="admin-model-dashboard">
        <div className="model-dashboard-loading">
          <p>Modelo não encontrada</p>
          <Link to="/admin/models" className="btn btn-primary">Voltar</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-model-dashboard">
      <nav className="breadcrumb">
        <Link to="/admin">Admin</Link>
        <span>/</span>
        <Link to="/admin/models">Modelos</Link>
        <span>/</span>
        <span>{model.name}</span>
      </nav>

      <div className="model-dashboard-header">
        <div className="model-dashboard-header-content">
          <div className="model-header-top">
        <h1>Perfil da Modelo</h1>
            <div className="model-header-actions">
              <button className="btn btn-outline btn-sm" onClick={fetchData} disabled={loading}>
                Atualizar
          </button>
              <Link className="btn btn-secondary btn-sm" to={`/reset-password/${model._id}`}>
                Redefinir Password
              </Link>
        </div>
      </div>

          <div className="model-profile-section">
            <img
              src={model.photos?.[0]?.thumbnail || model.photos?.[0]?.url || 'https://placehold.co/120x120?text=Foto'}
              alt={model.name}
              className="model-avatar-large"
              onError={(e) => { e.currentTarget.src = 'https://placehold.co/120x120?text=Foto' }}
            />
            <div className="model-header-info">
              <h2>{model.name}</h2>
              <div className="model-meta">
                <div className="model-meta-item">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                  </svg>
                  {model.email}
                </div>
                <div className="model-meta-item">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                  </svg>
                  {model.phone || 'Sem telefone'}
                </div>
                <div className="model-meta-item">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  {model.city || 'Não especificada'}
                </div>
              </div>
              <div className="model-badges">
                {model.active ? (
                  <span className="badge badge-success">Ativa</span>
                ) : (
                  <span className="badge badge-error">Inativa</span>
                )}
                {model.verified && <span className="badge badge-gold">Verificada</span>}
                <span className="badge">{model.category || 'Sem categoria'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="model-dashboard-content">
          <div className="model-dashboard-error">{error}</div>
        </div>
      )}

      <div className="model-dashboard-content">
        <div className="model-tabs">
          <button
            className={activeTab === 'overview' ? 'model-tab model-tab-active' : 'model-tab'}
            onClick={() => setActiveTab('overview')}
          >
            Visão Geral
          </button>
          <button
            className={activeTab === 'gallery' ? 'model-tab model-tab-active' : 'model-tab'}
            onClick={() => setActiveTab('gallery')}
          >
            Galeria
          </button>
          <button
            className={activeTab === 'info' ? 'model-tab model-tab-active' : 'model-tab'}
            onClick={() => setActiveTab('info')}
          >
            Informações
          </button>
        </div>

        {activeTab === 'overview' && (
          <>
            <div className="model-stats-grid">
              <div className="model-stat-card">
                <div className="model-stat-header">
                  <div className="model-stat-icon">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                  </div>
                  <div className="model-stat-label">Views</div>
                </div>
                <p className="model-stat-value">{stats?.totalStats?.profileViews ?? stats?.modelStats?.totalViews ?? 0}</p>
              </div>

              <div className="model-stat-card">
                <div className="model-stat-header">
                  <div className="model-stat-icon">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                      <path d="M7 10l5 5 5-5z"/>
                    </svg>
                  </div>
                  <div className="model-stat-label">Clicks</div>
                </div>
                <p className="model-stat-value">{stats?.totalStats?.profileClicks ?? stats?.modelStats?.totalClicks ?? 0}</p>
              </div>

              <div className="model-stat-card">
                <div className="model-stat-header">
                  <div className="model-stat-icon">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                    </svg>
                  </div>
                  <div className="model-stat-label">Chamadas</div>
                </div>
                <p className="model-stat-value">{stats?.totalStats?.phoneClicks ?? stats?.modelStats?.totalCalls ?? 0}</p>
              </div>
            </div>

            <div className="model-quick-actions">
              <div className="quick-actions-header">
                <h3>Ações Rápidas</h3>
              </div>
              <div className="quick-actions-grid">
                <Link to="/admin/models" className="btn btn-outline">Voltar à lista</Link>
                <Link to={`/reset-password/${model._id}`} className="btn btn-outline">Redefinir Password</Link>
                <a href={`/r/wa/${model._id}`} target="_blank" rel="noreferrer" className="btn btn-primary">
                  Contactar WhatsApp
                </a>
              </div>
            </div>
          </>
        )}

        {activeTab === 'gallery' && (
          <div className="model-gallery-section">
            <div className="gallery-header">
              <h3>Galeria de Fotos</h3>
              <span className="badge">{model.photos?.length || 0} fotos</span>
            </div>

            <div className="gallery-uploader">
            <MultiPhotoUploader modelId={id} onUploaded={fetchData} />
            </div>

            {model.photos && model.photos.length > 0 ? (
              <div className="gallery-grid">
                {model.photos.map((photo, idx) => (
                  <div key={idx} className="gallery-item">
                    <img src={getImageUrl(photo)} alt={`${model.name} ${idx + 1}`} />
                    <div className="gallery-item-overlay">
                      <div className="gallery-item-actions">
                        <button className="btn btn-sm btn-danger">
                          Remover
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="gallery-empty">
                <p>Nenhuma foto adicionada ainda</p>
              </div>
            )}
            </div>
        )}

        {activeTab === 'info' && (
          <div className="model-edit-section">
            <div className="edit-section-header">
              <h3>Informações da Modelo</h3>
              <button onClick={() => setEditMode(!editMode)} className="btn btn-primary">
                {editMode ? 'Cancelar' : 'Editar'}
              </button>
            </div>

            {editMode ? (
              <form onSubmit={handleSubmit} className="model-edit-form">
                <div className="form-group">
                    <label>Nome</label>
                    <input name="name" value={formData.name} onChange={handleChange} />
                  </div>
                <div className="form-group">
                    <label>Email</label>
                    <input name="email" value={formData.email} onChange={handleChange} />
                  </div>
                <div className="form-group">
                    <label>Telefone</label>
                    <input name="phone" value={formData.phone} onChange={handleChange} />
                  </div>
                <div className="form-group">
                    <label>Categoria</label>
                    <input name="category" value={formData.category} onChange={handleChange} />
                  </div>
                <div className="form-group">
                    <label>Cidade</label>
                    <select name="city" value={formData.city} onChange={handleChange}>
                      <option value="Lisboa">Lisboa</option>
                      <option value="Porto">Porto</option>
                      <option value="Outra">Outra</option>
                    </select>
                  </div>
                <div className="form-group">
                    <label>Nacionalidade</label>
                    <input name="nationality" value={formData.nationality} onChange={handleChange} placeholder="Ex.: 🇧🇷" />
                  </div>
                <div className="form-group">
                    <label>Olhos</label>
                    <select name="eyeColor" value={formData.eyeColor} onChange={handleChange}>
                      <option value="">Selecionar</option>
                      <option value="Castanhos">Castanhos</option>
                      <option value="Azuis">Azuis</option>
                      <option value="Verdes">Verdes</option>
                      <option value="Pretos">Pretos</option>
                      <option value="Mel">Mel</option>
                      <option value="Cinza">Cinza</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                <div className="form-group">
                    <label>Idade</label>
                    <input type="number" name="age" value={formData.age} onChange={handleChange} min={18} max={99} />
                  </div>
                <div className="form-group">
                    <label>Altura (m)</label>
                    <input name="height" value={formData.height} onChange={handleChange} placeholder="Ex.: 1,60" />
                  </div>
                <div className="form-group">
                    <label>Peso (kg)</label>
                    <input type="number" step="0.1" name="weight" value={formData.weight} onChange={handleChange} />
                  </div>
                <div className="form-group form-group-full">
                  <label>Sobre</label>
                  <textarea name="about" value={formData.about} onChange={handleChange} rows={4} />
                </div>
                <div className="form-group">
                  <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'none'}}>
                    <input type="checkbox" name="active" checked={formData.active} onChange={handleChange} style={{width: 'auto'}} />
                    Ativa
                  </label>
                  </div>
                <div className="form-group">
                  <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'none'}}>
                    <input type="checkbox" name="verified" checked={formData.verified} onChange={handleChange} style={{width: 'auto'}} />
                    Verificada
                  </label>
                  </div>
                <div className="form-group form-group-full">
                  <button type="submit" className="btn btn-primary">Salvar Alterações</button>
                </div>
              </form>
            ) : (
              <div className="model-info-display">
                <div className="info-item">
                  <strong>Nome</strong>
                  <span>{model.name}</span>
                </div>
                <div className="info-item">
                  <strong>Email</strong>
                  <span>{model.email}</span>
                </div>
                <div className="info-item">
                  <strong>Telefone</strong>
                  <span>{model.phone || '-'}</span>
                </div>
                <div className="info-item">
                  <strong>Categoria</strong>
                  <span>{model.category || '-'}</span>
                </div>
                <div className="info-item">
                  <strong>Cidade</strong>
                  <span>{model.city || '-'}</span>
                </div>
                <div className="info-item">
                  <strong>Nacionalidade</strong>
                  <span>{model.nationality || '-'}</span>
                </div>
                <div className="info-item">
                  <strong>Olhos</strong>
                  <span>{model.eyeColor || '-'}</span>
                </div>
                <div className="info-item">
                  <strong>Idade</strong>
                  <span>{model.age ?? '-'}</span>
                </div>
                <div className="info-item">
                  <strong>Altura</strong>
                  <span>{model.height ? `${String(model.height).replace('.', ',')} m` : '-'}</span>
                </div>
                <div className="info-item">
                  <strong>Peso</strong>
                  <span>{model.weight ? `${model.weight} kg` : '-'}</span>
                </div>
                <div className="info-item" style={{gridColumn: '1 / -1'}}>
                  <strong>Sobre</strong>
                  <span>{model.bio || '-'}</span>
                </div>
              </div>
            )}
        </div>
      )}
      </div>
    </div>
  )
}

export default AdminModelDashboard
