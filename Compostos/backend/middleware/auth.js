const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware para proteger rotas
const protect = async (req, res, next) => {
  try {
    let token;

    // Verificar se o token está no header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Acesso não autorizado. Token não fornecido.'
      });
    }

    try {
      // Verificar token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Buscar usuário pelo ID do token (suporta tanto 'id' quanto 'userId')
      const userId = decoded.id || decoded.userId;
      const user = await User.findById(userId).select('-password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não encontrado.'
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Conta desativada. Entre em contato com o suporte.'
        });
      }

      // Adicionar usuário à requisição
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido ou expirado.'
      });
    }
  } catch (error) {
    console.error('Erro no middleware de autenticação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor.'
    });
  }
};

// Middleware para verificar roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Acesso negado. Função ${req.user.role} não tem permissão para esta ação.`
      });
    }
    next();
  };
};

// Gerar token JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// Middleware para verificar se é o próprio usuário ou admin
const checkOwnership = (req, res, next) => {
  if (req.user.role === 'admin') {
    return next();
  }

  if (req.user._id.toString() !== req.params.id) {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado. Você só pode acessar seus próprios dados.'
    });
  }

  next();
};

// Middleware específico para admin
const admin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado. Apenas administradores podem acessar esta funcionalidade.'
    });
  }
  next();
};

module.exports = {
  protect,
  authorize,
  generateToken,
  checkOwnership,
  admin
};