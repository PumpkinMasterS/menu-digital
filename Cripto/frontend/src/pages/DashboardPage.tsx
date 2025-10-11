import React, { useState, useEffect } from 'react';

interface MetricData {
  timestamp: number;
  value: number;
}

interface PnLData {
  date: string;
  value: number;
  trades: number;
}

interface PerformanceMetrics {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  dailyPnl: number;
  maxDrawdown: number;
  sharpeRatio: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  avgRR: number;
}

const DashboardPage: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'1d' | '7d' | '30d' | '90d'>('7d');
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [pnlData, setPnlData] = useState<PnLData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carrega dados do dashboard
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Busca estatísticas de trades
        const tradesResponse = await fetch('/trades/stats');
        if (tradesResponse.ok) {
          const tradesData = await tradesResponse.json();
          if (tradesData.ok) {
            // Calcula métricas de desempenho
            const stats = tradesData;
            const totalTrades = stats.total || 0;
            const wins = stats.wins || 0;
            const losses = stats.losses || 0;
            const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
            const totalPnl = stats.sumPnLUsd || 0;
            const dailyPnl = stats.pnl_today_usd || 0;
            
            // Dados mockados para demonstração
            const mockMetrics: PerformanceMetrics = {
              totalTrades,
              winRate,
              totalPnl,
              dailyPnl,
              maxDrawdown: -1250.50,
              sharpeRatio: 1.35,
              avgWin: 245.75,
              avgLoss: -125.30,
              profitFactor: 1.96,
              avgRR: 1.65
            };
            
            setMetrics(mockMetrics);
            
            // Dados de PnL diário mockados
            const mockPnlData: PnLData[] = [
              { date: '2023-10-01', value: 125.50, trades: 3 },
              { date: '2023-10-02', value: -75.25, trades: 2 },
              { date: '2023-10-03', value: 210.75, trades: 4 },
              { date: '2023-10-04', value: 95.30, trades: 2 },
              { date: '2023-10-05', value: -155.80, trades: 3 },
              { date: '2023-10-06', value: 320.45, trades: 5 },
              { date: '2023-10-07', value: 180.20, trades: 3 },
              { date: '2023-10-08', value: 65.15, trades: 2 }
            ];
            
            setPnlData(mockPnlData);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [timeframe]);

  // Formatação de valores
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Calcula o PnL acumulado
  const calculateCumulativePnl = () => {
    let cumulative = 0;
    return pnlData.map(item => {
      cumulative += item.value;
      return { ...item, cumulative };
    });
  };

  const cumulativePnlData = calculateCumulativePnl();

  // Encontra o valor máximo e mínimo para o gráfico
  const getPnlRange = () => {
    if (cumulativePnlData.length === 0) return { min: 0, max: 0 };
    
    const values = cumulativePnlData.map(item => item.cumulative);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1;
    
    return {
      min: min - padding,
      max: max + padding
    };
  };

  const pnlRange = getPnlRange();

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Período:</label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="1d">Hoje</option>
            <option value="7d">7 dias</option>
            <option value="30d">30 dias</option>
            <option value="90d">90 dias</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 rounded">
          {error}
        </div>
      )}

      {loading && (
        <div className="mb-4 p-4 bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 rounded">
          Carregando dados do dashboard...
        </div>
      )}

      {metrics && (
        <>
          {/* Métricas principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">PnL Total</div>
              <div className={`text-2xl font-bold ${metrics.totalPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(metrics.totalPnl)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {metrics.dailyPnl >= 0 ? '+' : ''}{formatCurrency(metrics.dailyPnl)} hoje
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Taxa de Acerto</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics.winRate.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {metrics.wins}/{metrics.totalTrades} trades
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Fator de Lucro</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics.profitFactor.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                R:R médio: {metrics.avgRR.toFixed(2)}
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Máximo Drawdown</div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(metrics.maxDrawdown)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Sharpe: {metrics.sharpeRatio.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Gráfico de PnL acumulado */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">PnL Acumulado</h2>
            
            {cumulativePnlData.length > 0 ? (
              <div className="h-64">
                <svg width="100%" height="100%" viewBox={`0 0 ${cumulativePnlData.length * 60} 256`} preserveAspectRatio="none">
                  {/* Linha zero */}
                  <line
                    x1="0"
                    y1={128 - (0 - pnlRange.min) / (pnlRange.max - pnlRange.min) * 256}
                    x2={cumulativePnlData.length * 60}
                    y2={128 - (0 - pnlRange.min) / (pnlRange.max - pnlRange.min) * 256}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                  
                  {/* Área sob a curva */}
                  <path
                    d={`M ${cumulativePnlData.map((item, index) => 
                      `${index * 60},${256 - (item.cumulative - pnlRange.min) / (pnlRange.max - pnlRange.min) * 256}`
                    ).join(' L ')} L ${cumulativePnlData.length * 60},256 L 0,256 Z`}
                    fill={metrics.totalPnl >= 0 ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)"}
                  />
                  
                  {/* Linha do gráfico */}
                  <path
                    d={`M ${cumulativePnlData.map((item, index) => 
                      `${index * 60},${256 - (item.cumulative - pnlRange.min) / (pnlRange.max - pnlRange.min) * 256}`
                    ).join(' L ')}`}
                    fill="none"
                    stroke={metrics.totalPnl >= 0 ? "#22c55e" : "#ef4444"}
                    strokeWidth="2"
                  />
                  
                  {/* Pontos de dados */}
                  {cumulativePnlData.map((item, index) => (
                    <circle
                      key={index}
                      cx={index * 60}
                      cy={256 - (item.cumulative - pnlRange.min) / (pnlRange.max - pnlRange.min) * 256}
                      r="3"
                      fill={metrics.totalPnl >= 0 ? "#22c55e" : "#ef4444"}
                    />
                  ))}
                  
                  {/* Labels do eixo X */}
                  {cumulativePnlData.map((item, index) => (
                    <text
                      key={index}
                      x={index * 60}
                      y="250"
                      textAnchor="middle"
                      fontSize="10"
                      fill="#6b7280"
                    >
                      {new Date(item.date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })}
                    </text>
                  ))}
                </svg>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                Sem dados de PnL para exibir
              </div>
            )}
          </div>

          {/* Métricas detalhadas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Estatísticas de Trades</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total de Trades:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{metrics.totalTrades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Ganhos:</span>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">{metrics.wins}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Perdas:</span>
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">{metrics.losses}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Empates:</span>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{metrics.totalTrades - metrics.wins - metrics.losses}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Métricas de Desempenho</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Ganho Médio:</span>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">{formatCurrency(metrics.avgWin)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Perda Média:</span>
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">{formatCurrency(metrics.avgLoss)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Fator de Lucro:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{metrics.profitFactor.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">R:R Médio:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{metrics.avgRR.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Risco</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Máximo Drawdown:</span>
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">{formatCurrency(metrics.maxDrawdown)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Sharpe Ratio:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{metrics.sharpeRatio.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">PnL Diário:</span>
                  <span className={`text-sm font-medium ${metrics.dailyPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(metrics.dailyPnl)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabela de PnL diário */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white p-4 border-b border-gray-200 dark:border-gray-700">
              PnL Diário
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      PnL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      PnL Acumulado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Trades
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {cumulativePnlData.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {new Date(item.date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`font-medium ${item.value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatCurrency(item.value)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`font-medium ${item.cumulative >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatCurrency(item.cumulative)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {item.trades}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
