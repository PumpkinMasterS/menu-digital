import './App.css';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import KitchenDashboard from './pages/KitchenDashboard';
import Login from './pages/Login';
import { useEffect, useState } from 'react';
import ProductManagement from './pages/ProductManagement';
import TableManagement from './pages/TableManagement';
import CategoryManagement from './pages/CategoryManagement';
import MenuDigital from './pages/MenuDigital';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    setIsAuthenticated(!!token);
  }, []);

  if (isAuthenticated === null) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* Cozinha */}
        <Route path="/kitchen" element={<KitchenDashboard />} />
        {/* Menu público */}
        <Route path="/menu" element={<MenuDigital />} />
        <Route
          path="/admin/products"
          element={
            <ProtectedRoute>
              <ProductManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/tables"
          element={
            <ProtectedRoute>
              <TableManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <ProtectedRoute>
              <CategoryManagement />
            </ProtectedRoute>
          }
        />
        {/* Raiz redireciona para a cozinha para manter testes atuais */}
        <Route path="/" element={<Navigate to="/kitchen" />} />
      </Routes>
    </Router>
  );
}

export default App;
