const mongoose = require('mongoose');

const taskCompletionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Usuário é obrigatório']
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: [true, 'Tarefa é obrigatória']
  },
  reward: {
    type: Number,
    required: [true, 'Recompensa é obrigatória'],
    min: [0, 'Recompensa não pode ser negativa']
  },
  completedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'claimed'],
    default: 'completed'
  },
  data: {
    // Dados específicos da completação
    investmentAmount: Number,
    referralCount: Number,
    socialActions: Number,
    verificationType: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
taskCompletionSchema.index({ user: 1, task: 1 });
taskCompletionSchema.index({ user: 1, completedAt: -1 });
taskCompletionSchema.index({ task: 1, completedAt: -1 });
taskCompletionSchema.index({ status: 1 });

// Virtual para verificar se recompensa foi reivindicada
taskCompletionSchema.virtual('isClaimed').get(function() {
  return this.status === 'claimed';
});

// Middleware pré-save para popular dados
taskCompletionSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Popular a recompensa da tarefa se não fornecida
    if (!this.reward) {
      const Task = mongoose.model('Task');
      const task = await Task.findById(this.task);
      if (task) {
        this.reward = task.reward;
      }
    }
  }
  next();
});

// Método para reivindicar recompensa
taskCompletionSchema.methods.claimReward = async function() {
  if (this.status === 'claimed') {
    throw new Error('Recompensa já foi reivindicada');
  }
  
  if (this.status !== 'completed') {
    throw new Error('Tarefa não está completa');
  }
  
  this.status = 'claimed';
  await this.save();
  
  // Atualizar saldo do usuário
  const User = mongoose.model('User');
  await User.findByIdAndUpdate(
    this.user,
    { $inc: { balance: this.reward } }
  );
  
  return this;
};

// Método para verificar se usuário pode completar tarefa novamente
taskCompletionSchema.statics.canUserCompleteTask = async function(userId, taskId) {
  const Task = mongoose.model('Task');
  const task = await Task.findById(taskId);
  
  if (!task || !task.isActive) {
    return false;
  }
  
  // Verificar se é tarefa one_time e já foi completada
  if (task.type === 'one_time') {
    const existingCompletion = await this.findOne({ user: userId, task: taskId });
    if (existingCompletion) {
      return false;
    }
  }
  
  // Verificar cooldown para tarefas diárias/semanais
  if (task.type === 'daily' || task.type === 'weekly') {
    const lastCompletion = await this.findOne({
      user: userId,
      task: taskId,
      completedAt: { 
        $gte: new Date(Date.now() - task.cooldownHours * 60 * 60 * 1000)
      }
    }).sort({ completedAt: -1 });
    
    if (lastCompletion) {
      return false;
    }
  }
  
  // Verificar limite máximo de completações
  if (task.maxCompletions > 0) {
    const completionCount = await this.countDocuments({ 
      user: userId, 
      task: taskId 
    });
    
    if (completionCount >= task.maxCompletions) {
      return false;
    }
  }
  
  return true;
};

module.exports = mongoose.model('TaskCompletion', taskCompletionSchema);