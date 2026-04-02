import React from 'react';

export default function MonthlyExpensePrintTemplate({ data }) {
  if (!data || !data.expenses || data.expenses.length === 0) return null;
  const { expenses, template: co = {}, salesperson } = data;

  // Calculate the grand total
  const grandTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div id="print-root-portal">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body > *:not(#print-root-portal) { display: none !important; }
          html, body { margin: 0 !important; padding: 0 !important; height: auto !important; overflow: visible !important; background: white !important; }
          #print-root-portal { display: block !important; position: relative !important; width: 100% !important; visibility: visible !important; }
          #print-root-portal * { visibility: visible !important; }
          
          .print-page { width: 100%; page-break-after: always; page-break-inside: avoid; padding: 40px; box-sizing: border-box; }
          .print-page:last-child { page-break-after: auto; }
          
          .proof-img { max-width: 100%; max-height: 80vh; object-fit: contain; display: block; margin: 0 auto; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #f8f9fa; font-weight: bold; }
        }
      `}} />

      {/* PAGE 1: MONTHLY SUMMARY TABLE */}
      <div className="print-page bg-white text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
        <div className="flex items-start justify-between border-b-2 border-gray-800 pb-4 mb-6">
          <div>
            {co.logoPath && <img src={co.logoPath} alt="" className="h-12 mb-1 object-contain" />}
            <h1 className="text-lg font-bold">{co.companyName || 'Company Name'}</h1>
            <p className="text-xs text-gray-600">{co.companyAddress}</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold uppercase text-gray-800">Expense Report</h2>
            <p className="text-xs text-gray-500">Salesperson: <span className="font-bold text-black">{salesperson?.name || 'All'}</span></p>
            <p className="text-xs text-gray-500">Printed: {new Date().toLocaleDateString('en-IN')}</p>
          </div>
        </div>

        <h3 className="font-bold text-lg mb-2">Consolidated Expenses</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Description</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e, index) => (
              <tr key={e.id}>
                <td>{new Date(e.expenseDate).toLocaleDateString('en-IN')}</td>
                <td>{e.expenseType?.name}</td>
                <td>{e.description}</td>
                <td>{e.status}</td>
                <td style={{ textAlign: 'right' }}>{Number(e.amount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="4" style={{ textAlign: 'right', fontWeight: 'bold' }}>Grand Total:</td>
              <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>₹{grandTotal.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>

        <div className="grid grid-cols-2 gap-12 mt-16 pt-6 border-t border-gray-200">
          <div className="text-center"><div className="border-b border-gray-500 h-10 mb-1"></div><p className="text-xs text-gray-500">Salesperson Signature</p></div>
          <div className="text-center"><div className="border-b border-gray-500 h-10 mb-1"></div><p className="text-xs text-gray-500">Authorised Signatory</p></div>
        </div>
      </div>

      {/* SUBSEQUENT PAGES: THE PROOFS */}
      {expenses.map((e, index) => {
        const isImage = e.proofFilePath && e.proofFilePath.match(/\.(jpeg|jpg|gif|png)$/i) != null;
        if (!isImage) return null; // Skip if no image proof

        return (
          <div key={`proof-${e.id}`} className="print-page bg-white text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
            <div className="border-t-2 border-gray-800 mb-6 pt-4"></div>
            <h3 className="text-xl font-bold mb-2 text-gray-800 text-center">Expense Proof Attachment</h3>
            <div className="text-center mb-6 text-xs text-gray-500 space-y-1">
              <p><strong>Date:</strong> {new Date(e.expenseDate).toLocaleDateString('en-IN')}</p>
              <p><strong>Description:</strong> {e.description} | <strong>Amount:</strong> ₹{Number(e.amount).toLocaleString()}</p>
            </div>
            
            <div className="flex justify-center">
              <img src={e.proofFilePath} alt="Expense Proof" className="proof-img border border-gray-200 shadow-sm" />
            </div>
          </div>
        );
      })}
    </div>
  );
}