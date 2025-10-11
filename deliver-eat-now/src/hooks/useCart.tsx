import { createContext, useContext, useEffect, useState } from 'react'
import { toast } from '@/hooks/use-toast'

interface CartItem {
  id: string
  name: string
  price: number
  image_url?: string
  restaurant_id: string
  restaurant_name?: string
  quantity: number
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  clearCart: () => void
  getTotalItems: () => number
  getTotalPrice: () => number
  getRestaurantId: () => string | null
}

const CartContext = createContext<CartContextType>({} as CartContextType)

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([])

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('food-delivery-cart')
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart))
      } catch (error) {
        console.error('Error loading cart from localStorage:', error)
        localStorage.removeItem('food-delivery-cart')
      }
    }
  }, [])

  // Save cart to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem('food-delivery-cart', JSON.stringify(items))
  }, [items])

  const addItem = (newItem: Omit<CartItem, 'quantity'>) => {
    setItems(currentItems => {
      // Check if cart is empty or if adding item from same restaurant
      const restaurantId = getRestaurantId()
      if (restaurantId && restaurantId !== newItem.restaurant_id) {
        toast({
          title: "Carrinho de outro restaurante",
          description: "Só podes ter items de um restaurante de cada vez. O carrinho será limpo.",
          variant: "destructive"
        })
        // Clear cart and add new item
        return [{ ...newItem, quantity: 1 }]
      }

      // Check if item already exists
      const existingItem = currentItems.find(item => item.id === newItem.id)
      
      if (existingItem) {
        // Update quantity
        return currentItems.map(item =>
          item.id === newItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      } else {
        // Add new item
        return [...currentItems, { ...newItem, quantity: 1 }]
      }
    })

    toast({
      title: "Adicionado ao carrinho",
      description: `${newItem.name} foi adicionado`
    })
  }

  const removeItem = (itemId: string) => {
    setItems(currentItems => {
      const item = currentItems.find(item => item.id === itemId)
      if (item && item.quantity > 1) {
        // Decrease quantity
        return currentItems.map(item =>
          item.id === itemId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
      } else {
        // Remove item completely
        return currentItems.filter(item => item.id !== itemId)
      }
    })
  }

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(currentItems => currentItems.filter(item => item.id !== itemId))
    } else {
      setItems(currentItems =>
        currentItems.map(item =>
          item.id === itemId ? { ...item, quantity } : item
        )
      )
    }
  }

  const clearCart = () => {
    setItems([])
    toast({
      title: "Carrinho limpo",
      description: "Todos os items foram removidos"
    })
  }

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0)
  }

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const getRestaurantId = () => {
    return items.length > 0 ? items[0].restaurant_id : null
  }

  return (
    <CartContext.Provider value={{
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      getTotalItems,
      getTotalPrice,
      getRestaurantId
    }}>
      {children}
    </CartContext.Provider>
  )
} 