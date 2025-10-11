import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'

interface ValidationStepProps {
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
  onSubmit: () => void
  onBack: () => void
  isSubmitting: boolean
}

export default function ValidationStep({
  personalData,
  documents,
  onSubmit,
  onBack,
  isSubmitting,
}: ValidationStepProps) {
  const [hasReviewed, setHasReviewed] = useState(false)

  const getVehicleTypeLabel = () => {
    switch (personalData.vehicleType) {
      case 'bicycle':
        return 'Bicicleta'
      case 'motorcycle':
        return 'Moto'
      case 'car':
        return 'Carro'
      default:
        return 'Não especificado'
    }
  }

  const getDocumentsList = () => {
    const docs = [
      { key: 'identification', label: 'Documento de Identificação', value: documents.identification },
      { key: 'taxDocument', label: 'Comprovativo Fiscal', value: documents.taxDocument },
    ]

    if (personalData.vehicleType === 'motorcycle' || personalData.vehicleType === 'car') {
      docs.push(
        { key: 'drivingLicense', label: 'Carta de Condução', value: documents.drivingLicense || '' },
        { key: 'vehicleInsurance', label: 'Seguro do Veículo', value: documents.vehicleInsurance || '' }
      )
    }

    return docs.filter(doc => doc.value)
  }

  const handleSubmit = () => {
    if (!hasReviewed) {
      Alert.alert(
        'Revisão Necessária',
        'Por favor, confirme que reviu todos os dados antes de submeter.'
      )
      return
    }

    Alert.alert(
      'Confirmar Submissão',
      'Tem a certeza que deseja submeter o seu pedido de onboarding? Após a submissão, os dados serão enviados para validação.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Confirmar',
          onPress: onSubmit,
        },
      ]
    )
  }

  const documentsList = getDocumentsList()

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Icon name="fact-check" size={32} color="#10B981" />
          </View>
          <Text style={styles.title}>Revisão Final</Text>
          <Text style={styles.subtitle}>
            Revise todos os dados antes de submeter o seu pedido
          </Text>
        </View>

        {/* Dados Pessoais */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="person" size={24} color="#374151" />
            <Text style={styles.sectionTitle}>Dados Pessoais</Text>
          </View>
          
          <View style={styles.dataContainer}>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Nome Completo:</Text>
              <Text style={styles.dataValue}>{personalData.fullName}</Text>
            </View>
            
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>NIF:</Text>
              <Text style={styles.dataValue}>{personalData.nif}</Text>
            </View>
            
            {personalData.niss && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>NISS:</Text>
                <Text style={styles.dataValue}>{personalData.niss}</Text>
              </View>
            )}
            
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Endereço:</Text>
              <Text style={styles.dataValue}>{personalData.address}</Text>
            </View>
            
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>IBAN:</Text>
              <Text style={styles.dataValue}>{personalData.iban}</Text>
            </View>
            
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Tipo de Veículo:</Text>
              <Text style={styles.dataValue}>{getVehicleTypeLabel()}</Text>
            </View>
          </View>
        </View>

        {/* Documentos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="description" size={24} color="#374151" />
            <Text style={styles.sectionTitle}>Documentos Carregados</Text>
          </View>
          
          <View style={styles.documentsContainer}>
            {documentsList.map((doc, index) => (
              <View key={doc.key} style={styles.documentItem}>
                <View style={styles.documentInfo}>
                  <Icon name="check-circle" size={20} color="#10B981" />
                  <Text style={styles.documentLabel}>{doc.label}</Text>
                </View>
                <Icon name="visibility" size={20} color="#6B7280" />
              </View>
            ))}
          </View>
        </View>

        {/* Próximos Passos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="timeline" size={24} color="#374151" />
            <Text style={styles.sectionTitle}>Próximos Passos</Text>
          </View>
          
          <View style={styles.stepsContainer}>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Submissão dos Dados</Text>
                <Text style={styles.stepDescription}>
                  Os seus dados serão enviados para a nossa equipa
                </Text>
              </View>
            </View>
            
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Validação</Text>
                <Text style={styles.stepDescription}>
                  Verificaremos os documentos e dados fornecidos (1-2 dias úteis)
                </Text>
              </View>
            </View>
            
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Ativação</Text>
                <Text style={styles.stepDescription}>
                  Receberá uma notificação quando a conta for ativada
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Confirmação de Revisão */}
        <View style={styles.confirmationContainer}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setHasReviewed(!hasReviewed)}
          >
            <View style={[styles.checkbox, hasReviewed && styles.checkboxChecked]}>
              {hasReviewed && <Icon name="check" size={16} color="#FFFFFF" />}
            </View>
            <Text style={styles.checkboxText}>
              Confirmo que revi todos os dados e documentos fornecidos
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.warningContainer}>
          <Icon name="warning" size={20} color="#F59E0B" />
          <Text style={styles.warningText}>
            Após a submissão, não será possível alterar os dados até à validação pela nossa equipa.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Icon name="arrow-back" size={20} color="#6B7280" />
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.submitButton,
            hasReviewed && styles.submitButtonActive,
            isSubmitting && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={!hasReviewed || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Icon name="hourglass-empty" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonTextActive}>A submeter...</Text>
            </>
          ) : (
            <>
              <Text style={[
                styles.submitButtonText,
                hasReviewed && styles.submitButtonTextActive
              ]}>
                Submeter Pedido
              </Text>
              <Icon 
                name="send" 
                size={20} 
                color={hasReviewed ? "#FFFFFF" : "#9CA3AF"} 
              />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  dataContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  dataLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  dataValue: {
    fontSize: 14,
    color: '#111827',
    flex: 2,
    textAlign: 'right',
  },
  documentsContainer: {
    gap: 12,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  documentLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#166534',
  },
  stepsContainer: {
    gap: 16,
  },
  stepItem: {
    flexDirection: 'row',
    gap: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
    gap: 4,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  stepDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  confirmationContainer: {
    marginBottom: 24,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
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
    lineHeight: 18,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  submitButtonActive: {
    backgroundColor: '#10B981',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  submitButtonTextActive: {
    color: '#FFFFFF',
  },
})