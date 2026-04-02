import { amountToWords } from '../utils/numberToWords'

export default function PaymentPrintTemplate({ data }) {
  if (!data) return null;
  const { payment: p, template: co = {} } = data;

  const isImage = p.proofFilePath && p.proofFilePath.match(/\.(jpeg|jpg|gif|png)$/i) != null;

  return (
    <div className="payment-print-container">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* 1. Hide everything in the app */
          body * { visibility: hidden !important; }
          
          /* 2. Show only our specific print container and its children */
          .payment-print-container, .payment-print-container * { 
            visibility: visible !important; 
          }
          
          /* 3. Force the container to the top-left of the physical paper */
          .payment-print-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          /* 4. BREAK OUT: Force all parent elements to allow overflow */
          /* This is the magic part that stops the clipping */
          html, body, #root, .modal-overlay, .modal-content, [class*="fixed"], [class*="overflow"] {
            height: auto !important;
            overflow: visible !important;
            max-height: none !important;
            position: static !important;
          }

          /* 5. Define the pages clearly */
          .print-section {
            display: block !important;
            width: 100% !important;
            page-break-after: always !important;
            padding: 40px !important;
            box-sizing: border-box !important;
          }

          /* Remove break for the very last section */
          .print-section:last-child {
            page-break-after: auto !important;
          }
          
          /* 6. Fix the image height so it fits on one page */
          .proof-img { 
            max-width: 100% !important; 
            max-height: 800px !important; 
            object-fit: contain !important; 
            display: block !important; 
            margin: 20px auto !important; 
          }
        }
      `}} />

      {/* PAGE 1: THE RECEIPT */}
      <div className="print-section bg-white text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
        <div className="flex items-start justify-between border-b-2 border-gray-800 pb-4 mb-6">
          <div>
            {co.logoPath && <img src={co.logoPath} alt="" className="h-12 mb-1 object-contain" />}
            <h1 className="text-lg font-bold">{co.companyName || 'Company Name'}</h1>
            <p className="text-xs text-gray-600">{co.companyAddress}</p>
            {co.companyPhone && <p className="text-xs text-gray-600">Tel: {co.companyPhone}</p>}
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold uppercase text-gray-800">Receipt</h2>
            <p className="text-xs text-gray-500">#{p.receiptNumber}</p>
            <p className="text-xs text-gray-500">Date: {new Date(p.paymentDate).toLocaleDateString('en-IN')}</p>
            {p.status === 'Verified' && <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-semibold">✓ VERIFIED</span>}
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex"><span className="w-40 text-gray-500">Received From:</span><span className="font-semibold">{p.party?.name}</span></div>
          <div className="flex"><span className="w-40 text-gray-500">Received By:</span><span>{p.salesperson?.name}</span></div>
          <div className="flex"><span className="w-40 text-gray-500">Payment Date:</span><span>{new Date(p.paymentDate).toLocaleDateString('en-IN')}</span></div>
          <div className="flex"><span className="w-40 text-gray-500">Payment Mode:</span><span className="font-medium">{p.paymentMode}</span></div>
          {p.transactionId && <div className="flex"><span className="w-40 text-gray-500">Transaction ID:</span><span className="font-mono">{p.transactionId}</span></div>}
          {p.order?.orderNumber && <div className="flex"><span className="w-40 text-gray-500">Order Reference:</span><span>{p.order?.orderNumber}</span></div>}
          {p.purpose && <div className="flex"><span className="w-40 text-gray-500">Purpose:</span><span>{p.purpose}</span></div>}
        </div>

        <div className="bg-gray-900 text-white p-4 rounded-lg mb-4 text-center">
          <p className="text-sm text-gray-300">Amount Received</p>
          <p className="text-3xl font-bold mt-1">₹{Number(p.amount).toLocaleString()}</p>
          <p className="text-sm text-gray-300 mt-1 italic">{amountToWords(p.amount)}</p>
        </div>

        <div className="grid grid-cols-2 gap-12 mt-10 pt-6 border-t border-gray-200">
          <div className="text-center"><div className="border-b border-gray-500 h-10 mb-1"></div><p className="text-xs text-gray-500">Receiver's Signature</p></div>
          <div className="text-center"><div className="border-b border-gray-500 h-10 mb-1"></div><p className="text-xs text-gray-500">Authorised Signatory</p></div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">{co.footerText || 'This is a computer-generated receipt.'}</p>
        <p className="text-center text-xs text-gray-300 mt-1">Printed: {new Date().toLocaleString('en-IN')}</p>
      </div>

      {/* PAGE 2: THE PROOF */}
      {p.proofFilePath && isImage && (
        <div className="print-section bg-white">
          <div className="border-t-2 border-gray-800 mb-6 pt-4"></div>
          <h3 className="text-xl font-bold mb-4 text-gray-800 text-center">Payment Proof Attachment</h3>
          <p className="text-xs text-gray-500 text-center mb-6">Attachment for Receipt #{p.receiptNumber}</p>
          <div className="flex justify-center">
            <img 
              src={p.proofFilePath} 
              alt="Payment Proof" 
              className="proof-img border border-gray-200 shadow-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}