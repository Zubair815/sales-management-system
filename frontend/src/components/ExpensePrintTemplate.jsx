export default function ExpensePrintTemplate({ data }) {
  if (!data) return null
  const { expenses = [], salesperson, template: co = {}, month } = data
  const total = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0)
  const approved = expenses.filter(e => e.status === 'Approved').reduce((s, e) => s + parseFloat(e.amount || 0), 0)

  const byType = {}
  expenses.forEach(e => {
    const t = e.expenseType?.name || 'Other'
    if (!byType[t]) byType[t] = 0
    byType[t] += parseFloat(e.amount || 0)
  })

  return (
    <div className="bg-white p-8 max-w-3xl mx-auto text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-gray-800 pb-4 mb-5">
        <div>
          {co.logoPath && <img src={co.logoPath} alt="" className="h-14 mb-1 object-contain" />}
          <h1 className="text-lg font-bold">{co.companyName || 'Company Name'}</h1>
          <p className="text-xs text-gray-600">{co.companyAddress}</p>
          {co.companyPhone && <p className="text-xs text-gray-600">Tel: {co.companyPhone}</p>}
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold text-gray-800 uppercase">Expense Report</h2>
          <p className="text-xs text-gray-500">Period: {month || new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {/* Salesperson */}
      <div className="bg-gray-50 p-3 rounded mb-5">
        <p className="font-semibold text-xs text-gray-600 uppercase mb-1">Submitted By</p>
        <p className="font-medium">{salesperson?.name}</p>
        <p className="text-xs text-gray-500">ID: {salesperson?.employeeId} | Region: {salesperson?.region || '-'}</p>
      </div>

      {/* Expenses Table */}
      <table className="w-full border-collapse mb-5 text-xs">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th className="p-2 text-left">Date</th>
            <th className="p-2 text-left">Type</th>
            <th className="p-2 text-left">Description</th>
            <th className="p-2 text-right">Amount</th>
            <th className="p-2 text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((e, i) => (
            <tr key={e.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="p-2 border-b border-gray-100">{new Date(e.expenseDate).toLocaleDateString('en-IN')}</td>
              <td className="p-2 border-b border-gray-100">{e.expenseType?.name}</td>
              <td className="p-2 border-b border-gray-100">{e.description}</td>
              <td className="p-2 border-b border-gray-100 text-right font-semibold">₹{Number(e.amount).toLocaleString()}</td>
              <td className="p-2 border-b border-gray-100 text-center">
                <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                  e.status === 'Approved' ? 'bg-green-100 text-green-800' :
                  e.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                }`}>{e.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary by type */}
      <div className="grid grid-cols-2 gap-6 mb-5">
        <div>
          <p className="font-semibold text-xs text-gray-600 uppercase mb-2">Summary by Category</p>
          {Object.entries(byType).map(([type, amount]) => (
            <div key={type} className="flex justify-between text-xs py-1 border-b border-gray-100">
              <span className="text-gray-600">{type}</span>
              <span className="font-semibold">₹{amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col justify-end">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-gray-500">Total Submitted:</span><span>₹{total.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Total Approved:</span><span className="text-green-700">₹{approved.toLocaleString()}</span></div>
            <div className="flex justify-between font-bold text-sm border-t border-gray-800 pt-1">
              <span>Grand Total:</span><span>₹{total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Approval section */}
      <div className="border border-gray-200 rounded p-4 mb-5">
        <p className="font-semibold text-xs text-gray-600 uppercase mb-3">Approval Details</p>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <p className="text-gray-500">Approved By</p>
            <p className="font-medium mt-1">{expenses.find(e => e.approvedBy)?.approvedBy?.name || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500">Approval Date</p>
            <p className="font-medium mt-1">{expenses.find(e => e.approvedAt) ? new Date(expenses.find(e => e.approvedAt).approvedAt).toLocaleDateString('en-IN') : '—'}</p>
          </div>
          <div>
            <p className="text-gray-500">Status</p>
            <p className="font-medium mt-1">{expenses.every(e => e.status === 'Approved') ? '✅ All Approved' : expenses.some(e => e.status === 'Pending') ? '⏳ Pending' : '⚠️ Mixed'}</p>
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-12 mt-8 pt-4 border-t border-gray-300">
        <div className="text-center">
          <div className="border-b border-gray-600 h-10 mb-1"></div>
          <p className="text-xs text-gray-600">Employee Signature</p>
        </div>
        <div className="text-center">
          <div className="border-b border-gray-600 h-10 mb-1"></div>
          <p className="text-xs text-gray-600">Approved By</p>
        </div>
      </div>

      <p className="text-center text-xs text-gray-400 mt-4">{co.footerText || 'All expenses subject to company policy.'}</p>
      <p className="text-center text-xs text-gray-300">Printed: {new Date().toLocaleString('en-IN')}</p>
    </div>
  )
}
