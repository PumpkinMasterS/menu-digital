import { Route, Routes, Navigate } from 'react-router-dom'
import Catalog from './pages/Catalog'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import OrderStatus from './pages/OrderStatus'
import { CartProvider } from './cartContext'

export default function App() {
  return (
    <CartProvider>
      <Routes>
        <Route path="/" element={<Catalog />} />
        {/* Alias para compatibilidade com links /menu */}
        <Route path="/menu" element={<Catalog />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/order/:id" element={<OrderStatus />} />
        {/* Fallback para qualquer rota desconhecida */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </CartProvider>
  )
}