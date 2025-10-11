import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/config/supabase'
import { Card } from '@/components/ui'

interface Delivery {
  id: string
  customer_name: string
  customer_address: string
  total_amount: number
  delivery_fee: number
  status: string
  created_at: string
  completed_at?: string
}

type FilterType = 'all' | 'completed' | 'cancelled'

export default function HistoryScreen() {
  const { user } = useAuth()
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')

  const fetchDeliveries = async () => {
    if (!user) return

    try {
      let query = supabase
        .from('deliveries')
        .select(`
          id,
          customer_name,
          customer_address,
          total_amount,
          delivery_fee,
          status,
          created_at,
          completed_at
        `)
        .eq('driver_id', user.id)
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) throw error
      setDeliveries(data || [])
    } catch (error) {
      console.error('Erro ao buscar histórico:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDeliveries()
  }, [user, filter])

  const onRefresh = () => {
    setRefreshing(true)
    fetchDeliveries()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10B981'
      case 'cancelled':
        return '#EF4444'
      default:
        return '#F59E0B'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluída'
      case 'cancelled':
        return 'Cancelada'
      case 'in_transit':
        return 'Em Trânsito'
      case 'picked_up':
        return 'Recolhida'
      case 'accepted':
        return 'Aceite'
      default:
        return status
    }
  }

  const renderDeliveryItem = ({ item }: { item: Delivery }) => (
    <Card style={styles.deliveryCard}>
      <View style={styles.deliveryHeader}>
        <View style={styles.deliveryInfo}>
          <Text style={styles.customerName}>{item.customer_name}</Text>
          <Text style={styles.deliveryDate}>{formatDate(item.created_at)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
      
      <Text style={styles.address} numberOfLines={2}>
        📍 {item.customer_address}
      </Text>
      
      <View style={styles.deliveryFooter}>
        <View style={styles.amountInfo}>
          <Text style={styles.totalAmount}>
            Total: {formatCurrency(item.total_amount)}
          </Text>
          <Text style={styles.deliveryFee}>
            Taxa: {formatCurrency(item.delivery_fee)}
          </Text>
        </View>
        {item.completed_at && (
          <Text style={styles.completedAt}>
            Concluída: {formatDate(item.completed_at)}
          </Text>
        )}
      </View>
    </Card>
  )

  const renderFilterButton = (filterType: FilterType, label: string) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === filterType && styles.filterButtonActive
      ]}
      onPress={() => setFilter(filterType)}
    >
      <Text style={[
        styles.filterButtonText,
        filter === filterType && styles.filterButtonTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Histórico de Entregas</Text>
        <Text style={styles.subtitle}>
          {deliveries.length} entrega{deliveries.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Filtros */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {renderFilterButton('all', 'Todas')}
        {renderFilterButton('completed', 'Concluídas')}
        {renderFilterButton('cancelled', 'Canceladas')}
      </ScrollView>

      {/* Lista de Entregas */}
      <FlatList
        data={deliveries}
        renderItem={renderDeliveryItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="history" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Nenhuma entrega encontrada</Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'all' 
                ? 'Você ainda não fez nenhuma entrega'
                : `Nenhuma entrega ${filter === 'completed' ? 'concluída' : 'cancelada'} encontrada`
              }
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filtersContent: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  filterButtonActive: {
    backgroundColor: '#10B981',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 24,
  },
  deliveryCard: {
    marginBottom: 16,
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  deliveryInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  deliveryDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  address: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  deliveryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  amountInfo: {
    flex: 1,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  deliveryFee: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  completedAt: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
})