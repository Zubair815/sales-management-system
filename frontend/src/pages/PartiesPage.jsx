// PartiesPage.jsx
import { useEffect, useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { Modal, ConfirmDialog, Pagination, StatusBadge, SearchInput, PageHeader, FormField, EmptyState, LoadingSpinner } from '../components/index.jsx'
import { Plus, Edit, Trash2, ToggleRight, ToggleLeft, Building2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { formatPhone } from '../utils/formatPhone'
import useDebounce from '../hooks/useDebounce'

export function PartiesPage() {
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('PartyManagement', 'ViewEdit')
  const canCreate = hasPermission('PartyManagement', 'FullAccess')
  const [data, setData] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const debouncedSearch = useDebounce(search, 500)

  const fetch = async (page = 1) => {
    setLoading(true)
    try {
      const r = await api.get('/parties', { params: { page, limit: 10, search: debouncedSearch } })
      setData(r.data.data); setPagination(r.data.pagination)
    } catch { toast.error('Failed to load parties. Please refresh.') } finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [debouncedSearch])

  const openCreate = () => { setEditItem(null); reset({}); setModalOpen(true) }
  const openEdit = (item) => { setEditItem(item); reset(item); setModalOpen(true) }

  const onSubmit = async (d) => {
    try {
      if (editItem) await api.put(`/parties/${editItem.id}`, d)
      else await api.post('/parties', d)
      toast.success(editItem ? 'Updated' : 'Created'); setModalOpen(false); fetch()
    } catch (e) { toast.error(e.response?.data?.message || 'Error') }
  }

  const toggleStatus = async (item) => {
    try { await api.patch(`/parties/${item.id}/status`); toast.success('Status updated'); fetch() } catch { toast.error('Failed to toggle party status.') }
  }

  const deleteItem = async () => {
    try { await api.delete(`/parties/${deleteTarget.id}`); toast.success('Party deleted'); setDeleteTarget(null); fetch() } catch { toast.error('Failed to delete party.') }
  }

  return (
    <div>
      <PageHeader title="Parties" subtitle={`${pagination?.total ?? 0} parties`}
        actions={canCreate && <button onClick={openCreate} className="btn-primary"><Plus size={16} />Add Party</button>} />

      <div className="card">
        <div className="mb-4"><SearchInput value={search} onChange={setSearch} placeholder="Search parties..." /></div>
        {loading ? <LoadingSpinner />
        : data.length === 0 ? <EmptyState icon={Building2} title="No parties found" />
        : (
          <div className="table-container">
            <table className="table responsive-table">
              <thead><tr><th>Name</th><th>Contact</th><th>Phone</th><th>City</th><th>GST</th><th>Status</th>{canEdit && <th>Actions</th>}</tr></thead>
              <tbody>
                {data.map(p => (
                  <tr key={p.id}>
                    <td data-label="Name" className="font-medium">{p.name}</td>
                    <td data-label="Contact" className="text-gray-500">{p.contactName || '-'}</td>
                    <td data-label="Phone" className="text-gray-500">{formatPhone(p.phone)}</td>
                    <td data-label="City" className="text-gray-500">{p.city || '-'}</td>
                    <td data-label="GST" className="font-mono text-xs text-gray-500">{p.gstNumber || '-'}</td>
                    <td data-label="Status"><StatusBadge status={p.status} /></td>
                    {canEdit && (
                      <td data-label="Actions" data-cell="actions">
                        <div className="flex flex-wrap gap-1 justify-end md:justify-start">
                          <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded text-gray-400" aria-label="Edit party"><Edit size={14} /></button>
                          {canCreate && <button onClick={() => toggleStatus(p)} className="p-1.5 hover:bg-yellow-50 hover:text-yellow-600 rounded text-gray-400" aria-label="Toggle party status">{p.status === 'Active' ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}</button>}
                          {canCreate && <button onClick={() => setDeleteTarget(p)} className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded text-gray-400" aria-label="Delete party"><Trash2 size={14} /></button>}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Party' : 'Add Party'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Party Name" required error={errors.name?.message}>
              <input {...register('name', { required: 'Name required' })} className="input" />
            </FormField>
            <FormField label="Contact Person"><input {...register('contactName')} className="input" /></FormField>
            <FormField label="Phone" required error={errors.phone?.message}>
              <input {...register('phone', { required: 'Phone required' })} className="input" />
            </FormField>
            <FormField label="Email"><input {...register('email')} type="email" className="input" /></FormField>
            <FormField label="City"><input {...register('city')} className="input" /></FormField>
            <FormField label="State"><input {...register('state')} className="input" /></FormField>
            <FormField label="GST Number"><input {...register('gstNumber')} className="input" placeholder="27AAPFU0939F1ZV" /></FormField>
            <FormField label="Address" error={null}>
              <input {...register('address')} className="input" />
            </FormField>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editItem ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={deleteItem} title="Delete Party" message={`Delete ${deleteTarget?.name}?`} danger />
    </div>
  )
}

export default PartiesPage
