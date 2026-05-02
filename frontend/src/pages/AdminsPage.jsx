import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { Modal, ConfirmDialog, Pagination, StatusBadge, SearchInput, PageHeader, FormField, EmptyState, LoadingSpinner, ButtonSpinner } from '../components/index.jsx'
import { Shield, ToggleLeft, ToggleRight, Key, Users, Plus, Edit, Trash2 } from 'lucide-react'
import { formatPhone } from '../utils/formatPhone'
import useDebounce from '../hooks/useDebounce'

export default function AdminsPage() {
  const [admins, setAdmins] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editAdmin, setEditAdmin] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [resetTarget, setResetTarget] = useState(null)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()
  const { register: reg2, handleSubmit: hs2, reset: rst2, formState: { errors: err2 } } = useForm()

  const debouncedSearch = useDebounce(search, 500)

  const fetchAdmins = async (page = 1) => {
    setLoading(true)
    try {
      const r = await api.get('/super-admin/admins', { params: { page, limit: 10, search: debouncedSearch } })
      setAdmins(r.data.data)
      setPagination(r.data.pagination)
    } catch { toast.error('Failed to load admins') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAdmins() }, [debouncedSearch])

  const openCreate = () => { setEditAdmin(null); reset({}); setModalOpen(true) }
  const openEdit = (admin) => { setEditAdmin(admin); reset({ name: admin.name, email: admin.email, phone: admin.phone }); setModalOpen(true) }

  const onSubmit = async (data) => {
    setSubmitting(true)
    try {
      if (editAdmin) {
        await api.put(`/super-admin/admins/${editAdmin.id}`, data)
        toast.success('Admin updated')
      } else {
        await api.post('/super-admin/admins', data)
        toast.success('Admin created')
      }
      setModalOpen(false); fetchAdmins()
    } catch (e) { toast.error(e.response?.data?.message || 'Error') } finally { setSubmitting(false) }
  }

  const toggleStatus = async (admin) => {
    setActionLoadingId(`toggle_${admin.id}`)
    try {
      await api.patch(`/super-admin/admins/${admin.id}/status`)
      toast.success('Status updated'); fetchAdmins()
    } catch { toast.error('Failed to update status') } finally { setActionLoadingId(null) }
  }

  const deleteAdmin = async () => {
    setConfirmLoading(true)
    try {
      await api.delete(`/super-admin/admins/${deleteTarget.id}`)
      toast.success('Admin deleted'); 
      setDeleteTarget(null); 
      fetchAdmins()
    } catch (error) { 
      const errorMessage = error.response?.data?.message || 'Failed to delete admin';
      toast.error(errorMessage);
      setDeleteTarget(null);
    } finally { setConfirmLoading(false) }
  }

  const resetPassword = async (data) => {
    setSubmitting(true)
    try {
      await api.patch(`/super-admin/admins/${resetTarget.id}/reset-password`, data)
      toast.success('Password reset'); setResetTarget(null); rst2()
    } catch (e) { toast.error(e.response?.data?.message || 'Error') } finally { setSubmitting(false) }
  }

  return (
    <div>
      <PageHeader title="Admin Users" subtitle={`${pagination?.total ?? 0} admins`}
        actions={<button onClick={openCreate} className="btn-primary"><Plus size={16} />Add Admin</button>} />

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Search admins..." />
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : admins.length === 0 ? (
          <EmptyState icon={Users} title="No admins found" action={<button onClick={openCreate} className="btn-primary"><Plus size={16} />Create Admin</button>} />
        ) : (
          <div className="table-container">
            <table className="table responsive-table">
              <thead><tr>
                <th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Last Login</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {admins.map(admin => (
                  <tr key={admin.id}>
                    <td data-label="Name" className="font-medium text-gray-900">{admin.name}</td>
                    <td data-label="Email" className="text-gray-600">{admin.email}</td>
                    <td data-label="Phone" className="text-gray-600">{formatPhone(admin.phone)}</td>
                    <td data-label="Status"><StatusBadge status={admin.status} /></td>
                    <td data-label="Last Login" className="text-gray-500">{admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleDateString() : 'Never'}</td>
                    <td data-label="Actions" data-cell="actions">
                      <div className="flex flex-wrap items-center gap-2 justify-end md:justify-start">
                        <Link to={`/admins/${admin.id}/permissions`} className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded text-xs font-medium transition-colors" aria-label="Manage permissions">
                          <Shield size={14} /> Permissions
                        </Link>
                        <button onClick={() => openEdit(admin)} className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-medium transition-colors" aria-label="Edit admin">
                          <Edit size={14} /> Edit
                        </button>
                        <button onClick={() => toggleStatus(admin)} disabled={actionLoadingId === `toggle_${admin.id}`} className="flex items-center gap-1 px-2 py-1 bg-yellow-50 text-yellow-600 hover:bg-yellow-100 rounded text-xs font-medium transition-colors disabled:opacity-50" aria-label="Toggle admin status">
                          {actionLoadingId === `toggle_${admin.id}` ? <ButtonSpinner size={14} /> : admin.status === 'Active' ? <ToggleRight size={14} /> : <ToggleLeft size={14} />} {admin.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onClick={() => { setResetTarget(admin); rst2() }} className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 hover:bg-green-100 rounded text-xs font-medium transition-colors" aria-label="Reset password">
                          <Key size={14} /> Reset Pwd
                        </button>
                        <button onClick={() => setDeleteTarget(admin)} className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded text-xs font-medium transition-colors" aria-label="Delete admin">
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={fetchAdmins} />
      </div>

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editAdmin ? 'Edit Admin' : 'Create Admin'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Full Name" required error={errors.name?.message}>
            <input {...register('name', { required: 'Name required' })} className="input" placeholder="John Doe" />
          </FormField>
          <FormField label="Email" required error={errors.email?.message}>
            <input {...register('email', { required: 'Email required', pattern: { value: /^\S+@\S+$/, message: 'Invalid email' } })} type="email" className="input" placeholder="admin@company.com" />
          </FormField>
          <FormField label="Phone" error={errors.phone?.message}>
            <input {...register('phone')} className="input" placeholder="+91 98765 43210" />
          </FormField>
          {!editAdmin && (
            <FormField label="Password" required error={errors.password?.message}>
              <input {...register('password', { required: 'Password required', minLength: { value: 8, message: 'Min 8 chars' }, maxLength: { value: 12, message: 'Max 12 chars' }, pattern: { value: /^[a-zA-Z0-9]+$/, message: 'Alphanumeric only' } })} type="password" className="input" placeholder="8-12 alphanumeric" />
            </FormField>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? <><ButtonSpinner /> {editAdmin ? 'Updating...' : 'Creating...'}</> : editAdmin ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal open={!!resetTarget} onClose={() => setResetTarget(null)} title={`Reset Password: ${resetTarget?.name}`}>
        <form onSubmit={hs2(resetPassword)} className="space-y-4">
          <FormField label="New Password" required error={err2.password?.message}>
            <input {...reg2('password', { required: 'Password required', minLength: { value: 8, message: 'Min 8' }, maxLength: { value: 12, message: 'Max 12' }, pattern: { value: /^[a-zA-Z0-9]+$/, message: 'Alphanumeric only' } })} type="password" className="input" />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setResetTarget(null)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? <><ButtonSpinner /> Resetting...</> : 'Reset Password'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={deleteAdmin}
        title="Delete Admin" message={`Are you sure you want to delete ${deleteTarget?.name}?`} danger loading={confirmLoading} />
    </div>
  )
}
