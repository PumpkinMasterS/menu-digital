export type OrderStatus = 'pending' | 'preparing' | 'in_progress' | 'ready' | 'delivered' | 'cancelled'

export type OrderItemModifier = {
  groupId: string
  groupName?: string
  optionId: string
  optionName?: string
  priceDelta?: number
}

export type OrderItem = {
  productId: string
  name?: string
  quantity: number
  notes?: string
  modifiers?: OrderItemModifier[]
  variants?: OrderItemModifier[]
}

export type OrderTotals = {
  subtotal?: number
  tax?: number
  total?: number
}

export type Order = {
  id: string
  tableId?: string
  status: OrderStatus
  items?: OrderItem[]
  notes?: string
  nif?: string
  createdAt?: string
  updatedAt?: string
  totals?: OrderTotals
}

function buildHeaders(extra?: Record<string, string>) {
  const jwt = typeof window !== 'undefined' ? window.localStorage.getItem('authToken') : null
  const legacy = typeof window !== 'undefined' ? window.localStorage.getItem('ADMIN_TOKEN') : null
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(extra || {}) }
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`
  else if (legacy) headers['x-admin-token'] = legacy
  return headers
}

export async function listOrders(filter?: OrderStatus | 'all') {
  const qs = filter && filter !== 'all' ? `?status=${filter}` : ''
  const res = await fetch(`/v1/admin/orders${qs}`, { headers: buildHeaders() })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const res = await fetch(`/v1/admin/orders/${id}` , {
    method: 'PATCH',
    headers: buildHeaders(),
    body: JSON.stringify({ status })
  })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}