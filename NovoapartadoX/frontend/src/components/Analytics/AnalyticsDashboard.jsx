import React, { useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { 
  FiUsers, 
  FiEye, 
  FiMousePointer, 
  FiPhone, 
  FiSearch,
  FiTrendingUp,
  FiTrendingDown,
  FiDownload,
  FiRefreshCw
} from 'react-icons/fi'

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

const AnalyticsDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedPeriod, setSelectedPeriod] = useState('7days')
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Buscar dados do dashboard
  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/analytics/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Erro ao carregar dados do dashboard')
      }
      
      const data = await response.json()
      setDashboardData(data.data)
      setError(null)
    } catch (err) {
      setError(err.message)
      console.error('Erro ao carregar dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  // Atualização automática
  useEffect(() => {
    fetchDashboardData()
    
    let interval
    if (autoRefresh) {
      interval = setInterval(fetchDashboardData, 60000) // Atualizar a cada minuto
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh])

  // Calcular variação percentual
  const calculatePercentageChange = (current, previous) => {
    if (!previous || previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  // Formatar números
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num?.toString() || '0'
  }

  // Componente de métrica
  const MetricCard = ({ title, value, previousValue, icon: Icon, color = 'blue' }) => {
    const change = calculatePercentageChange(value, previousValue)
    const isPositive = change >= 0
    
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4" style={{ borderLeftColor: color }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(value)}</p>
            {previousValue !== undefined && (
              <div className={`flex items-center mt-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? <FiTrendingUp className="mr-1" /> : <FiTrendingDown className="mr-1" />}
                {Math.abs(change).toFixed(1)}% vs ontem
              </div>
            )}
          </div>
          <div className="p-3 rounded-full" style={{ backgroundColor: `${color}20` }}>
            <Icon className="w-6 h-6" style={{ color }} />
          </div>
        </div>
      </div>
    )
  }

  // Configuração dos gráficos
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  }

  // Dados do gráfico de tendências
  const trendsChartData = dashboardData?.trends ? {
    labels: dashboardData.trends.pageViews.map(item => 
      new Date(item.date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })
    ),
    datasets: [
      {
        label: 'Visualizações',
        data: dashboardData.trends.pageViews.map(item => item.value),
        borderColor: '#3B82F6',
        backgroundColor: '#3B82F620',
        tension: 0.4,
      },
      {
        label: 'Visitantes Únicos',
        data: dashboardData.trends.uniqueVisitors.map(item => item.value),
        borderColor: '#10B981',
        backgroundColor: '#10B98120',
        tension: 0.4,
      },
    ],
  } : null

  // Dados do gráfico de dispositivos
  const devicesChartData = dashboardData?.audience?.devices ? {
    labels: ['Desktop', 'Mobile', 'Tablet'],
    datasets: [
      {
        data: [
          dashboardData.audience.devices.desktop,
          dashboardData.audience.devices.mobile,
          dashboardData.audience.devices.tablet,
        ],
        backgroundColor: ['#3B82F6', '#10B981', '#F59E0B'],
        borderWidth: 0,
      },
    ],
  } : null

  // Exportar dados
  const exportData = async (format = 'json') => {
    try {
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const response = await fetch(`/api/analytics/export?startDate=${startDate}&endDate=${endDate}&format=${format}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (format === 'csv') {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `analytics-${startDate}-${endDate}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `analytics-${startDate}-${endDate}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Erro ao exportar dados:', error)
    }
  }

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Erro ao carregar dados</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              onClick={fetchDashboardData}
              className="mt-2 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    )
  }

  const realTime = dashboardData?.realTime || {}
  const today = dashboardData?.today || {}
  const yesterday = dashboardData?.yesterday || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Acompanhe o desempenho da sua plataforma em tempo real</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
              autoRefresh 
                ? 'bg-green-100 text-green-700 border border-green-200' 
                : 'bg-gray-100 text-gray-700 border border-gray-200'
            }`}
          >
            <FiRefreshCw className={`mr-2 w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </button>
          <div className="relative">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7days">Últimos 7 dias</option>
              <option value="30days">Últimos 30 dias</option>
              <option value="90days">Últimos 90 dias</option>
            </select>
          </div>
          <button
            onClick={() => exportData('csv')}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <FiDownload className="mr-2 w-4 h-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Métricas em tempo real */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <h2 className="text-lg font-semibold mb-4">Métricas em Tempo Real (Hoje)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{formatNumber(realTime.pageViews)}</div>
            <div className="text-sm opacity-90">Visualizações</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{formatNumber(realTime.listingViews)}</div>
            <div className="text-sm opacity-90">Anúncios Vistos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{formatNumber(realTime.phoneClicks)}</div>
            <div className="text-sm opacity-90">Contatos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{formatNumber(realTime.searches)}</div>
            <div className="text-sm opacity-90">Buscas</div>
          </div>
        </div>
      </div>

      {/* Cards de métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Visualizações de Página"
          value={today.totalPageViews}
          previousValue={yesterday.totalPageViews}
          icon={FiEye}
          color="#3B82F6"
        />
        <MetricCard
          title="Visitantes Únicos"
          value={today.uniqueVisitors}
          previousValue={yesterday.uniqueVisitors}
          icon={FiUsers}
          color="#10B981"
        />
        <MetricCard
          title="Cliques em Anúncios"
          value={today.totalListingClicks}
          previousValue={yesterday.totalListingClicks}
          icon={FiMousePointer}
          color="#F59E0B"
        />
        <MetricCard
          title="Contatos por Telefone"
          value={today.totalPhoneClicks}
          previousValue={yesterday.totalPhoneClicks}
          icon={FiPhone}
          color="#EF4444"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de tendências */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Tendências (Últimos 7 dias)</h3>
          {trendsChartData ? (
            <div className="h-64">
              <Line data={trendsChartData} options={chartOptions} />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Carregando dados...
            </div>
          )}
        </div>

        {/* Gráfico de dispositivos */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Dispositivos</h3>
          {devicesChartData ? (
            <div className="h-64">
              <Doughnut 
                data={devicesChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                  },
                }}
              />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Carregando dados...
            </div>
          )}
        </div>
      </div>

      {/* Tabelas de top content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top páginas */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Páginas Mais Visitadas</h3>
          <div className="space-y-3">
            {dashboardData?.topContent?.pages?.slice(0, 5).map((page, index) => (
              <div key={index} className="flex justify-between items-center">
                <div className="flex-1 truncate">
                  <span className="text-sm text-gray-900">{page.page}</span>
                </div>
                <span className="text-sm font-medium text-gray-600">{page.views}</span>
              </div>
            )) || (
              <div className="text-gray-500 text-sm">Nenhum dado disponível</div>
            )}
          </div>
        </div>

        {/* Top buscas */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Buscas Mais Populares</h3>
          <div className="space-y-3">
            {dashboardData?.topContent?.searches?.slice(0, 5).map((search, index) => (
              <div key={index} className="flex justify-between items-center">
                <div className="flex-1 truncate">
                  <span className="text-sm text-gray-900">{search.query}</span>
                </div>
                <span className="text-sm font-medium text-gray-600">{search.count}</span>
              </div>
            )) || (
              <div className="text-gray-500 text-sm">Nenhum dado disponível</div>
            )}
          </div>
        </div>

        {/* Top browsers */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Navegadores</h3>
          <div className="space-y-3">
            {dashboardData?.audience?.browsers?.slice(0, 5).map((browser, index) => (
              <div key={index} className="flex justify-between items-center">
                <div className="flex-1 truncate">
                  <span className="text-sm text-gray-900">{browser.name}</span>
                </div>
                <span className="text-sm font-medium text-gray-600">{browser.count}</span>
              </div>
            )) || (
              <div className="text-gray-500 text-sm">Nenhum dado disponível</div>
            )}
          </div>
        </div>
      </div>

      {/* Métricas de conversão */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Métricas de Conversão</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {today.conversionRate?.toFixed(2) || '0.00'}%
            </div>
            <div className="text-sm text-gray-600">Taxa de Conversão</div>
            <div className="text-xs text-gray-500 mt-1">
              (Contatos / Visualizações)
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {today.averageResponseTime?.toFixed(0) || '0'}ms
            </div>
            <div className="text-sm text-gray-600">Tempo de Resposta</div>
            <div className="text-xs text-gray-500 mt-1">
              Média das APIs
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {((today.apiErrors / (today.apiCalls || 1)) * 100).toFixed(2) || '0.00'}%
            </div>
            <div className="text-sm text-gray-600">Taxa de Erro</div>
            <div className="text-xs text-gray-500 mt-1">
              Erros / Total de Chamadas
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsDashboard