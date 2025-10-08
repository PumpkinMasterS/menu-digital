import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

type OrderStatus = 'pending' | 'in_progress' | 'ready' | 'delivered' | 'cancelled'

interface Order {
  id: string
  status: OrderStatus
  tableId?: string
  items: any[]
  total?: number
  createdAt: string
}

const statusConfig = {
  pending: { label: 'Pendente', color: '#ffc107', icon: '⏳', description: 'Seu pedido foi recebido e está aguardando preparo.' },
  in_progress: { label: 'Em preparo', color: '#0dcaf0', icon: '👨‍🍳', description: 'Seu pedido está sendo preparado.' },
  ready: { label: 'Pronto', color: '#198754', icon: '✅', description: 'Seu pedido está pronto!' },
  delivered: { label: 'Entregue', color: '#6c757d', icon: '🎉', description: 'Seu pedido foi entregue. Bom apetite!' },
  cancelled: { label: 'Cancelado', color: '#dc3545', icon: '❌', description: 'Seu pedido foi cancelado.' },
}

export default function OrderStatus() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchOrder() {
    if (!id) return
    try {
      const res = await fetch(`/v1/public/orders/${id}`)
      if (!res.ok) throw new Error('Order not found')
      const data = await res.json()
      setOrder(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrder()
    const interval = setInterval(fetchOrder, 5000)
    return () => clearInterval(interval)
  }, [id])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <p>Carregando...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: 24 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>😕</div>
          <h2 style={{ margin: '0 0 16px' }}>Pedido não encontrado</h2>
          <button
            onClick={() => navigate('/')}
            style={{ 
              background: '#2d6a4f', 
              color: '#fff', 
              border: 'none', 
              padding: '12px 24px', 
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 'bold'
            }}
          >
            Voltar ao Menu
          </button>
        </div>
      </div>
    )
  }

  const config = statusConfig[order.status]
  const progress = order.status === 'pending' ? 25 : order.status === 'in_progress' ? 50 : order.status === 'ready' ? 75 : 100

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'sans-serif', background: '#f8f9fa' }}>
      <header style={{ 
        background: 'linear-gradient(135deg, #2d6a4f 0%, #40916c 100%)', 
        color: '#fff', 
        padding: '24px 16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>Acompanhe seu Pedido</h1>
          <p style={{ margin: '4px 0 0', opacity: 0.9 }}>Pedido #{order.id.slice(0, 8)}</p>
        </div>
      </header>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: 16 }}>
        <div style={{ 
          background: '#fff', 
          borderRadius: 12, 
          padding: 24,
          marginBottom: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>{config.icon}</div>
          <h2 style={{ margin: '0 0 8px', color: config.color }}>{config.label}</h2>
          <p style={{ margin: '0 0 24px', color: '#666' }}>{config.description}</p>
          
          <div style={{ 
            background: '#e9ecef', 
            borderRadius: 8, 
            height: 12, 
            overflow: 'hidden',
            marginBottom: 8
          }}>
            <div style={{ 
              background: config.color, 
              height: '100%', 
              width: `${progress}%`,
              transition: 'width 0.5s'
            }} />
          </div>
          <div style={{ fontSize: 12, color: '#999' }}>{progress}% concluído</div>
        </div>

        <div style={{ 
          background: '#fff', 
          borderRadius: 12, 
          padding: 16,
          marginBottom: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>Detalhes do Pedido</h3>
          {order.tableId && (
            <div style={{ marginBottom: 8, color: '#666' }}>
              <strong>Mesa:</strong> {order.tableId}
            </div>
          )}
          <div style={{ marginBottom: 8, color: '#666' }}>
            <strong>Realizado:</strong> {new Date(order.createdAt).toLocaleString('pt-PT')}
          </div>
          
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #eee' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 16 }}>Itens:</h4>
            {order.items.map((item, idx) => (
              <div key={idx} style={{ marginBottom: 8, fontSize: 14 }}>
                {item.quantity}× {item.name || item.productId}
              </div>
            ))}
          </div>
          
          {order.total && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #eee', fontSize: 18, fontWeight: 'bold' }}>
              Total: {order.total.toFixed(2)}
            </div>
          )}
        </div>

        <button
          onClick={() => navigate('/')}
          style={{ 
            width: '100%',
            background: '#2d6a4f', 
            color: '#fff', 
            border: 'none', 
            padding: '16px', 
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 'bold'
          }}
        >
          Fazer Novo Pedido
        </button>
      </div>
    </div>
  )
}

