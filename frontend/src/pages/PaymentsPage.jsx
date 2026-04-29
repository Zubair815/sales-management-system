import { useEffect, useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { Modal, Pagination, StatusBadge, PageHeader, EmptyState, FormField, SearchInput, LoadingSpinner, ButtonSpinner } from '../components/index.jsx'
import { Plus, Eye, Check, X, CreditCard, Printer } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import PaymentPrintTemplate from '../components/PaymentPrintTemplate.jsx'
import useDebounce from '../hooks/useDebounce'

export default function PaymentsPage() {
  const { user, hasPermission } = useAuth()
  const isSp = user.role === 'Salesperson'
  const canVerify = hasPermission('PaymentManagement', 'FullAccess') || user.role === 'SuperAdmin'
  const [data, setData] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 })
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [viewItem, setViewItem] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [printItem, setPrintItem] = useState(null)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [parties, setParties] = useState([])
  const [orders, setOrders] = useState([])
  const { register, handleSubmit, reset } = useForm()
  const { register: reg2, handleSubmit: hs2, reset: rst2 } = useForm()

  const debouncedSearch = useDebounce(search, 500)

  const fetch = async (page = 1) => {
    setLoading(true)
    try {
      const r = await api.get('/payments', { params: { page, limit: 10, status: statusFilter, search: debouncedSearch } })
      setData(r.data.data); setPagination(r.data.pagination)
    } catch { toast.error('Failed to load payments. Please refresh.') } finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [statusFilter, debouncedSearch])

  useEffect(() => {
    if (isSp) {
      api.get('/parties', { params: { limit: 100 } }).then(r => setParties(r.data.data)).catch(() => toast.error('Failed to load parties.'))
      api.get('/orders', { params: { limit: 100 } }).then(r => setOrders(r.data.data)).catch(() => toast.error('Failed to load orders.'))
    }
  }, [isSp])

  const onSubmit = async (d) => {
    setSubmitting(true)
    try {
      const formData = new FormData()
      Object.entries(d).forEach(([k, v]) => { if (v !== '' && v !== undefined) formData.append(k, v) })
      if (d.proof?.[0]) formData.set('proof', d.proof[0])
      await api.post('/payments', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Payment recorded'); setModalOpen(false); reset(); fetch()
    } catch (e) { toast.error(e.response?.data?.message || 'Error') } finally { setSubmitting(false) }
  }

  const verify = async (id) => {
    setActionLoadingId(`verify_${id}`)
    try { await api.patch(`/payments/${id}/verify`); toast.success('Payment verified'); fetch() }
    catch { toast.error('Failed to verify payment.') } finally { setActionLoadingId(null) }
  }

  const reject = async (d) => {
    setSubmitting(true)
    try {
      await api.patch(`/payments/${rejectTarget.id}/reject`, { rejectionReason: d.rejectionReason })
      toast.success('Payment rejected'); setRejectTarget(null); rst2(); fetch()
    } catch { toast.error('Failed to reject payment.') } finally { setSubmitting(false) }
  }

  const openPrint = async (payment) => {
    try {
      const template = await api.get('/print/templates/payment')
      setPrintItem({ payment, template: template.data.data })
    } catch { toast.error('Failed to load print data.') }
  }

  const MODES = ['Cash', 'Cheque', 'NEFT', 'UPI', 'Other']

  return (
    <div>
      <PageHeader title={isSp ? 'My Payments' : 'Payments'} subtitle={`${pagination?.total ?? 0} records`}
        actions={isSp && <button onClick={() => { reset({}); setModalOpen(true) }} className="btn-primary"><Plus size={16} />Record Payment</button>} />

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Search receipt, purpose..." />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-full sm:w-40">
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Verified">Verified</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        {loading ? <LoadingSpinner />
        : data.length === 0 ? <EmptyState icon={CreditCard} title="No payments found" />
        : (
          <div className="table-container">
            <table className="table responsive-table">
              <thead><tr><th>Receipt #</th><th>Date</th>{!isSp && <th>Salesperson</th>}<th>Party</th><th>Amount</th><th>Mode</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {data.map(p => (
                  <tr key={p.id}>
                    <td data-label="Receipt #" className="font-mono text-xs text-blue-700">{p.receiptNumber}</td>
                    <td data-label="Date" className="text-xs text-gray-500">{new Date(p.paymentDate).toLocaleDateString()}</td>
                    {!isSp && <td data-label="Salesperson" className="text-sm font-medium">{p.salesperson?.name}</td>}
                    <td data-label="Party" className="text-sm">{p.party?.name}</td>
                    <td data-label="Amount" className="font-semibold text-green-700">Rs {Number(p.amount).toLocaleString()}</td>
                    <td data-label="Mode"><span className="badge badge-blue">{p.paymentMode}</span></td>
                    <td data-label="Status"><StatusBadge status={p.status} /></td>
                    <td data-label="Actions" data-cell="actions">
                      <div className="flex flex-wrap gap-1 justify-end md:justify-start">
                        <button onClick={() => setViewItem(p)} className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded text-gray-400" aria-label="View payment"><Eye size={14} /></button>
                        <button onClick={() => openPrint(p)} className="p-1.5 hover:bg-gray-50 hover:text-gray-700 rounded text-gray-400" aria-label="Print receipt"><Printer size={14} /></button>
                          {canVerify && p.status === 'Pending' && (
                            <>
                              <button onClick={() => verify(p.id)} disabled={actionLoadingId === `verify_${p.id}`} className="p-1.5 hover:bg-green-50 hover:text-green-600 rounded text-gray-400 disabled:opacity-50" aria-label="Verify payment">{actionLoadingId === `verify_${p.id}` ? <ButtonSpinner size={14} /> : <Check size={14} />}</button>
                              <button onClick={() => { setRejectTarget(p); rst2() }} className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded text-gray-400" aria-label="Reject payment"><X size={14} /></button>
                            </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={fetch} />
      </div>

      {/* Record Payment Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Record Payment">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Party" required>
            <select {...register('partyId', { required: 'Please select a party' })} className="input">
              <option value="">Select Party</option>
              {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </FormField>
          <FormField label="Linked Order (optional)">
            <select {...register('orderId')} className="input">
              <option value="">None</option>
              {orders.map(o => <option key={o.id} value={o.id}>{o.orderNumber} - Rs {Number(o.grandTotal).toLocaleString()}</option>)}
            </select>
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Amount (Rs)" required>
              <input {...register('amount', { required: 'Amount is required', min: { value: 0.01, message: 'Amount must be greater than 0' } })} type="number" step="0.01" className="input" />
            </FormField>
            <FormField label="Payment Date" required>
              <input {...register('paymentDate', { required: 'Payment date is required' })} type="date" className="input" />
            </FormField>
            <FormField label="Payment Mode" required>
              <select {...register('paymentMode', { required: 'Please select a payment mode' })} className="input">
                <option value="">Select</option>
                {MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </FormField>
            <FormField label="Transaction ID">
              <input {...register('transactionId')} className="input" placeholder="UPI/NEFT ref no." />
            </FormField>
          </div>
          <FormField label="Purpose">
            <input {...register('purpose')} className="input" placeholder="Payment for order..." />
          </FormField>
          <FormField label="Proof (optional)">
            <input {...register('proof')} type="file" accept="image/*,.pdf" className="input py-1.5 text-xs" />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? <><ButtonSpinner /> Recording...</> : 'Record Payment'}</button>
          </div>
        </form>
      </Modal>

      {/* Reject Modal */}
      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject Payment">
        <form onSubmit={hs2(reject)} className="space-y-4">
          <p className="text-sm text-gray-600">{rejectTarget?.party?.name} - Rs {Number(rejectTarget?.amount || 0).toLocaleString()}</p>
          <FormField label="Rejection Reason" required>
            <textarea {...reg2('rejectionReason', { required: 'Rejection reason is required' })} className="input" rows={3} />
          </FormField>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setRejectTarget(null)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-danger">{submitting ? <><ButtonSpinner /> Rejecting...</> : 'Reject'}</button>
          </div>
        </form>
      </Modal>

      {printItem && (
        <Modal open={!!printItem} onClose={() => setPrintItem(null)} title="Payment Receipt" size="lg">
          <div className="flex justify-end mb-4 no-print">
            <button onClick={() => window.print()} className="btn-primary"><Printer size={16} />Print</button>
          </div>
          <PaymentPrintTemplate data={printItem} />
        </Modal>
      )}
    </div>
  )
}
