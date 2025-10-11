import { useEffect, useState } from 'react'
import { listOrders, type Order, type OrderStatus } from './api'

export default function KitchenDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [loading, setLoading] = useState(false)

  async function refresh() {
    setLoading(true)
    try {
      const res = await listOrders(statusFilter === 'all' ? {} : { status: statusFilter })
      setOrders(res.items || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 10000)
    return () => clearInterval(id)
  }, [statusFilter])

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
    const labels = {
      pending: 'Pendente',
      in_progress: 'Em Preparação',
      ready: 'Pronto',
      delivered: 'Entregue',
      cancelled: 'Cancelado'
    }
    return labels[status] || status
  }

  function getStatusColor(status: OrderStatus) {
    const colors = {
      pending: '#ff9800',
      in_progress: '#2196f3',
      ready: '#4caf50',
      delivered: '#9e9e9e',
      cancelled: '#f44336'
    }
    return colors[status] || '#666'
  }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, color: '#333' }}>📋 Dashboard de Pedidos</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{ padding: '6px 12px' }}
          >
            <option value="all">Todos</option>
            <option value="pending">Pendente</option>
            <option value="in_progress">Em preparo</option>
            <option value="ready">Pronto</option>
            <option value="delivered">Entregue</option>
            <option value="cancelled">Cancelado</option>
          </select>
          <button onClick={refresh} style={{ padding: '6px 12px' }} disabled={loading}>
            Atualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>Carregando...</div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#999' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
          <h3>Nenhum pedido encontrado</h3>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
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
              </tr>
            </thead>
            <tbody>
              {orders.map((order, idx) => (
                <tr 
                  key={order.id} 
                  style={{ 
                    borderBottom: idx < orders.length - 1 ? '1px solid #e9ecef' : 'none',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: 16, fontWeight: 600 }}>#{order.orderNumber || order.id.slice(0, 6)}</td>
                  <td style={{ padding: 16 }}>{order.tableId || '-'}</td>
                  <td style={{ padding: 16 }}>
                    {Array.isArray(order.items) && order.items.length > 0 ? (
                      <div>
                        {order.items.map((it, i) => (
                          <div key={i} style={{ fontSize: 14, color: '#495057', marginBottom: 2 }}>
                            {it.quantity}× {(it as any).name || it.productId}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: '#adb5bd', fontSize: 14 }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: 16 }}>
                    {(order as any).nif ? (
                      <span style={{ 
                        background: '#e7f3ff', 
                        color: '#0056b3', 
                        padding: '4px 8px', 
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 500
                      }}>
                        {(order as any).nif}
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
                  </td>
                  <td style={{ padding: 16, fontSize: 14, color: '#6c757d' }}>
                    {formatDate(order.createdAt)}
                  </td>
                  <td style={{ padding: 16, fontWeight: 600, fontSize: 16 }}>
                    {order.totals?.total ? `€${order.totals.total.toFixed(2)}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}