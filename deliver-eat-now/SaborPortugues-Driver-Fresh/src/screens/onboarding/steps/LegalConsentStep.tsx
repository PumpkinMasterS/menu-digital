import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { Button } from '@/components/ui'
import { OnboardingData } from '../OnboardingWizard'

interface LegalConsentStepProps {
  data: OnboardingData
  onNext: () => void
  onUpdateData: (data: Partial<OnboardingData>) => void
  loading: boolean
  canGoBack: boolean
}

export default function LegalConsentStep({
  data,
  onNext,
  onUpdateData,
  loading
}: LegalConsentStepProps) {
  const [acceptedRgpd, setAcceptedRgpd] = useState(data.acceptedRgpd)

  const handleAcceptRgpd = (accepted: boolean) => {
    setAcceptedRgpd(accepted)
    onUpdateData({
      acceptedRgpd: accepted,
      rgpdTimestamp: accepted ? new Date().toISOString() : undefined
    })
  }

  const openPrivacyPolicy = () => {
    Linking.openURL('https://saborportugues.com/privacy-policy')
  }

  const openTermsOfService = () => {
    Linking.openURL('https://saborportugues.com/terms-of-service')
  }

  const handleNext = () => {
    if (!acceptedRgpd) {
      Alert.alert(
        'Consentimento Obrigatório',
        'Você deve aceitar o tratamento dos seus dados pessoais para continuar.'
      )
      return
    }
    onNext()
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Icon name="security" size={48} color="#10B981" />
        </View>
        <Text style={styles.title}>Consentimento Legal</Text>
        <Text style={styles.subtitle}>
          Para continuar, precisamos do seu consentimento para o tratamento dos seus dados pessoais
        </Text>
      </View>

      {/* Informações RGPD */}
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Proteção de Dados (RGPD)</Text>
        <Text style={styles.infoText}>
          De acordo com o Regulamento Geral sobre a Proteção de Dados (RGPD), 
          informamos que os seus dados pessoais serão utilizados para:
        </Text>
        
        <View style={styles.purposeList}>
          <View style={styles.purposeItem}>
            <Icon name="check-circle" size={20} color="#10B981" />
            <Text style={styles.purposeText}>
              Gestão da sua conta de motorista
            </Text>
          </View>
          <View style={styles.purposeItem}>
            <Icon name="check-circle" size={20} color="#10B981" />
            <Text style={styles.purposeText}>
              Processamento de entregas e pagamentos
            </Text>
          </View>
          <View style={styles.purposeItem}>
            <Icon name="check-circle" size={20} color="#10B981" />
            <Text style={styles.purposeText}>
              Comunicação sobre o serviço
            </Text>
          </View>
          <View style={styles.purposeItem}>
            <Icon name="check-circle" size={20} color="#10B981" />
            <Text style={styles.purposeText}>
              Cumprimento de obrigações legais e fiscais
            </Text>
          </View>
        </View>
      </View>

      {/* Direitos do utilizador */}
      <View style={styles.rightsSection}>
        <Text style={styles.sectionTitle}>Os Seus Direitos</Text>
        <Text style={styles.infoText}>
          Tem o direito de aceder, retificar, apagar ou limitar o tratamento dos seus dados, 
          bem como o direito à portabilidade dos dados e à retirada do consentimento.
        </Text>
      </View>

      {/* Links para documentos */}
      <View style={styles.linksSection}>
        <TouchableOpacity style={styles.linkButton} onPress={openPrivacyPolicy}>
          <Icon name="description" size={20} color="#3B82F6" />
          <Text style={styles.linkText}>Política de Privacidade</Text>
          <Icon name="open-in-new" size={16} color="#3B82F6" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={openTermsOfService}>
          <Icon name="gavel" size={20} color="#3B82F6" />
          <Text style={styles.linkText}>Termos de Uso</Text>
          <Icon name="open-in-new" size={16} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {/* Checkbox de consentimento */}
      <View style={styles.consentSection}>
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => handleAcceptRgpd(!acceptedRgpd)}
        >
          <View style={[styles.checkbox, acceptedRgpd && styles.checkboxChecked]}>
            {acceptedRgpd && (
              <Icon name="check" size={16} color="#FFFFFF" />
            )}
          </View>
          <Text style={styles.checkboxText}>
            Aceito o tratamento dos meus dados pessoais de acordo com a Política de Privacidade 
            e os Termos de Uso, e autorizo o processamento dos mesmos para os fins descritos.
          </Text>
        </TouchableOpacity>
      </View>

      {/* Botão de continuar */}
      <View style={styles.buttonContainer}>
        <Button
          title="Continuar"
          onPress={handleNext}
          disabled={!acceptedRgpd || loading}
          loading={loading}
        />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
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
  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 16,
  },
  purposeList: {
    gap: 12,
  },
  purposeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  purposeText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  rightsSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  linksSection: {
    marginBottom: 32,
    gap: 12,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  linkText: {
    flex: 1,
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '500',
  },
  consentSection: {
    marginBottom: 32,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkboxText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: 16,
  },
})