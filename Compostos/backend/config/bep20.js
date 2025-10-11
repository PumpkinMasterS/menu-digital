module.exports = {
  // Configurações da BSC (Binance Smart Chain)
  bsc: {
    mainnet: {
      rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org/',
      chainId: 56,
      name: 'BSC Mainnet'
    },
    testnet: {
      rpcUrl: process.env.BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/',
      chainId: 97,
      name: 'BSC Testnet'
    }
  },
  
  // Endereço da empresa para depósitos
  companyAddress: process.env.COMPANY_BSC_ADDRESS || '0x1234567890123456789012345678901234567890',
  
  // Tokens BEP20 suportados
  tokens: {
    USDT: {
      address: '0x55d398326f99059fF775485246999027B3197955',
      decimals: 18,
      symbol: 'USDT',
      name: 'Tether USD',
      withdrawalFee: parseFloat(process.env.USDT_WITHDRAWAL_FEE || '1.0')
    },
    USDC: {
      address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      decimals: 18,
      symbol: 'USDC',
      name: 'USD Coin',
      withdrawalFee: parseFloat(process.env.USDC_WITHDRAWAL_FEE || '1.0')
    },
    BUSD: {
      address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
      decimals: 18,
      symbol: 'BUSD',
      name: 'Binance USD',
      withdrawalFee: parseFloat(process.env.BUSD_WITHDRAWAL_FEE || '0.5')
    },
    BNB: {
      address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      decimals: 18,
      symbol: 'BNB',
      name: 'Binance Coin',
      withdrawalFee: parseFloat(process.env.BNB_WITHDRAWAL_FEE || '0.005')
    }
  },
  
  // Configurações de taxas
  fees: {
    network: parseFloat(process.env.BNB_NETWORK_FEE || '0.005'), // BNB para gas
    withdrawal: {
      USDT: parseFloat(process.env.USDT_WITHDRAWAL_FEE || '1.0'),
      USDC: parseFloat(process.env.USDC_WITHDRAWAL_FEE || '1.0'),
      BUSD: parseFloat(process.env.BUSD_WITHDRAWAL_FEE || '0.5'),
      BNB: parseFloat(process.env.BNB_WITHDRAWAL_FEE || '0.005')
    }
  },
  
  // Configurações de verificação
  verification: {
    confirmationsRequired: 12, // Número de confirmações necessárias
    checkInterval: 5 * 60 * 1000, // Intervalo de verificação em ms (5 minutos)
    maxRetries: 10 // Máximo de tentativas de verificação
  },
  
  // URLs de exploradores
  explorers: {
    bsc: 'https://bscscan.com',
    bscTestnet: 'https://testnet.bscscan.com'
  }
};

