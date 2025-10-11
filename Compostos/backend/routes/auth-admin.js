const express = require('express');
const Admin = require('../models/Admin');
const AuditLog = require('../models/AuditLog');
const { protect, admin } = require('../middleware/auth');
const { protectAdmin } = require('../middleware/auth-admin');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { securityLog } = require('../config/security-logger');

const router = express.Router();

// Configuração do transportador de email (configurar com suas credenciais)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Login de administrador
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`[DEBUG] Tentativa de login para: ${email}`);

    // Validações
    if (!email || !password) {
      console.log('[DEBUG] Erro: Email ou senha não fornecidos');
      return res.status(400).json({
        success: false,
        message: 'Email e senha são obrigatórios'
      });
    }

    // Buscar admin
    console.log(`[DEBUG] Buscando admin com email: ${email}`);
    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin) {
      console.log(`[DEBUG] Admin não encontrado para email: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }
    console.log(`[DEBUG] Admin encontrado: ${admin._id}, role: ${admin.role}`);

    // Verificar se está bloqueado
    if (admin.isLocked) {
      console.log(`[DEBUG] Conta bloqueada para: ${email}`);
      securityLog.loginAttempt(email, false, req.ip, req.get('User-Agent'), {
        reason: 'Conta bloqueada temporariamente',
        attempts: admin.loginAttempts
      });
      return res.status(423).json({
        success: false,
        message: 'Conta temporariamente bloqueada. Tente novamente mais tarde.'
      });
    }

    // Verificar senha
    console.log(`[DEBUG] Verificando senha para: ${email}`);
    const isPasswordValid = await admin.matchPassword(password);
    console.log(`[DEBUG] Senha válida: ${isPasswordValid}`);
    if (!isPasswordValid) {
      await admin.loginFailed();
      console.log(`[DEBUG] Senha inválida para: ${email}, incrementando tentativas de login`);
      
      securityLog.loginAttempt(email, false, req.ip, req.get('User-Agent'), {
        reason: 'Senha inválida',
        attempts: admin.loginAttempts
      });
      
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    // Registrar login bem-sucedido
    await admin.loginSuccess();
    console.log(`[DEBUG] Login bem-sucedido para: ${email}`);
    
    securityLog.loginAttempt(email, true, req.ip, req.get('User-Agent'), {
      adminId: admin._id,
      role: admin.role
    });

    // Verificar se 2FA está ativado
    if (admin.twoFactorEnabled) {
      console.log(`[DEBUG] 2FA ativado para: ${email}, requer validação adicional`);
      
      securityLog.securityEvent('2FA_REQUIRED_AFTER_LOGIN', {
        adminId: admin._id,
        adminEmail: admin.email,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });

      // Retornar que 2FA é necessário
      return res.status(200).json({
        success: true,
        message: 'Login realizado com sucesso. Validação de dois fatores requerida.',
        requires2FA: true,
        data: {
          admin: {
            id: admin._id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            twoFactorEnabled: true
          }
        }
      });
    }

    // Gerar token (apenas se 2FA não estiver ativado)
    const token = admin.generateToken();
    console.log(`[DEBUG] Token gerado para: ${email}`);

    // Registrar em auditoria
    await AuditLog.create({
      userId: admin._id,
      userEmail: email,
      action: 'ADMIN_LOGIN',
      targetModel: 'Admin',
      targetId: admin._id,
      details: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        twoFactorEnabled: false
      },
      ipAddress: req.ip
    });
    console.log(`[DEBUG] Auditoria registrada para login de: ${email}`);

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        token: token,
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          permissions: admin.permissions,
          lastLogin: admin.lastLogin,
          twoFactorEnabled: false
        }
      }
    });
    console.log(`[DEBUG] Resposta de sucesso enviada para: ${email}`);

  } catch (error) {
    console.error('Erro no login de admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Logout de administrador
router.post('/logout', protect, admin, async (req, res) => {
  try {
    // Registrar logout em auditoria
    await AuditLog.create({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'ADMIN_LOGOUT',
      targetModel: 'Admin',
      targetId: req.user.id,
      details: {
        message: 'Logout realizado com sucesso'
      },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });

  } catch (error) {
    console.error('Erro no logout de admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Obter perfil do administrador logado
router.get('/profile', protectAdmin, async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Administrador não encontrado'
      });
    }

    res.json({
      success: true,
      data: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
        isActive: admin.isActive,
        lastLogin: admin.lastLogin,
        phone: admin.phone,
        department: admin.department,
        avatar: admin.avatar,
        createdAt: admin.createdAt
      }
    });

  } catch (error) {
    console.error('Erro ao buscar perfil de admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Atualizar perfil do administrador
router.put('/profile', protect, admin, async (req, res) => {
  try {
    const { name, phone, department, notes } = req.body;

    // Buscar admin
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Administrador não encontrado'
      });
    }

    // Atualizar campos permitidos
    if (name) admin.name = name;
    if (phone) admin.phone = phone;
    if (department) admin.department = department;
    if (notes) admin.notes = notes;

    await admin.save();

    // Registrar em auditoria
    await AuditLog.create({
      userId: req.user.id,
      action: 'admin_profile_update',
      resource: 'Admin',
      resourceId: req.user.id,
      details: {
        updatedFields: Object.keys(req.body)
      },
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      data: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        department: admin.department,
        notes: admin.notes
      }
    });

  } catch (error) {
    console.error('Erro ao atualizar perfil de admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Alterar senha do administrador
router.put('/change-password', protect, admin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validações
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Senha atual e nova senha são obrigatórias'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Nova senha deve ter no mínimo 6 caracteres'
      });
    }

    // Buscar admin com senha
    const admin = await Admin.findById(req.user.id).select('+password');
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Administrador não encontrado'
      });
    }

    // Verificar senha atual
    const isCurrentPasswordValid = await admin.matchPassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Senha atual incorreta'
      });
    }

    // Atualizar senha
    admin.password = newPassword;
    await admin.save();

    // Registrar em auditoria
    await AuditLog.create({
      userId: req.user.id,
      action: 'admin_password_change',
      resource: 'Admin',
      resourceId: req.user.id,
      details: {
        message: 'Senha alterada com sucesso'
      },
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Senha alterada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao alterar senha de admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Solicitar recuperação de senha
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email é obrigatório'
      });
    }

    // Buscar admin
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Administrador não encontrado'
      });
    }

    // Gerar token de recuperação
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Salvar token e expiração
    admin.resetPasswordToken = resetTokenHash;
    admin.resetPasswordExpires = Date.now() + 3600000; // 1 hora
    await admin.save();

    // Criar link de recuperação
    const resetUrl = `${process.env.FRONTEND_URL}/admin/reset-password/${resetToken}`;

    // Enviar email (configurar SMTP nas variáveis de ambiente)
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@compostos.com',
        to: admin.email,
        subject: 'Recuperação de Senha - Painel Administrativo',
        html: `
          <h2>Recuperação de Senha</h2>
          <p>Olá ${admin.name},</p>
          <p>Você solicitou a recuperação de senha para o painel administrativo.</p>
          <p>Clique no link abaixo para redefinir sua senha:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>Este link expira em 1 hora.</p>
          <p>Se você não solicitou isso, ignore este email.</p>
        `
      });
    } catch (emailError) {
      console.error('Erro ao enviar email:', emailError);
      // Não retornar erro para não expor problemas de configuração de email
    }

    res.json({
      success: true,
      message: 'Email de recuperação enviado (se o administrador existir)'
    });

  } catch (error) {
    console.error('Erro ao solicitar recuperação de senha:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Redefinir senha com token
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Nova senha é obrigatória'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Senha deve ter no mínimo 6 caracteres'
      });
    }

    // Hash do token
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Buscar admin com token válido
    const admin = await Admin.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!admin) {
      return res.status(400).json({
        success: false,
        message: 'Token inválido ou expirado'
      });
    }

    // Atualizar senha e limpar tokens
    admin.password = password;
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpires = undefined;
    admin.loginAttempts = 0;
    admin.lockUntil = undefined;
    await admin.save();

    res.json({
      success: true,
      message: 'Senha redefinida com sucesso'
    });

  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router;