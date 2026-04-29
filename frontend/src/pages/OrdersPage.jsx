import { useEffect, useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useForm, useFieldArray } from 'react-hook-form'
import { Modal, ConfirmDialog, Pagination, StatusBadge, SearchInput, PageHeader, EmptyState, LoadingSpinner, ButtonSpinner } from '../components/index.jsx'
import { Plus, Eye, Check, Truck, CheckCircle, XCircle, Printer, ShoppingCart, Trash2, Send } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import OrderPrintTemplate from '../components/OrderPrintTemplate.jsx'
import useDebounce from '../hooks/useDebounce'

export default function OrdersPage() {
  const { user, hasPermission } = useAuth()
  const isSp = user.role === 'Salesperson'
  const canApprove = hasPermission('OrderManagement', 'FullAccess') || user.role === 'SuperAdmin'
  const [data, setData] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [viewOrder, setViewOrder] = useState(null)
  const [printOrder, setPrintOrder] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [parties, setParties] = useState([])
  const [inventory, setInventory] = useState([])
  const { register, handleSubmit, control, reset, watch, setValue, formState: { errors } } = useForm({ defaultValues: { items: [{ itemId: '', quantity: 1, unitPrice: 0 }] } })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  
  const debouncedSearch = useDebounce(search, 500)

  const fetch = async (page = 1) => {
    setLoading(true)
    try {
      const r = await api.get('/orders', { params: { page, limit: 10, search: debouncedSearch, status: statusFilter } })
      setData(r.data.data); setPagination(r.data.pagination)
    } catch { toast.error('Failed to load orders. Please refresh.') } finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [debouncedSearch, statusFilter])

  const openCreate = () => { 
    reset({ items: [{ itemId: '', quantity: 1, unitPrice: 0 }] })
    setModalOpen(true)
    if (parties.length === 0 || inventory.length === 0) {
      Promise.all([
        api.get('/parties', { params: { limit: 500, status: 'Active' } }),
        api.get('/inventory', { params: { limit: 500, status: 'Active' } }),
      ]).then(([p, i]) => { setParties(p.data.data); setInventory(i.data.data) }).catch(() => toast.error('Failed to load parties or inventory.'))
    }
  }

  const onSubmit = async (d) => {
    setSubmitting(true)
    try {
      const items = d.items.filter(i => i.itemId).map(i => ({ itemId: i.itemId, quantity: parseInt(i.quantity), unitPrice: parseFloat(i.unitPrice) }))
      if (!items.length) { setSubmitting(false); return toast.error('Add at least one item') }
      await api.post('/orders', { partyId: d.partyId, items, notes: d.notes })
      toast.success('Order prepared and saved to drafts'); setModalOpen(false); fetch()
    } catch (e) { toast.error(e.response?.data?.message || 'Error') } finally { setSubmitting(false) }
  }

  const statusAction = async (id, action) => {
    setActionLoadingId(`${action}_${id}`)
    try {
      await api.patch(`/orders/${id}/${action}`)
      toast.success(`Order ${action}d`); fetch()
      if (viewOrder) setViewOrder(null)
    } catch (e) { toast.error(e.response?.data?.message || 'Failed') } finally { setActionLoadingId(null) }
  }

  // --- NEW: Submit order to admin
  const handleSubmitOrder = async (id) => {
    setActionLoadingId(`submit_${id}`)
    try {
      await api.patch(`/orders/${id}/submit`)
      toast.success('Order submitted to Admin successfully!')
      fetch()
      if (viewOrder) setViewOrder(null)
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to submit order') } finally { setActionLoadingId(null) }
  }

  const openPrint = async (orderId) => {
    try {
      const r = await api.get(`/orders/${orderId}/print`)
      setPrintOrder(r.data.data)
    } catch { toast.error('Failed to load print data') }
  }

  const watchItems = watch('items')

  const handleItemChange = (idx, itemId) => {
    const inv = inventory.find(i => i.id === itemId)
    if (inv) setValue(`items.${idx}.unitPrice`, inv.sellingPrice)
  }

  const total = watchItems?.reduce((s, i) => s + (parseFloat(i.unitPrice) || 0) * (parseInt(i.quantity) || 0), 0) || 0

  // Added 'Prepared' to the filter dropdown
  const STATUSES = ['', 'Prepared', 'Pending', 'Approved', 'Dispatched', 'Delivered', 'Cancelled']

  return (
    <div>
      <PageHeader title={isSp ? 'My Orders' : 'Orders'} subtitle={`${pagination?.total ?? 0} orders`}
        actions={isSp && <button onClick={openCreate} className="btn-primary"><Plus size={16} />New Order</button>} />

      <div className="card">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Search order #..." />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-full sm:w-40">
            {STATUSES.map(s => <option key={s} value={s}>{s || 'All Status'}</option>)}
          </select>
        </div>

        {loading ? <LoadingSpinner />
        : data.length === 0 ? <EmptyState icon={ShoppingCart} title="No orders found" action={isSp && <button onClick={openCreate} className="btn-primary"><Plus size={16} />Create Order</button>} />
        : (
          <div className="table-container">
            <table className={`table responsive-table ${isSp ? 'orders-table-sp' : 'orders-table'}`}>
              <thead><tr><th>Order #</th><th>Party</th>{!isSp && <th>Salesperson</th>}<th>Amount</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {data.map(o => (
                  <tr key={o.id}>
                    <td data-label="Order #" className="font-mono text-xs text-blue-700 font-semibold">{o.orderNumber}</td>
                    <td data-label="Party" className="font-medium">{o.party?.name}</td>
                    {!isSp && <td data-label="Salesperson" className="text-gray-500 text-sm">{o.salesperson?.name}</td>}
                    <td className="font-semibold text-green-700">Rs {Number(o.grandTotal).toLocaleString()}</td>
                    <td data-label="Status"><StatusBadge status={o.status} /></td>
                    <td data-label="Date" className="text-gray-500 text-xs">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td data-label="Actions" data-cell="actions">
                      <div className="flex flex-wrap items-center justify-end gap-1 md:justify-start">
                        <button onClick={() => setViewOrder(o)} className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded text-gray-400" title="View" aria-label="View order"><Eye size={14} /></button>
                        <button onClick={() => openPrint(o.id)} className="p-1.5 hover:bg-gray-50 hover:text-gray-700 rounded text-gray-400" title="Print" aria-label="Print order"><Printer size={14} /></button>
                        
                        {/* New Submit Button for Salesperson */}
                        {isSp && o.status === 'Prepared' && <button onClick={() => handleSubmitOrder(o.id)} disabled={actionLoadingId === `submit_${o.id}`} className="p-1.5 hover:bg-green-50 hover:text-green-600 rounded text-gray-400 disabled:opacity-50" title="Submit to Admin" aria-label="Submit order to admin">{actionLoadingId === `submit_${o.id}` ? <ButtonSpinner size={14} /> : <Send size={14} />}</button>}

                        {canApprove && o.status === 'Pending' && <button onClick={() => statusAction(o.id, 'approve')} disabled={actionLoadingId === `approve_${o.id}`} className="p-1.5 hover:bg-green-50 hover:text-green-600 rounded text-gray-400 disabled:opacity-50" title="Approve" aria-label="Approve order">{actionLoadingId === `approve_${o.id}` ? <ButtonSpinner size={14} /> : <Check size={14} />}</button>}
                        {canApprove && o.status === 'Approved' && <button onClick={() => statusAction(o.id, 'dispatch')} disabled={actionLoadingId === `dispatch_${o.id}`} className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded text-gray-400 disabled:opacity-50" title="Dispatch" aria-label="Dispatch order">{actionLoadingId === `dispatch_${o.id}` ? <ButtonSpinner size={14} /> : <Truck size={14} />}</button>}
                        {canApprove && o.status === 'Dispatched' && <button onClick={() => statusAction(o.id, 'deliver')} disabled={actionLoadingId === `deliver_${o.id}`} className="p-1.5 hover:bg-purple-50 hover:text-purple-600 rounded text-gray-400 disabled:opacity-50" title="Deliver" aria-label="Mark order delivered">{actionLoadingId === `deliver_${o.id}` ? <ButtonSpinner size={14} /> : <CheckCircle size={14} />}</button>}
                        {(o.status === 'Pending' || o.status === 'Prepared' || (canApprove && o.status === 'Approved')) && <button onClick={() => setCancelTarget(o)} className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded text-gray-400" title="Cancel" aria-label="Cancel order"><XCircle size={14} /></button>}
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

      {/* Create Order Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create New Order" size="xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Party <span className="text-red-500">*</span></label>
              <select {...register('partyId', { required: 'Please select a party' })} className="input">
                <option value="">Select Party</option>
                {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Notes</label>
              <input {...register('notes')} className="input" placeholder="Optional notes" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Order Items</label>
              <button type="button" onClick={() => append({ itemId: '', quantity: 1, unitPrice: 0 })} className="btn-secondary btn-sm">
                <Plus size={14} />Add Item
              </button>
            </div>
            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div key={field.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-start border-b border-gray-100 pb-3 sm:border-0 sm:pb-0">
                  <div className="sm:col-span-5">
                    <label className="label text-xs sm:hidden">Item</label>
                    <select {...register(`items.${idx}.itemId`)} className="input" onChange={e => handleItemChange(idx, e.target.value)}>
                      <option value="">Select Item</option>
                      {inventory.map(i => <option key={i.id} value={i.id}>{i.name} (Stock: {i.stockQuantity})</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label text-xs sm:hidden">Quantity</label>
                    <input {...register(`items.${idx}.quantity`)} type="number" min="1" className="input" placeholder="Qty" />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="label text-xs sm:hidden">Price</label>
                    <input {...register(`items.${idx}.unitPrice`)} type="number" step="0.01" className="input" placeholder="Price" />
                  </div>
                  <div className="sm:col-span-1 flex items-center justify-between sm:justify-center h-10">
                    <span className="text-xs text-gray-500 sm:hidden">Total:</span>
                    <span className="text-xs text-gray-500 font-semibold">
                      Rs {((parseFloat(watchItems?.[idx]?.unitPrice) || 0) * (parseInt(watchItems?.[idx]?.quantity) || 0)).toLocaleString()}
                    </span>
                  </div>
                  <div className="sm:col-span-1 flex items-center h-10">
                    {fields.length > 1 && <button type="button" onClick={() => remove(idx)} className="p-1 hover:text-red-500 text-gray-300"><Trash2 size={14} /></button>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="text-sm text-gray-500">Total: <span className="text-lg font-bold text-gray-900">Rs {total.toLocaleString()}</span></div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-primary">{submitting ? <><ButtonSpinner /> Saving...</> : 'Save as Draft'}</button>
            </div>
          </div>
        </form>
      </Modal>

      {/* View Order Modal */}
      {viewOrder && (
        <Modal open={!!viewOrder} onClose={() => setViewOrder(null)} title={`Order: ${viewOrder.orderNumber}`} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Party:</span> <span className="font-medium">{viewOrder.party?.name}</span></div>
              <div><span className="text-gray-500">Status:</span> <StatusBadge status={viewOrder.status} /></div>
              <div><span className="text-gray-500">Salesperson:</span> <span className="font-medium">{viewOrder.salesperson?.name}</span></div>
              <div><span className="text-gray-500">Date:</span> <span>{new Date(viewOrder.createdAt).toLocaleDateString()}</span></div>
            </div>
            <div className="table-container">
              <table className="table responsive-table order-items-table">
                <thead><tr><th>Item</th><th>SKU</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
                <tbody>
                  {viewOrder.orderItems?.map(oi => (
                    <tr key={oi.id}>
                      <td data-label="Item">{oi.item?.name}</td>
                      <td data-label="SKU" className="font-mono text-xs">{oi.item?.sku}</td>
                      <td data-label="Qty">{oi.quantity}</td>
                      <td>Rs {Number(oi.unitPrice).toLocaleString()}</td>
                      <td className="font-semibold">Rs {Number(oi.totalPrice).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Subtotal: Rs {Number(viewOrder.totalAmount).toLocaleString()}</p>
              {viewOrder.taxAmount > 0 && <p className="text-sm text-gray-500">Tax: Rs {Number(viewOrder.taxAmount).toLocaleString()}</p>}
              <p className="text-lg font-bold text-gray-900">Grand Total: Rs {Number(viewOrder.grandTotal).toLocaleString()}</p>
            </div>
            
            <div className="flex gap-2 pt-2 border-t border-gray-100 flex-wrap">
              {/* Salesperson Actions */}
              {isSp && viewOrder.status === 'Prepared' && (
                <button type="button" onClick={() => handleSubmitOrder(viewOrder.id)} disabled={actionLoadingId === `submit_${viewOrder.id}`} className="btn-primary btn-sm">{actionLoadingId === `submit_${viewOrder.id}` ? <><ButtonSpinner /> Submitting...</> : <><Send size={14} /> Submit to Admin</>}</button>
              )}
              
              {/* Admin Actions */}
              {canApprove && viewOrder.status === 'Pending' && <button onClick={() => statusAction(viewOrder.id, 'approve')} disabled={actionLoadingId === `approve_${viewOrder.id}`} className="btn-success btn-sm">{actionLoadingId === `approve_${viewOrder.id}` ? <><ButtonSpinner /> Approving...</> : <><Check size={14} />Approve</>}</button>}
              {canApprove && viewOrder.status === 'Approved' && <button onClick={() => statusAction(viewOrder.id, 'dispatch')} disabled={actionLoadingId === `dispatch_${viewOrder.id}`} className="btn-primary btn-sm">{actionLoadingId === `dispatch_${viewOrder.id}` ? <><ButtonSpinner /> Dispatching...</> : <><Truck size={14} />Dispatch</>}</button>}
              {canApprove && viewOrder.status === 'Dispatched' && <button onClick={() => statusAction(viewOrder.id, 'deliver')} disabled={actionLoadingId === `deliver_${viewOrder.id}`} className="btn-primary btn-sm">{actionLoadingId === `deliver_${viewOrder.id}` ? <><ButtonSpinner /> Updating...</> : <><CheckCircle size={14} />Mark Delivered</>}</button>}
            </div>
          </div>
        </Modal>
      )}

      {/* Print modal */}
      {printOrder && (
        <Modal open={!!printOrder} onClose={() => setPrintOrder(null)} title="Print Order" size="xl">
          <div className="flex justify-end mb-4 no-print">
            <button onClick={() => window.print()} className="btn-primary"><Printer size={16} />Print</button>
          </div>
          <OrderPrintTemplate data={printOrder} />
        </Modal>
      )}

      <ConfirmDialog open={!!cancelTarget} onClose={() => setCancelTarget(null)} onConfirm={async () => { setConfirmLoading(true); await statusAction(cancelTarget.id, 'cancel'); setCancelTarget(null); setConfirmLoading(false) }} title="Cancel Order" message={`Cancel order ${cancelTarget?.orderNumber}?`} danger loading={confirmLoading} />
    </div>
  )
}
