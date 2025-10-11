import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { Button, Input } from '@/components/ui'
import { OnboardingData } from '../OnboardingWizard'
import VehicleTypeSelector from './components/VehicleTypeSelector'

interface PersonalDataStepProps {
  data: OnboardingData
  onNext: () => void
  onPrevious: () => void
  onUpdateData: (data: Partial<OnboardingData>) => void
  loading: boolean
  canGoBack: boolean
}

export default function PersonalDataStep({
  data,
  onNext,
  onPrevious,
  onUpdateData,
  loading
}: PersonalDataStepProps) {
  const [personalData, setPersonalData] = useState(data.personalData)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const updateField = (field: keyof typeof personalData, value: string) => {
    const newData = { ...personalData, [field]: value }
    setPersonalData(newData)
    onUpdateData({ personalData: newData })
    
    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!personalData.fullName.trim()) {
      newErrors.fullName = 'Nome completo é obrigatório'
    }

    if (!personalData.nif.trim()) {
      newErrors.nif = 'NIF é obrigatório'
    } else if (!/^\d{9}$/.test(personalData.nif.replace(/\s/g, ''))) {
      newErrors.nif = 'NIF deve ter 9 dígitos'
    }

    if (!personalData.address.trim()) {
      newErrors.address = 'Endereço é obrigatório'
    }

    if (!personalData.iban.trim()) {
      newErrors.iban = 'IBAN é obrigatório'
    } else if (!/^PT50\d{21}$/.test(personalData.iban.replace(/\s/g, ''))) {
      newErrors.iban = 'IBAN português inválido (formato: PT50 XXXX XXXX XXXX XXXX XXXX X)'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (!validateForm()) {
      Alert.alert('Dados Incompletos', 'Por favor, preencha todos os campos obrigatórios.')
      return
    }
    onNext()
  }

  const formatNIF = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 9) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3').trim()
    }
    return numbers.slice(0, 9).replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')
  }

  const formatIBAN = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 23) {
      return `PT50 ${numbers.slice(0, 4)} ${numbers.slice(4, 8)} ${numbers.slice(8, 12)} ${numbers.slice(12, 16)} ${numbers.slice(16, 20)} ${numbers.slice(20, 21)}`.trim()
    }
    return `PT50 ${numbers.slice(0, 4)} ${numbers.slice(4, 8)} ${numbers.slice(8, 12)} ${numbers.slice(12, 16)} ${numbers.slice(16, 20)} ${numbers.slice(20, 21)}`
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Icon name="person" size={48} color="#10B981" />
        </View>
        <Text style={styles.title}>Dados Pessoais</Text>
        <Text style={styles.subtitle}>
          Preencha os seus dados pessoais e informações bancárias
        </Text>
      </View>

      {/* Formulário */}
      <View style={styles.form}>
        {/* Dados Pessoais */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações Pessoais</Text>
          
          <Input
            label="Nome Completo *"
            placeholder="Digite o seu nome completo"
            value={personalData.fullName}
            onChangeText={(value) => updateField('fullName', value)}
            error={errors.fullName}
            leftIcon="person"
          />

          <Input
            label="NIF *"
            placeholder="000 000 000"
            value={personalData.nif}
            onChangeText={(value) => updateField('nif', formatNIF(value))}
            error={errors.nif}
            leftIcon="badge"
            keyboardType="numeric"
            maxLength={11}
          />

          <Input
            label="NISS (opcional)"
            placeholder="00000000000"
            value={personalData.niss}
            onChangeText={(value) => updateField('niss', value.replace(/\D/g, '').slice(0, 11))}
            leftIcon="credit-card"
            keyboardType="numeric"
            maxLength={11}
          />

          <Input
            label="Endereço Completo *"
            placeholder="Rua, número, código postal, cidade"
            value={personalData.address}
            onChangeText={(value) => updateField('address', value)}
            error={errors.address}
            leftIcon="home"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Dados Bancários */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados Bancários</Text>
          
          <Input
            label="IBAN *"
            placeholder="PT50 0000 0000 0000 0000 0000 0"
            value={personalData.iban}
            onChangeText={(value) => updateField('iban', formatIBAN(value))}
            error={errors.iban}
            leftIcon="account-balance"
            keyboardType="numeric"
            maxLength={29}
          />
          
          <View style={styles.infoBox}>
            <Icon name="info" size={20} color="#3B82F6" />
            <Text style={styles.infoText}>
              O IBAN será usado para receber os pagamentos das suas entregas
            </Text>
          </View>
        </View>

        {/* Tipo de Veículo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transporte</Text>
          
          <VehicleTypeSelector
            selectedType={personalData.vehicleType}
            onSelect={(type) => updateField('vehicleType', type)}
          />
        </View>
      </View>

      {/* Botões */}
      <View style={styles.buttonContainer}>
        <Button
          title="Voltar"
          variant="secondary"
          onPress={onPrevious}
          style={styles.backButton}
        />
        <Button
          title="Continuar"
          onPress={handleNext}
          disabled={loading}
          loading={loading}
          style={styles.nextButton}
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
  form: {
    gap: 24,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
})