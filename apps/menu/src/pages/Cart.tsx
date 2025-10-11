import { useState } from 'react'
import { useCart } from '../cartContext'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function Cart() {
  const cart = useCart()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [nif, setNif] = useState('')
  const tableId = params.get('table') || undefined

  async function handleCheckout() {
    setLoading(true)
    try {
      const result = await cart.submit({ tableId, nif: nif.trim() || undefined })
      navigate(`/order/${result.id}`)
    } catch (e: any) {
      alert(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'sans-serif', background: '#f8f9fa' }}>
      <header style={{ 
        background: 'linear-gradient(135deg, #2d6a4f 0%, #40916c 100%)', 
        color: '#fff', 
        padding: '24px 16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <button 
            onClick={() => navigate('/')}
            style={{ 
              background: 'rgba(255,255,255,0.2)', 
              border: 'none', 
              color: '#fff', 
              padding: '8px 16px', 
              borderRadius: 8,
              cursor: 'pointer',
              marginBottom: 12
            }}
          >
            ← Voltar ao menu
          </button>
          <h1 style={{ margin: 0, fontSize: 28 }}>Seu Carrinho</h1>
          {tableId && <p style={{ margin: '4px 0 0', opacity: 0.9 }}>Mesa: {tableId}</p>}
        </div>
      </header>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>
        {cart.items.length === 0 ? (
          <div style={{ 
            background: '#fff', 
            borderRadius: 12, 
            padding: 48, 
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🛒</div>
            <h2 style={{ margin: '0 0 8px', color: '#666' }}>Seu carrinho está vazio</h2>
            <p style={{ color: '#999', margin: '0 0 24px' }}>Adicione produtos do menu para continuar</p>
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
              Ver Menu
            </button>
          </div>
        ) : (
          <>
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              {cart.items.map((it, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'start',
                    padding: '16px 0',
                    borderBottom: idx < cart.items.length - 1 ? '1px solid #eee' : 'none'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{it.productId}</div>
                    <div style={{ fontSize: 14, color: '#666' }}>Quantidade: {it.quantity}</div>
                    {it.notes && <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>Obs: {it.notes}</div>}
                  </div>
                  <button 
                    onClick={() => cart.removeItem(idx)}
                    style={{ 
                      background: '#dc3545', 
                      color: '#fff', 
                      border: 'none', 
                      padding: '8px 12px', 
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 'bold'
                    }}
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>

            <div style={{ 
              background: '#fff', 
              borderRadius: 12, 
              padding: 16,
              marginBottom: 16,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: '600', color: '#333' }}>
                NIF (opcional)
              </label>
              <input
                type="text"
                value={nif}
                onChange={(e) => setNif(e.target.value)}
                placeholder="Digite seu NIF para fatura"
                maxLength={9}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e0e0e0',
                  borderRadius: 8,
                  fontSize: 16,
                  fontFamily: 'sans-serif',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#2d6a4f'}
                onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
              />
              <p style={{ fontSize: 12, color: '#666', margin: '8px 0 0' }}>
                💡 Informe seu NIF caso precise de fatura
              </p>
            </div>

            <div style={{ 
              position: 'sticky', 
              bottom: 0, 
              background: '#fff', 
              borderRadius: 12, 
              padding: 16,
              boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
              display: 'flex',
              gap: 12
            }}>
              <button 
                onClick={() => cart.clear()}
                style={{ 
                  flex: 1,
                  background: '#6c757d', 
                  color: '#fff', 
                  border: 'none', 
                  padding: 16, 
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 16,
                  fontWeight: 'bold'
                }}
              >
                Limpar
              </button>
              <button 
                onClick={handleCheckout}
                disabled={loading}
                style={{ 
                  flex: 2,
                  background: loading ? '#ccc' : '#2d6a4f', 
                  color: '#fff', 
                  border: 'none', 
                  padding: 16, 
                  borderRadius: 8,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: 16,
                  fontWeight: 'bold'
                }}
              >
                {loading ? 'Processando...' : 'Finalizar Pedido'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}