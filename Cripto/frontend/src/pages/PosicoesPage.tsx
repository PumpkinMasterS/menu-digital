import React, { useState, useEffect } from 'react';

interface Trade {
  symbol: string;
  timeframe: string;
  side: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  stopPrice: number;
  sizeUsd: number;
  feesUsd: number;
  highPrice?: number;
  lowPrice?: number;
  qty: number;
  realizedPnlUsd: number;
  rUsd: number;
  rr: number;
  maeR?: number;
  mfeR?: number;
  outcome: 'win' | 'loss' | 'breakeven';
  closedAt: string;
}

interface Position {
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  percentage: number;
  leverage: number;
  liquidationPrice: number;
}

const PosicoesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'positions' | 'history'>('positions');
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    symbol: '',
    outcome: 'all' as 'all' | 'win' | 'loss' | 'breakeven',
    limit: 50
  });

  // Carrega posições da Bybit
  const fetchPositions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/bybit/positions');
      if (!response.ok) {
        throw new Error(`Failed to fetch positions: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.ok && data.result) {
        const positionsData = data.result.list || [];
        
        // Filtra apenas posições com tamanho diferente de zero
        const activePositions = positionsData
          .filter((p: any) => parseFloat(p.size) !== 0)
          .map((p: any) => ({
            symbol: p.symbol || p.symbolName,
            side: p.side || p.positionSide,
            size: parseFloat(p.size || p.positionQty || 0),
            entryPrice: parseFloat(p.avgPrice || p.entryPrice || p.avgCost || 0),
            markPrice: parseFloat(p.markPrice || p.lastPrice || 0),
            unrealizedPnl: parseFloat(p.unrealisedPnl || p.unRealizedPNL || 0),
            percentage: 0, // Calculado abaixo
            leverage: parseFloat(p.leverage || p.leverageEr || 0),
            liquidationPrice: parseFloat(p.liqPrice || p.liquidationPrice || 0)
          }));
        
        // Calcula a percentagem de PnL
        activePositions.forEach((p: Position) => {
          if (p.entryPrice > 0) {
            const pnlPercent = p.side === 'long' 
              ? ((p.markPrice - p.entryPrice) / p.entryPrice) * 100
              : ((p.entryPrice - p.markPrice) / p.entryPrice) * 100;
            p.percentage = pnlPercent * p.leverage; // Ajustado pela alavancagem
          }
        });
        
        setPositions(activePositions);
      } else {
        throw new Error(data.error || 'Failed to fetch positions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Carrega histórico de trades
  const fetchTrades = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (filters.symbol) params.append('symbol', filters.symbol);
      if (filters.outcome !== 'all') params.append('outcome', filters.outcome);
      params.append('limit', filters.limit.toString());
      
      const response = await fetch(`/trades/stats?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch trades: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.ok) {
        // Como a API de trades/stats retorna estatísticas agregadas, precisamos buscar os trades individuais
        // Por enquanto, vamos usar dados mockados para demonstração
        const mockTrades: Trade[] = [
          {
            symbol: 'BTCUSDT',
            timeframe: '1h',
            side: 'long',
            entryPrice: 42000,
            exitPrice: 43500,
            stopPrice: 41000,
            sizeUsd: 1000,
            feesUsd: 2.5,
            highPrice: 44000,
            lowPrice: 41500,
            qty: 0.0238,
            realizedPnlUsd: 357.5,
            rUsd: 238,
            rr: 1.5,
            maeR: 0.42,
            mfeR: 1.68,
            outcome: 'win',
            closedAt: '2023-10-08T14:30:00Z'
          },
          {
            symbol: 'ETHUSDT',
            timeframe: '4h',
            side: 'short',
            entryPrice: 2250,
            exitPrice: 2180,
            stopPrice: 2280,
            sizeUsd: 500,
            feesUsd: 1.2,
            highPrice: 2270,
            lowPrice: 2170,
            qty: 0.222,
            realizedPnlUsd: 155.6,
            rUsd: 88.8,
            rr: 1.75,
            maeR: 0.23,
            mfeR: 0.9,
            outcome: 'win',
            closedAt: '2023-10-08T10:15:00Z'
          },
          {
            symbol: 'BTCUSDT',
            timeframe: '15m',
            side: 'long',
            entryPrice: 41800,
            exitPrice: 41200,
            stopPrice: 41500,
            sizeUsd: 800,
            feesUsd: 1.9,
            highPrice: 42000,
            lowPrice: 41100,
            qty: 0.0191,
            realizedPnlUsd: -114.9,
            rUsd: 286.4,
            rr: 0.4,
            maeR: 0.7,
            mfeR: 0.35,
            outcome: 'loss',
            closedAt: '2023-10-07T16:45:00Z'
          }
        ];
        
        setTrades(mockTrades);
      } else {
        throw new Error(data.error || 'Failed to fetch trades');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Carrega dados quando a aba ativa mudar
  useEffect(() => {
    if (activeTab === 'positions') {
      fetchPositions();
    } else {
      fetchTrades();
    }
  }, [activeTab, filters]);

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

  // Calcula estatísticas dos trades
  const calculateStats = () => {
    if (trades.length === 0) return null;
    
    const wins = trades.filter(t => t.outcome === 'win').length;
    const losses = trades.filter(t => t.outcome === 'loss').length;
    const breakevens = trades.filter(t => t.outcome === 'breakeven').length;
    const total = trades.length;
    
    const winRate = total > 0 ? (wins / total) * 100 : 0;
    const totalPnl = trades.reduce((sum, t) => sum + t.realizedPnlUsd, 0);
    const avgRR = trades.reduce((sum, t) => sum + t.rr, 0) / total;
    
    return {
      total,
      wins,
      losses,
      breakevens,
      winRate,
      totalPnl,
      avgRR
    };
  };

  const stats = calculateStats();

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Posições e Histórico</h1>
        
        {/* Abas */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('positions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'positions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Posições Abertas
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Histórico de Trades
            </button>
          </nav>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 rounded">
          {error}
        </div>
      )}

      {loading && (
        <div className="mb-4 p-4 bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 rounded">
          Carregando...
        </div>
      )}

      {/* Conteúdo da aba de Posições Abertas */}
      {activeTab === 'positions' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          {positions.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              Nenhuma posição aberta no momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Símbolo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Lado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Tamanho
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Preço de Entrada
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Preço Atual
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      PnL Não Realizado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Alavancagem
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Preço de Liquidação
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {positions.map((position, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {position.symbol}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          position.side === 'long'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {position.side === 'long' ? 'Long' : 'Short'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {position.size.toFixed(4)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatCurrency(position.entryPrice)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatCurrency(position.markPrice)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`font-medium ${
                          position.unrealizedPnl >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {formatCurrency(position.unrealizedPnl)}
                        </span>
                        <span className={`block text-xs ${
                          position.percentage >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {formatPercentage(position.percentage)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {position.leverage}x
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatCurrency(position.liquidationPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Conteúdo da aba de Histórico de Trades */}
      {activeTab === 'history' && (
        <div>
          {/* Filtros */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="symbol-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Símbolo
                </label>
                <input
                  type="text"
                  id="symbol-filter"
                  value={filters.symbol}
                  onChange={(e) => setFilters({ ...filters, symbol: e.target.value })}
                  placeholder="Filtrar por símbolo"
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="outcome-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Resultado
                </label>
                <select
                  id="outcome-filter"
                  value={filters.outcome}
                  onChange={(e) => setFilters({ ...filters, outcome: e.target.value as any })}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">Todos</option>
                  <option value="win">Ganhos</option>
                  <option value="loss">Perdas</option>
                  <option value="breakeven">Empate</option>
                </select>
              </div>
              <div>
                <label htmlFor="limit-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Limite
                </label>
                <select
                  id="limit-filter"
                  value={filters.limit}
                  onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) })}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="200">200</option>
                </select>
              </div>
            </div>
          </div>

          {/* Estatísticas */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Trades</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Taxa de Acerto</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.winRate.toFixed(1)}%</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Ganhos</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.wins}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Perdas</div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.losses}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">PnL Total</div>
                <div className={`text-2xl font-bold ${stats.totalPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(stats.totalPnl)}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">R:R Médio</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.avgRR.toFixed(2)}</div>
              </div>
            </div>
          )}

          {/* Tabela de Trades */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            {trades.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                Nenhum trade encontrado com os filtros selecionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Símbolo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Timeframe
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Lado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Entrada
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Saída
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Tamanho
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        PnL
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        R:R
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Resultado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Data
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {trades.map((trade, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {trade.symbol}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {trade.timeframe}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            trade.side === 'long'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {trade.side === 'long' ? 'Long' : 'Short'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatCurrency(trade.entryPrice)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatCurrency(trade.exitPrice)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatCurrency(trade.sizeUsd)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`font-medium ${
                            trade.realizedPnlUsd >= 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {formatCurrency(trade.realizedPnlUsd)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {trade.rr.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            trade.outcome === 'win'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : trade.outcome === 'loss'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {trade.outcome === 'win' ? 'Ganho' : trade.outcome === 'loss' ? 'Perda' : 'Empate'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(trade.closedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PosicoesPage;
