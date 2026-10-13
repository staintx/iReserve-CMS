import React from "react";
import { createPortal } from "react-dom";
import CateringReceiptDocument from "../../common/receipt/CateringReceiptDocument";

export default function CustomerPrintReceipt({
  payment,
  booking = null,
  formatCurrency = null,
  businessInfo = {},
}) {
  if (!payment) return null;

  return createPortal(
    <div id="caz-receipt-print-root" className="caz-receipt-print-container" aria-hidden="true">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
        }
      `}</style>
      <CateringReceiptDocument
        payment={payment}
        booking={booking}
        businessInfo={businessInfo}
        formatCurrency={formatCurrency}
        isAdmin={false}
        isPrint={true}
      />
    </div>,
    document.body
  );
}

