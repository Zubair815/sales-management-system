import { useEffect, useState, useCallback } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { Modal, ConfirmDialog, Pagination, StatusBadge, PageHeader, EmptyState, FormField, LoadingSpinner, ButtonSpinner } from '../components/index.jsx'
import { Plus, Send, Bell, Eye, Trash2, Users, Megaphone, Edit, Paperclip } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

// FIX: L-10 — extracted data fetching into a dedicated custom hook
function useAnnouncementsData(isSp, sortBy) {
  const [data, setData] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)

  const refetch = useCallback(async (page = 1) => {
    setLoading(true)
    setError(null)
    try {
      if (isSp) {
        const r = await api.get('/announcements/inbox', { params: { page, limit: 20, sortBy } })
        setData(r.data.data); setPagination(r.data.pagination); setUnreadCount(r.data.unreadCount || 0)
      } else {
        const r = await api.get('/announcements/admin', { params: { page, limit: 10, sortBy } })
        setData(r.data.data); setPagination(r.data.pagination)
      }
    } catch { toast.error('Failed to load announcements. Please refresh.') } finally { setLoading(false) }
  }, [isSp, sortBy])

  useEffect(() => { refetch() }, [refetch])

  return { data, setData, pagination, loading, error, unreadCount, setUnreadCount, refetch }
}

export default function AnnouncementsPage() {
  const { user, hasPermission } = useAuth()
  const isSp = user.role === 'Salesperson'
  const canCreate = hasPermission('Announcements', 'FullAccess') || user.role === 'SuperAdmin'
  const [modalOpen, setModalOpen] = useState(false)
  const [viewItem, setViewItem] = useState(null)
  const [sendTarget, setSendTarget] = useState(null)
  const [annToDelete, setAnnToDelete] = useState(null) // FIX: C-2
  const [submitting, setSubmitting] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [sendingId, setSendingId] = useState(null)
  const [editId, setEditId] = useState(null)
  const [currentAttachment, setCurrentAttachment] = useState(null)
  const [salespersonsList, setSalespersonsList] = useState([])
  const [regionsList, setRegionsList] = useState([])
  const [rolesList, setRolesList] = useState([])
  const [sortBy, setSortBy] = useState('date_desc')

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({ defaultValues: { priority: 'Medium', targetType: 'All', targetRegions: [], targetRoles: [], targetSpecificIds: [] } })
  const targetType = watch('targetType')

  const { data, setData, pagination, loading, unreadCount, setUnreadCount, refetch: fetch } = useAnnouncementsData(isSp, sortBy) // FIX: L-10

  useEffect(() => {
    if (canCreate && modalOpen) {
      api.get('/salespersons', { params: { limit: 1000 } })
        .then(r => {
          const activeSp = r.data.data.filter(sp => sp.status === 'Active')
          setSalespersonsList(activeSp)
          setRegionsList([...new Set(activeSp.map(sp => sp.region).filter(Boolean))])
          setRolesList([...new Set(activeSp.map(sp => sp.jobRole).filter(Boolean))])
        })
        .catch(console.error)
    }
  }, [canCreate, modalOpen])

  const onSubmitData = async (d) => {
    setSubmitting(true)
    try {
      const formData = new FormData()
      Object.entries(d).forEach(([k, v]) => { 
        if (v !== '' && v !== undefined) {
          if (Array.isArray(v)) {
            if (v.length > 0) v.forEach(item => formData.append(k, item))
          } else {
            formData.append(k, v)
          }
        } 
      })
      if (d.attachment?.[0]) formData.set('attachment', d.attachment[0])
      
      if (editId) {
        await api.put(`/announcements/${editId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
        toast.success('Announcement updated')
      } else {
        await api.post('/announcements', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
        toast.success('Announcement created (draft)')
      }
      setModalOpen(false); reset(); fetch(); setEditId(null); setCurrentAttachment(null);
    } catch (e) { toast.error(e.response?.data?.message || 'Error') } finally { setSubmitting(false) }
  }

  const openEditModal = (ann) => {
    setEditId(ann.id)
    setCurrentAttachment(ann.attachmentPath || null)
    Object.keys(ann).forEach(k => {
      if (k === 'expiryDate' && ann[k]) {
        setValue(k, new Date(ann[k]).toISOString().split('T')[0])
      } else if (k === 'targetRegions' || k === 'targetRoles' || k === 'targetSpecificIds') {
        setValue(k, Array.isArray(ann[k]) ? ann[k] : [])
      } else {
        setValue(k, ann[k] || '')
      }
    })
    setModalOpen(true)
  }

  const sendAnnouncement = async (id) => {
    setSendingId(id)
    try {
      const r = await api.post(`/announcements/${id}/send`)
      toast.success(`Sent to ${r.data.data.recipientCount} recipients`); setSendTarget(null); fetch()
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to send') } finally { setSendingId(null) }
  }

  const markRead = async (id) => {
    try {
      await api.post(`/announcements/${id}/read`)
      setData(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (e) { toast.error('Could not mark as read. Please try again.'); console.error(e) } // FIX: C-3
  }

  const deleteAnn = async (id) => {
    setConfirmLoading(true)
    try { await api.delete(`/announcements/${id}`); toast.success('Deleted'); setAnnToDelete(null); fetch() }
    catch { toast.error('Failed to delete announcement.') } finally { setConfirmLoading(false) }
  }

  // FIX: M-8 — client-side file size validation
  const handleAttachmentChange = (e) => {
    const file = e.target.files?.[0]
    if (file && file.size > 5 * 1024 * 1024) {
      toast.error('File exceeds 5 MB limit.')
      e.target.value = ''
    }
  }

  const PRIORITIES = ['High', 'Medium', 'Low']
  const TARGET_TYPES = ['All', 'Specific', 'Region', 'Role']
  const priorityColors = { High: 'bg-red-100 text-red-800 border-red-200', Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200', Low: 'bg-blue-100 text-blue-800 border-blue-200' }

  return (
    <div>
      <PageHeader
        title="Announcements"
        subtitle={isSp && unreadCount > 0 ? `${unreadCount} unread` : `${pagination?.total ?? 0} total`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input w-auto py-1.5 text-sm cursor-pointer bg-white">
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="priority_asc">Priority (High - Low)</option>
            </select>
            {canCreate && <button onClick={() => { reset({ priority: 'Medium', targetType: 'All' }); setEditId(null); setModalOpen(true) }} className="btn-primary"><Plus size={16} />New Announcement</button>}
          </div>
        }
      />

      <div className="space-y-3">
        {loading ? <LoadingSpinner />
        : data.length === 0 ? (
          <div className="card"><EmptyState icon={Megaphone} title="No announcements" /></div>
        ) : (
          data.map(ann => (
            <div key={ann.id} className={`card transition-all hover:shadow-md border-l-4 ${ann.isRead === false ? 'bg-blue-50 border-l-blue-500' : 'bg-white border-l-transparent'}`}
              onClick={() => { if (isSp && !ann.isRead) markRead(ann.id) }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge border ${priorityColors[ann.priority]}`}>{ann.priority}</span>
                    <StatusBadge status={ann.status} />
                    {ann.isRead === false && <span className="badge bg-blue-100 text-blue-800">NEW</span>}
                  </div>
                  <h3 className="font-semibold text-gray-900">{ann.title}</h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{ann.message}</p>
                  {ann.attachmentPath && (
                    <div className="mt-2">
                      <a href={ann.attachmentPath} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded transition-colors" onClick={(e) => e.stopPropagation()}>
                        <Paperclip size={14} /> View Attachment
                      </a>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-2">{new Date(ann.createdAt).toLocaleString()}{ann.createdBy && ` · ${ann.createdBy.name}`}</p>
                  {!isSp && ann._count && (
                    <div className="mt-1">
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Users size={12} />{ann._count.reads}/{ann._count.recipients} read
                      </p>
                      {ann.reads && ann.reads.length > 0 && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Read by: {ann.reads.map(r => r.salesperson?.name || 'Unknown').join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!isSp && ann.status === 'Draft' && canCreate && (
                    <>
                      <button aria-label="Edit announcement" onClick={e => { e.stopPropagation(); openEditModal(ann) }} className="btn-secondary btn-sm">Edit</button>
                      <button aria-label="Send announcement" onClick={e => { e.stopPropagation(); setSendTarget(ann) }} className="btn-primary btn-sm ml-1"><Send size={13} />Send</button>
                    </>
                  )}
                  {/* FIX: C-2 — route through confirmation state; FIX: H-4 — aria-label */}
                  {!isSp && canCreate && <button aria-label="Delete announcement" onClick={e => { e.stopPropagation(); setAnnToDelete(ann) }} className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded text-gray-400"><Trash2 size={14} /></button>}
                </div>
              </div>
            </div>
          ))
        )}
        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={fetch} />
      </div>

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditId(null); setCurrentAttachment(null); }} title={editId ? "Edit Announcement" : "Create Announcement"} size="lg">
        <form onSubmit={handleSubmit(onSubmitData)} className="space-y-4">
          <FormField label="Title" required>
            <input {...register('title', { required: 'Title is required' })} className="input" placeholder="Announcement title" />
          </FormField>
          <FormField label="Message" required>
            <textarea {...register('message', { required: 'Message is required' })} className="input" rows={4} placeholder="Write your announcement..." />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Priority">
              <select {...register('priority')} className="input">
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </FormField>
            <FormField label="Target Audience">
              <select {...register('targetType')} className="input">
                {TARGET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </FormField>
          </div>
          {targetType === 'Region' && (
            <FormField label="Select Regions" required error={errors.targetRegions?.message}>
              <div className="flex flex-wrap gap-4 mt-1 p-3 border rounded bg-gray-50 max-h-40 overflow-y-auto">
                {regionsList.length === 0 && <span className="text-sm text-gray-500">No regions found</span>}
                {regionsList.map(region => (
                  <label key={region} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded">
                    <input type="checkbox" value={region} {...register('targetRegions', { required: 'Select at least one region' })} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer" />
                    {region}
                  </label>
                ))}
              </div>
            </FormField>
          )}
          {targetType === 'Role' && (
            <FormField label="Select Roles" required error={errors.targetRoles?.message}>
              <div className="flex flex-wrap gap-4 mt-1 p-3 border rounded bg-gray-50 max-h-40 overflow-y-auto">
                {rolesList.length === 0 && <span className="text-sm text-gray-500">No roles found</span>}
                {rolesList.map(role => (
                  <label key={role} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded">
                    <input type="checkbox" value={role} {...register('targetRoles', { required: 'Select at least one role' })} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer" />
                    {role}
                  </label>
                ))}
              </div>
            </FormField>
          )}
          {targetType === 'Specific' && (
            <FormField label="Select Salespersons" required error={errors.targetSpecificIds?.message}>
              <div className="max-h-48 overflow-y-auto border rounded p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 bg-gray-50">
                {salespersonsList.length === 0 && <span className="text-sm text-gray-500 col-span-2">No active salespersons found</span>}
                {salespersonsList.map(sp => (
                  <label key={sp.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded">
                    <input type="checkbox" value={sp.id} {...register('targetSpecificIds', { required: 'Select at least one salesperson' })} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer flex-shrink-0" />
                    <span className="truncate" title={sp.name}>{sp.name} <span className="text-gray-400 text-xs">({sp.employeeId})</span></span>
                  </label>
                ))}
              </div>
            </FormField>
          )}
          <FormField label="Expiry Date (optional)">
            <input {...register('expiryDate')} type="date" className="input" />
          </FormField>
          <FormField label="Attachment (optional)">
            {/* FIX: M-8 — accept filter + onChange size check */}
            <input {...register('attachment')} type="file" className="input py-1.5 text-xs" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={handleAttachmentChange} />
            <p className="text-xs text-gray-400 mt-1">Accepted: PDF, Word, JPG, PNG · Max size: 5 MB</p>
            {currentAttachment && (
               <div className="mt-2">
                 <a href={currentAttachment} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                   <Paperclip size={12} /> Current Attachment Linked
                 </a>
               </div>
            )}
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setModalOpen(false); setEditId(null); setCurrentAttachment(null); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? <><ButtonSpinner /> Saving...</> : (editId ? 'Update Draft' : 'Save as Draft')}</button>
          </div>
        </form>
      </Modal>

      {/* Send confirmation */}
      {sendTarget && (
        <Modal open={!!sendTarget} onClose={() => setSendTarget(null)} title="Send Announcement">
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="font-semibold">{sendTarget.title}</p>
              <p className="text-sm text-gray-600 mt-1">{sendTarget.message}</p>
              <div className="flex gap-2 mt-2">
                <span className={`badge border ${priorityColors[sendTarget.priority]}`}>{sendTarget.priority} Priority</span>
                <span className="badge badge-blue">→ {sendTarget.targetType}</span>
              </div>
            </div>
            <p className="text-sm text-gray-500">This will be delivered to all matching recipients instantly via real-time notification.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setSendTarget(null)} className="btn-secondary">Cancel</button>
              <button onClick={() => sendAnnouncement(sendTarget.id)} disabled={sendingId === sendTarget.id} className="btn-primary">{sendingId === sendTarget.id ? <><ButtonSpinner /> Sending...</> : <><Send size={16} />Send Now</>}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* FIX: C-2 — delete confirmation dialog */}
      <ConfirmDialog
        open={!!annToDelete}
        onClose={() => setAnnToDelete(null)}
        onConfirm={() => deleteAnn(annToDelete.id)}
        title="Delete Announcement"
        message="This action cannot be undone."
        danger
        loading={confirmLoading}
      />
    </div>
  )
}
