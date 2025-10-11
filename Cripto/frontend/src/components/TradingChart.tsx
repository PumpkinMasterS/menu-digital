import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, LineData, Time } from 'lightweight-charts';

interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
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

interface TradingChartProps {
  symbol: string;
  timeframe: string;
  height?: number;
  showIndicators?: boolean;
  indicators?: IndicatorData[];
}

export const TradingChart: React.FC<TradingChartProps> = ({
  symbol,
  timeframe,
  height = 500,
  showIndicators = true,
  indicators = []
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chart, setChart] = useState<IChartApi | null>(null);
  const [candlestickSeries, setCandlestickSeries] = useState<ISeriesApi<'Candlestick'> | null>(null);
  const [emaShortSeries, setEmaShortSeries] = useState<ISeriesApi<'Line'> | null>(null);
  const [emaLongSeries, setEmaLongSeries] = useState<ISeriesApi<'Line'> | null>(null);
  const [rsiSeries, setRsiSeries] = useState<ISeriesApi<'Line'> | null>(null);
  const [volumeSeries, setVolumeSeries] = useState<ISeriesApi<'Histogram'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inicializa o gráfico
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chartInstance = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height,
      layout: {
        background: { color: 'transparent' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: 'rgba(197, 203, 209, 0.5)' },
        horzLines: { color: 'rgba(197, 203, 209, 0.5)' },
      },
      crosshair: {
        mode: 1,
      },
      timeScale: {
        borderColor: 'rgba(197, 203, 209, 1)',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: 'rgba(197, 203, 209, 1)',
      },
    });

    // Adiciona série de candles
    const candlestick = chartInstance.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Adiciona série de volume
    const volume = chartInstance.addHistogramSeries({
      color: 'rgba(76, 175, 80, 0.5)',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
      scaleMargins: {
        top: 0.85,
        bottom: 0,
      },
    });

    // Adiciona séries de indicadores se habilitado
    let emaShort: ISeriesApi<'Line'> | null = null;
    let emaLong: ISeriesApi<'Line'> | null = null;
    let rsi: ISeriesApi<'Line'> | null = null;

    if (showIndicators) {
      // EMA Curta
      emaShort = chartInstance.addLineSeries({
        color: '#2196F3',
        lineWidth: 2,
        title: 'EMA 50',
      });

      // EMA Longa
      emaLong = chartInstance.addLineSeries({
        color: '#FF9800',
        lineWidth: 2,
        title: 'EMA 200',
      });

      // RSI (em painel separado)
      const rsiPane = chartInstance.addLineSeries({
        color: '#9C27B0',
        lineWidth: 2,
        title: 'RSI',
        priceScaleId: 'rsi',
        scaleMargins: {
          top: 0.1,
          bottom: 0.8,
        },
      });
      rsi = rsiPane;
    }

    setChart(chartInstance);
    setCandlestickSeries(candlestick);
    setVolumeSeries(volume);
    setEmaShortSeries(emaShort);
    setEmaLongSeries(emaLong);
    setRsiSeries(rsi);

    // Ajusta o tamanho do gráfico quando a janela for redimensionada
    const handleResize = () => {
      if (chartContainerRef.current) {
        chartInstance.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.remove();
    };
  }, [height, showIndicators]);

  // Carrega os dados do servidor
  useEffect(() => {
    const fetchData = async () => {
      if (!candlestickSeries) return;

      setLoading(true);
      setError(null);

      try {
        // Busca candles
        const candlesResponse = await fetch(`/api/v1/indicators/candles/${symbol}/${timeframe}?limit=200`);
        if (!candlesResponse.ok) {
          throw new Error(`Failed to fetch candles: ${candlesResponse.statusText}`);
        }

        const candlesData = await candlesResponse.json();
        if (!candlesData.ok) {
          throw new Error(candlesData.error || 'Failed to fetch candles');
        }

        // Converte os dados para o formato do gráfico
        const candlestickData: CandlestickData[] = candlesData.data.map((candle: CandleData) => ({
          time: (candle.timestamp / 1000) as Time,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        }));

        // Atualiza a série de candles
        candlestickSeries.setData(candlestickData);

        // Atualiza a série de volume
        if (volumeSeries) {
          const volumeData = candlesData.data.map((candle: CandleData) => ({
            time: (candle.timestamp / 1000) as Time,
            value: candle.volume,
            color: candle.close >= candle.open ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)',
          }));
          volumeSeries.setData(volumeData);
        }

        // Busca indicadores mais recentes
        if (showIndicators) {
          const indicatorsResponse = await fetch(`/api/v1/indicators/latest/${symbol}/${timeframe}`);
          if (indicatorsResponse.ok) {
            const indicatorsData = await indicatorsResponse.json();
            if (indicatorsData.ok && indicatorsData.data) {
              const latestIndicator = indicatorsData.data;

              // Atualiza EMAs
              if (emaShortSeries && latestIndicator.ema?.short) {
                emaShortSeries.setData([
                  { time: (candlesData.data[candlesData.data.length - 1].timestamp / 1000) as Time, value: latestIndicator.ema.short }
                ]);
              }

              if (emaLongSeries && latestIndicator.ema?.long) {
                emaLongSeries.setData([
                  { time: (candlesData.data[candlesData.data.length - 1].timestamp / 1000) as Time, value: latestIndicator.ema.long }
                ]);
              }

              // Atualiza RSI
              if (rsiSeries && latestIndicator.rsi) {
                rsiSeries.setData([
                  { time: (candlesData.data[candlesData.data.length - 1].timestamp / 1000) as Time, value: latestIndicator.rsi }
                ]);
              }
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol, timeframe, candlestickSeries, volumeSeries, emaShortSeries, emaLongSeries, rsiSeries, showIndicators]);

  return (
    <div className="w-full">
      {loading && (
        <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded">
          <div className="text-gray-600 dark:text-gray-400">Carregando gráfico...</div>
        </div>
      )}
      {error && (
        <div className="flex items-center justify-center h-64 bg-red-50 dark:bg-red-900/20 rounded">
          <div className="text-red-600 dark:text-red-400">Erro: {error}</div>
        </div>
      )}
      <div ref={chartContainerRef} className="w-full" style={{ display: loading || error ? 'none' : 'block' }} />
    </div>
  );
};
