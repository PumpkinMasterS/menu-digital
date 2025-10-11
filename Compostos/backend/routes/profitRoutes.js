const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ProfitCollectionJob = require('../jobs/profitCollectionJob');

// Rota para forçar coleta manual (apenas admin)
router.post('/force-collection', auth.protect, async (req, res) => {
  try {
    const profitJob = new ProfitCollectionJob();
    
    // Verifica se o usuário é admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Apenas administradores podem forçar coleta de lucros' 
      });
    }

    await profitJob.forceCollection();
    
    res.json({ 
      message: 'Coleta de lucros forçada com sucesso',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao forçar coleta:', error);
    res.status(500).json({ 
      message: 'Erro interno ao forçar coleta de lucros',
      error: error.message 
    });
  }
});

// Rota para obter status do coletor
router.get('/status', auth.protect, async (req, res) => {
  try {
    const profitJob = new ProfitCollectionJob();
    
    res.json({
      isRunning: profitJob.isRunning,
      lastRun: profitJob.lastRun,
      nextRun: profitJob.nextRun,
      message: 'Coletor automático de lucros ativo'
    });

  } catch (error) {
    console.error('Erro ao obter status:', error);
    res.status(500).json({ 
      message: 'Erro interno ao obter status do coletor',
      error: error.message 
    });
  }
});

module.exports = router;