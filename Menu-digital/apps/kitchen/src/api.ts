export type OrderStatus = 'pending' | 'in_progress' | 'ready' | 'delivered' | 'cancelled'

export type OrderItem = {
  productId: string
  name?: string
  quantity: number
  notes?: string
}

export type Order = {
  id: string
  tableId?: string
  status: OrderStatus
  items?: OrderItem[]
  notes?: string
  createdAt?: string
  updatedAt?: string
}

const base = '' // usar proxy Vite para /v1

function adminHeaders() {
  const jwt = typeof window !== 'undefined' ? window.localStorage.getItem('authToken') : null
  return jwt ? { Authorization: `Bearer ${jwt}` } : {}
}

async function doFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${base}${path}`, init)
  if (res.status === 401 || res.status === 403) {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('authToken')
      window.location.href = '/login'
    }
    throw new Error('Não autorizado')
  }
  return res
}

export async function listOrders(params: { status?: OrderStatus; page?: number; limit?: number } = {}): Promise<{ items: Order[] }> {
  const q = new URLSearchParams()
  if (params.status) q.set('status', params.status)
  if (params.page) q.set('page', String(params.page))
  if (params.limit) q.set('limit', String(params.limit))
  const res = await doFetch(`/v1/admin/orders?${q.toString()}`, {
    headers: { ...adminHeaders() },
  })
  if (!res.ok) throw new Error('Falha ao carregar pedidos')
  return res.json()
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  const res = await doFetch(`/v1/admin/orders/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...adminHeaders() },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error('Falha ao atualizar pedido')
  return res.json()
}