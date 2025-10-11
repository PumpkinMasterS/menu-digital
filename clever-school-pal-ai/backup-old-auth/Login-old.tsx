import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, AlertCircle, GraduationCap, BookOpen, Users, Brain, Sparkles, Shield } from 'lucide-react';
import { logger } from '@/lib/logger';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showTotpInput, setShowTotpInput] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoading, user } = useAuth();
  const navigate = useNavigate();

  // Redirecionar se já estiver autenticado
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      logger.info('Login attempt', { email, hasTotp: !!totpCode });
      await login(email, password, totpCode || undefined);
      logger.info('Login successful, redirecting', { email });
      navigate('/', { replace: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Login failed', { error: errorMessage, email });
      
      if (errorMessage === 'TOTP_REQUIRED') {
        setShowTotpInput(true);
        setTotpCode('');
        setError('Digite o código de 6 dígitos do seu aplicativo autenticador');
        setTimeout(() => {
          const totpInput = document.getElementById('totp');
          totpInput?.focus();
        }, 100);
      } else if (errorMessage === 'Código TOTP inválido') {
        setTotpCode('');
        setError(errorMessage);
        setTimeout(() => {
          const totpInput = document.getElementById('totp');
          totpInput?.focus();
        }, 100);
      } else {
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
      <div className="relative z-10 min-h-screen flex items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-sm sm:max-w-md">
          {/* Logo and Branding */}
          <div className="text-center mb-6 sm:mb-8 animate-fade-in">
            <div className="relative inline-block mb-4 sm:mb-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl backdrop-blur-sm border border-white/20 transform hover:scale-105 transition-transform duration-300">
                <GraduationCap className="w-8 h-8 sm:w-10 sm:h-10 text-white drop-shadow-sm" />
              </div>
              <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
              </div>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
              Connect AI
            </h1>
            <p className="text-gray-700 text-xs sm:text-sm font-medium">
              Plataforma Educacional Inteligente
            </p>
          </div>

          {/* Login Card */}
          <Card className="backdrop-blur-lg bg-white/95 border-0 shadow-2xl ring-1 ring-black/10 animate-slide-up">
                         <CardHeader className="space-y-1 text-center pb-4 sm:pb-6 px-4 sm:px-6 pt-4 sm:pt-6">
               <CardTitle className="text-xl sm:text-2xl font-semibold text-gray-900">
                 Bem-vindo de volta!
               </CardTitle>
             </CardHeader>
            
            <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-4 sm:pb-6">
              {error && (
                <Alert variant="destructive" className="animate-shake">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm font-medium">{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div className="space-y-3 sm:space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold text-gray-800">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className="h-11 sm:h-12 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500/30 transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                      autoComplete="email"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-semibold text-gray-800">
                      Senha
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Sua senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        className="h-11 sm:h-12 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500/30 pr-12 transition-all duration-200 text-gray-900 placeholder:text-gray-500"
                        autoComplete="current-password"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-11 sm:h-12 px-3 hover:bg-transparent"
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
                      <Label htmlFor="totp" className="text-sm font-semibold text-gray-800">
                        Código de Autenticação
                      </Label>
                      <Input
                        id="totp"
                        type="text"
                        placeholder="000000"
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        disabled={isLoading}
                        className="h-11 sm:h-12 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500/30 text-center text-lg tracking-wider font-mono transition-all duration-200 text-gray-900"
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

                <div className="space-y-3 sm:space-y-4">
                  <Button 
                    type="submit" 
                    className="w-full h-11 sm:h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span className="font-medium">{showTotpInput ? "Verificando..." : "Entrando..."}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4" />
                        <span className="font-semibold">{showTotpInput ? "Verificar Código" : "Entrar"}</span>
                      </div>
                    )}
                  </Button>

                  {showTotpInput && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11 sm:h-12 border-gray-300 hover:bg-gray-50 transition-all duration-200 text-gray-700 font-medium"
                      onClick={() => {
                        setShowTotpInput(false);
                        setTotpCode('');
                        setError('');
                        setTimeout(() => {
                          const emailInput = document.getElementById('email');
                          emailInput?.focus();
                        }, 100);
                      }}
                      disabled={isLoading}
                    >
                      Voltar ao Login
                    </Button>
                  )}
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:text-blue-700 font-semibold transition-colors duration-200 hover:underline"
                    onClick={() => {
                      // TODO: Implementar forgot password
                      setError('Funcionalidade em desenvolvimento');
                    }}
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-6 sm:mt-8 animate-fade-in-delayed">
            <p className="text-xs text-gray-500">
              Connect AI © 2025 • Versão 2.0
            </p>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-15px); }
          }

          .animate-float {
            animation: float 6s ease-in-out infinite;
          }
          
          .animate-float-delayed {
            animation: float 6s ease-in-out infinite;
            animation-delay: 2s;
          }

          .animate-fade-in {
            animation: fadeIn 0.8s ease-out;
          }
          
          .animate-fade-in-delayed {
            animation: fadeIn 0.8s ease-out 0.3s both;
          }
          
          .animate-slide-up {
            animation: slideUp 0.6s ease-out;
          }
          
          .animate-slide-down {
            animation: slideDown 0.3s ease-out;
          }
          
          .animate-shake {
            animation: shake 0.5s ease-in-out;
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
          }

          /* Force favicon refresh */
          @media screen {
            body::before {
              content: '';
              display: none;
            }
          }
        `
      }} />
    </div>
  );
}
