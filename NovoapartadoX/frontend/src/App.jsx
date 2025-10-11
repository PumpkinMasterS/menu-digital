import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Header from './components/layout/Header';
import CityPage from './pages/CityPage';
import LoginPage from './pages/LoginPage';
import ReservadaPage from './pages/ReservadaPage';
import FavoritesPage from './pages/FavoritesPage';
import CreateListingPage from './pages/CreateListingPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminPriority from './pages/AdminPriority';
import AdminModels from './pages/AdminModels';
import AdminModelDashboard from './pages/AdminModelDashboard';
import AdminCreateModel from './pages/AdminCreateModel';
import ListingDetailPage from './pages/ListingDetailPage';
import ManagePhotosPage from './pages/ManagePhotosPage';
import RequireAuth from './components/auth/RequireAuth';
import RequireAdmin from './components/auth/RequireAdmin';
import EditProfilePage from './pages/EditProfilePage';
import SettingsPage from './pages/SettingsPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

import './App.css';
import './improvements.css';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <MainLayout />
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

function MainLayout() {
  const location = useLocation();
  const { user, token } = useAuth(); // Agora pode usar o useAuth aqui

  return (
    <div className="App">
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<CityPage defaultCity="Lisboa" />} />
          <Route path="/lisboa" element={<CityPage defaultCity="Lisboa" />} />
          <Route path="/porto" element={<CityPage defaultCity="Porto" />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reservada" element={
            <RequireAuth>
              <ReservadaPage />
            </RequireAuth>
          } />
          <Route path="/favoritos" element={
            <RequireAuth>
              <FavoritesPage />
            </RequireAuth>
          } />
          <Route path="/criar" element={
            <RequireAuth>
              <RequireAdmin>
                <CreateListingPage />
              </RequireAdmin>
            </RequireAuth>
          } />
          <Route path="/admin" element={
            <RequireAuth>
              <RequireAdmin>
                <AdminDashboard />
              </RequireAdmin>
            </RequireAuth>
          } />
          <Route path="/admin/priority" element={
            <RequireAuth>
              <RequireAdmin>
                <AdminPriority />
              </RequireAdmin>
            </RequireAuth>
          } />
          <Route path="/admin/models" element={
            <RequireAuth>
              <RequireAdmin>
                <AdminModels />
              </RequireAdmin>
            </RequireAuth>
          } />
          <Route path="/admin/models/new" element={
            <RequireAuth>
              <RequireAdmin>
                <AdminCreateModel />
              </RequireAdmin>
            </RequireAuth>
          } />
          <Route path="/admin/models/:id" element={
            <RequireAuth>
              <RequireAdmin>
                <AdminModelDashboard />
              </RequireAdmin>
            </RequireAuth>
          } />
          <Route path="/gerir-fotos" element={
            <RequireAuth>
              <RequireAdmin>
                <ManagePhotosPage />
              </RequireAdmin>
            </RequireAuth>
          } />
          <Route path="/editar-perfil" element={
            <RequireAuth>
              <EditProfilePage />
            </RequireAuth>
          } />
          <Route path="/configuracoes" element={
            <RequireAuth>
              <RequireAdmin>
                <SettingsPage />
              </RequireAdmin>
            </RequireAuth>
          } />
          <Route path="/reset-password/:userId" element={
            <RequireAuth>
              <RequireAdmin>
                <ResetPasswordPage />
              </RequireAdmin>
            </RequireAuth>
          } />
          <Route path="/listing/:id" element={<ListingDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
export { useAuth };
