import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Card, StatusBadge, Button } from '@/components/ui'
import { DeliveryOrder } from '@/types'

interface DeliveryCardProps {
  delivery: DeliveryOrder
  onAccept?: (orderId: string) => void
  onViewDetails?: (orderId: string) => void
  showAcceptButton?: boolean
  loading?: boolean
}

export function DeliveryCard({
  delivery,
  onAccept,
  onViewDetails,
  showAcceptButton = false,
  loading = false
}: DeliveryCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-PT', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.restaurantName}>{delivery.restaurants.name}</Text>
          <Text style={styles.orderTime}>Pedido às {formatTime(delivery.created_at)}</Text>
        </View>
        <StatusBadge status={delivery.status} />
      </View>

      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.label}>Cliente:</Text>
          <Text style={styles.value}>{delivery.customers.name || 'N/A'}</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>Telefone:</Text>
          <Text style={styles.value}>{delivery.customers.phone || 'N/A'}</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>Endereço:</Text>
          <Text style={styles.value} numberOfLines={2}>
            {delivery.delivery_address}
          </Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>Valor:</Text>
          <Text style={styles.valueAmount}>{formatCurrency(delivery.total_amount)}</Text>
        </View>

        {delivery.customer_notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.label}>Observações:</Text>
            <Text style={styles.notes}>{delivery.customer_notes}</Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        {showAcceptButton && onAccept && (
          <Button
            title="Aceitar Entrega"
            variant="primary"
            onPress={() => onAccept(delivery.id)}
            loading={loading}
            style={styles.acceptButton}
          />
        )}
        
        {onViewDetails && (
          <Button
            title="Ver Detalhes"
            variant="secondary"
            onPress={() => onViewDetails(delivery.id)}
            style={styles.detailsButton}
          />
        )}
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  orderTime: {
    fontSize: 14,
    color: '#6B7280',
  },
  content: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  valueAmount: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '700',
    flex: 2,
    textAlign: 'right',
  },
  notesContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  notes: {
    fontSize: 14,
    color: '#374151',
    marginTop: 4,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    flex: 1,
  },
  detailsButton: {
    flex: 1,
  },
})