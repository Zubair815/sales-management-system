import { useEffect, useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { PageHeader, FormField } from '../components/index.jsx'
import { Save, Upload, Eye, FileText } from 'lucide-react'

const TEMPLATE_TYPES = [
  { id: 'order', label: 'Order Template' },
  { id: 'expense', label: 'Expense Template' },
  { id: 'payment', label: 'Payment Receipt' },
]

export default function PrintTemplatePage() {
  const [active, setActive] = useState('order')
  const [template, setTemplate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoFile, setLogoFile] = useState(null)
  const { register, handleSubmit, reset } = useForm()

  const loadTemplate = async (name) => {
    setLoading(true)
    try {
      const r = await api.get(`/print/templates/${name}`)
      setTemplate(r.data.data)
      reset(r.data.data)
    } catch { toast.error('Failed to load template') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadTemplate(active) }, [active])

  const onSave = async (data) => {
    setSaving(true)
    try {
      await api.put(`/print/templates/${active}`, data)
      toast.success('Template saved')
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  const uploadLogo = async () => {
    if (!logoFile) return
    const formData = new FormData()
    formData.append('logo', logoFile)
    try {
      await api.post('/print/templates/logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Logo uploaded')
      loadTemplate(active)
    } catch { toast.error('Failed to upload logo') }
  }

  return (
    <div>
      <PageHeader title="Print Templates" subtitle="Customize your document templates" />

      <div className="flex flex-wrap gap-2 mb-6">
        {TEMPLATE_TYPES.map(t => (
          <button key={t.id} onClick={() => setActive(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
              active === t.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}>
            <FileText size={15} />{t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Settings */}
          <div className="card">
            <h3 className="section-title">Company Details</h3>
            <form onSubmit={handleSubmit(onSave)} className="space-y-4">
              <FormField label="Company Name">
                <input {...register('companyName')} className="input" placeholder="Your Company Name" />
              </FormField>
              <FormField label="Company Address">
                <textarea {...register('companyAddress')} className="input" rows={2} placeholder="123 Business Street, City, State" />
              </FormField>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Phone">
                  <input {...register('companyPhone')} className="input" placeholder="+91 98765 43210" />
                </FormField>
                <FormField label="Email">
                  <input {...register('companyEmail')} className="input" placeholder="info@company.com" />
                </FormField>
              </div>
              <FormField label="Footer Text">
                <textarea {...register('footerText')} className="input" rows={2} placeholder="Thank you for your business!" />
              </FormField>
              <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
                <Save size={16} />{saving ? 'Saving...' : 'Save Template'}
              </button>
            </form>

            <div className="border-t border-gray-100 pt-4 mt-4">
              <h4 className="font-medium text-sm text-gray-700 mb-3">Company Logo</h4>
              {template?.logoPath && (
                <div className="mb-3">
                  <img src={template.logoPath} alt="Logo" className="h-16 object-contain border border-gray-100 rounded p-2" />
                </div>
              )}
              <div className="flex gap-2">
                <input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files[0])}
                  className="input text-xs py-1.5 flex-1" />
                <button onClick={uploadLogo} disabled={!logoFile} className="btn-secondary">
                  <Upload size={14} />Upload
                </button>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="card">
            <h3 className="section-title">Preview</h3>
            <div className="border border-gray-200 rounded-xl p-6 bg-gray-50 text-xs" style={{ fontFamily: 'Arial, sans-serif' }}>
              <div className="flex items-start justify-between border-b-2 border-gray-800 pb-3 mb-4">
                <div>
                  {template?.logoPath && <img src={template.logoPath} alt="" className="h-10 mb-1 object-contain" />}
                  <p className="font-bold text-sm">{template?.companyName || 'Company Name'}</p>
                  <p className="text-gray-500">{template?.companyAddress || '123 Business St'}</p>
                  <p className="text-gray-500">{template?.companyPhone}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg uppercase text-gray-700">{active === 'payment' ? 'Receipt' : active.charAt(0).toUpperCase() + active.slice(1)}</p>
                  <p className="text-gray-500">#SAMPLE-001</p>
                  <p className="text-gray-500">{new Date().toLocaleDateString()}</p>
                </div>
              </div>

              {active === 'order' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="bg-white p-2 rounded border"><p className="font-semibold text-gray-600 text-xs">SALESPERSON</p><p>John Doe</p><p className="text-gray-500">EMP001 · North Region</p></div>
                    <div className="bg-white p-2 rounded border"><p className="font-semibold text-gray-600 text-xs">BILL TO</p><p>Acme Corp</p><p className="text-gray-500">Mumbai, MH</p></div>
                  </div>
                  <table className="w-full border-collapse">
                    <thead><tr className="bg-gray-800 text-white"><th className="p-1 text-left">#</th><th className="p-1 text-left">Item</th><th className="p-1 text-right">Qty</th><th className="p-1 text-right">Price</th><th className="p-1 text-right">Total</th></tr></thead>
                    <tbody>
                      <tr className="border-b"><td className="p-1">1</td><td className="p-1">Sample Product</td><td className="p-1 text-right">5</td><td className="p-1 text-right">₹1,000</td><td className="p-1 text-right font-semibold">₹5,000</td></tr>
                    </tbody>
                  </table>
                  <div className="text-right mt-2"><p className="font-bold">Grand Total: ₹5,000</p></div>
                </div>
              )}

              {active === 'payment' && (
                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b"><span className="text-gray-500">Received From:</span><span className="font-medium">Acme Corp</span></div>
                  <div className="flex justify-between py-1 border-b"><span className="text-gray-500">Amount:</span><span className="font-bold text-lg">₹25,000</span></div>
                  <div className="flex justify-between py-1 border-b"><span className="text-gray-500">Mode:</span><span>NEFT</span></div>
                  <div className="bg-gray-800 text-white p-3 rounded text-center mt-2">
                    <p className="text-xs text-gray-300">Amount in Words</p>
                    <p className="font-semibold">Twenty Five Thousand Rupees Only</p>
                  </div>
                </div>
              )}

              {active === 'expense' && (
                <div className="space-y-2">
                  <div className="bg-white p-2 rounded border mb-3"><p className="font-semibold text-gray-600 text-xs">SUBMITTED BY</p><p>John Doe · EMP001 · North Region</p></div>
                  <table className="w-full border-collapse">
                    <thead><tr className="bg-gray-800 text-white"><th className="p-1 text-left">Date</th><th className="p-1 text-left">Type</th><th className="p-1 text-left">Description</th><th className="p-1 text-right">Amount</th><th className="p-1 text-center">Status</th></tr></thead>
                    <tbody>
                      <tr className="border-b"><td className="p-1">01/03/24</td><td className="p-1">Travel</td><td className="p-1">Train ticket</td><td className="p-1 text-right">₹1,500</td><td className="p-1 text-center text-green-600">Approved</td></tr>
                    </tbody>
                  </table>
                  <div className="text-right mt-2"><p className="font-bold">Total: ₹1,500</p></div>
                </div>
              )}

              <div className="border-t border-gray-200 mt-4 pt-2 text-center text-gray-400">
                <p>{template?.footerText || 'Thank you for your business!'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
