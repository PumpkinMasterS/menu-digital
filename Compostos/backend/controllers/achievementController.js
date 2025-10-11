const Achievement = require('../models/Achievement');
const UserAchievement = require('../models/UserAchievement');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');
const AchievementService = require('../services/achievementService');

// Instantiate service
const achievementService = new AchievementService();

// @desc    Obter todas as conquistas disponíveis
// @route   GET /api/achievements
// @access  Private
const getAchievements = asyncHandler(async (req, res) => {
  const achievements = await Achievement.find({ isActive: true })
    .select('-__v')
    .sort({ category: 1, points: 1 });

  res.status(200).json({
    success: true,
    count: achievements.length,
    data: achievements
  });
});

// @desc    Obter conquistas de um usuário
// @route   GET /api/achievements/user
// @access  Private
const getUserAchievements = asyncHandler(async (req, res) => {
  const userAchievements = await UserAchievement.find({ user: req.user.id })
    .populate('achievement', 'name description icon category points')
    .select('-__v')
    .sort({ unlockedAt: -1 });

  const achievements = userAchievements.map(ua => ({
    ...ua.achievement.toObject(),
    unlockedAt: ua.unlockedAt,
    isNew: ua.isNew,
    progress: ua.progress,
    rewardClaimed: ua.rewardClaimed
  }));

  res.status(200).json({
    success: true,
    count: achievements.length,
    data: achievements
  });
});

// @desc    Obter conquistas não lidas de um usuário
// @route   GET /api/achievements/user/unread
// @access  Private
const getUnreadAchievements = asyncHandler(async (req, res) => {
  const unreadAchievements = await UserAchievement.find({ 
    user: req.user.id, 
    isNew: true 
  })
    .populate('achievement', 'name description icon category points')
    .select('-__v')
    .sort({ unlockedAt: -1 });

  res.status(200).json({
    success: true,
    count: unreadAchievements.length,
    data: unreadAchievements
  });
});

// @desc    Marcar conquista como lida
// @route   PUT /api/achievements/:id/read
// @access  Private
const markAsRead = asyncHandler(async (req, res) => {
  const userAchievement = await UserAchievement.findOne({
    _id: req.params.id,
    user: req.user.id
  });

  if (!userAchievement) {
    return res.status(404).json({
      success: false,
      message: 'Conquista não encontrada'
    });
  }

  userAchievement.isNew = false;
  await userAchievement.save();

  res.status(200).json({
    success: true,
    message: 'Conquista marcada como lida',
    data: userAchievement
  });
});

// @desc    Resgatar recompensa de conquista
// @route   PUT /api/achievements/:id/claim
// @access  Private
const claimReward = asyncHandler(async (req, res) => {
  const userAchievement = await UserAchievement.findOne({
    _id: req.params.id,
    user: req.user.id
  }).populate('achievement');

  if (!userAchievement) {
    return res.status(404).json({
      success: false,
      message: 'Conquista não encontrada'
    });
  }

  if (userAchievement.rewardClaimed) {
    return res.status(400).json({
      success: false,
      message: 'Recompensa já resgatada'
    });
  }

  const achievement = userAchievement.achievement;
  
  // Aplicar recompensa baseada no tipo
  switch (achievement.reward.type) {
    case 'cashback_bonus':
      // Adicionar bônus de cashback ao usuário
      req.user.totalCashbackReceived += achievement.reward.value;
      req.user.balance += achievement.reward.value;
      break;
    case 'extra_cashback':
      // Adicionar taxa extra de cashback (implementar lógica específica)
      // Esta seria implementada no serviço de cashback
      break;
    default:
      // Para badges, titles, etc. - apenas marcar como resgatado
      break;
  }

  userAchievement.rewardClaimed = true;
  await userAchievement.save();
  await req.user.save();

  res.status(200).json({
    success: true,
    message: 'Recompensa resgatada com sucesso',
    data: {
      reward: achievement.reward,
      newBalance: req.user.balance
    }
  });
});

// @desc    Verificar e atualizar conquistas do usuário
// @route   POST /api/achievements/check
// @access  Private
const checkUserAchievements = asyncHandler(async (req, res) => {
  const newAchievements = await achievementService.checkAllAchievements(req.user.id);

  res.status(200).json({
    success: true,
    message: `Verificação concluída. ${newAchievements.length} nova(s) conquista(s) desbloqueada(s)`,
    data: newAchievements
  });
});

// Função auxiliar para verificar e conceder conquistas (mantida para compatibilidade)
const checkAndAwardAchievements = async (user) => {
  return await achievementService.checkAllAchievements(user.id);
};

// Função para obter dados do usuário para verificação de conquistas (mantida para compatibilidade)
const getUserDataForAchievementCheck = async (user, achievement) => {
  const userData = user.toObject();
  
  // Adicionar dados adicionais específicos para conquistas
  switch (achievement.type) {
    case 'investment':
      // Já temos totalInvested, investmentsCount, etc.
      break;
    case 'cashback':
      // Já temos totalCashbackReceived
      break;
    case 'referral':
      // Obter contagem de referrals
      const referralCount = await User.countDocuments({ referredBy: user._id });
      userData.referralCount = referralCount;
      break;
    case 'robot':
      // Dados específicos de robôs (seriam obtidos de outra coleção)
      break;
  }

  return userData;
};

module.exports = {
  getAchievements,
  getUserAchievements,
  getUnreadAchievements,
  markAsRead,
  claimReward,
  checkUserAchievements,
  checkAndAwardAchievements
};