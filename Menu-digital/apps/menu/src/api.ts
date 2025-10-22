export type Category = {
  id: string
  name: string
  description?: string
  order?: number
  imageUrl?: string
}

export type Product = {
  id: string
  name: string
  description?: string
  imageUrl?: string
  price?: number
  categoryId?: string
  isAvailable?: boolean
}

export type SelectedOption = { groupId: string; optionId: string }
export type OrderItemInput = {
  productId: string
  quantity: number
  modifiers?: SelectedOption[]
  variants?: SelectedOption[]
  notes?: string
}

export type OrderCreateInput = {
  tableId?: string
  items: OrderItemInput[]
  notes?: string
  nif?: string
  payment?: { method?: 'cash' | 'card'; status?: 'pending' | 'paid' | 'refunded'; transactionId?: string }
}

const base = (import.meta as any)?.env?.VITE_API_URL || '' // usar proxy Vite para /v1 por padrão

export async function listCategories(): Promise<Category[]> {
  const res = await fetch(`${base}/v1/public/categories`)
  if (!res.ok) throw new Error('Failed to load categories')
  return res.json()
}

export async function listProducts(params: { categoryId?: string } = {}): Promise<{ items: Product[] }> {
  const q = new URLSearchParams()
  if (params.categoryId) q.set('categoryId', params.categoryId)
  const res = await fetch(`${base}/v1/public/products?${q.toString()}`)
  if (!res.ok) throw new Error('Failed to load products')
  return res.json()
}

export async function getProductComposition(id: string): Promise<any> {
  const res = await fetch(`${base}/v1/public/products/${id}/composition`)
  if (!res.ok) throw new Error('Failed to load composition')
  return res.json()
}

export async function checkoutOrder(input: OrderCreateInput): Promise<any> {
  const res = await fetch(`${base}/v1/public/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error('Failed to create order')
  return res.json()
}

// Fallback: listar grupos públicos quando a composição do produto vier vazia
export async function listModifierGroups(): Promise<any[]> {
  const res = await fetch(`${base}/v1/public/modifiers`)
  if (!res.ok) throw new Error('Failed to load modifiers')
  return res.json()
}

export async function listVariantGroups(): Promise<any[]> {
  const res = await fetch(`${base}/v1/public/variants`)
  if (!res.ok) throw new Error('Failed to load variants')
  return res.json()
}

// Public theme settings for Menu app appearance
type PublicThemeAppearance = {
  mode?: 'light' | 'dark'
  primaryColor?: string
  secondaryColor?: string
  fontFamily?: string
  shapeRadius?: number
}

export async function getPublicTheme(): Promise<PublicThemeAppearance | null> {
  try {
    const res = await fetch(`${base}/v1/public/theme`)
    if (res.ok) {
      const data = await res.json()
      return (data?.appearance ?? data ?? null) as PublicThemeAppearance | null
    }
    // Fallback: tentar endpoint admin que também retorna settings (com defaults em DEV)
    const resAdmin = await fetch(`${base}/v1/admin/settings`)
    if (!resAdmin.ok) return null
    const dataAdmin = await resAdmin.json()
    return (dataAdmin?.appearance ?? null) as PublicThemeAppearance | null
  } catch {
    return null
  }
}

// Public branding settings (cover image, logo and display name)
export type PublicBranding = {
  displayName?: string
  logoImageUrl?: string
  coverImageUrl?: string
  mobileCenterLogo?: boolean
}

export async function getPublicBranding(): Promise<PublicBranding | null> {
  try {
    const res = await fetch(`${base}/v1/public/branding`)
    if (res.ok) {
      const data = await res.json()
      return (data ?? null) as PublicBranding | null
    }
    // Fallback: ler do admin settings
    const resAdmin = await fetch(`${base}/v1/admin/settings`)
    if (!resAdmin.ok) return null
    const dataAdmin = await resAdmin.json()
    return (dataAdmin?.branding ?? null) as PublicBranding | null
  } catch {
    return null
  }
}

export async function createMbwayPayment(orderId: string, amount: number, phoneNumber: string, customerEmail?: string): Promise<any> {
  const res = await fetch(`${base}/v1/public/payments/mbway`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, amount, phoneNumber, customerEmail })
  })
  if (!res.ok) throw new Error('Failed to create MB WAY payment')
  return res.json()
}

export async function createMultibancoPayment(orderId: string, amount: number, customerName?: string, customerEmail?: string): Promise<any> {
  const res = await fetch(`${base}/v1/public/payments/multibanco`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, amount, customerName, customerEmail })
  })
  if (!res.ok) throw new Error('Failed to create Multibanco payment')
  return res.json()
}