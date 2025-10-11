const express = require('express');
const {
  getAchievements,
  getUserAchievements,
  getUnreadAchievements,
  markAsRead,
  claimReward,
  checkUserAchievements
} = require('../controllers/achievementController');

const router = express.Router();

const { protect } = require('../middleware/auth');

// Todas as rotas requerem autenticação
router.use(protect);

// Rotas públicas de conquistas
router.route('/')
  .get(getAchievements);

// Rotas específicas do usuário
router.route('/user')
  .get(getUserAchievements);

router.route('/user/unread')
  .get(getUnreadAchievements);

router.route('/check')
  .post(checkUserAchievements);

// Rotas para ações específicas
router.route('/:id/read')
  .put(markAsRead);

router.route('/:id/claim')
  .put(claimReward);

module.exports = router;