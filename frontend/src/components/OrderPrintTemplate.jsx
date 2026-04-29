import React from 'react';

export default function OrderPrintTemplate({ data }) {
  // FIX: M-9 — show a user-visible message instead of returning blank/null
  if (!data) return (
    <div style={{ padding: 32, fontFamily: 'sans-serif' }}>
      <p>No order data available to print.</p>
    </div>
  );
  const { order: o, template: co = {} } = data;

  const itemsList = o.orderItems || o.items || [];

  return (
    <div className="order-print-container bg-white" style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', color: '#333' }}>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden !important; }
          .order-print-container, .order-print-container * { visibility: visible !important; }
          
          .order-print-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 40px !important;
            background: white !important;
          }

          html, body, #root, .modal-overlay, .modal-content, [class*="fixed"], [class*="overflow"] {
            height: auto !important;
            overflow: visible !important;
            max-height: none !important;
            position: static !important;
          }

          .print-header-bg {
            background-color: #f3f4f6 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print-table th {
            background-color: #f8fafc !important;
            color: #1e293b !important;
            font-weight: 600 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            border-bottom: 2px solid #cbd5e1 !important;
          }

          .print-table td {
            border-bottom: 1px solid #e2e8f0 !important;
          }

          .status-badge {
            border: 1px solid #cbd5e1 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          table { width: 100% !important; border-collapse: collapse; }
        }
      `}} />

      {/* HEADER SECTION */}
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
          <h2 className="text-4xl font-light text-gray-400 mb-2 tracking-widest uppercase">Order</h2>
          <div className="print-header-bg p-4 rounded-lg border border-gray-200 mt-2 min-w-[200px]">
            <div className="flex justify-between mb-1">
              <span className="text-gray-500 font-semibold text-sm">Order No:</span>
              <span className="font-bold text-gray-900">{o.orderNumber}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-500 font-semibold text-sm">Date:</span>
              <span className="text-gray-900">{new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-300">
              <span className="text-gray-500 font-semibold text-sm">Status:</span>
              <span className="status-badge px-2 py-1 bg-white text-gray-800 font-bold rounded text-xs uppercase tracking-wider">
                {o.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* INFO GRIDS */}
      <div className="flex gap-8 mb-8">
        <div className="flex-1">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">Bill To</h3>
          <div className="text-sm mt-2">
            <p className="font-bold text-gray-900 text-base mb-1">{o.party?.name}</p>
            <p className="text-gray-700 whitespace-pre-line leading-relaxed">{o.party?.address}</p>
            <p className="text-gray-700">{o.party?.city}, {o.party?.state}</p>
            {o.party?.phone && <p className="text-gray-700 mt-1">Phone: {o.party?.phone}</p>}
            {o.party?.gstNumber && <p className="text-gray-700 font-medium mt-1">GSTIN: {o.party?.gstNumber}</p>}
          </div>
        </div>
        
        <div className="flex-1">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">Sales Representative</h3>
          <div className="text-sm mt-2">
            <p className="font-bold text-gray-900 text-base mb-1">{o.salesperson?.name}</p>
            <p className="text-gray-700">Emp ID: {o.salesperson?.employeeId}</p>
            <p className="text-gray-700">Region: {o.salesperson?.region}</p>
            <p className="text-gray-700">Phone: {o.salesperson?.phone}</p>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="mb-8">
        <table className="print-table w-full text-sm text-left">
          <thead>
            <tr>
              <th className="py-3 px-4 w-12 text-center">#</th>
              <th className="py-3 px-4">Description</th>
              <th className="py-3 px-4 w-24">SKU</th>
              <th className="py-3 px-4 text-center w-20">Qty</th>
              <th className="py-3 px-4 text-center w-20">Unit</th>
              <th className="py-3 px-4 text-right w-28">Price</th>
              <th className="py-3 px-4 text-right w-32">Total</th>
            </tr>
          </thead>
          <tbody>
            {itemsList.map((item, index) => (
              <tr key={item.id || index}>
                <td className="py-3 px-4 text-center text-gray-500">{index + 1}</td>
                <td className="py-3 px-4 font-medium text-gray-900">{item.inventoryItem?.name || item.itemName}</td>
                <td className="py-3 px-4 text-gray-500 text-xs">{item.inventoryItem?.sku || item.sku}</td>
                <td className="py-3 px-4 text-center font-medium">{item.quantity}</td>
                <td className="py-3 px-4 text-center text-gray-500">{item.inventoryItem?.unit || item.unit}</td>
                <td className="py-3 px-4 text-right text-gray-700">₹{Number(item.unitPrice).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td className="py-3 px-4 text-right font-semibold text-gray-900">₹{Number(item.totalPrice).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* TOTALS AND FOOTER */}
      <div className="flex justify-between items-start mt-8 pt-4">
        <div className="w-1/2 pr-8">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Terms & Conditions</h4>
          <p className="text-xs text-gray-500 leading-relaxed">
            1. All checks are to be made payable to {co.companyName || 'the company'}.<br/>
            2. Any discrepancies must be reported within 7 days.<br/>
            3. Thank you for your business!
          </p>
        </div>
        <div className="w-1/2">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 print-header-bg">
            <div className="flex justify-between text-gray-600 mb-2">
              <span className="font-medium">Subtotal</span>
              <span>₹{Number(o.totalAmount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            {Number(o.taxAmount) > 0 && (
              <div className="flex justify-between text-gray-600 mb-2">
                <span className="font-medium">Tax</span>
                <span>₹{Number(o.taxAmount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-xl pt-3 mt-2 border-t border-gray-300 text-gray-900">
              <span>Total Amount</span>
              <span>₹{Number(o.grandTotal).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SIGNATURES */}
      <div className="flex justify-between items-end mt-24">
        <div className="text-center w-48">
          <div className="border-b border-gray-400 h-8 mb-2"></div>
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer Signature</p>
        </div>
        <div className="text-center w-48">
          <div className="border-b border-gray-400 h-8 mb-2"></div>
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Authorized Signatory</p>
        </div>
      </div>
      
    </div>
  );
}