const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const ReferralReward = require('../models/ReferralReward');

// @route   GET /api/referrals
// @desc    Get user referral rewards
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const rewards = await ReferralReward.find({ referrerId: req.user.id })
      .sort({ date: -1 })
      .populate('referredUser', 'name email');
    
    res.json(rewards);
  } catch (error) {
    console.error('Error fetching referral rewards:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/referrals/stats
// @desc    Get referral statistics
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const rewards = await ReferralReward.find({ referrerId: req.user.id });
    
    const firstLevelRewards = rewards.filter(reward => reward.level === 'first');
    const secondLevelRewards = rewards.filter(reward => reward.level === 'second');
    
    const stats = {
      totalEarnings: rewards.reduce((sum, reward) => sum + reward.amount, 0),
      firstLevelCount: firstLevelRewards.length,
      secondLevelCount: secondLevelRewards.length,
      firstLevelEarnings: firstLevelRewards.reduce((sum, reward) => sum + reward.amount, 0),
      secondLevelEarnings: secondLevelRewards.reduce((sum, reward) => sum + reward.amount, 0),
      totalReferrals: rewards.length,
      referralCode: req.user.referralCode
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/referrals/generate-code
// @desc    Generate referral code for user
// @access  Private
router.post('/generate-code', protect, async (req, res) => {
  try {
    if (req.user.referralCode) {
      return res.status(400).json({ message: 'User already has a referral code' });
    }
    
    const referralCode = generateUniqueReferralCode(req.user.id);
    
    req.user.referralCode = referralCode;
    await req.user.save();
    
    res.json({ referralCode });
  } catch (error) {
    console.error('Error generating referral code:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/referrals/process
// @desc    Process a new referral (internal use)
// @access  Private
router.post('/process', protect, async (req, res) => {
  try {
    const { referredUserId, transactionAmount } = req.body;
    
    if (!referredUserId || !transactionAmount) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Process 1st level referral
    const firstLevelReward = new ReferralReward({
      referrerId: req.user.id,
      referredId: referredUserId,
      level: 'first',
      amount: transactionAmount * 0.05, // 5% commission
      description: `Comissão de 1º nível`,
      date: new Date()
    });
    
    await firstLevelReward.save();
    
    // Process 2nd level referral if referrer has a referrer
    if (req.user.referredBy) {
      const secondLevelReward = new ReferralReward({
        referrerId: req.user.referredBy,
        referredId: referredUserId,
        level: 'second',
        amount: transactionAmount * 0.03, // 3% commission
        description: `Comissão de 2º nível`,
        date: new Date()
      });
      
      await secondLevelReward.save();
    }
    
    res.json({ message: 'Referral processed successfully' });
  } catch (error) {
    console.error('Error processing referral:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to generate unique referral code
function generateUniqueReferralCode(userId) {
  const timestamp = Date.now().toString();
  const userPart = userId.substring(0, 4).toUpperCase();
  return `REF${userPart}${timestamp.substring(timestamp.length - 4)}`;
}

module.exports = router;