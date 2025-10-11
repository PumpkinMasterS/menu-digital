import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { supabase } from '@/config/supabase'
import { useLocation } from '@/hooks/useLocation'

interface DeliveryTrackingProps {
  deliveryId: string
  visible: boolean
  onClose: () => void
  onStatusUpdate: (status: string) => void
}

export default function DeliveryTracking({
  deliveryId,
  visible,
  onClose,
  onStatusUpdate,
}: DeliveryTrackingProps) {
  const { location } = useLocation()
  const [isUpdating, setIsUpdating] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<string>('')

  useEffect(() => {
    if (visible && deliveryId) {
      fetchDeliveryStatus()
    }
  }, [visible, deliveryId])

  const fetchDeliveryStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select('status')
        .eq('id', deliveryId)
        .single()

      if (error) throw error
      setCurrentStatus(data.status)
    } catch (error) {
      console.error('Erro ao buscar status da entrega:', error)
    }
  }

  const updateDeliveryStatus = async (newStatus: string) => {
    setIsUpdating(true)
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      }

      // Adicionar localização se disponível
      if (location) {
        updateData.current_latitude = location.latitude
        updateData.current_longitude = location.longitude
      }

      // Adicionar timestamps específicos
      if (newStatus === 'picked_up') {
        updateData.picked_up_at = new Date().toISOString()
      } else if (newStatus === 'delivered') {
        updateData.delivered_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('deliveries')
        .update(updateData)
        .eq('id', deliveryId)

      if (error) throw error

      setCurrentStatus(newStatus)
      onStatusUpdate(newStatus)
      
      Alert.alert('Sucesso', 'Status da entrega atualizado!')
      
      if (newStatus === 'delivered') {
        onClose()
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      Alert.alert('Erro', 'Não foi possível atualizar o status da entrega')
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusSteps = () => {
    const steps = [
      { key: 'accepted', label: 'Aceita', icon: 'check-circle' },
      { key: 'picked_up', label: 'Coletada', icon: 'local-shipping' },
      { key: 'in_transit', label: 'Em Trânsito', icon: 'directions' },
      { key: 'delivered', label: 'Entregue', icon: 'done-all' },
    ]

    return steps.map((step, index) => {
      const isCompleted = getStepIndex(currentStatus) >= index
      const isCurrent = currentStatus === step.key
      const isNext = getStepIndex(currentStatus) + 1 === index

      return {
        ...step,
        isCompleted,
        isCurrent,
        isNext,
        canUpdate: isNext || isCurrent,
      }
    })
  }

  const getStepIndex = (status: string) => {
    const statusOrder = ['accepted', 'picked_up', 'in_transit', 'delivered']
    return statusOrder.indexOf(status)
  }

  const handleStatusUpdate = (status: string) => {
    const statusLabels: { [key: string]: string } = {
      picked_up: 'marcar como coletada',
      in_transit: 'marcar como em trânsito',
      delivered: 'marcar como entregue',
    }

    Alert.alert(
      'Confirmar Atualização',
      `Deseja ${statusLabels[status]}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: () => updateDeliveryStatus(status) },
      ]
    )
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Rastreamento da Entrega</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {getStatusSteps().map((step, index) => (
              <View key={step.key} style={styles.stepContainer}>
                <View style={styles.stepIndicator}>
                  <View
                    style={[
                      styles.stepCircle,
                      step.isCompleted && styles.stepCompleted,
                      step.isCurrent && styles.stepCurrent,
                    ]}
                  >
                    <Icon
                      name={step.icon}
                      size={20}
                      color={
                        step.isCompleted || step.isCurrent ? '#FFFFFF' : '#9CA3AF'
                      }
                    />
                  </View>
                  {index < getStatusSteps().length - 1 && (
                    <View
                      style={[
                        styles.stepLine,
                        step.isCompleted && styles.stepLineCompleted,
                      ]}
                    />
                  )}
                </View>

                <View style={styles.stepContent}>
                  <Text
                    style={[
                      styles.stepLabel,
                      (step.isCompleted || step.isCurrent) && styles.stepLabelActive,
                    ]}
                  >
                    {step.label}
                  </Text>

                  {step.canUpdate && !step.isCompleted && (
                    <TouchableOpacity
                      style={[
                        styles.updateButton,
                        isUpdating && styles.updateButtonDisabled,
                      ]}
                      onPress={() => handleStatusUpdate(step.key)}
                      disabled={isUpdating}
                    >
                      <Text style={styles.updateButtonText}>
                        {isUpdating ? 'Atualizando...' : 'Atualizar'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {step.isCompleted && (
                    <Text style={styles.completedText}>Concluído</Text>
                  )}
                </View>
              </View>
            ))}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Mantenha o status atualizado para melhor experiência do cliente
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  stepIndicator: {
    alignItems: 'center',
    marginRight: 16,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  stepCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  stepCurrent: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  stepLine: {
    width: 2,
    height: 24,
    backgroundColor: '#E5E7EB',
    marginTop: 4,
  },
  stepLineCompleted: {
    backgroundColor: '#10B981',
  },
  stepContent: {
    flex: 1,
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  stepLabelActive: {
    color: '#111827',
  },
  updateButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  updateButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  completedText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
})