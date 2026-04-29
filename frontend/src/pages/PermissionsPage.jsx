import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import { PageHeader, LoadingSpinner } from '../components/index.jsx'
import { Save, ArrowLeft, CheckCircle, XCircle } from 'lucide-react'

const MODULES = [
  { key: 'SalespersonManagement', label: 'Salesperson Management' },
  { key: 'PartyManagement', label: 'Party Management' },
  { key: 'ExpenseTypeManagement', label: 'Expense Type Management' },
  { key: 'InventoryManagement', label: 'Inventory Management' },
  { key: 'OrderManagement', label: 'Order Management' },
  { key: 'ExpenseManagement', label: 'Expense Management' },
  { key: 'PaymentManagement', label: 'Payment Management' },
  { key: 'Reports', label: 'Reports' },
  { key: 'Announcements', label: 'Announcements' },
  { key: 'Dashboard', label: 'Dashboard' },
  { key: 'PrintTemplates', label: 'Print Templates' },
]

const LEVELS = ['NoAccess', 'ViewOnly', 'ViewEdit', 'FullAccess']
const LEVEL_COLORS = {
  NoAccess: 'bg-gray-100 text-gray-600',
  ViewOnly: 'bg-blue-100 text-blue-700',
  ViewEdit: 'bg-yellow-100 text-yellow-700',
  FullAccess: 'bg-green-100 text-green-700',
}

export default function PermissionsPage() {
  const { id } = useParams()
  const [admin, setAdmin] = useState(null)
  const [permissions, setPermissions] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get(`/super-admin/admins/${id}`),
      api.get(`/super-admin/admins/${id}/permissions`),
    ]).then(([adminRes, permRes]) => {
      setAdmin(adminRes.data.data)
      setPermissions(permRes.data.data.permissions)
    }).catch(() => toast.error('Failed to load permissions.')).finally(() => setLoading(false))
  }, [id])

  const setAll = (level) => {
    const newPerms = {}
    MODULES.forEach(m => newPerms[m.key] = level)
    setPermissions(newPerms)
  }

  const save = async () => {
    setSaving(true)
    try {
      await api.put(`/super-admin/admins/${id}/permissions`, { permissions })
      toast.success('Permissions saved!')
    } catch { toast.error('Failed to save permissions.') }
    finally { setSaving(false) }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader
        title={`Permissions: ${admin?.name}`}
        subtitle={admin?.email}
        actions={
          <div className="flex gap-2">
            <Link to="/admins" className="btn-secondary"><ArrowLeft size={16} />Back</Link>
            <button onClick={save} disabled={saving} className="btn-primary">
              <Save size={16} />{saving ? 'Saving...' : 'Save Permissions'}
            </button>
          </div>
        }
      />

      <div className="card">
        {/* Quick set buttons */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <span className="text-sm text-gray-500 font-medium">Quick set all:</span>
          {LEVELS.map(level => (
            <button key={level} onClick={() => setAll(level)} className={`btn btn-sm ${LEVEL_COLORS[level]} border-0`}>{level}</button>
          ))}
        </div>

        {/* Permission matrix */}
        <div className="space-y-3">
          {MODULES.map(mod => {
            const current = permissions[mod.key] || 'NoAccess'
            return (
              <div key={mod.key} className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm">{mod.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Current: <span className={`px-1.5 py-0.5 rounded text-xs ${LEVEL_COLORS[current]}`}>{current}</span></p>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {LEVELS.map(level => (
                    <button key={level} onClick={() => setPermissions(p => ({ ...p, [mod.key]: level }))}
                      className={`px-2 md:px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                        current === level
                          ? `${LEVEL_COLORS[level]} border-transparent ring-2 ring-offset-1 ${level === 'NoAccess' ? 'ring-gray-400' : level === 'ViewOnly' ? 'ring-blue-400' : level === 'ViewEdit' ? 'ring-yellow-400' : 'ring-green-400'}`
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      {level === 'NoAccess' ? <XCircle size={12} className="inline mr-1" /> : <CheckCircle size={12} className="inline mr-1" />}
                      <span className="hidden sm:inline">{level.replace('Access', '').replace('View', 'View ')}</span>
                      <span className="sm:hidden">{level === 'NoAccess' ? 'No' : level === 'ViewOnly' ? 'View' : level === 'ViewEdit' ? 'Edit' : 'Full'}</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
