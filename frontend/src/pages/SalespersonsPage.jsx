import { useEffect, useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { Modal, ConfirmDialog, Pagination, StatusBadge, SearchInput, PageHeader, FormField, EmptyState } from '../components/index.jsx'
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, Key, UserCheck } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { formatPhone } from '../utils/formatPhone'
import useDebounce from '../hooks/useDebounce'

export default function SalespersonsPage() {
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('SalespersonManagement', 'ViewEdit')
  const canCreate = hasPermission('SalespersonManagement', 'FullAccess')
  const [data, setData] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [resetTarget, setResetTarget] = useState(null)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()
  const { register: reg2, handleSubmit: hs2, reset: rst2, formState: { errors: err2 } } = useForm()

  const debouncedSearch = useDebounce(search, 500)

  const fetch = async (page = 1) => {
    setLoading(true)
    try {
      const r = await api.get('/salespersons', { params: { page, limit: 10, search: debouncedSearch } })
      setData(r.data.data); setPagination(r.data.pagination)
    } catch { toast.error('Failed to load') } finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [debouncedSearch])

  const openCreate = () => { setEditItem(null); reset({}); setModalOpen(true) }
  const openEdit = (sp) => { setEditItem(sp); reset({ name: sp.name, email: sp.email, phone: sp.phone, region: sp.region, jobRole: sp.jobRole, targetAmount: sp.targetAmount, budgetAmount: sp.budgetAmount }); setModalOpen(true) }

  const onSubmit = async (d) => {
    try {
      if (editItem) await api.put(`/salespersons/${editItem.id}`, d)
      else await api.post('/salespersons', d)
      toast.success(editItem ? 'Updated' : 'Created'); setModalOpen(false); fetch()
    } catch (e) { toast.error(e.response?.data?.message || 'Error') }
  }

  const toggleStatus = async (sp) => {
    try { await api.patch(`/salespersons/${sp.id}/status`); toast.success('Status updated'); fetch() }
    catch { toast.error('Failed') }
  }

const deleteSp = async () => {
    try { 
      await api.delete(`/salespersons/${deleteTarget.id}`); 
      toast.success('Salesperson deleted'); 
      setDeleteTarget(null); 
      fetch(); 
    } catch (error) { 
      const errorMessage = error.response?.data?.message || 'Failed to delete salesperson';
      toast.error(errorMessage);
      setDeleteTarget(null); 
    }
  }

  const resetPw = async (d) => {
    try { await api.patch(`/salespersons/${resetTarget.id}/reset-password`, d); toast.success('Password reset'); setResetTarget(null); rst2() }
    catch (e) { toast.error(e.response?.data?.message || 'Error') }
  }

  return (
    <div>
      <PageHeader title="Salespersons" subtitle={`${pagination?.total ?? 0} total`}
        actions={canCreate && <button onClick={openCreate} className="btn-primary"><Plus size={16} />Add Salesperson</button>} />

      <div className="card">
        <div className="mb-4"><SearchInput value={search} onChange={setSearch} placeholder="Search by name, ID..." /></div>
        {loading ? <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>
        : data.length === 0 ? <EmptyState icon={UserCheck} title="No salespersons found" />
        : (
          <div className="table-container">
            <table className="table responsive-table">
              <thead><tr><th>Employee ID</th><th>Name</th><th>Phone</th><th>Region</th><th>Role</th><th>Status</th><th>Target</th><th>Actions</th></tr></thead>
              <tbody>
                {data.map(sp => (
                  <tr key={sp.id}>
                    <td data-label="Employee ID" className="font-mono text-xs text-blue-700 font-semibold">{sp.employeeId}</td>
                    <td data-label="Name" className="font-medium">{sp.name}</td>
                    <td data-label="Phone" className="text-gray-500">{formatPhone(sp.phone)}</td>
                    <td data-label="Region" className="text-gray-500">{sp.region || '-'}</td>
                    <td data-label="Role" className="text-gray-500 text-xs">{sp.jobRole || '-'}</td>
                    <td data-label="Status"><StatusBadge status={sp.status} /></td>
                    <td data-label="Target" className="text-gray-500">{sp.targetAmount ? `₹${Number(sp.targetAmount).toLocaleString()}` : '-'}</td>
                    <td data-label="Actions" data-cell="actions">
                      <div className="flex flex-wrap items-center gap-1 justify-end md:justify-start">
                        {canEdit && <button onClick={() => openEdit(sp)} className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded text-gray-400"><Edit size={14} /></button>}
                        {canCreate && <button onClick={() => toggleStatus(sp)} className="p-1.5 hover:bg-yellow-50 hover:text-yellow-600 rounded text-gray-400">{sp.status === 'Active' ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}</button>}
                        {canCreate && <button onClick={() => { setResetTarget(sp); rst2() }} className="p-1.5 hover:bg-green-50 hover:text-green-600 rounded text-gray-400"><Key size={14} /></button>}
                        {canCreate && <button onClick={() => setDeleteTarget(sp)} className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded text-gray-400"><Trash2 size={14} /></button>}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Salesperson' : 'Add Salesperson'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!editItem && (
              <FormField label="Employee ID" required error={errors.employeeId?.message}>
                <input {...register('employeeId', { required: true, minLength: 8, maxLength: 12, pattern: /^[a-zA-Z0-9]+$/ })} className="input" placeholder="EMP00001" />
              </FormField>
            )}
            <FormField label="Full Name" required error={errors.name?.message}>
              <input {...register('name', { required: 'Name required' })} className="input" />
            </FormField>
            <FormField label="Phone" required error={errors.phone?.message}>
              <input {...register('phone', { required: 'Phone required' })} className="input" />
            </FormField>
            <FormField label="Email" error={errors.email?.message}>
              <input {...register('email')} type="email" className="input" />
            </FormField>
            {!editItem && (
              <FormField label="Password" required error={errors.password?.message}>
                <input {...register('password', { required: true, minLength: 8, maxLength: 12, pattern: /^[a-zA-Z0-9]+$/ })} type="password" className="input" />
              </FormField>
            )}
            <FormField label="Region" error={errors.region?.message}>
              <input {...register('region')} className="input" placeholder="North, South, East..." />
            </FormField>
            <FormField label="Job Role">
              <input {...register('jobRole')} className="input" placeholder="Sales Executive" />
            </FormField>
            <FormField label="Target Amount">
              <input {...register('targetAmount')} type="number" className="input" placeholder="500000" />
            </FormField>
            <FormField label="Budget Amount">
              <input {...register('budgetAmount')} type="number" className="input" placeholder="20000" />
            </FormField>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editItem ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!resetTarget} onClose={() => setResetTarget(null)} title={`Reset Password: ${resetTarget?.name}`}>
        <form onSubmit={hs2(resetPw)} className="space-y-4">
          <FormField label="New Password" required error={err2.password?.message}>
            <input {...reg2('password', { required: true, minLength: 8, maxLength: 12, pattern: /^[a-zA-Z0-9]+$/ })} type="password" className="input" placeholder="8-12 alphanumeric" />
          </FormField>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setResetTarget(null)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">Reset</button></div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={deleteSp} title="Delete Salesperson" message={`Delete ${deleteTarget?.name}?`} danger />
    </div>
  )
}
