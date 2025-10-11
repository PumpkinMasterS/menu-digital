const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Rota para obter logs de auditoria
router.get('/', auth.admin, (req, res) => {
  res.json({ message: 'Funcionalidade de auditoria em desenvolvimento' });
});

module.exports = router;