import React from "react";
import CateringInvoiceDocument from "../../../components/common/invoice/CateringInvoiceDocument";

export default function PrintableInvoice({ booking, quotation, inquiry, payments = [], businessInfo = {} }) {
  if (!booking && !quotation && !inquiry) return null;

  return (
    <div className="printable-invoice hidden print:block bg-white text-slate-900 w-full">
      <CateringInvoiceDocument
        booking={booking}
        quotation={quotation}
        inquiry={inquiry}
        payments={payments}
        businessInfo={businessInfo}
        context="admin"
      />
    </div>
  );
}
