import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Card } from '@/components/ui'
import { DriverStats } from '@/types'

interface StatsCardProps {
  stats: DriverStats | null
  loading?: boolean
}

export function StatsCard({ stats, loading }: StatsCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>Estatísticas de Hoje</Text>
        <Text style={styles.loading}>Carregando...</Text>
      </Card>
    )
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Estatísticas de Hoje</Text>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats?.todayDeliveries || 0}</Text>
          <Text style={styles.statLabel}>Entregas</Text>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {formatCurrency(stats?.todayEarnings || 0)}
          </Text>
          <Text style={styles.statLabel}>Ganhos</Text>
        </View>
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  loading: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
})