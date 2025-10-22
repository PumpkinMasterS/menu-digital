import React, { createContext, useContext, useMemo, useState } from 'react'
import type { OrderItemInput, OrderCreateInput } from './api'
import { checkoutOrder } from './api'

type CartItem = OrderItemInput & { name?: string; modifierNames?: string[]; variantNames?: string[] }
type CartContextType = {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (index: number) => void
  clear: () => void
  submit: (payload?: Partial<OrderCreateInput>) => Promise<void>
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  const api = useMemo<CartContextType>(() => ({
    items,
    addItem: (it) => setItems((prev) => [...prev, it]),
    removeItem: (idx) => setItems((prev) => prev.filter((_, i) => i !== idx)),
    clear: () => setItems([]),
    submit: async (payload) => {
      const normalizedItems = items.map(({ productId, quantity, modifiers, variants, notes }) => ({ productId, quantity, modifiers, variants, notes }))
      const order: OrderCreateInput = { items: normalizedItems, ...payload }
      const result = await checkoutOrder(order)
      setItems([])
      return result
    },
  }), [items])

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}