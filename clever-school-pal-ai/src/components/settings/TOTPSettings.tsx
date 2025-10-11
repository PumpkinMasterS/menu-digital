import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Shield, QrCode, Smartphone, AlertTriangle, CheckCircle, Key, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUnifiedAuth } from "@/contexts/UnifiedAuthContext";

interface TOTPFactor {
  id: string;
  friendly_name?: string;
  factor_type: 'totp';
  status: 'unverified' | 'verified';
  created_at: string;
  updated_at: string;
}

export function TOTPSettings() {
  const { user } = useUnifiedAuth();
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [factorId, setFactorId] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [factors, setFactors] = useState<TOTPFactor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [currentAAL, setCurrentAAL] = useState<'aal1' | 'aal2'>('aal1');
  const [totpUri, setTotpUri] = useState<string>('');

  // Carregar fatores MFA existentes
  useEffect(() => {
    loadMFAFactors();
    checkAAL();
  }, []);

  const loadMFAFactors = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.mfa.listFactors();
      
      if (error) {
        setError(`Erro ao carregar fatores MFA: ${error.message}`);
        return;
      }

      const totpFactors = (data.totp || []).filter(factor => factor.factor_type === 'totp') as TOTPFactor[];
      setFactors(totpFactors);
    } catch (err) {
      setError(`Erro inesperado: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const checkAAL = async () => {
    try {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      setCurrentAAL(data.currentLevel as 'aal1' | 'aal2');
    } catch (err) {
      console.error('Erro ao verificar AAL:', err);
    }
  };

  const startEnrollment = async () => {
    try {
      setIsEnrolling(true);
      setError('');
      
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Clever School PAL - Autenticador'
      });

      if (error) {
        setError(`Erro ao iniciar configuração: ${error.message}`);
        return;
      }

      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setTotpUri(data.totp.uri);
      
      if (import.meta.env.DEV) {
        console.log('QR Code gerado:', {
          factorId: data.id,
          hasQrCode: !!data.totp.qr_code,
          qrCodeLength: data.totp.qr_code?.length,
          secret: data.totp.secret,
          uri: data.totp.uri
        });
      }
      
      toast.success('QR Code gerado! Escaneie com seu app autenticador.');
    } catch (err) {
      setError(`Erro inesperado: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setIsEnrolling(false);
    }
  };

  const verifyTOTP = async () => {
    if (!verificationCode.trim()) {
      setError('Por favor, insira o código de verificação');
      return;
    }

    try {
      setError('');
      
      // Criar desafio
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) {
        setError(`Erro ao criar desafio: ${challenge.error.message}`);
        return;
      }

      // Verificar código
      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: verificationCode.trim()
      });

      if (verify.error) {
        setError(`Código inválido: ${verify.error.message}`);
        setVerificationCode(''); // Limpar campo para nova tentativa
        // Focus no campo para nova tentativa
        setTimeout(() => {
          const input = document.getElementById('verification-code');
          input?.focus();
        }, 100);
        return;
      }

      // Sucesso!
      toast.success('🎉 TOTP configurado com sucesso! Sua conta agora está protegida com 2FA.');
      
      // Resetar estado e recarregar fatores
      setQrCode('');
      setSecret('');
      setFactorId('');
      setVerificationCode('');
      await loadMFAFactors();
      await checkAAL();
      
    } catch (err) {
      setError(`Erro inesperado: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }
  };

  const unenrollFactor = async (factorId: string) => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      
      if (error) {
        setError(`Erro ao remover fator: ${error.message}`);
        return;
      }

      toast.success('Fator de autenticação removido com sucesso');
      await loadMFAFactors();
      await checkAAL();
      
    } catch (err) {
      setError(`Erro inesperado: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    toast.success('Chave secreta copiada!');
  };

  const hasVerifiedTOTP = factors.some(f => f.status === 'verified');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Autenticação de Dois Fatores (TOTP)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Autenticação de Dois Fatores (TOTP)
          {hasVerifiedTOTP && <Badge variant="secondary" className="bg-green-100 text-green-800">Ativo</Badge>}
        </CardTitle>
        <CardDescription>
          Adicione uma camada extra de segurança à sua conta usando um aplicativo autenticador
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Status atual */}
        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
          {hasVerifiedTOTP ? (
            <>
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">TOTP Ativo</p>
                <p className="text-sm text-muted-foreground">
                  Sua conta está protegida com autenticação de dois fatores
                </p>
              </div>
              <Badge variant="outline" className="ml-auto">
                AAL{currentAAL.slice(-1)}
              </Badge>
            </>
          ) : (
            <>
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">TOTP Inativo</p>
                <p className="text-sm text-muted-foreground">
                  Configure TOTP para maior segurança
                </p>
              </div>
            </>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Lista de fatores existentes */}
        {factors.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Fatores Configurados</h4>
            {factors.map((factor) => (
              <div key={factor.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{factor.friendly_name || 'Autenticador TOTP'}</p>
                    <p className="text-sm text-muted-foreground">
                      Status: {factor.status === 'verified' ? 'Verificado' : 'Pendente'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={factor.status === 'verified' ? 'default' : 'secondary'}>
                    {factor.status === 'verified' ? 'Ativo' : 'Pendente'}
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => unenrollFactor(factor.id)}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Separator />

        {/* Configuração de novo TOTP */}
        {!qrCode ? (
          <div className="space-y-4">
            <h4 className="font-medium">Configurar Novo TOTP</h4>
            <p className="text-sm text-muted-foreground">
              Use um aplicativo como Google Authenticator, Authy, ou 1Password para escanear o QR code
            </p>
            <Button 
              onClick={startEnrollment} 
              disabled={isEnrolling}
              className="w-full"
            >
              {isEnrolling ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Gerando QR Code...
                </>
              ) : (
                <>
                  <QrCode className="h-4 w-4 mr-2" />
                  Configurar TOTP
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <h4 className="font-medium">Escaneie o QR Code</h4>
            
            {/* QR Code */}
            <div className="flex flex-col items-center space-y-4">
              <div className="flex justify-center p-4 bg-white dark:bg-gray-100 rounded-lg border min-h-[240px] min-w-[240px]">
                {qrCode ? (
                  <div className="qr-code-container">
                    <div 
                      dangerouslySetInnerHTML={{ __html: qrCode }}
                      className="flex justify-center items-center [&>svg]:w-[200px] [&>svg]:h-[200px] [&>svg]:block"
                    />
                    {import.meta.env.DEV && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                        QR: {qrCode.length} chars
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-[200px] h-[200px] flex items-center justify-center border-2 border-dashed border-gray-300 rounded">
                    <p className="text-sm text-gray-500">Carregando QR Code...</p>
                  </div>
                )}
              </div>
              <div className="text-center space-y-2">
                <p className="text-xs text-muted-foreground">
                  Escaneie com Google Authenticator, Authy, ou outro app TOTP
                </p>
                {totpUri && (
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    <a 
                      href={totpUri} 
                      className="underline hover:no-underline"
                      onClick={(e) => {
                        e.preventDefault();
                        navigator.clipboard.writeText(totpUri);
                        toast.success('URI TOTP copiado!');
                      }}
                    >
                      Clique para copiar URI TOTP
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Chave manual */}
            <div className="space-y-2">
              <Label>Ou insira a chave manualmente:</Label>
              <div className="flex gap-2">
                <Input 
                  value={secret} 
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button variant="outline" size="sm" onClick={copySecret}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Verificação */}
            <div className="space-y-3">
              <Label htmlFor="verification-code">Código de Verificação</Label>
              <Input
                id="verification-code"
                placeholder="Digite aqui"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-lg tracking-wider font-mono"
                maxLength={6}
                autoFocus
              />
              <p className="text-sm text-muted-foreground">
                Insira o código de 6 dígitos do seu aplicativo autenticador
              </p>
              
              <div className="flex gap-2">
                <Button onClick={verifyTOTP} className="flex-1">
                  <Key className="h-4 w-4 mr-2" />
                  Verificar e Ativar
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setQrCode('');
                    setSecret('');
                    setFactorId('');
                    setVerificationCode('');
                    setError('');
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Informações adicionais */}
        <Alert className={user?.role === 'super_admin' && !hasVerifiedTOTP ? 'border-amber-200 bg-amber-50 dark:bg-amber-950' : ''}>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            {user?.role === 'super_admin' ? (
              <>
                <strong>Obrigatório para Super Admins:</strong> Como super administrador, você deve configurar 
                TOTP para garantir máxima segurança do sistema. Esta é uma medida de segurança obrigatória.
              </>
            ) : (
              <>
                <strong>Importante:</strong> Configure TOTP para adicionar uma camada extra de segurança à sua conta. 
                Guarde seus códigos de recuperação em local seguro.
              </>
            )}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
