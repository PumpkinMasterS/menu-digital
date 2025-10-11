module.exports = {
  // Configurações da BSC Testnet
  bsc: {
    testnet: {
      rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
      chainId: 97,
      name: 'BSC Testnet'
    }
  },
  
  // Endereço da empresa para depósitos (TESTNET)
  // IMPORTANTE: Substitua pelo seu endereço real da carteira na testnet
  companyAddress: process.env.COMPANY_BSC_ADDRESS || '0x1234567890123456789012345678901234567890',
  
  // Tokens BEP20 na Testnet
  tokens: {
    USDT: {
      address: '0xaB1a4d4f1D656d2450692d237fdD6C7f9146e814', // USDT na BSC Testnet
      decimals: 18,
      symbol: 'USDT',
      name: 'Tether USD',
      withdrawalFee: 1.0
    },
    USDC: {
      address: '0x2610601C2362C247b68c6CE6F7d70c099e22128A', // USDC na BSC Testnet
      decimals: 18,
      symbol: 'USDC',
      name: 'USD Coin',
      withdrawalFee: 1.0
    },
    BUSD: {
      address: '0xeD24FC36d8Ee4a9837a5335A771429E6c1c1d8A6', // BUSD na BSC Testnet
      decimals: 18,
      symbol: 'BUSD',
      name: 'Binance USD',
      withdrawalFee: 0.5
    },
    BNB: {
      address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB na BSC Testnet
      decimals: 18,
      symbol: 'BNB',
      name: 'Binance Coin',
      withdrawalFee: 0.005
    }
  },
  
  // Configurações de taxas
  fees: {
    network: 0.005, // BNB para gas
    withdrawal: {
      USDT: 1.0,
      USDC: 1.0,
      BUSD: 0.5,
      BNB: 0.005
    }
  },
  
  // Configurações de verificação
  verification: {
    confirmationsRequired: 3, // Menos confirmações na testnet
    checkInterval: 2 * 60 * 1000, // Intervalo menor para testes (2 minutos)
    maxRetries: 5
  },
  
  // URLs de exploradores
  explorers: {
    bsc: 'https://bscscan.com',
    bscTestnet: 'https://testnet.bscscan.com'
  },
  
  // Faucets para obter tokens de teste
  faucets: {
    bnb: 'https://testnet.binance.org/faucet-smart',
    usdt: 'https://testnet.binance.org/faucet-smart',
    usdc: 'https://testnet.binance.org/faucet-smart',
    busd: 'https://testnet.binance.org/faucet-smart'
  }
};

