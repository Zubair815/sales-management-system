import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { SocketProvider } from './contexts/SocketContext'

import LoginPage from './pages/LoginPage'
import SuperAdminDashboard from './pages/SuperAdminDashboard'
import AdminDashboard from './pages/AdminDashboard'
import SalespersonDashboard from './pages/SalespersonDashboard'

import AdminsPage from './pages/AdminsPage'
import PermissionsPage from './pages/PermissionsPage'
import SalespersonsPage from './pages/SalespersonsPage'
import PartiesPage from './pages/PartiesPage'
import InventoryPage from './pages/InventoryPage'
import OrdersPage from './pages/OrdersPage'
import ExpensesPage from './pages/ExpensesPage'
import PaymentsPage from './pages/PaymentsPage'
import AnnouncementsPage from './pages/AnnouncementsPage'
import ReportsPage from './pages/ReportsPage'
import AuditLogsPage from './pages/AuditLogsPage'
import SystemConfigPage from './pages/SystemConfigPage'
import PrintTemplatePage from './pages/PrintTemplatePage'

import MainLayout from './layouts/MainLayout'
import LoadingSpinner from './components/LoadingSpinner'

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return children
}

const DashboardRedirect = () => {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'SuperAdmin') return <Navigate to="/super-admin" replace />
  if (user.role === 'Admin') return <Navigate to="/admin" replace />
  return <Navigate to="/salesperson" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardRedirect />} />

      <Route path="/super-admin" element={<ProtectedRoute roles={['SuperAdmin']}><MainLayout><SuperAdminDashboard /></MainLayout></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute roles={['Admin']}><MainLayout><AdminDashboard /></MainLayout></ProtectedRoute>} />
      <Route path="/salesperson" element={<ProtectedRoute roles={['Salesperson']}><MainLayout><SalespersonDashboard /></MainLayout></ProtectedRoute>} />

      <Route path="/admins" element={<ProtectedRoute roles={['SuperAdmin']}><MainLayout><AdminsPage /></MainLayout></ProtectedRoute>} />
      <Route path="/admins/:id/permissions" element={<ProtectedRoute roles={['SuperAdmin']}><MainLayout><PermissionsPage /></MainLayout></ProtectedRoute>} />
      <Route path="/salespersons" element={<ProtectedRoute roles={['SuperAdmin','Admin']}><MainLayout><SalespersonsPage /></MainLayout></ProtectedRoute>} />
      <Route path="/parties" element={<ProtectedRoute roles={['SuperAdmin','Admin']}><MainLayout><PartiesPage /></MainLayout></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute roles={['SuperAdmin','Admin']}><MainLayout><InventoryPage /></MainLayout></ProtectedRoute>} />

      <Route path="/orders" element={<ProtectedRoute><MainLayout><OrdersPage /></MainLayout></ProtectedRoute>} />
      <Route path="/expenses" element={<ProtectedRoute><MainLayout><ExpensesPage /></MainLayout></ProtectedRoute>} />
      <Route path="/payments" element={<ProtectedRoute><MainLayout><PaymentsPage /></MainLayout></ProtectedRoute>} />
      <Route path="/announcements" element={<ProtectedRoute><MainLayout><AnnouncementsPage /></MainLayout></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute roles={['SuperAdmin','Admin']}><MainLayout><ReportsPage /></MainLayout></ProtectedRoute>} />
      <Route path="/audit-logs" element={<ProtectedRoute roles={['SuperAdmin']}><MainLayout><AuditLogsPage /></MainLayout></ProtectedRoute>} />
      <Route path="/system-config" element={<ProtectedRoute roles={['SuperAdmin']}><MainLayout><SystemConfigPage /></MainLayout></ProtectedRoute>} />
      <Route path="/print-templates" element={<ProtectedRoute roles={['SuperAdmin','Admin']}><MainLayout><PrintTemplatePage /></MainLayout></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

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
