import { useEffect, useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { Modal, Pagination, StatusBadge, PageHeader, EmptyState, FormField } from '../components/index.jsx'
import { Plus, Send, Bell, Eye, Trash2, Users, Megaphone } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function AnnouncementsPage() {
  const { user, hasPermission } = useAuth()
  const isSp = user.role === 'Salesperson'
  const canCreate = hasPermission('Announcements', 'FullAccess') || user.role === 'SuperAdmin'
  const [data, setData] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [viewItem, setViewItem] = useState(null)
  const [sendTarget, setSendTarget] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const { register, handleSubmit, reset, watch } = useForm({ defaultValues: { priority: 'Medium', targetType: 'All' } })
  const targetType = watch('targetType')

  const fetch = async (page = 1) => {
    setLoading(true)
    try {
      if (isSp) {
        const r = await api.get('/announcements/inbox', { params: { page, limit: 20 } })
        setData(r.data.data); setPagination(r.data.pagination); setUnreadCount(r.data.unreadCount || 0)
      } else {
        const r = await api.get('/announcements/admin', { params: { page, limit: 10 } })
        setData(r.data.data); setPagination(r.data.pagination)
      }
    } catch { toast.error('Failed') } finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [isSp])

  const onCreate = async (d) => {
    try {
      const formData = new FormData()
      Object.entries(d).forEach(([k, v]) => { if (v !== '' && v !== undefined) formData.append(k, v) })
      if (d.attachment?.[0]) formData.set('attachment', d.attachment[0])
      await api.post('/announcements', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Announcement created (draft)'); setModalOpen(false); reset(); fetch()
    } catch (e) { toast.error(e.response?.data?.message || 'Error') }
  }

  const sendAnnouncement = async (id) => {
    try {
      const r = await api.post(`/announcements/${id}/send`)
      toast.success(`Sent to ${r.data.data.recipientCount} recipients`); setSendTarget(null); fetch()
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to send') }
  }

  const markRead = async (id) => {
    try {
      await api.post(`/announcements/${id}/read`)
      setData(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {}
  }

  const deleteAnn = async (id) => {
    try { await api.delete(`/announcements/${id}`); toast.success('Deleted'); fetch() }
    catch { toast.error('Failed') }
  }

  const PRIORITIES = ['High', 'Medium', 'Low']
  const TARGET_TYPES = ['All', 'Specific', 'Region', 'Role']
  const priorityColors = { High: 'bg-red-100 text-red-800 border-red-200', Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200', Low: 'bg-blue-100 text-blue-800 border-blue-200' }

  return (
    <div>
      <PageHeader
        title="Announcements"
        subtitle={isSp && unreadCount > 0 ? `${unreadCount} unread` : `${pagination?.total ?? 0} total`}
        actions={canCreate && <button onClick={() => { reset({ priority: 'Medium', targetType: 'All' }); setModalOpen(true) }} className="btn-primary"><Plus size={16} />New Announcement</button>}
      />

      <div className="space-y-3">
        {loading ? <div className="flex justify-center py-12 bg-white rounded-xl"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>
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
                  <p className="text-xs text-gray-400 mt-2">{new Date(ann.createdAt).toLocaleString()}{ann.createdBy && ` · ${ann.createdBy.name}`}</p>
                  {!isSp && ann._count && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Users size={12} />{ann._count.reads}/{ann._count.recipients} read
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!isSp && ann.status === 'Draft' && canCreate && (
                    <button onClick={e => { e.stopPropagation(); setSendTarget(ann) }} className="btn-primary btn-sm"><Send size={13} />Send</button>
                  )}
                  {!isSp && canCreate && <button onClick={e => { e.stopPropagation(); deleteAnn(ann.id) }} className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded text-gray-400"><Trash2 size={14} /></button>}
                </div>
              </div>
            </div>
          ))
        )}
        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={fetch} />
      </div>

      {/* Create Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Announcement" size="lg">
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
          <FormField label="Title" required>
            <input {...register('title', { required: true })} className="input" placeholder="Announcement title" />
          </FormField>
          <FormField label="Message" required>
            <textarea {...register('message', { required: true })} className="input" rows={4} placeholder="Write your announcement..." />
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
            <FormField label="Regions (comma separated)">
              <input {...register('targetRegions')} className="input" placeholder="North, South, East" />
            </FormField>
          )}
          <FormField label="Expiry Date (optional)">
            <input {...register('expiryDate')} type="date" className="input" />
          </FormField>
          <FormField label="Attachment (optional)">
            <input {...register('attachment')} type="file" className="input py-1.5 text-xs" />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save as Draft</button>
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
              <button onClick={() => sendAnnouncement(sendTarget.id)} className="btn-primary"><Send size={16} />Send Now</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
