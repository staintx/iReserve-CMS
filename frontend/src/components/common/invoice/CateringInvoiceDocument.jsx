import React from "react";
import { formatCurrency, formatEventDateWithDay, formatTime, formatShortDate } from "../../../utils/format";
import { getInvoicePolicies } from "../../../lib/policy";
import useAuth from "../../../hooks/useAuth";
import useBusinessInfo from "../../../hooks/useBusinessInfo";
import { resolveServiceType } from "../../customer/portal/statusMeta";

/**
 * Normalizes booking, quotation, or inquiry records into a unified document structure.
 */
function normalizeDocumentData({ booking, quotation, inquiry, payments = [], businessInfo = {} }) {
  const isQuote = Boolean(quotation) && !booking;
  const source = booking || quotation || inquiry || {};
  const snapshot = quotation?.event_snapshot || source?.event_snapshot || null;

  const depositPercentage = Number(businessInfo?.deposit_percentage) || 20;
  const termsUrl = businessInfo?.terms_file?.url || businessInfo?.terms_url || "";
  const termsFileName = businessInfo?.terms_file?.name || "";

  // Business Identity (Authoritative Caezelle's data)
  const business = {
    name: businessInfo?.business_name || "Caezelle’s Food, Catering & Services",
    address: businessInfo?.address || "Purok 4, Pangao, Ibaan, Batangas, Philippines",
    phone: businessInfo?.contact_number || "+63 987 676 2322",
    email: businessInfo?.email || "info@caezellescatering.com",
    facebook: businessInfo?.facebook || "facebook.com/caezellescatering",
    depositPercentage,
    termsUrl,
    termsFileName,
    policies: businessInfo?.policies || null,
  };

  // Reference Code
  let refCode = "";
  if (source.reference) {
    refCode = source.reference;
  } else if (source.quotation_number) {
    refCode = source.quotation_number;
  } else if (source._id) {
    refCode = `${isQuote ? "QTE" : "INV"}-CAZ-${String(source._id).slice(-6).toUpperCase()}`;
  } else {
    refCode = "INV-CAZ-DRAFT";
  }

  // Dates
  const issueDate = source.createdAt 
    ? formatShortDate(source.createdAt)
    : formatShortDate(new Date());

  const eventDateRaw = snapshot?.event_date || source.event_date || null;
  const eventDateFormatted = eventDateRaw
    ? formatEventDateWithDay(eventDateRaw)
    : "To be confirmed";

  const eventTimeFormatted = source.start_time
    ? formatTime(source.start_time)
    : "Time to be confirmed";

  const validUntilFormatted = quotation?.expiration_date
    ? formatShortDate(quotation.expiration_date)
    : null;

  // Customer Context
  const customerUser = source.customer_id && typeof source.customer_id === "object" ? source.customer_id : {};
  const customerName = customerUser.full_name 
    || `${source.contact_first_name || ""} ${source.contact_last_name || ""}`.trim()
    || `${source.first_name || ""} ${source.last_name || ""}`.trim()
    || "Valued Customer";

  const customerEmail = customerUser.email || source.contact_email || source.email || "Not specified";
  const customerPhone = customerUser.phone || source.contact_phone || source.phone || "Not specified";

  // Venue Address
  const addressParts = [
    snapshot?.street || source.street,
    snapshot?.barangay || source.barangay,
    snapshot?.municipality || source.municipality,
    snapshot?.province || source.province,
    snapshot?.zip_code || source.zip_code
  ].filter(Boolean);

  const venueAddress = addressParts.length > 0 
    ? addressParts.join(", ")
    : (source.venue_type || "Venue location to be confirmed");

  // Event Context
  const eventType = snapshot?.event_type || source.event_type || "Catering Event";
  const serviceType = resolveServiceType({
    ...source,
    ...(snapshot || {}),
    package_id: quotation?.package_id || source?.package_id || booking?.package_id,
    package_name: quotation?.package_name || source?.package_name_snapshot || source?.package_name || booking?.package_name,
    menu_items: quotation?.menu_items || source?.menu_items || source?.selected_menu,
  });
  const guestCount = Number(snapshot?.guest_count || source.guest_count) || 1;
  const venueType = snapshot?.venue_type || source.venue_type || "Standard Venue";
  const eventTheme = source.event_theme || "";

  // Resolve assigned Event Manager record (Coordinator) dynamically
  const emRecord = 
    booking?.event_manager_id || 
    source?.event_manager_id || 
    inquiry?.event_manager_id || 
    quotation?.inquiry_id?.event_manager_id ||
    booking?.event_manager ||
    source?.event_manager ||
    null;

  let coordinatorName = null;
  if (emRecord && typeof emRecord === "object") {
    coordinatorName = 
      emRecord.full_name || 
      (`${emRecord.first_name || ""} ${emRecord.last_name || ""}`.trim() || null) ||
      emRecord.name || 
      null;
  } else if (typeof emRecord === "string" && emRecord.trim() && !/^[0-9a-fA-F]{24}$/.test(emRecord)) {
    coordinatorName = emRecord.trim();
  }

  const coordinator = coordinatorName || "Not yet assigned";

  // Package & Financials
  const pkg = source.package_id && typeof source.package_id === "object" ? source.package_id : null;
  const pkgName = pkg?.name || source.package_name_snapshot || quotation?.package_name || "Custom Catering Package";
  const pkgType = pkg?.package_type || "Catering Package";

  const grandTotal = Number(source.total_price || source.total_cost || 0);
  const discountAmount = Number(source.discount_amount || 0);

  // Inclusions adjustments & deductions (from quotation)
  const removedInclusions = Array.isArray(quotation?.removed_inclusions) 
    ? quotation.removed_inclusions.filter((e) => e?.name)
    : [];
  const inclusionAdjustments = Array.isArray(quotation?.inclusion_adjustments)
    ? quotation.inclusion_adjustments.filter((e) => e?.name && Number(e?.amount))
    : [];

  // Service Items & Add-ons
  const serviceItems = Array.isArray(source.service_items) 
    ? source.service_items 
    : Array.isArray(quotation?.add_ons)
    ? quotation.add_ons
    : [];

  const additionalCharges = Array.isArray(source.additional_charges)
    ? source.additional_charges
    : Array.isArray(quotation?.additional_fees)
    ? quotation.additional_fees
    : [];

  // Menu items
  const menuItems = Array.isArray(source.menu_items) && source.menu_items.length > 0
    ? source.menu_items
    : Array.isArray(source.selected_menu)
    ? source.selected_menu
    : [];

  // Payments Ledger
  const approvedPayments = payments.filter((p) => 
    p.status === "approved" || p.status === "Paid" || p.status === "completed"
  );
  const totalPaid = approvedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remainingBalance = Math.max(0, grandTotal - totalPaid);

  // Calculate Base Package Subtotal
  let basePackageSubtotal = 0;
  let pkgRateDescription = "";

  if (pkg) {
    if (pkg.package_type === "Event Setup Only") {
      basePackageSubtotal = Number(pkg.setup_price || 0);
      pkgRateDescription = "Flat Event Setup Fee";
    } else {
      const perGuestRate = Number(pkg.price_per_guest || 0);
      basePackageSubtotal = perGuestRate * guestCount;
      pkgRateDescription = `${formatCurrency(perGuestRate)}/guest × ${guestCount} Pax`;
    }
  } else if (quotation?.package_starting_price) {
    basePackageSubtotal = Number(quotation.package_starting_price);
    pkgRateDescription = `Base Package Rate (${guestCount} Pax)`;
  }

  const serviceItemsSubtotal = serviceItems.reduce((sum, item) => {
    const p = Number(item.price || item.unit_price || 0);
    const q = Number(item.quantity || 1);
    return sum + (p * q);
  }, 0);

  const additionalChargesSubtotal = additionalCharges.reduce((sum, c) => {
    return sum + Number(c.amount || 0);
  }, 0);

  const menuSubtotal = isQuote && menuItems.length > 0
    ? menuItems.reduce((sum, item) => sum + menuLineTotal(item, guestCount), 0)
    : 0;

  if (basePackageSubtotal === 0 && grandTotal > 0) {
    basePackageSubtotal = Math.max(0, grandTotal + discountAmount - (serviceItemsSubtotal + additionalChargesSubtotal + menuSubtotal));
    pkgRateDescription = `${guestCount} Guests Catering Baseline`;
  }

  // Status computation
  let statusTone = "neutral";
  let statusLabel = "PENDING";

  if (isQuote) {
    statusLabel = quotation?.status?.toUpperCase() || "QUOTATION PROPOSAL";
    statusTone = quotation?.status === "Accepted" ? "success" : "info";
  } else {
    if (totalPaid >= grandTotal && grandTotal > 0) {
      statusLabel = "PAID IN FULL";
      statusTone = "success";
    } else if (totalPaid > 0) {
      statusLabel = "DEPOSIT CONFIRMED";
      statusTone = "warning";
    } else if (source.status === "confirmed" || source.status === "Confirmed") {
      statusLabel = "CONFIRMED RESERVATION";
      statusTone = "primary";
    } else {
      statusLabel = (source.status || "PENDING").replace(/_/g, " ").toUpperCase();
      statusTone = "neutral";
    }
  }

  // Required Deposit Calculation
  const depositRequired = quotation?.deposit_amount 
    ? Number(quotation.deposit_amount)
    : Math.round(grandTotal * (business.depositPercentage / 100));

  // Admin notes / custom conditions configured by admin
  const adminNotes = quotation?.admin_notes || source.admin_notes || source.notes || quotation?.notes || source.special_requests || "";

  return {
    isQuote,
    business,
    refCode,
    issueDate,
    eventDateFormatted,
    eventTimeFormatted,
    validUntilFormatted,
    customerName,
    customerEmail,
    customerPhone,
    venueAddress,
    eventType,
    serviceType,
    guestCount,
    venueType,
    eventTheme,
    eventManager: coordinator,
    coordinator,
    pkgName,
    pkgType,
    pkgRateDescription,
    basePackageSubtotal,
    removedInclusions,
    inclusionAdjustments,
    serviceItems,
    serviceItemsSubtotal,
    additionalCharges,
    additionalChargesSubtotal,
    menuItems,
    menuSubtotal,
    discountAmount,
    grandTotal,
    approvedPayments,
    totalPaid,
    remainingBalance,
    depositRequired,
    statusLabel,
    statusTone,
    adminNotes
  };
}

/**
 * Clean, restrained status badge without cartoonish pills or gradients.
 */
function DocumentStatusTag({ label, tone }) {
  const styles = {
    success: "text-emerald-800 bg-emerald-50 border-emerald-300",
    warning: "text-amber-800 bg-amber-50 border-amber-300",
    primary: "text-[#1E3563] bg-blue-50 border-blue-200",
    info: "text-sky-900 bg-sky-50 border-sky-200",
    neutral: "text-slate-800 bg-slate-100 border-slate-300"
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-bold font-sans tracking-wide uppercase border rounded-sm ${styles[tone] || styles.neutral}`}>
      {label}
    </span>
  );
}

/**
 * Production-Quality Catering Invoice & Statement Document for Caezelle’s Food, Catering & Services.
 * Features:
 *  - High-clarity on-screen editorial layout for dialogs and dashboards.
 *  - Dedicated, uncompromised A4 print layout with repeating running headers on multi-page prints.
 *  - Dynamically resolved authenticated admin signatory name (never hardcoded).
 *  - 100% dynamic terms, calculations, and data flows.
 */
export default function CateringInvoiceDocument({
  booking,
  quotation,
  inquiry,
  payments = [],
  businessInfo = {},
  context = "customer", // "customer" or "admin"
  className = ""
}) {
  const effectiveBusinessInfo = useBusinessInfo(businessInfo);
  const doc = normalizeDocumentData({ booking, quotation, inquiry, payments, businessInfo: effectiveBusinessInfo });
  const dynamicPolicies = getInvoicePolicies(doc.business);

  // Authenticated user data for dynamic Authorized Management Signatory.
  // Strict role separation:
  // - Coordinator: assigned Event Manager (resolved dynamically from booking.event_manager_id)
  // - Authorized Management Signatory: authenticated Admin / authorized management user
  const auth = useAuth() || {};
  let authUser = auth.user || null;
  if (!authUser) {
    try {
      const saved = localStorage.getItem("user");
      if (saved) authUser = JSON.parse(saved);
    } catch {
      // ignore
    }
  }

  // Check if authenticated account is an admin or authorized management account
  const isAuthorizedManagement = Boolean(
    authUser && (authUser.role === "admin" || authUser.role === "manager" || authUser.role === "staff")
  );

  // Dynamically resolve actual authenticated Admin / management user full name
  const authenticatedAdminName = isAuthorizedManagement
    ? (authUser.full_name?.trim() ||
       (`${authUser.first_name || ""} ${authUser.last_name || ""}`.trim() || null) ||
       authUser.username?.trim() ||
       authUser.name?.trim() ||
       null)
    : null;

  // Resolve signatory: strictly authenticated Admin / authorized management user.
  // Never hardcoded, and NEVER derived from the booking's assigned event manager.
  const adminSignatoryName = 
    authenticatedAdminName ||
    (quotation?.authorized_by?.full_name ? quotation.authorized_by.full_name.trim() : null) ||
    doc.business.name;

  const adminSignatoryRole = 
    authUser?.role === "admin" 
      ? "System Administrator" 
      : authUser?.role === "manager" 
      ? "Event Operations Manager" 
      : authUser?.role === "staff" 
      ? "Staff Representative" 
      : "Authorized Management Signatory";

  return (
    <div 
      className={`caz-invoice-document bg-white text-slate-900 font-sans ${className}`}
      style={{
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}
    >
      {/* ═══════════════════════════════════════════════════════════════
          A. ON-SCREEN EDITORIAL VIEW (Hidden on Print)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="caz-screen-view print:hidden p-6 sm:p-10 max-w-[820px] mx-auto text-xs leading-normal select-text">
        {/* 1. Header Masthead */}
        <header className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-5 border-b-2 border-slate-900">
          <div className="flex items-start gap-3.5 max-w-md">
            <div className="w-13 h-13 shrink-0 rounded-sm overflow-hidden border border-slate-300 bg-slate-50 flex items-center justify-center">
              <img 
                src="/logo.jpg" 
                alt={doc.business.name} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.parentElement.innerHTML = '<div class="w-full h-full bg-[#1E3563] text-white font-bold flex items-center justify-center text-lg">C</div>';
                }}
              />
            </div>

            <div className="space-y-0.5">
              <h1 className="text-lg sm:text-xl font-bold font-sans tracking-tight text-slate-900 uppercase">
                {doc.business.name}
              </h1>
              <p className="text-[10px] text-slate-500 pt-0.5 leading-snug">
                {doc.business.address} · {doc.business.phone} · {doc.business.email}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right space-y-1 shrink-0 self-stretch sm:self-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200">
            <div className="flex sm:justify-end">
              <DocumentStatusTag label={doc.statusLabel} tone={doc.statusTone} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                {doc.isQuote ? "CATERING QUOTATION & ESTIMATE" : "STATEMENT OF ACCOUNT & INVOICE"}
              </span>
              <span className="font-mono font-bold text-slate-900 text-sm tracking-tight block">
                {doc.refCode}
              </span>
            </div>
            {context === "admin" && (
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">
                Admin Audit Record
              </span>
            )}
          </div>
        </header>

        {/* 2. Metadata Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-4 py-3 border-b border-slate-200 text-[11px]">
          <div>
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
              Date Issued
            </span>
            <span className="font-semibold text-slate-900 block font-mono">
              {doc.issueDate}
            </span>
            {doc.validUntilFormatted && (
              <span className="text-[10px] text-amber-800 block">
                Valid until: {doc.validUntilFormatted}
              </span>
            )}
          </div>

          <div>
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
              Event Schedule
            </span>
            <span className="font-semibold text-slate-900 block truncate">
              {doc.eventDateFormatted}
            </span>
            <span className="text-[10px] text-slate-500 block">
              {doc.eventTimeFormatted}
            </span>
          </div>

          <div>
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
              Headcount &amp; Service
            </span>
            <span className="font-semibold text-slate-900 block font-mono">
              {doc.guestCount} Guests ({doc.guestCount} Pax)
            </span>
            <span className="text-[10px] text-slate-500 block">
              {doc.serviceType}
            </span>
          </div>

          <div>
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
              {doc.remainingBalance <= 0 ? "Account Status" : "Balance Due"}
            </span>
            <span className={`font-mono font-bold text-sm block tabular-nums ${doc.remainingBalance <= 0 ? "text-emerald-700" : "text-amber-800"}`}>
              {doc.remainingBalance <= 0 ? "PAID IN FULL" : formatCurrency(doc.remainingBalance)}
            </span>
            <span className="text-[10px] text-slate-500 block">
              Total: {formatCurrency(doc.grandTotal)}
            </span>
          </div>
        </div>

        {/* 3. Customer & Event Context */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-5 border-b border-slate-200">
          <div className="space-y-1.5">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1">
              Billed To (Client Details)
            </h2>
            <div className="pt-0.5 space-y-1 text-[11px]">
              <p className="font-bold text-slate-900 text-sm">{doc.customerName}</p>
              <p className="text-slate-700">
                <span className="text-slate-500 mr-1.5">Contact:</span>
                <span className="font-mono">{doc.customerPhone}</span>
              </p>
              <p className="text-slate-700">
                <span className="text-slate-500 mr-1.5">Email:</span>
                <span>{doc.customerEmail}</span>
              </p>
              <p className="text-slate-700 leading-snug pt-0.5">
                <span className="text-slate-500 mr-1.5">Location:</span>
                <span className="font-medium text-slate-800">{doc.venueAddress}</span>
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1">
              Event Specifications
            </h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] pt-0.5">
              <div>
                <dt className="text-[10px] text-slate-500">Occasion</dt>
                <dd className="font-semibold text-slate-900">{doc.eventType}</dd>
              </div>
              <div>
                <dt className="text-[10px] text-slate-500">Service Category</dt>
                <dd className="font-semibold text-slate-900">{doc.serviceType}</dd>
              </div>
              <div>
                <dt className="text-[10px] text-slate-500">Venue Setting</dt>
                <dd className="font-medium text-slate-800">{doc.venueType}</dd>
              </div>
              <div>
                <dt className="text-[10px] text-slate-500">Coordinator</dt>
                <dd className="font-medium text-slate-800">{doc.coordinator}</dd>
              </div>
              {doc.eventTheme && (
                <div className="col-span-2 pt-0.5">
                  <dt className="text-[10px] text-slate-500">Theme / Palette</dt>
                  <dd className="font-medium text-slate-800">{doc.eventTheme}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* 4. Itemized Charges Table */}
        <section className="py-5 border-b border-slate-200">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-[10.5px] font-bold uppercase tracking-wider text-slate-800">
              Itemized Charges &amp; Service Breakdown
            </h2>
            <span className="text-[10px] text-slate-500 font-mono">Amounts in Philippine Peso (PHP ₱)</span>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-y border-slate-900 bg-slate-50/60 text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                <th className="py-2.5 px-2 w-[46%]">Description &amp; Specifications</th>
                <th className="py-2.5 px-2 text-center w-20">Category</th>
                <th className="py-2.5 px-2 text-center w-18">Pax / Qty</th>
                <th className="py-2.5 px-2 text-right w-24">Rate (₱)</th>
                <th className="py-2.5 px-2 text-right w-28">Amount (₱)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-[11px]">
              <tr>
                <td className="py-3 px-2">
                  <div className="font-bold text-slate-900 text-xs">{doc.pkgName}</div>
                  <p className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">
                    {doc.pkgRateDescription}
                  </p>
                </td>
                <td className="py-3 px-2 text-center text-slate-600 font-medium">Package</td>
                <td className="py-3 px-2 text-center font-mono font-semibold text-slate-800">{doc.guestCount}</td>
                <td className="py-3 px-2 text-right font-mono text-slate-600 tabular-nums">
                  {doc.guestCount > 0 ? formatCurrency(doc.basePackageSubtotal / doc.guestCount) : "—"}
                </td>
                <td className="py-3 px-2 text-right font-mono font-bold text-slate-900 tabular-nums">
                  {formatCurrency(doc.basePackageSubtotal)}
                </td>
              </tr>

              {doc.removedInclusions.map((entry, idx) => (
                <tr key={`ded-${idx}`} className="text-[10.5px] bg-rose-50/30">
                  <td className="py-2 px-2 text-slate-800">
                    <span className="font-semibold text-rose-800">Removed Inclusion:</span> {entry.name || entry}
                  </td>
                  <td className="py-2 px-2 text-center text-rose-700">Deduction</td>
                  <td className="py-2 px-2 text-center text-slate-500">1</td>
                  <td className="py-2 px-2 text-right font-mono text-emerald-700 tabular-nums">
                    −{formatCurrency(entry.deduction || 0)}
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                    −{formatCurrency(entry.deduction || 0)}
                  </td>
                </tr>
              ))}

              {doc.inclusionAdjustments.map((entry, idx) => {
                const amt = Number(entry.amount) || 0;
                return (
                  <tr key={`adj-${idx}`} className="text-[10.5px]">
                    <td className="py-2 px-2 text-slate-800">
                      <span className="font-semibold">Inclusion Quantity Adjustment:</span> {entry.name} ({entry.quantity} vs base {entry.base_quantity})
                    </td>
                    <td className="py-2 px-2 text-center text-slate-500">Adjustment</td>
                    <td className="py-2 px-2 text-center font-mono text-slate-600">{entry.quantity}</td>
                    <td className="py-2 px-2 text-right font-mono text-slate-600 tabular-nums">
                      {formatCurrency(entry.unit_price || 0)}
                    </td>
                    <td className={`py-2 px-2 text-right font-mono font-semibold tabular-nums ${amt < 0 ? "text-emerald-700" : "text-slate-900"}`}>
                      {amt < 0 ? "−" : ""}{formatCurrency(Math.abs(amt))}
                    </td>
                  </tr>
                );
              })}

              {doc.serviceItems.map((item, idx) => {
                const qty = Number(item.quantity) || 1;
                const price = Number(item.price || item.unit_price || 0);
                const lineTotal = price * qty;
                return (
                  <tr key={`item-${idx}`}>
                    <td className="py-2.5 px-2">
                      <span className="font-semibold text-slate-900">{item.name}</span>
                      {item.note && <span className="block text-[10px] text-slate-500">{item.note}</span>}
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-500 font-medium">Add-on</td>
                    <td className="py-2.5 px-2 text-center font-mono font-medium text-slate-800">{qty}</td>
                    <td className="py-2.5 px-2 text-right font-mono text-slate-600 tabular-nums">{formatCurrency(price)}</td>
                    <td className="py-2.5 px-2 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(lineTotal)}
                    </td>
                  </tr>
                );
              })}

              {doc.additionalCharges.map((chg, idx) => {
                const amt = Number(chg.amount || 0);
                return (
                  <tr key={`chg-${idx}`}>
                    <td className="py-2.5 px-2 font-medium text-slate-800">
                      {chg.title || chg.name || "Logistics / Delivery Surcharge"}
                      {chg.note && <span className="block text-[10px] text-slate-500">{chg.note}</span>}
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-500 font-medium">Logistics</td>
                    <td className="py-2.5 px-2 text-center font-mono text-slate-600">1</td>
                    <td className="py-2.5 px-2 text-right font-mono text-slate-600 tabular-nums">{formatCurrency(amt)}</td>
                    <td className="py-2.5 px-2 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(amt)}
                    </td>
                  </tr>
                );
              })}

              {doc.menuItems.length > 0 && (
                <tr className="bg-slate-50/50">
                  <td colSpan="5" className="py-2.5 px-2 border-t border-slate-200">
                    <div className="font-bold text-slate-800 text-[10.5px] uppercase tracking-wider mb-1">
                      Selected Menu Selections ({doc.menuItems.length} Dishes Included):
                    </div>
                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      {doc.menuItems.map((m, i) => {
                        const name = typeof m === "string" ? m : m.name;
                        const label = m.pricing_type === "quantity" ? ` (${menuAmountLabel(m)})` : "";
                        return (
                          <span key={i} className="inline-block mr-2 after:content-[','] last:after:content-[''] font-medium">
                            {name}{label}
                          </span>
                        );
                      })}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* 5. Payments & Financial Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 py-5 border-b border-slate-200">
          <div className="sm:col-span-7 space-y-4">
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 mb-2 flex items-center justify-between">
                <span>Payment History &amp; Credited Deposits</span>
                <span className="font-mono text-[9px] text-slate-400">LEDGER</span>
              </h3>

              {doc.approvedPayments.length > 0 ? (
                <div className="space-y-1.5">
                  {doc.approvedPayments.map((p, i) => {
                    const pDate = p.createdAt || p.paid_at;
                    return (
                      <div key={i} className="flex justify-between items-baseline text-[11px] py-1 border-b border-slate-100 last:border-0">
                        <div className="min-w-0 pr-2">
                          <span className="font-semibold text-slate-800 capitalize">
                            {p.payment_type ? p.payment_type.replace(/_/g, " ") : "Payment Received"}
                          </span>
                          <span className="text-[10px] text-slate-500 ml-1.5 font-mono">
                            ({p.method || p.payment_method || "Online"} · {pDate ? formatShortDate(pDate) : "Recorded"})
                          </span>
                          {p.gateway_reference && (
                            <span className="block text-[9.5px] font-mono text-slate-400">
                              Txn Ref: {p.gateway_reference}
                            </span>
                          )}
                        </div>
                        <span className="font-mono font-semibold text-emerald-800 tabular-nums shrink-0">
                          {formatCurrency(p.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="py-1 text-[11px] text-slate-500 italic">
                  No payments credited to this account yet. A {doc.business.depositPercentage}% deposit is required to confirm reservation.
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 leading-snug space-y-1">
              <span className="font-bold text-slate-700 uppercase tracking-wider block text-[9.5px]">
                Payment Methods:
              </span>
              <p>
                • Online Checkout: PayMongo Gateway (GCash, Maya, Debit/Credit Card) via the Client Portal.
              </p>
              <p>
                • Bank Transfer: Contact management at {doc.business.phone} for authorized BDO / BPI / GCash merchant accounts.
              </p>
            </div>
          </div>

          <div className="sm:col-span-5 space-y-2 text-[11px]">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 mb-2">
              Statement Summary
            </h3>

            <div className="flex justify-between py-0.5 text-slate-700">
              <span>Base Package Subtotal:</span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {formatCurrency(doc.basePackageSubtotal)}
              </span>
            </div>

            {(doc.serviceItemsSubtotal > 0 || doc.additionalChargesSubtotal > 0) && (
              <div className="flex justify-between py-0.5 text-slate-700">
                <span>Add-ons &amp; Logistics:</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {formatCurrency(doc.serviceItemsSubtotal + doc.additionalChargesSubtotal)}
                </span>
              </div>
            )}

            {doc.discountAmount > 0 && (
              <div className="flex justify-between py-0.5 text-emerald-700 font-medium">
                <span>Applied Discount:</span>
                <span className="font-mono tabular-nums">
                  −{formatCurrency(doc.discountAmount)}
                </span>
              </div>
            )}

            <div className="flex justify-between items-baseline pt-2 border-t-2 border-slate-900 text-xs sm:text-sm font-bold text-slate-900">
              <span>TOTAL AMOUNT:</span>
              <span className="font-mono tabular-nums text-base">
                {formatCurrency(doc.grandTotal)}
              </span>
            </div>

            <div className="flex justify-between py-1 text-slate-700 font-medium border-b border-slate-200">
              <span>Total Payments Credited:</span>
              <span className="font-mono font-bold text-emerald-800 tabular-nums">
                {formatCurrency(doc.totalPaid)}
              </span>
            </div>

            <div className="flex justify-between items-baseline pt-2 text-sm sm:text-base font-bold text-slate-900">
              <span className="uppercase text-xs tracking-wider">
                {doc.remainingBalance <= 0 ? "Account Status:" : "Remaining Balance Due:"}
              </span>
              <span className={`font-mono tabular-nums ${doc.remainingBalance <= 0 ? "text-emerald-700 text-sm" : "text-amber-800"}`}>
                {doc.remainingBalance <= 0 ? "PAID IN FULL" : formatCurrency(doc.remainingBalance)}
              </span>
            </div>

            {doc.remainingBalance > 0 && doc.totalPaid === 0 && (
              <p className="text-[10px] text-slate-500 pt-1">
                * Minimum {doc.business.depositPercentage}% deposit ({formatCurrency(doc.depositRequired)}) required to secure reservation date.
              </p>
            )}
          </div>
        </div>

        {/* 6. Terms, Policies & Signatures */}
        <footer className="pt-5 space-y-5">
          {doc.adminNotes && (
            <div className="p-3 rounded-sm bg-slate-50 border border-slate-200 text-[10.5px]">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[9.5px] block mb-1">
                Admin Notes &amp; Special Conditions:
              </span>
              <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                {doc.adminNotes}
              </p>
            </div>
          )}

          <div className="text-[10px] text-slate-500 space-y-1.5">
            <p className="font-bold text-slate-700 uppercase tracking-wider text-[9.5px]">
              Terms, Conditions &amp; Service Policies:
            </p>
            <ul className="list-disc pl-4 space-y-1 leading-relaxed">
              {dynamicPolicies.map((pol, idx) => (
                <li key={`dyn-pol-${idx}`}>
                  <strong className="text-slate-700">{pol.title}:</strong> {pol.body}
                </li>
              ))}
            </ul>
          </div>

          {doc.business.termsUrl && (
            <div className="p-2.5 rounded-sm bg-slate-50 border border-slate-200 text-[10px] text-slate-600">
              <div className="font-bold text-slate-800 uppercase tracking-wider text-[9px] mb-0.5">
                Official Terms &amp; Conditions Document on File:
              </div>
              <p>
                Full terms agreement configured by management:{" "}
                <a 
                  href={doc.business.termsUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[#1E3563] underline font-medium break-all hover:text-blue-900"
                >
                  {doc.business.termsFileName || doc.business.termsUrl}
                </a>
              </p>
            </div>
          )}

          {/* Dual Signatures */}
          <div className="grid grid-cols-2 gap-10 pt-4 pb-2 text-[11px]">
            <div>
              <div className="border-b border-slate-400 pb-1 mb-1 font-semibold text-slate-900">
                {adminSignatoryName}
              </div>
              <p className="text-[9.5px] text-slate-500 font-medium">Authorized Management Signatory / Date</p>
              {adminSignatoryRole && (
                <p className="text-[8.5px] text-slate-400 font-mono tracking-wide uppercase mt-0.5">
                  {adminSignatoryRole}
                </p>
              )}
            </div>

            <div>
              <div className="border-b border-slate-400 pb-1 mb-1 font-semibold text-slate-900">
                {doc.customerName}
              </div>
              <p className="text-[9.5px] text-slate-500 font-medium">Client Acceptance &amp; Acknowledgment / Date</p>
              <p className="text-[8.5px] text-slate-400 font-mono tracking-wide uppercase mt-0.5">
                Event Client
              </p>
            </div>
          </div>

          <div className="text-center text-[9px] text-slate-400 pt-2 border-t border-slate-200 font-mono">
            Generated by {doc.business.name} (iReserve) · Reference: {doc.refCode} · Date: {doc.issueDate} {context === "admin" ? "· Internal Audit Document" : ""}
          </div>
        </footer>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          B. DEDICATED A4 PRINT & PDF VIEW (Active exclusively on Print)
          Uses proper A4 proportions, repeating running headers on multi-page prints,
          natural dynamic pagination without clipping or squishing.
          ═══════════════════════════════════════════════════════════════ */}
      <div className="caz-print-view hidden print:block text-slate-900 bg-white w-full">
        <table className="caz-print-table w-full border-collapse">
          {/* 
            B.1. REPEATING RUNNING HEADER:
            Automatically repeated by browser print engine on Page 1, Page 2, Page 3, etc.
          */}
          <thead className="caz-print-thead">
            <tr>
              <th colSpan="100%" className="p-0 pb-3 font-normal text-left">
                <div className="caz-print-running-header border-b-2 border-slate-900 pb-2 mb-3 flex justify-between items-end text-slate-900">
                  <div>
                    <span className="text-[13pt] font-extrabold uppercase tracking-tight text-slate-900 block leading-tight">
                      {doc.business.name}
                    </span>
                    <span className="text-[8pt] font-semibold text-slate-600 block tracking-wide">
                      {doc.isQuote ? "Official Catering Quotation & Cost Estimate" : "Statement of Account & Official Billing Invoice"}
                    </span>
                  </div>
                  <div className="text-right text-[8.5pt] font-mono text-slate-700 leading-tight">
                    <div>Ref: <strong className="text-slate-900 text-[9.5pt]">{doc.refCode}</strong></div>
                    <div className="text-slate-500 text-[8pt]">Date: {doc.issueDate} · Client: <strong className="text-slate-800">{doc.customerName}</strong></div>
                  </div>
                </div>
              </th>
            </tr>
          </thead>

          {/* 
            B.2. REPEATING RUNNING FOOTER:
            Automatically repeated at bottom of every printed page.
          */}
          <tfoot className="caz-print-tfoot">
            <tr>
              <td colSpan="100%" className="p-0 pt-2 font-normal text-left">
                <div className="border-t border-slate-300 pt-1.5 flex justify-between items-center text-[7.5pt] font-mono text-slate-400">
                  <span>Generated by {doc.business.name} (iReserve)</span>
                  <span>Document Ref: {doc.refCode}</span>
                  <span>Page Print Copy · Official Record</span>
                </div>
              </td>
            </tr>
          </tfoot>

          {/* 
            B.3. DOCUMENT BODY (Flows naturally across A4 pages)
          */}
          <tbody className="caz-print-tbody">
            <tr>
              <td colSpan="100%" className="p-0">
                {/* Primary Masthead & Metadata on First Page */}
                <div className="caz-avoid-break mb-3 pb-3 border-b border-slate-300">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-13 h-13 shrink-0 rounded border border-slate-300 bg-slate-50 overflow-hidden flex items-center justify-center">
                        <img 
                          src="/logo.jpg" 
                          alt={doc.business.name} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.parentElement.innerHTML = '<div class="w-full h-full bg-[#1E3563] text-white font-bold flex items-center justify-center text-lg">C</div>';
                          }}
                        />
                      </div>
                      <div>
                        <div className="text-[12pt] font-extrabold uppercase tracking-tight text-slate-900">
                          {doc.business.name}
                        </div>
                        <p className="text-[8.5pt] text-slate-600 leading-snug mt-0.5">
                          {doc.business.address}
                        </p>
                        <p className="text-[8.5pt] text-slate-500 font-mono mt-0.5">
                          Tel: {doc.business.phone} · Email: {doc.business.email}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="inline-block px-2.5 py-0.5 text-[8.5pt] font-bold uppercase tracking-wider border rounded-xs mb-1 border-slate-800 text-slate-900 bg-slate-50">
                        {doc.statusLabel}
                      </div>
                      <div className="text-[7.5pt] font-bold text-slate-500 uppercase tracking-wider block">
                        {doc.isQuote ? "Quotation Reference" : "Invoice Reference"}
                      </div>
                      <div className="font-mono font-bold text-slate-900 text-[11pt] tracking-tight">
                        {doc.refCode}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4-Column Metadata Summary Strip */}
                <div className="caz-avoid-break grid grid-cols-4 gap-3 py-2 mb-3 border-y border-slate-300 bg-slate-50/70 text-[8.5pt]">
                  <div className="border-r border-slate-200 pr-2">
                    <span className="text-[7pt] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                      Date Issued
                    </span>
                    <span className="font-bold text-slate-900 font-mono block text-[9pt]">
                      {doc.issueDate}
                    </span>
                    {doc.validUntilFormatted && (
                      <span className="text-[7.5pt] text-amber-800 block mt-0.5">
                        Valid until: {doc.validUntilFormatted}
                      </span>
                    )}
                  </div>

                  <div className="border-r border-slate-200 pr-2">
                    <span className="text-[7pt] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                      Event Schedule
                    </span>
                    <span className="font-bold text-slate-900 block text-[9pt]">
                      {doc.eventDateFormatted}
                    </span>
                    <span className="text-[7.5pt] text-slate-600 block">
                      {doc.eventTimeFormatted}
                    </span>
                  </div>

                  <div className="border-r border-slate-200 pr-2">
                    <span className="text-[7pt] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                      Headcount &amp; Service
                    </span>
                    <span className="font-bold text-slate-900 font-mono block text-[9pt]">
                      {doc.guestCount} Guests ({doc.guestCount} Pax)
                    </span>
                    <span className="text-[7.5pt] text-slate-600 block">
                      {doc.serviceType}
                    </span>
                  </div>

                  <div>
                    <span className="text-[7pt] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                      {doc.remainingBalance <= 0 ? "Account Status" : "Balance Due"}
                    </span>
                    <span className={`font-mono font-bold text-[10.5pt] block leading-tight ${doc.remainingBalance <= 0 ? "text-emerald-700" : "text-amber-900"}`}>
                      {doc.remainingBalance <= 0 ? "PAID IN FULL" : formatCurrency(doc.remainingBalance)}
                    </span>
                    <span className="text-[7.5pt] text-slate-500 block">
                      Total: {formatCurrency(doc.grandTotal)}
                    </span>
                  </div>
                </div>

                {/* Customer & Event Specifications Grid */}
                <div className="caz-avoid-break grid grid-cols-2 gap-5 pb-3 mb-3 border-b border-slate-200 text-[8.5pt]">
                  <div className="space-y-1">
                    <h3 className="text-[7.5pt] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-0.5 mb-1">
                      Billed To (Client Details)
                    </h3>
                    <p className="font-bold text-slate-900 text-[10.5pt]">{doc.customerName}</p>
                    <p className="text-slate-700">
                      <span className="text-slate-500 mr-1.5 font-medium">Contact:</span>
                      <span className="font-mono">{doc.customerPhone}</span>
                    </p>
                    <p className="text-slate-700">
                      <span className="text-slate-500 mr-1.5 font-medium">Email:</span>
                      <span>{doc.customerEmail}</span>
                    </p>
                    <p className="text-slate-700 leading-snug">
                      <span className="text-slate-500 mr-1.5 font-medium">Location:</span>
                      <span className="font-medium text-slate-900">{doc.venueAddress}</span>
                    </p>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-[7.5pt] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-0.5 mb-1">
                      Event Logistics &amp; Specifications
                    </h3>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[8pt]">
                      <div>
                        <span className="text-slate-500 block text-[7pt]">Occasion</span>
                        <span className="font-semibold text-slate-900">{doc.eventType}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[7pt]">Service Type</span>
                        <span className="font-semibold text-slate-900">{doc.serviceType}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[7pt]">Venue Setting</span>
                        <span className="text-slate-800 font-medium">{doc.venueType}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[7pt]">Coordinator</span>
                        <span className="text-slate-800 font-medium">{doc.coordinator}</span>
                      </div>
                      {doc.eventTheme && (
                        <div className="col-span-2 pt-0.5">
                          <span className="text-slate-500 block text-[7pt]">Theme / Motif</span>
                          <span className="text-slate-800 font-medium">{doc.eventTheme}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Itemized Charges Section */}
                <div className="caz-print-charges mb-3">
                  <div className="flex justify-between items-center mb-1 caz-avoid-break">
                    <h3 className="text-[9pt] font-bold uppercase tracking-wider text-slate-800">
                      Itemized Charges &amp; Service Breakdown
                    </h3>
                    <span className="text-[7.5pt] font-mono text-slate-500">Amounts in Philippine Peso (₱)</span>
                  </div>

                  <table className="w-full border-collapse border-b border-slate-300">
                    <thead>
                      <tr className="border-y-2 border-slate-900 bg-slate-100 text-[7.5pt] font-bold uppercase tracking-wider text-slate-800">
                        <th className="py-2 px-2.5 text-left w-[46%]">Description &amp; Specifications</th>
                        <th className="py-2 px-2 text-center w-[14%]">Category</th>
                        <th className="py-2 px-2 text-center w-[12%]">Pax / Qty</th>
                        <th className="py-2 px-2 text-right w-[14%]">Rate (₱)</th>
                        <th className="py-2 px-2.5 text-right w-[14%]">Amount (₱)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-[8.5pt]">
                      {/* Package Row */}
                      <tr className="caz-avoid-break">
                        <td className="py-2 px-2.5">
                          <div className="font-bold text-slate-900 text-[9pt]">{doc.pkgName}</div>
                          <div className="text-[7.5pt] text-slate-500 leading-snug">{doc.pkgRateDescription}</div>
                        </td>
                        <td className="py-2 px-2 text-center text-slate-600 font-medium text-[8pt]">Package</td>
                        <td className="py-2 px-2 text-center font-mono font-semibold text-slate-800">{doc.guestCount}</td>
                        <td className="py-2 px-2 text-right font-mono text-slate-600 tabular-nums">
                          {doc.guestCount > 0 ? formatCurrency(doc.basePackageSubtotal / doc.guestCount) : "—"}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900 tabular-nums">
                          {formatCurrency(doc.basePackageSubtotal)}
                        </td>
                      </tr>

                      {/* Deductions */}
                      {doc.removedInclusions.map((entry, idx) => (
                        <tr key={`print-ded-${idx}`} className="caz-avoid-break bg-rose-50/20 text-[8pt]">
                          <td className="py-1.5 px-2.5 text-slate-800">
                            <span className="font-semibold text-rose-800">Removed Inclusion:</span> {entry.name || entry}
                          </td>
                          <td className="py-1.5 px-2 text-center text-rose-700">Deduction</td>
                          <td className="py-1.5 px-2 text-center text-slate-500">1</td>
                          <td className="py-1.5 px-2 text-right font-mono text-emerald-700 tabular-nums">
                            −{formatCurrency(entry.deduction || 0)}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                            −{formatCurrency(entry.deduction || 0)}
                          </td>
                        </tr>
                      ))}

                      {/* Adjustments */}
                      {doc.inclusionAdjustments.map((entry, idx) => {
                        const amt = Number(entry.amount) || 0;
                        return (
                          <tr key={`print-adj-${idx}`} className="caz-avoid-break text-[8pt]">
                            <td className="py-1.5 px-2.5 text-slate-800">
                              <span className="font-semibold">Inclusion Quantity Adjustment:</span> {entry.name} ({entry.quantity} vs base {entry.base_quantity})
                            </td>
                            <td className="py-1.5 px-2 text-center text-slate-500">Adjustment</td>
                            <td className="py-1.5 px-2 text-center font-mono text-slate-600">{entry.quantity}</td>
                            <td className="py-1.5 px-2 text-right font-mono text-slate-600 tabular-nums">
                              {formatCurrency(entry.unit_price || 0)}
                            </td>
                            <td className={`py-1.5 px-2.5 text-right font-mono font-semibold tabular-nums ${amt < 0 ? "text-emerald-700" : "text-slate-900"}`}>
                              {amt < 0 ? "−" : ""}{formatCurrency(Math.abs(amt))}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Service items */}
                      {doc.serviceItems.map((item, idx) => {
                        const qty = Number(item.quantity) || 1;
                        const price = Number(item.price || item.unit_price || 0);
                        const lineTotal = price * qty;
                        return (
                          <tr key={`print-item-${idx}`} className="caz-avoid-break">
                            <td className="py-1.5 px-2.5">
                              <span className="font-semibold text-slate-900">{item.name}</span>
                              {item.note && <span className="block text-[7.5pt] text-slate-500">{item.note}</span>}
                            </td>
                            <td className="py-1.5 px-2 text-center text-slate-500 text-[8pt]">Add-on</td>
                            <td className="py-1.5 px-2 text-center font-mono font-medium text-slate-800">{qty}</td>
                            <td className="py-1.5 px-2 text-right font-mono text-slate-600 tabular-nums">{formatCurrency(price)}</td>
                            <td className="py-1.5 px-2.5 text-right font-mono font-semibold text-slate-900 tabular-nums">
                              {formatCurrency(lineTotal)}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Additional charges */}
                      {doc.additionalCharges.map((chg, idx) => {
                        const amt = Number(chg.amount || 0);
                        return (
                          <tr key={`print-chg-${idx}`} className="caz-avoid-break">
                            <td className="py-1.5 px-2.5 font-medium text-slate-800">
                              {chg.title || chg.name || "Logistics / Delivery Surcharge"}
                              {chg.note && <span className="block text-[7.5pt] text-slate-500">{chg.note}</span>}
                            </td>
                            <td className="py-1.5 px-2 text-center text-slate-500 text-[8pt]">Logistics</td>
                            <td className="py-1.5 px-2 text-center font-mono text-slate-600">1</td>
                            <td className="py-1.5 px-2 text-right font-mono text-slate-600 tabular-nums">{formatCurrency(amt)}</td>
                            <td className="py-1.5 px-2.5 text-right font-mono font-semibold text-slate-900 tabular-nums">
                              {formatCurrency(amt)}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Menu selections */}
                      {doc.menuItems.length > 0 && (
                        <tr className="caz-avoid-break bg-slate-50/60">
                          <td colSpan="5" className="py-2 px-2.5 border-t border-slate-200">
                            <div className="font-bold text-slate-800 text-[8pt] uppercase tracking-wider mb-0.5">
                              Included Menu Selections ({doc.menuItems.length} Dishes):
                            </div>
                            <p className="text-[7.5pt] text-slate-600 leading-relaxed">
                              {doc.menuItems.map((m, i) => {
                                const name = typeof m === "string" ? m : m.name;
                                const label = m.pricing_type === "quantity" ? ` (${menuAmountLabel(m)})` : "";
                                return (
                                  <span key={i} className="inline-block mr-2 after:content-[','] last:after:content-[''] font-medium">
                                    {name}{label}
                                  </span>
                                );
                              })}
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Payments & Statement Summary (2 Columns) */}
                <div className="caz-print-financials grid grid-cols-12 gap-5 pb-3 mb-3 border-b border-slate-300">
                  {/* Payment history */}
                  <div className="col-span-7 space-y-1.5">
                    <h3 className="text-[8pt] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-0.5">
                      Payment History &amp; Credited Deposits
                    </h3>
                    {doc.approvedPayments.length > 0 ? (
                      <div className="space-y-0.5">
                        {doc.approvedPayments.map((p, i) => {
                          const pDate = p.createdAt || p.paid_at;
                          return (
                            <div key={i} className="flex justify-between items-baseline text-[8pt] py-0.5 border-b border-slate-100">
                              <div>
                                <span className="font-semibold text-slate-800 capitalize">
                                  {p.payment_type ? p.payment_type.replace(/_/g, " ") : "Payment Received"}
                                </span>
                                <span className="text-[7pt] text-slate-500 ml-1 font-mono">
                                  ({p.method || p.payment_method || "Online"} · {pDate ? formatShortDate(pDate) : "Recorded"})
                                </span>
                              </div>
                              <span className="font-mono font-semibold text-emerald-800 tabular-nums">
                                {formatCurrency(p.amount)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[7.5pt] text-slate-500 italic py-0.5">
                        No payments credited to this account yet. A {doc.business.depositPercentage}% deposit is required to confirm reservation.
                      </p>
                    )}
                  </div>

                  {/* Totals */}
                  <div className="col-span-5 space-y-1 text-[8pt] caz-avoid-break">
                    <h3 className="text-[8pt] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-0.5">
                      Statement Summary
                    </h3>
                    <div className="flex justify-between text-slate-700">
                      <span>Base Package Subtotal:</span>
                      <span className="font-mono font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(doc.basePackageSubtotal)}
                      </span>
                    </div>
                    {(doc.serviceItemsSubtotal > 0 || doc.additionalChargesSubtotal > 0) && (
                      <div className="flex justify-between text-slate-700">
                        <span>Add-ons &amp; Logistics:</span>
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          {formatCurrency(doc.serviceItemsSubtotal + doc.additionalChargesSubtotal)}
                        </span>
                      </div>
                    )}
                    {doc.discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-medium">
                        <span>Applied Discount:</span>
                        <span className="font-mono tabular-nums">−{formatCurrency(doc.discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-baseline pt-1 border-t-2 border-slate-900 text-[10pt] font-bold text-slate-900">
                      <span>TOTAL AMOUNT:</span>
                      <span className="font-mono tabular-nums text-[11.5pt]">
                        {formatCurrency(doc.grandTotal)}
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5 text-slate-700 border-b border-slate-200">
                      <span>Total Payments Credited:</span>
                      <span className="font-mono font-bold text-emerald-800 tabular-nums">
                        {formatCurrency(doc.totalPaid)}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline pt-0.5 text-[10pt] font-bold text-slate-900">
                      <span className="text-[7.5pt] uppercase tracking-wider">
                        {doc.remainingBalance <= 0 ? "Account Status:" : "Balance Due:"}
                      </span>
                      <span className={`font-mono tabular-nums text-[10.5pt] ${doc.remainingBalance <= 0 ? "text-emerald-700" : "text-amber-900"}`}>
                        {doc.remainingBalance <= 0 ? "PAID IN FULL" : formatCurrency(doc.remainingBalance)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Terms & Conditions (Flows naturally across pages) */}
                <div className="caz-print-terms mb-4">
                  {doc.adminNotes && (
                    <div className="caz-avoid-break p-2 mb-2 rounded-xs bg-slate-50 border border-slate-300 text-[8pt]">
                      <span className="font-bold text-slate-800 uppercase tracking-wider text-[7pt] block mb-0.5">
                        Admin Notes &amp; Specific Terms:
                      </span>
                      <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                        {doc.adminNotes}
                      </p>
                    </div>
                  )}

                  <div className="space-y-1 text-[7.5pt] text-slate-600">
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[7.5pt] border-b border-slate-200 pb-0.5 mb-1 caz-avoid-break">
                      Terms, Conditions &amp; Service Policies:
                    </h4>
                    <ul className="list-disc pl-4 space-y-0.5 leading-relaxed">
                      {dynamicPolicies.map((pol, idx) => (
                        <li key={`print-pol-${idx}`} className="caz-terms-item">
                          <strong className="text-slate-800">{pol.title}:</strong> {pol.body}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {doc.business.termsUrl && (
                    <div className="caz-avoid-break p-1.5 mt-2 rounded-xs bg-slate-50 border border-slate-200 text-[7.5pt] text-slate-600">
                      <span className="font-bold text-slate-800 uppercase tracking-wider text-[7pt] block mb-0.5">
                        Official Terms Document on File:
                      </span>
                      <p>
                        Full agreement configured by management:{" "}
                        <span className="font-mono text-slate-800 font-medium break-all">
                          {doc.business.termsFileName || doc.business.termsUrl} ({doc.business.termsUrl})
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Dual Signature Block (Never awkwardly split) */}
                <div className="caz-signature-block caz-avoid-break grid grid-cols-2 gap-10 pt-4 text-[8.5pt]">
                  <div>
                    <div className="border-b-2 border-slate-800 pb-1 mb-1 font-bold text-slate-900 text-[9.5pt]">
                      {adminSignatoryName}
                    </div>
                    <p className="text-[7.5pt] text-slate-600 font-medium">Authorized Management Signatory / Date</p>
                    <p className="text-[7pt] text-slate-500 font-mono tracking-wide uppercase mt-0.5">
                      {adminSignatoryRole}
                    </p>
                  </div>

                  <div>
                    <div className="border-b-2 border-slate-800 pb-1 mb-1 font-bold text-slate-900 text-[9.5pt]">
                      {doc.customerName}
                    </div>
                    <p className="text-[7.5pt] text-slate-600 font-medium">Client Acceptance &amp; Acknowledgment / Date</p>
                    <p className="text-[7pt] text-slate-500 font-mono tracking-wide uppercase mt-0.5">
                      Event Client
                    </p>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
