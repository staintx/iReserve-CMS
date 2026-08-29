export default function Badge({ status, dot = true, className = "" }) {
  const norm = String(status || "").toLowerCase().trim();

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
    "converted to booking",
    "inspection passed",
    "created",
    "reservation released",
  ].includes(norm);

  // 2. Warning / Pending / Attention / In Review / Revision
  const isWarning = [
    "pending",
    "pending review",
    "under review",
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
    "low",
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
  ].includes(norm);

  // Determine tone
  let toneClass = "bg-slate-100 text-slate-700 border-slate-200/70";
  let dotClass = "bg-slate-400";

  if (isSuccess) {
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
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${toneClass} ${className} whitespace-nowrap`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />}
      <span className="capitalize">{status}</span>
    </span>
  );
}

