import { useEffect, useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { Modal, ConfirmDialog, Pagination, StatusBadge, PageHeader, EmptyState, FormField, SearchInput } from '../components/index.jsx'
import { Plus, Eye, Check, X, Receipt, Paperclip, Send, ArrowLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import MonthlyExpensePrintTemplate from '../components/MonthlyExpensePrintTemplate'

export default function ExpensesPage() {
  const { user, hasPermission } = useAuth()
  const isSp = user.role === 'Salesperson'
  const canApprove = hasPermission('ExpenseManagement', 'FullAccess') || user.role === 'SuperAdmin'
  
  // --- STATES ---
  const [data, setData] = useState([])
  const [adminReports, setAdminReports] = useState([]) 
  const [selectedSp, setSelectedSp] = useState(null)   
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 })
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [viewItem, setViewItem] = useState(null)
  const [actionTarget, setActionTarget] = useState(null)
  const [expenseTypes, setExpenseTypes] = useState([])
  const [typeModalOpen, setTypeModalOpen] = useState(false)
  const [printData, setPrintData] = useState(null)
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm()
  const { register: reg2, handleSubmit: hs2, reset: rst2 } = useForm()

  // --- FETCHING LOGIC ---
  const fetchData = async (page = 1) => {
    setLoading(true)
    try {
      if (isSp) {
        // 1. Salesperson View: Fetch their own expenses
        const r = await api.get('/expenses', { params: { page, limit: 10, status: statusFilter, search } })
        setData(r.data.data); setPagination(r.data.pagination)
      } else if (selectedSp) {
        // 2. Admin Detailed View: Fetch specific Salesperson's expenses
        const r = await api.get('/expenses', { params: { page, limit: 10, salespersonId: selectedSp.id, status: statusFilter, search } })
        setData(r.data.data); setPagination(r.data.pagination)
      } else {
        // 3. Admin Main Dashboard: Fetch grouped reports
        const r = await api.get('/expenses/reports/admin', { params: { search } })
        setAdminReports(r.data.data)
      }
    } catch { 
      toast.error('Failed to fetch data') 
    } finally { 
      setLoading(false) 
    }
  }

  useEffect(() => { fetchData() }, [statusFilter, search, selectedSp]) 
  
  const fetchExpenseTypes = () => { api.get('/expenses/types').then(r => setExpenseTypes(r.data.data)).catch(() => {}) }
  useEffect(() => { fetchExpenseTypes() }, [])

  // --- ACTIONS ---
  const onSubmit = async (d) => {
    try {
      const formData = new FormData()
      Object.entries(d).forEach(([k, v]) => { if (v !== undefined && v !== '') formData.append(k, v) })
      if (d.proof?.[0]) formData.set('proof', d.proof[0])
      await api.post('/expenses', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Expense saved as draft'); setModalOpen(false); reset(); fetchData()
    } catch (e) { toast.error(e.response?.data?.message || 'Error') }
  }

  const submitMonthlyReport = async () => {
    if (!window.confirm('Submit all draft expenses to Admin? You cannot edit them after.')) return;
    setLoading(true);
    try {
      await api.post('/expenses/submit-batch');
      toast.success('Monthly expenses submitted!'); fetchData(); 
    } catch (error) { toast.error(error.response?.data?.message || 'Failed'); } finally { setLoading(false); }
  };

  const handlePrintReport = async () => {
    setLoading(true);
    try {
      const printParams = { limit: 1000, status: statusFilter, search };
      if (selectedSp) printParams.salespersonId = selectedSp.id;

      const res = await api.get('/expenses', { params: printParams });
      const allExpenses = res.data.data;
      
      if (allExpenses.length === 0) { toast.error('No expenses found to print.'); return; }

      setPrintData({
        expenses: allExpenses,
        salesperson: isSp ? user : { name: selectedSp?.name || 'All' },
        template: { companyName: 'Company Name', companyAddress: 'Company Address Here' }
      });

      setTimeout(() => { window.print(); setPrintData(null); }, 500);
    } catch (error) { toast.error('Failed to generate print report'); } finally { setLoading(false); }
  };

  // --- UPDATED ACTIONS WITH ERROR HANDLING ---
  const approveExpense = async (d) => {
    try { 
      await api.patch(`/expenses/${actionTarget.id}/approve`, { remarks: d.remarks }); 
      toast.success('Approved'); 
      setActionTarget(null); 
      rst2(); 
      fetchData() 
    } catch (error) { 
      toast.error(error.response?.data?.message || 'Failed to approve expense');
    }
  }

  const rejectExpense = async (d) => {
    try { 
      await api.patch(`/expenses/${actionTarget.id}/reject`, { rejectionReason: d.rejectionReason }); 
      toast.success('Rejected'); 
      setActionTarget(null); 
      rst2(); 
      fetchData() 
    } catch (error) { 
      toast.error(error.response?.data?.message || 'Failed to reject expense');
    }
  }

  // --- NEW: Bulk Approve Function ---
  const handleBulkApprove = async () => {
    if (!window.confirm(`Are you sure you want to approve ALL pending expenses for ${selectedSp.name}?`)) {
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/expenses/bulk-approve', { salespersonId: selectedSp.id });
      toast.success(res.data.message || 'All pending expenses approved!');
      fetchData(); 
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to bulk approve');
    } finally {
      setLoading(false);
    }
  };

  const toggleTypeStatus = async (type) => {
    const newStatus = type.status === 'Active' ? 'Inactive' : 'Active';
    try { await api.put(`/expenses/types/${type.id}`, { status: newStatus }); toast.success(`Marked as ${newStatus}`); fetchExpenseTypes(); } 
    catch { toast.error('Failed to update status'); }
  };

  const createType = async (d) => {
    try { await api.post('/expenses/types', d); toast.success('Type created'); setTypeModalOpen(false); rst2(); fetchExpenseTypes(); }
    catch (e) { toast.error(e.response?.data?.message || 'Error') }
  }

  const canManageTypes = hasPermission('ExpenseTypeManagement', 'FullAccess') || user.role === 'SuperAdmin'

  // --- RENDERING ---
  const showDetailView = isSp || selectedSp !== null;

  return (
    <div>
      <PageHeader 
        title={isSp ? 'My Expenses' : (selectedSp ? `Expenses: ${selectedSp.name}` : 'Expense Reports')} 
        subtitle={!showDetailView ? `${adminReports.length} Salespersons` : `${pagination?.total ?? 0} records`}
        actions={
          <div className="flex gap-2">
            
            {/* Back Button for Admin viewing details */}
            {!isSp && selectedSp && (
              <button onClick={() => setSelectedSp(null)} className="btn-secondary flex items-center gap-1 mr-2">
                <ArrowLeft size={16} /> Back to Reports
              </button>
            )}

            {/* NEW: Bulk Approve Button */}
            {!isSp && selectedSp && canApprove && data.some(e => e.status === 'Pending') && (
              <button 
                onClick={handleBulkApprove} 
                className="btn-secondary bg-green-600 hover:bg-green-700 text-white flex items-center gap-1"
                disabled={loading}
              >
                <Check size={16} /> Approve All Pending
              </button>
            )}

            {/* Print Button (Only in Detail View) */}
            {showDetailView && (
              <button onClick={handlePrintReport} className="btn-secondary flex items-center gap-1" disabled={loading}>
                <Receipt size={16} /> Print Report
              </button>
            )}

            {/* Admin Management Tools */}
            {!isSp && !selectedSp && canManageTypes && (
              <button onClick={() => setTypeModalOpen(true)} className="btn-secondary">Manage Types</button>
            )}
            
            {/* SP Only Tools */}
            {isSp && (
              <button onClick={submitMonthlyReport} className="btn-secondary bg-green-600 hover:bg-green-700 text-white flex items-center gap-1">
                <Send size={16} /> Submit Monthly Report
              </button>
            )}
            {isSp && (
              <button onClick={() => { reset({}); setModalOpen(true) }} className="btn-primary">
                <Plus size={16} /> Add Expense
              </button>
            )}
          </div>
        } 
      />

      <div className="card">
        <div className="mb-4 flex gap-4">
          <SearchInput value={search} onChange={setSearch} placeholder={!showDetailView ? "Search salesperson..." : "Search description, budget..."} />
          {showDetailView && (
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-40">
              <option value="">All Status</option>
              {isSp && <option value="Draft">Draft</option>}
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          )}
        </div>

        {loading ? <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>
        : !showDetailView ? (
          /* ========================================= */
          /* ADMIN DASHBOARD VIEW (Grouped by SP)      */
          /* ========================================= */
          adminReports.length === 0 ? <EmptyState icon={Receipt} title="No expense reports found" /> :
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Salesperson</th><th>Total Expenses</th><th>Pending Amount</th><th>Total Amount</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {adminReports.map(rep => (
                  <tr key={rep.salespersonId}>
                    <td>
                      <div className="font-medium text-sm">{rep.name}</div>
                      <div className="text-xs text-gray-500">{rep.employeeId} | {rep.region}</div>
                    </td>
                    <td><span className="font-medium">{rep.totalExpenses}</span> <span className="text-xs text-gray-500">({rep.pendingCount} pending)</span></td>
                    <td className="font-semibold text-orange-600">₹{rep.pendingAmount.toLocaleString()}</td>
                    <td className="font-semibold text-green-700">₹{rep.totalAmount.toLocaleString()}</td>
                    <td>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${rep.pendingCount > 0 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                        {rep.status}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => setSelectedSp({ id: rep.salespersonId, name: rep.name })} className="btn-secondary btn-sm">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* ========================================= */
          /* DETAILED LINE-ITEM VIEW (SP or Admin)     */
          /* ========================================= */
          data.length === 0 ? <EmptyState icon={Receipt} title="No expenses found" /> :
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Amount</th><th>Status</th><th>Proof</th><th>Actions</th></tr></thead>
              <tbody>
                {data.map(e => (
                  <tr key={e.id}>
                    <td className="text-xs text-gray-500">{new Date(e.expenseDate).toLocaleDateString()}</td>
                    <td className="text-sm">{e.expenseType?.name}</td>
                    <td className="text-sm max-w-xs truncate">{e.description}</td>
                    <td className="font-semibold text-green-700">₹{Number(e.amount).toLocaleString()}</td>
                    <td><StatusBadge status={e.status} /></td>
                    <td>{e.proofFilePath ? <a href={e.proofFilePath} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs flex items-center gap-1"><Paperclip size={12} />View</a> : <span className="text-gray-300 text-xs">None</span>}</td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => setViewItem(e)} className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded text-gray-400"><Eye size={14} /></button>
                        {canApprove && !isSp && e.status === 'Pending' && (
                          <>
                            <button onClick={() => { setActionTarget({ ...e, action: 'approve' }); rst2() }} className="p-1.5 hover:bg-green-50 hover:text-green-600 rounded text-gray-400"><Check size={14} /></button>
                            <button onClick={() => { setActionTarget({ ...e, action: 'reject' }); rst2() }} className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded text-gray-400"><X size={14} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={fetchData} />
          </div>
        )}
      </div>

      {/* MODALS REMAIN THE SAME BELOW */}
      
      {/* Submit Expense Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Expense (Draft)">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Expense Type" required error={errors.expenseTypeId?.message}>
            <select {...register('expenseTypeId', { required: true })} className="input">
              <option value="">Select type</option>
              {expenseTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </FormField>
          <FormField label="Description" required error={errors.description?.message}>
            <input {...register('description', { required: true })} className="input" placeholder="Describe the expense" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Amount (₹)" required error={errors.amount?.message}>
              <input {...register('amount', { required: true })} type="number" step="0.01" className="input" />
            </FormField>
            <FormField label="Expense Date" required error={errors.expenseDate?.message}>
              <input {...register('expenseDate', { required: true })} type="date" className="input" />
            </FormField>
          </div>
          <FormField label="Proof/Receipt (optional)">
            <input {...register('proof')} type="file" accept="image/*,.pdf" className="input py-1.5 text-xs" />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save as Draft</button>
          </div>
        </form>
      </Modal>

      {/* Approve/Reject Modal */}
      {actionTarget && (
        <Modal open={!!actionTarget} onClose={() => setActionTarget(null)} title={actionTarget.action === 'approve' ? 'Approve Expense' : 'Reject Expense'}>
          <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
            <p className="text-gray-600">{actionTarget.expenseType?.name} - ₹{Number(actionTarget.amount).toLocaleString()}</p>
            <p className="text-gray-500 text-xs">{actionTarget.description}</p>
          </div>
          <form onSubmit={hs2(actionTarget.action === 'approve' ? approveExpense : rejectExpense)} className="space-y-4">
            {actionTarget.action === 'approve' ? (
              <FormField label="Remarks (optional)"><textarea {...reg2('remarks')} className="input" rows={2} /></FormField>
            ) : (
              <FormField label="Rejection Reason" required>
                <textarea {...reg2('rejectionReason', { required: true })} className="input" rows={2} placeholder="Please provide reason..." />
              </FormField>
            )}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setActionTarget(null)} className="btn-secondary">Cancel</button>
              <button type="submit" className={actionTarget.action === 'approve' ? 'btn-success' : 'btn-danger'}>
                {actionTarget.action === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Manage Types Modal */}
      <Modal open={typeModalOpen} onClose={() => setTypeModalOpen(false)} title="Expense Types">
        <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2">
          {expenseTypes.map(t => (
            <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <span className="text-sm font-medium">{t.name}</span>
                {t.description && <span className="text-xs text-gray-500 block">{t.description}</span>}
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={t.status} />
                <button 
                  type="button" 
                  onClick={() => toggleTypeStatus(t)}
                  className={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${t.status === 'Active' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                >
                  {t.status === 'Active' ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={hs2(createType)} className="space-y-3 border-t pt-4">
          <h4 className="font-medium text-sm">Add New Type</h4>
          <FormField label="Name"><input {...reg2('name', { required: true })} className="input" placeholder="Travel, Food..." /></FormField>
          <FormField label="Description"><input {...reg2('description')} className="input" /></FormField>
          <button type="submit" className="btn-primary w-full justify-center">Add Type</button>
        </form>
      </Modal>

      {/* View Item Modal */}
      {viewItem && (
        <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="Expense Details">
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-gray-500">Type:</span> <span className="font-medium">{viewItem.expenseType?.name}</span></div>
              <div><span className="text-gray-500">Amount:</span> <span className="font-semibold text-green-700">₹{Number(viewItem.amount).toLocaleString()}</span></div>
              <div><span className="text-gray-500">Date:</span> <span>{new Date(viewItem.expenseDate).toLocaleDateString()}</span></div>
              <div className="col-span-2"><span className="text-gray-500">Description:</span> <span>{viewItem.description}</span></div>
              <div><span className="text-gray-500">Status:</span> <StatusBadge status={viewItem.status} /></div>
              {viewItem.approvedBy && <div><span className="text-gray-500">Approved by:</span> <span>{viewItem.approvedBy?.name}</span></div>}
              {viewItem.rejectionReason && <div className="col-span-2"><span className="text-gray-500">Rejection reason:</span> <span className="text-red-600">{viewItem.rejectionReason}</span></div>}
              {viewItem.remarks && <div className="col-span-2"><span className="text-gray-500">Remarks:</span> <span>{viewItem.remarks}</span></div>}
            </div>
            {viewItem.proofFilePath && <div className="pt-2"><a href={viewItem.proofFilePath} target="_blank" rel="noreferrer" className="btn-secondary btn-sm"><Paperclip size={14} />View Proof</a></div>}
          </div>
        </Modal>
      )}

      {printData && <MonthlyExpensePrintTemplate data={printData} />}
    </div>
  )
}