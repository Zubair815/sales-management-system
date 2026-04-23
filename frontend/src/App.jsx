import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { SocketProvider } from './contexts/SocketContext'

import MainLayout from './layouts/MainLayout'
import LoadingSpinner from './components/LoadingSpinner'

// Lazy loaded pages for performance optimization
const LoginPage = lazy(() => import('./pages/LoginPage'))
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const SalespersonDashboard = lazy(() => import('./pages/SalespersonDashboard'))

const AdminsPage = lazy(() => import('./pages/AdminsPage'))
const PermissionsPage = lazy(() => import('./pages/PermissionsPage'))
const SalespersonsPage = lazy(() => import('./pages/SalespersonsPage'))
const PartiesPage = lazy(() => import('./pages/PartiesPage'))
const InventoryPage = lazy(() => import('./pages/InventoryPage'))
const OrdersPage = lazy(() => import('./pages/OrdersPage'))
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'))
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'))
const AnnouncementsPage = lazy(() => import('./pages/AnnouncementsPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'))
const SystemConfigPage = lazy(() => import('./pages/SystemConfigPage'))
const PrintTemplatePage = lazy(() => import('./pages/PrintTemplatePage'))

// ─── Auth Guard Components ──────────────────────────────────

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return children || <Outlet />
}

const DashboardRedirect = () => {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'SuperAdmin') return <Navigate to="/super-admin" replace />
  if (user.role === 'Admin') return <Navigate to="/admin" replace />
  return <Navigate to="/salesperson" replace />
}

// ─── Route Configuration ────────────────────────────────────

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardRedirect />} />

      {/* Protected layout routes — MainLayout wraps all children via <Outlet /> */}
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>

        {/* SuperAdmin only */}
        <Route path="/super-admin" element={<ProtectedRoute roles={['SuperAdmin']}><SuperAdminDashboard /></ProtectedRoute>} />
        <Route path="/admins" element={<ProtectedRoute roles={['SuperAdmin']}><AdminsPage /></ProtectedRoute>} />
        <Route path="/admins/:id/permissions" element={<ProtectedRoute roles={['SuperAdmin']}><PermissionsPage /></ProtectedRoute>} />
        <Route path="/audit-logs" element={<ProtectedRoute roles={['SuperAdmin']}><AuditLogsPage /></ProtectedRoute>} />
        <Route path="/system-config" element={<ProtectedRoute roles={['SuperAdmin']}><SystemConfigPage /></ProtectedRoute>} />

        {/* Admin only */}
        <Route path="/admin" element={<ProtectedRoute roles={['Admin']}><AdminDashboard /></ProtectedRoute>} />

        {/* Admin + SuperAdmin */}
        <Route path="/salespersons" element={<ProtectedRoute roles={['SuperAdmin', 'Admin']}><SalespersonsPage /></ProtectedRoute>} />
        <Route path="/parties" element={<ProtectedRoute roles={['SuperAdmin', 'Admin']}><PartiesPage /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute roles={['SuperAdmin', 'Admin']}><InventoryPage /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute roles={['SuperAdmin', 'Admin']}><ReportsPage /></ProtectedRoute>} />
        <Route path="/print-templates" element={<ProtectedRoute roles={['SuperAdmin', 'Admin']}><PrintTemplatePage /></ProtectedRoute>} />

        {/* Salesperson only */}
        <Route path="/salesperson" element={<ProtectedRoute roles={['Salesperson']}><SalespersonDashboard /></ProtectedRoute>} />

        {/* All authenticated roles */}
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}

// ─── App Root ───────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
          <Toaster position="top-right" toastOptions={{ duration: 4000, style: { borderRadius: '10px', background: '#1e293b', color: '#fff' } }} />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
