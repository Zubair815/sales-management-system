import React from 'react';

export default function OrderPrintTemplate({ data }) {
  if (!data) return null;
  const { order: o, template: co = {} } = data;

  // FIX 1: Support both 'items' and 'orderItems' depending on your backend structure
  const itemsList = o.orderItems || o.items || [];

  return (
    // FIX 2: Removed max-w-3xl and added w-full to make it use the whole page width
    <div className="order-print-container bg-white p-8 w-full text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden !important; }
          .order-print-container, .order-print-container * { visibility: visible !important; }
          
          .order-print-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important; /* Force full width on paper */
            margin: 0 !important;
            padding: 40px !important; /* Standard print margins */
            background: white !important;
          }

          html, body, #root, .modal-overlay, .modal-content, [class*="fixed"], [class*="overflow"] {
            height: auto !important;
            overflow: visible !important;
            max-height: none !important;
            position: static !important;
          }

          th {
            background-color: #1f2937 !important;
            color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .status-badge {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          table { width: 100% !important; border-collapse: collapse; }
        }
      `}} />

      {/* HEADER SECTION */}
      <div className="flex justify-between items-start border-b border-gray-300 pb-6 mb-6">
        <div>
          {co.logoPath && <img src={co.logoPath} alt="Logo" className="h-16 mb-2 object-contain" />}
          <h1 className="text-xl font-bold text-blue-800">{co.companyName || 'Your Company Name'}</h1>
          <div className="text-gray-600 text-xs mt-1 space-y-0.5">
            <p>{co.companyAddress}</p>
            {co.companyPhone && <p>Tel: {co.companyPhone}</p>}
            {co.companyEmail && <p>Email: {co.companyEmail}</p>}
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold text-gray-800 mb-1 tracking-wider">ORDER</h2>
          <p className="text-gray-500 text-sm mb-1">#{o.orderNumber}</p>
          <p className="text-gray-500 text-sm mb-3">Date: {new Date(o.createdAt).toLocaleDateString('en-IN')}</p>
          <span className="status-badge inline-block px-3 py-1 bg-blue-50 text-blue-600 font-semibold rounded text-xs border border-blue-200">
            {o.status}
          </span>
        </div>
      </div>

      {/* INFO GRIDS */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Salesperson</h3>
          <div className="text-sm">
            <p className="font-bold text-gray-800">{o.salesperson?.name}</p>
            <p className="text-gray-600">ID: {o.salesperson?.employeeId}</p>
            <p className="text-gray-600">Region: {o.salesperson?.region}</p>
            <p className="text-gray-600">Phone: {o.salesperson?.phone}</p>
          </div>
        </div>
        
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Bill To</h3>
          <div className="text-sm">
            <p className="font-bold text-gray-800">{o.party?.name}</p>
            <p className="text-gray-600">Phone: {o.party?.phone}</p>
            <p className="text-gray-600 whitespace-pre-line">{o.party?.address}</p>
            <p className="text-gray-600">{o.party?.city}, {o.party?.state}</p>
            {o.party?.gstNumber && <p className="text-gray-600 mt-1">GST: {o.party?.gstNumber}</p>}
          </div>
        </div>
      </div>

      {/* TABLE */}
      <table className="w-full mb-8 text-sm text-left">
        <thead>
          <tr className="bg-gray-900 text-white">
            <th className="py-2 px-3 w-12 border-b border-gray-700">#</th>
            <th className="py-2 px-3 border-b border-gray-700">Item</th>
            <th className="py-2 px-3 border-b border-gray-700">SKU</th>
            <th className="py-2 px-3 border-b border-gray-700">Unit</th>
            <th className="py-2 px-3 text-center border-b border-gray-700">Qty</th>
            <th className="py-2 px-3 text-right border-b border-gray-700">Unit Price</th>
            <th className="py-2 px-3 text-right border-b border-gray-700">Total</th>
          </tr>
        </thead>
        <tbody>
          {itemsList.map((item, index) => (
            <tr key={item.id || index} className="border-b border-gray-200">
              <td className="py-3 px-3 text-gray-600">{index + 1}</td>
              <td className="py-3 px-3 font-medium">{item.inventoryItem?.name || item.itemName}</td>
              <td className="py-3 px-3 text-gray-600">{item.inventoryItem?.sku || item.sku}</td>
              <td className="py-3 px-3 text-gray-600">{item.inventoryItem?.unit || item.unit}</td>
              <td className="py-3 px-3 text-center">{item.quantity}</td>
              <td className="py-3 px-3 text-right">₹{Number(item.unitPrice).toLocaleString()}</td>
              <td className="py-3 px-3 text-right font-medium">₹{Number(item.totalPrice).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* TOTALS */}
      <div className="flex justify-end w-full">
        <div className="w-72 space-y-2 text-sm pr-3">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal:</span>
            <span>₹{Number(o.totalAmount).toLocaleString()}</span>
          </div>
          {Number(o.taxAmount) > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Tax:</span>
              <span>₹{Number(o.taxAmount).toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-300">
            <span>Grand Total:</span>
            <span>₹{Number(o.grandTotal).toLocaleString()}</span>
          </div>
        </div>
      </div>
      
    </div>
  );
}