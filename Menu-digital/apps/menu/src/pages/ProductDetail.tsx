import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProductComposition, type SelectedOption } from '../api'
import { useCart } from '../cartContext'
import { Box, Container, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { Restaurant as RestaurantIcon } from '@mui/icons-material'
import { CardMedia } from '@mui/material'
import { getPublicBranding, type PublicBranding } from '../api'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<any>(null)
  const [quantity, setQuantity] = useState(1)
  const [modifiers, setModifiers] = useState<SelectedOption[]>([])
  const [variants, setVariants] = useState<SelectedOption[]>([])
  const cart = useCart()
  const theme = useTheme()
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
            ← Voltar
          </button>

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
  )

  useEffect(() => {
    if (!id) return
    getProductComposition(id).then(setData).catch(console.error)
  }, [id])

  const product = data?.product
  const modifierGroups = data?.modifierGroups ?? []
  const variantGroups = data?.variantGroups ?? []

  const totalPrice = useMemo(() => {
    if (!product || typeof product.price === 'undefined') return 0
    let price = Number(product.price) * quantity
    
    modifierGroups.forEach((g: any) => {
      g.options?.forEach((opt: any) => {
        if (modifiers.some((m) => m.optionId === (opt.id || opt._id))) {
          price += (opt.priceDelta || 0) * quantity
        }
      })
    })
    
    variantGroups.forEach((g: any) => {
      g.options?.forEach((opt: any) => {
        if (variants.some((v) => v.optionId === (opt.id || opt._id))) {
          price += (opt.priceDelta || 0) * quantity
        }
      })
    })
    
    return price
  }, [product, quantity, modifiers, variants, modifierGroups, variantGroups])

  const canAdd = useMemo(() => quantity > 0 && !!product, [quantity, product])

  function toggleSelected(list: SelectedOption[], setList: (v: SelectedOption[]) => void, groupId: string, optionId: string, single = false) {
    if (single) {
      setList([{ groupId, optionId }])
    } else {
      const exists = list.some((s) => s.groupId === groupId && s.optionId === optionId)
      setList(exists ? list.filter((s) => !(s.groupId === groupId && s.optionId === optionId)) : [...list, { groupId, optionId }])
    }
  }

  function isSelected(list: SelectedOption[], groupId: string, optionId: string) {
    return list.some((s) => s.groupId === groupId && s.optionId === optionId)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <Header />

      <div style={{ maxWidth: 800, margin: '0 auto', padding: 16, fontFamily: 'sans-serif' }}>
        {product ? (
          <>
            {product.imageUrl && (
              <img 
                src={product.imageUrl} 
                alt={product.name} 
                style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 12, marginBottom: 16 }}
              />
            )}

            <h1 style={{ margin: '0 0 8px' }}>{product.name}</h1>
            {product.description && (
              <p style={{ color: '#666', margin: '0 0 16px' }}>{product.description}</p>
            )}
            
            <div style={{ fontSize: 24, fontWeight: 'bold', color: theme.palette.primary.main, marginBottom: 24 }}>
              {typeof product.price !== 'undefined' && `${Number(product.price).toFixed(2)}`}
            </div>

            {modifierGroups.length > 0 && (
              <section style={{ marginBottom: 24 }}>
                <h3 style={{ marginBottom: 12 }}>Extras</h3>
                {modifierGroups.map((g: any) => (
                  <div key={g.id || g._id} style={{ marginBottom: 16 }}>
                    <h4 style={{ margin: '0 0 8px', fontSize: 16 }}>{g.name}</h4>
                    {g.description && <p style={{ margin: '0 0 12px', fontSize: 14, color: '#999' }}>{g.description}</p>}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
                      {g.options?.map((o: any) => {
                        const selected = isSelected(modifiers, g.id || g._id?.toString(), o.id || o._id?.toString())
                        return (
                          <button 
                            key={o.id || o._id}
                            onClick={() => toggleSelected(modifiers, setModifiers, g.id || g._id?.toString(), o.id || o._id?.toString())}
                            style={{
                              padding: 12,
                              border: `2px solid ${selected ? theme.palette.primary.main : '#ddd'}`,
                              background: selected ? (theme.palette.action?.selected || '#f6f6f6') : '#fff',
                              borderRadius: 8,
                              cursor: 'pointer',
                              textAlign: 'left'
                            }}
                          >
                            <div style={{ fontWeight: selected ? 'bold' : 'normal' }}>{o.label}</div>
                            {o.priceDelta !== 0 && (
                              <div style={{ fontSize: 12, color: '#666' }}>+{Number(o.priceDelta).toFixed(2)}</div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </section>
            )}

            {variantGroups.length > 0 && (
              <section style={{ marginBottom: 24 }}>
                <h3 style={{ marginBottom: 12 }}>Variantes</h3>
                {variantGroups.map((g: any) => (
                  <div key={g.id || g._id} style={{ marginBottom: 16 }}>
                    <h4 style={{ margin: '0 0 8px', fontSize: 16 }}>{g.name}</h4>
                    {g.description && <p style={{ margin: '0 0 12px', fontSize: 14, color: '#999' }}>{g.description}</p>}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
                      {g.options?.map((o: any) => {
                        const selected = isSelected(variants, g.id || g._id?.toString(), o.id || o._id?.toString())
                        return (
                          <button 
                            key={o.id || o._id}
                            onClick={() => toggleSelected(variants, setVariants, g.id || g._id?.toString(), o.id || o._id?.toString(), true)}
                            style={{
                              padding: 12,
                              border: `2px solid ${selected ? theme.palette.primary.main : '#ddd'}`,
                              background: selected ? (theme.palette.action?.selected || '#f6f6f6') : '#fff',
                              borderRadius: 8,
                              cursor: 'pointer',
                              textAlign: 'left'
                            }}
                          >
                            <div style={{ fontWeight: selected ? 'bold' : 'normal' }}>{o.label}</div>
                            {o.priceDelta !== 0 && (
                              <div style={{ fontSize: 12, color: '#666' }}>+{Number(o.priceDelta).toFixed(2)}</div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </section>
            )}

            <div style={{ 
              position: 'sticky', 
              bottom: 0, 
              background: '#fff', 
              padding: 16, 
              borderTop: '1px solid #ddd',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginLeft: -16,
              marginRight: -16
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  style={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: '50%', 
                    border: '1px solid #ddd',
                    background: '#f5f5f5',
                    cursor: 'pointer',
                    fontSize: 20
                  }}
                >
                  -
                </button>
                <span style={{ fontSize: 18, fontWeight: 'bold', minWidth: 30, textAlign: 'center' }}>{quantity}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  style={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: '50%', 
                    border: '1px solid #ddd',
                    background: '#f5f5f5',
                    cursor: 'pointer',
                    fontSize: 20
                  }}
                >
                  +
                </button>
              </div>

              <button 
                disabled={!canAdd} 
                onClick={() => {
                  if (!product) return
                  const modifierNames = modifierGroups.flatMap((g: any) => {
                    const gid = g.id || g._id
                    return (g.options || []).filter((opt: any) => modifiers.some((m) => m.groupId === gid && m.optionId === (opt.id || opt._id || opt.name)))
                      .map((opt: any) => opt.label || opt.name)
                  })
                  const variantNames = variantGroups
                    .map((g: any) => {
                      const gid = g.id || g._id
                      const sel = variants.find((v) => v.groupId === gid)
                      const opt = (g.options || []).find((o: any) => (o.id || o._id || o.name) === sel?.optionId)
                      return opt?.label || opt?.name
                    })
                    .filter(Boolean) as string[]
                  cart.addItem({ productId: product.id, quantity, modifiers, variants, name: product.name, modifierNames, variantNames })
                  navigate(-1)
                }}
                style={{
                  flex: 1,
                  padding: 16,
                  background: canAdd ? theme.palette.primary.main : '#ccc',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: canAdd ? 'pointer' : 'not-allowed',
                  fontSize: 16,
                  fontWeight: 'bold'
                }}
              >
                Adicionar {totalPrice.toFixed(2)}
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 48 }}>Carregando…</div>
        )}
      </div>
    </div>
  )
}