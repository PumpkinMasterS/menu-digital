import React, { useState, useEffect } from 'react';

interface Position {
  symbol: string;
  side: 'Buy' | 'Sell';
  size: number;
  positionValue: number;
  entryPrice: number;
  markPrice: number;
  unrealisedPnl: number;
  percentage: number;
  leverage: string;
  positionMargin: number;
  liqPrice?: number;
  takeProfit?: number;
  stopLoss?: number;
  createdTime: string;
  updatedTime: string;
}

interface WalletBalance {
  accountType: string;
  totalEquity: string;
  totalInitialMargin: string;
  totalMaintenanceMargin: string;
  totalAvailableBalance: string;
  totalPerpUPL: string;
  totalWalletBalance: string;
  coin: Array<{
    coin: string;
    equity: string;
    usdValue: string;
    walletBalance: string;
    unrealisedPnl: string;
  }>;
}

interface ExecutionConfig {
  enableBybit: boolean;
  enableBinance: boolean;
  enablePaperTrading: boolean;
  maxPositionSize: number;
  maxDailyLoss: number;
  maxOpenPositions: number;
  defaultLeverage: number;
  commissionRate: number;
  slippageRate: number;
}

interface DailyStats {
  pnl: number;
  trades: number;
}

const ExecucaoPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'positions' | 'wallet' | 'orders' | 'config'>('positions');
  const [positions, setPositions] = useState<Position[]>([]);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [executionConfig, setExecutionConfig] = useState<ExecutionConfig | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Carrega dados iniciais
  useEffect(() => {
    fetchPositions();
    fetchWalletBalance();
    fetchExecutionConfig();
    fetchDailyStats();
  }, []);

  // Atualiza dados a cada 5 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPositions();
      fetchWalletBalance();
      fetchDailyStats();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchPositions = async () => {
    try {
      const response = await fetch('/api/v1/execution/positions');
      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          setPositions(data.data || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch positions:', err);
    }
  };

  const fetchWalletBalance = async () => {
    try {
      const response = await fetch('/api/v1/execution/wallet-balance');
      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          setWalletBalance(data.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch wallet balance:', err);
    }
  };

  const fetchExecutionConfig = async () => {
    try {
      const response = await fetch('/api/v1/execution/config');
      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          setExecutionConfig(data.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch execution config:', err);
    }
  };

  const fetchDailyStats = async () => {
    try {
      const response = await fetch('/api/v1/execution/daily-stats');
      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          setDailyStats(data.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch daily stats:', err);
    }
  };

  const closePosition = async (symbol: string) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/v1/execution/close-position', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbol }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          setSuccessMessage(`Posição ${symbol} fechada com sucesso`);
          fetchPositions();
        } else {
          setError(data.error || 'Falha ao fechar posição');
        }
      } else {
        setError('Falha ao fechar posição');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const toggleExecutor = async (action: 'start' | 'stop') => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/v1/execution/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          setSuccessMessage(data.message);
        } else {
          setError(data.error || 'Falha ao alterar executor');
        }
      } else {
        setError('Falha ao alterar executor');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (config: Partial<ExecutionConfig>) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/v1/execution/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          setSuccessMessage('Configuração atualizada com sucesso');
          fetchExecutionConfig();
        } else {
          setError(data.error || 'Falha ao atualizar configuração');
        }
      } else {
        setError('Falha ao atualizar configuração');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Formatação de valores
  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Execução de Ordens</h1>
        
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
              Posições
            </button>
            <button
              onClick={() => setActiveTab('wallet')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'wallet'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Carteira
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'orders'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Ordens
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'config'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Configuração
            </button>
          </nav>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 rounded">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 rounded">
          {successMessage}
        </div>
      )}

      {/* Conteúdo da aba de Posições */}
      {activeTab === 'positions' && (
        <div className="space-y-6">
          {/* Estatísticas diárias */}
          {dailyStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">PnL Diário</div>
                <div className={`text-2xl font-bold ${dailyStats.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(dailyStats.pnl)}
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Trades Hoje</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {dailyStats.trades}
                </div>
              </div>
            </div>
          )}

          {/* Tabela de posições */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white p-4 border-b border-gray-200 dark:border-gray-700">
              Posições Abertas
            </h2>
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
                      PnL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Alavancagem
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {positions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        Nenhuma posição aberta
                      </td>
                    </tr>
                  ) : (
                    positions.map((position) => (
                      <tr key={position.symbol}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {position.symbol}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            position.side === 'Buy'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {position.side}
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
                          <span className={`font-medium ${position.unrealisedPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {formatCurrency(position.unrealisedPnl)} ({formatPercentage(position.percentage)})
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {position.leverage}x
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <button
                            onClick={() => closePosition(position.symbol)}
                            disabled={loading}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                          >
                            Fechar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo da aba de Carteira */}
      {activeTab === 'wallet' && (
        <div className="space-y-6">
          {walletBalance ? (
            <>
              {/* Resumo da carteira */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Equity Total</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(walletBalance.totalEquity)}
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Saldo Disponível</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(walletBalance.totalAvailableBalance)}
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">PnL Não Realizado</div>
                  <div className={`text-2xl font-bold ${parseFloat(walletBalance.totalPerpUPL) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(walletBalance.totalPerpUPL)}
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Saldo da Carteira</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(walletBalance.totalWalletBalance)}
                  </div>
                </div>
              </div>

              {/* Detalhes por moeda */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white p-4 border-b border-gray-200 dark:border-gray-700">
                  Saldo por Moeda
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Moeda
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Equity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Valor USD
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Saldo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          PnL Não Realizado
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {walletBalance.coin.map((coin) => (
                        <tr key={coin.coin}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {coin.coin}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {coin.equity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatCurrency(coin.usdValue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {coin.walletBalance}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`font-medium ${parseFloat(coin.unrealisedPnl) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {coin.unrealisedPnl}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center text-gray-500 dark:text-gray-400">
              Carregando informações da carteira...
            </div>
          )}
        </div>
      )}

      {/* Conteúdo da aba de Ordens */}
      {activeTab === 'orders' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center text-gray-500 dark:text-gray-400">
          <p>Funcionalidade de histórico de ordens em desenvolvimento.</p>
          <p className="mt-2">Em breve você poderá visualizar o histórico completo de ordens executadas.</p>
        </div>
      )}

      {/* Conteúdo da aba de Configuração */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {executionConfig ? (
            <>
              {/* Status do executor */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Status do Executor</h2>
                
                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Modo Paper Trading: <span className={`font-medium ${executionConfig.enablePaperTrading ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {executionConfig.enablePaperTrading ? 'Ativado' : 'Desativado'}
                    </span>
                  </div>
                  
                  <div className="space-x-2">
                    <button
                      onClick={() => toggleExecutor('start')}
                      disabled={loading}
                      className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      Iniciar
                    </button>
                    <button
                      onClick={() => toggleExecutor('stop')}
                      disabled={loading}
                      className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      Parar
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Bybit:</span>
                    <span className={`font-medium ${executionConfig.enableBybit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {executionConfig.enableBybit ? 'Ativado' : 'Desativado'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Binance:</span>
                    <span className={`font-medium ${executionConfig.enableBinance ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {executionConfig.enableBinance ? 'Ativado' : 'Desativado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Configurações de risco */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Configurações de Risco</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tamanho Máximo da Posição (USD)
                    </label>
                    <input
                      type="number"
                      value={executionConfig.maxPositionSize}
                      onChange={(e) => setExecutionConfig({
                        ...executionConfig,
                        maxPositionSize: parseFloat(e.target.value)
                      })}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Perda Diária Máxima (USD)
                    </label>
                    <input
                      type="number"
                      value={executionConfig.maxDailyLoss}
                      onChange={(e) => setExecutionConfig({
                        ...executionConfig,
                        maxDailyLoss: parseFloat(e.target.value)
                      })}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Máximo de Posições Abertas
                    </label>
                    <input
                      type="number"
                      value={executionConfig.maxOpenPositions}
                      onChange={(e) => setExecutionConfig({
                        ...executionConfig,
                        maxOpenPositions: parseInt(e.target.value)
                      })}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Alavancagem Padrão
                    </label>
                    <input
                      type="number"
                      value={executionConfig.defaultLeverage}
                      onChange={(e) => setExecutionConfig({
                        ...executionConfig,
                        defaultLeverage: parseInt(e.target.value)
                      })}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Taxa de Comissão (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={executionConfig.commissionRate}
                      onChange={(e) => setExecutionConfig({
                        ...executionConfig,
                        commissionRate: parseFloat(e.target.value)
                      })}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Taxa de Slippage (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={executionConfig.slippageRate}
                      onChange={(e) => setExecutionConfig({
                        ...executionConfig,
                        slippageRate: parseFloat(e.target.value)
                      })}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <button
                    onClick={() => updateConfig(executionConfig)}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    Salvar Configuração
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center text-gray-500 dark:text-gray-400">
              Carregando configuração de execução...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExecucaoPage;



