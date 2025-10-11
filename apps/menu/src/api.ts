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

const base = '' // usar proxy Vite para /v1

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