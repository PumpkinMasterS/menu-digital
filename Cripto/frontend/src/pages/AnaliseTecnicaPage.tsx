import React, { useState, useEffect } from 'react';
import { TradingChart } from '../components/TradingChart';

interface SignalResult {
  symbol: string;
  timeframe: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasons: string[];
  timestamp: number;
  strategyId: string;
  strategyName: string;
}

interface IndicatorData {
  rsi?: number;
  ema?: {
    short?: number;
    long?: number;
  };
  atr?: number;
  macd?: {
    macd: number;
    signal: number;
    histogram: number;
  };
}

interface PageProps {
  // Props para a página, se necessário
}

const AnaliseTecnicaPage: React.FC<PageProps> = () => {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('1m');
  const [showIndicators, setShowIndicators] = useState(true);
  const [signals, setSignals] = useState<SignalResult[]>([]);
  const [indicators, setIndicators] = useState<IndicatorData | null>(null);
  const [loading, setLoading] = useState(false);

  const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT'];
  const timeframes = ['1m', '3m', '5m', '15m', '1h', '4h'];

  // Carrega sinais e indicadores quando o símbolo ou timeframe mudar
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      try {
        // Busca sinais
        const signalsResponse = await fetch(`/api/v1/signals/evaluate/${symbol}/${timeframe}`);
        if (signalsResponse.ok) {
          const signalsData = await signalsResponse.json();
          if (signalsData.ok) {
            setSignals(signalsData.data || []);
          }
        }

        // Busca indicadores
        const indicatorsResponse = await fetch(`/api/v1/indicators/latest/${symbol}/${timeframe}`);
        if (indicatorsResponse.ok) {
          const indicatorsData = await indicatorsResponse.json();
          if (indicatorsData.ok) {
            setIndicators(indicatorsData.data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol, timeframe]);

  // Determina o sinal principal e sua cor
  const getMainSignal = () => {
    if (signals.length === 0) return { signal: 'HOLD' as const, color: 'text-yellow-600' };
    
    // Filtra apenas sinais BUY ou SELL
    const buySellSignals = signals.filter(s => s.signal !== 'HOLD');
    if (buySellSignals.length === 0) return { signal: 'HOLD' as const, color: 'text-yellow-600' };
    
    // Se houver apenas um tipo de sinal (todos BUY ou todos SELL)
    const allBuy = buySellSignals.every(s => s.signal === 'BUY');
    const allSell = buySellSignals.every(s => s.signal === 'SELL');
    
    if (allBuy) return { signal: 'BUY' as const, color: 'text-green-600' };
    if (allSell) return { signal: 'SELL' as const, color: 'text-red-600' };
    
    // Conflito de sinais
    return { signal: 'HOLD' as const, color: 'text-yellow-600' };
  };

  const mainSignal = getMainSignal();

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Análise Técnica</h1>
        
        {/* Controles do gráfico */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div>
            <label htmlFor="symbol-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Símbolo
            </label>
            <select
              id="symbol-select"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {symbols.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="timeframe-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Timeframe
            </label>
            <select
              id="timeframe-select"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {timeframes.map((tf) => (
                <option key={tf} value={tf}>
                  {tf}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showIndicators}
                onChange={(e) => setShowIndicators(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Mostrar Indicadores</span>
            </label>
          </div>
        </div>
      </div>

      {/* Gráfico de trading */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
        <TradingChart
          symbol={symbol}
          timeframe={timeframe}
          height={600}
          showIndicators={showIndicators}
        />
      </div>

      {/* Informações do símbolo */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Indicadores Técnicos</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">RSI (14):</span>
              <span className="font-medium">{indicators?.rsi ? indicators.rsi.toFixed(2) : 'Carregando...'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">EMA (50):</span>
              <span className="font-medium">{indicators?.ema?.short ? indicators.ema.short.toFixed(2) : 'Carregando...'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">EMA (200):</span>
              <span className="font-medium">{indicators?.ema?.long ? indicators.ema.long.toFixed(2) : 'Carregando...'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">ATR (14):</span>
              <span className="font-medium">{indicators?.atr ? indicators.atr.toFixed(2) : 'Carregando...'}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Sinais</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Sinal Atual:</span>
              <span className={`font-medium ${mainSignal.color}`}>{mainSignal.signal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Estratégias Ativas:</span>
              <span className="font-medium">{signals.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Confiança:</span>
              <span className="font-medium">
                {signals.length > 0 
                  ? `${(signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length * 100).toFixed(0)}%`
                  : 'N/A'
                }
              </span>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Estratégia</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Estratégia Ativa:</span>
              <span className="font-medium">
                {signals.length > 0 ? signals[0].strategyName : 'Nenhuma'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Stop Loss:</span>
              <span className="font-medium">N/A</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Take Profit:</span>
              <span className="font-medium">N/A</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detalhes dos sinais */}
      {signals.length > 0 && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Detalhes dos Sinais</h3>
          <div className="space-y-3">
            {signals.map((signal, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-md p-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">{signal.strategyName}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Sinal: <span className={`font-medium ${
                        signal.signal === 'BUY' ? 'text-green-600' : 
                        signal.signal === 'SELL' ? 'text-red-600' : 'text-yellow-600'
                      }`}>{signal.signal}</span>
                      {' • Confiança: '}
                      <span className="font-medium">{(signal.confidence * 100).toFixed(0)}%</span>
                    </p>
                  </div>
                  <div className={`px-2 py-1 text-xs rounded ${
                    signal.signal === 'BUY' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                    signal.signal === 'SELL' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}>
                    {signal.signal}
                  </div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p className="font-medium mb-1">Motivos:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {signal.reasons.map((reason, reasonIndex) => (
                      <li key={reasonIndex}>{reason}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnaliseTecnicaPage;
