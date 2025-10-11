const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { securityLog } = require('../config/security-logger');

// Middleware para proteger rotas de admin
const protectAdmin = async (req, res, next) => {
  try {
    let token;

    // Verificar se o token está no header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    console.log('Tentativa de autenticação admin - Token presente:', !!token);
    console.log('Caminho da requisição:', req.path);
    console.log('Método:', req.method);

    if (!token) {
      console.log('Acesso negado: Token não fornecido');
      return res.status(401).json({
        success: false,
        message: 'Acesso não autorizado. Token não fornecido.'
      });
    }

    try {
      // Verificar token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token decodificado:', decoded);
      console.log('Token type:', decoded.type);
      console.log('Admin ID do token:', decoded.id);

      // Verificar se é um token de admin
      if (decoded.type !== 'admin') {
        console.log('Acesso negado: Token não é de admin, type:', decoded.type);
        return res.status(401).json({
          success: false,
          message: 'Token inválido para acesso administrativo.'
        });
      }

      // Buscar admin pelo ID do token
      const admin = await Admin.findById(decoded.id);
      console.log('Admin encontrado:', admin ? { id: admin._id, email: admin.email, role: admin.role } : 'não encontrado');

      if (!admin) {
        console.log('Acesso negado: Administrador não encontrado para ID:', decoded.id);
        return res.status(401).json({
          success: false,
          message: 'Administrador não encontrado.'
        });
      }

      if (!admin.isActive) {
        console.log('Acesso negado: Conta inativa para admin:', admin.email);
        return res.status(401).json({
          success: false,
          message: 'Conta de administrador desativada.'
        });
      }

      // Verificar se está bloqueado
      if (admin.isLocked) {
        console.log('Acesso negado: Conta bloqueada para admin:', admin.email);
        return res.status(423).json({
          success: false,
          message: 'Conta temporariamente bloqueada. Tente novamente mais tarde.'
        });
      }

      // Adicionar admin à requisição
      req.user = admin;
      req.isAdmin = true;
      console.log('Autenticação admin bem-sucedida para:', admin.email, 'role:', admin.role);
      next();
    } catch (error) {
      console.error('Erro na verificação do token:', error.message);
      console.error('Detalhes do erro:', error);
      return res.status(401).json({
        success: false,
        message: 'Token inválido ou expirado.'
      });
    }
  } catch (error) {
    console.error('Erro no middleware de autenticação de admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor.'
    });
  }
};

// Middleware para verificar se é super admin
const superAdmin = (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado. Apenas super administradores podem acessar esta funcionalidade.'
    });
  }
  next();
};

// Middleware para verificar permissões específicas
const hasPermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.user.hasPermission(resource, action)) {
      return res.status(403).json({
        success: false,
        message: `Acesso negado. Você não tem permissão para ${action} em ${resource}.`
      });
    }
    next();
  };
};

// Middleware para verificar se é admin ou tem permissão específica
const adminOrPermission = (resource, action) => {
  return (req, res, next) => {
    // Super admin tem todas as permissões
    if (req.user.role === 'super_admin') {
      return next();
    }
    
    // Verificar se é admin com a permissão necessária
    if (req.user.role === 'admin' && req.user.hasPermission(resource, action)) {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'Acesso negado. Permissão insuficiente.'
    });
  };
};

// Gerar token JWT para admin
const generateAdminToken = (id) => {
  return jwt.sign({ 
    id, 
    type: 'admin' 
  }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '24h',
  });
};

module.exports = {
  protectAdmin,
  superAdmin,
  hasPermission,
  adminOrPermission,
  generateAdminToken
};