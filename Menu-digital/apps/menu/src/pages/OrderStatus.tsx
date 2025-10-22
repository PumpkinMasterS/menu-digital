import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { Restaurant as RestaurantIcon } from '@mui/icons-material'
import { CardMedia } from '@mui/material'
import { getPublicBranding, type PublicBranding } from '../api'

// Tipos de status suportados no backend/frontend
export type OrderStatus = 'pending' | 'in_progress' | 'ready' | 'delivered' | 'cancelled'

interface OrderItem {
  quantity: number
  name?: string
  productId?: string
  total?: number
}

interface Order {
  id: string
  status: OrderStatus
  tableId?: string
  items: OrderItem[]
  total?: number
  createdAt: string
}

export default function OrderStatus() {
  const theme = useTheme()
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  const statusUI = {
    pending: {
      label: 'Pedido recebido',
      color: theme.palette.warning.main,
      icon: '⏳',
      description: 'Seu pedido foi recebido e está sendo preparado. Aguarde sentado.',
    },
    in_progress: {
      label: 'Em preparo',
      color: theme.palette.info.main,
      icon: '👨‍🍳',
      description: 'Seu pedido está sendo preparado.',
    },
    ready: {
      label: 'Pronto',
      color: theme.palette.success.main,
      icon: '✅',
      description: 'Seu pedido está pronto!'
    },
    delivered: {
      label: 'Entregue',
      color: theme.palette.text.secondary,
      icon: '🎉',
      description: 'Seu pedido foi entregue. Bom apetite!'
    },
    cancelled: {
      label: 'Cancelado',
      color: theme.palette.error.main,
      icon: '❌',
      description: 'Seu pedido foi cancelado.'
    },
  } as const

  async function fetchOrder() {
    if (!id) return
    try {
      const res = await fetch(`/v1/public/orders/${id}`)
      if (!res.ok) throw new Error('Order not found')
      const data = (await res.json()) as Order
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

  const formatCurrency = (n?: number) =>
    typeof n === 'number' ? n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }) : ''

  const isSmDown = useMediaQuery(theme.breakpoints.down('sm'))
  const [branding, setBranding] = useState<PublicBranding | null>(null)

  useEffect(() => {
    getPublicBranding().then(setBranding).catch(() => {})
  }, [])



  const Header = () => (
    <Box sx={{ position: 'relative', px: 2, pt: 2, pb: 1 }}>
      <Container maxWidth="md" sx={{ px: 0 }}>
        <Box sx={{ position: 'relative', height: isSmDown ? 160 : 200, borderRadius: 3, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
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
          {branding?.coverImageUrl && (
            <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,0.35), rgba(0,0,0,0.25))' }} />
          )}

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

          {/* Mesa oculta conforme requisito do cliente */}

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

  );

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }} aria-busy="true">
        <Header />
        <Stack spacing={2} alignItems="center">
          <CircularProgress color="primary" aria-label="A carregar o pedido" />
          <Typography variant="body2" color="text.secondary">Carregando...</Typography>
        </Stack>
      </Box>
    )
  }

  if (!order) {
    return (
      <Box minHeight="100vh" display="grid" placeItems="center">
        <Header />
        <Container maxWidth="sm">
          <Card sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom>Pedido não encontrado</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Verifique o link ou faça um novo pedido.
            </Typography>
            <Button variant="contained" color="primary" onClick={() => navigate('/')}>Voltar ao Menu</Button>
          </Card>
        </Container>
      </Box>
    )
  }

  const cfg = statusUI[order.status]

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Header />
      <Container maxWidth="md" sx={{ py: 2 }}>
        {/* Status */}
        <Card sx={{ p: 3, mb: 2, textAlign: 'center' }} role="status" aria-live="polite">
          <Box sx={{ fontSize: 64, mb: 1 }} aria-hidden>{cfg.icon}</Box>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mb: 1 }}>
            <Chip label={cfg.label} sx={{ bgcolor: cfg.color, color: '#fff', fontWeight: 700 }} />
          </Stack>
          <Typography id="order-desc" variant="body1" color="text.secondary" sx={{ mb: 2, fontWeight: order.status === 'pending' ? 700 : undefined }}>{cfg.description}</Typography>


        </Card>

        {/* Detalhes */}
        <Card sx={{ p: 2, mb: 2 }} aria-labelledby="details-title">
          <Typography id="details-title" variant="h6" sx={{ mb: 1 }}>Detalhes do Pedido</Typography>

          {order.tableId && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {/* Mesa oculta conforme requisito do cliente */}
            </Typography>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            <strong>Realizado:</strong> {new Date(order.createdAt).toLocaleString('pt-PT')}
          </Typography>

          <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Itens:</Typography>
            {order.items.map((item, idx) => (
              <Typography key={idx} variant="body2" sx={{ mb: 0.5 }}>
                {item.quantity}× {item.name || item.productId}
              </Typography>
            ))}
          </Box>

          {typeof order.total === 'number' && (
            <Typography variant="h6" sx={{ mt: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider', fontWeight: 800 }}>
              Total: {formatCurrency(order.total)}
            </Typography>
          )}
        </Card>

        <Button fullWidth size="large" variant="contained" color="primary" onClick={() => navigate('/')}>Fazer Novo Pedido</Button>
      </Container>
    </Box>
  )
}

