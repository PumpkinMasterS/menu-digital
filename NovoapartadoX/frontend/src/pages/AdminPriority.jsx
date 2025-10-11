import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

function AdminPriorityPage() {
  const { token, user } = useAuth()
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (!user || user.role !== 'admin') return
    const fetchConfig = async () => {
      try {
        setLoading(true)
        const res = await axios.get('/api/admin/priority-config', {
          headers: { Authorization: `Bearer ${token}` }
        })
        setConfig(res.data)
      } catch (err) {
        console.error('Erro ao carregar configuração de prioridade:', err)
        setError('Não foi possível carregar a configuração. Tente novamente.')
      } finally {
        setLoading(false)
      }
    }
    fetchConfig()
  }, [token, user])

  const updateField = (path, value) => {
    setConfig(prev => {
      if (!prev) return prev
      const next = { ...prev }
      const keys = path.split('.')
      let obj = next
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i]
        obj[k] = { ...(obj[k] || {}) }
        obj = obj[k]
      }
      obj[keys[keys.length - 1]] = value
      return next
    })
  }

  const saveConfig = async () => {
    if (!config) return
    try {
      setSaving(true)
      setMessage(null)
      setError(null)
      await axios.put('/api/admin/priority-config', config, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      setMessage('Configuração salva com sucesso.')
    } catch (err) {
      console.error('Erro ao salvar configuração de prioridade:', err)
      setError('Falha ao salvar. Verifique os valores e tente novamente.')
    } finally {
      setSaving(false)
    }
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

  if (loading) return <div className="dashboard-loading"><div className="loading-spinner"></div><p>Carregando configuração de prioridade...</p></div>
  if (error) return <div className="error-box">{error}</div>
  if (!config) return <p>Nenhuma configuração disponível.</p>

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Configuração de Prioridade</h1>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={saveConfig} disabled={saving}>
            {saving ? 'A guardar...' : 'Guardar Configuração'}
          </button>
        </div>
      </div>

      <div className="priority-sections">
        <section className="priority-section">
          <h3>Tempo</h3>
          <p>Perfis antigos ganham pontos extra diariamente até um limite.</p>
          <div className="form-grid">
            <label>
              Crescimento por dia
              <input type="number" step="0.1" value={config.timeGrowthPerDay || 0} onChange={e => updateField('timeGrowthPerDay', Number(e.target.value))} />
            </label>
            <label>
              Bónus máximo de tempo
              <input type="number" step="1" value={config.timeMaxBoost || 0} onChange={e => updateField('timeMaxBoost', Number(e.target.value))} />
            </label>
          </div>
        </section>

        <section className="priority-section">
          <h3>Bónus de Destaque e Atividade</h3>
          <p>Perfis destacados e ativos recebem bónus adicionais.</p>
          <div className="form-grid">
            <label>
              Bónus de destaque
              <input type="number" step="1" value={config.featuredBoost || 0} onChange={e => updateField('featuredBoost', Number(e.target.value))} />
            </label>
            <label>
              Bónus de ativo
              <input type="number" step="1" value={config.activeBoost || 0} onChange={e => updateField('activeBoost', Number(e.target.value))} />
            </label>
          </div>
        </section>

        <section className="priority-section">
          <h3>Estatísticas</h3>
          <p>Converte métricas de engajamento em pontos de prioridade.</p>
          <div className="form-grid">
            <label>
              Views por ponto
              <input type="number" step="1" value={config.stats?.viewsPerPoint || 0} onChange={e => updateField('stats.viewsPerPoint', Number(e.target.value))} />
            </label>
            <label>
              Likes por ponto
              <input type="number" step="1" value={config.stats?.likesPerPoint || 0} onChange={e => updateField('stats.likesPerPoint', Number(e.target.value))} />
            </label>
            <label>
              Chamadas por ponto
              <input type="number" step="1" value={config.stats?.callsPerPoint || 0} onChange={e => updateField('stats.callsPerPoint', Number(e.target.value))} />
            </label>
            <label>
              Multiplicador de engajamento
              <input type="number" step="0.1" value={config.stats?.engagementMultiplier || 1} onChange={e => updateField('stats.engagementMultiplier', Number(e.target.value))} />
            </label>
          </div>
        </section>

        <section className="priority-section">
          <h3>Conteúdo</h3>
          <p>Quantidade e qualidade das fotos impactam o score.</p>
          <div className="form-grid">
            <label>
              Peso por foto
              <input type="number" step="1" value={config.content?.photoWeight || 0} onChange={e => updateField('content.photoWeight', Number(e.target.value))} />
            </label>
            <label>
              Peso máximo de fotos
              <input type="number" step="1" value={config.content?.maxPhotosWeight || 0} onChange={e => updateField('content.maxPhotosWeight', Number(e.target.value))} />
            </label>
            <label>
              Bónus foto principal
              <input type="number" step="1" value={config.content?.primaryPhotoBonus || 0} onChange={e => updateField('content.primaryPhotoBonus', Number(e.target.value))} />
            </label>
          </div>
        </section>

        <section className="priority-section">
          <h3>Completude do Perfil</h3>
          <p>Campos preenchidos aumentam a prioridade. Defina mínimos.</p>
          <div className="form-grid">
            <label>
              Nome
              <input type="number" step="1" value={config.completeness?.name || 0} onChange={e => updateField('completeness.name', Number(e.target.value))} />
            </label>
            <label>
              Bio
              <input type="number" step="1" value={config.completeness?.bio || 0} onChange={e => updateField('completeness.bio', Number(e.target.value))} />
            </label>
            <label>
              Tamanho mínimo da bio
              <input type="number" step="1" value={config.completeness?.bioMinLength || 0} onChange={e => updateField('completeness.bioMinLength', Number(e.target.value))} />
            </label>
            <label>
              Telefone
              <input type="number" step="1" value={config.completeness?.phone || 0} onChange={e => updateField('completeness.phone', Number(e.target.value))} />
            </label>
            <label>
              Redes sociais
              <input type="number" step="1" value={config.completeness?.social || 0} onChange={e => updateField('completeness.social', Number(e.target.value))} />
            </label>
            <label>
              Fotos
              <input type="number" step="1" value={config.completeness?.photos || 0} onChange={e => updateField('completeness.photos', Number(e.target.value))} />
            </label>
            <label>
              Mínimo de fotos
              <input type="number" step="1" value={config.completeness?.photosMinCount || 0} onChange={e => updateField('completeness.photosMinCount', Number(e.target.value))} />
            </label>
          </div>
        </section>

        <section className="priority-section">
          <h3>Atualização Recente</h3>
          <p>Perfis atualizados recentemente recebem um bónus temporário.</p>
          <div className="form-grid">
            <label>
              Janela de dias
              <input type="number" step="1" value={config.recentUpdateBonusDays || 0} onChange={e => updateField('recentUpdateBonusDays', Number(e.target.value))} />
            </label>
            <label>
              Bónus de atualização
              <input type="number" step="1" value={config.recentUpdateBonus || 0} onChange={e => updateField('recentUpdateBonus', Number(e.target.value))} />
            </label>
          </div>
        </section>
      </div>

      <div className="priority-help" style={{ marginTop: 16 }}>
        <h3>Como funciona</h3>
        <ul>
          <li>Tempo: cada dia adiciona pontos até atingir o limite máximo.</li>
          <li>Destaque/Ativo: perfis destacados e ativos ganham bónus fixos.</li>
          <li>Estatísticas: views, likes e chamadas convertem-se em pontos via razão por ponto.</li>
          <li>Conteúdo: mais fotos e uma foto principal aumentam o score até o teto definido.</li>
          <li>Completude: nome, bio, telefone, redes sociais e fotos geram pontos quando presentes.</li>
          <li>Atualização recente: alterações nos últimos dias recebem bónus adicional.</li>
        </ul>
      </div>
    </div>
  )
}

export default AdminPriorityPage