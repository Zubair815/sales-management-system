import React from 'react';

export default function MonthlyExpensePrintTemplate({ data }) {
  if (!data || !data.expenses || data.expenses.length === 0) return null;
  const { expenses, template: co = {}, salesperson } = data;

  const grandTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div id="print-root-portal">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body > *:not(#print-root-portal) { display: none !important; }
          html, body { margin: 0 !important; padding: 0 !important; height: auto !important; overflow: visible !important; background: white !important; }
          #print-root-portal { display: block !important; position: relative !important; width: 100% !important; visibility: visible !important; }
          #print-root-portal * { visibility: visible !important; }
          
          .print-page { 
            width: 100%; 
            page-break-after: always; 
            page-break-inside: avoid; 
            padding: 40px; 
            box-sizing: border-box; 
            background: white !important;
          }
          .print-page:last-child { page-break-after: auto; }
          
          .proof-img { 
            max-width: 100%; 
            max-height: 80vh; 
            object-fit: contain; 
            display: block; 
            margin: 0 auto; 
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          
          .expense-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px; 
          }
          .expense-table th { 
            background-color: #f8fafc !important; 
            color: #1e293b !important;
            font-weight: 600; 
            padding: 12px 16px;
            text-align: left;
            border-bottom: 2px solid #cbd5e1 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .expense-table td { 
            padding: 12px 16px; 
            border-bottom: 1px solid #e2e8f0 !important;
            color: #334155;
          }
          .expense-table tfoot td {
            background-color: #f1f5f9 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .print-header-box {
            background-color: #f8fafc !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 8px;
            padding: 16px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}} />

      {/* PAGE 1: MONTHLY SUMMARY TABLE */}
      <div className="print-page bg-white" style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', color: '#333' }}>
        <div className="flex justify-between items-start mb-8">
          <div className="flex-1">
            {co.logoPath && <img src={co.logoPath} alt="Logo" className="h-16 mb-4 object-contain" />}
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{co.companyName || 'Your Company Name'}</h1>
            <div className="text-gray-600 text-sm space-y-0.5 max-w-sm">
              <p className="whitespace-pre-line">{co.companyAddress}</p>
              {co.companyPhone && <p>Phone: {co.companyPhone}</p>}
              {co.companyEmail && <p>Email: {co.companyEmail}</p>}
            </div>
          </div>
          <div className="text-right flex-1 flex flex-col items-end">
            <h2 className="text-4xl font-light text-gray-400 mb-2 tracking-widest uppercase">Expenses</h2>
            <div className="print-header-box mt-2 min-w-[250px] text-left">
              <div className="flex justify-between mb-2">
                <span className="text-gray-500 font-semibold text-sm">Employee:</span>
                <span className="font-bold text-gray-900">{salesperson?.name || 'All Staff'}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-500 font-semibold text-sm">Report Date:</span>
                <span className="text-gray-900">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                <span className="text-gray-500 font-semibold text-sm">Total Value:</span>
                <span className="font-bold text-lg text-gray-900">Rs {grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
            </div>
          </div>
        </div>

        <h3 className="font-bold text-lg mb-4 text-gray-800 border-b border-gray-200 pb-2">Consolidated Expense Report</h3>
        <table className="expense-table">
          <thead>
            <tr>
              <th className="w-32">Date</th>
              <th className="w-48">Type</th>
              <th>Description</th>
              <th className="w-32 text-center">Status</th>
              <th className="w-32 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id}>
                <td className="text-sm">{new Date(e.expenseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                <td className="font-medium text-gray-800 text-sm">{e.expenseType?.name}</td>
                <td className="text-sm">{e.description || '-'}</td>
                <td className="text-center">
                  <span className="px-2 py-1 text-xs font-semibold rounded-full border border-gray-300 bg-white">
                    {e.status}
                  </span>
                </td>
                <td className="text-right font-medium text-gray-900">Rs {Number(e.amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="4" className="text-right font-bold text-gray-700 py-4">Total Expenses for Period:</td>
              <td className="text-right font-bold text-lg text-gray-900 py-4">Rs {grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            </tr>
          </tfoot>
        </table>

        <div className="flex justify-between items-end mt-24">
          <div className="text-center w-56">
            <div className="border-b border-gray-400 h-8 mb-2"></div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Employee Signature</p>
          </div>
          <div className="text-center w-56">
            <div className="border-b border-gray-400 h-8 mb-2"></div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Authorized Manager</p>
          </div>
        </div>
      </div>

      {/* SUBSEQUENT PAGES: THE PROOFS */}
      {expenses.map((e) => {
        const isImage = e.proofFilePath && e.proofFilePath.match(/\.(jpeg|jpg|gif|png)$/i) != null;
        if (!isImage) return null;

        return (
          <div key={`proof-${e.id}`} className="print-page bg-white" style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
            <div className="border-t-4 border-gray-100 mb-8 pt-6"></div>
            
            <div className="text-center mb-8">
              <h3 className="text-2xl font-light text-gray-500 uppercase tracking-widest mb-4">Receipt Attachment</h3>
              <div className="inline-block text-left bg-gray-50 border border-gray-200 rounded-lg p-4 min-w-[300px]">
                <div className="flex justify-between mb-1 text-sm">
                  <span className="text-gray-500 font-medium mr-4">Date:</span>
                  <span className="text-gray-900 font-semibold">{new Date(e.expenseDate).toLocaleDateString('en-IN')}</span>
                </div>
                <div className="flex justify-between mb-1 text-sm">
                  <span className="text-gray-500 font-medium mr-4">Category:</span>
                  <span className="text-gray-900">{e.expenseType?.name}</span>
                </div>
                <div className="flex justify-between mb-1 text-sm">
                  <span className="text-gray-500 font-medium mr-4">Amount:</span>
                  <span className="text-gray-900 font-bold">Rs {Number(e.amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                {e.description && (
                  <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600">
                    {e.description}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-center p-4 bg-gray-50 rounded-xl border border-gray-100">
              <img src={e.proofFilePath} alt="Expense Proof" className="proof-img" />
            </div>
          </div>
        );
      })}
    </div>
  );
}