import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native'
import LegalConsentStep from './steps/LegalConsentStep'
import PersonalDataStep from './steps/PersonalDataStep'
import DocumentsStep from './steps/DocumentsStep'
import ValidationStep from './steps/ValidationStep'
import { driverQueries } from '@/config/supabase'
import { useAuth } from '@/hooks/useAuth'

interface OnboardingData {
  legalConsent: {
    acceptedRGPD: boolean
    acceptedTerms: boolean
    consentTimestamp?: string
  }
  personalData: {
    fullName: string
    nif: string
    niss?: string
    address: string
    iban: string
    vehicleType: 'bicycle' | 'motorcycle' | 'car'
  }
  documents: {
    identification: string
    drivingLicense?: string
    taxDocument: string
    vehicleInsurance?: string
  }
}

interface OnboardingWizardProps {
  onComplete: () => void
  onCancel: () => void
}

export default function OnboardingWizard({
  onComplete,
  onCancel,
}: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { refreshUser } = useAuth()
  const [data, setData] = useState<OnboardingData>({
    legalConsent: {
      acceptedRGPD: false,
      acceptedTerms: false,
    },
    personalData: {
      fullName: '',
      nif: '',
      niss: '',
      address: '',
      iban: '',
      vehicleType: 'bicycle',
    },
    documents: {
      identification: '',
      taxDocument: '',
    },
  })

  const updateData = (stepData: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...stepData }))
  }

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      // Chamar a Edge Function para completar o onboarding
      const result = await driverQueries.completeOnboarding(data)
      
      if (result.success) {
        // Atualizar o contexto de autenticação
        await refreshUser()
        
        Alert.alert(
          'Onboarding Concluído!',
          'O seu processo de onboarding foi concluído com sucesso. Aguarde a verificação dos seus documentos.',
          [{ 
            text: 'OK',
            onPress: onComplete
          }]
        )
      } else {
        throw new Error(result.error || 'Erro ao completar onboarding')
      }
    } catch (error) {
      console.error('Erro ao completar onboarding:', error)
      Alert.alert(
        'Erro',
        'Ocorreu um erro ao completar o onboarding. Tente novamente.',
        [{ text: 'OK' }]
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <LegalConsentStep
            acceptedRGPD={data.legalConsent.acceptedRGPD}
            acceptedTerms={data.legalConsent.acceptedTerms}
            onAcceptRGPD={(accepted) => 
              updateData({ 
                legalConsent: { 
                  ...data.legalConsent, 
                  acceptedRGPD: accepted,
                  consentTimestamp: accepted ? new Date().toISOString() : undefined
                } 
              })
            }
            onAcceptTerms={(accepted) => 
              updateData({ 
                legalConsent: { 
                  ...data.legalConsent, 
                  acceptedTerms: accepted 
                } 
              })
            }
            onNext={handleNext}
            onCancel={onCancel}
          />
        )
      
      case 1:
        return (
          <PersonalDataStep
            personalData={data.personalData}
            onUpdateData={(personalData) => updateData({ personalData })}
            onNext={handleNext}
            onBack={handleBack}
          />
        )
      
      case 2:
        return (
          <DocumentsStep
            vehicleType={data.personalData.vehicleType}
            documents={data.documents}
            onDocumentUpload={(documentType, uri) => {
              updateData({
                documents: {
                  ...data.documents,
                  [documentType]: uri
                }
              })
            }}
            onNext={handleNext}
            onBack={handleBack}
          />
        )
      
      case 3:
        return (
          <ValidationStep
            personalData={data.personalData}
            documents={data.documents}
            onSubmit={handleSubmit}
            onBack={handleBack}
            isSubmitting={isSubmitting}
          />
        )
      
      default:
        return null
    }
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 0:
        return 'Consentimento Legal'
      case 1:
        return 'Dados Pessoais'
      case 2:
        return 'Documentos'
      case 3:
        return 'Validação Final'
      default:
        return 'Onboarding'
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header com progresso */}
      <View style={styles.header}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${((currentStep + 1) / 4) * 100}%` }
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            Passo {currentStep + 1} de 4: {getStepTitle()}
          </Text>
        </View>
      </View>

      {/* Conteúdo do passo atual */}
      <View style={styles.content}>
        {renderStep()}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  progressContainer: {
    gap: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
})