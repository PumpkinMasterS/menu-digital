import { useEffect, useRef, useState } from 'react'
import { listOrders, updateOrderStatus, type Order, type OrderStatus } from './api'

export default function KitchenDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [loading, setLoading] = useState(false)

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('KD_sound')
    return saved !== 'false'
  })
  const [historyVisible, setHistoryVisible] = useState(false)
  const [history, setHistory] = useState<Array<{ id: string; action: 'accepted' | 'delivered'; at: string; tableId?: string }>>([])
  const historyKeyRef = useRef<string>(currentHistoryKey())
  const prevIdsRef = useRef<Set<string>>(new Set())
  const audioCtxRef = useRef<AudioContext | null>(null)
  const audioUnlockedRef = useRef<boolean>(false)
  const [isMobile, setIsMobile] = useState<boolean>(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false))
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const [sseConnected, setSseConnected] = useState(false)
  const pollTimerRef = useRef<any>(null)
  const filterRef = useRef<OrderStatus | 'all'>(statusFilter)
  const [userDisconnected, setUserDisconnected] = useState(false)
  const [unseenIds, setUnseenIds] = useState<Set<string>>(new Set())
  
  // Controle de toque persistente
  const ringingIdsRef = useRef<Set<string>>(new Set())
  const ringIntervalRef = useRef<number | null>(null)
  
  // Sincroniza o modal com atualizações do pedido via SSE
  useEffect(() => {
    if (!selectedOrder) return
    const updated = orders.find(o => o.id === selectedOrder.id)
    if (updated && updated !== selectedOrder) {
      setSelectedOrder(updated)
    }
  }, [orders])

  // Fecha o modal com ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedOrder(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  
  // Variáveis de reconexão no escopo do componente
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttemptsRef = useRef(10)
  const initialReconnectDelayRef = useRef(1000)
  const maxReconnectDelayRef = useRef(30000)

  function currentHistoryKey() {
    const now = new Date()
    const SHIFT_MS = 5 * 60 * 60 * 1000
    const shifted = new Date(now.getTime() - SHIFT_MS)
    const y = shifted.getFullYear()
    const m = String(shifted.getMonth() + 1).padStart(2, '0')
    const d = String(shifted.getDate()).padStart(2, '0')
    return `KD_history_${y}-${m}-${d}`
  }

  function beep() {
    if (!soundEnabled) return
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
      if (!Ctx) return
      const ctx = audioCtxRef.current
      if (!ctx || ctx.state === 'suspended' || !audioUnlockedRef.current) return
      
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.type = 'sine'
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.3, now + 0.01)
      gain.gain.linearRampToValueAtTime(0.3, now + 0.08)
      gain.gain.linearRampToValueAtTime(0, now + 0.12)
      
      osc.frequency.setValueAtTime(800, now)
      osc.frequency.linearRampToValueAtTime(1000, now + 0.05)
      osc.frequency.linearRampToValueAtTime(800, now + 0.1)
      
      osc.start(now)
      osc.stop(now + 0.15)
      
      setTimeout(() => {
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        osc2.type = 'sine'
        osc2.connect(gain2)
        gain2.connect(ctx.destination)
        
        const now2 = ctx.currentTime
        gain2.gain.setValueAtTime(0, now2)
        gain2.gain.linearRampToValueAtTime(0.25, now2 + 0.01)
        gain2.gain.linearRampToValueAtTime(0, now2 + 0.1)
        
        osc2.frequency.setValueAtTime(1000, now2)
        osc2.start(now2)
        osc2.stop(now2 + 0.12)
      }, 150)
    } catch (err) {
      console.error('Erro ao tocar som:', err)
    }
  }

  // Toque persistente: toca de forma repetida enquanto houver IDs pendentes
  function startRinging() {
    if (!soundEnabled) return
    if (!ringIntervalRef) return
    if (ringIntervalRef.current != null) return
    ringIntervalRef.current = window.setInterval(() => {
      if (ringingIdsRef && ringingIdsRef.current && ringingIdsRef.current.size > 0) {
        beep()
      }
    }, 2000)
    // Beep imediato ao iniciar
    beep()
  }

  function stopRingingIfNone() {
    if (!ringIntervalRef) return
    if (ringingIdsRef && ringingIdsRef.current && ringingIdsRef.current.size === 0 && ringIntervalRef.current != null) {
      clearInterval(ringIntervalRef.current)
      ringIntervalRef.current = null
    }
  }

  function loadHistory() {
    const key = currentHistoryKey()
    historyKeyRef.current = key
    const raw = localStorage.getItem(key)
    setHistory(raw ? JSON.parse(raw) : [])
  }

  function saveHistory(entry: { id: string; action: 'accepted' | 'delivered'; at: string; tableId?: string }) {
    const key = historyKeyRef.current
    const next = [entry, ...history].slice(0, 500)
    setHistory(next)
    localStorage.setItem(key, JSON.stringify(next))
  }

  function resetHistory() {
    const key = historyKeyRef.current
    localStorage.removeItem(key)
    setHistory([])
  }

  useEffect(() => {
    loadHistory()
  }, [])

  useEffect(() => {
    function onResize() { setIsMobile(window.innerWidth < 768) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  function getTodayStartTime() {
    const now = new Date()
    const SHIFT_MS = 5 * 60 * 60 * 1000
    const shifted = new Date(now.getTime() - SHIFT_MS)
    return new Date(shifted.getFullYear(), shifted.getMonth(), shifted.getDate(), 5, 0, 0).getTime()
  }

  function isFromToday(createdAt?: string) {
    if (!createdAt) return false
    const orderTime = new Date(createdAt).getTime()
    const todayStart = getTodayStartTime()
    return orderTime >= todayStart
  }

  async function refresh() {
    setLoading(true)
    try {
      const statusParam: OrderStatus | 'all' | undefined = filterRef.current === 'all' ? 'all' : (filterRef.current === 'preparing' ? 'in_progress' : filterRef.current as OrderStatus)
      const res = await listOrders(statusParam ?? 'all')
      const allItems = res.items || []
      
      const todayItems = allItems.filter((o: Order) => isFromToday(o.createdAt))
      
      const newPending = todayItems.some((o: Order) => !prevIdsRef.current.has(o.id) && o.status === 'pending')
      if (newPending) beep()

      const lastDiscRaw = localStorage.getItem('KD_lastDisconnectAt')
      if (lastDiscRaw) {
        const lastDiscMs = Date.parse(lastDiscRaw)
        const unseen = new Set<string>()
        for (const o of todayItems) {
          if (o.status === 'pending' && o.createdAt && Date.parse(o.createdAt) > lastDiscMs) {
            unseen.add(o.id)
          }
        }
        setUnseenIds(unseen)
      } else {
        setUnseenIds(new Set())
      }
      
      setOrders(todayItems)
      prevIdsRef.current = new Set(todayItems.map((o: Order) => o.id))
      
      const currentKey = currentHistoryKey()
      if (currentKey !== historyKeyRef.current) {
        loadHistory()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Carregar dados inicial APENAS uma vez ao mudar filtro, SEM polling automático
  useEffect(() => {
    filterRef.current = statusFilter
    if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null }
    
    // Carregar dados inicial apenas uma vez
    refresh()
    
    return () => {
      if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null }
    }
  }, [statusFilter])

  useEffect(() => {
    // Desbloquear áudio no primeiro gesto do usuário (click/keydown/touch), conforme política de autoplay
    function unlock() {
      try {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
        if (!Ctx) return
        if (!audioCtxRef.current) audioCtxRef.current = new Ctx()
        const ctx = audioCtxRef.current!
        // Resume precisa de gesto; se falhar, manter estado suspenso sem logar erro
        const tryResume = ctx.resume?.()
        if (tryResume && typeof tryResume.then === 'function') {
          tryResume.then(() => { audioUnlockedRef.current = true }).catch(() => {})
        } else {
          audioUnlockedRef.current = ctx.state !== 'suspended'
        }
      } catch {}
    }
    window.addEventListener('click', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    window.addEventListener('touchstart', unlock, { once: true })
    return () => {
      window.removeEventListener('click', unlock)
      window.removeEventListener('keydown', unlock)
      window.removeEventListener('touchstart', unlock)
    }
  }, [])

  useEffect(() => {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('authToken') || window.localStorage.getItem('ADMIN_TOKEN') || '' : ''
    if (!token) {
      console.warn("Sem token; vou tentar conectar ao SSE sem autenticação.")
    }

    let userDisconnected = false

    function connect() {
      if (eventSourceRef.current) return
      
      const token = window.localStorage.getItem('authToken') || window.localStorage.getItem('ADMIN_TOKEN')
      if (!token) {
        console.warn('No authentication token available for SSE connection')
        setSseConnected(false)
        return
      }
      
      const url = `/v1/admin/orders/stream?token=${encodeURIComponent(token)}&t=${Date.now()}`
      const es = new EventSource(url)
      eventSourceRef.current = es

      es.onopen = () => {
        console.log('SSE connected successfully')
        setSseConnected(true)
        setUnseenIds(new Set())
        reconnectAttemptsRef.current = 0 // Reset reconnect attempts on successful connection
        
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current)
          pollTimerRef.current = null
        }
      }

      es.onerror = (err) => {
        console.warn('SSE error Event', err)
        setSseConnected(false)
        es.close()
        eventSourceRef.current = null
        
        if (!userDisconnected && reconnectAttemptsRef.current < maxReconnectAttemptsRef.current) {
          // Exponential backoff with jitter for reconnection
          reconnectAttemptsRef.current++
          const delay = Math.min(
            initialReconnectDelayRef.current * Math.pow(2, reconnectAttemptsRef.current - 1) + Math.random() * 1000,
            maxReconnectDelayRef.current
          )
          console.log(`Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttemptsRef.current})`)
          setTimeout(connect, delay)
        } else if (reconnectAttemptsRef.current >= maxReconnectAttemptsRef.current) {
          console.error('Max reconnection attempts reached.')
        }
      }

      es.onmessage = (event) => {
        try {
          const change = JSON.parse(event.data)
          setOrders((prev) => {
            let updatedOrders = [...prev]
            const filter = filterRef.current

            if (change.operationType === 'insert') {
              const doc = change.fullDocument || {}
              const key = doc.id || doc._id
              
              if (!isFromToday(doc.createdAt)) {
                return prev
              }
              
              const isNewPending = !prevIdsRef.current.has(key) && (doc.status === 'pending')
              if (isNewPending) {
                beep()
                ringingIdsRef.current.add(key)
                startRinging()
              }
              prevIdsRef.current.add(key)
              
              const shouldDisplay = filter === 'all' || doc.status === filter || (filter === 'in_progress' && doc.status === 'preparing')
              if (shouldDisplay) {
                updatedOrders = [doc, ...prev]
              }

            } else if (change.operationType === 'update') {
              const key = change.documentKey?._id || change.documentKey?.id
              const updatedFields = change.updateDescription?.updatedFields || {}
              const fullDoc = change.fullDocument || null
              
              let orderExists = false
              updatedOrders = prev.map((o) => {
                if (o.id === key || (o as any)._id === key) {
                  orderExists = true
                  return { ...o, ...updatedFields }
                }
                return o
              })

              // Se o pedido mudou de 'pending' para outro estado, parar toque daquele ID
              if (updatedFields.status && updatedFields.status !== 'pending') {
                ringingIdsRef.current.delete(String(key))
                stopRingingIfNone()
              }

              // Se NÃO existe ainda na lista, mas agora está pago e é de hoje, adiciona
              if (!orderExists && fullDoc && isFromToday(fullDoc.createdAt)) {
                const matchesFilter = filter === 'all' || fullDoc.status === filter || (filter === 'in_progress' && fullDoc.status === 'preparing')
                if (matchesFilter) {
                  const newKey = fullDoc.id || fullDoc._id
                  if (!prevIdsRef.current.has(newKey)) {
                    if (fullDoc.status === 'pending') {
                      beep()
                      ringingIdsRef.current.add(String(newKey))
                      startRinging()
                    }
                    prevIdsRef.current.add(newKey)
                    updatedOrders = [fullDoc, ...updatedOrders]
                  }
                }
              }
              
              updatedOrders = updatedOrders.filter(o => {
                const status = o.status
                const matchesFilter = filter === 'all' || status === filter || (filter === 'in_progress' && status === 'preparing')
                const isToday = isFromToday(o.createdAt)
                return matchesFilter && isToday
              })

            } else if (change.operationType === 'delete') {
              const key = change.documentKey?._id || change.documentKey?.id
              ringingIdsRef.current.delete(String(key))
              stopRingingIfNone()
              updatedOrders = prev.filter((o) => o.id !== key && (o as any)._id !== key)
            }
            return updatedOrders
          })
        } catch (e) {
          console.error('Error processing SSE message:', e)
        }
      }
    }

    // Reconectar imediatamente quando a rede voltar
    function handleOnline() {
      console.log('Network online; attempting SSE reconnect')
      reconnectAttemptsRef.current = 0 // Reset attempts on network recovery
      if (!eventSourceRef.current) connect()
    }
    
    // Monitorar também offline events para melhor UX
    function handleOffline() {
      console.log('Network offline; SSE may disconnect')
      setSseConnected(false)
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Iniciar conexão com pequeno delay para evitar race conditions
    setTimeout(connect, 100)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      userDisconnected = true // Prevent reconnections on component unmount
      
      if (eventSourceRef.current) {
        console.log('Closing SSE connection.')
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
      // Limpar toque persistente
      if (ringIntervalRef.current != null) {
        clearInterval(ringIntervalRef.current)
        ringIntervalRef.current = null
      }
      ringingIdsRef.current.clear()
    }
  }, [])

  async function acceptOrder(order: Order) {
    try {
      await updateOrderStatus(order.id, 'preparing')
      saveHistory({ id: order.id, action: 'accepted', at: new Date().toISOString(), tableId: order.tableId })
      await refresh()
      // Parar toque para este pedido
      ringingIdsRef.current.delete(order.id)
      stopRingingIfNone()
    } catch (e) {
      console.error(e)
    }
  }

  async function receiveOrder(order: Order) {
    try {
      await updateOrderStatus(order.id, 'delivered')
      saveHistory({ id: order.id, action: 'delivered', at: new Date().toISOString(), tableId: order.tableId })
      await refresh()
    } catch (e) {
      console.error(e)
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    return date.toLocaleString('pt-PT', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  function getStatusLabel(status: OrderStatus) {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      preparing: 'Recebido',
      ready: 'Pronto',
      delivered: 'Entregue',
      cancelled: 'Cancelado'
    }
    return labels[status] || status
  }

  function getStatusColor(status: OrderStatus) {
    const colors: Record<string, string> = {
      pending: '#ff9800',
      preparing: '#2196f3',
      in_progress: '#2196f3',
      ready: '#4caf50',
      delivered: '#9e9e9e',
      cancelled: '#f44336'
    }
    return colors[status] || '#666'
  }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 1400, margin: '0 auto' }}>
      <style>
        {`
          * { box-sizing: border-box; }
        `}
      </style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, color: '#333', marginBottom: 4 }}>📋 Dashboard de Pedidos</h1>
          <div style={{ fontSize: 13, color: '#6c757d', display: 'flex', alignItems: 'center', gap: 8 }}>
            📅 Mostrando apenas pedidos de hoje (após 05:00)
            <span style={{ background: '#e7f3ff', color: '#0056b3', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
              Pedidos antigos no histórico
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{ padding: '6px 12px' }}
          >
            <option value="all">Todos</option>
            <option value="pending">Pendente</option>
            <option value="preparing">Em Preparação</option>
            <option value="ready">Pronto</option>
            <option value="delivered">Entregue</option>
            <option value="cancelled">Cancelado</option>
          </select>
          <button
            onClick={refresh}
            disabled={loading}
            style={{
              padding: '8px 14px',
              background: '#343a40',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
              cursor: 'pointer'
            }}
          >Atualizar</button>
          <button
            onClick={() => setSoundEnabled(v => !v)}
            style={{
              padding: '8px 14px',
              background: soundEnabled ? '#0d6efd' : '#6c757d',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
              cursor: 'pointer'
            }}
          >Som: {soundEnabled ? 'On' : 'Off'}</button>
          <button
            onClick={() => setHistoryVisible(v => !v)}
            style={{
              padding: '8px 14px',
              background: '#0d6efd',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
              cursor: 'pointer'
            }}
          >{historyVisible ? 'Ocultar histórico' : 'Ver histórico'}</button>
          <button
            onClick={resetHistory}
            style={{
              padding: '8px 14px',
              background: '#dc3545',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
              cursor: 'pointer'
            }}
          >Reset diário</button>
          <button
            onClick={() => {
              localStorage.setItem('KD_lastDisconnectAt', new Date().toISOString())
              setUserDisconnected(true) // Set flag to prevent auto-reconnection
              try {
                if (eventSourceRef.current) {
                  eventSourceRef.current.close()
                  eventSourceRef.current = null
                }
              } catch {}
              setSseConnected(false)
              if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null }
            }}
            style={{
              padding: '8px 14px',
              background: '#6c757d',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
              cursor: 'pointer'
            }}
          >Desconectar</button>
          <span 
            style={{ 
              padding: '6px 12px', 
              borderRadius: 20, 
              background: sseConnected ? '#22c55e' : reconnectAttemptsRef.current > 0 ? '#f59e0b' : '#ef4444', 
              color: 'white', 
              border: 'none',
              fontSize: '12px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'help'
            }}
            title={
              sseConnected 
                ? 'Conectado - Pedidos chegam instantaneamente' 
                : reconnectAttemptsRef.current > 0 
                  ? 'Tentando reconectar ao servidor...' 
                  : 'Desconectado - Atualizando a cada 5 segundos'
            }
          >
            {sseConnected ? (
              <>
                <span style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%', display: 'inline-block' }}></span>
                Conectado
              </>
            ) : reconnectAttemptsRef.current > 0 ? (
              <>
                <span style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1.5s infinite' }}></span>
                Reconectando...
              </>
            ) : (
              <>
                <span style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%', display: 'inline-block' }}></span>
                Modo Polling
              </>
            )}
          </span>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'right', fontSize: 12, color: '#6c757d', marginBottom: 8 }}>Atualizando…</div>
      )}
      {orders.length === 0 ? (
        <>
          <div style={{ textAlign: 'center', padding: 80, color: '#999' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
            <h3>Nenhum pedido encontrado</h3>
          </div>
          {historyVisible && (
            <div style={{ marginTop: 24, background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.12)', padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <h2 style={{ margin: 0 }}>Histórico (corte 05:00) — {historyKeyRef.current.replace('KD_history_', '')}</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 12, padding: '4px 8px', background: '#ed6c02', color: '#fff', borderRadius: 999 }}>Aceitos: {history.filter(h => h.action === 'accepted').length}</span>
                  <span style={{ fontSize: 12, padding: '4px 8px', background: '#2e7d32', color: '#fff', borderRadius: 999 }}>Recebidos: {history.filter(h => h.action === 'delivered').length}</span>
                </div>
              </div>
              {history.length === 0 ? (
                <div style={{ color: '#777' }}>Sem entradas no histórico.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                      <th style={{ padding: 12, textAlign: 'left' }}>Hora</th>
                      <th style={{ padding: 12, textAlign: 'left' }}>Pedido</th>
                      <th style={{ padding: 12, textAlign: 'left' }}>Mesa</th>
                      <th style={{ padding: 12, textAlign: 'left' }}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #e9ecef' }}>
                        <td style={{ padding: 12 }}>{formatDate(h.at)}</td>
                        <td style={{ padding: 12 }}>#{h.id.slice(0, 6)}</td>
                        <td style={{ padding: 12 }}>{h.tableId || '-'}</td>
                        <td style={{ padding: 12 }}>
                          <span style={{ padding: '4px 8px', borderRadius: 999, background: h.action === 'accepted' ? '#ed6c02' : '#2e7d32', color: '#fff' }}>
                            {h.action === 'accepted' ? 'Aceito' : 'Recebido'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      ) : (<> 
        {isMobile && (
          <div style={{ display: 'grid', gap: 12 }}>
            {orders.map((order) => (
              <div key={order.id} onClick={() => setSelectedOrder(order)} style={{ 
                border: '1px solid #e9ecef', 
                borderRadius: 12, 
                padding: 12, 
                background: '#fff', 
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)', 
                cursor: 'pointer'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong style={{ fontSize: 16 }}>#{(order as any).orderNumber || order.id.slice(0, 6)}</strong>
                    <span style={{ color: '#666', fontSize: 14 }}>{order.tableId || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ background: getStatusColor(order.status), color: '#fff', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                      {getStatusLabel(order.status)}
                    </span>
                    {unseenIds.has(order.id) && (
                      <span style={{ background: '#d32f2f', color: '#fff', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>✨ Novo</span>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#6c757d', marginTop: 6 }}>{order.createdAt ? formatDate(order.createdAt) : '-'}</div>
                <div style={{ marginTop: 8, fontSize: 13, color: '#495057' }}>
                  Itens: {Array.isArray(order.items) ? order.items.reduce((sum, it) => sum + Number((it as any).quantity || 1), 0) : 0}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: '#6c757d' }}>
                  NIF: <span style={{ fontWeight: 500 }}>{order.nif || '-'}</span>
                </div>
                <div style={{ marginTop: 6, fontWeight: 600, fontSize: 16, color: '#212529' }}>
                  Total: {order.totals?.total ? `€${order.totals.total.toFixed(2)}` : '-'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
                  <button onClick={(e) => { e.stopPropagation(); setSelectedOrder(order) }} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #dee2e6', background: '#f8f9fa' }}>
                    Ver detalhes
                  </button>
                  {order.status === 'pending' && (
                    <button onClick={(e) => { e.stopPropagation(); acceptOrder(order) }} style={{ padding: '6px 10px', background: '#ed6c02', color: '#fff', border: 'none', borderRadius: 6 }}>Aceitar</button>
                  )}
                  {order.status === 'ready' && (
                    <button onClick={(e) => { e.stopPropagation(); receiveOrder(order) }} style={{ padding: '6px 10px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: 6 }}>Receber</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden', display: isMobile ? 'none' : 'block' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: 16, textAlign: 'left', fontWeight: 600 }}>Nº</th>
                <th style={{ padding: 16, textAlign: 'left', fontWeight: 600 }}>Mesa</th>
                <th style={{ padding: 16, textAlign: 'left', fontWeight: 600 }}>Itens</th>
                <th style={{ padding: 16, textAlign: 'left', fontWeight: 600 }}>NIF</th>
                <th style={{ padding: 16, textAlign: 'left', fontWeight: 600 }}>Status</th>
                <th style={{ padding: 16, textAlign: 'left', fontWeight: 600 }}>Data/Hora</th>
                <th style={{ padding: 16, textAlign: 'left', fontWeight: 600 }}>Total</th>
                <th style={{ padding: 16, textAlign: 'left', fontWeight: 600 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, idx) => (
                <tr 
                  key={order.id} 
                  style={{ 
                    borderBottom: idx < orders.length - 1 ? '1px solid #e9ecef' : 'none',
                    transition: 'background 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  onClick={() => setSelectedOrder(order)}
                >
                  <td style={{ padding: 16, fontWeight: 600 }}>#{(order as any).orderNumber || order.id.slice(0, 6)}</td>
                  <td style={{ padding: 16 }}>{order.tableId || '-'}</td>
                  <td style={{ padding: 16 }}>
                    {Array.isArray(order.items) && order.items.length > 0 ? (
                      <span style={{ background: '#eee', borderRadius: 12, padding: '4px 8px', fontSize: 13 }}>
                        {order.items.reduce((sum, it) => sum + Number((it as any).quantity || 1), 0)} itens
                      </span>
                    ) : (
                      <span style={{ color: '#adb5bd', fontSize: 14 }}>Sem itens</span>
                    )}
                  </td>
                  <td style={{ padding: 16 }}>
                    {order.nif ? (
                      <span style={{ 
                        background: '#e7f3ff', 
                        color: '#0056b3', 
                        padding: '4px 8px', 
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 500
                      }}>
                        {order.nif}
                      </span>
                    ) : (
                      <span style={{ color: '#adb5bd', fontSize: 14 }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: 16 }}>
                    <span style={{ 
                      background: getStatusColor(order.status),
                      color: '#fff',
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: 13,
                      fontWeight: 500,
                      display: 'inline-block'
                    }}>
                      {getStatusLabel(order.status)}
                    </span>
                    {unseenIds.has(order.id) && (
                      <span style={{ marginLeft: 8, background: '#d32f2f', color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: 12 }}>Novo</span>
                    )}
                  </td>
                  <td style={{ padding: 16, fontSize: 14, color: '#6c757d' }}>
                    {order.createdAt ? formatDate(order.createdAt) : '-'}
                  </td>
                  <td style={{ padding: 16, fontWeight: 600, fontSize: 16 }}>
                    {order.totals?.total ? `€${order.totals.total.toFixed(2)}` : '-'}
                  </td>
                  <td style={{ padding: 16 }}>
                    {order.status === 'pending' && (
                      <button onClick={(e) => { e.stopPropagation(); acceptOrder(order) }} style={{ padding: '6px 10px', background: '#ed6c02', color: '#fff', border: 'none', borderRadius: 6 }}>
                        Aceitar
                      </button>
                    )}
                    {order.status === 'ready' && (
                      <button onClick={(e) => { e.stopPropagation(); receiveOrder(order) }} style={{ padding: '6px 10px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: 6 }}>
                        Receber
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      {selectedOrder && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            style={{ background: '#fff', borderRadius: 12, width: isMobile ? '90%' : 640, maxHeight: '80vh', overflowY: 'auto', padding: 16, boxShadow: '0 6px 24px rgba(0,0,0,0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>Pedido #{(selectedOrder as any).orderNumber || selectedOrder.id.slice(0,6)}</h2>
              <button onClick={() => setSelectedOrder(null)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #dee2e6', background: '#f8f9fa' }}>Fechar</button>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 14 }}>Mesa: <strong>{selectedOrder.tableId || '-'}</strong></span>
              <span style={{ background: getStatusColor(selectedOrder.status), color: '#fff', padding: '4px 10px', borderRadius: 999, fontSize: 12 }}>{getStatusLabel(selectedOrder.status)}</span>
            </div>
            <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 8 }}>Criado: {selectedOrder.createdAt ? formatDate(selectedOrder.createdAt) : '-'}</div>
            {selectedOrder.nif && (
              <div style={{ fontSize: 13, marginBottom: 8 }}>
                NIF: <span style={{ fontWeight: 500 }}>{selectedOrder.nif}</span>
              </div>
            )}
            <div>
              {(selectedOrder.items || []).map((it, i) => (
                <div key={i} style={{ fontSize: 14, color: '#495057', marginBottom: 2 }}>
                  {it.quantity}× {(it as any).name || it.productId}
                  {Array.isArray((it as any).modifiers) && (it as any).modifiers.length > 0 && (
                    <div style={{ marginTop: 2, marginLeft: 16, color: '#6c757d', fontSize: 12 }}>
                      {(it as any).modifiers.map((m: any, j: number) => (
                        <div key={j} style={{ fontSize: 12, color: '#495057', marginBottom: 2 }}>
                          • {m.groupName || m.groupId}: {m.optionName || m.optionId}
                          {m.priceDelta && m.priceDelta !== 0 && (
                            <span style={{ color: '#28a745', fontSize: 11, fontWeight: 600 }}>
                              {' '}(+€{m.priceDelta.toFixed(2)})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {Array.isArray((it as any).variants) && (it as any).variants.length > 0 && (
                    <div style={{ marginTop: 2, marginLeft: 16, color: '#6c757d', fontSize: 12 }}>
                      {(it as any).variants.map((v: any, j: number) => (
                        <div key={j} style={{ fontSize: 13, color: '#495057', marginBottom: 2 }}>
                          • {v.groupName || v.groupId}: {v.optionName || v.optionId}
                          {v.priceDelta && v.priceDelta !== 0 && (
                            <span style={{ color: '#28a745', fontSize: 11, fontWeight: 600 }}>
                              {' '}(+€{v.priceDelta.toFixed(2)})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {selectedOrder.notes && (
              <div style={{ marginTop: 8, fontSize: 13 }}><em>{selectedOrder.notes}</em></div>
            )}
            <div style={{ marginTop: 12, fontWeight: 600, fontSize: 16 }}>
              Total: {selectedOrder.totals?.total ? `€${selectedOrder.totals.total.toFixed(2)}` : '-'}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {selectedOrder.status === 'pending' && (
                <button onClick={(e) => { e.stopPropagation(); acceptOrder(selectedOrder) }} style={{ padding: '8px 12px', background: '#ed6c02', color: '#fff', border: 'none', borderRadius: 8 }}>Aceitar</button>
              )}
              {selectedOrder.status === 'ready' && (
                <button onClick={(e) => { e.stopPropagation(); receiveOrder(selectedOrder) }} style={{ padding: '8px 12px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: 8 }}>Receber</button>
              )}
            </div>
          </div>
        </div>
      )}
      {historyVisible && (
            <div style={{ marginTop: 24, background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.12)', padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <h2 style={{ margin: 0 }}>Histórico (corte 05:00) — {historyKeyRef.current.replace('KD_history_', '')}</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 12, padding: '4px 8px', background: '#ed6c02', color: '#fff', borderRadius: 999 }}>Aceitos: {history.filter(h => h.action === 'accepted').length}</span>
                  <span style={{ fontSize: 12, padding: '4px 8px', background: '#2e7d32', color: '#fff', borderRadius: 999 }}>Recebidos: {history.filter(h => h.action === 'delivered').length}</span>
                </div>
              </div>
              {history.length === 0 ? (
                <div style={{ color: '#777' }}>Sem entradas no histórico.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                      <th style={{ padding: 12, textAlign: 'left' }}>Hora</th>
                      <th style={{ padding: 12, textAlign: 'left' }}>Pedido</th>
                      <th style={{ padding: 12, textAlign: 'left' }}>Mesa</th>
                      <th style={{ padding: 12, textAlign: 'left' }}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #e9ecef' }}>
                        <td style={{ padding: 12 }}>{formatDate(h.at)}</td>
                        <td style={{ padding: 12 }}>#{h.id.slice(0, 6)}</td>
                        <td style={{ padding: 12 }}>{h.tableId || '-'}</td>
                        <td style={{ padding: 12 }}>
                          <span style={{ padding: '4px 8px', borderRadius: 999, background: h.action === 'accepted' ? '#ed6c02' : '#2e7d32', color: '#fff' }}>
                            {h.action === 'accepted' ? 'Aceito' : 'Recebido'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}