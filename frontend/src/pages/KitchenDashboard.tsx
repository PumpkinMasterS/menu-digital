import { useEffect, useMemo, useRef, useState } from 'react'

type Order = {
  _id: string
  status: 'pending' | 'accepted' | 'in_progress' | 'ready' | 'delivered' | 'cancelled'
  createdAt?: string
  table?: string
  notes?: string
  items?: Array<{ name?: string; quantity?: number; modifiers?: any; variants?: any }>
}

type OrdersResponse = {
  items: Order[]
  page: number
  limit: number
  total: number
}

function slaColor(createdAt?: string) {
  if (!createdAt) return '#888'
  const ms = Date.now() - new Date(createdAt).getTime()
  const mins = Math.floor(ms / 60000)
  return mins >= 12 ? '#c62828' : mins >= 7 ? '#ed6c02' : '#2e7d32'
}

function StatusActions({ order, onUpdate, onPrint }: { order: Order; onUpdate: (status: Order['status']) => void; onPrint: (order: Order) => void }) {
  const s = order.status
  
return (
    <div className="actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {s === 'pending' && <button onClick={() => onUpdate('accepted')}>Aceitar</button>}
      {(s === 'accepted' || s === 'pending') && <button onClick={() => onUpdate('in_progress')}>Preparar</button>}
      {(s === 'in_progress' || s === 'accepted') && <button onClick={() => onUpdate('ready')}>Pronto</button>}
      {s === 'ready' && <button onClick={() => onUpdate('delivered')}>Entregue</button>}
      {s !== 'cancelled' && <button onClick={() => onUpdate('cancelled')}>Cancelar</button>}
      <button onClick={() => onPrint(order)}>Imprimir</button>
    </div>
  )
}

function SLA({ createdAt, status }: { createdAt?: string; status: Order['status'] }) {
  if (!createdAt) return null
  const ms = Date.now() - new Date(createdAt).getTime()
  const mins = Math.floor(ms / 60000)
  const color = mins >= 12 ? '#c62828' : mins >= 7 ? '#ed6c02' : '#2e7d32'
  const label = status === 'ready' ? 'Pronto' : `${mins} min`
  return <div style={{ fontSize: 12, color }}>{label}</div>
}

export default function KitchenDashboard() {
  const token = localStorage.getItem('authToken') || '';
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState<number>(() => {
    const saved = localStorage.getItem('KD_limit')
    return saved !== null ? Number(saved) : 50
  })
  const [demo, setDemo] = useState<boolean>(() => {
    const saved = localStorage.getItem('KD_demo')
    return saved !== null ? saved === 'true' : true
  })
  const [useSSE, setUseSSE] = useState<boolean>(() => {
    const saved = localStorage.getItem('KD_useSSE')
    if (saved !== null) return saved === 'true'
    return ((import.meta as any).env?.VITE_USE_SSE === 'true')
  })
  const [sortMode, setSortMode] = useState<'oldest' | 'newest'>(() => (localStorage.getItem('KD_sort') as any) || 'oldest')
  const [compact, setCompact] = useState<boolean>(() => {
    const saved = localStorage.getItem('KD_compact')
    return saved !== null ? saved === 'true' : false
  })
  const [query, setQuery] = useState<string>(() => localStorage.getItem('KD_query') || '')
  const [statusFilter, setStatusFilter] = useState<'all' | Order['status']>(() => (localStorage.getItem('KD_status') as any) || 'all')
  const [tableFilter, setTableFilter] = useState<string>(() => localStorage.getItem('KD_table') || '')
  const [minMinutes, setMinMinutes] = useState<number | ''>(() => {
    const saved = localStorage.getItem('KD_min')
    if (saved === null || saved === '') return ''
    const n = Number(saved)
    return Number.isNaN(n) ? '' : n
  })
  const [maxMinutes, setMaxMinutes] = useState<number | ''>(() => {
    const saved = localStorage.getItem('KD_max')
    if (saved === null || saved === '') return ''
    const n = Number(saved)
    return Number.isNaN(n) ? '' : n
  })
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('KD_sound')
    return saved !== null ? saved === 'true' : true
  })
  const [autoAcceptDemo, setAutoAcceptDemo] = useState<boolean>(() => {
    const saved = localStorage.getItem('KD_autoAccept')
    return saved !== null ? saved === 'true' : false
  })
  const [autoRefresh, setAutoRefresh] = useState<boolean>(() => {
    const saved = localStorage.getItem('KD_autoRefresh')
    return saved !== null ? saved === 'true' : true
  })
  const [showOthers, setShowOthers] = useState<boolean>(() => {
    const saved = localStorage.getItem('KD_showOthers')
    return saved !== null ? saved === 'true' : true
  })
  const [refreshInterval, setRefreshInterval] = useState<number>(() => {
    const saved = localStorage.getItem('KD_refreshInterval')
    const n = saved !== null ? Number(saved) : 5000
    return Number.isFinite(n) && n > 0 ? n : 5000
  })
  const [groupItems, setGroupItems] = useState<boolean>(() => {
    const saved = localStorage.getItem('KD_groupItems')
    return saved !== null ? saved === 'true' : true
  })
  const [busyMode, setBusyMode] = useState<boolean>(false);
  const [delayMinutes, setDelayMinutes] = useState<number>(15);
  const pollRef = useRef<number | null>(null)
  const lastPendingIdsRef = useRef<Set<string>>(new Set())
  const lastReadyIdsRef = useRef<Set<string>>(new Set())

  const API = (import.meta as any).env?.VITE_API_URL || ''

const loadOrders = async () => {
  setLoading(true);
  setError(null);
  try {
    const res = await fetch(`${API}/v1/admin/orders?page=${page}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const data: OrdersResponse = await res.json();
    setOrders(data.items);
  } catch (e) {
    console.error('Falha ao carregar pedidos', e);
    setError('Falha ao carregar pedidos');
  } finally {
    setLoading(false);
  }
};

  

  useEffect(() => {
    localStorage.setItem('KD_demo', String(demo))
    localStorage.setItem('KD_useSSE', String(useSSE))
    localStorage.setItem('KD_sort', sortMode)
    localStorage.setItem('KD_compact', String(compact))
    localStorage.setItem('KD_autoAccept', String(autoAcceptDemo))
    localStorage.setItem('KD_autoRefresh', String(autoRefresh))
    localStorage.setItem('KD_showOthers', String(showOthers))
    localStorage.setItem('KD_refreshInterval', String(refreshInterval))
    localStorage.setItem('KD_status', statusFilter)
    localStorage.setItem('KD_min', String(minMinutes === '' ? '' : minMinutes))
    localStorage.setItem('KD_max', String(maxMinutes === '' ? '' : maxMinutes))
    localStorage.setItem('KD_sound', String(soundEnabled))
    localStorage.setItem('KD_limit', String(limit))
    localStorage.setItem('KD_query', query)
    localStorage.setItem('KD_table', tableFilter)
    localStorage.setItem('KD_groupItems', String(groupItems))
  }, [demo, useSSE, sortMode, compact, autoAcceptDemo, autoRefresh, showOthers, refreshInterval, statusFilter, minMinutes, maxMinutes, soundEnabled, limit, query, tableFilter, groupItems])

  const [productToStation, setProductToStation] = useState<Record<string, string>>({})

  const [stations, setStations] = useState<string[]>([])

  const [stationFilter, setStationFilter] = useState<string>(() => localStorage.getItem('KD_station') || '')

  useEffect(() => {
    fetch(`${API}/v1/public/products`)
      .then(res => res.json())
      .then(data => {
        const map: Record<string, string> = {}
        for (const p of data.items) if (p.name && p.station) map[p.name] = p.station
        setProductToStation(map)
        setStations([...new Set(Object.values(map))].sort())
      })
      .catch(() => {})
  }, [API])

  useEffect(() => {
    localStorage.setItem('KD_station', stationFilter)
  }, [stationFilter])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === 'r') {
        e.preventDefault()
        loadOrders()
      } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault()
        setCompact((v) => !v)
      } else if (e.key.toLowerCase() === 'a') {
        e.preventDefault()
        setAutoRefresh((v) => !v)
      } else if (e.key.toLowerCase() === 'i') {
        e.preventDefault()
        setRefreshInterval((cur) => (cur === 3000 ? 5000 : cur === 5000 ? 10000 : 3000))
      } else if (e.key.toLowerCase() === 'o') {
        e.preventDefault()
        setShowOthers((v) => !v)
      } else if (e.key.toLowerCase() === 'g') {
        e.preventDefault()
        setGroupItems((v) => !v)
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault()
        setSoundEnabled((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function simulateDemoEvent() {
    if (!demo) return
    const id = 'demo' + Math.floor(1000 + Math.random() * 9000)
    const mesa = 'Mesa ' + Math.floor(1 + Math.random() * 10)
    const newOrder: Order = {
      _id: String(id),
      status: 'pending',
      table: mesa,
      createdAt: new Date().toISOString(),
      items: [{ name: 'Item', quantity: 1 }],
    }
    setOrders((prev) => [newOrder, ...prev])
    if (soundEnabled) beep()
  }

  async function updateStatus(id: string, status: Order['status']) {
    try {
      const base = API || ''
      const res = await fetch(`${base}/v1/admin/orders/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      await loadOrders()
    } catch (e) {
      console.error('Falha ao atualizar status', e)
      alert('Falha ao atualizar status do pedido')
    }
  }

  function exportCSV() {
    try {
      const headers = ['id', 'status', 'createdAt', 'table', 'notes', 'items']
      const rows = filteredOrders.map((o) => {
        const itemsStr = (o.items || [])
          .map((it) => `${it.quantity || 1}x ${it.name || ''}`)
          .join('; ')
        return {
          id: o._id,
          status: o.status,
          createdAt: o.createdAt || '',
          table: o.table || '',
          notes: (o.notes || '').replace(/\r?\n/g, ' '),
          items: itemsStr,
        }
      })
      const esc = (v: any) => String(v).replace(/"/g, '""')
      const csv = [
        headers.join(','),
        ...rows.map((r) => headers.map((h) => `"${esc((r as any)[h])}"`).join(',')),
      ].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pedidos_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Falha ao exportar CSV', e)
      alert('Falha ao exportar CSV')
    }
  }

  function exportJSON() {
    try {
      const data = filteredOrders
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pedidos_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Falha ao exportar JSON', e)
      alert('Falha ao exportar JSON')
    }
  }

  function printOrder(order: Order) {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`<html><head><title>Pedido #${order._id}</title></head><body><h1>Pedido #${order._id}</h1><p>Mesa: ${order.table || 'N/A'}</p><ul>${order.items?.map(i => `<li>${i.quantity || 1} x ${i.name || ''}</li>`).join('') || ''}</ul><p>Notas: ${order.notes || 'Nenhuma'}</p></body></html>`);
      win.document.close();
      win.print();
      win.close();
    }
  }

  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!useSSE || !autoRefresh || !token) return;

    const base = API || '';
    const es = new EventSource(`${base}/v1/admin/orders/stream?token=${encodeURIComponent(token)}`);

    es.onmessage = (event) => {
      try {
        const change = JSON.parse(event.data);
        setOrders((prev) => {
          if (change.operationType === 'insert') {
            return [change.fullDocument, ...prev];
          } else if (change.operationType === 'update') {
            const updated = { ...prev.find((o) => o._id === change.documentKey._id), ...change.updateDescription.updatedFields };
            return prev.map((o) => o._id === change.documentKey._id ? updated : o);
          } else if (change.operationType === 'delete') {
            return prev.filter((o) => o._id !== change.documentKey._id);
          }
          return prev;
        });
      } catch (e) {
        console.error('SSE error', e);
      }
    };

    eventSourceRef.current = es;
    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [useSSE, autoRefresh, token, API]);

  useEffect(() => {
    // iniciar atualização: chamada inicial sempre, intervalo só quando autoRefresh ativo e não SSE
    loadOrders()
    if (pollRef.current) window.clearInterval(pollRef.current)
    if (autoRefresh && !useSSE) {
      pollRef.current = window.setInterval(loadOrders, refreshInterval)
    } else {
      pollRef.current = null
    }
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current)
    }
  }, [token, page, limit, demo, autoRefresh, refreshInterval, useSSE])

  function statusLabel(s: Order['status']) {
    switch (s) {
      case 'pending': return 'Pendente'
      case 'accepted': return 'Aceito'
      case 'in_progress': return 'Preparando'
      case 'ready': return 'Pronto'
      case 'delivered': return 'Entregue'
      case 'cancelled': return 'Cancelado'
    }
  }

  function statusColor(s: Order['status']) {
    switch (s) {
      case 'pending': return '#757575'
      case 'accepted': return '#ed6c02'
      case 'in_progress': return '#1976d2'
      case 'ready': return '#2e7d32'
      case 'delivered': return '#455a64'
      case 'cancelled': return '#c62828'
    }
  }

  function resetDemoTimes() {
    if (!demo) return
    setOrders((prev) => prev.map((o) => ({ ...o, createdAt: new Date().toISOString() })))
  }

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    const t = tableFilter.trim().toLowerCase();
    return orders.map(o => ({
      ...o,
      items: stationFilter ? o.items?.filter(i => productToStation[i.name || ''] === stationFilter) : o.items
    })).filter(o => (o.items?.length ?? 0) > 0).filter((o) => {
      const matchesQuery = !q || (
        o._id.toLowerCase().includes(q) ||
        (o.table ?? '').toLowerCase().includes(q) ||
        (o.notes ?? '').toLowerCase().includes(q)
      );
      const matchesTable = !t || (o.table ?? '').toLowerCase().includes(t);
      const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
      let matchesTime = true;
      if (o.createdAt) {
        const mins = Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 60000);
        if (minMinutes !== '' && mins < minMinutes) matchesTime = false;
        if (maxMinutes !== '' && mins > maxMinutes) matchesTime = false;
      }
      return matchesQuery && matchesTable && matchesStatus && matchesTime;
    });
  }, [orders, query, tableFilter, statusFilter, minMinutes, maxMinutes, stationFilter, productToStation]);
  
  const grouped = useMemo(() => {
    const g = {
      pending: [],
      accepted: [],
      in_progress: [],
      ready: [],
      delivered: [],
      cancelled: [],
    };
    for (const o of filteredOrders) {
      g[o.status].push(o);
    }
    const sortFn = sortMode === 'oldest' 
      ? (a, b) => new Date(a.createdAt || '0').getTime() - new Date(b.createdAt || '0').getTime()
      : (a, b) => new Date(b.createdAt || '0').getTime() - new Date(a.createdAt || '0').getTime();
    for (const key in g) {
      g[key].sort(sortFn);
    }
    return g;
  }, [filteredOrders, sortMode]);
  
  return (
    <div style={{ padding: 16 }}>
      <style>{`@keyframes kd-blink { 0%{opacity:1} 50%{opacity:0.6} 100%{opacity:1} }`}</style>
      <h1>Cozinha — Pedidos</h1>
      {busyMode && <div style={{ backgroundColor: 'yellow', padding: 10, textAlign: 'center', marginBottom: 16 }}>
        Modo Busy Ativo - Atraso adicional de {delayMinutes} minutos
      </div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        
        <label>
          Mesa:
          <input
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            placeholder="filtrar por mesa"
            style={{ marginLeft: 8 }}
          />
        </label>
        <label>
          Min (min):
          <input
            type="number"
            value={minMinutes === '' ? '' : String(minMinutes)}
            onChange={(e) => setMinMinutes(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="minutos mínimos"
            style={{ marginLeft: 8, width: 100 }}
          />
        </label>
        <label>
          Max (min):
          <input
            type="number"
            value={maxMinutes === '' ? '' : String(maxMinutes)}
            onChange={(e) => setMaxMinutes(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="minutos máximos"
            style={{ marginLeft: 8, width: 100 }}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
          Modo Demo
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={useSSE} onChange={(e) => setUseSSE(e.target.checked)} />
          SSE (stub)
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} />
          Modo compacto
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={groupItems} onChange={(e) => setGroupItems(e.target.checked)} />
          Agrupar itens
          <span style={{ marginLeft: 4, color: groupItems ? 'green' : 'red' }}>●</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={autoAcceptDemo} onChange={(e) => setAutoAcceptDemo(e.target.checked)} />
          Auto-aceitar demo
        </label>
        <label>
          Ordenação:
          <select value={sortMode} onChange={(e) => setSortMode(e.target.value as any)} style={{ marginLeft: 8 }}>
            <option value="oldest">Mais antigos</option>
            <option value="newest">Mais recentes</option>
          </select>
        </label>
        <button onClick={resetDemoTimes} disabled={!demo}>Reset demo</button>
        <button onClick={() => demo && setOrders([])} disabled={!demo}>Limpar demo</button>
        <label>
          Buscar:
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="mesa, código ou nota"
            style={{ marginLeft: 8 }}
          />
        </label>
        <label>
          Status:
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} style={{ marginLeft: 8 }}>
            <option value="all">Todos</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="in_progress">In progress</option>
            <option value="ready">Ready</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} />
          Som
          <span style={{ marginLeft: 4, color: soundEnabled ? 'green' : 'red' }}>●</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
          Auto-atualizar
        </label>
        <label>
          Intervalo:
          <select value={refreshInterval} onChange={(e) => setRefreshInterval(Number(e.target.value))} style={{ marginLeft: 8 }}>
            <option value={3000}>3s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={showOthers} onChange={(e) => setShowOthers(e.target.checked)} />
          Mostrar outros estados
        </label>
        <button onClick={loadOrders} disabled={loading} title="Atualiza a lista de pedidos">Atualizar</button>
        <button onClick={() => { setQuery(''); setTableFilter(''); setStatusFilter('all'); setMinMinutes(''); setMaxMinutes('') }} title="Limpa busca, mesa, status e limites de minutos">Limpar filtros</button>
        <button onClick={exportCSV} title="Exporta pedidos filtrados em CSV">Exportar CSV</button>
        <button onClick={exportJSON} title="Exporta pedidos filtrados em JSON">Exportar JSON</button><button onClick={() => { localStorage.removeItem('authToken'); window.location.href = '/login'; }}>Logout</button>
        <span style={{ opacity: 0.7 }}>
          Filtrados: {filteredOrders.length} | Pending: {grouped.pending.length} | In progress: {grouped.in_progress.length} | Ready: {grouped.ready.length}
        </span>
        {loading && <span>Carregando…</span>}
        {error && <span style={{ color: 'red' }}>Erro: {error}</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {(['pending', 'in_progress', 'ready'] as const).map((col) => (
          <div key={col}>
            <h2 style={{ textTransform: 'capitalize' }}>{col.replace('_', ' ')} <small>({grouped[col].length})</small></h2>
            <div style={{ display: 'grid', gap: 8 }}>
              {grouped[col].map((o) => (
                <div key={o._id} style={{ border: `1px solid ${o.status === 'ready' ? '#2e7d32' : o.status === 'accepted' ? '#ed6c02' : slaColor(o.createdAt)}`, borderRadius: 8, padding: 12, animation: (o.createdAt && slaColor(o.createdAt) === '#c62828') ? 'kd-blink 1.2s linear infinite' : undefined }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                    <strong>#{o._id.slice(-6)}</strong>
                    <button onClick={() => navigator.clipboard.writeText(o._id)} title="Copia o ID completo">Copiar ID</button>
                    <button onClick={() => navigator.clipboard.writeText(JSON.stringify(o))} title="Copia o JSON do pedido">Copiar JSON</button>
                    <span>{o.table || '—'}</span>
                    {o.table && <button onClick={() => navigator.clipboard.writeText(o.table!)} title="Copia o nome da mesa">Copiar mesa</button>}
                    <span style={{ marginLeft: 'auto', fontSize: 12, padding: '2px 6px', borderRadius: 10, background: '#eee', color: statusColor(o.status) }}>{statusLabel(o.status)}</span>
                  </div>
                  <SLA createdAt={o.createdAt} status={o.status} />
                  {o.createdAt && <div style={{ fontSize: 11, opacity: 0.7 }}>Criado: {new Date(o.createdAt).toLocaleTimeString()}</div>}
                  {!compact && (
                    <div>
                      {(o.items || []).map((it, idx) => (
                        <div key={idx}>
                          {it.quantity || 1} × {it.name || 'item'}
                        </div>
                      ))}
                    </div>
                  )}
                  {compact && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4, fontSize: 12, opacity: 0.85 }}>
                      {(() => {
                        const raw = o.items || []
                        let items: { name: string; quantity: number }[]
                        if (groupItems) {
                          const map = new Map<string, number>()
                          for (const it of raw) {
                            const name = (it.name || 'item').trim()
                            const qty = Number(it.quantity || 1)
                            map.set(name, (map.get(name) || 0) + qty)
                          }
                          items = Array.from(map.entries()).map(([name, quantity]) => ({ name, quantity }))
                        } else {
                          items = raw.map((it) => ({ name: (it.name || 'item').trim(), quantity: Number(it.quantity || 1) }))
                        }
                        const maxShow = 3
                        const shown = items.slice(0, maxShow)
                        const rest = items.length - shown.length
                        return (
                          <>
                            {shown.map((it, i) => (
                              <span key={i} style={{ background: '#eee', borderRadius: 12, padding: '2px 8px' }}>
                                {it.quantity}× {it.name}
                              </span>
                            ))}
                            {rest > 0 && <span style={{ background: '#eee', borderRadius: 12, padding: '2px 8px' }}>+{rest} itens</span>}
                          </>
                        )
                      })()}
                    </div>
                  )}
                  {!compact && o.notes && <div style={{ marginTop: 8 }}><em>{o.notes}</em></div>}
                  <StatusActions order={o} onUpdate={(status) => updateStatus(o._id, status)} onPrint={printOrder} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showOthers && (
        <div style={{ marginTop: 24 }}>
          <h2>Outros estados</h2>
          <div style={{ display: 'flex', gap: 16 }}>
            <div>
              <h3>Accepted</h3>
              {grouped.accepted.map((o) => (
                <div key={o._id}>#{o._id.slice(-6)}</div>
              ))}
            </div>
            <div>
              <h3>Delivered</h3>
              {grouped.delivered.map((o) => (
                <div key={o._id}>#{o._id.slice(-6)}</div>
              ))}
            </div>
            <div>
              <h3>Cancelled</h3>
              {grouped.cancelled.map((o) => (
                <div key={o._id}>#{o._id.slice(-6)}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</button>
        <button onClick={() => setPage((p) => p + 1)}>Próxima</button>
        <label>
          Por página:
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} style={{ marginLeft: 8 }}>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
        <span style={{ opacity: 0.7 }}>Página {page}</span>
      </div>
    </div>
  )
}