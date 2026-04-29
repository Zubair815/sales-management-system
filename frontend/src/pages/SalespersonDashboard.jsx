import { useEffect, useState, useCallback } from 'react' // FIX: L-10 — added useCallback
import api from '../services/api'
import toast from 'react-hot-toast' // FIX: C-1 — import toast for error feedback
import { StatCard, StatusBadge, LoadingSpinner, PageHeader } from '../components/index.jsx' // FIX: M-7 — import PageHeader
import { ShoppingCart, Receipt, CreditCard, Bell } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

// FIX: L-10 — extracted data fetching into a dedicated custom hook
function useDashboardData() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await api.get('/dashboard/salesperson')
      setData(r.data.data)
    } catch (e) {
      setError(e)
      toast.error('Failed to load dashboard data. Please refresh.') // FIX: C-1 — surface error to user
      console.error(e) // FIX: C-1 — log for debugging
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refetch() }, [refetch])

  return { data, loading, error, refetch }
}

export default function SalespersonDashboard() {
  const { user } = useAuth()
  const { data, loading } = useDashboardData() // FIX: L-10 — single hook call replaces useState+useEffect+fetch

  if (loading) return <LoadingSpinner />

  const fmt = n => `Rs ${Number(n || 0).toLocaleString()}`

  return (
    <div className="space-y-6">
      {/* FIX: M-7 — replaced hardcoded gradient header with shared PageHeader */}
      <PageHeader
        title="My Dashboard"
        subtitle={`Welcome back, ${user?.name ?? ''}${user?.region ? ` · Region: ${user.region}` : ''}${user?.jobRole ? ` · ${user.jobRole}` : ''}`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingCart} label="Orders This Month" value={data?.ordersMTD?.count ?? 0} sub={fmt(data?.ordersMTD?.revenue)} color="blue" />
        <StatCard icon={Receipt} label="Expenses This Month" value={data?.expensesMTD?.count ?? 0} sub={fmt(data?.expensesMTD?.amount)} color="yellow" />
        <StatCard icon={CreditCard} label="Collections MTD" value={fmt(data?.collectionsMTD)} color="green" />
        <StatCard icon={Bell} label="Unread Announcements" value={data?.unreadAnnouncements ?? 0} color="purple" />
      </div>

      {(data?.pendingExpenses > 0 || data?.pendingPayments > 0) && (
        <div className="card border-yellow-200 bg-yellow-50">
          <h3 className="font-semibold text-yellow-800 mb-2">Pending Status</h3>
          <div className="flex gap-3">
            {data.pendingExpenses > 0 && <span className="badge bg-orange-100 text-orange-800">{data.pendingExpenses} expenses awaiting approval</span>}
            {data.pendingPayments > 0 && <span className="badge bg-yellow-100 text-yellow-800">{data.pendingPayments} payments awaiting verification</span>}
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="section-title">Recent Orders</h3>
        {data?.recentOrders?.length > 0 ? (
          <div className="space-y-3">
            {data.recentOrders.map(order => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{order.orderNumber}</p>
                  <p className="text-xs text-gray-500">{order.party?.name} · {new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800">Rs {Number(order.grandTotal).toLocaleString()}</p>
                  <StatusBadge status={order.status} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">No orders yet</p>
        )}
      </div>
    </div>
  )
}
