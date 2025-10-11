import { Route, Routes } from 'react-router-dom'
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
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/order/:id" element={<OrderStatus />} />
      </Routes>
    </CartProvider>
  )
}