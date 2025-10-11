import { Routes, Route, Navigate } from 'react-router-dom'
import KitchenDashboard from './KitchenDashboard'
import ProtectedRoute from './ProtectedRoute'
import Login from './Login'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}> 
        <Route path="/kitchen" element={<KitchenDashboard />} />
        <Route path="/" element={<Navigate to="/kitchen" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/kitchen" replace />} />
    </Routes>
  )
}