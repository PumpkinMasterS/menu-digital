import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native'
import { useRoute, useNavigation } from '@react-navigation/native'
import { Button, Input } from '@/components/ui'
import { supabase } from '@/config/supabase'
import Icon from 'react-native-vector-icons/MaterialIcons'

interface ActivationParams {
  token?: string
  email?: string
}

interface PasswordForm {
  password: string
  confirmPassword: string
}

export default function ActivationScreen() {
  const route = useRoute()
  const navigation = useNavigation()
  const params = route.params as ActivationParams
  
  const [form, setForm] = useState<PasswordForm>({
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [activating, setActivating] = useState(false)
  const [errors, setErrors] = useState<Partial<PasswordForm>>({})
  const [email, setEmail] = useState(params?.email || '')

  useEffect(() => {
    if (params?.token && params?.email) {
      handleTokenActivation()
    }
  }, [params])

  const handleTokenActivation = async () => {
    if (!params?.token || !params?.email) {
      Alert.alert('Erro', 'Link de ativação inválido')
      return
    }

    setActivating(true)
    try {
      // Verificar e ativar o token
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: params.token,
        type: 'email',
      })

      if (error) {
        console.error('Token verification error:', error)
        Alert.alert(
          'Erro de Ativação',
          'Link de ativação expirado ou inválido. Solicite um novo link ao administrador.'
        )
        return
      }

      if (data.user) {
        // Verificar se é um motorista
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, full_name, account_activated')
          .eq('id', data.user.id)
          .eq('role', 'driver')
          .single()

        if (profileError || !profile) {
          Alert.alert('Erro', 'Conta não encontrada ou não é uma conta de motorista')
          return
        }

        if (profile.account_activated) {
          Alert.alert(
            'Conta já ativada',
            'Sua conta já foi ativada. Faça login normalmente.',
            [{ text: 'OK', onPress: () => navigation.navigate('Login' as never) }]
          )
          return
        }

        setEmail(params.email)
        Alert.alert(
          'Ativação Confirmada!',
          `Olá ${profile.full_name}! Agora defina sua nova senha para completar a ativação.`
        )
      }
    } catch (error: any) {
      console.error('Activation error:', error)
      Alert.alert('Erro', 'Erro ao ativar conta. Tente novamente.')
    } finally {
      setActivating(false)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<PasswordForm> = {}

    if (!form.password) {
      newErrors.password = 'Senha é obrigatória'
    } else if (form.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres'
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = 'Confirmação de senha é obrigatória'
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Senhas não coincidem'
    }

    if (!email) {
      Alert.alert('Erro', 'Email não encontrado. Use o link enviado por email.')
      return false
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleActivation = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      // Atualizar senha do usuário
      const { error: passwordError } = await supabase.auth.updateUser({
        password: form.password
      })

      if (passwordError) {
        throw passwordError
      }

      // Marcar conta como ativada
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          account_activated: true,
          account_activated_at: new Date().toISOString(),
          temp_password_hash: null // Limpar senha temporária
        })
        .eq('email', email)

      if (updateError) {
        throw updateError
      }

      Alert.alert(
        'Conta Ativada! 🎉',
        'Sua conta foi ativada com sucesso! Agora você pode fazer login e começar a receber entregas.',
        [
          {
            text: 'Fazer Login',
            onPress: () => navigation.navigate('Login' as never)
          }
        ]
      )

    } catch (error: any) {
      console.error('Password update error:', error)
      Alert.alert(
        'Erro',
        error.message || 'Erro ao ativar conta. Tente novamente.'
      )
    } finally {
      setLoading(false)
    }
  }

  const updateForm = (field: keyof PasswordForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  if (activating) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Icon name="hourglass-empty" size={64} color="#10B981" />
          <Text style={styles.loadingText}>Ativando sua conta...</Text>
          <Text style={styles.loadingSubtext}>Por favor, aguarde</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Icon name="verified-user" size={64} color="#10B981" />
              </View>
              <Text style={styles.title}>Ativar Conta</Text>
              <Text style={styles.subtitle}>
                Defina sua nova senha para completar a ativação da sua conta de motorista
              </Text>
            </View>

            {/* Email Display */}
            {email && (
              <View style={styles.emailContainer}>
                <Icon name="email" size={20} color="#6B7280" />
                <Text style={styles.emailText}>{email}</Text>
              </View>
            )}

            {/* Form */}
            <View style={styles.form}>
              <Input
                label="Nova Senha"
                placeholder="Digite sua nova senha"
                value={form.password}
                onChangeText={(value) => updateForm('password', value)}
                secureTextEntry
                error={errors.password}
                leftIcon="lock"
              />

              <Input
                label="Confirmar Senha"
                placeholder="Confirme sua nova senha"
                value={form.confirmPassword}
                onChangeText={(value) => updateForm('confirmPassword', value)}
                secureTextEntry
                error={errors.confirmPassword}
                leftIcon="lock-outline"
              />

              <View style={styles.passwordRequirements}>
                <Text style={styles.requirementsTitle}>Requisitos da senha:</Text>
                <View style={styles.requirement}>
                  <Icon 
                    name={form.password.length >= 6 ? "check-circle" : "radio-button-unchecked"} 
                    size={16} 
                    color={form.password.length >= 6 ? "#10B981" : "#9CA3AF"} 
                  />
                  <Text style={[
                    styles.requirementText,
                    form.password.length >= 6 && styles.requirementMet
                  ]}>
                    Pelo menos 6 caracteres
                  </Text>
                </View>
                <View style={styles.requirement}>
                  <Icon 
                    name={form.password === form.confirmPassword && form.password ? "check-circle" : "radio-button-unchecked"} 
                    size={16} 
                    color={form.password === form.confirmPassword && form.password ? "#10B981" : "#9CA3AF"} 
                  />
                  <Text style={[
                    styles.requirementText,
                    form.password === form.confirmPassword && form.password && styles.requirementMet
                  ]}>
                    Senhas coincidem
                  </Text>
                </View>
              </View>

              <Button
                title="Ativar Conta"
                onPress={handleActivation}
                loading={loading}
                disabled={loading}
                style={styles.activateButton}
              />
            </View>

            {/* Help */}
            <View style={styles.helpContainer}>
              <Text style={styles.helpText}>
                Problemas com a ativação?{'\n'}
                Entre em contato com o administrador
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  emailText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
    fontWeight: '500',
  },
  form: {
    gap: 20,
  },
  passwordRequirements: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  requirementMet: {
    color: '#10B981',
    fontWeight: '500',
  },
  activateButton: {
    marginTop: 16,
  },
  helpContainer: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  helpText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
})