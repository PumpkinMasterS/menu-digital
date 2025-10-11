import React, { useState, useEffect } from 'react';

interface BacktestConfig {
  strategy: {
    id: string;
    name: string;
    enabled: boolean;
    symbols: string[];
    conditions: Array<{
      id: string;
      indicator: string;
      operator: string;
      value: string;
      timeframe: string;
    }>;
    stopLoss: {
      mode: 'percent' | 'absolute' | 'atrMultiple';
      value: string;
    };
    takeProfit: {
      mode: 'percent' | 'absolute' | 'atrMultiple';
      value: string;
    };
    riskManagement: {
      maxDailyDrawdown: string;
      maxConcurrentSignals: string;
      rrMin: string;
    };
  };
  symbol: string;
  timeframe: string;
  startDate: string;
  endDate: string;
  initialBalance: number;
  positionSize: number;
  commission: number;
  slippage: number;
}

interface BacktestResult {
  config: BacktestConfig;
  trades: Array<{
    timestamp: number;
    symbol: string;
    timeframe: string;
    type: 'BUY' | 'SELL';
    price: number;
    quantity: number;
    commission: number;
    slippage: number;
    balance: number;
    equity: number;
  }>;
  metrics: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalReturn: number;
    totalReturnPercent: number;
    maxDrawdown: number;
    maxDrawdownPercent: number;
    sharpeRatio: number;
    profitFactor: number;
    avgWin: number;
    avgLoss: number;
    avgRR: number;
    calmarRatio: number;
  };
  equity: Array<{ timestamp: number; value: number }>;
}

interface BacktestExample {
  name: string;
  config: BacktestConfig;
}

const BacktestingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'config' | 'results'>('config');
  const [config, setConfig] = useState<BacktestConfig>({
    strategy: {
      id: '',
      name: '',
      enabled: true,
      symbols: ['BTCUSDT'],
      conditions: [],
      stopLoss: {
        mode: 'percent',
        value: '2'
      },
      takeProfit: {
        mode: 'percent',
        value: '4'
      },
      riskManagement: {
        maxDailyDrawdown: '5',
        maxConcurrentSignals: '1',
        rrMin: '1.5'
      }
    },
    symbol: 'BTCUSDT',
    timeframe: '1h',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    initialBalance: 10000,
    positionSize: 1000,
    commission: 0.1,
    slippage: 0.05
  });

  const [examples, setExamples] = useState<BacktestExample[]>([]);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT'];
  const timeframes = ['1m', '3m', '5m', '15m', '1h', '4h'];
  const indicators = [
    { value: 'rsi', label: 'RSI' },
    { value: 'ema_short', label: 'EMA Curta' },
    { value: 'ema_long', label: 'EMA Longa' },
    { value: 'atr', label: 'ATR' },
    { value: 'macd', label: 'MACD' },
    { value: 'price', label: 'Preço' }
  ];
  const operators = [
    { value: 'greater_than', label: '>' },
    { value: 'less_than', label: '<' },
    { value: 'equals', label: '=' },
    { value: 'crosses_above', label: 'Cruza para cima' },
    { value: 'crosses_below', label: 'Cruza para baixo' }
  ];

  // Carrega exemplos de backtest
  useEffect(() => {
    const fetchExamples = async () => {
      try {
        const response = await fetch('/api/v1/backtesting/examples');
        if (response.ok) {
          const data = await response.json();
          if (data.ok) {
            setExamples(data.data || []);
          }
        }
      } catch (err) {
        console.error('Failed to fetch examples:', err);
      }
    };

    fetchExamples();
  }, []);

  // Adiciona uma condição à estratégia
  const addCondition = () => {
    const newCondition = {
      id: Date.now().toString(),
      indicator: 'rsi',
      operator: 'less_than',
      value: '30',
      timeframe: '1h'
    };

    setConfig({
      ...config,
      strategy: {
        ...config.strategy,
        conditions: [...config.strategy.conditions, newCondition]
      }
    });
  };

  // Remove uma condição da estratégia
  const removeCondition = (conditionId: string) => {
    setConfig({
      ...config,
      strategy: {
        ...config.strategy,
        conditions: config.strategy.conditions.filter(c => c.id !== conditionId)
      }
    });
  };

  // Atualiza uma condição específica
  const updateCondition = (conditionId: string, field: string, value: string) => {
    setConfig({
      ...config,
      strategy: {
        ...config.strategy,
        conditions: config.strategy.conditions.map(c =>
          c.id === conditionId ? { ...c, [field]: value } : c
        )
      }
    });
  };

  // Carrega um exemplo de configuração
  const loadExample = (example: BacktestExample) => {
    setConfig(example.config);
    setValidationErrors([]);
  };

  // Valida a configuração antes de executar
  const validateConfig = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/v1/backtesting/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          setValidationErrors([]);
          return true;
        } else {
          setValidationErrors(data.errors || ['Configuração inválida']);
          return false;
        }
      } else {
        setValidationErrors(['Erro na validação']);
        return false;
      }
    } catch (err) {
      setValidationErrors(['Erro na validação']);
      return false;
    }
  };

  // Executa o backtest
  const runBacktest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Primeiro valida a configuração
      const isValid = await validateConfig();
      if (!isValid) {
        return;
      }

      const response = await fetch('/api/v1/backtesting/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          setResult(data.data);
          setActiveTab('results');
        } else {
          setError(data.error || 'Erro ao executar backtest');
        }
      } else {
        setError('Erro ao executar backtest');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Backtesting</h1>
        
        {/* Abas */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
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
            <button
              onClick={() => setActiveTab('results')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'results'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Resultados
            </button>
          </nav>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 rounded">
          {error}
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="mb-4 p-4 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-400 rounded">
          <div className="font-medium mb-2">Erros de validação:</div>
          <ul className="list-disc list-inside space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index} className="text-sm">{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Conteúdo da aba de Configuração */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário de configuração */}
          <div className="lg:col-span-2 space-y-6">
            {/* Estratégia */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Estratégia</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome da Estratégia
                  </label>
                  <input
                    type="text"
                    value={config.strategy.name}
                    onChange={(e) => setConfig({
                      ...config,
                      strategy: { ...config.strategy, name: e.target.value }
                    })}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Nome da estratégia"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Símbolos
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {symbols.map(symbol => (
                      <label key={symbol} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={config.strategy.symbols.includes(symbol)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setConfig({
                                ...config,
                                strategy: {
                                  ...config.strategy,
                                  symbols: [...config.strategy.symbols, symbol]
                                }
                              });
                            } else {
                              setConfig({
                                ...config,
                                strategy: {
                                  ...config.strategy,
                                  symbols: config.strategy.symbols.filter(s => s !== symbol)
                                }
                              });
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{symbol}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Condições
                    </label>
                    <button
                      onClick={addCondition}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Adicionar Condição
                    </button>
                  </div>
                  
                  {config.strategy.conditions.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 italic">Nenhuma condição definida</p>
                  ) : (
                    <div className="space-y-2">
                      {config.strategy.conditions.map((condition, index) => (
                        <div key={condition.id} className="border border-gray-200 dark:border-gray-600 rounded-md p-3">
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                            <select
                              value={condition.indicator}
                              onChange={(e) => updateCondition(condition.id, 'indicator', e.target.value)}
                              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                              {indicators.map(indicator => (
                                <option key={indicator.value} value={indicator.value}>
                                  {indicator.label}
                                </option>
                              ))}
                            </select>

                            <select
                              value={condition.operator}
                              onChange={(e) => updateCondition(condition.id, 'operator', e.target.value)}
                              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                              {operators.map(operator => (
                                <option key={operator.value} value={operator.value}>
                                  {operator.label}
                                </option>
                              ))}
                            </select>

                            <input
                              type="text"
                              value={condition.value}
                              onChange={(e) => updateCondition(condition.id, 'value', e.target.value)}
                              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              placeholder="Valor"
                            />

                            <select
                              value={condition.timeframe}
                              onChange={(e) => updateCondition(condition.id, 'timeframe', e.target.value)}
                              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                              {timeframes.map(timeframe => (
                                <option key={timeframe} value={timeframe}>
                                  {timeframe}
                                </option>
                              ))}
                            </select>

                            <button
                              onClick={() => removeCondition(condition.id)}
                              className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Parâmetros do Backtest */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Parâmetros do Backtest</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Símbolo
                  </label>
                  <select
                    value={config.symbol}
                    onChange={(e) => setConfig({ ...config, symbol: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {symbols.map(symbol => (
                      <option key={symbol} value={symbol}>
                        {symbol}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Timeframe
                  </label>
                  <select
                    value={config.timeframe}
                    onChange={(e) => setConfig({ ...config, timeframe: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {timeframes.map(timeframe => (
                      <option key={timeframe} value={timeframe}>
                        {timeframe}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Data de Início
                  </label>
                  <input
                    type="date"
                    value={config.startDate}
                    onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Data de Fim
                  </label>
                  <input
                    type="date"
                    value={config.endDate}
                    onChange={(e) => setConfig({ ...config, endDate: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Balance Inicial (USD)
                  </label>
                  <input
                    type="number"
                    value={config.initialBalance}
                    onChange={(e) => setConfig({ ...config, initialBalance: parseFloat(e.target.value) })}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    min="0"
                    step="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tamanho da Posição (USD)
                  </label>
                  <input
                    type="number"
                    value={config.positionSize}
                    onChange={(e) => setConfig({ ...config, positionSize: parseFloat(e.target.value) })}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    min="0"
                    step="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Comissão (%)
                  </label>
                  <input
                    type="number"
                    value={config.commission}
                    onChange={(e) => setConfig({ ...config, commission: parseFloat(e.target.value) })}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    min="0"
                    max="1"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Slippage (%)
                  </label>
                  <input
                    type="number"
                    value={config.slippage}
                    onChange={(e) => setConfig({ ...config, slippage: parseFloat(e.target.value) })}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    min="0"
                    max="1"
                    step="0.01"
                  />
                </div>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={runBacktest}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Executando...' : 'Executar Backtest'}
              </button>
            </div>
          </div>

          {/* Exemplos */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Exemplos</h2>
            
            {examples.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">Carregando exemplos...</p>
            ) : (
              <div className="space-y-2">
                {examples.map((example, index) => (
                  <div
                    key={index}
                    className="p-3 border border-gray-200 dark:border-gray-600 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                    onClick={() => loadExample(example)}
                  >
                    <h3 className="font-medium text-gray-900 dark:text-white">{example.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {example.config.symbol} • {example.config.timeframe} • {example.config.initialBalance} USD
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conteúdo da aba de Resultados */}
      {activeTab === 'results' && (
        <div>
          {result ? (
            <div className="space-y-6">
              {/* Métricas principais */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Retorno Total</div>
                  <div className={`text-2xl font-bold ${result.metrics.totalReturn >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(result.metrics.totalReturn)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatPercentage(result.metrics.totalReturnPercent)}
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Taxa de Acerto</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {result.metrics.winRate.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {result.metrics.winningTrades}/{result.metrics.totalTrades} trades
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Fator de Lucro</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {result.metrics.profitFactor.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    R:R médio: {result.metrics.avgRR.toFixed(2)}
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Máximo Drawdown</div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(result.metrics.maxDrawdown)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatPercentage(result.metrics.maxDrawdownPercent)}
                  </div>
                </div>
              </div>

              {/* Métricas detalhadas */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Estatísticas</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Total de Trades:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{result.metrics.totalTrades}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Ganhos:</span>
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">{result.metrics.winningTrades}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Perdas:</span>
                      <span className="text-sm font-medium text-red-600 dark:text-red-400">{result.metrics.losingTrades}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Sharpe Ratio:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{result.metrics.sharpeRatio.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Desempenho</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Ganho Médio:</span>
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">{formatCurrency(result.metrics.avgWin)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Perda Média:</span>
                      <span className="text-sm font-medium text-red-600 dark:text-red-400">{formatCurrency(result.metrics.avgLoss)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Calmar Ratio:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{result.metrics.calmarRatio.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Configuração</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Símbolo:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{result.config.symbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Timeframe:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{result.config.timeframe}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Período:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {new Date(result.config.startDate).toLocaleDateString()} - {new Date(result.config.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Balance Inicial:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(result.config.initialBalance)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gráfico de Equity */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Curva de Equity</h2>
                
                {result.equity.length > 0 ? (
                  <div className="h-64">
                    <svg width="100%" height="100%" viewBox={`0 0 ${result.equity.length * 2} 256`} preserveAspectRatio="none">
                      {/* Linha zero */}
                      <line
                        x1="0"
                        y1="128"
                        x2={result.equity.length * 2}
                        y2="128"
                        stroke="#e5e7eb"
                        strokeWidth="1"
                      />
                      
                      {/* Área sob a curva */}
                      <path
                        d={`M ${result.equity.map((item, index) => 
                          `${index * 2},${256 - (item.value / result.config.initialBalance) * 256}`
                        ).join(' L ')} L ${result.equity.length * 2},256 L 0,256 Z`}
                        fill={result.metrics.totalReturn >= 0 ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)"}
                      />
                      
                      {/* Linha do gráfico */}
                      <path
                        d={`M ${result.equity.map((item, index) => 
                          `${index * 2},${256 - (item.value / result.config.initialBalance) * 256}`
                        ).join(' L ')}`}
                        fill="none"
                        stroke={result.metrics.totalReturn >= 0 ? "#22c55e" : "#ef4444"}
                        strokeWidth="2"
                      />
                      
                      {/* Pontos de dados */}
                      {result.equity.map((item, index) => (
                        <circle
                          key={index}
                          cx={index * 2}
                          cy={256 - (item.value / result.config.initialBalance) * 256}
                          r="2"
                          fill={result.metrics.totalReturn >= 0 ? "#22c55e" : "#ef4444"}
                        />
                      ))}
                    </svg>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    Sem dados de equity para exibir
                  </div>
                )}
              </div>

              {/* Tabela de Trades */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white p-4 border-b border-gray-200 dark:border-gray-700">
                  Trades Executados
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Data
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Preço
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Quantidade
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Comissão
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Slippage
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Balance
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {result.trades.map((trade, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {new Date(trade.timestamp * 1000).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              trade.type === 'BUY'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {trade.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatCurrency(trade.price)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {trade.quantity.toFixed(6)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatCurrency(trade.commission)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatCurrency(trade.slippage)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatCurrency(trade.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center text-gray-500 dark:text-gray-400">
              Nenhum resultado de backtest disponível. Execute um backtest para ver os resultados.
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center text-gray-500 dark:text-gray-400">
          Selecione a aba de Resultados para ver os resultados do backtest.
        </div>
      )}
    </div>
  );
};

export default BacktestingPage;

