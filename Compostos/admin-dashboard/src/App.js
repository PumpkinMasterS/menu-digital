import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import UserDetail from './pages/UserDetail';
import Commissions from './pages/Commissions';
import AuditLogs from './pages/AuditLogs';
import LeadershipBonuses from './pages/LeadershipBonuses';

import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import './App.css';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="users/:id" element={<UserDetail />} />
          <Route path="commissions" element={<Commissions />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="leadership-bonuses" element={<LeadershipBonuses />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;