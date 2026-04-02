// SystemConfigPage.jsx
import { useEffect, useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { PageHeader } from '../components/index.jsx'
import { Save, Settings } from 'lucide-react'

export function SystemConfigPage() {
  const [configs, setConfigs] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/super-admin/configs').then(r => setConfigs(r.data.data)).catch(() => toast.error('Failed')).finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    try { await api.put('/super-admin/configs', configs); toast.success('Config saved') }
    catch { toast.error('Failed') } finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>

  const CONFIG_LABELS = {
    stock_deduction_rule: { label: 'Stock Deduction Rule', type: 'select', options: ['Approval', 'Dispatch'] },
    expense_proof_mandatory: { label: 'Expense Proof Mandatory', type: 'select', options: ['true', 'false'] },
    payment_edit_window_hours: { label: 'Payment Edit Window (hours)', type: 'number' },
    low_stock_threshold_global: { label: 'Global Low Stock Threshold', type: 'number' },
  }

  return (
    <div>
      <PageHeader title="System Configuration" subtitle="Configure system-wide parameters"
        actions={<button onClick={save} disabled={saving} className="btn-primary"><Save size={16} />{saving ? 'Saving...' : 'Save Config'}</button>} />
      <div className="card max-w-2xl">
        <div className="space-y-4">
          {Object.entries(CONFIG_LABELS).map(([key, cfg]) => (
            <div key={key}>
              <label className="label">{cfg.label}</label>
              {cfg.type === 'select' ? (
                <select value={configs[key] || ''} onChange={e => setConfigs(c => ({ ...c, [key]: e.target.value }))} className="input">
                  {cfg.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input type={cfg.type || 'text'} value={configs[key] || ''} onChange={e => setConfigs(c => ({ ...c, [key]: e.target.value }))} className="input" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SystemConfigPage
