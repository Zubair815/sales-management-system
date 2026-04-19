import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import {
  LayoutDashboard, Users, UserCheck, Building2, Package, ShoppingCart,
  Receipt, CreditCard, Megaphone, BarChart3, Settings, Shield,
  FileText, Menu, X, LogOut, Bell, ChevronRight, Activity, Wifi, WifiOff
} from 'lucide-react'

const navItems = {
  SuperAdmin: [
    { path: '/super-admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admins', label: 'Admin Users', icon: Users },
    { path: '/salespersons', label: 'Salespersons', icon: UserCheck },
    { path: '/parties', label: 'Parties', icon: Building2 },
    { path: '/inventory', label: 'Inventory', icon: Package },
    { path: '/orders', label: 'Orders', icon: ShoppingCart },
    { path: '/expenses', label: 'Expenses', icon: Receipt },
    { path: '/payments', label: 'Payments', icon: CreditCard },
    { path: '/announcements', label: 'Announcements', icon: Megaphone },
    { path: '/reports', label: 'Reports', icon: BarChart3 },
    { path: '/print-templates', label: 'Print Templates', icon: FileText },
    { path: '/audit-logs', label: 'Audit Logs', icon: Activity },
    { path: '/system-config', label: 'System Config', icon: Settings },
  ],
  Admin: [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, module: 'Dashboard' },
    { path: '/salespersons', label: 'Salespersons', icon: UserCheck, module: 'SalespersonManagement' },
    { path: '/parties', label: 'Parties', icon: Building2, module: 'PartyManagement' },
    { path: '/inventory', label: 'Inventory', icon: Package, module: 'InventoryManagement' },
    { path: '/orders', label: 'Orders', icon: ShoppingCart, module: 'OrderManagement' },
    { path: '/expenses', label: 'Expenses', icon: Receipt, module: 'ExpenseManagement' },
    { path: '/payments', label: 'Payments', icon: CreditCard, module: 'PaymentManagement' },
    { path: '/announcements', label: 'Announcements', icon: Megaphone, module: 'Announcements' },
    { path: '/reports', label: 'Reports', icon: BarChart3, module: 'Reports' },
    { path: '/print-templates', label: 'Print Templates', icon: FileText, module: 'PrintTemplates' },
  ],
  Salesperson: [
    { path: '/salesperson', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/orders', label: 'My Orders', icon: ShoppingCart },
    { path: '/expenses', label: 'My Expenses', icon: Receipt },
    { path: '/payments', label: 'My Payments', icon: CreditCard },
    { path: '/announcements', label: 'Announcements', icon: Megaphone },
  ],
}

const roleColors = {
  SuperAdmin: 'bg-purple-600',
  Admin: 'bg-blue-600',
  Salesperson: 'bg-green-600',
}

export default function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { user, logout, canAccess } = useAuth()
  const { connected } = useSocket()
  const location = useLocation()
  const navigate = useNavigate()

  const items = (navItems[user?.role] || []).filter(item =>
    !item.module || canAccess(item.module)
  )

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300 flex-shrink-0`}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg ${roleColors[user?.role]} flex items-center justify-center`}>
                <Shield size={16} className="text-white" />
              </div>
              <span className="font-bold text-gray-900 text-sm">SMS</span>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 ml-auto">
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {items.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path || (path !== '/super-admin' && path !== '/admin' && path !== '/salesperson' && location.pathname.startsWith(path))
            return (
              <Link key={path} to={path} className={`sidebar-link ${active ? 'active' : ''}`} title={!sidebarOpen ? label : ''}>
                <Icon size={18} className="flex-shrink-0" />
                {sidebarOpen && <span className="truncate">{label}</span>}
                {sidebarOpen && active && <ChevronRight size={14} className="ml-auto text-blue-500" />}
              </Link>
            )
          })}
        </nav>

        {/* User info */}
        <div className="border-t border-gray-100 p-3">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full ${roleColors[user?.role]} flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}>
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.role}</p>
              </div>
              <button onClick={handleLogout} className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg text-gray-400 transition-colors" title="Logout">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button onClick={handleLogout} className="w-full flex justify-center p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg text-gray-400 transition-colors" title="Logout">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
          <h1 className="text-lg font-semibold text-gray-800 capitalize">
            {location.pathname.split('/')[1]?.replace('-', ' ') || 'Dashboard'}
          </h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              {connected ? <Wifi size={14} className="text-green-500" /> : <WifiOff size={14} className="text-gray-400" />}
              <span>{connected ? 'Live' : 'Offline'}</span>
            </div>
            <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              user?.role === 'SuperAdmin' ? 'bg-purple-100 text-purple-700' :
              user?.role === 'Admin' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
            }`}>
              {user?.role === 'SuperAdmin' ? 'Developer ' : user?.role}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  )
}
