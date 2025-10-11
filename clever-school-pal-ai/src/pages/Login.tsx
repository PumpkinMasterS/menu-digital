/**
 * 🚀 LOGIN PAGE EDUCACIONAL 2025 - DESIGN MODERNO IA
 * Sistema inteligente de educação com visual futurista
 */

import React, { useState, startTransition } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Lock, 
  Shield, 
  Smartphone, 
  Brain, 
  Sparkles, 
  BookOpen, 
  Users, 
  Zap,
  ArrowRight
} from 'lucide-react';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

export default function Login() {
  const { user, login, isLoading, isPendingTotp, cancelTotp } = useUnifiedAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Redirecionar se já estiver autenticado E não há TOTP pendente
  if (user && !isPendingTotp) {
    logger.info('User already authenticated, redirecting...', { 
      email: user.email, 
      role: user.role 
    });
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Por favor, preencha o email e a palavra-passe');
      return;
    }

    // Se TOTP está pendente mas não foi fornecido
    if (isPendingTotp && !totpCode) {
      setError('Por favor, introduza o código TOTP');
      return;
    }

    try {
      logger.info('🔐 Starting unified login attempt 2025', { email });
      
      await login(email, password, totpCode || undefined);
      
      logger.info('✅ Login successful, redirecting...');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('❌ Login failed', { error: errorMessage, email });
      
      // O contexto já gerencia o estado isPendingTotp automaticamente
      if (errorMessage === 'TOTP_REQUIRED') {
        setError(''); // Não mostrar erro, modal vai aparecer
      } else if (errorMessage.includes('Timeout')) {
        setError('⏱️ Timeout na verificação TOTP. Tente novamente.');
      } else if (errorMessage.includes('Código TOTP')) {
      setError('🔐 Código TOTP inválido. Verifique e tente novamente.');
      } else if (errorMessage.includes('Invalid login')) {
        setError('❌ Email ou palavra-passe incorrectos');
      } else {
        setError(errorMessage);
      }
    }
  };

  const handleCancelTotp = () => {
    cancelTotp();
    setError('');
    setTotpCode('');
  };

  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totpCode.length === 6) {
      await handleLogin(e);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        {/* Floating Orbs */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-32 w-24 h-24 bg-purple-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-32 left-32 w-40 h-40 bg-indigo-500/20 rounded-full blur-xl animate-pulse delay-2000"></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent"></div>
      </div>

             <div className="relative z-10 min-h-screen flex items-center justify-center p-4 lg:p-8">
         <div className="w-full max-w-7xl grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
           
           {/* Left Side - Branding & Features - Hidden on mobile */}
           <div className="hidden lg:block text-white space-y-8 xl:pr-12">
             {/* Logo & Title */}
             <div className="space-y-6">
               <div className="flex items-center gap-4">
                 <div className="relative">
                   <div className="w-16 h-16 bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl">
                     <Brain className="h-8 w-8 text-white" />
                   </div>
                   <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                     <Sparkles className="h-3 w-3 text-yellow-900" />
                   </div>
                 </div>
                 <div className="min-w-0 flex-1">
                   <h1 className="text-3xl xl:text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent leading-tight">
                     Connect AI
                   </h1>
                   <p className="text-slate-300 text-base xl:text-lg">Inteligência Artificial Educacional</p>
                 </div>
               </div>
               
               <p className="text-lg xl:text-xl text-slate-200 leading-relaxed">
                 Transforme a educação com nossa plataforma inteligente. 
                 <span className="text-blue-400 font-semibold"> IA avançada</span> para 
                 personalizar o aprendizado de cada aluno.
               </p>
             </div>

             {/* Features Grid - Responsive */}
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
               <div className="flex items-start gap-3 p-4 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors duration-300">
                 <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                   <Brain className="h-5 w-5 text-blue-400" />
                 </div>
                 <div className="min-w-0 flex-1">
                   <h3 className="font-semibold text-white text-sm xl:text-base">IA Personalizada</h3>
                   <p className="text-xs xl:text-sm text-slate-300 leading-relaxed">Adaptação inteligente ao ritmo de cada estudante</p>
                 </div>
               </div>
               
               <div className="flex items-start gap-3 p-4 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors duration-300">
                 <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                   <BookOpen className="h-5 w-5 text-purple-400" />
                 </div>
                 <div className="min-w-0 flex-1">
                   <h3 className="font-semibold text-white text-sm xl:text-base">Conteúdo Rico</h3>
                   <p className="text-xs xl:text-sm text-slate-300 leading-relaxed">Materiais educacionais diversos e interativos</p>
                 </div>
               </div>
               
               <div className="flex items-start gap-3 p-4 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors duration-300">
                 <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                   <Users className="h-5 w-5 text-indigo-400" />
                 </div>
                 <div className="min-w-0 flex-1">
                   <h3 className="font-semibold text-white text-sm xl:text-base">Colaborativo</h3>
                   <p className="text-xs xl:text-sm text-slate-300 leading-relaxed">Turmas conectadas e aprendizado social</p>
                 </div>
               </div>
               
               <div className="flex items-start gap-3 p-4 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors duration-300">
                 <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                   <Zap className="h-5 w-5 text-green-400" />
                 </div>
                 <div className="min-w-0 flex-1">
                   <h3 className="font-semibold text-white text-sm xl:text-base">Tempo Real</h3>
                   <p className="text-xs xl:text-sm text-slate-300 leading-relaxed">Feedback instantâneo e acompanhamento</p>
                 </div>
               </div>
             </div>

             {/* Stats - Responsive */}
             <div className="flex items-center justify-between pt-6">
               <div className="text-center">
                 <div className="text-2xl xl:text-3xl font-bold text-blue-400">1000+</div>
                 <div className="text-xs xl:text-sm text-slate-300">Alunos ativos</div>
               </div>
               <div className="text-center">
                 <div className="text-2xl xl:text-3xl font-bold text-purple-400">50+</div>
                 <div className="text-xs xl:text-sm text-slate-300">Escolas parceiras</div>
               </div>
               <div className="text-center">
                 <div className="text-2xl xl:text-3xl font-bold text-indigo-400">95%</div>
                 <div className="text-xs xl:text-sm text-slate-300">Satisfação</div>
               </div>
             </div>
           </div>

                     {/* Right Side - Login Form */}
           <div className="w-full max-w-md mx-auto lg:max-w-lg">
             {/* Mobile Header - Only visible on small screens */}
             <div className="lg:hidden text-center mb-8">
               <div className="flex items-center justify-center gap-3 mb-4">
                 <div className="relative">
                   <div className="w-12 h-12 bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-xl">
                     <Brain className="h-6 w-6 text-white" />
                   </div>
                   <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                     <Sparkles className="h-2 w-2 text-yellow-900" />
                   </div>
                 </div>
                 <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                   Connect AI
                 </h1>
               </div>
               <p className="text-slate-300 text-sm">
                 Plataforma Educacional Inteligente
               </p>
             </div>

             <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden">
               <CardHeader className="space-y-3 pb-6 pt-6 lg:pt-8 px-6 lg:px-8 text-center">
                 <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center mx-auto">
                   <Lock className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
                 </div>
                 <CardTitle className="text-xl lg:text-2xl font-bold text-white">
                   Bem-vindo de volta!
                 </CardTitle>
                 <p className="text-slate-300 text-sm lg:text-base">
                   Entre para continuar sua jornada educacional
                 </p>
               </CardHeader>
               
               <CardContent className="px-6 lg:px-8 pb-6 lg:pb-8">
                 <form onSubmit={handleLogin} className="space-y-5 lg:space-y-6">
                   {/* Email Input */}
                   <div className="space-y-2">
                     <Label htmlFor="email" className="text-sm font-semibold text-slate-200">
                       Email
                     </Label>
                     <Input
                       id="email"
                       type="email"
                       value={email}
                       onChange={(e) => setEmail(e.target.value)}
                       placeholder="seu@email.com"
                       required
                       className="h-11 lg:h-12 text-base rounded-xl bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                       disabled={isLoading}
                       autoComplete="email"
                     />
                   </div>

                   {/* Password Input */}
                   <div className="space-y-2">
                     <Label htmlFor="password" className="text-sm font-semibold text-slate-200">
                       Palavra-passe
                     </Label>
                     <div className="relative">
                       <Input
                         id="password"
                         type={showPassword ? 'text' : 'password'}
                         value={password}
                         onChange={(e) => setPassword(e.target.value)}
                         placeholder="Introduza a sua palavra-passe"
                         required
                         className="h-11 lg:h-12 text-base rounded-xl bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 pr-12"
                         disabled={isLoading}
                         autoComplete="current-password"
                       />
                       <Button
                         type="button"
                         variant="ghost"
                         size="sm"
                         className="absolute right-0 top-0 h-11 lg:h-12 px-3 py-2 hover:bg-white/10 text-slate-400 hover:text-white"
                         onClick={() => setShowPassword(!showPassword)}
                         disabled={isLoading}
                       >
                         {showPassword ? (
                           <EyeOff className="h-4 w-4 lg:h-5 lg:w-5" />
                         ) : (
                           <Eye className="h-4 w-4 lg:h-5 lg:w-5" />
                         )}
                       </Button>
                     </div>
                   </div>

                   {/* Error Alert */}
                   {error && (
                     <Alert variant="destructive" className="rounded-xl bg-red-500/20 border-red-500/30 text-red-200">
                       <AlertCircle className="h-4 w-4" />
                       <AlertDescription className="text-sm">{error}</AlertDescription>
                     </Alert>
                   )}

                   {/* Login Button */}
                   <Button 
                     type="submit" 
                     className="w-full h-11 lg:h-12 text-base font-semibold bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 hover:from-blue-600 hover:via-purple-600 hover:to-indigo-600 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] border-0"
                     disabled={isLoading}
                   >
                     {isLoading ? (
                       <div className="flex items-center gap-2">
                         <div className="animate-spin rounded-full h-4 w-4 lg:h-5 lg:w-5 border-2 border-white border-t-transparent" />
                         <span className="text-sm lg:text-base">Entrando...</span>
                       </div>
                     ) : (
                       <div className="flex items-center gap-2">
                         <Lock className="h-4 w-4 lg:h-5 lg:w-5" />
                         <span className="text-sm lg:text-base">Entrar na Plataforma</span>
                         <ArrowRight className="h-4 w-4 lg:h-5 lg:w-5" />
                       </div>
                     )}
                   </Button>

                   {/* Forgot Password Link */}
                   <div className="text-center pt-2">
                     <button
                       type="button"
                       className="text-sm text-slate-300 hover:text-blue-400 transition-colors duration-200 underline-offset-4 hover:underline"
                       onClick={() => startTransition(() => navigate('/esqueci-senha'))}
                     >
                       Esqueceu-se da palavra-passe?
                     </button>
                   </div>
                 </form>

                 {/* Footer */}
                 <div className="mt-6 lg:mt-8 pt-6 border-t border-white/10 text-center">
                   <p className="text-xs text-slate-400 mb-2">
                     Protegido por criptografia de ponta a ponta
                   </p>
                   <div className="flex items-center justify-center gap-2">
                     <Shield className="h-3 w-3 lg:h-4 lg:w-4 text-green-400" />
                     <span className="text-xs text-green-400 font-medium">Conexão Segura</span>
                   </div>
                 </div>
               </CardContent>
             </Card>

             {/* Mobile Features - Only visible on small screens */}
             <div className="lg:hidden mt-8 grid grid-cols-2 gap-3">
               <div className="flex items-center gap-2 p-3 bg-white/5 rounded-lg backdrop-blur-sm border border-white/10">
                 <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                   <Brain className="h-4 w-4 text-blue-400" />
                 </div>
                 <div className="min-w-0 flex-1">
                   <h3 className="font-medium text-white text-xs">IA Personalizada</h3>
                   <p className="text-xs text-slate-400 truncate">Adaptação inteligente</p>
                 </div>
               </div>
               
               <div className="flex items-center gap-2 p-3 bg-white/5 rounded-lg backdrop-blur-sm border border-white/10">
                 <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                   <BookOpen className="h-4 w-4 text-purple-400" />
                 </div>
                 <div className="min-w-0 flex-1">
                   <h3 className="font-medium text-white text-xs">Conteúdo Rico</h3>
                   <p className="text-xs text-slate-400 truncate">Materiais diversos</p>
                 </div>
               </div>
             </div>

             {/* Mobile Stats */}
             <div className="lg:hidden mt-6 flex items-center justify-center gap-6 text-center">
               <div>
                 <div className="text-lg font-bold text-blue-400">1000+</div>
                 <div className="text-xs text-slate-300">Alunos</div>
               </div>
               <div>
                 <div className="text-lg font-bold text-purple-400">50+</div>
                 <div className="text-xs text-slate-300">Escolas</div>
               </div>
               <div>
                 <div className="text-lg font-bold text-indigo-400">95%</div>
                 <div className="text-xs text-slate-300">Satisfação</div>
               </div>
             </div>
           </div>
        </div>
      </div>

      {/* TOTP Modal */}
      <Dialog open={isPendingTotp} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md bg-white/10 backdrop-blur-xl border border-white/20 text-white mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white text-lg lg:text-xl">
              <Smartphone className="h-5 w-5 text-blue-400" />
              Verificação de Segurança
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-sm lg:text-base">
              Introduza o código de 6 dígitos da sua aplicação autenticadora
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleTotpSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="totpCode" className="text-sm font-medium text-slate-200">
                Código TOTP
              </Label>
              <Input
                id="totpCode"
                type="text"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="text-center text-xl lg:text-2xl tracking-widest h-12 lg:h-14 bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                autoComplete="one-time-code"
                autoFocus
              />
            </div>
            
            {error && (
              <Alert variant="destructive" className="bg-red-500/20 border-red-500/30 text-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelTotp}
                className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20 h-10 lg:h-11"
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={totpCode.length !== 6 || isLoading}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 h-10 lg:h-11"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  'Verificar'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
