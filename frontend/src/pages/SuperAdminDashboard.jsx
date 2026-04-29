import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import { StatCard, LoadingSpinner } from '../components/index.jsx'
import { Users, UserCheck, ShoppingCart, TrendingUp, Activity, Settings, Shield, ChevronRight } from 'lucide-react'

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/super-admin/stats'),
      api.get('/dashboard/super-admin'),
    ]).then(([statsRes, dashRes]) => {
      setStats({ ...statsRes.data.data, ...dashRes.data.data })
    }).catch(() => toast.error('Failed to load dashboard data. Please refresh.')).finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />

  const quickLinks = [
    { to: '/admins', label: 'Manage Admins', icon: Users, color: 'blue', desc: 'Create and manage admin accounts' },
    { to: '/salespersons', label: 'Salespersons', icon: UserCheck, color: 'green', desc: 'View all salesperson accounts' },
    { to: '/system-config', label: 'System Config', icon: Settings, color: 'purple', desc: 'Configure system parameters' },
    { to: '/audit-logs', label: 'Audit Logs', icon: Activity, color: 'yellow', desc: 'Track all system activities' },
  ]

  const recentLogs = stats?.recentAuditLogs || []

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Shield size={24} />
          <span className="text-purple-200 text-sm font-medium">Developer Access</span>
        </div>
        <h2 className="text-2xl font-bold">Super Admin Dashboard</h2>
        <p className="text-purple-200 mt-1 text-sm">Full system control and oversight</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Active Admins" value={stats?.activeAdmins ?? '-'} color="blue" />
        <StatCard icon={UserCheck} label="Active Salespersons" value={stats?.activeSalespersons ?? '-'} color="green" />
        <StatCard icon={ShoppingCart} label="Total Orders" value={stats?.totalOrders ?? '-'} color="yellow" />
        <StatCard icon={TrendingUp} label="Total Revenue" value={stats?.totalRevenue ? `₹${Number(stats.totalRevenue).toLocaleString()}` : '-'} color="purple" />
      </div>

      {/* Quick links */}
      <div>
        <h2 className="section-title">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map(({ to, label, icon: Icon, color, desc }) => (
            <Link key={to} to={to} className="card hover:shadow-md transition-all group">
              <div className={`w-10 h-10 rounded-xl bg-${color}-50 text-${color}-600 flex items-center justify-center mb-3`}>
                <Icon size={20} />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-sm">{label}</h3>
                <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-600" />
              </div>
              <p className="text-xs text-gray-500 mt-1">{desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Audit Logs */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title mb-0">Recent Activity</h2>
          <Link to="/audit-logs" className="text-sm text-blue-600 hover:underline">View all</Link>
        </div>
        {recentLogs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No activity yet</p>
        ) : (
          <div className="space-y-2">
            {recentLogs.map(log => (
              <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-gray-50 last:border-0 gap-1">
                <div className="min-w-0">
                  <span className="text-sm font-medium text-gray-800">{log.action}</span>
                  <span className="text-sm text-gray-500 ml-2">on {log.module}</span>
                </div>
                <div className="sm:text-right flex items-center sm:flex-col gap-2 sm:gap-0 flex-shrink-0">
                  <span className={`badge text-xs ${log.userType === 'SuperAdmin' ? 'badge-purple' : log.userType === 'Admin' ? 'badge-blue' : 'badge-green'}`}>{log.userType}</span>
                  <p className="text-xs text-gray-400 sm:mt-1">{new Date(log.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
