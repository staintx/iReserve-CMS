export default function Badge({ status, dot = false, className = "" }) {
  const norm = String(status || "").toLowerCase().trim();

  // Specific custom inquiry status & priority tones
  if (norm === "pending review") {
    return (
      <span className={`inline-flex items-center ${dot ? "gap-1.5 px-2" : "px-2.5"} py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 ${className} whitespace-nowrap`}>
        {dot && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />}
        <span>Pending Review</span>
      </span>
    );
  }

  if (norm === "under review") {
    return (
      <span className={`inline-flex items-center ${dot ? "gap-1.5 px-2" : "px-2.5"} py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 ${className} whitespace-nowrap`}>
        {dot && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
        <span>Under Review</span>
      </span>
    );
  }

  if (norm === "quotation sent") {
    return (
      <span className={`inline-flex items-center ${dot ? "gap-1.5 px-2" : "px-2.5"} py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/80 ${className} whitespace-nowrap`}>
        {dot && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />}
        <span>Quotation Sent</span>
      </span>
    );
  }

  if (norm === "archived") {
    return (
      <span className={`inline-flex items-center ${dot ? "gap-1.5 px-2" : "px-2.5"} py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/80 ${className} whitespace-nowrap`}>
        {dot && <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />}
        <span>Archived</span>
      </span>
    );
  }

  if (norm === "booking" || norm === "converted to booking") {
    return (
      <span className={`inline-flex items-center ${dot ? "gap-1.5 px-2" : "px-2.5"} py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 ${className} whitespace-nowrap`}>
        {dot && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
        <span>{norm === "booking" ? "Booking" : "Converted to Booking"}</span>
      </span>
    );
  }

  // 1. Success / Confirmed / Approved / Completed / Paid
  const isSuccess = [
    "confirmed",
    "completed",
    "paid",
    "ok",
    "available",
    "approved",
    "quote accepted",
    "accepted",
    "inspection passed",
    "created",
    "reservation released",
  ].includes(norm);

  // 2. Warning / Pending / Attention / In Review / Revision
  const isWarning = [
    "pending",
    "revision requested",
    "revision needed",
    "needs revision",
    "requires revision",
    "change requested",
    "change requests",
    "pending deposit",
    "deposit pending",
    "requested",
    "ocular-pending",
    "reschedule needed",
    "reschedule",
    "medium",
    "vip",
    "awaiting final confirmation",
    "pending inspection",
  ].includes(norm);

  // 3. Danger / Cancelled / Rejected / Critical / Failed
  const isDanger = [
    "cancelled",
    "rejected",
    "quote rejected",
    "critical",
    "retired",
    "failed",
    "expired",
    "unavailable",
    "high",
  ].includes(norm);

  // Determine tone
  let toneClass = "bg-slate-100 text-slate-700 border-slate-200/70";
  let dotClass = "bg-slate-400";

  if (isSuccess || norm === "low") {
    toneClass = "bg-emerald-50 text-emerald-700 border-emerald-200/70";
    dotClass = "bg-emerald-500";
  } else if (isWarning) {
    toneClass = "bg-amber-50 text-amber-700 border-amber-200/70";
    dotClass = "bg-amber-500";
  } else if (isDanger) {
    toneClass = "bg-rose-50 text-rose-700 border-rose-200/70";
    dotClass = "bg-rose-500";
  }

  return (
    <span
      className={`inline-flex items-center ${dot ? "gap-1.5 px-2" : "px-2.5"} py-0.5 rounded-full text-[11px] font-semibold border ${toneClass} ${className} whitespace-nowrap`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />}
      <span className="capitalize">{status}</span>
    </span>
  );
}


