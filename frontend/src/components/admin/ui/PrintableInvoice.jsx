import React from "react";

export default function PrintableInvoice({ booking, payments = [] }) {
  if (!booking) return null;

  const fmt = (n) => "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  const refCode = booking.reference || `CAZ-${booking._id?.slice(-6).toUpperCase()}`;
  const issueDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const eventDateStr = booking.event_date 
    ? new Date(booking.event_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "TBA";

  const customerName = booking.customer_id?.full_name 
    || `${booking.contact_first_name || ""} ${booking.contact_last_name || ""}`.trim() 
    || "Customer";
  const customerEmail = booking.customer_id?.email || booking.contact_email || "N/A";
  const customerPhone = booking.customer_id?.phone || booking.contact_phone || "N/A";
  const fullAddress = [booking.street, booking.barangay, booking.municipality, booking.province]
    .filter(Boolean)
    .join(", ") || booking.venue_type || "Location to be confirmed";

  const guestCount = Number(booking.guest_count) || 0;
  const pkg = booking.package_id;
  const grandTotal = Number(booking.total_price) || 0;
  const discountAmount = Number(booking.discount_amount || 0);

  const approvedPayments = payments.filter(p => p.status === "approved" || p.status === "Paid");
  const totalPaid = approvedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remainingBalance = Math.max(0, grandTotal - totalPaid);

  // Financial calculations
  const serviceItemsSubtotal = (booking.service_items || []).reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
    0
  );
  const additionalChargesSubtotal = (booking.additional_charges || []).reduce(
    (sum, charge) => sum + (Number(charge.amount) || 0),
    0
  );
  const addOnsSubtotal = serviceItemsSubtotal + additionalChargesSubtotal;

  let basePackageSubtotal = 0;
  let pkgDescription = "";
  if (pkg) {
    if (pkg.package_type === "Event Setup Only") {
      basePackageSubtotal = Number(pkg.setup_price || 0);
      pkgDescription = `${pkg.name} (Flat Event Setup Fee)`;
    } else {
      const perGuestRate = Number(pkg.price_per_guest || 0);
      basePackageSubtotal = perGuestRate * guestCount;
      pkgDescription = `${pkg.name} (₱${perGuestRate.toLocaleString()}/head × ${guestCount} Pax)`;
    }
  }

  if (basePackageSubtotal === 0 && grandTotal > 0) {
    basePackageSubtotal = Math.max(0, grandTotal + discountAmount - addOnsSubtotal);
    pkgDescription = `Base Package Rate (${guestCount} Guests)`;
  }

  const rawStatus = (booking.status || "confirmed").toUpperCase();
  const paymentStatusText = (booking.payment_status || (totalPaid >= grandTotal ? "fully_paid" : totalPaid > 0 ? "deposit_paid" : "pending")).replace(/_/g, " ").toUpperCase();

  return (
    <div className="printable-invoice hidden print:block bg-white text-slate-900 font-sans p-8 max-w-[800px] mx-auto text-xs leading-relaxed">
      {/* Invoice Header / Branding */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-lg">
              C
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
              Caezelle’s Catering Services
            </h1>
          </div>
          <p className="text-slate-500 font-medium text-[11px]">
            Events &amp; Premium Catering Management
          </p>
          <p className="text-slate-500 text-[10px] pt-1">
            Purok 4, Pangao, Ibaan, Batangas, Philippines · +63 987 676 2322 · info@caezellescatering.com
          </p>
        </div>

        <div className="text-right space-y-1">
          <span className="inline-block px-3 py-1 bg-slate-900 text-white font-bold text-xs uppercase tracking-wider rounded">
            OFFICIAL INVOICE
          </span>
          <p className="font-mono font-bold text-slate-900 text-sm pt-1">INVOICE #: {refCode}</p>
          <p className="text-slate-500 text-[11px]">Date Issued: {issueDate}</p>
          <p className="text-slate-500 text-[11px]">Status: <strong className="text-slate-900">{rawStatus}</strong></p>
        </div>
      </div>

      {/* Customer & Event Info Grid */}
      <div className="grid grid-cols-2 gap-6 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
        <div>
          <h2 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-2 border-b pb-1">
            BILLED TO (CUSTOMER DETAILS)
          </h2>
          <p className="font-bold text-slate-900 text-sm mb-1">{customerName}</p>
          <p className="text-slate-600 mb-0.5">
            <span className="text-slate-400">Phone:</span> {customerPhone}
          </p>
          <p className="text-slate-600 mb-0.5">
            <span className="text-slate-400">Email:</span> {customerEmail}
          </p>
          <p className="text-slate-600 mt-1">
            <span className="text-slate-400">Address:</span> <span className="font-medium text-slate-800">{fullAddress}</span>
          </p>
        </div>

        <div>
          <h2 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-2 border-b pb-1">
            EVENT &amp; SERVICE SPECIFICS
          </h2>
          <p className="text-slate-600 mb-0.5">
            <strong className="text-slate-900">Event Type:</strong> {booking.event_type || "Event"}
          </p>
          <p className="text-slate-600 mb-0.5">
            <strong className="text-slate-900">Service Type:</strong> {booking.service_type || "Food and Event Setup"}
          </p>
          <p className="text-slate-600 mb-0.5">
            <strong className="text-slate-900">Event Date:</strong> {eventDateStr} ({booking.start_time || "TBA"})
          </p>
          <p className="text-slate-600 mb-0.5">
            <strong className="text-slate-900">Guest Count:</strong> {guestCount} Pax
          </p>
          <p className="text-slate-600">
            <strong className="text-slate-900">Venue:</strong> {booking.venue_type || "Standard Venue"}
          </p>
        </div>
      </div>

      {/* Itemized Table */}
      <div className="mb-6">
        <h2 className="font-bold text-slate-900 uppercase tracking-wider text-[10px] mb-2">
          ITEMIZED CHARGES &amp; BREAKDOWN
        </h2>
        <table className="w-full text-left border-collapse border border-slate-200">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-700 uppercase">
              <th className="py-2 px-3 border-r border-slate-200">Item / Description</th>
              <th className="py-2 px-3 border-r border-slate-200 text-center w-20">Category</th>
              <th className="py-2 px-3 border-r border-slate-200 text-center w-16">Qty</th>
              <th className="py-2 px-3 border-r border-slate-200 text-right w-24">Rate (₱)</th>
              <th className="py-2 px-3 text-right w-28">Amount (₱)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-[11px]">
            {/* Package Row */}
            <tr>
              <td className="py-2.5 px-3 border-r border-slate-200 font-medium">
                {pkgDescription || "Base Catering & Event Package"}
              </td>
              <td className="py-2.5 px-3 border-r border-slate-200 text-center text-slate-500">Package</td>
              <td className="py-2.5 px-3 border-r border-slate-200 text-center">{guestCount > 0 ? guestCount : 1}</td>
              <td className="py-2.5 px-3 border-r border-slate-200 text-right">
                {pkg?.price_per_guest ? fmt(pkg.price_per_guest) : "—"}
              </td>
              <td className="py-2.5 px-3 text-right font-semibold">{fmt(basePackageSubtotal)}</td>
            </tr>

            {/* Service Items */}
            {booking.service_items?.map((item, idx) => (
              <tr key={`svc-${idx}`}>
                <td className="py-2.5 px-3 border-r border-slate-200">
                  <span className="font-medium">{item.name}</span>
                  {item.description && <span className="block text-[10px] text-slate-500">{item.description}</span>}
                </td>
                <td className="py-2.5 px-3 border-r border-slate-200 text-center text-slate-500">Add-on</td>
                <td className="py-2.5 px-3 border-r border-slate-200 text-center">{item.quantity || 1}</td>
                <td className="py-2.5 px-3 border-r border-slate-200 text-right">{fmt(item.price)}</td>
                <td className="py-2.5 px-3 text-right font-semibold">{fmt((item.price || 0) * (item.quantity || 1))}</td>
              </tr>
            ))}

            {/* Additional Charges */}
            {booking.additional_charges?.map((item, idx) => (
              <tr key={`chg-${idx}`}>
                <td className="py-2.5 px-3 border-r border-slate-200 font-medium">{item.title || item.name || "Additional Fee"}</td>
                <td className="py-2.5 px-3 border-r border-slate-200 text-center text-slate-500">Logistics</td>
                <td className="py-2.5 px-3 border-r border-slate-200 text-center">1</td>
                <td className="py-2.5 px-3 border-r border-slate-200 text-right">{fmt(item.amount)}</td>
                <td className="py-2.5 px-3 text-right font-semibold">{fmt(item.amount)}</td>
              </tr>
            ))}

            {/* Included Menu Items summary row if present */}
            {booking.selected_menu?.length > 0 && (
              <tr className="bg-slate-50/50">
                <td colSpan="5" className="py-2 px-3 text-[10px] text-slate-600">
                  <strong className="text-slate-800">Included Selected Menu Items ({booking.selected_menu.length}):</strong>{" "}
                  {booking.selected_menu.map(m => m.name || m).join(", ")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Financial Summary & Payment Details */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Payment History */}
        <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
          <h3 className="font-bold text-slate-400 text-[10px] uppercase tracking-wider mb-2 border-b pb-1">
            PAYMENT RECORD &amp; STATUS
          </h3>
          <p className="text-[11px] mb-2">
            Payment Status: <span className="font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px]">{paymentStatusText}</span>
          </p>

          {approvedPayments.length > 0 ? (
            <div className="space-y-1.5 text-[10px]">
              {approvedPayments.map((p, i) => (
                <div key={i} className="flex justify-between border-b border-slate-200/60 pb-1">
                  <span>{p.payment_method ? p.payment_method.toUpperCase() : "Deposit / Payment"} ({new Date(p.createdAt || Date.now()).toLocaleDateString()})</span>
                  <span className="font-bold text-emerald-700">{fmt(p.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-slate-500 italic">No approved payment transactions recorded yet.</p>
          )}
        </div>

        {/* Totals Summary Table */}
        <div className="space-y-1 text-[11px] text-right">
          <div className="flex justify-between py-1 border-b border-slate-200">
            <span className="text-slate-600">Base Package Subtotal:</span>
            <span className="font-semibold text-slate-900">{fmt(basePackageSubtotal)}</span>
          </div>

          {addOnsSubtotal > 0 && (
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-600">Add-ons &amp; Logistics Subtotal:</span>
              <span className="font-semibold text-slate-900">{fmt(addOnsSubtotal)}</span>
            </div>
          )}

          {discountAmount > 0 && (
            <div className="flex justify-between py-1 border-b border-slate-200 text-emerald-700">
              <span>Applied Discount:</span>
              <span className="font-semibold">- {fmt(discountAmount)}</span>
            </div>
          )}

          <div className="flex justify-between py-2 border-b-2 border-slate-900 text-sm font-bold text-slate-900">
            <span>TOTAL AMOUNT:</span>
            <span className="text-slate-900">{fmt(grandTotal)}</span>
          </div>

          <div className="flex justify-between py-1 text-slate-700 font-medium">
            <span>Total Amount Paid / Deposit:</span>
            <span className="text-emerald-700 font-bold">{fmt(totalPaid)}</span>
          </div>

          <div className="flex justify-between py-1 text-slate-900 font-bold text-xs bg-slate-100 p-2 rounded">
            <span>REMAINING BALANCE DUE:</span>
            <span className={remainingBalance > 0 ? "text-amber-700" : "text-emerald-700"}>
              {fmt(remainingBalance)}
            </span>
          </div>
        </div>
      </div>

      {/* Terms & Notes Footer */}
      <div className="border-t border-slate-300 pt-4 mt-6 text-[10px] text-slate-500 space-y-1">
        <p className="font-bold text-slate-800">CATERING TERMS &amp; INVOICE NOTES:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>Thank you for trusting Caezelle’s Catering Services for your event!</li>
          <li>Final menu choices, guest count, and setup requirements must be finalized 7 days before event date.</li>
          <li>Any remaining balance is due on or before the day of the event prior to service commencement.</li>
          <li>This document serves as an official system-generated invoice receipt.</li>
        </ul>
      </div>
    </div>
  );
}
