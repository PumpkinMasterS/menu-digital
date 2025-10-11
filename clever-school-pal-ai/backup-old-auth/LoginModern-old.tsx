/**
 * 🚀 LOGIN PAGE MODERNA - TESTE DA OPÇÃO A
 * Sistema simplificado: apenas auth.users + JWT
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModernAuthProvider, useModernAuth } from '@/contexts/ModernAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, AlertCircle, GraduationCap, BookOpen, Users, Brain, Sparkles, Shield } from 'lucide-react';
import { logger } from '@/lib/logger';
import { clearAllAuthData } from '@/lib/auth-simplified';

function LoginModernContent() {
  const [email, setEmail] = useState('whiswher@gmail.com'); // Pre-fill para teste
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showTotpInput, setShowTotpInput] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoading } = useModernAuth();
  const navigate = useNavigate();

  // Redirecionar se já estiver autenticado
  // TEMPORARIAMENTE DESABILITADO PARA TESTE
  // if (isAuthenticated) {
  //   return <Navigate to="/" replace />;
  // }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 SUBMIT INICIADO', { email, password: !!password, totpCode });
    logger.info('🚀 SUBMIT INICIADO', { email, hasPassword: !!password, hasTotpCode: !!totpCode });
    
    setError('');

    if (!email || !password) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    if (showTotpInput && !totpCode) {
      setError('Por favor, insira o código TOTP');
      return;
    }

    try {
      console.log('🚀 CHAMANDO LOGIN', { email, hasPassword: !!password, hasTotpCode: !!totpCode });
      logger.info('🚀 Modern login attempt', { email, hasTotp: !!totpCode });
      
      console.log('🚀 ANTES DO AWAIT LOGIN');
      await login(email, password, totpCode || undefined);
      console.log('🚀 APÓS O AWAIT LOGIN - SUCESSO');
      
      logger.info('✅ Modern login successful, redirecting', { email });
      navigate('/', { replace: true });
    } catch (error) {
      console.log('❌ ERRO NO LOGIN', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('❌ Modern login failed', { error: errorMessage, email });
      
      if (errorMessage === 'TOTP_REQUIRED') {
        console.log('🔐 TOTP REQUERIDO');
        setShowTotpInput(true);
        setTotpCode('');
        setError('🔐 Digite o código de 6 dígitos do seu aplicativo autenticador');
        setTimeout(() => {
          const totpInput = document.getElementById('totp-modern');
          totpInput?.focus();
        }, 100);
      } else if (errorMessage === 'Código TOTP inválido') {
        console.log('❌ TOTP INVÁLIDO');
        setTotpCode('');
        setError(errorMessage);
        setTimeout(() => {
          const totpInput = document.getElementById('totp-modern');
          totpInput?.focus();
        }, 100);
      } else if (errorMessage.includes('Timeout')) {
        console.log('⏱️ TIMEOUT TOTP');
        setTotpCode('');
        setError('⏱️ Verificação TOTP demorou muito. Tente novamente com um código mais recente.');
        setTimeout(() => {
          const totpInput = document.getElementById('totp-modern');
          totpInput?.focus();
        }, 100);
      } else if (errorMessage.includes('6 dígitos')) {
        console.log('🔢 FORMATO INVÁLIDO');
        setTotpCode('');
        setError(errorMessage);
        setTimeout(() => {
          const totpInput = document.getElementById('totp-modern');
          totpInput?.focus();
        }, 100);
      } else {
        console.log('❌ OUTRO ERRO:', errorMessage);
        setError(errorMessage);
      }
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 40%),
            radial-gradient(circle at 75% 75%, rgba(99, 102, 241, 0.1) 0%, transparent 40%),
            radial-gradient(circle at 75% 25%, rgba(147, 51, 234, 0.1) 0%, transparent 40%),
            radial-gradient(circle at 25% 75%, rgba(34, 197, 94, 0.1) 0%, transparent 40%)
          `
        }} />
      </div>

      {/* Floating Educational Elements - Hidden on mobile */}
      <div className="absolute inset-0 overflow-hidden hidden sm:block">
        <div className="absolute top-10 left-10 animate-float">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-400/20 to-blue-600/20 rounded-full flex items-center justify-center shadow-lg">
            <BookOpen className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <div className="absolute top-32 right-20 animate-float-delayed">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-400/20 to-purple-600/20 rounded-full flex items-center justify-center shadow-lg">
            <Brain className="w-5 h-5 text-purple-600" />
          </div>
        </div>
        <div className="absolute bottom-20 left-20 animate-float">
          <div className="w-11 h-11 bg-gradient-to-r from-indigo-400/20 to-indigo-600/20 rounded-full flex items-center justify-center shadow-lg">
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
        </div>
        <div className="absolute bottom-32 right-16 animate-float-delayed">
          <div className="w-8 h-8 bg-gradient-to-r from-emerald-400/20 to-emerald-600/20 rounded-full flex items-center justify-center shadow-lg">
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo and Branding - MODERNO */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="relative inline-block mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl backdrop-blur-sm border border-white/20 transform hover:scale-105 transition-transform duration-300">
                <GraduationCap className="w-10 h-10 text-white drop-shadow-sm" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🚀 Connect AI Modern
            </h1>
            <p className="text-gray-700 text-sm font-medium">
              Sistema Simplificado 2025 • Opção A
            </p>
            <div className="mt-2 text-xs text-blue-600 font-semibold">
              ✅ Apenas auth.users + JWT • Zero duplicação
            </div>
          </div>

          {/* Login Card - MODERNO */}
          <Card className="backdrop-blur-lg bg-white/95 border-0 shadow-2xl ring-1 ring-black/10 animate-slide-up">
            <CardHeader className="space-y-1 text-center pb-6 px-6 pt-6">
              <CardTitle className="text-2xl font-semibold text-gray-900 flex items-center justify-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Login Moderno
              </CardTitle>
              <p className="text-sm text-gray-600">
                Teste do sistema simplificado
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6 px-6 pb-6">
              {error && (
                <Alert variant="destructive" className="animate-shake border-red-300 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm font-medium">{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-modern" className="text-sm font-semibold text-gray-800">
                      Email
                    </Label>
                    <Input
                      id="email-modern"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className="h-12 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500/30 transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                      autoComplete="email"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password-modern" className="text-sm font-semibold text-gray-800">
                      Senha
                    </Label>
                    <div className="relative">
                      <Input
                        id="password-modern"
                        type={showPassword ? "text" : "password"}
                        placeholder="Sua senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        className="h-12 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500/30 pr-12 transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                        autoComplete="current-password"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-12 px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {showTotpInput && (
                    <div className="space-y-2 animate-slide-down">
                      <Label htmlFor="totp-modern" className="text-sm font-semibold text-gray-800">
                        🔐 Código TOTP
                      </Label>
                      <Input
                        id="totp-modern"
                        type="text"
                        placeholder="000000"
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        disabled={isLoading}
                        className="h-12 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500/30 text-center text-lg tracking-wider font-mono transition-all duration-200 text-gray-900"
                        maxLength={6}
                        autoComplete="one-time-code"
                        autoFocus
                      />
                      <div className="flex items-center gap-2 text-xs text-gray-700 bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <Shield className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span className="font-medium">Digite o código de 6 dígitos do seu aplicativo autenticador</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                              {showTotpInput ? (
                        <span className="font-medium">🔐 Verificando TOTP...</span>
                      ) : (
                        <span className="font-medium">🚀 Entrando...</span>
                      )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4" />
                        <span className="font-semibold">{showTotpInput ? "🔐 Verificar TOTP" : "🚀 Entrar Moderno"}</span>
                      </div>
                    )}
                  </Button>

                  {showTotpInput && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12 border-emerald-300 hover:bg-emerald-50 transition-all duration-200 text-gray-700 font-medium"
                      onClick={() => {
                        setShowTotpInput(false);
                        setTotpCode('');
                        setError('');
                        setTimeout(() => {
                          const emailInput = document.getElementById('email-modern');
                          emailInput?.focus();
                        }, 100);
                      }}
                      disabled={isLoading}
                    >
                      ← Voltar ao Login
                    </Button>
                  )}
                  
                  <div className="text-center">
                    <a 
                      href="/login" 
                      className="text-sm text-emerald-600 hover:text-emerald-700 font-medium hover:underline transition-colors"
                    >
                      🔄 Voltar ao Sistema Antigo
                    </a>
                  </div>
                </div>
              </form>

              {/* Botão de Limpeza para Debug */}
              <div className="border-t border-gray-200 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-xs border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => {
                    clearAllAuthData();
                    window.location.reload();
                  }}
                >
                  🧹 Limpar Dados de Auth (Debug)
                </Button>
              </div>

              {/* Status do Sistema */}
              <div className="border-t border-emerald-200 pt-4 mt-4">
                <div className="text-xs text-center space-y-1">
                  <div className="font-semibold text-emerald-700">🎯 Status do Sistema Moderno</div>
                  <div className="text-gray-600">✅ Cliente único Supabase</div>
                  <div className="text-gray-600">✅ Zero múltiplas instâncias</div>
                  <div className="text-gray-600">✅ Dados direto do JWT</div>
                  <div className="text-gray-600">✅ TOTP otimizado (sem timeout)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Wrapper com Provider
export default function LoginModern() {
  return (
    <ModernAuthProvider>
      <LoginModernContent />
    </ModernAuthProvider>
  );
} 