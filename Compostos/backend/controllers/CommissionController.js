const CommissionService = require('../services/CommissionService');

class CommissionController {
  // 📊 Obter comissões do usuário
  static async getUserCommissions(req, res) {
    try {
      const { page = 1, limit = 10, status, type, startDate, endDate } = req.query;
      const userId = req.user._id;

      const commissions = await CommissionService.getUserCommissions(
        userId,
        {
          page: parseInt(page),
          limit: parseInt(limit),
          status,
          type,
          startDate,
          endDate
        }
      );

      res.status(200).json({
        success: true,
        data: commissions
      });
    } catch (error) {
      console.error('Erro ao obter comissões do usuário:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // 📈 Obter estatísticas de comissões
  static async getCommissionStats(req, res) {
    try {
      const userId = req.user._id;
      const stats = await CommissionService.getCommissionStats(userId);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Erro ao obter estatísticas de comissões:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // 🔍 Buscar comissões
  static async searchCommissions(req, res) {
    try {
      const { query, page = 1, limit = 10 } = req.query;
      const userId = req.user._id;

      const commissions = await CommissionService.searchCommissions(
        userId,
        query,
        {
          page: parseInt(page),
          limit: parseInt(limit)
        }
      );

      res.status(200).json({
        success: true,
        data: commissions
      });
    } catch (error) {
      console.error('Erro ao buscar comissões:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // 🎯 Filtrar comissões
  static async filterCommissions(req, res) {
    try {
      const { status, type, minAmount, maxAmount, startDate, endDate, page = 1, limit = 10 } = req.query;
      const userId = req.user._id;

      const commissions = await CommissionService.filterCommissions(
        userId,
        {
          status,
          type,
          minAmount: minAmount ? parseFloat(minAmount) : undefined,
          maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
          startDate,
          endDate,
          page: parseInt(page),
          limit: parseInt(limit)
        }
      );

      res.status(200).json({
        success: true,
        data: commissions
      });
    } catch (error) {
      console.error('Erro ao filtrar comissões:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // 📊 Dashboard de comissões
  static async getCommissionDashboard(req, res) {
    try {
      const userId = req.user._id;
      const dashboard = await CommissionService.getCommissionDashboard(userId);

      res.status(200).json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      console.error('Erro ao obter dashboard de comissões:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // 👑 Obter todas as comissões (admin)
  static async getAllCommissions(req, res) {
    try {
      const { page = 1, limit = 20, status, type, userId, startDate, endDate } = req.query;

      const commissions = await CommissionService.getAllCommissions({
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        type,
        userId,
        startDate,
        endDate
      });

      res.status(200).json({
        success: true,
        data: commissions
      });
    } catch (error) {
      console.error('Erro ao obter todas as comissões:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // 📝 Atualizar status da comissão (admin)
  static async updateCommissionStatus(req, res) {
    try {
      const { commissionId } = req.params;
      const { status, paymentDate } = req.body;

      const commission = await CommissionService.updateCommissionStatus(
        commissionId,
        status,
        paymentDate
      );

      res.status(200).json({
        success: true,
        data: commission,
        message: 'Status da comissão atualizado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao atualizar status da comissão:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  }

  // ➕ Gerar comissão manual (admin)
  static async generateManualCommission(req, res) {
    try {
      const { referrerId, amount, description, type = 'manual' } = req.body;

      const commission = await CommissionService.generateManualCommission(
        referrerId,
        amount,
        description,
        type
      );

      res.status(201).json({
        success: true,
        data: commission,
        message: 'Comissão manual gerada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao gerar comissão manual:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  }

  // 📊 Estatísticas de comissões (admin)
  static async getAdminCommissionStats(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const stats = await CommissionService.getAdminCommissionStats({
        startDate,
        endDate
      });

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Erro ao obter estatísticas de admin:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}

module.exports = CommissionController;