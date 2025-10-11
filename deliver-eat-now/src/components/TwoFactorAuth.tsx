import React, { useState, useEffect, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, Copy, Download, Eye, EyeOff, RefreshCw, Shield, Smartphone } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

interface TwoFactorSetup {
  secret: string
  qrCodeUrl: string
  backupCodes: string[]
  isEnabled: boolean
  lastUsed?: number
  deviceName?: string
}

interface VerificationAttempt {
  code: string
  timestamp: number
  successful: boolean
  ipAddress?: string
}

// Generate a secure random secret
const generateSecret = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Generate backup codes
const generateBackupCodes = (): string[] => {
  const codes: string[] = []
  for (let i = 0; i < 10; i++) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase()
    codes.push(code)
  }
  return codes
}

// Simple TOTP implementation (in production, use a proper library)
const generateTOTP = (secret: string, timeStep: number = 30): string => {
  const time = Math.floor(Date.now() / 1000 / timeStep)
  // This is a simplified TOTP implementation
  // In production, use libraries like 'otplib' or similar
  const hash = btoa(secret + time.toString()).slice(0, 6)
  return hash.replace(/[^0-9]/g, '0').padEnd(6, '0').slice(0, 6)
}

// Verify TOTP code
const verifyTOTP = (secret: string, code: string, timeStep: number = 30, window: number = 1): boolean => {
  const time = Math.floor(Date.now() / 1000 / timeStep)
  
  for (let i = -window; i <= window; i++) {
    const expectedCode = generateTOTP(secret, timeStep)
    if (expectedCode === code) {
      return true
    }
  }
  return false
}

const TwoFactorAuth: React.FC = () => {
  const { user, profile } = useAuth()
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [verificationHistory, setVerificationHistory] = useState<VerificationAttempt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [step, setStep] = useState<'setup' | 'verify' | 'manage'>('setup')

  // Check if user is Platform Owner
  const isPlatformOwner = profile?.role === 'platform_owner'

  // Load existing 2FA setup
  const load2FASetup = useCallback(async () => {
    if (!user || !isPlatformOwner) return

    try {
      const { data, error } = await supabase
        .from('user_2fa')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') { // Not found error
        console.error('Error loading 2FA setup:', error)
        return
      }

      if (data) {
        setSetup({
          secret: data.secret,
          qrCodeUrl: data.qr_code_url,
          backupCodes: data.backup_codes || [],
          isEnabled: data.is_enabled,
          lastUsed: data.last_used ? new Date(data.last_used).getTime() : undefined,
          deviceName: data.device_name
        })
        setStep(data.is_enabled ? 'manage' : 'verify')
      }
    } catch (error) {
      console.error('Error loading 2FA setup:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user, isPlatformOwner])

  // Initialize 2FA setup
  const initialize2FA = useCallback(async () => {
    if (!user || !isPlatformOwner) return

    const secret = generateSecret()
    const backupCodes = generateBackupCodes()
    const qrCodeUrl = `otpauth://totp/${encodeURIComponent('Deliver Eat Now')}:${encodeURIComponent(user.email || '')}?secret=${secret}&issuer=${encodeURIComponent('Deliver Eat Now')}`

    const newSetup: TwoFactorSetup = {
      secret,
      qrCodeUrl,
      backupCodes,
      isEnabled: false
    }

    setSetup(newSetup)
    setStep('verify')

    // Save to database
    try {
      await supabase.from('user_2fa').upsert({
        user_id: user.id,
        secret,
        qr_code_url: qrCodeUrl,
        backup_codes: backupCodes,
        is_enabled: false,
        created_at: new Date().toISOString()
      })

      // Log setup initiation
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: '2fa_setup_initiated',
        resource_type: 'security',
        resource_id: user.id,
        details: { 
          deviceName: navigator.userAgent,
          ipAddress: await getCurrentIP()
        }
      })

      toast.success('2FA setup initiated')
    } catch (error) {
      console.error('Error saving 2FA setup:', error)
      toast.error('Failed to initialize 2FA setup')
    }
  }, [user, isPlatformOwner])

  // Verify and enable 2FA
  const verify2FA = useCallback(async () => {
    if (!setup || !verificationCode || !user) return

    setIsVerifying(true)

    try {
      const isValid = verifyTOTP(setup.secret, verificationCode)
      
      const attempt: VerificationAttempt = {
        code: verificationCode,
        timestamp: Date.now(),
        successful: isValid,
        ipAddress: await getCurrentIP()
      }

      setVerificationHistory(prev => [attempt, ...prev].slice(0, 10))

      if (isValid) {
        // Enable 2FA
        await supabase.from('user_2fa').update({
          is_enabled: true,
          verified_at: new Date().toISOString(),
          last_used: new Date().toISOString()
        }).eq('user_id', user.id)

        setSetup(prev => prev ? { ...prev, isEnabled: true, lastUsed: Date.now() } : null)
        setStep('manage')

        // Log successful setup
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: '2fa_enabled',
          resource_type: 'security',
          resource_id: user.id,
          details: { 
            verificationCode: verificationCode.replace(/./g, '*'),
            deviceName: navigator.userAgent
          }
        })

        toast.success('2FA enabled successfully!')
        setVerificationCode('')
      } else {
        // Log failed attempt
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: '2fa_verification_failed',
          resource_type: 'security',
          resource_id: user.id,
          details: { 
            attemptedCode: verificationCode.replace(/./g, '*'),
            ipAddress: await getCurrentIP()
          }
        })

        toast.error('Invalid verification code')
      }
    } catch (error) {
      console.error('Error verifying 2FA:', error)
      toast.error('Failed to verify 2FA code')
    } finally {
      setIsVerifying(false)
    }
  }, [setup, verificationCode, user])

  // Disable 2FA
  const disable2FA = useCallback(async () => {
    if (!user || !setup) return

    try {
      await supabase.from('user_2fa').update({
        is_enabled: false,
        disabled_at: new Date().toISOString()
      }).eq('user_id', user.id)

      setSetup(prev => prev ? { ...prev, isEnabled: false } : null)

      // Log disable action
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: '2fa_disabled',
        resource_type: 'security',
        resource_id: user.id,
        details: { 
          reason: 'user_requested',
          ipAddress: await getCurrentIP()
        }
      })

      toast.success('2FA disabled')
    } catch (error) {
      console.error('Error disabling 2FA:', error)
      toast.error('Failed to disable 2FA')
    }
  }, [user, setup])

  // Regenerate backup codes
  const regenerateBackupCodes = useCallback(async () => {
    if (!user || !setup) return

    const newBackupCodes = generateBackupCodes()

    try {
      await supabase.from('user_2fa').update({
        backup_codes: newBackupCodes,
        backup_codes_regenerated_at: new Date().toISOString()
      }).eq('user_id', user.id)

      setSetup(prev => prev ? { ...prev, backupCodes: newBackupCodes } : null)

      // Log regeneration
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: '2fa_backup_codes_regenerated',
        resource_type: 'security',
        resource_id: user.id,
        details: { 
          previousCodesCount: setup.backupCodes.length,
          newCodesCount: newBackupCodes.length
        }
      })

      toast.success('Backup codes regenerated')
    } catch (error) {
      console.error('Error regenerating backup codes:', error)
      toast.error('Failed to regenerate backup codes')
    }
  }, [user, setup])

  // Copy to clipboard
  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied to clipboard`)
    }).catch(() => {
      toast.error('Failed to copy to clipboard')
    })
  }, [])

  // Download backup codes
  const downloadBackupCodes = useCallback(() => {
    if (!setup) return

    const content = `Deliver Eat Now - 2FA Backup Codes
Generated: ${new Date().toLocaleDateString()}
User: ${user?.email}

${setup.backupCodes.map((code, index) => `${index + 1}. ${code}`).join('\n')}

Important:
- Keep these codes in a safe place
- Each code can only be used once
- These codes can be used if you lose access to your authenticator app
- Regenerate new codes if these are compromised`

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `deliver-eat-now-backup-codes-${new Date().getTime()}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }, [setup, user])

  // Get current IP
  const getCurrentIP = useCallback(async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json')
      const data = await response.json()
      return data.ip
    } catch {
      return 'unknown'
    }
  }, [])

  // Load setup on mount
  useEffect(() => {
    load2FASetup()
  }, [load2FASetup])

  // Check if platform owner
  if (!isPlatformOwner) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            2FA is only available for Platform Owners
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">
              You need Platform Owner privileges to access 2FA settings.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="ml-2">Loading 2FA settings...</span>
        </CardContent>
      </Card>
    )
  }

  // Setup step
  if (step === 'setup') {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Setup Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your Platform Owner account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <Smartphone className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Secure Your Account</h3>
            <p className="text-gray-600 mb-4">
              2FA provides additional security by requiring a verification code from your mobile device.
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Before you start:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Install an authenticator app (Google Authenticator, Authy, etc.)</li>
              <li>• Have your mobile device ready</li>
              <li>• Ensure you can access your email</li>
            </ul>
          </div>

          <Button onClick={initialize2FA} className="w-full">
            Setup 2FA
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Verification step
  if (step === 'verify' && setup && !setup.isEnabled) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Verify Your Authenticator</CardTitle>
          <CardDescription>
            Scan the QR code with your authenticator app and enter the verification code
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* QR Code */}
          <div className="text-center">
            <div className="bg-white p-4 rounded-lg inline-block shadow-sm">
              <QRCodeSVG value={setup.qrCodeUrl} size={200} />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Scan this QR code with your authenticator app
            </p>
          </div>

          {/* Manual entry */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-semibold mb-2">Can't scan? Enter manually:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white p-2 rounded text-sm font-mono">
                {setup.secret}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(setup.secret, 'Secret key')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Verification */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Verification Code</label>
              <Input
                type="text"
                placeholder="Enter 6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="text-center text-lg tracking-widest"
              />
            </div>

            <Button
              onClick={verify2FA}
              disabled={verificationCode.length !== 6 || isVerifying}
              className="w-full"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify and Enable 2FA'
              )}
            </Button>
          </div>

          {/* Backup codes preview */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm font-semibold text-yellow-800 mb-2">
              Backup codes will be generated
            </p>
            <p className="text-sm text-yellow-700">
              After verification, you'll receive backup codes to access your account if you lose your device.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Management step
  if (step === 'manage' && setup?.isEnabled) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-500" />
              Two-Factor Authentication
              <Badge variant="outline" className="text-green-600 border-green-600">
                Enabled
              </Badge>
            </CardTitle>
            <CardDescription>
              Your account is protected with 2FA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Status</p>
                <p className="text-sm text-gray-600">
                  {setup.lastUsed 
                    ? `Last used: ${new Date(setup.lastUsed).toLocaleDateString()}`
                    : 'Never used'
                  }
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>

            <div className="pt-4 border-t">
              <Button variant="destructive" onClick={disable2FA}>
                Disable 2FA
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Backup Codes Card */}
        <Card>
          <CardHeader>
            <CardTitle>Backup Codes</CardTitle>
            <CardDescription>
              Use these codes to access your account if you lose your authenticator device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowBackupCodes(!showBackupCodes)}
              >
                {showBackupCodes ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Hide Codes
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Show Codes
                  </>
                )}
              </Button>
              
              <Button variant="outline" onClick={downloadBackupCodes}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              
              <Button variant="outline" onClick={regenerateBackupCodes}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate
              </Button>
            </div>

            {showBackupCodes && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2">
                  {setup.backupCodes.map((code, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-white p-2 rounded border"
                    >
                      <code className="font-mono text-sm">{code}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(code, `Code ${index + 1}`)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Each code can only be used once. Store them securely!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        {verificationHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Verification Attempts</CardTitle>
              <CardDescription>
                Last {verificationHistory.length} verification attempts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {verificationHistory.map((attempt, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b last:border-b-0"
                  >
                    <div>
                      <p className="text-sm">
                        {new Date(attempt.timestamp).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-600">
                        IP: {attempt.ipAddress}
                      </p>
                    </div>
                    <Badge variant={attempt.successful ? "default" : "destructive"}>
                      {attempt.successful ? 'Success' : 'Failed'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return null
}

export default TwoFactorAuth 