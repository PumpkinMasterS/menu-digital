import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '@/config/supabase'

interface DocumentUploaderProps {
  documentKey: string
  acceptedFormats: string[]
  onUpload: (uri: string) => void
  isUploading: boolean
  onUploadStart: () => void
  onUploadEnd: () => void
  hasDocument: boolean
  documentUri?: string
}

export default function DocumentUploader({
  documentKey,
  acceptedFormats,
  onUpload,
  isUploading,
  onUploadStart,
  onUploadEnd,
  hasDocument,
  documentUri
}: DocumentUploaderProps) {
  const [uploadProgress, setUploadProgress] = useState(0)

  const showUploadOptions = () => {
    Alert.alert(
      'Selecionar Documento',
      'Como deseja adicionar o documento?',
      [
        {
          text: 'Câmara',
          onPress: () => pickFromCamera(),
        },
        {
          text: 'Galeria',
          onPress: () => pickFromGallery(),
        },
        {
          text: 'Ficheiros',
          onPress: () => pickFromFiles(),
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    )
  }

  const pickFromCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('Permissão Necessária', 'É necessário permitir o acesso à câmara.')
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        await uploadDocument(result.assets[0].uri, 'image/jpeg')
      }
    } catch (error) {
      console.error('Erro ao abrir câmara:', error)
      Alert.alert('Erro', 'Erro ao abrir a câmara.')
    }
  }

  const pickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('Permissão Necessária', 'É necessário permitir o acesso à galeria.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        await uploadDocument(result.assets[0].uri, 'image/jpeg')
      }
    } catch (error) {
      console.error('Erro ao abrir galeria:', error)
      Alert.alert('Erro', 'Erro ao abrir a galeria.')
    }
  }

  const pickFromFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: acceptedFormats,
        copyToCacheDirectory: true,
      })

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0]
        await uploadDocument(file.uri, file.mimeType || 'application/pdf')
      }
    } catch (error) {
      console.error('Erro ao selecionar ficheiro:', error)
      Alert.alert('Erro', 'Erro ao selecionar ficheiro.')
    }
  }

  const uploadDocument = async (uri: string, mimeType: string) => {
    onUploadStart()
    setUploadProgress(0)

    try {
      // Criar nome único para o ficheiro
      const fileExtension = mimeType.includes('pdf') ? 'pdf' : 'jpg'
      const fileName = `${documentKey}_${Date.now()}.${fileExtension}`
      const filePath = `driver-documents/${fileName}`

      // Converter URI para blob
      const response = await fetch(uri)
      const blob = await response.blob()

      // Upload para Supabase Storage
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(filePath, blob, {
          contentType: mimeType,
          upsert: false
        })

      if (error) {
        throw error
      }

      // Obter URL público
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      if (urlData?.publicUrl) {
        onUpload(urlData.publicUrl)
        Alert.alert('Sucesso', 'Documento carregado com sucesso!')
      }

    } catch (error: any) {
      console.error('Erro no upload:', error)
      Alert.alert(
        'Erro no Upload',
        error.message || 'Erro ao carregar documento. Tente novamente.'
      )
    } finally {
      onUploadEnd()
      setUploadProgress(0)
    }
  }

  const getFileTypeFromUri = (uri: string): 'image' | 'pdf' | 'unknown' => {
    if (uri.includes('.pdf') || uri.includes('application/pdf')) {
      return 'pdf'
    }
    if (uri.includes('.jpg') || uri.includes('.jpeg') || uri.includes('.png') || uri.includes('image/')) {
      return 'image'
    }
    return 'unknown'
  }

  const renderDocumentPreview = () => {
    if (!hasDocument || !documentUri) return null

    const fileType = getFileTypeFromUri(documentUri)

    return (
      <View style={styles.previewContainer}>
        {fileType === 'image' ? (
          <Image source={{ uri: documentUri }} style={styles.imagePreview} />
        ) : (
          <View style={styles.pdfPreview}>
            <Icon name="picture-as-pdf" size={48} color="#EF4444" />
            <Text style={styles.pdfText}>Documento PDF</Text>
          </View>
        )}
        
        <View style={styles.previewOverlay}>
          <Icon name="check-circle" size={24} color="#10B981" />
        </View>
      </View>
    )
  }

  if (hasDocument) {
    return (
      <View style={styles.container}>
        {renderDocumentPreview()}
        <TouchableOpacity
          style={styles.changeButton}
          onPress={showUploadOptions}
          disabled={isUploading}
        >
          <Icon name="edit" size={20} color="#3B82F6" />
          <Text style={styles.changeButtonText}>Alterar Documento</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.uploadArea, isUploading && styles.uploadAreaDisabled]}
        onPress={showUploadOptions}
        disabled={isUploading}
      >
        {isUploading ? (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.uploadingText}>A carregar...</Text>
            {uploadProgress > 0 && (
              <Text style={styles.progressText}>{uploadProgress}%</Text>
            )}
          </View>
        ) : (
          <View style={styles.uploadContent}>
            <Icon name="cloud-upload" size={48} color="#9CA3AF" />
            <Text style={styles.uploadTitle}>Carregar Documento</Text>
            <Text style={styles.uploadSubtitle}>
              Toque para selecionar da câmara, galeria ou ficheiros
            </Text>
            <View style={styles.formatInfo}>
              <Text style={styles.formatText}>
                Formatos: JPG, PNG, PDF • Máx. 5MB
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  uploadAreaDisabled: {
    opacity: 0.6,
  },
  uploadContent: {
    alignItems: 'center',
    gap: 8,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  uploadSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  formatInfo: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  formatText: {
    fontSize: 12,
    color: '#6B7280',
  },
  uploadingContainer: {
    alignItems: 'center',
    gap: 12,
  },
  uploadingText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#10B981',
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
  },
  previewContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  pdfPreview: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  pdfText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  previewOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    gap: 8,
  },
  changeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
  },
})