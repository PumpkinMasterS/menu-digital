import { useState, useEffect } from 'react'
import { driverQueries, driverSubscriptions } from '@/config/supabase'
import { DeliveryOrder, DriverStats } from '@/types'
import { useAuth } from './useAuth'

export function useDeliveries() {
  const { user } = useAuth()
  const [availableDeliveries, setAvailableDeliveries] = useState<DeliveryOrder[]>([])
  const [activeDeliveries, setActiveDeliveries] = useState<DeliveryOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user?.organization_id) {
      loadDeliveries()
      setupSubscriptions()
    }
  }, [user])

  const loadDeliveries = async () => {
    if (!user?.organization_id) return

    try {
      setLoading(true)
      const [available, active] = await Promise.all([
        driverQueries.getAvailableDeliveries(user.organization_id),
        driverQueries.getActiveDeliveries(user.id)
      ])

      setAvailableDeliveries(available as DeliveryOrder[])
      setActiveDeliveries(active as DeliveryOrder[])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar entregas')
    } finally {
      setLoading(false)
    }
  }

  const setupSubscriptions = () => {
    if (!user?.organization_id) return

    // Escutar novas entregas disponíveis
    const newDeliveriesSubscription = driverSubscriptions.subscribeToNewDeliveries(
      user.organization_id,
      () => {
        loadDeliveries()
      }
    )

    // Escutar atualizações nas entregas do driver
    const driverDeliveriesSubscription = driverSubscriptions.subscribeToDriverDeliveries(
      user.id,
      () => {
        loadDeliveries()
      }
    )

    return () => {
      newDeliveriesSubscription.unsubscribe()
      driverDeliveriesSubscription.unsubscribe()
    }
  }

  const acceptDelivery = async (orderId: string) => {
    if (!user) throw new Error('Usuário não autenticado')

    try {
      await driverQueries.acceptDelivery(orderId, user.id)
      await loadDeliveries()
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao aceitar entrega')
    }
  }

  const updateDeliveryStatus = async (orderId: string, status: string) => {
    try {
      await driverQueries.updateDeliveryStatus(orderId, status)
      await loadDeliveries()
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao atualizar status')
    }
  }

  return {
    availableDeliveries,
    activeDeliveries,
    loading,
    error,
    acceptDelivery,
    updateDeliveryStatus,
    refreshDeliveries: loadDeliveries
  }
}

export function useDriverStats() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DriverStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadStats()
    }
  }, [user])

  const loadStats = async () => {
    if (!user) return

    try {
      setLoading(true)
      const driverStats = await driverQueries.getDriverStats(user.id)
      setStats(driverStats)
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  return {
    stats,
    loading,
    refreshStats: loadStats
  }
}

export function useDeliveryHistory() {
  const { user } = useAuth()
  const [history, setHistory] = useState<DeliveryOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadHistory()
    }
  }, [user])

  const loadHistory = async () => {
    if (!user) return

    try {
      setLoading(true)
      const deliveryHistory = await driverQueries.getDeliveryHistory(user.id)
      setHistory(deliveryHistory as DeliveryOrder[])
    } catch (error) {
      console.error('Erro ao carregar histórico:', error)
    } finally {
      setLoading(false)
    }
  }

  return {
    history,
    loading,
    refreshHistory: loadHistory
  }
}