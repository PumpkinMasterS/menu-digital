const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Task = require('../models/Task');
const TaskCompletion = require('../models/TaskCompletion');
const User = require('../models/User');

// @route   GET /api/tasks
// @desc    Get all available tasks for user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const tasks = await Task.find({ isActive: true })
      .select('title description reward type category icon priority requirements')
      .sort({ priority: -1, createdAt: -1 });
    
    // Verificar quais tarefas o usuário pode completar
    const user = await User.findById(req.user.id);
    const tasksWithStatus = await Promise.all(
      tasks.map(async (task) => {
        const canComplete = await TaskCompletion.canUserCompleteTask(req.user.id, task._id);
        const isEligible = task.canBeCompletedByUser(user);
        
        return {
          ...task.toObject(),
          canComplete: canComplete && isEligible,
          isEligible
        };
      })
    );
    
    res.json({
      success: true,
      data: tasksWithStatus,
      count: tasksWithStatus.length
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar tarefas',
      error: error.message
    });
  }
});

// @route   GET /api/tasks/user
// @desc    Get user's task completions
// @access  Private
router.get('/user', protect, async (req, res) => {
  try {
    const completions = await TaskCompletion.find({ user: req.user.id })
      .populate('task', 'title description reward type category icon')
      .sort({ completedAt: -1 })
      .limit(50);
    
    // Calcular estatísticas
    const stats = await TaskCompletion.aggregate([
      { $match: { user: mongoose.Types.ObjectId(req.user.id) } },
      {
        $group: {
          _id: null,
          totalRewards: { $sum: '$reward' },
          totalCompletions: { $sum: 1 },
          completedTasks: { $addToSet: '$task' }
        }
      }
    ]);
    
    const userStats = stats[0] || {
      totalRewards: 0,
      totalCompletions: 0,
      completedTasks: []
    };
    
    res.json({
      success: true,
      data: {
        completions,
        stats: {
          totalRewards: userStats.totalRewards,
          totalCompletions: userStats.totalCompletions,
          uniqueTasksCompleted: userStats.completedTasks.length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar tarefas do usuário',
      error: error.message
    });
  }
});

// @route   GET /api/tasks/:id
// @desc    Get task by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tarefa não encontrada'
      });
    }
    
    // Verificar se usuário pode completar
    const canComplete = await TaskCompletion.canUserCompleteTask(req.user.id, task._id);
    const user = await User.findById(req.user.id);
    const isEligible = task.canBeCompletedByUser(user);
    
    // Buscar estatísticas da tarefa
    const taskStats = await task.getCompletionStats();
    
    res.json({
      success: true,
      data: {
        ...task.toObject(),
        canComplete: canComplete && isEligible,
        isEligible,
        stats: taskStats
      }
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar tarefa',
      error: error.message
    });
  }
});

// @route   POST /api/tasks/:id/complete
// @desc    Complete a task
// @access  Private
router.post('/:id/complete', protect, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { data } = req.body;
    
    // Verificar se tarefa existe e está ativa
    const task = await Task.findById(taskId);
    if (!task || !task.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Tarefa não encontrada ou inativa'
      });
    }
    
    // Verificar se usuário pode completar
    const canComplete = await TaskCompletion.canUserCompleteTask(req.user.id, taskId);
    if (!canComplete) {
      return res.status(400).json({
        success: false,
        message: 'Tarefa já completada ou em cooldown'
      });
    }
    
    // Verificar se usuário atende aos requisitos
    const user = await User.findById(req.user.id);
    const isEligible = task.canBeCompletedByUser(user);
    if (!isEligible) {
      return res.status(400).json({
        success: false,
        message: 'Você não atende aos requisitos para esta tarefa'
      });
    }
    
    // Criar registro de completação
    const completion = new TaskCompletion({
      user: req.user.id,
      task: taskId,
      reward: task.reward,
      data: data || {}
    });
    
    await completion.save();
    
    // Popular dados para resposta
    await completion.populate('task', 'title description reward type category icon');
    
    res.status(201).json({
      success: true,
      message: 'Tarefa completada com sucesso!',
      data: completion
    });
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao completar tarefa',
      error: error.message
    });
  }
});

// @route   POST /api/tasks/completions/:id/claim
// @desc    Claim task reward
// @access  Private
router.post('/completions/:id/claim', protect, async (req, res) => {
  try {
    const completionId = req.params.id;
    
    const completion = await TaskCompletion.findById(completionId);
    
    if (!completion) {
      return res.status(404).json({
        success: false,
        message: 'Completação não encontrada'
      });
    }
    
    // Verificar se pertence ao usuário
    if (completion.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Acesso não autorizado'
      });
    }
    
    // Reivindicar recompensa
    const updatedCompletion = await completion.claimReward();
    
    await updatedCompletion.populate('task', 'title description reward');
    
    res.json({
      success: true,
      message: 'Recompensa reivindicada com sucesso!',
      data: updatedCompletion
    });
  } catch (error) {
    console.error('Error claiming reward:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao reivindicar recompensa',
      error: error.message
    });
  }
});

// @route   GET /api/tasks/stats/overview
// @desc    Get tasks overview statistics
// @access  Private
router.get('/stats/overview', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Estatísticas do usuário
    const userStats = await TaskCompletion.aggregate([
      { $match: { user: mongoose.Types.ObjectId(userId), status: 'claimed' } },
      {
        $group: {
          _id: null,
          totalRewards: { $sum: '$reward' },
          totalCompletions: { $sum: 1 },
          completedTasks: { $addToSet: '$task' }
        }
      }
    ]);
    
    // Tarefas disponíveis
    const availableTasks = await Task.countDocuments({ isActive: true });
    
    // Tarefas completáveis agora
    const tasks = await Task.find({ isActive: true });
    const user = await User.findById(userId);
    
    let completableNow = 0;
    for (const task of tasks) {
      const canComplete = await TaskCompletion.canUserCompleteTask(userId, task._id);
      const isEligible = task.canBeCompletedByUser(user);
      if (canComplete && isEligible) {
        completableNow++;
      }
    }
    
    const stats = userStats[0] || {
      totalRewards: 0,
      totalCompletions: 0,
      completedTasks: []
    };
    
    res.json({
      success: true,
      data: {
        user: {
          totalRewards: stats.totalRewards,
          totalCompletions: stats.totalCompletions,
          uniqueTasksCompleted: stats.completedTasks.length
        },
        platform: {
          availableTasks,
          completableNow
        }
      }
    });
  } catch (error) {
    console.error('Error fetching task stats:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar estatísticas de tarefas',
      error: error.message
    });
  }
});

module.exports = router;