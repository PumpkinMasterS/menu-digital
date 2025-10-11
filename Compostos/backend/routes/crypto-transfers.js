const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const CryptoTransferService = require('../services/CryptoTransferService');
const Robot = require('../models/Robot');
const Investment = require('../models/Investment');
const User = require('../models/User');

// Inicializar serviço
const cryptoTransferService = new CryptoTransferService();

// @route   GET /api/crypto-transfers/network-info
// @desc    Obter informações da rede atual
// @access  Private
router.get('/network-info', protect, async (req, res) => {
  try {
    const networkInfo = cryptoTransferService.getNetworkInfo();
    
    res.json({
      success: true,
      data: networkInfo
    });
  } catch (error) {
    console.error('Erro ao obter informações da rede:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   GET /api/crypto-transfers/company-address
// @desc    Obter endereço da empresa para depósitos
// @access  Private
router.get('/company-address', protect, async (req, res) => {
  try {
    const companyAddress = cryptoTransferService.getCompanyAddress();
    
    res.json({
      success: true,
      data: {
        address: companyAddress,
        network: cryptoTransferService.getNetworkInfo().name
      }
    });
  } catch (error) {
    console.error('Erro ao obter endereço da empresa:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   GET /api/crypto-transfers/tokens
// @desc    Obter tokens suportados
// @access  Private
router.get('/tokens', protect, async (req, res) => {
  try {
    const tokens = Object.keys(cryptoTransferService.tokens).map(symbol => ({
      symbol,
      ...cryptoTransferService.tokens[symbol]
    }));
    
    res.json({
      success: true,
      data: {
        tokens,
        network: cryptoTransferService.getNetworkInfo().name
      }
    });
  } catch (error) {
    console.error('Erro ao obter tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   POST /api/crypto-transfers/verify-transfer
// @desc    Verificar transferência na blockchain
// @access  Private
router.post('/verify-transfer', protect, async (req, res) => {
  try {
    const { txHash, amount, currency = 'USDT' } = req.body;
    
    if (!txHash || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Hash da transação e valor são obrigatórios'
      });
    }
    
    // Verificar se o token é suportado
    const tokenInfo = cryptoTransferService.getTokenInfo(currency);
    if (!tokenInfo) {
      return res.status(400).json({
        success: false,
        message: 'Token não suportado'
      });
    }
    
    // Verificar transferência
    const verification = await cryptoTransferService.verifyTransfer(
      txHash,
      parseFloat(amount),
      null, // fromAddress não é necessário para verificação
      cryptoTransferService.getCompanyAddress(),
      currency
    );
    
    res.json({
      success: verification.confirmed,
      data: verification,
      message: verification.confirmed ? 'Transferência confirmada' : verification.message
    });
  } catch (error) {
    console.error('Erro ao verificar transferência:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
});

// @route   POST /api/crypto-transfers/invest
// @desc    Criar investimento baseado em transferência
// @access  Private
router.post('/invest', protect, async (req, res) => {
  try {
    const { robotId, amount, currency = 'USDT', txHash } = req.body;
    
    if (!robotId || !amount || !txHash) {
      return res.status(400).json({
        success: false,
        message: 'ID do robô, valor e hash da transação são obrigatórios'
      });
    }
    
    // Verificar se o robô existe
    const robot = await Robot.findById(robotId);
    if (!robot) {
      return res.status(404).json({
        success: false,
        message: 'Robô não encontrado'
      });
    }
    
    // Verificar se o valor atende ao mínimo
    if (parseFloat(amount) < robot.minInvestment) {
      return res.status(400).json({
        success: false,
        message: `Valor mínimo para este robô é ${robot.minInvestment} ${currency}`
      });
    }
    
    // Verificar se o usuário já tem um investimento ativo neste robô
    const existingInvestment = await Investment.findOne({
      user: req.user._id,
      robot: robotId,
      status: 'active'
    });
    
    if (existingInvestment) {
      return res.status(400).json({
        success: false,
        message: 'Você já tem um investimento ativo neste robô'
      });
    }
    
    // Criar transação pendente
    const transaction = new Transaction({
      user: req.user._id,
      type: 'investment',
      amount: -parseFloat(amount),
      currency: currency,
      network: 'BEP20',
      status: 'pending',
      description: `Investimento pendente em ${robot.name}`,
      relatedEntity: robotId,
      relatedEntityType: 'Robot',
      metadata: {
        robotId: robotId,
        robotName: robot.name,
        txHash: txHash
      }
    });
    
    await transaction.save();
    
    res.json({
      success: true,
      message: 'Investimento criado com sucesso. Aguardando confirmação da transferência.',
      data: {
        transactionId: transaction._id,
        robotId: robotId,
        amount: parseFloat(amount),
        currency: currency,
        txHash: txHash,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Erro ao criar investimento:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
});

// @route   POST /api/crypto-transfers/check-pending
// @desc    Verificar transferências pendentes
// @access  Private/Admin
router.post('/check-pending', protect, async (req, res) => {
  try {
    // Verificar se o usuário é admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }
    
    const results = await cryptoTransferService.checkPendingInvestmentTransfers();
    
    res.json({
      success: true,
      message: `${results.length} transferências verificadas`,
      data: results
    });
  } catch (error) {
    console.error('Erro ao verificar transferências pendentes:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   POST /api/crypto-transfers/calculate-returns
// @desc    Calcular retornos diários
// @access  Private/Admin
router.post('/calculate-returns', protect, async (req, res) => {
  try {
    // Verificar se o usuário é admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }
    
    const results = await cryptoTransferService.calculateDailyReturns();
    
    res.json({
      success: true,
      message: `${results.length} retornos calculados`,
      data: results
    });
  } catch (error) {
    console.error('Erro ao calcular retornos diários:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   GET /api/crypto-transfers/robot/:robotId/investment-info
// @desc    Obter informações de investimento para um robô
// @access  Private
router.get('/robot/:robotId/investment-info', protect, async (req, res) => {
  try {
    const { robotId } = req.params;
    
    // Verificar se o robô existe
    const robot = await Robot.findById(robotId);
    if (!robot) {
      return res.status(404).json({
        success: false,
        message: 'Robô não encontrado'
      });
    }
    
    // Verificar se o usuário já tem um investimento ativo
    const existingInvestment = await Investment.findOne({
      user: req.user._id,
      robot: robotId,
      status: 'active'
    });
    
    // Calcular informações de investimento
    const networkInfo = cryptoTransferService.getNetworkInfo();
    
    res.json({
      success: true,
      data: {
        robot: {
          id: robot._id,
          name: robot.name,
          description: robot.description,
          minInvestment: robot.minInvestment,
          maxInvestment: robot.maxInvestment,
          dailyProfit: robot.dailyProfit,
          duration: robot.duration,
          imageUrl: robot.imageUrl,
          riskLevel: robot.riskLevel
        },
        hasActiveInvestment: !!existingInvestment,
        networkInfo: {
          name: networkInfo.name,
          companyAddress: networkInfo.companyAddress,
          explorerUrl: networkInfo.explorerUrl
        },
        supportedTokens: Object.keys(cryptoTransferService.tokens).map(symbol => ({
          symbol,
          ...cryptoTransferService.tokens[symbol]
        }))
      }
    });
  } catch (error) {
    console.error('Erro ao obter informações de investimento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router;
