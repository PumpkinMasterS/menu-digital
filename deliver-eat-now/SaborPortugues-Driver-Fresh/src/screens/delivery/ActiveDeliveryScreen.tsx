import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { useDeliveries } from '@/hooks/useDeliveries'
import { DeliveryCard } from '@/components/common'
import { Button, LoadingSpinner } from '@/components/ui'
import DeliveryTracking from '@/components/delivery/DeliveryTracking'
import { RootStackParamList } from '@/types'

type ActiveDeliveryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>

export default function ActiveDeliveryScreen() {
  const navigation = useNavigation<ActiveDeliveryScreenNavigationProp>()
  const { 
    activeDeliveries, 
    loading, 
    error, 
    updateDeliveryStatus 
  } = useDeliveries()
  
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [showTracking, setShowTracking] = useState(false)
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string>('')

  useEffect(() => {
    if (error) {
      Alert.alert('Erro', error)
    }
  }, [error])

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdatingStatus(orderId)
    try {
      await updateDeliveryStatus(orderId, newStatus)
      Alert.alert('Sucesso', 'Status atualizado com sucesso!')
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao atualizar status')
    } finally {
      setUpdatingStatus(null)
    }
  }

  const handleViewDetails = (orderId: string) => {
    navigation.navigate('DeliveryDetails', { orderId })
  }

  const handleOpenTracking = (deliveryId: string) => {
    setSelectedDeliveryId(deliveryId)
    setShowTracking(true)
  }

  const handleTrackingStatusUpdate = (newStatus: string) => {
    // Atualizar o estado local se necessário
    console.log('Status atualizado:', newStatus)
  }

  const renderStatusActions = (delivery: any) => {
    const currentStatus = delivery.status
    
    return (
      <View style={styles.statusActions}>
        {/* Botão de Rastreamento */}
        <TouchableOpacity
          style={styles.trackingButton}
          onPress={() => handleOpenTracking(delivery.id)}
        >
          <Icon name="timeline" size={20} color="#3B82F6" />
          <Text style={styles.trackingButtonText}>Rastrear Entrega</Text>
        </TouchableOpacity>

        {currentStatus === 'accepted' && (
          <Button
            title="Marcar como Coletado"
            variant="primary"
            onPress={() => handleStatusUpdate(delivery.id, 'picked_up')}
            loading={updatingStatus === delivery.id}
            style={styles.statusButton}
          />
        )}
        
        {currentStatus === 'picked_up' && (
          <Button
            title="Marcar como Entregue"
            variant="success"
            onPress={() => handleStatusUpdate(delivery.id, 'delivered')}
            loading={updatingStatus === delivery.id}
            style={styles.statusButton}
          />
        )}
      </View>
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Entrega Ativa</Text>
          <Text style={styles.subtitle}>
            Gerencie sua entrega atual
          </Text>
        </View>

        {/* Active Delivery */}
        {activeDeliveries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📦</Text>
            <Text style={styles.emptyStateText}>
              Nenhuma entrega ativa
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Aceite uma entrega na aba "Entregas" para começar
            </Text>
          </View>
        ) : (
          activeDeliveries.map((delivery) => (
            <View key={delivery.id} style={styles.deliveryContainer}>
              <DeliveryCard
                delivery={delivery}
                onViewDetails={handleViewDetails}
                showAcceptButton={false}
              />
              
              {renderStatusActions(delivery)}
            </View>
          ))
        )}
      </ScrollView>

      {/* Delivery Tracking Modal */}
      <DeliveryTracking
        deliveryId={selectedDeliveryId}
        visible={showTracking}
        onClose={() => setShowTracking(false)}
        onStatusUpdate={handleTrackingStatusUpdate}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  deliveryContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  statusActions: {
    marginTop: 16,
  },
  trackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF4FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  trackingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  statusButton: {
    marginBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
})