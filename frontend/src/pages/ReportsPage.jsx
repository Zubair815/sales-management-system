import { useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { PageHeader, StatCard } from '../components/index.jsx'
import { BarChart3, Download, TrendingUp, Package, CreditCard, Receipt, Users } from 'lucide-react'
import { Bar, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title)

const REPORT_TYPES = [
  { id: 'order-payment', label: 'Order vs Payment', icon: TrendingUp, color: 'blue' },
  { id: 'expense-budget', label: 'Expense Report', icon: Receipt, color: 'yellow' },
  { id: 'payment-collection', label: 'Payment Collection', icon: CreditCard, color: 'green' },
  { id: 'salesperson-performance', label: 'Salesperson Performance', icon: Users, color: 'purple' },
  { id: 'inventory-valuation', label: 'Inventory Valuation', icon: Package, color: 'red' },
]

const fmt = n => `₹${Number(n || 0).toLocaleString()}`

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState('order-payment')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({ startDate: '', endDate: '', salespersonId: '', partyId: '', status: '' })

  const loadReport = async () => {
    setLoading(true)
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
      const r = await api.get(`/reports/${activeReport}`, { params })
      setData(r.data.data)
    } catch (e) { toast.error('Failed to generate report') }
    finally { setLoading(false) }
  }

  const exportReport = async (format) => {
    try {
      const params = { ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), format }
      const r = await api.get(`/reports/${activeReport}/export`, { params, responseType: format === 'csv' ? 'blob' : 'blob' })
      const ext = format === 'csv' ? 'csv' : 'xlsx'
      const url = window.URL.createObjectURL(new Blob([r.data]))
      const a = document.createElement('a'); a.href = url; a.download = `${activeReport}-report.${ext}`; a.click()
    } catch { toast.error('Export failed') }
  }

  return (
    <div>
      <PageHeader title="Reports" subtitle="Generate and export business reports" />

      <div className="flex flex-wrap gap-2 mb-6">
        {REPORT_TYPES.map(rt => (
          <button key={rt.id} onClick={() => { setActiveReport(rt.id); setData(null) }}
            className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all border ${
              activeReport === rt.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}>
            <rt.icon size={15} /><span className="hidden sm:inline">{rt.label}</span><span className="sm:hidden">{rt.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <h3 className="font-semibold text-gray-700 mb-4 text-sm">Filters</h3>
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <div className="w-full sm:w-auto">
            <label className="label text-xs">Start Date</label>
            <input type="date" value={filters.startDate} onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))} className="input text-sm" />
          </div>
          <div className="w-full sm:w-auto">
            <label className="label text-xs">End Date</label>
            <input type="date" value={filters.endDate} onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))} className="input text-sm" />
          </div>
          <div className="flex items-end gap-2 flex-wrap w-full sm:w-auto">
            <button onClick={loadReport} disabled={loading} className="btn-primary w-full sm:w-auto">
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
            {data && (
              <>
                <button onClick={() => exportReport('excel')} className="btn-secondary btn-sm"><Download size={14} />Excel</button>
                <button onClick={() => exportReport('csv')} className="btn-secondary btn-sm"><Download size={14} />CSV</button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Report content */}
      {!data && !loading && (
        <div className="card text-center py-16">
          <BarChart3 size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Select filters and click Generate Report</p>
        </div>
      )}

      {loading && <div className="flex justify-center py-16"><div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full" /></div>}

      {data && activeReport === 'order-payment' && <OrderPaymentReport data={data} />}
      {data && activeReport === 'expense-budget' && <ExpenseReport data={data} />}
      {data && activeReport === 'payment-collection' && <PaymentCollectionReport data={data} />}
      {data && activeReport === 'salesperson-performance' && <SalespersonReport data={data} />}
      {data && activeReport === 'inventory-valuation' && <InventoryReport data={data} />}
    </div>
  )
}

function OrderPaymentReport({ data }) {
  const { report = [], summary = {} } = data
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="Total Orders" value={summary.totalOrders} color="blue" />
        <StatCard icon={TrendingUp} label="Total Amount" value={fmt(summary.totalAmount)} color="green" />
        <StatCard icon={CreditCard} label="Total Payments" value={fmt(summary.totalPayments)} color="purple" />
        <StatCard icon={TrendingUp} label="Outstanding" value={fmt(summary.outstandingAmount)} color="red" />
      </div>
      <div className="card">
        <div className="table-container"><table className="table responsive-table"><thead><tr><th>Order #</th><th>Date</th><th>Party</th><th>Salesperson</th><th>Order Amount</th><th>Paid</th><th>Balance</th></tr></thead>
            <tbody>
              {report.map(r => (
                <tr key={r.orderId} className={r.isOverdue ? 'bg-red-50' : ''}>
                  <td data-label="Order #" className="font-mono text-xs text-blue-700">{r.orderNumber}</td>
                  <td data-label="Date" className="text-xs">{new Date(r.date).toLocaleDateString()}</td>
                  <td data-label="Party">{r.party}</td>
                  <td data-label="Salesperson" className="text-gray-600">{r.salesperson}</td>
                  <td data-label="Order Amount" className="font-semibold">{fmt(r.orderAmount)}</td>
                  <td data-label="Paid" className="text-green-700">{fmt(r.paymentReceived)}</td>
                  <td data-label="Balance" className={r.balanceDue > 0 ? 'font-semibold text-red-600' : 'text-green-600'}>{fmt(r.balanceDue)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
      </div>
    </div>
  )
}

function ExpenseReport({ data }) {
  const { expenses = [], summary = {} } = data
  const typeLabels = Object.keys(summary.byType || {})
  const chartData = { labels: typeLabels, datasets: [{ data: typeLabels.map(t => summary.byType[t].total), backgroundColor: ['#3b82f6','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4'] }] }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Receipt} label="Total" value={fmt(summary.totalExpenses)} color="yellow" />
        <StatCard icon={Receipt} label="Approved" value={fmt(summary.approved)} color="green" />
        <StatCard icon={Receipt} label="Rejected" value={fmt(summary.rejected)} color="red" />
        <StatCard icon={Receipt} label="Pending" value={fmt(summary.pending)} color="blue" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {typeLabels.length > 0 && <div className="card"><h3 className="section-title">By Type</h3><Doughnut data={chartData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} /></div>}
        <div className="card lg:col-span-2">
          <div className="table-container"><table className="table responsive-table"><thead><tr><th>Salesperson</th><th>Date</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>{expenses.map(e => (<tr key={e.id}>
              <td data-label="Salesperson">{e.salesperson?.name}</td>
              <td data-label="Date" className="text-xs">{new Date(e.expenseDate).toLocaleDateString()}</td>
              <td data-label="Type">{e.expenseType?.name}</td>
              <td data-label="Amount">{fmt(e.amount)}</td>
              <td data-label="Status"><span className={`badge ${e.status === 'Approved' ? 'badge-green' : e.status === 'Rejected' ? 'badge-red' : 'badge-yellow'}`}>{e.status}</span></td>
            </tr>))}</tbody>
          </table></div>
        </div>
      </div>
    </div>
  )
}

function PaymentCollectionReport({ data }) {
  const { payments = [], summary = {} } = data
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CreditCard} label="Total Collected" value={fmt(summary.totalCollected)} color="green" />
        <StatCard icon={CreditCard} label="Pending" value={fmt(summary.pendingVerification)} color="yellow" />
        <StatCard icon={CreditCard} label="Rejected" value={fmt(summary.rejected)} color="red" />
        <StatCard icon={CreditCard} label="Total Records" value={summary.totalPayments} color="blue" />
      </div>
      <div className="card">
        <div className="table-container"><table className="table responsive-table"><thead><tr><th>Receipt #</th><th>Date</th><th>Party</th><th>Salesperson</th><th>Amount</th><th>Mode</th><th>Status</th></tr></thead>
          <tbody>{payments.map(p => (<tr key={p.id}>
            <td data-label="Receipt #" className="font-mono text-xs">{p.receiptNumber}</td>
            <td data-label="Date" className="text-xs">{new Date(p.paymentDate).toLocaleDateString()}</td>
            <td data-label="Party">{p.party?.name}</td>
            <td data-label="Salesperson">{p.salesperson?.name}</td>
            <td data-label="Amount" className="font-semibold text-green-700">{fmt(p.amount)}</td>
            <td data-label="Mode"><span className="badge badge-blue">{p.paymentMode}</span></td>
            <td data-label="Status"><span className={`badge ${p.status === 'Verified' ? 'badge-green' : p.status === 'Rejected' ? 'badge-red' : 'badge-yellow'}`}>{p.status}</span></td>
          </tr>))}</tbody>
        </table></div>
      </div>
    </div>
  )
}

function SalespersonReport({ data }) {
  const { report = [] } = data
  return (
    <div className="space-y-4">
      <div className="card">
        <div className="table-container"><table className="table responsive-table"><thead><tr><th>Rank</th><th>Salesperson</th><th>Region</th><th>Orders</th><th>Revenue</th><th>Avg Order</th><th>Expenses</th><th>Collections</th><th>Target %</th></tr></thead>
          <tbody>{report.map((sp, i) => (<tr key={i}>
            <td data-label="Rank"><span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{i+1}</span></td>
            <td data-label="Salesperson"><div><p className="font-medium">{sp.salesperson}</p><p className="text-xs text-gray-400">{sp.employeeId}</p></div></td>
            <td data-label="Region" className="text-gray-500">{sp.region || '-'}</td>
            <td data-label="Orders">{sp.totalOrders}</td>
            <td data-label="Revenue" className="font-semibold text-green-700">{fmt(sp.totalRevenue)}</td>
            <td data-label="Avg Order">{fmt(sp.avgOrderValue)}</td>
            <td data-label="Expenses" className="text-orange-600">{fmt(sp.totalExpenses)}</td>
            <td data-label="Collections" className="text-blue-600">{fmt(sp.totalCollected)}</td>
            <td data-label="Target %">{sp.targetAchievement ? <span className={`badge ${parseFloat(sp.targetAchievement) >= 100 ? 'badge-green' : 'badge-yellow'}`}>{sp.targetAchievement}%</span> : '-'}</td>
          </tr>))}</tbody>
        </table></div>
      </div>
    </div>
  )
}

function InventoryReport({ data }) {
  const { report = [], summary = {} } = data
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package} label="Total Items" value={summary.totalItems} color="blue" />
        <StatCard icon={Package} label="Total Value" value={fmt(summary.totalValueAtSelling)} color="green" />
        <StatCard icon={Package} label="Low Stock Items" value={summary.lowStockItems} color="yellow" />
        <StatCard icon={Package} label="Out of Stock" value={summary.outOfStock} color="red" />
      </div>
      <div className="card">
        <div className="table-container"><table className="table responsive-table"><thead><tr><th>SKU</th><th>Name</th><th>Category</th><th>Stock</th><th>Selling Price</th><th>Total Value</th><th>Status</th></tr></thead>
          <tbody>{report.map(i => (<tr key={i.id} className={i.isLowStock ? 'bg-red-50' : ''}>
            <td data-label="SKU" className="font-mono text-xs text-blue-700">{i.sku}</td>
            <td data-label="Name" className="font-medium">{i.name}</td>
            <td data-label="Category" className="text-gray-500 text-xs">{i.category}</td>
            <td data-label="Stock"><span className={i.isLowStock ? 'text-red-600 font-bold' : ''}>{i.stockQuantity}</span></td>
            <td data-label="Selling Price">{fmt(i.sellingPrice)}</td>
            <td data-label="Total Value" className="font-semibold text-green-700">{fmt(i.totalValueAtSelling)}</td>
            <td data-label="Status"><span className={`badge ${i.status === 'Active' ? 'badge-green' : 'badge-gray'}`}>{i.status}</span></td>
          </tr>))}</tbody>
        </table></div>
      </div>
    </div>
  )
}
