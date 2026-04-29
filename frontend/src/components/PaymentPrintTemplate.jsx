import { amountToWords } from '../utils/numberToWords'

export default function PaymentPrintTemplate({ data }) {
  if (!data) return null;
  const { payment: p, template: co = {} } = data;

  const isImage = p.proofFilePath && p.proofFilePath.match(/\.(jpeg|jpg|gif|png)$/i) != null;

  return (
    <div className="payment-print-container bg-white" style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', color: '#333' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden !important; }
          .payment-print-container, .payment-print-container * { visibility: visible !important; }
          
          .payment-print-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          html, body, #root, .modal-overlay, .modal-content, [class*="fixed"], [class*="overflow"] {
            height: auto !important;
            overflow: visible !important;
            max-height: none !important;
            position: static !important;
          }

          .print-section {
            display: block !important;
            width: 100% !important;
            page-break-after: always !important;
            padding: 40px !important;
            box-sizing: border-box !important;
            background: white !important;
          }

          .print-section:last-child {
            page-break-after: auto !important;
          }
          
          .proof-img { 
            max-width: 100% !important; 
            max-height: 800px !important; 
            object-fit: contain !important; 
            display: block !important; 
            margin: 20px auto !important; 
            border: 1px solid #e2e8f0;
            border-radius: 8px;
          }

          .print-header-bg {
            background-color: #f8fafc !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .amount-box {
            background-color: #0f172a !important;
            color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .verified-badge {
            background-color: #dcfce7 !important;
            color: #166534 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}} />

      {/* PAGE 1: THE RECEIPT */}
      <div className="print-section">
        <div className="flex justify-between items-start mb-10">
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
            <h2 className="text-4xl font-light text-gray-400 mb-2 tracking-widest uppercase">Receipt</h2>
            <div className="print-header-bg p-4 rounded-lg border border-gray-200 mt-2 min-w-[220px]">
              <div className="flex justify-between mb-1 text-sm">
                <span className="text-gray-500 font-semibold">Receipt No:</span>
                <span className="font-bold text-gray-900">#{p.receiptNumber}</span>
              </div>
              <div className="flex justify-between mb-1 text-sm">
                <span className="text-gray-500 font-semibold">Date:</span>
                <span className="text-gray-900">{new Date(p.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
              {p.status === 'Verified' && (
                <div className="flex justify-end mt-2 pt-2 border-t border-gray-300">
                  <span className="verified-badge px-2 py-1 text-xs font-bold rounded uppercase tracking-wider">
                    ✓ Verified
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8 mb-10">
          <div className="flex-1 print-header-bg p-6 rounded-lg border border-gray-200">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-300 pb-2">Payment Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex"><span className="w-40 text-gray-500 font-medium">Received From:</span><span className="font-bold text-gray-900">{p.party?.name}</span></div>
              <div className="flex"><span className="w-40 text-gray-500 font-medium">Received By:</span><span className="text-gray-800">{p.salesperson?.name}</span></div>
              <div className="flex"><span className="w-40 text-gray-500 font-medium">Payment Mode:</span><span className="font-semibold text-gray-900">{p.paymentMode}</span></div>
              {p.transactionId && <div className="flex"><span className="w-40 text-gray-500 font-medium">Transaction ID:</span><span className="font-mono text-gray-700">{p.transactionId}</span></div>}
              {p.order?.orderNumber && <div className="flex"><span className="w-40 text-gray-500 font-medium">Order Reference:</span><span className="text-blue-700 font-medium">{p.order?.orderNumber}</span></div>}
              {p.purpose && <div className="flex"><span className="w-40 text-gray-500 font-medium">Purpose:</span><span className="text-gray-800">{p.purpose}</span></div>}
            </div>
          </div>
          
          <div className="flex-1 flex items-center justify-center">
            <div className="amount-box p-8 rounded-xl shadow-lg text-center w-full max-w-sm">
              <p className="text-sm text-gray-300 uppercase tracking-widest font-semibold mb-2">Amount Received</p>
              <p className="text-5xl font-bold mb-3 tracking-tight">Rs {Number(p.amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
              <div className="border-t border-gray-700 pt-3 mt-1">
                <p className="text-sm text-gray-300 italic capitalize leading-snug">{amountToWords(p.amount)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-end mt-24">
          <div className="text-center w-56">
            <div className="border-b border-gray-400 h-8 mb-2"></div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Receiver's Signature</p>
          </div>
          <div className="text-center w-56">
            <div className="border-b border-gray-400 h-8 mb-2"></div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Authorized Signatory</p>
          </div>
        </div>

        <div className="mt-16 pt-4 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500 mb-1">{co.footerText || 'This is a computer-generated receipt and does not require a physical signature.'}</p>
          <p className="text-xs text-gray-400">Generated on {new Date().toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* PAGE 2: THE PROOF */}
      {p.proofFilePath && isImage && (
        <div className="print-section">
          <div className="border-t-4 border-gray-100 mb-8 pt-6"></div>
          
          <div className="text-center mb-8">
            <h3 className="text-2xl font-light text-gray-500 uppercase tracking-widest mb-4">Payment Proof</h3>
            <div className="inline-block text-left bg-gray-50 border border-gray-200 rounded-lg p-4 min-w-[300px]">
              <div className="flex justify-between mb-1 text-sm">
                <span className="text-gray-500 font-medium mr-4">Receipt No:</span>
                <span className="text-gray-900 font-semibold">#{p.receiptNumber}</span>
              </div>
              <div className="flex justify-between mb-1 text-sm">
                <span className="text-gray-500 font-medium mr-4">Transaction ID:</span>
                <span className="text-gray-900 font-mono">{p.transactionId || 'N/A'}</span>
              </div>
              <div className="flex justify-between mb-1 text-sm">
                <span className="text-gray-500 font-medium mr-4">Amount:</span>
                <span className="text-gray-900 font-bold">Rs {Number(p.amount).toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center p-4 bg-gray-50 rounded-xl border border-gray-100">
            <img 
              src={p.proofFilePath} 
              alt="Payment Proof" 
              className="proof-img"
            />
          </div>
        </div>
      )}
    </div>
  );
}