import React, { useEffect, useState } from 'react'
import { Route, Routes, Navigate, Link, useNavigate } from 'react-router-dom'
import Products from './pages/Products'
import ProductBuilder from './pages/ProductBuilder'
import ModifierBuilder from './pages/ModifierBuilder'
import Categories from './pages/Categories'
import Tables from './pages/Tables'
import Orders from './pages/Orders'
import Modifiers from './pages/Modifiers'
import Login from './pages/Login'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    setIsAuthenticated(!!token)
  }, [])

  if (isAuthenticated === null) {
    return <div>Carregando...</div>
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

function Header() {
  const navigate = useNavigate()
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
  const handleLogout = () => {
    localStorage.removeItem('authToken')
    navigate('/login')
  }
  if (!token) return null
  return (
    <nav style={{ 
      display: 'flex', 
      gap: 12, 
      marginBottom: 0, 
      padding: '16px 24px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <Link to="/orders" style={{ color: '#fff', textDecoration: 'none', fontWeight: 500 }}>📋 Pedidos</Link>
      <Link to="/builder" style={{ color: '#fff', textDecoration: 'none', fontWeight: 500 }}>🍔 Menu Builder</Link>
      <Link to="/modifier-builder" style={{ color: '#fff', textDecoration: 'none', fontWeight: 500 }}>🎨 Modificadores Pro</Link>
      <Link to="/categories" style={{ color: '#fff', textDecoration: 'none', fontWeight: 500 }}>🏷️ Categorias</Link>
      <Link to="/tables" style={{ color: '#fff', textDecoration: 'none', fontWeight: 500 }}>🪑 Mesas</Link>
      <button onClick={handleLogout} style={{ 
        marginLeft: 'auto', 
        background: 'rgba(255,255,255,0.2)',
        border: 'none',
        color: '#fff',
        padding: '8px 16px',
        borderRadius: 8,
        cursor: 'pointer',
        fontWeight: 500
      }}>Sair</button>
    </nav>
  )
}

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Header />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/builder" />} />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/builder"
          element={
            <ProtectedRoute>
              <ProductBuilder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <Products />
            </ProtectedRoute>
          }
        />
        <Route
          path="/categories"
          element={
            <ProtectedRoute>
              <Categories />
            </ProtectedRoute>
          }
        />
        <Route
          path="/modifier-builder"
          element={
            <ProtectedRoute>
              <ModifierBuilder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/modifiers"
          element={
            <ProtectedRoute>
              <Modifiers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tables"
          element={
            <ProtectedRoute>
              <Tables />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  )
}