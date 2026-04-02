import { useEffect, useState } from 'react'
import api from '../services/api'
import { StatCard, LoadingSpinner } from '../components/index.jsx'
import { ShoppingCart, TrendingUp, Receipt, CreditCard, Clock, AlertTriangle } from 'lucide-react'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement } from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement)

const fmt = n => `₹${Number(n || 0).toLocaleString()}`

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/admin').then(r => setData(r.data.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />
  if (!data) return <div className="text-center text-gray-500 py-16">Failed to load dashboard</div>

  const orderTrend = data.orderTrend || []
  const orderTrendChart = {
    labels: orderTrend.map(d => new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })),
    datasets: [{
      label: 'Orders', data: orderTrend.map(d => Number(d.count)),
      backgroundColor: 'rgba(59,130,246,0.6)', borderColor: '#2563eb', borderWidth: 2,
    }],
  }

  const pendingData = data.pendingApprovals || {}
  const pendingChart = {
    labels: ['Pending Orders', 'Pending Expenses', 'Pending Payments'],
    datasets: [{
      data: [pendingData.orders || 0, pendingData.expenses || 0, pendingData.payments || 0],
      backgroundColor: ['#fbbf24','#f97316','#ef4444'],
    }],
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your sales operations</p>
      </div>

      {/* MTD stats */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Month to Date</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={ShoppingCart} label="Orders MTD" value={data.orders?.mtd ?? 0} sub={`YTD: ${data.orders?.ytd ?? 0}`} color="blue" />
          <StatCard icon={TrendingUp} label="Revenue MTD" value={fmt(data.revenue?.mtd)} sub={`YTD: ${fmt(data.revenue?.ytd)}`} color="green" />
          <StatCard icon={Receipt} label="Expenses MTD" value={fmt(data.expenses?.mtd)} sub={`YTD: ${fmt(data.expenses?.ytd)}`} color="red" />
          <StatCard icon={CreditCard} label="Collections MTD" value={fmt(data.collections?.mtd)} sub={`YTD: ${fmt(data.collections?.ytd)}`} color="purple" />
        </div>
      </div>

      {/* Profit margin */}
      <div className="card bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-green-700 font-medium">Profit Margin (MTD)</p>
            <p className="text-3xl font-bold text-green-800 mt-1">{fmt(data.profitMargin?.mtd)}</p>
            <p className="text-xs text-green-600 mt-1">Revenue - Approved Expenses</p>
          </div>
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <TrendingUp size={28} className="text-green-600" />
          </div>
        </div>
      </div>

      {/* Pending approvals */}
      {(pendingData.orders > 0 || pendingData.expenses > 0 || pendingData.payments > 0) && (
        <div className="card border-yellow-200 bg-yellow-50">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={18} className="text-yellow-600" />
            <h3 className="font-semibold text-yellow-800">Pending Approvals</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {pendingData.orders > 0 && <span className="badge bg-yellow-100 text-yellow-800">{pendingData.orders} Orders</span>}
            {pendingData.expenses > 0 && <span className="badge bg-orange-100 text-orange-800">{pendingData.expenses} Expenses</span>}
            {pendingData.payments > 0 && <span className="badge bg-red-100 text-red-800">{pendingData.payments} Payments</span>}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <h3 className="section-title">Order Trend (Last 7 Days)</h3>
          {orderTrend.length > 0 ? (
            <Bar data={orderTrendChart} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }} />
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">No data for last 7 days</div>
          )}
        </div>
        <div className="card">
          <h3 className="section-title">Pending Work</h3>
          {(pendingData.orders + pendingData.expenses + pendingData.payments) > 0 ? (
            <Doughnut data={pendingChart} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
          ) : (
            <div className="h-40 flex items-center justify-center text-green-500 text-sm font-medium">✓ All caught up!</div>
          )}
        </div>
      </div>

      {/* Low stock alerts */}
      {data.lowStockAlerts?.length > 0 && (
        <div className="card border-red-200">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-red-500" />
            <h3 className="font-semibold text-red-800">Low Stock Alerts</h3>
          </div>
          <div className="space-y-2">
            {data.lowStockAlerts.map(item => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b border-red-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                </div>
                <span className="badge badge-red">{item.stockQuantity} left</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top salespersons */}
      {data.topSalespersons?.length > 0 && (
        <div className="card">
          <h3 className="section-title">Top Salespersons (MTD)</h3>
          <div className="space-y-3">
            {data.topSalespersons.map((sp, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-700' : 'bg-orange-50 text-orange-700'}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{sp.name}</p>
                  <p className="text-xs text-gray-500">{sp.employeeId}</p>
                </div>
                <p className="text-sm font-semibold text-green-700">{fmt(sp.revenue)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
