const express = require('express');
const auth = require('../middleware/auth');
const CommissionController = require('../controllers/CommissionController');

const router = express.Router();

// 🔐 Todas as rotas requerem autenticação
router.use(auth.protect);

// 📊 Comissões do usuário
router.get('/', CommissionController.getUserCommissions);
router.get('/stats', CommissionController.getCommissionStats);

// 🔍 Filtros e busca
router.get('/search', CommissionController.searchCommissions);
router.get('/filter', CommissionController.filterCommissions);

// 📈 Dashboard de comissões
router.get('/dashboard', CommissionController.getCommissionDashboard);

// 👑 Rotas de administrador (apenas para admins)
router.use(auth.admin);
router.get('/admin/all', CommissionController.getAllCommissions);
router.put('/admin/:commissionId/status', CommissionController.updateCommissionStatus);
router.post('/admin/generate-manual', CommissionController.generateManualCommission);
router.get('/admin/stats', CommissionController.getAdminCommissionStats);

module.exports = router;