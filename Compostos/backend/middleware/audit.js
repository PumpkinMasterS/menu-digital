const AuditService = require('../services/AuditService');

/**
 * Middleware para registrar automaticamente ações de usuário
 */
const auditMiddleware = (action, targetModel = null) => {
  return async (req, res, next) => {
    try {
      // Registrar ação após a conclusão da requisição
      res.on('finish', async () => {
        try {
          if (req.user && res.statusCode < 400) {
            const details = {
              method: req.method,
              endpoint: req.originalUrl,
              statusCode: res.statusCode,
              responseTime: res.get('X-Response-Time')
            };

            const targetId = req.params.id || req.body._id || null;
            
            await AuditService.logAction({
              action,
              userId: req.user._id,
              userEmail: req.user.email,
              targetId,
              targetModel,
              details,
              ipAddress: req.ip,
              userAgent: req.get('User-Agent'),
              status: res.statusCode < 400 ? 'SUCCESS' : 'FAILURE'
            });
          }
        } catch (error) {
          console.error('Erro no middleware de auditoria:', error);
          // Não interromper o fluxo
        }
      });
    } catch (error) {
      console.error('Erro ao configurar middleware de auditoria:', error);
    }
    
    next();
  };
};

/**
 * Middleware específico para ações de administrador
 */
const adminAuditMiddleware = (action, targetModel = null) => {
  return async (req, res, next) => {
    try {
      res.on('finish', async () => {
        try {
          if (req.user && req.user.role === 'admin' && res.statusCode < 400) {
            const details = {
              method: req.method,
              endpoint: req.originalUrl,
              statusCode: res.statusCode,
              adminAction: action
            };

            const targetId = req.params.id || req.body._id || null;
            
            await AuditService.logAdminAction(
              req.user,
              action,
              targetId,
              targetModel,
              details
            );
          }
        } catch (error) {
          console.error('Erro no middleware de auditoria admin:', error);
        }
      });
    } catch (error) {
      console.error('Erro ao configurar middleware de auditoria admin:', error);
    }
    
    next();
  };
};

module.exports = {
  auditMiddleware,
  adminAuditMiddleware
};