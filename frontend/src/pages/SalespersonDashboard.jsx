import { useEffect, useState } from 'react'
import api from '../services/api'
import { StatCard, StatusBadge, LoadingSpinner } from '../components/index.jsx'
import { ShoppingCart, Receipt, CreditCard, Bell } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function SalespersonDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/salesperson').then(r => setData(r.data.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />

  const fmt = n => `₹${Number(n || 0).toLocaleString()}`

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white">
        <p className="text-green-200 text-sm">Welcome back</p>
        <h2 className="text-2xl font-bold">{user?.name}</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-green-100">
          {user?.employeeId && <span>ID: {user.employeeId}</span>}
          {user?.region && <span>Region: {user.region}</span>}
          {user?.jobRole && <span>{user.jobRole}</span>}
        </div>
      </div>

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
                  <p className="text-sm font-semibold text-gray-800">₹{Number(order.grandTotal).toLocaleString()}</p>
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
