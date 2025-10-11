const express = require('express');
const router = express.Router();
const SimulationController = require('../controllers/SimulationController');
const auth = require('../middleware/auth');

/**
 * @route   GET /api/simulation/status
 * @desc    Obter status da simulação
 * @access  Admin
 */
router.get('/status', auth.admin, SimulationController.getSimulationStatus);

/**
 * @route   GET /api/simulation/market-data
 * @desc    Obter dados de mercado
 * @access  Private
 */
router.get('/market-data', auth.protect, SimulationController.getMarketData);

/**
 * @route   GET /api/simulation/price-history
 * @desc    Obter histórico de preços
 * @access  Private
 */
router.get('/price-history', auth.protect, SimulationController.getPriceHistory);

/**
 * @route   POST /api/simulation/control
 * @desc    Controlar simulação (start/stop/reset)
 * @access  Admin
 */
router.post('/control', auth.admin, SimulationController.controlSimulation);

/**
 * @route   POST /api/simulation/force-trend
 * @desc    Forçar mudança de tendência
 * @access  Admin
 */
router.post('/force-trend', auth.admin, SimulationController.forceTrendChange);

/**
 * @route   POST /api/simulation/manual-trade
 * @desc    Simular trade manual
 * @access  Admin
 */
router.post('/manual-trade', auth.admin, SimulationController.simulateManualTrade);

module.exports = router;