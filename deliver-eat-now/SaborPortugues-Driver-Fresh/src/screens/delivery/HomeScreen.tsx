import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useAuth } from '@/hooks/useAuth'
import { useDeliveries, useDriverStats } from '@/hooks/useDeliveries'
import { DeliveryCard, StatsCard } from '@/components/common'
import { LoadingSpinner } from '@/components/ui'
import { RootStackParamList } from '@/types'

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>()
  const { user } = useAuth()
  const { 
    availableDeliveries, 
    loading, 
    error, 
    refreshDeliveries, 
    acceptDelivery 
  } = useDeliveries()
  const { stats, loading: statsLoading } = useDriverStats()
  
  const [refreshing, setRefreshing] = useState(false)
  const [acceptingDelivery, setAcceptingDelivery] = useState<string | null>(null)

  useEffect(() => {
    if (error) {
      Alert.alert('Erro', error)
    }
  }, [error])

  const handleRefresh = async () => {
    setRefreshing(true)
    await refreshDeliveries()
    setRefreshing(false)
  }

  const handleAcceptDelivery = async (orderId: string) => {
    setAcceptingDelivery(orderId)
    try {
      await acceptDelivery(orderId)
      Alert.alert(
        'Sucesso',
        'Entrega aceita! Você pode vê-la na aba "Ativa".',
        [{ text: 'OK' }]
      )
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao aceitar entrega')
    } finally {
      setAcceptingDelivery(null)
    }
  }

  const handleViewDetails = (orderId: string) => {
    navigation.navigate('DeliveryDetails', { orderId })
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Olá, {user?.user_metadata?.name || 'Driver'}! 👋
          </Text>
          <Text style={styles.subtitle}>
            Entregas disponíveis para você
          </Text>
        </View>

        {/* Stats Card */}
        <StatsCard stats={stats} loading={statsLoading} />

        {/* Available Deliveries */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Entregas Disponíveis ({availableDeliveries.length})
          </Text>
          
          {availableDeliveries.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Nenhuma entrega disponível no momento
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Puxe para baixo para atualizar
              </Text>
            </View>
          ) : (
            availableDeliveries.map((delivery) => (
              <DeliveryCard
                key={delivery.id}
                delivery={delivery}
                onAccept={handleAcceptDelivery}
                onViewDetails={handleViewDetails}
                showAcceptButton={true}
                loading={acceptingDelivery === delivery.id}
              />
            ))
          )}
        </View>
      </ScrollView>
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
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  section: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
})