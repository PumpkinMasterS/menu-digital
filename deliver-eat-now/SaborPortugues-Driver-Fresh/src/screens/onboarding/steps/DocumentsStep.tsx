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
import DocumentUploader from './components/DocumentUploader'

interface DocumentsStepProps {
  vehicleType: 'bicycle' | 'motorcycle' | 'car'
  documents: {
    identification: string
    drivingLicense?: string
    taxDocument: string
    vehicleInsurance?: string
  }
  onDocumentUpload: (documentType: string, uri: string) => void
  onNext: () => void
  onBack: () => void
}

interface DocumentConfig {
  key: string
  title: string
  description: string
  required: boolean
  acceptedFormats: string[]
}

export default function DocumentsStep({
  vehicleType,
  documents,
  onDocumentUpload,
  onNext,
  onBack,
}: DocumentsStepProps) {
  const [uploadingStates, setUploadingStates] = useState<Record<string, boolean>>({})

  const getRequiredDocuments = (): DocumentConfig[] => {
    const baseDocuments: DocumentConfig[] = [
      {
        key: 'identification',
        title: 'Documento de Identificação',
        description: 'Cartão de Cidadão, Passaporte ou Cartão de Residência',
        required: true,
        acceptedFormats: ['image/*', 'application/pdf'],
      },
      {
        key: 'taxDocument',
        title: 'Comprovativo de Atividade nas Finanças',
        description: 'Declaração de início de atividade ou comprovativo de inscrição',
        required: true,
        acceptedFormats: ['image/*', 'application/pdf'],
      },
    ]

    // Adicionar documentos específicos baseados no tipo de veículo
    if (vehicleType === 'motorcycle' || vehicleType === 'car') {
      baseDocuments.push({
        key: 'drivingLicense',
        title: 'Carta de Condução',
        description: vehicleType === 'motorcycle' ? 'Categoria A ou A1' : 'Categoria B',
        required: true,
        acceptedFormats: ['image/*', 'application/pdf'],
      })

      baseDocuments.push({
        key: 'vehicleInsurance',
        title: 'Seguro do Veículo',
        description: 'Apólice de seguro válida e atualizada',
        required: true,
        acceptedFormats: ['image/*', 'application/pdf'],
      })
    }

    return baseDocuments
  }

  const handleUploadStart = (documentKey: string) => {
    setUploadingStates(prev => ({ ...prev, [documentKey]: true }))
  }

  const handleUploadEnd = (documentKey: string) => {
    setUploadingStates(prev => ({ ...prev, [documentKey]: false }))
  }

  const handleDocumentUpload = (documentKey: string, uri: string) => {
    onDocumentUpload(documentKey, uri)
    handleUploadEnd(documentKey)
  }

  const validateDocuments = (): boolean => {
    const requiredDocs = getRequiredDocuments().filter(doc => doc.required)
    
    for (const doc of requiredDocs) {
      const documentValue = documents[doc.key as keyof typeof documents]
      if (!documentValue || documentValue.trim() === '') {
        Alert.alert(
          'Documentos Incompletos',
          `Por favor, carregue o documento: ${doc.title}`
        )
        return false
      }
    }

    return true
  }

  const handleNext = () => {
    if (validateDocuments()) {
      onNext()
    }
  }

  const getVehicleTypeLabel = () => {
    switch (vehicleType) {
      case 'bicycle':
        return 'Bicicleta'
      case 'motorcycle':
        return 'Moto'
      case 'car':
        return 'Carro'
      default:
        return 'Veículo'
    }
  }

  const requiredDocuments = getRequiredDocuments()
  const completedDocuments = requiredDocuments.filter(doc => 
    documents[doc.key as keyof typeof documents]
  ).length

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Icon name="description" size={32} color="#10B981" />
          </View>
          <Text style={styles.title}>Documentos Necessários</Text>
          <Text style={styles.subtitle}>
            Para {getVehicleTypeLabel().toLowerCase()}, precisamos dos seguintes documentos:
          </Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>
              Progresso: {completedDocuments}/{requiredDocuments.length}
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${(completedDocuments / requiredDocuments.length) * 100}%` }
                ]}
              />
            </View>
          </View>
        </View>

        <View style={styles.documentsContainer}>
          {requiredDocuments.map((document, index) => {
            const hasDocument = Boolean(documents[document.key as keyof typeof documents])
            const isUploading = uploadingStates[document.key] || false

            return (
              <View key={document.key} style={styles.documentSection}>
                <View style={styles.documentHeader}>
                  <View style={styles.documentTitleContainer}>
                    <Text style={styles.documentTitle}>{document.title}</Text>
                    {document.required && (
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredText}>Obrigatório</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.documentDescription}>
                    {document.description}
                  </Text>
                </View>

                <DocumentUploader
                  documentKey={document.key}
                  acceptedFormats={document.acceptedFormats}
                  onUpload={(uri) => handleDocumentUpload(document.key, uri)}
                  isUploading={isUploading}
                  onUploadStart={() => handleUploadStart(document.key)}
                  onUploadEnd={() => handleUploadEnd(document.key)}
                  hasDocument={hasDocument}
                  documentUri={documents[document.key as keyof typeof documents]}
                />
              </View>
            )
          })}
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoHeader}>
            <Icon name="info" size={20} color="#3B82F6" />
            <Text style={styles.infoTitle}>Informações Importantes</Text>
          </View>
          <View style={styles.infoList}>
            <Text style={styles.infoItem}>
              • Todos os documentos devem estar válidos e legíveis
            </Text>
            <Text style={styles.infoItem}>
              • Formatos aceites: JPG, PNG, PDF (máx. 5MB)
            </Text>
            <Text style={styles.infoItem}>
              • Os documentos serão verificados pela nossa equipa
            </Text>
            <Text style={styles.infoItem}>
              • Pode alterar os documentos a qualquer momento
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Icon name="arrow-back" size={20} color="#6B7280" />
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.nextButton,
            completedDocuments === requiredDocuments.length && styles.nextButtonActive
          ]}
          onPress={handleNext}
          disabled={completedDocuments !== requiredDocuments.length}
        >
          <Text style={[
            styles.nextButtonText,
            completedDocuments === requiredDocuments.length && styles.nextButtonTextActive
          ]}>
            Continuar
          </Text>
          <Icon 
            name="arrow-forward" 
            size={20} 
            color={completedDocuments === requiredDocuments.length ? "#FFFFFF" : "#9CA3AF"} 
          />
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
  progressContainer: {
    marginBottom: 32,
  },
  progressHeader: {
    gap: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
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
  documentsContainer: {
    gap: 24,
    marginBottom: 32,
  },
  documentSection: {
    gap: 16,
  },
  documentHeader: {
    gap: 8,
  },
  documentTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  documentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  requiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
  },
  requiredText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#DC2626',
  },
  documentDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  infoContainer: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  infoList: {
    gap: 8,
  },
  infoItem: {
    fontSize: 14,
    color: '#475569',
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
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  nextButtonActive: {
    backgroundColor: '#10B981',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  nextButtonTextActive: {
    color: '#FFFFFF',
  },
})