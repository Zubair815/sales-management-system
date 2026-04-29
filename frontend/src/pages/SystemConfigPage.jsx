// SystemConfigPage.jsx
import { useEffect, useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { PageHeader, ConfirmDialog, LoadingSpinner } from '../components/index.jsx'
import { Save, Settings } from 'lucide-react'

// Known config labels, types, and helper text for enhanced UI
const CONFIG_META = {
  stock_deduction_rule: { label: 'Stock Deduction Rule', type: 'select', options: ['Approval', 'Dispatch'], helper: 'Determines when stock is deducted: on order approval or dispatch.' },
  expense_proof_mandatory: { label: 'Expense Proof Mandatory', type: 'select', options: ['true', 'false'], helper: 'If true, salespersons must attach proof when submitting expenses.' },
  payment_edit_window_hours: { label: 'Payment Edit Window (hours)', type: 'number', helper: 'Number of hours a payment can be edited after creation. Must be 0–168.', min: 0, max: 168 },
  low_stock_threshold_global: { label: 'Global Low Stock Threshold', type: 'number', helper: 'Items with stock below this number trigger a low-stock alert. Must be 0–10000.', min: 0, max: 10000 },
}

function formatConfigLabel(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function SystemConfigPage() {
  const [configs, setConfigs] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})

  useEffect(() => {
    api.get('/super-admin/configs').then(r => setConfigs(r.data.data)).catch(() => toast.error('Failed to load system configuration.')).finally(() => setLoading(false))
  }, [])

  const validate = () => {
    const errors = {}
    Object.keys(configs).forEach(key => {
      const meta = CONFIG_META[key]
      if (meta?.type === 'number') {
        const val = Number(configs[key])
        if (isNaN(val)) errors[key] = 'Must be a valid number.'
        else if (meta.min !== undefined && val < meta.min) errors[key] = `Minimum value is ${meta.min}.`
        else if (meta.max !== undefined && val > meta.max) errors[key] = `Maximum value is ${meta.max}.`
      }
    })
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSaveClick = () => {
    if (!validate()) {
      toast.error('Please fix validation errors before saving.')
      return
    }
    setConfirmOpen(true)
  }

  const save = async () => {
    setConfirmOpen(false)
    setSaving(true)
    try { await api.put('/super-admin/configs', configs); toast.success('System configuration saved successfully.') }
    catch { toast.error('Failed to save configuration.') } finally { setSaving(false) }
  }

  if (loading) return <LoadingSpinner />

  // Merge known config keys with any dynamic keys from API
  const allKeys = [...new Set([...Object.keys(CONFIG_META), ...Object.keys(configs)])]

  return (
    <div>
      <PageHeader title="System Configuration" subtitle="Configure system-wide parameters"
        actions={<button onClick={handleSaveClick} disabled={saving} className="btn-primary"><Save size={16} />{saving ? 'Saving...' : 'Save Config'}</button>} />
      <div className="card max-w-2xl">
        <div className="space-y-5">
          {allKeys.map(key => {
            const meta = CONFIG_META[key]
            const label = meta?.label || formatConfigLabel(key)
            const type = meta?.type || 'text'
            const error = validationErrors[key]
            return (
              <div key={key}>
                <label className="label" htmlFor={`config-${key}`}>{label}</label>
                {type === 'select' && meta?.options ? (
                  <select id={`config-${key}`} value={configs[key] || ''} onChange={e => setConfigs(c => ({ ...c, [key]: e.target.value }))} className="input">
                    {meta.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input id={`config-${key}`} type={type} value={configs[key] || ''} onChange={e => { setConfigs(c => ({ ...c, [key]: e.target.value })); setValidationErrors(v => ({ ...v, [key]: undefined })) }}
                    className={`input ${error ? 'border-red-400 focus:ring-red-400' : ''}`}
                    min={meta?.min} max={meta?.max} />
                )}
                {meta?.helper && <p className="text-xs text-gray-400 mt-1">{meta.helper}</p>}
                {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
              </div>
            )
          })}
        </div>
      </div>

      <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={save}
        title="Save System Configuration" message="Are you sure you want to save these configuration changes? This will affect system-wide behavior." />
    </div>
  )
}

export default SystemConfigPage
