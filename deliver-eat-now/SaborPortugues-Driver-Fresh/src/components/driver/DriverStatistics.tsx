import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { supabase } from '@/config/supabase'

interface DriverStats {
  totalDeliveries: number
  completedDeliveries: number
  totalEarnings: number
  averageRating: number
  todayDeliveries: number
  weekDeliveries: number
  monthDeliveries: number
  onTimeDeliveries: number
  deliveryRate: number
}

interface StatCardProps {
  title: string
  value: string | number
  icon: string
  color: string
  subtitle?: string
}

function StatCard({ title, value, icon, color, subtitle }: StatCardProps) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
          <Icon name={icon} size={24} color={color} />
        </View>
        <View style={styles.statContent}>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statTitle}>{title}</Text>
          {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
        </View>
      </View>
    </View>
  )
}

export default function DriverStatistics() {
  const [stats, setStats] = useState<DriverStats>({
    totalDeliveries: 0,
    completedDeliveries: 0,
    totalEarnings: 0,
    averageRating: 0,
    todayDeliveries: 0,
    weekDeliveries: 0,
    monthDeliveries: 0,
    onTimeDeliveries: 0,
    deliveryRate: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Buscar estatísticas do motorista
      const [
        deliveriesResult,
        earningsResult,
        ratingsResult,
        todayResult,
        weekResult,
        monthResult,
      ] = await Promise.all([
        // Total de entregas
        supabase
          .from('deliveries')
          .select('id, status, created_at, delivered_at, estimated_delivery_time')
          .eq('driver_id', user.id),
        
        // Ganhos totais
        supabase
          .from('deliveries')
          .select('delivery_fee')
          .eq('driver_id', user.id)
          .eq('status', 'delivered'),
        
        // Avaliações
        supabase
          .from('delivery_ratings')
          .select('rating')
          .eq('driver_id', user.id),
        
        // Entregas de hoje
        supabase
          .from('deliveries')
          .select('id')
          .eq('driver_id', user.id)
          .gte('created_at', new Date().toISOString().split('T')[0]),
        
        // Entregas da semana
        supabase
          .from('deliveries')
          .select('id')
          .eq('driver_id', user.id)
          .gte('created_at', getWeekStart().toISOString()),
        
        // Entregas do mês
        supabase
          .from('deliveries')
          .select('id')
          .eq('driver_id', user.id)
          .gte('created_at', getMonthStart().toISOString()),
      ])

      // Processar dados
      const deliveries = deliveriesResult.data || []
      const completedDeliveries = deliveries.filter(d => d.status === 'delivered')
      const totalEarnings = (earningsResult.data || []).reduce((sum, d) => sum + (d.delivery_fee || 0), 0)
      const ratings = ratingsResult.data || []
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
        : 0

      // Calcular entregas pontuais
      const onTimeDeliveries = completedDeliveries.filter(delivery => {
        if (!delivery.delivered_at || !delivery.estimated_delivery_time) return false
        return new Date(delivery.delivered_at) <= new Date(delivery.estimated_delivery_time)
      }).length

      const deliveryRate = completedDeliveries.length > 0 
        ? (onTimeDeliveries / completedDeliveries.length) * 100 
        : 0

      setStats({
        totalDeliveries: deliveries.length,
        completedDeliveries: completedDeliveries.length,
        totalEarnings,
        averageRating,
        todayDeliveries: todayResult.data?.length || 0,
        weekDeliveries: weekResult.data?.length || 0,
        monthDeliveries: monthResult.data?.length || 0,
        onTimeDeliveries,
        deliveryRate,
      })
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const getWeekStart = () => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const diff = now.getDate() - dayOfWeek
    return new Date(now.setDate(diff))
  }

  const getMonthStart = () => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchStats()
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'EUR',
    }).format(value)
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Icon name="analytics" size={48} color="#9CA3AF" />
        <Text style={styles.loadingText}>Carregando estatísticas...</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Minhas Estatísticas</Text>
        <Text style={styles.subtitle}>Acompanhe seu desempenho</Text>
      </View>

      {/* Estatísticas Principais */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resumo Geral</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Total de Entregas"
            value={stats.totalDeliveries}
            icon="local-shipping"
            color="#3B82F6"
          />
          <StatCard
            title="Entregas Concluídas"
            value={stats.completedDeliveries}
            icon="check-circle"
            color="#10B981"
          />
          <StatCard
            title="Ganhos Totais"
            value={formatCurrency(stats.totalEarnings)}
            icon="euro-symbol"
            color="#F59E0B"
          />
          <StatCard
            title="Avaliação Média"
            value={stats.averageRating.toFixed(1)}
            icon="star"
            color="#EF4444"
            subtitle="⭐ de 5.0"
          />
        </View>
      </View>

      {/* Estatísticas de Período */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Por Período</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Hoje"
            value={stats.todayDeliveries}
            icon="today"
            color="#8B5CF6"
            subtitle="entregas"
          />
          <StatCard
            title="Esta Semana"
            value={stats.weekDeliveries}
            icon="date-range"
            color="#06B6D4"
            subtitle="entregas"
          />
          <StatCard
            title="Este Mês"
            value={stats.monthDeliveries}
            icon="calendar-month"
            color="#84CC16"
            subtitle="entregas"
          />
          <StatCard
            title="Taxa de Pontualidade"
            value={`${stats.deliveryRate.toFixed(1)}%`}
            icon="schedule"
            color="#F97316"
            subtitle={`${stats.onTimeDeliveries} no prazo`}
          />
        </View>
      </View>

      {/* Dicas de Melhoria */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dicas para Melhorar</Text>
        <View style={styles.tipsContainer}>
          {stats.averageRating < 4.5 && (
            <View style={styles.tip}>
              <Icon name="lightbulb" size={20} color="#F59E0B" />
              <Text style={styles.tipText}>
                Mantenha comunicação com os clientes para melhorar sua avaliação
              </Text>
            </View>
          )}
          {stats.deliveryRate < 90 && (
            <View style={styles.tip}>
              <Icon name="schedule" size={20} color="#EF4444" />
              <Text style={styles.tipText}>
                Planeje melhor suas rotas para aumentar a pontualidade
              </Text>
            </View>
          )}
          {stats.todayDeliveries === 0 && (
            <View style={styles.tip}>
              <Icon name="trending-up" size={20} color="#10B981" />
              <Text style={styles.tipText}>
                Aceite mais entregas hoje para aumentar seus ganhos
              </Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
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
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  statsGrid: {
    gap: 16,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  tipsContainer: {
    gap: 12,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tipText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
})