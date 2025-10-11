# Configuração do Sistema BEP20 para Testnet

Este guia explica como configurar o sistema de transações BEP20 para usar a BSC Testnet (Binance Smart Chain Testnet) para testes.

## 📋 Pré-requisitos

1. **MetaMask** ou outra carteira compatível com BSC
2. **Node.js** instalado
3. **MongoDB** rodando localmente

## 🔧 Passo 1: Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto backend com o seguinte conteúdo:

```bash
# Configurações do Servidor
NODE_ENV=test
PORT=5000

# Configurações do Banco de Dados
MONGODB_URI=mongodb://localhost:27017/compostos_testnet

# Configurações JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

# Configurações BEP20 (BSC Testnet)
USE_BSC_TESTNET=true
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
COMPANY_BSC_ADDRESS=0x1234567890123456789012345678901234567890

# Configurações de Taxas (BEP20 Testnet)
USDT_WITHDRAWAL_FEE=1.0
USDC_WITHDRAWAL_FEE=1.0
BUSD_WITHDRAWAL_FEE=0.5
BNB_WITHDRAWAL_FEE=0.005
BNB_NETWORK_FEE=0.005
```

## 📱 Passo 2: Configurar MetaMask para BSC Testnet

1. Abra o MetaMask
2. Clique na rede atual ( Ethereum Mainnet )
3. Selecione "Adicionar rede" ou "Custom RPC"
4. Preencha os seguintes dados:

```
Nome da Rede: BSC Testnet
Novo URL da RPC: https://data-seed-prebsc-1-s1.binance.org:8545/
ID da Cadeia: 97
Símbolo da Moeda: BNB
URL do Explorador de Blocos: https://testnet.bscscan.com
```

## 💰 Passo 3: Obter Tokens de Teste

1. **Obter BNB de Teste**:
   - Vá para: https://testnet.binance.org/faucet-smart
   - Insira seu endereço da carteira MetaMask
   - Solicite BNB de teste (você precisar dele para taxas de gás)

2. **Obter Tokens BEP20 de Teste**:
   - Use o mesmo faucet para obter USDT, USDC e BUSD de teste
   - Alternativamente, você pode usar exchanges que suportam a BSC Testnet

## 🏢 Passo 4: Configurar Endereço da Empresa

1. No MetaMask, copie seu endereço da carteira
2. Substitua `0x1234567890123456789012345678901234567890` no arquivo `.env` pelo seu endereço
3. Este será o endereço que receberá todos os depósitos dos usuários

## 🚀 Passo 5: Iniciar o Servidor

```bash
cd backend
npm install
npm run dev
```

O servidor deve iniciar com a seguinte mensagem:
```
🔗 BEP20 Service inicializado na rede: BSC Testnet
📍 Endereço da empresa: 0x1234567890123456789012345678901234567890
```

## 🧪 Passo 6: Testar o Sistema

### Testar Depósito

1. No aplicativo Flutter, acesse a tela "Adicionar Fundos"
2. Selecione um token (USDT, USDC, BUSD ou BNB)
3. Copie o endereço de depósito e o memo
4. No MetaMask, envie uma pequena quantidade do token selecionado para o endereço
5. **IMPORTANTE**: Inclua o memo no campo "Memo" ou "Remarks" da transação
6. Após a transação ser confirmada, use a tela "Verificar Depósito" para confirmar

### Testar Saque

1. No aplicativo Flutter, acesse a tela "Retirar Fundos"
2. Preencha o valor e o endereço de destino
3. Confirme o saque
4. O sistema criará uma transação pendente
5. Em produção, você precisaria aprovar manualmente os saques

## 🔍 Passo 7: Verificar Transações

Você pode verificar as transações no explorador da BSC Testnet:
- https://testnet.bscscan.com

## 📝 Observações Importantes

1. **Tokens de Teste**: Os tokens na testnet não têm valor real
2. **Taxas de Gás**: Você precisará de BNB de teste para pagar as taxas de gás
3. **Confirmações**: As transações na testnet são confirmadas mais rapidamente
4. **Segurança**: Nunca use chaves privadas da testnet em produção

## 🔄 Passo 8: Mudar para Produção

Quando estiver pronto para usar a rede principal:

1. Altere `USE_BSC_TESTNET=false` no arquivo `.env`
2. Atualize `COMPANY_BSC_ADDRESS` para seu endereço real na mainnet
3. Reinicie o servidor
4. O sistema usará automaticamente a BSC Mainnet

## 🆘 Suporte

Se encontrar problemas:

1. Verifique se as variáveis de ambiente estão configuradas corretamente
2. Confirme se o MetaMask está na rede correta (BSC Testnet)
3. Verifique se você tem BNB suficiente para taxas de gás
4. Consulte os logs do servidor para mensagens de erro

