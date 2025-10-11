const express = require('express');
const auth = require('../middleware/auth');
const TradingController = require('../controllers/TradingController');

const router = express.Router();

// 🔐 Todas as rotas requerem autenticação
router.use(auth.protect);

// 📊 Configurações de Trading
router.put('/robot/:robotId/config', TradingController.configureTrading);
router.get('/robot/:robotId/config', TradingController.getTradingConfig);

// 🎯 Execução de Trades
router.post('/robot/:robotId/trade/manual', TradingController.executeManualTrade);

// 📈 Estatísticas e Monitoramento
router.get('/stats', TradingController.getTradingStats);
router.get('/robot/:robotId/history', TradingController.getTradeHistory);
router.post('/monitoring', TradingController.toggleMonitoring);

// 🔌 Testes e Utilidades
router.post('/test-connection', TradingController.testExchangeConnection);
router.get('/price', TradingController.getCurrentPrice);

module.exports = router;