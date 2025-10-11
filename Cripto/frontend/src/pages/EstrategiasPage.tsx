import React, { useState, useEffect } from 'react';

interface Condition {
  id: string;
  indicator: string;
  operator: string;
  value: string;
  timeframe: string;
}

interface Strategy {
  id: string;
  name: string;
  enabled: boolean;
  symbols: string[];
  conditions: Condition[];
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
}

const EstrategiasPage: React.FC = () => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  const timeframes = ['1m', '3m', '5m', '15m', '1h', '4h'];
  const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT'];

  // Carrega estratégias do backend
  useEffect(() => {
    const fetchStrategies = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/v1/signals/strategies');
        if (!response.ok) {
          throw new Error(`Failed to fetch strategies: ${response.statusText}`);
        }
        
        const data = await response.json();
        if (data.ok) {
          setStrategies(data.data || []);
          if (data.data && data.data.length > 0 && !selectedStrategy) {
            setSelectedStrategy(data.data[0]);
          }
        } else {
          throw new Error(data.error || 'Failed to fetch strategies');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchStrategies();
  }, []);

  const addCondition = () => {
    if (!selectedStrategy) return;

    const newCondition: Condition = {
      id: Date.now().toString(),
      indicator: 'rsi',
      operator: 'greater_than',
      value: '50',
      timeframe: '1h'
    };

    const updatedStrategy = {
      ...selectedStrategy,
      conditions: [...selectedStrategy.conditions, newCondition]
    };

    setSelectedStrategy(updatedStrategy);
  };

  const updateCondition = (conditionId: string, field: keyof Condition, value: string) => {
    if (!selectedStrategy) return;

    const updatedConditions = selectedStrategy.conditions.map(condition =>
      condition.id === conditionId ? { ...condition, [field]: value } : condition
    );

    const updatedStrategy = {
      ...selectedStrategy,
      conditions: updatedConditions
    };

    setSelectedStrategy(updatedStrategy);
  };

  const removeCondition = (conditionId: string) => {
    if (!selectedStrategy) return;

    const updatedConditions = selectedStrategy.conditions.filter(
      condition => condition.id !== conditionId
    );

    const updatedStrategy = {
      ...selectedStrategy,
      conditions: updatedConditions
    };

    setSelectedStrategy(updatedStrategy);
  };

  const saveStrategy = async () => {
    if (!selectedStrategy) return;
    
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await fetch('/api/v1/signals/strategies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(selectedStrategy),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to save strategy: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.ok) {
        // Atualiza a estratégia na lista
        setStrategies(prevStrategies =>
          prevStrategies.some(s => s.id === selectedStrategy.id)
            ? prevStrategies.map(s => s.id === selectedStrategy.id ? selectedStrategy : s)
            : [...prevStrategies, selectedStrategy]
        );
        
        setSuccessMessage('Estratégia salva com sucesso!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        throw new Error(data.error || 'Failed to save strategy');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const deleteStrategy = async (strategyId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta estratégia?')) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/v1/signals/strategies/${strategyId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete strategy: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.ok) {
        // Remove a estratégia da lista
        setStrategies(prevStrategies => prevStrategies.filter(s => s.id !== strategyId));
        
        // Se a estratégia excluída era a selecionada, seleciona outra
        if (selectedStrategy?.id === strategyId) {
          const remainingStrategies = strategies.filter(s => s.id !== strategyId);
          setSelectedStrategy(remainingStrategies.length > 0 ? remainingStrategies[0] : null);
        }
        
        setSuccessMessage('Estratégia excluída com sucesso!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        throw new Error(data.error || 'Failed to delete strategy');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const toggleStrategy = async (strategyId: string) => {
    const strategy = strategies.find(s => s.id === strategyId);
    if (!strategy) return;
    
    const updatedStrategy = { ...strategy, enabled: !strategy.enabled };
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/v1/signals/strategies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedStrategy),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update strategy: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.ok) {
        setStrategies(prevStrategies =>
          prevStrategies.map(s => s.id === strategyId ? updatedStrategy : s)
        );
        
        if (selectedStrategy?.id === strategyId) {
          setSelectedStrategy(updatedStrategy);
        }
      } else {
        throw new Error(data.error || 'Failed to update strategy');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const createNewStrategy = () => {
    const newStrategy: Strategy = {
      id: Date.now().toString(),
      name: 'Nova Estratégia',
      enabled: false,
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
    };

    setStrategies([...strategies, newStrategy]);
    setSelectedStrategy(newStrategy);
    setIsCreatingNew(false);
  };

  const duplicateStrategy = () => {
    if (!selectedStrategy) return;
    
    const newStrategy = {
      ...selectedStrategy,
      id: Date.now().toString(),
      name: `${selectedStrategy.name} (cópia)`,
      enabled: false
    };
    
    setStrategies([...strategies, newStrategy]);
    setSelectedStrategy(newStrategy);
    setIsCreatingNew(false);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Estratégias de Trading</h1>
        <button
          onClick={() => setIsCreatingNew(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Nova Estratégia
        </button>
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

      {loading && (
        <div className="mb-4 p-4 bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 rounded">
          Carregando...
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de estratégias */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Minhas Estratégias</h2>
            <div className="space-y-2">
              {strategies.map(strategy => (
                <div
                  key={strategy.id}
                  className={`p-3 rounded-md cursor-pointer ${
                    selectedStrategy?.id === strategy.id
                      ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700'
                      : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                  }`}
                  onClick={() => setSelectedStrategy(strategy)}
                >
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium text-gray-900 dark:text-white">{strategy.name}</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStrategy(strategy.id);
                        }}
                        className={`px-2 py-1 text-xs rounded ${
                          strategy.enabled
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                        }`}
                      >
                        {strategy.enabled ? 'Ativa' : 'Inativa'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteStrategy(strategy.id);
                        }}
                        className="px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {strategy.symbols.join(', ')} • {strategy.conditions.length} condição(ões)
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Editor de estratégia */}
        <div className="lg:col-span-2">
          {selectedStrategy ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="mb-6">
                <label htmlFor="strategy-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome da Estratégia
                </label>
                <input
                  type="text"
                  id="strategy-name"
                  value={selectedStrategy.name}
                  onChange={(e) => setSelectedStrategy({ ...selectedStrategy, name: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Símbolos */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Símbolos
                </label>
                <div className="flex flex-wrap gap-2">
                  {symbols.map(symbol => (
                    <label key={symbol} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedStrategy.symbols.includes(symbol)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStrategy({
                              ...selectedStrategy,
                              symbols: [...selectedStrategy.symbols, symbol]
                            });
                          } else {
                            setSelectedStrategy({
                              ...selectedStrategy,
                              symbols: selectedStrategy.symbols.filter(s => s !== symbol)
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

              {/* Condições */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Condições</h3>
                  <button
                    onClick={addCondition}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Adicionar Condição
                  </button>
                </div>

                {selectedStrategy.conditions.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 italic">Nenhuma condição definida</p>
                ) : (
                  <div className="space-y-3">
                    {selectedStrategy.conditions.map((condition, index) => (
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

              {/* Stop Loss e Take Profit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Stop Loss</h3>
                  <div className="space-y-2">
                    <select
                      value={selectedStrategy.stopLoss.mode}
                      onChange={(e) => setSelectedStrategy({
                        ...selectedStrategy,
                        stopLoss: { ...selectedStrategy.stopLoss, mode: e.target.value as any }
                      })}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="percent">Percentual</option>
                      <option value="absolute">Valor Absoluto</option>
                      <option value="atrMultiple">Múltiplo de ATR</option>
                    </select>
                    <input
                      type="text"
                      value={selectedStrategy.stopLoss.value}
                      onChange={(e) => setSelectedStrategy({
                        ...selectedStrategy,
                        stopLoss: { ...selectedStrategy.stopLoss, value: e.target.value }
                      })}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Valor"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Take Profit</h3>
                  <div className="space-y-2">
                    <select
                      value={selectedStrategy.takeProfit.mode}
                      onChange={(e) => setSelectedStrategy({
                        ...selectedStrategy,
                        takeProfit: { ...selectedStrategy.takeProfit, mode: e.target.value as any }
                      })}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="percent">Percentual</option>
                      <option value="absolute">Valor Absoluto</option>
                      <option value="atrMultiple">Múltiplo de ATR</option>
                    </select>
                    <input
                      type="text"
                      value={selectedStrategy.takeProfit.value}
                      onChange={(e) => setSelectedStrategy({
                        ...selectedStrategy,
                        takeProfit: { ...selectedStrategy.takeProfit, value: e.target.value }
                      })}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Valor"
                    />
                  </div>
                </div>
              </div>

              {/* Gestão de Risco */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Gestão de Risco</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Drawdown Diário Máximo (%)
                    </label>
                    <input
                      type="text"
                      value={selectedStrategy.riskManagement.maxDailyDrawdown}
                      onChange={(e) => setSelectedStrategy({
                        ...selectedStrategy,
                        riskManagement: {
                          ...selectedStrategy.riskManagement,
                          maxDailyDrawdown: e.target.value
                        }
                      })}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Sinais Simultâneos Máximos
                    </label>
                    <input
                      type="text"
                      value={selectedStrategy.riskManagement.maxConcurrentSignals}
                      onChange={(e) => setSelectedStrategy({
                        ...selectedStrategy,
                        riskManagement: {
                          ...selectedStrategy.riskManagement,
                          maxConcurrentSignals: e.target.value
                        }
                      })}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Risco:Retorno Mínimo
                    </label>
                    <input
                      type="text"
                      value={selectedStrategy.riskManagement.rrMin}
                      onChange={(e) => setSelectedStrategy({
                        ...selectedStrategy,
                        riskManagement: {
                          ...selectedStrategy.riskManagement,
                          rrMin: e.target.value
                        }
                      })}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Botões de ação */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={saveStrategy}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar Estratégia'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                Selecione uma estratégia para editar ou crie uma nova.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal para criar nova estratégia */}
      {isCreatingNew && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Criar Nova Estratégia</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Deseja criar uma nova estratégia do zero ou duplicar a estratégia atual?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsCreatingNew(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={duplicateStrategy}
                disabled={!selectedStrategy}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Duplicar Atual
              </button>
              <button
                onClick={createNewStrategy}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Criar do Zero
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EstrategiasPage;
