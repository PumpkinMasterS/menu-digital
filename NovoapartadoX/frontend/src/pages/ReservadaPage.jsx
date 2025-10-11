import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import UploadWidget from '../components/UploadWidget';
import ModelAccountForm from '../components/ModelAccountForm';
import StatsPanel from '../components/StatsPanel';
import axios from 'axios'
import { useNavigate } from 'react-router-dom';

export default function ReservadaPage() {
  const { user, token, setUser } = useAuth();
  const [stats, setStats] = useState({ views: 0, clicks: 0, calls: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [models, setModels] = useState([]);
  const navigate = useNavigate();

  // Redirecionar se não estiver autenticado
  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
  }, [token, navigate]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('/api/stats/my-stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        setLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  const StatCard = ({ title, value, icon, color }) => (
    <div className="stat-card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <h3>{title}</h3>
        <p className="stat-value">
          {loading ? '...' : (value !== undefined && value !== null ? value.toLocaleString() : '0')}
        </p>
      </div>
    </div>
  );

  // Carregar lista de modelos quando a aba 'models' estiver ativa
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await axios.get('/api/admin/models', {
          headers: { Authorization: `Bearer ${token}` }
        })
        setModels(res.data?.models || [])
      } catch (err) {
        console.error('Erro ao carregar modelos:', err)
      }
    }
    if (user?.role === 'admin' && activeTab === 'models') {
      fetchModels()
    }
  }, [activeTab, user, token])

  const handleAvatarUploaded = async (info) => {
    try {
      const imageUrl = info.secure_url || info.url
      if (!imageUrl || !user?.id && !user?._id) return
      const userId = user.id || user._id
      const { data } = await axios.patch(`/api/users/${userId}`, { avatar: imageUrl }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (data?.user) setUser(data.user)
    } catch (e) {
      console.error('Falha ao atualizar avatar', e)
      alert('Não foi possível atualizar o avatar. Tente novamente.')
    }
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Área Reservada</h1>
        <p>Bem-vindo(a), {user?.name || user?.email || 'Utilizador'}!</p>
      </div>

      {user?.role === 'admin' ? (
        <>
          {/* Navegação por tabs */}
          <div className="dashboard-tabs">
            <button 
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              📊 Visão Geral
            </button>
            <button 
              className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              📈 Estatísticas
            </button>
            <button 
              className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              👤 Perfil
            </button>
          <button 
              className={`tab-btn ${activeTab === 'content' ? 'active' : ''}`}
              onClick={() => setActiveTab('content')}
            >
              🎬 Conteúdos
            </button>
            {/* Aba de Modelos (apenas admin) */}
            <button 
              className={`tab-btn ${activeTab === 'models' ? 'active' : ''}`}
              onClick={() => setActiveTab('models')}
            >
              👩‍💼 Modelos
            </button>
          </div>

          {/* Conteúdo das tabs */}
          <div className="dashboard-content">
            {activeTab === 'overview' && (
              <div className="stats-grid">
                <StatCard 
                  title="Visualizações" 
                  value={stats.views} 
                  icon="👁️" 
                  color="#667eea"
                />
                <StatCard 
                  title="Cliques" 
                  value={stats.clicks} 
                  icon="🖱️" 
                  color="#f093fb"
                />
                <StatCard 
                  title="Chamadas" 
                  value={stats.calls} 
                  icon="📞" 
                  color="#4facfe"
                />
                <StatCard 
                  title="Favoritos" 
                  value={Math.floor(stats.clicks * 0.3)} 
                  icon="❤️" 
                  color="#ff6b6b"
                />
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="stats-detail">
                <h3>Estatísticas Detalhadas</h3>
                <div className="chart-placeholder">
                  <p>📈 Gráficos de desempenho em desenvolvimento...</p>
                  <p>Visualize o desempenho do seu perfil ao longo do tempo.</p>
                </div>
                
                <div className="stats-table">
                  <h4>Últimos 7 Dias</h4>
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Visualizações</th>
                        <th>Cliques</th>
                        <th>Taxa de Conversão</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...Array(7)].map((_, i) => (
                        <tr key={i}>
                          <td>{new Date(Date.now() - (6-i)*86400000).toLocaleDateString()}</td>
                          <td>{Math.floor(stats.views / 7 * (0.8 + Math.random()*0.4))}</td>
                          <td>{Math.floor(stats.clicks / 7 * (0.8 + Math.random()*0.4))}</td>
                          <td>{Math.floor((Math.random() * 15) + 5)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="profile-layout">
                <div className="profile-editor">
                  <h3>Editar Perfil</h3>
                  <form className="profile-form">
                    <div className="form-section">
                      <div className="form-section-title">Informações Básicas</div>
                      <div className="form-group">
                        <label>Nome</label>
                        <input type="text" defaultValue={user?.name || ''} />
                        <div className="hint-text">O seu nome público exibido no perfil.</div>
                      </div>
                      <div className="form-group">
                        <label>Email</label>
                        <input type="email" defaultValue={user?.email || ''} />
                        <div className="hint-text">Utilizado para autenticação e notificações.</div>
                      </div>
                      <div className="form-group">
                        <label>Telefone</label>
                        <input type="tel" placeholder="+351 XXX XXX XXX" />
                      </div>
                      <div className="form-group">
                        <label>Cidade</label>
                        <select>
                          <option>Lisboa</option>
                          <option>Porto</option>
                          <option>Outra</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-section">
                      <div className="form-section-title">Sobre</div>
                      <div className="form-group">
                        <label>Descrição</label>
                        <textarea placeholder="Descreva os seus serviços..." rows="4"></textarea>
                        <div className="hint-text">Dê destaque aos seus diferenciais (máx. 300 caracteres).</div>
                      </div>
                    </div>

                    <div className="form-actions">
                      <button type="button" className="btn btn-outline">Cancelar</button>
                      <button type="submit" className="btn btn-primary">Guardar Alterações</button>
                    </div>
                  </form>
                </div>

                <aside className="profile-aside">
                  <div className="profile-card">
                    <div className="avatar-uploader">
                      <div className="avatar">
                        {user?.avatar ? (
                          <img src={user.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                        ) : (
                          user?.name ? user.name.charAt(0).toUpperCase() : '👤'
                        )}
                      </div>
                      <UploadWidget label="Alterar Foto" className="btn btn-outline" onUploadSuccess={handleAvatarUploaded} />
                      <p className="hint-text">PNG ou JPG até 2MB</p>
                    </div>
                  </div>

                  <div className="profile-card">
                    <h4 style={{marginTop:0}}>Estado da Conta</h4>
                    <p><span className="badge badge-success">Ativa</span></p>
                    <p className="hint-text">Mantenha o seu perfil atualizado para melhorar a visibilidade nas listagens.</p>
                  </div>

                  <div className="profile-card">
                    <h4 style={{marginTop:0}}>Dicas Rápidas</h4>
                    <ul className="hint-list">
                      <li>Use uma foto de perfil clara e profissional.</li>
                      <li>Complete todos os campos para aumentar a confiança.</li>
                      <li>Mantenha a descrição objetiva e sem informações de contato.</li>
                    </ul>
                  </div>
                </aside>
              </div>
            )}

            {activeTab === 'content' && (
              <div className="content-manager">
                <h3>Gerir Conteúdos</h3>
                <div className="content-actions">
                  <button className="btn">➕ Adicionar Novo Conteúdo</button>
                  <button className="btn btn-outline">📸 Upload de Fotos</button>
                  <button className="btn btn-outline">🎥 Upload de Vídeos</button>
                </div>
                
                <div className="content-list">
                  <h4>Seus Conteúdos</h4>
                  <div className="empty-state">
                    <p>🎬 Ainda não tem conteúdos publicados.</p>
                    <p>Comece por adicionar o seu primeiro conteúdo!</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'models' && (
              <div className="models-list">
                <h3>Gestão de Modelos</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {models.map(model => (
                      <tr key={model._id}>
                        <td>{model.name}</td>
                        <td>
                          <button onClick={() => navigate(`/admin/models/${model._id}`)}>Editar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Funcionalidades de admin (mantidas) */}
          <div style={{marginTop: '2rem', padding: '1.5rem', border: '1px solid #e0e0e0', borderRadius: '8px'}}>
            <h3>🔧 Ferramentas de Administração</h3>
            <UploadWidget />
            <ModelAccountForm />
            <StatsPanel />
          </div>
        </>
      ) : user?.role === 'model' ? (
        <>
          <div className="stats-grid">
            <StatCard 
              title="Visualizações" 
              value={stats.views} 
              icon="👁️" 
              color="#667eea"
            />
            <StatCard 
              title="Cliques" 
              value={stats.clicks} 
              icon="🖱️" 
              color="#f093fb"
            />
            <StatCard 
              title="Chamadas" 
              value={stats.calls} 
              icon="📞" 
              color="#4facfe"
            />
            <StatCard 
              title="Favoritos" 
              value={Math.floor(stats.clicks * 0.3)} 
              icon="❤️" 
              color="#ff6b6b"
            />
          </div>

          {/* Editor rápido para modelo: avatar e atalho para edição completa */}
          <div style={{marginTop: '2rem', display: 'flex', gap: '1rem', alignItems: 'center'}}>
            <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
              <div style={{width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', background: '#f5f5f5', display:'flex', alignItems:'center', justifyContent:'center', fontSize: 32}}>
                {user?.avatar ? (
                  <img src={user.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  (user?.name ? user.name.charAt(0).toUpperCase() : '👤')
                )}
              </div>
              <UploadWidget label="Alterar Foto" className="btn btn-outline" onUploadSuccess={handleAvatarUploaded} />
            </div>
            <button className="btn" onClick={() => navigate('/editar-perfil')}>Editar perfil completo</button>
          </div>
        </>
      ) : (
        <p>Acesso não autorizado.</p>
      )}
    </div>
  );
}