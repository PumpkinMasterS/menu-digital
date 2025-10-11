# Bot de Trading Automático de Cripto

Um sistema completo de bot de trading automatizado para criptomoedas com análise técnica, backtesting e execução de ordens em tempo real.

## Funcionalidades

- 📊 **Análise Técnica em Tempo Real**: Indicadores técnicos (RSI, EMA, ATR, MACD)
- 🎯 **Motor de Sinais Configurável**: Sistema rule-agnostic para estratégias personalizadas
- 📈 **Backtesting Completo**: Valide estratégias com dados históricos
- 💰 **Execução de Ordens**: Integração com Bybit (suporte para Binance em desenvolvimento)
- 📉 **Gestão de Risco**: Controle de drawdown, tamanho de posição e kill switches
- 💾 **Persistência de Dados**: Redis para cache e histórico
- 🖥️ **Interface Visual**: Dashboard completo com gráficos e métricas

## Arquitetura

### Backend (Node.js + TypeScript)
- **Servidor Fastify**: API RESTful com plugins modulares
- **Motores de Análise**: Indicadores técnicos e geração de sinais
- **Conectores de Exchange**: Integração com Bybit via WebSocket e REST
- **Sistema de Execução**: Paper trading e execução real
- **Persistência**: Redis para cache e histórico

### Frontend (React + TypeScript)
- **Interface Responsiva**: Tailwind CSS para design moderno
- **Gráficos Interativos**: TradingView Lightweight Charts
- **Dashboard Completo**: Métricas, PnL e posições em tempo real
- **Construtor de Estratégias**: Interface visual para configuração de regras

## Configuração

### Pré-requisitos
- Node.js 18+
- Redis 6+
- npm ou yarn

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/cripto-trading-bot.git
cd cripto-trading-bot
```

2. Instale as dependências do backend:
```bash
cd cripto-backend
npm install
```

3. Instale as dependências do frontend:
```bash
cd ../cripto-frontend
npm install
```

### Configuração de Variáveis de Ambiente

Crie um arquivo `.env` no diretório `cripto-backend` com as seguintes variáveis:

```env
# Configurações do Servidor
PORT=3000
HOST=0.0.0.0

# Configurações do Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Configurações da Bybit
BYBIT_API_KEY=sua_api_key_aqui
BYBIT_API_SECRET=sua_api_secret_aqui
BYBIT_TESTNET=true

# Configurações de Execução
ENABLE_PAPER_TRADING=true

# Configurações de Risco
MAX_POSITION_SIZE=1000
MAX_DAILY_LOSS=500
MAX_OPEN_POSITIONS=5
DEFAULT_LEVERAGE=10
COMMISSION_RATE=0.1
SLIPPAGE_RATE=0.05

# Configurações de Persistência
CANDLES_RETENTION_DAYS=30
INDICATORS_RETENTION_DAYS=7
SIGNALS_RETENTION_DAYS=14
MAX_CANDLES_PER_SYMBOL=10000
```

### Executando a Aplicação

1. Inicie o Redis:
```bash
redis-server
```

2. Inicie o backend:
```bash
cd cripto-backend
npm run dev
```

3. Inicie o frontend:
```bash
cd ../cripto-frontend
npm run dev
```

4. Acesse a aplicação em `http://localhost:5173`

## Uso

### 1. Configurando Estratégias

1. Navegue para a página **Estratégias**
2. Clique em **Adicionar Estratégia**
3. Defina as condições usando indicadores técnicos
4. Configure stop loss e take profit
5. Defina parâmetros de gestão de risco

### 2. Backtesting

1. Navegue para a página **Backtesting**
2. Configure os parâmetros do backtest:
   - Símbolo e timeframe
   - Período de análise
   - Balance inicial e tamanho da posição
3. Execute o backtest e analise os resultados

### 3. Execução de Ordens

1. Navegue para a página **Execução**
2. Configure os parâmetros de risco
3. Ative o executor de ordens
4. Monitore posições abertas e PnL

### 4. Análise Técnica

1. Navegue para a página **Análise Técnica**
2. Selecione o símbolo e timeframe
3. Visualize indicadores em tempo real
4. Analise sinais gerados pelas estratégias

## Estrutura do Projeto

```
cripto-trading-bot/
├── cripto-backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── indicators/     # Indicadores técnicos
│   │   │   ├── signals/        # Motor de sinais
│   │   │   ├── exchanges/      # Conectores de exchange
│   │   │   ├── execution/      # Execução de ordens
│   │   │   ├── backtesting/    # Sistema de backtesting
│   │   │   ├── persistence/    # Persistência de dados
│   │   │   ├── risk/           # Gestão de risco
│   │   │   └── observability/  # Métricas e logs
│   │   └── index.ts            # Servidor principal
│   └── package.json
├── cripto-frontend/
│   ├── src/
│   │   ├── components/         # Componentes React
│   │   ├── pages/              # Páginas da aplicação
│   │   └── App.tsx             # Aplicação principal
│   └── package.json
└── docs/                       # Documentação
```

## Estratégias de Exemplo

### RSI Oversold

```json
{
  "name": "RSI Oversold",
  "conditions": [
    {
      "indicator": "rsi",
      "operator": "less_than",
      "value": "30",
      "timeframe": "1h"
    }
  ],
  "stopLoss": {
    "mode": "percent",
    "value": "2"
  },
  "takeProfit": {
    "mode": "percent",
    "value": "4"
  }
}
```

### EMA Crossover

```json
{
  "name": "EMA 50/200 Crossover",
  "conditions": [
    {
      "indicator": "ema_short",
      "operator": "crosses_above",
      "value": "ema_long",
      "timeframe": "4h"
    }
  ],
  "stopLoss": {
    "mode": "atrMultiple",
    "value": "1.5"
  },
  "takeProfit": {
    "mode": "atrMultiple",
    "value": "3"
  }
}
```

## Gestão de Risco

O sistema inclui múltiplas camadas de gestão de risco:

1. **Limites Diários**: Perda máxima diária configurável
2. **Tamanho de Posição**: Limite máximo por posição
3. **Número de Posições**: Limite máximo de posições abertas
4. **Kill Switch**: Parada manual de todas as operações
5. **Stop Loss/Take Profit**: Automatização de saídas

## Métricas e Monitoramento

O sistema coleta e exibe múltiplas métricas:

- PnL total e diário
- Taxa de acerto (win rate)
- Fator de lucro (profit factor)
- Sharpe ratio
- Máximo drawdown
- Número de trades
- Retorno sobre o capital

## Contribuição

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## Aviso Legal

Este software é para fins educacionais e de pesquisa. Trading de criptomoedas envolve risco significativo e pode resultar em perdas financeiras. Use por sua conta e risco.