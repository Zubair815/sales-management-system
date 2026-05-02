import { useEffect, useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { Modal, ConfirmDialog, Pagination, StatusBadge, SearchInput, PageHeader, FormField, EmptyState, LoadingSpinner, ButtonSpinner } from '../components/index.jsx'
import { Plus, Edit, Trash2, Package, AlertTriangle, PlusCircle, MinusCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import useDebounce from '../hooks/useDebounce'

export default function InventoryPage() {
  const { hasPermission, user } = useAuth()
  const canEdit = hasPermission('InventoryManagement', 'ViewEdit')
  const canCreate = hasPermission('InventoryManagement', 'FullAccess')
  const [data, setData] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [stockTarget, setStockTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()
  const { register: reg2, handleSubmit: hs2, reset: rst2 } = useForm()

  const debouncedSearch = useDebounce(search, 500)

  const fetch = async (page = 1) => {
    setLoading(true)
    try {
      const r = await api.get('/inventory', { params: { page, limit: 12, search: debouncedSearch } })
      setData(r.data.data); setPagination(r.data.pagination)
    } catch { toast.error('Failed to load inventory. Please refresh.') } finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [debouncedSearch])

  const openCreate = () => { setEditItem(null); reset({}); setModalOpen(true) }
  const openEdit = (item) => { setEditItem(item); reset({ ...item, costPrice: item.costPrice || '', sellingPrice: item.sellingPrice }); setModalOpen(true) }

  const onSubmit = async (d) => {
    setSubmitting(true)
    try {
      if (editItem) await api.put(`/inventory/${editItem.id}`, d)
      else await api.post('/inventory', d)
      toast.success(editItem ? 'Updated' : 'Created'); setModalOpen(false); fetch()
    } catch (e) { toast.error(e.response?.data?.message || 'Error') } finally { setSubmitting(false) }
  }

  const deleteItem = async () => {
    setConfirmLoading(true)
    try { await api.delete(`/inventory/${deleteTarget.id}`); toast.success('Deleted'); setDeleteTarget(null); fetch() } catch { toast.error('Failed to delete item.') } finally { setConfirmLoading(false) }
  }

  const adjustStock = async (d) => {
    setSubmitting(true)
    try {
      await api.patch(`/inventory/${stockTarget.id}/stock`, { adjustment: parseInt(d.adjustment), reason: d.reason })
      toast.success('Stock adjusted'); setStockTarget(null); rst2(); fetch()
    } catch (e) { toast.error(e.response?.data?.message || 'Error') } finally { setSubmitting(false) }
  }

  return (
    <div>
      <PageHeader title="Inventory" subtitle={`${pagination?.total ?? 0} items`}
        actions={canCreate && <button onClick={openCreate} className="btn-primary"><Plus size={16} />Add Item</button>} />

      <div className="card">
        <div className="mb-4"><SearchInput value={search} onChange={setSearch} placeholder="Search by name, SKU..." /></div>
        {loading ? <LoadingSpinner />
        : data.length === 0 ? <EmptyState icon={Package} title="No items found" />
        : (
          <div className="table-container">
            <table className="table responsive-table">
              <thead><tr><th>SKU</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th>{canEdit && <th>Actions</th>}</tr></thead>
              <tbody>
                {data.map(item => (
                  <tr key={item.id}>
                    <td data-label="SKU" className="font-mono text-xs text-blue-700 font-semibold">{item.sku}</td>
                    <td data-label="Name" className="font-medium">{item.name}</td>
                    <td data-label="Category" className="text-gray-500 text-xs">{item.category || '-'}</td>
                    <td data-label="Price" className="font-semibold text-green-700">Rs {Number(item.sellingPrice).toLocaleString()}</td>
                    <td data-label="Stock">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-semibold ${item.stockQuantity <= item.lowStockThreshold ? 'text-red-600' : 'text-gray-800'}`}>{item.stockQuantity}</span>
                        {item.stockQuantity <= item.lowStockThreshold && <AlertTriangle size={14} className="text-red-500" />}
                      </div>
                    </td>
                    <td data-label="Status"><StatusBadge status={item.status} /></td>
                    {canEdit && (
                      <td data-label="Actions" data-cell="actions">
                        <div className="flex flex-wrap gap-2 justify-end md:justify-start">
                          <button onClick={() => openEdit(item)} className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-medium transition-colors" aria-label="Edit item"><Edit size={14} /> Edit</button>
                          <button onClick={() => { setStockTarget(item); rst2() }} className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 hover:bg-green-100 rounded text-xs font-medium transition-colors" aria-label="Adjust stock">
                            <PlusCircle size={14} /> Adjust Stock
                          </button>
                          {canCreate && <button onClick={() => setDeleteTarget(item)} className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded text-xs font-medium transition-colors" aria-label="Delete item"><Trash2 size={14} /> Delete</button>}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={fetch} />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Item' : 'Add Inventory Item'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!editItem && (
              <FormField label="SKU" required error={errors.sku?.message}>
                <input {...register('sku', { required: 'SKU required' })} className="input" placeholder="PROD-001" />
              </FormField>
            )}
            <FormField label="Name" required error={errors.name?.message}>
              <input {...register('name', { required: 'Name required' })} className="input" />
            </FormField>
            <FormField label="Category"><input {...register('category')} className="input" placeholder="Electronics, Mechanical..." /></FormField>
            <FormField label="Unit"><input {...register('unit')} className="input" placeholder="Piece, Box, Kg..." defaultValue="Piece" /></FormField>
            <FormField label="Selling Price" required error={errors.sellingPrice?.message}>
              <input {...register('sellingPrice', { required: 'Price required' })} type="number" step="0.01" className="input" />
            </FormField>
            <FormField label="Cost Price"><input {...register('costPrice')} type="number" step="0.01" className="input" /></FormField>
            {!editItem && (
              <FormField label="Initial Stock"><input {...register('stockQuantity')} type="number" className="input" defaultValue="0" /></FormField>
            )}
            <FormField label="Low Stock Alert At"><input {...register('lowStockThreshold')} type="number" className="input" defaultValue="10" /></FormField>
          </div>
          <FormField label="Description"><textarea {...register('description')} className="input" rows={2} /></FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? <><ButtonSpinner /> {editItem ? 'Updating...' : 'Creating...'}</> : editItem ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!stockTarget} onClose={() => setStockTarget(null)} title={`Adjust Stock: ${stockTarget?.name}`}>
        <form onSubmit={hs2(adjustStock)} className="space-y-4">
          <p className="text-sm text-gray-500">Current stock: <span className="font-semibold text-gray-800">{stockTarget?.stockQuantity}</span></p>
          <FormField label="Adjustment (use negative to reduce)">
            <input {...reg2('adjustment', { required: 'Adjustment value is required' })} type="number" className="input" placeholder="+50 or -10" />
          </FormField>
          <FormField label="Reason"><input {...reg2('reason')} className="input" placeholder="Stock received, damaged..." /></FormField>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setStockTarget(null)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? <><ButtonSpinner /> Applying...</> : 'Apply Adjustment'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={deleteItem} title="Delete Item" message={`Delete ${deleteTarget?.name}?`} danger loading={confirmLoading} />
    </div>
  )
}
