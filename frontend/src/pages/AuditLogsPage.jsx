// AuditLogsPage.jsx
import { useEffect, useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { Pagination, PageHeader, SearchInput, EmptyState, LoadingSpinner } from '../components/index.jsx'
import { Activity } from 'lucide-react'
import useDebounce from '../hooks/useDebounce'

export function AuditLogsPage() {
  const [data, setData] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ module: '', userType: '' })

  const debouncedModule = useDebounce(filters.module, 500)

  const fetch = async (page = 1) => {
    setLoading(true)
    try {
      const r = await api.get('/audit', { params: { page, limit: 50, ...filters, module: debouncedModule } })
      setData(r.data.data); setPagination(r.data.pagination)
    } catch { toast.error('Failed to load audit logs. Please refresh.') } finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [debouncedModule, filters.userType])

  const typeColors = { SuperAdmin: 'bg-purple-100 text-purple-700', Admin: 'bg-blue-100 text-blue-700', Salesperson: 'bg-green-100 text-green-700' }

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="Complete system activity trail" />
      <div className="card">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-4">
          <select value={filters.userType} onChange={e => setFilters(f => ({ ...f, userType: e.target.value }))} className="input w-full sm:w-40">
            <option value="">All Users</option>
            <option value="SuperAdmin">Super Admin</option>
            <option value="Admin">Admin</option>
            <option value="Salesperson">Salesperson</option>
          </select>
          <input value={filters.module} onChange={e => setFilters(f => ({ ...f, module: e.target.value }))} placeholder="Filter by module" className="input w-full sm:w-40" />
        </div>
        {loading ? <LoadingSpinner />
        : data.length === 0 ? <EmptyState icon={Activity} title="No audit logs found" description="Try adjusting your filters." />
        : (
          <div className="table-container">
            <table className="table responsive-table">
              <thead><tr><th>Time</th><th>User</th><th>Role</th><th>Action</th><th>Module</th><th>Record ID</th><th>IP</th></tr></thead>
              <tbody>
                {data.map(log => (
                  <tr key={log.id}>
                    <td data-label="Time" className="text-xs text-gray-500 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                    <td data-label="User" className="text-sm">{log.userId?.slice(0, 8) || '-'}</td>
                    <td data-label="Role"><span className={`badge text-xs ${typeColors[log.userType] || 'bg-gray-100 text-gray-600'}`}>{log.userType || '-'}</span></td>
                    <td data-label="Action" className="font-medium text-sm">{log.action}</td>
                    <td data-label="Module" className="text-gray-600 text-sm">{log.module}</td>
                    <td data-label="Record ID" className="font-mono text-xs text-gray-400">{log.recordId?.slice(0, 8) || '-'}</td>
                    <td data-label="IP" className="text-xs text-gray-400">{log.ipAddress || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={fetch} />
      </div>
    </div>
  )
}

export default AuditLogsPage
