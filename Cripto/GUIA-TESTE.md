# Guia de Teste do Bot de Trading Cripto

## Pré-requisitos

1. Node.js instalado
2. Navegador web (Chrome, Firefox, etc.)
3. Chaves API da Bybit configuradas

## Configuração Inicial

### 1. Configurar Variáveis de Ambiente

O arquivo `.env` já foi criado com suas credenciais da Bybit:
```
BYBIT_API_KEY=wQqFsMN1KRMz36rOpW
BYBIT_API_SECRET=mYsgTV6S5KUZcy5yJxa76C1k2VETPJ6Wi8to
BYBIT_TESTNET=true
ENABLE_PAPER_TRADING=true
```

### 2. Instalar Dependências

```bash
# No diretório raiz (C:\Projetos\Cripto)
npm install

# No diretório frontend
cd frontend
npm install
```

## Iniciar os Servidores

### 1. Backend

```bash
# No diretório raiz
npm run dev
```

O backend estará disponível em: http://localhost:3000

### 2. Frontend

```bash
# Em outro terminal, no diretório frontend
cd frontend
npm run dev
```

O frontend estará disponível em: http://localhost:5173

## Teste do Bot

### 1. Acessar o Frontend

Abra seu navegador e acesse: http://localhost:5173

### 2. Verificar Conexão com Bybit

1. Navegue até a página "Bybit" no menu
2. Verifique se os dados estão sendo recebidos
3. Confirme se o status da conexão aparece como "Conectado"

### 3. Configurar Estratégias

1. Vá para a página "Configurações"
2. Configure as estratégias desejadas:
   - Símbolos: BTCUSDT, ETHUSDT
   - Timeframes: 1m, 5m, 15m
   - Indicadores: RSI, EMA, MACD
   - Condições de compra/venda

### 4. Ativar Execução de Ordens

1. Navegue até a página "Execução"
2. Verifique o status do executor de ordens
3. Se necessário, clique em "Iniciar Executor"
4. Confirme se o modo paper trading está ativo

### 5. Monitorar Sinais

1. Na página "Dashboard", monitore os sinais gerados
2. Verifique se os sinais aparecem em tempo real
3. Observe as condições que geraram cada sinal

### 6. Verificar Posições

1. Na página "Execução", verifique as posições abertas
2. Monitore o saldo da carteira
3. Acompanhe as estatísticas diárias

### 7. Testar Backtesting

1. Vá para a página "Backtesting"
2. Configure o período para teste
3. Selecione as estratégias para testar
4. Execute o backtesting e analise os resultados

## Verificação de Logs

### Backend

Verifique os logs no terminal onde o backend está rodando. Procure por:
- Conexão WebSocket com Bybit
- Geração de sinais
- Execução de ordens
- Erros ou avisos

### Frontend

Abra o console do navegador (F12) para verificar:
- Requisições API
- Erros de JavaScript
- Conexão WebSocket

## Problemas Comuns

### 1. Redis não está rodando

Se você vir erros relacionados ao Redis:
- Instale o Redis para Windows ou use Docker
- Ou modifique o código para usar armazenamento em memória temporariamente

### 2. Erros de API da Bybit

- Verifique se as chaves API estão corretas
- Confirme se o testnet está ativado
- Verifique se as permissões da API são "Transação API"

### 3. Dados não aparecem

- Verifique a conexão com a internet
- Confirme se o WebSocket está conectado
- Reinicie os servidores se necessário

## Teste de Carga

Para testar o bot sob carga:
1. Configure múltiplos símbolos
2. Use timeframes menores (1m)
3. Monitore o uso de CPU e memória
4. Verifique se há sinais perdidos

## Próximos Passos

Após testar:
1. Ajuste as estratégias conforme necessário
2. Otimize os parâmetros dos indicadores
3. Considere adicionar mais exchanges
4. Implemente alertas por e-mail ou Telegram

## Suporte

Se encontrar problemas:
1. Verifique os logs do backend
2. Confirme as configurações no arquivo .env
3. Teste com diferentes símbolos/timeframes
4. Consulte a documentação em docs/

