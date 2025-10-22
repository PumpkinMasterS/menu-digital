import { useState, useEffect } from 'react'
import { useCart } from '../cartContext'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Box, Container, Typography, Card, CardMedia, Chip } from '@mui/material'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import { Restaurant as RestaurantIcon } from '@mui/icons-material'
import { getPublicBranding, type PublicBranding, createMbwayPayment } from '../api'
import { resolveTableCode } from '../utils/table'

export default function Cart() {
  const cart = useCart()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [nif, setNif] = useState('')
  const [mbwayPhone, setMbwayPhone] = useState('')
  const tableId = resolveTableCode(params, window.location.hostname) || undefined
  const theme = useTheme()
  const isSmDown = useMediaQuery(theme.breakpoints.down('sm'))
  const [branding, setBranding] = useState<PublicBranding | null>(null)

  useEffect(() => {
    getPublicBranding().then(setBranding).catch(() => {})
  }, [])

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

  async function handleMbwayCheckout() {
    const phone = mbwayPhone.trim()
    if (!/^9[1236]\d{7}$/.test(phone)) {
      alert('Número MB WAY inválido. Use o formato 9XXXXXXXX')
      return
    }
    setLoading(true)
    try {
      const order: any = await cart.submit({ tableId, nif: nif.trim() || undefined })
      const amount = Number(order?.totals?.total ?? order?.total ?? 0)
      const payment = await createMbwayPayment(order.id, amount, phone)
      if (payment?.instructions?.pt) {
        alert(payment.instructions.pt)
      }
      navigate(`/order/${order.id}`)
    } catch (e: any) {
      alert(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'sans-serif', background: '#f8f9fa' }}>
      {/* Cabeçalho consistente com o menu principal */}
      <Box sx={{ position: 'relative', px: 2, pt: 2, pb: 1 }}>
        <Container maxWidth="md" sx={{ px: 0 }}>
          <Box sx={{ position: 'relative', height: isSmDown ? 160 : 200, borderRadius: 3, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
            {/* Cover image or solid color */}
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                backgroundImage: branding?.coverImageUrl
                  ? `url(${branding.coverImageUrl})`
                  : `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            {/* Dark overlay for readability */}
            {branding?.coverImageUrl && (
              <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,0.35), rgba(0,0,0,0.25))' }} />
            )}

            {/* Botão Voltar */}
            <button
              onClick={() => navigate('/')}
              style={{
                position: 'absolute',
                top: 10,
                left: 10,
                background: 'rgba(255,255,255,0.85)',
                border: 'none',
                color: '#111',
                padding: '8px 12px',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              ← Voltar ao menu
            </button>

            {/* Código da mesa oculto conforme requisito do cliente */}

            {/* Logo e nome */}
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: (isSmDown || branding?.mobileCenterLogo) ? '50%' : 24,
                transform: (isSmDown || branding?.mobileCenterLogo) ? 'translate(-50%, -55%)' : 'translate(0, -55%)',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Card sx={{ width: isSmDown ? 72 : 88, height: isSmDown ? 72 : 88, borderRadius: 3, boxShadow: '0 6px 16px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
                {branding?.logoImageUrl ? (
                  <CardMedia component="img" src={branding.logoImageUrl} alt="Logo" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Box sx={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', bgcolor: '#fff' }}>
                    <RestaurantIcon sx={{ fontSize: isSmDown ? 40 : 48, color: theme.palette.primary.main }} />
                  </Box>
                )}
              </Card>
              <Box sx={{ textAlign: (isSmDown || branding?.mobileCenterLogo) ? 'center' : 'left' }}>
                <Typography
                  variant={isSmDown ? 'h6' : 'h5'}
                  component="h1"
                  sx={{
                    fontWeight: 800,
                    color: '#fff',
                    textShadow: branding?.coverImageUrl ? '0 2px 8px rgba(0,0,0,0.35)' : 'none',
                    fontFamily: theme.typography.fontFamily,
                  }}
                >
                  {branding?.displayName || 'Menu Digital'}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>

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
                background: theme.palette.primary.main, 
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
                    <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{it.name || it.productId}</div>
                    <div style={{ fontSize: 14, color: '#666' }}>Quantidade: {it.quantity}</div>
                    {it.variantNames?.length ? <div style={{ fontSize: 12, color: '#777' }}>Variações: {it.variantNames.join(', ')}</div> : null}
                    {it.modifierNames?.length ? <div style={{ fontSize: 12, color: '#777' }}>Extras: {it.modifierNames.join(', ')}</div> : null}
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
                onFocus={(e) => e.target.style.borderColor = theme.palette.primary.main}
                onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
              />
              <p style={{ fontSize: 12, color: '#666', margin: '8px 0 0' }}>
                💡 Informe seu NIF caso precise de fatura
              </p>
              <label style={{ display: 'block', margin: '16px 0 8px', fontWeight: '600', color: '#333' }}>
                MB WAY (sem login)
              </label>
              <input
                type="tel"
                value={mbwayPhone}
                onChange={(e) => setMbwayPhone(e.target.value)}
                placeholder="Número MB WAY (9XXXXXXXX)"
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
                onFocus={(e) => e.target.style.borderColor = theme.palette.primary.main}
                onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
              />
              <p style={{ fontSize: 12, color: '#666', margin: '8px 0 0' }}>
                📲 Insira o número MB WAY para pagar sem login
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
                  background: loading ? '#ccc' : '#0d6efd', 
                  color: '#fff', 
                  border: 'none', 
                  padding: 16, 
                  borderRadius: 8,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: 16,
                  fontWeight: 'bold'
                }}
              >
                {loading ? 'A enviar...' : 'Enviar direto à cozinha'}
              </button>
              <button
                onClick={handleMbwayCheckout}
                disabled={loading}
                style={{ 
                  flex: 2,
                  background: loading ? '#ccc' : theme.palette.primary.main, 
                  color: '#fff', 
                  border: 'none', 
                  padding: 16, 
                  borderRadius: 8,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: 16,
                  fontWeight: 'bold'
                }}
              >
                {loading ? 'A iniciar...' : 'Pagar com MB WAY'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}