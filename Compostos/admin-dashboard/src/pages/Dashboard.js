import React from 'react';
import { useQuery } from 'react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import api from '../services/api';
import { Users, DollarSign, TrendingUp, Activity } from 'lucide-react';

const Dashboard = () => {
  const { data: stats, isLoading: statsLoading } = useQuery('adminStats', async () => {
    const response = await api.get('/admin/dashboard');
    return response.data;
  });

  const { data: growthData, isLoading: growthLoading } = useQuery('growthStats', async () => {
    const response = await api.get('/admin/growth-stats');
    return response.data;
  });

  if (statsLoading || growthLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total de Usuários',
      value: stats?.users?.total || 0,
      change: `+${stats?.users?.newToday || 0} hoje`,
      icon: Users,
      color: 'blue'
    },
    {
      title: 'Usuários Ativos',
      value: stats?.users?.active || 0,
      change: `${stats?.users?.total ? Math.round((stats.users.active / stats.users.total) * 100) : 0}% do total`,
      icon: Activity,
      color: 'green'
    },
    {
      title: 'Investimentos Ativos',
      value: stats?.financial?.activeInvestments || 0,
      change: `€ ${(stats?.financial?.totalInvestmentAmount || 0).toLocaleString('de-DE')}`,
      icon: DollarSign,
      color: 'purple'
    },
    {
      title: 'Volume de Transações',
      value: stats?.financial?.totalTransactions || 0,
      change: `€ ${(stats?.financial?.totalTransactionVolume || 0).toLocaleString('de-DE')}`,
      icon: TrendingUp,
      color: 'orange'
    }
  ];

  return (
    <div>
      <div className="stats-grid">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="stat-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3>{card.title}</h3>
                <Icon style={{ color: `var(--${card.color}-color)`, opacity: 0.7 }} />
              </div>
              <div className="value">{card.value.toLocaleString('pt-BR')}</div>
              <div className={`change text-${card.color}`}>{card.change}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
        {/* Gráfico de Novos Usuários */}
        <div className="card">
          <h3>Novos Usuários (Últimos 30 dias)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={growthData?.users || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="_id" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Investimentos */}
        <div className="card">
          <h3>Investimentos (Últimos 30 dias)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={growthData?.investments || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="_id" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="totalAmount" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Estatísticas de Tarefas e Indicações */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
        <div className="card">
          <h3>Estatísticas de Tarefas</h3>
          <div style={{ padding: '1rem 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span>Total de Tarefas:</span>
              <strong>{stats?.tasks?.total || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span>Tarefas Completadas:</span>
              <strong>{stats?.tasks?.completed || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Taxa de Conclusão:</span>
              <strong>{stats?.tasks?.completionRate?.toFixed(1) || 0}%</strong>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Estatísticas de Indicações</h3>
          <div style={{ padding: '1rem 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span>Total de Indicações:</span>
              <strong>{stats?.referrals?.total || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Ganhos Totais:</span>
              <strong>€ {(stats?.referrals?.totalEarnings || 0).toLocaleString('de-DE')}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;